import { useState, useEffect, useCallback, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import createContextHook from '@nkzw/create-context-hook';
import { hotelsApi, Hotel } from '@/services/api/hotels';
import { sessionsApi } from '@/services/api/sessions';
import { useAuth } from './AuthContext';
import { extractId } from '@/services/api/utils';

const EMPTY_HOTELS: Hotel[] = [];

const resolveHotelId = (hotel: Hotel | null | undefined): string | null => {
  if (!hotel) return null;
  return extractId(hotel.id) || extractId((hotel as any)._id) || null;
};

const isHotelRole = (role: string | undefined): boolean =>
  !!role &&
  ['hotel', 'staff', 'manager', 'receptionist', 'hotel_manager'].includes(role);

export const [HotelProvider, useHotel] = createContextHook(() => {
  const { user, isAuthenticated } = useAuth();
  const [selectedHotelId, setSelectedHotelId] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  const {
    data: hotelsData,
    isLoading: hotelsLoading,
    isFetched: hotelsFetched,
    refetch: refetchHotels,
  } = useQuery({
    queryKey: ['hotels'],
    queryFn: async () => {
      if (!user || !isAuthenticated) {
        return EMPTY_HOTELS;
      }

      const userHotelId = extractId(user.hotelId);
      const userBusinessId = extractId(user.businessId);
      const role = user.role;

      if (isHotelRole(role) && userHotelId) {
        const hotel = await hotelsApi.getById(userHotelId, { lite: true });
        return hotel ? [hotel] : EMPTY_HOTELS;
      }

      if (role === 'business' && userBusinessId) {
        return hotelsApi.getAll({ businessId: userBusinessId, lite: true });
      }

      return hotelsApi.getAll({ lite: true });
    },
    enabled: isAuthenticated,
    staleTime: 60_000,
    gcTime: 10 * 60_000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });

  // Tránh `= []` tạo mảng mới mỗi render → kích hoạt effect vô hạn
  const allHotels = hotelsData ?? EMPTY_HOTELS;

  const hotels = useMemo(() => {
    if (!user || !isAuthenticated) return EMPTY_HOTELS;

    if (user.role === 'admin' || user.role === 'superadmin') {
      return allHotels;
    }

    if (user.role === 'business') {
      const userBusinessId = extractId(user.businessId);
      if (!userBusinessId) return EMPTY_HOTELS;
      return allHotels.filter((hotel) => extractId(hotel.businessId) === userBusinessId);
    }

    if (isHotelRole(user.role) || (user as any).role === 'hotel_manager') {
      const userHotelId = extractId(user.hotelId);
      if (userHotelId) {
        return allHotels.filter((hotel) => resolveHotelId(hotel) === userHotelId);
      }

      const userHotelIds = (user as any).hotelIds as string[] | undefined;
      if (userHotelIds && userHotelIds.length > 0) {
        const idSet = new Set(userHotelIds.map((id) => extractId(id)).filter(Boolean));
        return allHotels.filter((hotel) => {
          const hId = resolveHotelId(hotel);
          return !!hId && idSet.has(hId);
        });
      }

      console.warn('[HotelContext] Staff/Hotel user missing hotelId');
      return EMPTY_HOTELS;
    }

    return EMPTY_HOTELS;
  }, [allHotels, user, isAuthenticated]);

  const hotelsIdsKey = useMemo(
    () => hotels.map((h) => resolveHotelId(h)).filter(Boolean).join('|'),
    [hotels]
  );

  useEffect(() => {
    let cancelled = false;

    const loadSelectedHotel = async () => {
      if (!isAuthenticated) {
        if (!cancelled) {
          setSelectedHotelId(null);
          setIsInitialized(true);
        }
        return;
      }

      try {
        const redisHotelId = await sessionsApi.getSelectedHotel();
        const normalized = extractId(redisHotelId) || null;
        if (!cancelled && normalized) {
          setSelectedHotelId((prev) => (prev === normalized ? prev : normalized));
        }
      } catch (error) {
        console.warn('[HotelContext] Error loading selected hotel from Redis:', error);
      } finally {
        if (!cancelled) {
          setIsInitialized(true);
        }
      }
    };

    loadSelectedHotel();

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, user?.id]);

  // Gán hotel cố định cho role hotel/staff — chỉ khi chưa có selection
  useEffect(() => {
    if (!user || selectedHotelId) return;

    const fixedHotelId = extractId(user.hotelId) || null;
    if (fixedHotelId && isHotelRole(user.role)) {
      setSelectedHotelId(fixedHotelId);
      sessionsApi.saveSelectedHotel(fixedHotelId).catch((e) =>
        console.warn('[HotelContext] Error saving fixed hotel selection:', e)
      );
    }
  }, [user?.id, user?.role, user?.hotelId, selectedHotelId]);

  // Đồng bộ selection với danh sách hotel đã load xong (không clear khi đang loading)
  useEffect(() => {
    if (!isInitialized || hotelsLoading || !hotelsFetched) {
      return;
    }

    const selectedNormalized = extractId(selectedHotelId) || null;

    if (hotels.length === 0) {
      if (selectedNormalized) {
        setSelectedHotelId(null);
      }
      return;
    }

    const hasValidSelection = hotels.some(
      (h) => resolveHotelId(h) === selectedNormalized
    );

    if (hasValidSelection) {
      return;
    }

    const firstId = resolveHotelId(hotels[0]);
    if (!firstId || firstId === selectedNormalized) {
      return;
    }

    console.log('[HotelContext] Auto-selecting first hotel:', hotels[0].name);
    setSelectedHotelId(firstId);
    sessionsApi.saveSelectedHotel(firstId).catch((e) =>
      console.warn('[HotelContext] Error auto-saving first hotel:', e)
    );
  }, [
    hotelsIdsKey,
    hotels,
    selectedHotelId,
    isInitialized,
    hotelsLoading,
    hotelsFetched,
  ]);

  const selectHotel = useCallback(
    async (hotelId: string) => {
      const normalized = extractId(hotelId);
      if (!normalized) return;

      const hotelExists = hotels.some((h) => resolveHotelId(h) === normalized);
      if (!hotelExists) {
        console.warn('[HotelContext] Attempted to select unauthorized hotel');
        return;
      }

      setSelectedHotelId((prev) => (prev === normalized ? prev : normalized));
      try {
        await sessionsApi.saveSelectedHotel(normalized);
      } catch (error) {
        console.warn('[HotelContext] Error saving selected hotel:', error);
      }
    },
    [hotels]
  );

  const selectedHotel =
    hotels.find((h) => resolveHotelId(h) === extractId(selectedHotelId)) || null;
  const canSelectMultipleHotels = hotels.length > 1;

  return {
    hotels,
    allHotels,
    selectedHotel,
    selectedHotelId,
    selectHotel,
    isLoading: hotelsLoading || !isInitialized,
    refetchHotels,
    canSelectMultipleHotels,
  };
});

export type { Hotel };
