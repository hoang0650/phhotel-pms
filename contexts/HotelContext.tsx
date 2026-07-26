import { useState, useEffect, useCallback, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import createContextHook from '@nkzw/create-context-hook';
import { hotelsApi, Hotel } from '@/services/api/hotels';
import { sessionsApi } from '@/services/api/sessions';
import { useAuth } from './AuthContext';
import { extractId } from '@/services/api/utils';

export const [HotelProvider, useHotel] = createContextHook(() => {
  const { user, isAuthenticated } = useAuth();
  const [selectedHotelId, setSelectedHotelId] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  const { data: allHotels = [], isLoading: hotelsLoading, refetch: refetchHotels } = useQuery({
    queryKey: ['hotels'],
    queryFn: async () => {
      if (!user || !isAuthenticated) {
        return [];
      }

      const userHotelId = extractId(user.hotelId);
      const userBusinessId = extractId(user.businessId);
      const role = user.role;

      if (
        ['hotel', 'staff', 'manager', 'receptionist', 'hotel_manager'].includes(role) &&
        userHotelId
      ) {
        const hotel = await hotelsApi.getById(userHotelId, { lite: true });
        return hotel ? [hotel] : [];
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

  const hotels = useMemo(() => {
    if (!user || !isAuthenticated) return [];
    
    if (user.role === 'admin' || user.role === 'superadmin') {
      return allHotels;
    }
    
    if (user.role === 'business') {
      const userBusinessId = extractId(user.businessId);
      if (userBusinessId) {
        return allHotels.filter(hotel => {
          const hotelBusinessId = extractId(hotel.businessId);
          return hotelBusinessId === userBusinessId;
        });
      }
      return [];
    }

    if (
      user.role === 'hotel' || 
      user.role === 'staff' || 
      user.role === 'manager' || 
      user.role === 'receptionist' || 
      (user as any).role === 'hotel_manager'
    ) {
      const userHotelId = extractId(user.hotelId);
      if (userHotelId) {
        return allHotels.filter(hotel => {
          const hId = extractId(hotel.id) || extractId(hotel._id);
          return hId === userHotelId;
        });
      }
      
      const userHotelIds = (user as any).hotelIds as string[] | undefined;
      if (userHotelIds && userHotelIds.length > 0) {
        const idSet = new Set(userHotelIds);
        return allHotels.filter(hotel => idSet.has(extractId(hotel.id) || extractId((hotel as any)._id) || ''));
      }
      
      console.warn('[HotelContext] Staff/Hotel user missing hotelId');
      return [];
    }
    
    return [];
  }, [allHotels, user, isAuthenticated]);

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
        if (!cancelled && redisHotelId) {
          setSelectedHotelId(redisHotelId);
        }
      } catch (error) {
        console.warn('[HotelContext] Error loading selected hotel from Redis:', error);
      } finally {
        if (!cancelled) {
          setIsInitialized(true);
        }
      }
    };

    setIsInitialized(false);
    loadSelectedHotel();

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, user?.id]);

  useEffect(() => {
    if (!user || selectedHotelId) {
      return;
    }

    const fixedHotelId = extractId(user.hotelId);
    if (
      fixedHotelId &&
      ['hotel', 'staff', 'manager', 'receptionist', 'hotel_manager'].includes(user.role)
    ) {
      setSelectedHotelId(fixedHotelId);
      sessionsApi.saveSelectedHotel(fixedHotelId).catch((e) =>
        console.warn('[HotelContext] Error saving fixed hotel selection:', e)
      );
    }
  }, [user, selectedHotelId]);

  useEffect(() => {
    if (isInitialized && hotels.length > 0) {
      const currentSelection = hotels.find(h => h.id === selectedHotelId);
      
      if (!currentSelection) {
        const firstHotel = hotels[0];
        console.log('[HotelContext] Auto-selecting first hotel:', firstHotel.name);
        setSelectedHotelId(firstHotel.id);
        sessionsApi.saveSelectedHotel(firstHotel.id).catch((e) =>
          console.warn('[HotelContext] Error auto-saving first hotel:', e)
        );
      }
    } else if (isInitialized && hotels.length === 0) {
      if (selectedHotelId) {
        setSelectedHotelId(null);
      }
    }
  }, [hotels, selectedHotelId, isInitialized]);

  const selectHotel = useCallback(async (hotelId: string) => {
    const hotelExists = hotels.find(h => h.id === hotelId);
    if (!hotelExists) {
      console.warn('[HotelContext] Attempted to select unauthorized hotel');
      return;
    }
    
    setSelectedHotelId(hotelId);
    try {
      await sessionsApi.saveSelectedHotel(hotelId);
    } catch (error) {
      console.warn('[HotelContext] Error saving selected hotel:', error);
    }
  }, [hotels]);

  const selectedHotel = hotels.find(h => h.id === selectedHotelId) || null;
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
