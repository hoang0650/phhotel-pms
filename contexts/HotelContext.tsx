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
    
    // Implement role-based filtering matching Angular room.component.ts
    
    // 1. Admin/Superadmin see all hotels
    if (user.role === 'admin' || user.role === 'superadmin') {
      return allHotels;
    }
    
    // 2. Business see hotels matching businessId
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

    // 3. Manager/Staff see hotels matching hotelId
    if (user.role === 'hotel_manager' || user.role === 'staff') {
      const userHotelId = extractId(user.hotelId);
      if (userHotelId) {
        return allHotels.filter(hotel => {
          const hId = extractId(hotel.id) || extractId(hotel._id);
          return hId === userHotelId;
        });
      }
      // Fallback: if no hotelId on user, maybe return empty or handle error
      console.warn('[HotelContext] Staff/Manager user missing hotelId');
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
        console.error('[HotelContext] Error loading selected hotel:', error);
      } finally {
        setIsInitialized(true);
      }
    };
    loadSelectedHotel();
  }, []);

  useEffect(() => {
    if (isInitialized && hotels.length > 0) {
      // Logic auto-select giống room.component.ts:
      // Nếu chưa chọn hotel nào, hoặc hotel đang chọn không còn trong danh sách (mất quyền),
      // thì chọn hotel đầu tiên.
      const currentSelection = hotels.find(h => h.id === selectedHotelId);
      
      if (!currentSelection) {
        const firstHotel = hotels[0];
        console.log('[HotelContext] Auto-selecting first hotel:', firstHotel.name);
        setSelectedHotelId(firstHotel.id);
        AsyncStorage.setItem(SELECTED_HOTEL_KEY, firstHotel.id).catch(console.error);
      }
    } else if (isInitialized && hotels.length === 0) {
      // Nếu không có hotel nào
      if (selectedHotelId) {
        setSelectedHotelId(null);
        AsyncStorage.removeItem(SELECTED_HOTEL_KEY).catch(console.error);
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
      console.error('[HotelContext] Error saving selected hotel:', error);
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
