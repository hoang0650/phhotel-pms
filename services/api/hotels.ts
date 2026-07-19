import { apiClient } from './client';
import { API_ENDPOINTS } from './config';
import { extractId } from './utils';

export interface Hotel {
  id: string;
  _id?: string;
  name: string;
  address?: string;
  phone?: string;
  email?: string;
  logo?: string;
  description?: string;
  businessId?: string;
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
  businessId?: any; // Allow any for robustness
}

const mapApiHotelToHotel = (apiHotel: ApiHotel): Hotel => ({
  id: apiHotel._id,
  name: apiHotel.name || 'Khách sạn',
  address: apiHotel.address,
  phone: apiHotel.phone,
  email: apiHotel.email,
  logo: apiHotel.logo,
  description: apiHotel.description,
  businessId: extractId(apiHotel.businessId),
});

export const hotelsApi = {
  getAll: async (options?: { businessId?: string; lite?: boolean }): Promise<Hotel[]> => {
    try {
      const params = new URLSearchParams();
      if (options?.businessId) {
        params.set('businessId', options.businessId);
      }
      if (options?.lite) {
        params.set('lite', '1');
      }
      const endpoint = params.toString()
        ? `${API_ENDPOINTS.HOTELS.BASE}?${params.toString()}`
        : API_ENDPOINTS.HOTELS.BASE;
      const response = await apiClient.get<ApiHotel[] | { data: ApiHotel[] }>(endpoint);
      const hotels = Array.isArray(response) ? response : (response?.data || []);
      return hotels.map(mapApiHotelToHotel);
    } catch (error) {
      console.warn('[hotelsApi.getAll] Error:', error);
      return [];
    }
  },

  getById: async (id: string, options?: { lite?: boolean }): Promise<Hotel | null> => {
    try {
      const endpoint = options?.lite
        ? `${API_ENDPOINTS.HOTELS.BY_ID(id)}?lite=1`
        : API_ENDPOINTS.HOTELS.BY_ID(id);
      const response = await apiClient.get<ApiHotel>(endpoint);
      return mapApiHotelToHotel(response);
    } catch (error) {
      console.warn('[hotelsApi.getById] Error:', error);
      return null;
    }
  },

  create: async (hotelData: Partial<Hotel>): Promise<Hotel | null> => {
    try {
      const response = await apiClient.post<ApiHotel>(API_ENDPOINTS.HOTELS.BASE, hotelData);
      return mapApiHotelToHotel(response);
    } catch (error) {
      console.warn('[hotelsApi.create] Error:', error);
      return null;
    }
  },

  update: async (id: string, hotelData: Partial<Hotel>): Promise<Hotel | null> => {
    try {
      const response = await apiClient.put<ApiHotel>(API_ENDPOINTS.HOTELS.BY_ID(id), hotelData);
      return mapApiHotelToHotel(response);
    } catch (error) {
      console.warn('[hotelsApi.update] Error:', error);
      return null;
    }
  },

  delete: async (id: string): Promise<boolean> => {
    try {
      await apiClient.delete(API_ENDPOINTS.HOTELS.BY_ID(id));
      return true;
    } catch (error) {
      console.warn('[hotelsApi.delete] Error:', error);
      return false;
    }
  },
};
