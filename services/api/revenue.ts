import { apiClient, shouldUseMockData, CORS_SKIP_ERROR } from './client';
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
  averageBookingValue: number;
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

const mockRevenueSummary: RevenueSummary = {
  todayRevenue: 15500000,
  yesterdayRevenue: 12800000,
  weeklyRevenue: 85000000,
  monthlyRevenue: 350000000,
  yearlyRevenue: 4200000000,
  totalBookings: 156,
  averageBookingValue: 2250000,
  revenueGrowth: 12.5,
  roomRevenue: 280000000,
  serviceRevenue: 70000000,
};

const mockDailyRevenue: RevenueByPeriod[] = [
  { period: '2025-02-04', revenue: 12500000, bookings: 8, occupancyRate: 72 },
  { period: '2025-02-05', revenue: 14200000, bookings: 10, occupancyRate: 78 },
  { period: '2025-02-06', revenue: 11800000, bookings: 7, occupancyRate: 65 },
  { period: '2025-02-07', revenue: 16500000, bookings: 12, occupancyRate: 85 },
  { period: '2025-02-08', revenue: 18200000, bookings: 14, occupancyRate: 92 },
  { period: '2025-02-09', revenue: 17800000, bookings: 13, occupancyRate: 88 },
  { period: '2025-02-10', revenue: 15500000, bookings: 11, occupancyRate: 80 },
];

const mockMonthlyRevenue: RevenueByPeriod[] = [
  { period: '2025-01', revenue: 320000000, bookings: 145, occupancyRate: 75 },
  { period: '2025-02', revenue: 350000000, bookings: 156, occupancyRate: 78 },
];

export const revenueApi = {
  getSummary: async (hotelId?: string): Promise<RevenueSummary> => {
    if (shouldUseMockData()) {
      console.log('[revenueApi.getSummary] Using mock data');
      return mockRevenueSummary;
    }

    try {
      const endpoint = hotelId 
        ? `${API_ENDPOINTS.REVENUE.BY_HOTEL(hotelId)}/summary`
        : API_ENDPOINTS.REVENUE.SUMMARY;
      const response = await apiClient.get<RevenueSummary>(endpoint);
      return response;
    } catch (error) {
      if (error instanceof Error && error.message === CORS_SKIP_ERROR) {
        console.log('[revenueApi.getSummary] Using mock data as fallback');
        return mockRevenueSummary;
      }
      console.error('[revenueApi.getSummary] Error:', error);
      return mockRevenueSummary;
    }
  },

  getDaily: async (hotelId?: string, startDate?: string, endDate?: string): Promise<RevenueByPeriod[]> => {
    if (shouldUseMockData()) {
      console.log('[revenueApi.getDaily] Using mock data');
      return mockDailyRevenue;
    }

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
      return response;
    } catch (error) {
      if (error instanceof Error && error.message === CORS_SKIP_ERROR) {
        console.log('[revenueApi.getDaily] Using mock data as fallback');
        return mockDailyRevenue;
      }
      console.error('[revenueApi.getDaily] Error:', error);
      return mockDailyRevenue;
    }
  },

  getMonthly: async (hotelId?: string, year?: number): Promise<RevenueByPeriod[]> => {
    if (shouldUseMockData()) {
      console.log('[revenueApi.getMonthly] Using mock data');
      return mockMonthlyRevenue;
    }

    try {
      let endpoint = API_ENDPOINTS.REVENUE.MONTHLY;
      const params = new URLSearchParams();
      if (hotelId) params.append('hotelId', hotelId);
      if (year) params.append('year', year.toString());
      
      if (params.toString()) {
        endpoint += `?${params.toString()}`;
      }
      
      const response = await apiClient.get<RevenueByPeriod[]>(endpoint);
      return response;
    } catch (error) {
      if (error instanceof Error && error.message === CORS_SKIP_ERROR) {
        console.log('[revenueApi.getMonthly] Using mock data as fallback');
        return mockMonthlyRevenue;
      }
      console.error('[revenueApi.getMonthly] Error:', error);
      return mockMonthlyRevenue;
    }
  },

  getByHotel: async (hotelId: string): Promise<RevenueData[]> => {
    if (shouldUseMockData()) {
      console.log('[revenueApi.getByHotel] Using mock data');
      return [];
    }

    try {
      const response = await apiClient.get<RevenueData[]>(API_ENDPOINTS.REVENUE.BY_HOTEL(hotelId));
      return response;
    } catch (error) {
      if (error instanceof Error && error.message === CORS_SKIP_ERROR) {
        console.log('[revenueApi.getByHotel] Using mock data as fallback');
        return [];
      }
      console.error('[revenueApi.getByHotel] Error:', error);
      return [];
    }
  },
};
