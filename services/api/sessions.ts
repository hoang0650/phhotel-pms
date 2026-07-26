import { apiClient } from './client';

export interface StaffContext {
  staffId: string | null;
  staffName: string | null;
}

export const sessionsApi = {
  getSelectedHotel: async (): Promise<string | null> => {
    try {
      const response = await apiClient.get<{ selectedHotelId?: string | null }>(
        '/sessions/selected-hotel'
      );
      return response?.selectedHotelId || null;
    } catch (error) {
      console.warn('[sessionsApi.getSelectedHotel] Error:', error);
      return null;
    }
  },

  saveSelectedHotel: async (hotelId: string): Promise<void> => {
    if (!hotelId) return;
    try {
      await apiClient.post('/sessions/selected-hotel', { hotelId });
    } catch (error) {
      console.warn('[sessionsApi.saveSelectedHotel] Error:', error);
    }
  },

  getSelectedFloor: async (hotelId: string): Promise<string | null> => {
    if (!hotelId) return null;
    try {
      const response = await apiClient.get<{ selectedFloor?: string | null }>(
        `/sessions/selected-floor?hotelId=${encodeURIComponent(hotelId)}`
      );
      return response?.selectedFloor || null;
    } catch (error) {
      console.warn('[sessionsApi.getSelectedFloor] Error:', error);
      return null;
    }
  },

  saveSelectedFloor: async (hotelId: string, floor: string | null): Promise<void> => {
    if (!hotelId) return;
    try {
      await apiClient.post('/sessions/selected-floor', { hotelId, floor });
    } catch (error) {
      console.warn('[sessionsApi.saveSelectedFloor] Error:', error);
    }
  },

  getStaffContext: async (): Promise<StaffContext> => {
    try {
      const response = await apiClient.get<StaffContext>('/sessions/staff-context');
      return {
        staffId: response?.staffId || null,
        staffName: response?.staffName || null,
      };
    } catch (error) {
      console.warn('[sessionsApi.getStaffContext] Error:', error);
      return { staffId: null, staffName: null };
    }
  },

  saveStaffContext: async (staffId: string | null, staffName: string | null = null): Promise<void> => {
    try {
      await apiClient.post('/sessions/staff-context', { staffId, staffName });
    } catch (error) {
      console.warn('[sessionsApi.saveStaffContext] Error:', error);
    }
  },
};
