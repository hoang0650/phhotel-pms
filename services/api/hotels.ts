import { apiClient } from './client';
import { API_ENDPOINTS } from './config';
import { mockHotels } from '@/mocks/hotelData';

export interface Hotel {
  id: string;
  name: string;
  address?: string;
  phone?: string;
  email?: string;
  logo?: string;
  description?: string;
}

export interface ApiHotel {
  _id: string;
  name: string;
  address?: string;
  phone?: string;
  email?: string;
  logo?: string;
  description?: string;
  createdAt?: string;
  updatedAt?: string;
}

const mapApiHotelToHotel = (apiHotel: ApiHotel): Hotel => ({
  id: apiHotel._id,
  name: apiHotel.name || 'Khách sạn',
  address: apiHotel.address,
  phone: apiHotel.phone,
  email: apiHotel.email,
  logo: apiHotel.logo,
  description: apiHotel.description,
});

export const hotelsApi = {
  getAll: async (): Promise<Hotel[]> => {
    try {
      const response = await apiClient.get<ApiHotel[] | { data: ApiHotel[] }>(API_ENDPOINTS.HOTELS.BASE);
      const hotels = Array.isArray(response) ? response : (response?.data || []);
      console.log('[hotelsApi.getAll] Response:', hotels);
      return hotels.map(mapApiHotelToHotel);
    } catch (error) {
      console.error('[hotelsApi.getAll] Error:', error);
      console.log('[hotelsApi.getAll] Using mock data as fallback');
      return mockHotels;
    }
  },

  getById: async (id: string): Promise<Hotel | null> => {
    try {
      const response = await apiClient.get<ApiHotel>(API_ENDPOINTS.HOTELS.BY_ID(id));
      return mapApiHotelToHotel(response);
    } catch (error) {
      console.error('[hotelsApi.getById] Error:', error);
      return null;
    }
  },
};
