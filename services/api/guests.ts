import { apiClient } from './client';
import { API_ENDPOINTS } from './config';
import { Guest } from '@/types/hotel';

export interface ApiGuest {
  _id: string;
  name?: string;
  email?: string;
  phone?: string;
  idNumber?: string;
  nationality?: string;
  avatar?: string;
  totalStays?: number;
  totalSpent?: number;
  vipStatus?: boolean;
  isVip?: boolean;
  guestType?: 'regular' | 'frequent' | 'group';
  personalInfo?: {
    firstName?: string;
    lastName?: string;
    fullName?: string;
    dateOfBirth?: string;
    gender?: string;
    nationality?: string;
    idNumber?: string;
  };
  contactInfo?: {
    email?: string;
    phone?: string;
    address?: {
      street?: string;
      city?: string;
      state?: string;
      country?: string;
      postalCode?: string;
    };
  };
  createdAt: string;
  updatedAt: string;
}

const formatAddress = (address?: {
  street?: string;
  city?: string;
  state?: string;
  country?: string;
  postalCode?: string;
}) => {
  if (!address) return '';
  const parts = [address.street, address.city, address.state, address.country, address.postalCode].filter(Boolean);
  return parts.join(', ');
};

const mapApiGuestToGuest = (apiGuest: ApiGuest): Guest => {
  const personal = apiGuest.personalInfo || {};
  const contact = apiGuest.contactInfo || {};
  const fullName = apiGuest.name || personal.fullName || [personal.firstName, personal.lastName].filter(Boolean).join(' ').trim();
  const dateOfBirth = personal.dateOfBirth ? new Date(personal.dateOfBirth).toISOString() : '';
  return {
    id: apiGuest._id,
    name: fullName || 'Khách hàng',
    email: apiGuest.email || contact.email || '',
    phone: apiGuest.phone || contact.phone || '',
    idNumber: apiGuest.idNumber || personal.idNumber || '',
    nationality: apiGuest.nationality || personal.nationality || 'Việt Nam',
    avatar: apiGuest.avatar,
    totalStays: apiGuest.totalStays || 0,
    totalSpent: apiGuest.totalSpent || 0,
    vipStatus: apiGuest.vipStatus || apiGuest.isVip || false,
    guestType: apiGuest.guestType,
    gender: personal.gender || '',
    dateOfBirth,
    address: formatAddress(contact.address),
  };
};

const extractGuests = (response: ApiGuest[] | { data?: ApiGuest[]; guests?: ApiGuest[] } | null | undefined) => {
  if (Array.isArray(response)) return response;
  if (Array.isArray(response?.data)) return response?.data;
  if (Array.isArray(response?.guests)) return response?.guests;
  return [];
};

export const guestsApi = {
  getAll: async (): Promise<Guest[]> => {
    try {
      const response = await apiClient.get<ApiGuest[] | { data?: ApiGuest[]; guests?: ApiGuest[] }>(API_ENDPOINTS.GUESTS.BASE);
      return extractGuests(response).map(mapApiGuestToGuest);
    } catch (error) {
      console.warn('[guestsApi.getAll] Error:', error);
      return [];
    }
  },

  getById: async (id: string): Promise<Guest | null> => {
    try {
      const response = await apiClient.get<ApiGuest>(API_ENDPOINTS.GUESTS.BY_ID(id));
      return mapApiGuestToGuest(response);
    } catch (error) {
      console.warn('[guestsApi.getById] Error:', error);
      return null;
    }
  },

  create: async (guestData: Partial<Guest>): Promise<Guest | null> => {
    try {
      const response = await apiClient.post<ApiGuest>(API_ENDPOINTS.GUESTS.BASE, guestData);
      return mapApiGuestToGuest(response);
    } catch (error) {
      console.warn('[guestsApi.create] Error:', error);
      return null;
    }
  },

  update: async (id: string, guestData: Partial<Guest>): Promise<Guest | null> => {
    try {
      const response = await apiClient.put<ApiGuest>(API_ENDPOINTS.GUESTS.BY_ID(id), guestData);
      return mapApiGuestToGuest(response);
    } catch (error) {
      console.warn('[guestsApi.update] Error:', error);
      return null;
    }
  },

  delete: async (id: string): Promise<boolean> => {
    try {
      await apiClient.delete(API_ENDPOINTS.GUESTS.BY_ID(id));
      return true;
    } catch (error) {
      console.warn('[guestsApi.delete] Error:', error);
      return false;
    }
  },

  find: async (query: string): Promise<Guest[]> => {
    try {
      const response = await apiClient.get<ApiGuest[]>(`${API_ENDPOINTS.GUESTS.FIND}?q=${encodeURIComponent(query)}`);
      const guests = Array.isArray(response) ? response : [];
      return guests.map(mapApiGuestToGuest);
    } catch (error) {
      console.warn('[guestsApi.find] Error:', error);
      return [];
    }
  },

  getByHotel: async (hotelId: string): Promise<Guest[]> => {
    try {
      const response = await apiClient.get<ApiGuest[] | { data?: ApiGuest[]; guests?: ApiGuest[] }>(
        `${API_ENDPOINTS.GUESTS.BASE}?hotelId=${hotelId}`
      );
      return extractGuests(response).map(mapApiGuestToGuest);
    } catch (error) {
      console.warn('[guestsApi.getByHotel] Error:', error);
      return [];
    }
  },

  getByRoom: async (roomId: string): Promise<Guest[]> => {
    try {
      const response = await apiClient.get<ApiGuest[]>(API_ENDPOINTS.GUESTS.BY_ROOM(roomId));
      const guests = Array.isArray(response) ? response : [];
      return guests.map(mapApiGuestToGuest);
    } catch (error) {
      console.warn('[guestsApi.getByRoom] Error:', error);
      return [];
    }
  },
  
  assignRoom: async (
    guestId: string,
    roomId: string,
    payload?: { checkInTime?: string; rateType?: string; guestInfo?: { name?: string; phone?: string; email?: string; idNumber?: string; address?: string; guestSource?: string } }
  ): Promise<{ message?: string }> => {
    try {
      const endpoint = API_ENDPOINTS.GUESTS.ASSIGN_ROOM(guestId);
      const body = { guestId, roomId, ...(payload || {}) };
      const response = await apiClient.post<{ message?: string }>(endpoint, body);
      return response;
    } catch (error: any) {
      console.warn('[guestsApi.assignRoom] Error:', error);
      throw error;
    }
  },
};
