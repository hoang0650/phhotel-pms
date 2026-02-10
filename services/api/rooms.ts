import { apiClient } from './client';
import { API_ENDPOINTS } from './config';
import { Room, RoomStatus } from '@/types/hotel';

export interface ApiRoom {
  _id: string;
  roomNumber: string;
  roomType: string;
  floor: number;
  price: number;
  capacity: number;
  amenities: string[];
  status: string;
  guestStatus?: 'in' | 'out';
  currentGuest?: {
    name: string;
    checkOutDate?: string;
  };
  isAvailable: boolean;
  createdAt: string;
  updatedAt: string;
}

const mapRoomStatus = (status: string): RoomStatus => {
  const normalizedStatus = status?.toLowerCase();
  if (normalizedStatus === 'maintenance') return 'maintenance';
  if (normalizedStatus === 'cleaning') return 'cleaning';
  if (normalizedStatus === 'dirty') return 'dirty';
  if (normalizedStatus === 'booked') return 'booked';
  if (normalizedStatus === 'occupied') return 'occupied';
  if (normalizedStatus === 'vacant') return 'vacant';
  // Fallback
  return 'vacant';
};

const mapApiRoomToRoom = (apiRoom: ApiRoom): Room => ({
  id: apiRoom._id,
  number: apiRoom.roomNumber,
  floor: apiRoom.floor || 1,
  type: (apiRoom.roomType?.toLowerCase() || 'standard') as Room['type'],
  status: mapRoomStatus(apiRoom.status),
  guestStatus: apiRoom.guestStatus,
  price: apiRoom.price || 0,
  capacity: apiRoom.capacity || 2,
  amenities: apiRoom.amenities || [],
  currentGuest: apiRoom.currentGuest?.name,
  checkoutDate: apiRoom.currentGuest?.checkOutDate,
});

export const roomsApi = {
  getAll: async (hotelId?: string): Promise<Room[]> => {
    try {
      const endpoint = hotelId 
        ? `${API_ENDPOINTS.ROOMS.BASE}?hotelId=${hotelId}` 
        : API_ENDPOINTS.ROOMS.BASE;
      const response = await apiClient.get<ApiRoom[]>(endpoint);
      const rooms = Array.isArray(response) ? response : [];
      return rooms.map(mapApiRoomToRoom);
    } catch (error) {
      console.error('[roomsApi.getAll] Error:', error);
      return [];
    }
  },

  getById: async (id: string): Promise<Room | null> => {
    try {
      const response = await apiClient.get<ApiRoom>(API_ENDPOINTS.ROOMS.BY_ID(id));
      return mapApiRoomToRoom(response);
    } catch (error) {
      console.error('[roomsApi.getById] Error:', error);
      return null;
    }
  },

  getAvailable: async (hotelId?: string): Promise<Room[]> => {
    try {
      const endpoint = hotelId 
        ? `${API_ENDPOINTS.ROOMS.AVAILABLE}?hotelId=${hotelId}` 
        : API_ENDPOINTS.ROOMS.AVAILABLE;
      const response = await apiClient.get<ApiRoom[]>(endpoint);
      const rooms = Array.isArray(response) ? response : [];
      return rooms.map(mapApiRoomToRoom);
    } catch (error) {
      console.error('[roomsApi.getAvailable] Error:', error);
      return [];
    }
  },

  create: async (roomData: Partial<Room>): Promise<Room | null> => {
    try {
      const response = await apiClient.post<ApiRoom>(API_ENDPOINTS.ROOMS.BASE, roomData);
      return mapApiRoomToRoom(response);
    } catch (error) {
      console.error('[roomsApi.create] Error:', error);
      return null;
    }
  },

  update: async (id: string, roomData: Partial<Room>): Promise<Room | null> => {
    try {
      const response = await apiClient.put<ApiRoom>(API_ENDPOINTS.ROOMS.BY_ID(id), roomData);
      return mapApiRoomToRoom(response);
    } catch (error) {
      console.error('[roomsApi.update] Error:', error);
      return null;
    }
  },
};
