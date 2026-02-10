import { useState, useEffect, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import AsyncStorage from '@react-native-async-storage/async-storage';
import createContextHook from '@nkzw/create-context-hook';
import { hotelsApi, Hotel } from '@/services/api/hotels';

const SELECTED_HOTEL_KEY = 'selected_hotel_id';

export const [HotelProvider, useHotel] = createContextHook(() => {
  const [selectedHotelId, setSelectedHotelId] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  const { data: hotels = [], isLoading: hotelsLoading, refetch: refetchHotels } = useQuery({
    queryKey: ['hotels'],
    queryFn: () => hotelsApi.getAll(),
  });

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
    if (isInitialized && hotels.length > 0 && !selectedHotelId) {
      const firstHotel = hotels[0];
      setSelectedHotelId(firstHotel.id);
      AsyncStorage.setItem(SELECTED_HOTEL_KEY, firstHotel.id).catch(console.error);
    }
  }, [hotels, selectedHotelId, isInitialized]);

  const selectHotel = useCallback(async (hotelId: string) => {
    setSelectedHotelId(hotelId);
    try {
      await AsyncStorage.setItem(SELECTED_HOTEL_KEY, hotelId);
    } catch (error) {
      console.error('[HotelContext] Error saving selected hotel:', error);
    }
  }, []);

  const selectedHotel = hotels.find(h => h.id === selectedHotelId) || null;

  return {
    hotels,
    selectedHotel,
    selectedHotelId,
    selectHotel,
    isLoading: hotelsLoading || !isInitialized,
    refetchHotels,
  };
});

export type { Hotel };
