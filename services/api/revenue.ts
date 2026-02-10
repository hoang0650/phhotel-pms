import { apiClient } from './client';
import { API_ENDPOINTS } from './config';

export interface RevenueData {
  id: string;
  hotelId: string;
  date: string;
  roomRevenue: number;
  serviceRevenue: number;
  totalRevenue: number;
  bookingsCount: number;
  occupancyRate: number;
}

export interface RevenueSummary {
  todayRevenue: number;
  yesterdayRevenue: number;
  weeklyRevenue: number;
  monthlyRevenue: number;
  yearlyRevenue: number;
  totalBookings: number;
  totalGuests: number;
  averageBookingValue: number;
  averageOccupancy: number;
  averageRoomRate: number;
  revenueGrowth: number;
  roomRevenue: number;
  serviceRevenue: number;
}

export interface RevenueByPeriod {
  period: string;
  revenue: number;
  bookings: number;
  occupancyRate: number;
}

const defaultRevenueSummary: RevenueSummary = {
  todayRevenue: 0,
  yesterdayRevenue: 0,
  weeklyRevenue: 0,
  monthlyRevenue: 0,
  yearlyRevenue: 0,
  totalBookings: 0,
  totalGuests: 0,
  averageBookingValue: 0,
  averageOccupancy: 0,
  averageRoomRate: 0,
  revenueGrowth: 0,
  roomRevenue: 0,
  serviceRevenue: 0,
};

export const revenueApi = {
  getSummary: async (hotelId?: string): Promise<RevenueSummary> => {
    try {
      const endpoint = hotelId 
        ? `${API_ENDPOINTS.REVENUE.BY_HOTEL(hotelId)}/summary`
        : API_ENDPOINTS.REVENUE.SUMMARY;
      const response = await apiClient.get<RevenueSummary>(endpoint);
      return response;
    } catch (error) {
      console.error('[revenueApi.getSummary] Error:', error);
      return defaultRevenueSummary;
    }
  },

  getDaily: async (hotelId?: string, startDate?: string, endDate?: string): Promise<RevenueByPeriod[]> => {
    try {
      let endpoint = API_ENDPOINTS.REVENUE.DAILY;
      const params = new URLSearchParams();
      if (hotelId) params.append('hotelId', hotelId);
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);
      
      if (params.toString()) {
        endpoint += `?${params.toString()}`;
      }
      
      const response = await apiClient.get<RevenueByPeriod[]>(endpoint);
      return Array.isArray(response) ? response : [];
    } catch (error) {
      console.error('[revenueApi.getDaily] Error:', error);
      return [];
    }
  },

  getMonthly: async (hotelId?: string, year?: number): Promise<RevenueByPeriod[]> => {
    try {
      let endpoint = API_ENDPOINTS.REVENUE.MONTHLY;
      const params = new URLSearchParams();
      if (hotelId) params.append('hotelId', hotelId);
      if (year) params.append('year', year.toString());
      
      if (params.toString()) {
        endpoint += `?${params.toString()}`;
      }
      
      const response = await apiClient.get<RevenueByPeriod[]>(endpoint);
      return Array.isArray(response) ? response : [];
    } catch (error) {
      console.error('[revenueApi.getMonthly] Error:', error);
      return [];
    }
  },

  getYearly: async (hotelId?: string): Promise<RevenueByPeriod[]> => {
    try {
      let endpoint = API_ENDPOINTS.REVENUE.YEARLY;
      if (hotelId) {
        endpoint += `?hotelId=${hotelId}`;
      }
      const response = await apiClient.get<RevenueByPeriod[]>(endpoint);
      return Array.isArray(response) ? response : [];
    } catch (error) {
      console.error('[revenueApi.getYearly] Error:', error);
      return [];
    }
  },

  getByHotel: async (hotelId: string): Promise<RevenueData[]> => {
    try {
      const response = await apiClient.get<RevenueData[]>(API_ENDPOINTS.REVENUE.BY_HOTEL(hotelId));
      return Array.isArray(response) ? response : [];
    } catch (error) {
      console.error('[revenueApi.getByHotel] Error:', error);
      return [];
    }
  },

  getByDateRange: async (startDate: string, endDate: string, hotelId?: string): Promise<RevenueByPeriod[]> => {
    try {
      let endpoint = `${API_ENDPOINTS.REVENUE.BY_DATE_RANGE}?startDate=${startDate}&endDate=${endDate}`;
      if (hotelId) {
        endpoint += `&hotelId=${hotelId}`;
      }
      const response = await apiClient.get<RevenueByPeriod[]>(endpoint);
      return Array.isArray(response) ? response : [];
    } catch (error) {
      console.error('[revenueApi.getByDateRange] Error:', error);
      return [];
    }
  },
};
