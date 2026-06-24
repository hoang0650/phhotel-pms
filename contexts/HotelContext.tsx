import { useState, useEffect, useCallback, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import AsyncStorage from '@react-native-async-storage/async-storage';
import createContextHook from '@nkzw/create-context-hook';
import { hotelsApi, Hotel } from '@/services/api/hotels';
import { useAuth } from './AuthContext';
import { extractId } from '@/services/api/utils';

const SELECTED_HOTEL_KEY = 'selected_hotel_id';

export const [HotelProvider, useHotel] = createContextHook(() => {
  const { user, isAuthenticated } = useAuth();
  const [selectedHotelId, setSelectedHotelId] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  const { data: allHotels = [], isLoading: hotelsLoading, refetch: refetchHotels } = useQuery({
    queryKey: ['hotels'],
    queryFn: () => hotelsApi.getAll(),
    enabled: isAuthenticated,
  });

  const hotels = useMemo(() => {
    if (!user || !isAuthenticated) return [];
    
    // 1. Admin/Superadmin xem được tất cả các khách sạn hệ thống
    if (user.role === 'admin' || user.role === 'superadmin') {
      return allHotels;
    }
    
    // 2. Business xem các khách sạn trùng với businessId của mình
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

    // 3. Hotel Manager (role: 'hotel') và Staff (role: 'staff') xem khách sạn theo hotelId hoặc hotelIds
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
      
      // Fallback: Nếu tài khoản liên kết quản lý danh sách nhiều khách sạn qua mảng hotelIds
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
    const loadSelectedHotel = async () => {
      try {
        const storedId = await AsyncStorage.getItem(SELECTED_HOTEL_KEY);
        if (storedId) {
          setSelectedHotelId(storedId);
        }
      } catch (error) {
        console.warn('[HotelContext] Error loading selected hotel:', error);
      } finally {
        setIsInitialized(true);
      }
    };
    loadSelectedHotel();
  }, []);

  useEffect(() => {
    if (isInitialized && hotels.length > 0) {
      // Tự động chọn khách sạn đầu tiên khả dụng nếu chưa chọn hoặc mất quyền chọn cũ
      const currentSelection = hotels.find(h => h.id === selectedHotelId);
      
      if (!currentSelection) {
        const firstHotel = hotels[0];
        console.log('[HotelContext] Auto-selecting first hotel:', firstHotel.name);
        setSelectedHotelId(firstHotel.id);
        AsyncStorage.setItem(SELECTED_HOTEL_KEY, firstHotel.id).catch((e) => console.warn('[HotelContext] Error auto-saving first hotel:', e));
      }
    } else if (isInitialized && hotels.length === 0) {
      // Nếu không có hotel nào thuộc quyền quản lý, reset thông tin chọn về null
      if (selectedHotelId) {
        setSelectedHotelId(null);
        AsyncStorage.removeItem(SELECTED_HOTEL_KEY).catch((e) => console.warn('[HotelContext] Error clearing selected hotel:', e));
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
      await AsyncStorage.setItem(SELECTED_HOTEL_KEY, hotelId);
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