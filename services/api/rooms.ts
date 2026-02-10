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
  currentGuest?: {
    name: string;
    checkOutDate?: string;
  };
  isAvailable: boolean;
  createdAt: string;
  updatedAt: string;
}

const mapRoomStatus = (status: string, isAvailable: boolean): RoomStatus => {
  if (status === 'maintenance') return 'maintenance';
  if (status === 'cleaning') return 'cleaning';
  if (!isAvailable || status === 'occupied') return 'occupied';
  return 'available';
};

const mapApiRoomToRoom = (apiRoom: ApiRoom): Room => ({
  id: apiRoom._id,
  number: apiRoom.roomNumber,
  floor: apiRoom.floor || 1,
  type: (apiRoom.roomType?.toLowerCase() || 'standard') as Room['type'],
  status: mapRoomStatus(apiRoom.status, apiRoom.isAvailable),
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

  checkIn: async (id: string, guestData: unknown): Promise<Room | null> => {
    try {
      const response = await apiClient.post<ApiRoom>(API_ENDPOINTS.ROOMS.CHECKIN(id), guestData);
      return mapApiRoomToRoom(response);
    } catch (error) {
      console.error('[roomsApi.checkIn] Error:', error);
      return null;
    }
  },

  checkOut: async (id: string): Promise<Room | null> => {
    try {
      const response = await apiClient.post<ApiRoom>(API_ENDPOINTS.ROOMS.CHECKOUT(id), {});
      return mapApiRoomToRoom(response);
    } catch (error) {
      console.error('[roomsApi.checkOut] Error:', error);
      return null;
    }
  },

  updateStatus: async (id: string, status: string): Promise<Room | null> => {
    try {
      const response = await apiClient.patch<ApiRoom>(API_ENDPOINTS.ROOMS.BY_ID(id), { status });
      return mapApiRoomToRoom(response);
    } catch (error) {
      console.error('[roomsApi.updateStatus] Error:', error);
      return null;
    }
  },

  transferRoom: async (fromRoomId: string, toRoomId: string, guestData: unknown): Promise<boolean> => {
    try {
      await apiClient.post<ApiRoom>(API_ENDPOINTS.ROOMS.CHECKOUT(fromRoomId), {});
      await apiClient.post<ApiRoom>(API_ENDPOINTS.ROOMS.CHECKIN(toRoomId), guestData);
      return true;
    } catch (error) {
      console.error('[roomsApi.transferRoom] Error:', error);
      return false;
    }
  },

  markCleaning: async (id: string): Promise<Room | null> => {
    try {
      const response = await apiClient.patch<ApiRoom>(API_ENDPOINTS.ROOMS.BY_ID(id), { status: 'cleaning' });
      return mapApiRoomToRoom(response);
    } catch (error) {
      console.error('[roomsApi.markCleaning] Error:', error);
      return null;
    }
  },

  markClean: async (id: string): Promise<Room | null> => {
    try {
      const response = await apiClient.patch<ApiRoom>(API_ENDPOINTS.ROOMS.BY_ID(id), { status: 'available', isAvailable: true });
      return mapApiRoomToRoom(response);
    } catch (error) {
      console.error('[roomsApi.markClean] Error:', error);
      return null;
    }
  },

  delete: async (id: string): Promise<boolean> => {
    try {
      await apiClient.delete(API_ENDPOINTS.ROOMS.BY_ID(id));
      return true;
    } catch (error) {
      console.error('[roomsApi.delete] Error:', error);
      return false;
    }
  },
};
