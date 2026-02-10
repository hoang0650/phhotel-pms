import { apiClient } from './client';
import { API_ENDPOINTS } from './config';
import { Guest } from '@/types/hotel';

export interface ApiGuest {
  _id: string;
  name: string;
  email?: string;
  phone?: string;
  idNumber?: string;
  nationality?: string;
  avatar?: string;
  totalStays?: number;
  totalSpent?: number;
  vipStatus?: boolean;
  isVip?: boolean;
  createdAt: string;
  updatedAt: string;
}

const mapApiGuestToGuest = (apiGuest: ApiGuest): Guest => ({
  id: apiGuest._id,
  name: apiGuest.name || 'Khách hàng',
  email: apiGuest.email || '',
  phone: apiGuest.phone || '',
  idNumber: apiGuest.idNumber || '',
  nationality: apiGuest.nationality || 'Việt Nam',
  avatar: apiGuest.avatar,
  totalStays: apiGuest.totalStays || 0,
  totalSpent: apiGuest.totalSpent || 0,
  vipStatus: apiGuest.vipStatus || apiGuest.isVip || false,
});

export const guestsApi = {
  getAll: async (): Promise<Guest[]> => {
    try {
      const response = await apiClient.get<ApiGuest[] | { data: ApiGuest[] }>(API_ENDPOINTS.GUESTS.BASE);
      const guests = Array.isArray(response) ? response : (response?.data || []);
      return guests.map(mapApiGuestToGuest);
    } catch (error) {
      console.error('[guestsApi.getAll] Error:', error);
      return [];
    }
  },

  getById: async (id: string): Promise<Guest | null> => {
    try {
      const response = await apiClient.get<ApiGuest>(API_ENDPOINTS.GUESTS.BY_ID(id));
      return mapApiGuestToGuest(response);
    } catch (error) {
      console.error('[guestsApi.getById] Error:', error);
      return null;
    }
  },

  create: async (guestData: Partial<Guest>): Promise<Guest | null> => {
    try {
      const response = await apiClient.post<ApiGuest>(API_ENDPOINTS.GUESTS.BASE, guestData);
      return mapApiGuestToGuest(response);
    } catch (error) {
      console.error('[guestsApi.create] Error:', error);
      return null;
    }
  },

  update: async (id: string, guestData: Partial<Guest>): Promise<Guest | null> => {
    try {
      const response = await apiClient.put<ApiGuest>(API_ENDPOINTS.GUESTS.BY_ID(id), guestData);
      return mapApiGuestToGuest(response);
    } catch (error) {
      console.error('[guestsApi.update] Error:', error);
      return null;
    }
  },

  delete: async (id: string): Promise<boolean> => {
    try {
      await apiClient.delete(API_ENDPOINTS.GUESTS.BY_ID(id));
      return true;
    } catch (error) {
      console.error('[guestsApi.delete] Error:', error);
      return false;
    }
  },

  find: async (query: string): Promise<Guest[]> => {
    try {
      const response = await apiClient.get<ApiGuest[]>(`${API_ENDPOINTS.GUESTS.FIND}?q=${encodeURIComponent(query)}`);
      const guests = Array.isArray(response) ? response : [];
      return guests.map(mapApiGuestToGuest);
    } catch (error) {
      console.error('[guestsApi.find] Error:', error);
      return [];
    }
  },

  getByHotel: async (hotelId: string): Promise<Guest[]> => {
    try {
      const response = await apiClient.get<ApiGuest[] | { data: ApiGuest[] }>(
        `${API_ENDPOINTS.GUESTS.BASE}?hotelId=${hotelId}`
      );
      const guests = Array.isArray(response) ? response : (response?.data || []);
      return guests.map(mapApiGuestToGuest);
    } catch (error) {
      console.error('[guestsApi.getByHotel] Error:', error);
      return [];
    }
  },

  getByRoom: async (roomId: string): Promise<Guest[]> => {
    try {
      const response = await apiClient.get<ApiGuest[]>(API_ENDPOINTS.GUESTS.BY_ROOM(roomId));
      const guests = Array.isArray(response) ? response : [];
      return guests.map(mapApiGuestToGuest);
    } catch (error) {
      console.error('[guestsApi.getByRoom] Error:', error);
      return [];
    }
  },
};
