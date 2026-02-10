import { apiClient } from './client';

export interface RevenueChartParams {
  hotelId: string;
  period?: 'day' | 'week' | 'month';
  startDate?: string;
  endDate?: string;
}

export interface RevenueChartData {
  message: string;
  labels: string[];
  revenueData: number[];
  paymentData: number[];
  expenseData: number[];
  totalRevenue: number;
  totalPayment: number;
  totalExpense: number;
  period: string;
  startDate: string;
  endDate: string;
}

export interface RevenueSummary {
  todayRevenue: number;
  yesterdayRevenue: number;
  weeklyRevenue: number;
  monthlyRevenue: number;
  revenueGrowth: number;
  roomRevenue: number;
  serviceRevenue: number;
}

export interface DailyRevenue {
  period: string;
  revenue: number;
}

export const revenueApi = {
  getRevenueByPeriod: async (params: RevenueChartParams): Promise<RevenueChartData> => {
    try {
      const endpoint = '/shift-handover/revenue/period';
      const queryParams = new URLSearchParams({
        hotelId: params.hotelId,
      });
      
      if (params.period) {
        queryParams.append('period', params.period);
      }
      if (params.startDate) {
        queryParams.append('startDate', params.startDate);
      }
      if (params.endDate) {
        queryParams.append('endDate', params.endDate);
      }

      const response = await apiClient.get<RevenueChartData>(`${endpoint}?${queryParams.toString()}`);
      return response;
    } catch (error) {
      console.error('[revenueApi.getRevenueByPeriod] Error:', error);
      return {
        message: 'Error',
        labels: [],
        revenueData: [],
        paymentData: [],
        expenseData: [],
        totalRevenue: 0,
        totalPayment: 0,
        totalExpense: 0,
        period: params.period || 'day',
        startDate: new Date().toISOString(),
        endDate: new Date().toISOString()
      };
    }
  },

  getDaily: async (hotelId?: string): Promise<DailyRevenue[]> => {
    if (!hotelId) return [];
    try {
      // Get last 7 days
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(endDate.getDate() - 6);

      const response = await revenueApi.getRevenueByPeriod({
        hotelId,
        period: 'day',
        startDate: startDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0]
      });

      if (!response || !response.labels) return [];

      return response.labels.map((label, index) => ({
        period: label, // label from backend is usually date string
        revenue: response.revenueData[index] || 0
      }));
    } catch (error) {
      console.error('[revenueApi.getDaily] Error:', error);
      return [];
    }
  },

  getSummary: async (hotelId?: string): Promise<RevenueSummary> => {
    if (!hotelId) return {
      todayRevenue: 0,
      yesterdayRevenue: 0,
      weeklyRevenue: 0,
      monthlyRevenue: 0,
      revenueGrowth: 0,
      roomRevenue: 0,
      serviceRevenue: 0
    };

    try {
      // We'll approximate this by calling getRevenueByPeriod for different ranges
      // This is not ideal but ensures compatibility with the new backend logic
      
      const today = new Date().toISOString().split('T')[0];
      
      // Today
      const todayData = await revenueApi.getRevenueByPeriod({
        hotelId,
        period: 'day',
        startDate: today,
        endDate: today
      });

      // Yesterday
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split('T')[0];
      const yesterdayData = await revenueApi.getRevenueByPeriod({
        hotelId,
        period: 'day',
        startDate: yesterdayStr,
        endDate: yesterdayStr
      });

      // This Month
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      const startOfMonthStr = startOfMonth.toISOString().split('T')[0];
      const monthData = await revenueApi.getRevenueByPeriod({
        hotelId,
        period: 'month',
        startDate: startOfMonthStr,
        endDate: today
      });

      return {
        todayRevenue: todayData.totalRevenue || 0,
        yesterdayRevenue: yesterdayData.totalRevenue || 0,
        weeklyRevenue: 0, // Placeholder
        monthlyRevenue: monthData.totalRevenue || 0,
        revenueGrowth: 0, // Placeholder
        roomRevenue: 0, // Placeholder
        serviceRevenue: 0 // Placeholder
      };
    } catch (error) {
      console.error('[revenueApi.getSummary] Error:', error);
      return {
        todayRevenue: 0,
        yesterdayRevenue: 0,
        weeklyRevenue: 0,
        monthlyRevenue: 0,
        revenueGrowth: 0,
        roomRevenue: 0,
        serviceRevenue: 0
      };
    }
  }
};
