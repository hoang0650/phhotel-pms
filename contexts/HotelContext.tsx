import { useState, useEffect, useCallback, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import AsyncStorage from '@react-native-async-storage/async-storage';
import createContextHook from '@nkzw/create-context-hook';
import { hotelsApi, Hotel } from '@/services/api/hotels';
import { useAuth } from './AuthContext';

const SELECTED_HOTEL_KEY = 'selected_hotel_id';

export const [HotelProvider, useHotel] = createContextHook(() => {
  const { user, isAuthenticated, canAccessAllHotels, canAccessMultipleHotels } = useAuth();
  const [selectedHotelId, setSelectedHotelId] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  const { data: allHotels = [], isLoading: hotelsLoading, refetch: refetchHotels } = useQuery({
    queryKey: ['hotels'],
    queryFn: () => hotelsApi.getAll(),
    enabled: isAuthenticated,
  });

  const hotels = useMemo(() => {
    if (!user || !isAuthenticated) return [];
    
    if (canAccessAllHotels) {
      return allHotels;
    }
    
    if (canAccessMultipleHotels && user.hotelIds && user.hotelIds.length > 0) {
      return allHotels.filter(hotel => user.hotelIds?.includes(hotel.id));
    }
    
    if (user.hotelId) {
      return allHotels.filter(hotel => hotel.id === user.hotelId);
    }
    
    return [];
  }, [allHotels, user, isAuthenticated, canAccessAllHotels, canAccessMultipleHotels]);

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
      const currentSelection = hotels.find(h => h.id === selectedHotelId);
      if (!currentSelection) {
        const firstHotel = hotels[0];
        setSelectedHotelId(firstHotel.id);
        AsyncStorage.setItem(SELECTED_HOTEL_KEY, firstHotel.id).catch(console.error);
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
