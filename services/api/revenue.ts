import { apiClient } from './client';
import { API_ENDPOINTS } from './config';

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

export interface PeriodRevenue {
  period: string;
  revenue: number;
}

export interface RevenueBreakdownRange {
  roomRevenue: number;
  serviceRevenue: number;
  receiptRevenue?: number;
  otherRevenue?: number;
  totalRevenue?: number;
  period?: {
    startDate: string;
    endDate: string;
  };
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
    if (!hotelId) {
      return {
        todayRevenue: 0,
        yesterdayRevenue: 0,
        weeklyRevenue: 0,
        monthlyRevenue: 0,
        revenueGrowth: 0,
        roomRevenue: 0,
        serviceRevenue: 0,
      };
    }
    try {
      const endpoint = `/revenue/summary`;
      const queryParams = new URLSearchParams({ hotelId });
      const response = await apiClient.get<any>(`${endpoint}?${queryParams.toString()}`);
      return {
        todayRevenue: response.todayRevenue || 0,
        yesterdayRevenue: response.yesterdayRevenue || 0,
        weeklyRevenue: response.weeklyRevenue || 0,
        monthlyRevenue: response.monthlyRevenue || 0,
        revenueGrowth: response.revenueGrowth || 0,
        roomRevenue: response.roomRevenue || 0,
        serviceRevenue: response.serviceRevenue || 0,
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
        serviceRevenue: 0,
      };
    }
  }
  ,

  getRevenueByRange: async (hotelId: string, startDate: string, endDate: string): Promise<RevenueBreakdownRange> => {
    try {
      const params = new URLSearchParams({ hotelId, startDate, endDate });
      const response = await apiClient.get<{ roomRevenue: number; serviceRevenue: number }>(
        `/revenue/date-range?${params.toString()}`
      );
      return {
        roomRevenue: Number((response as any)?.roomRevenue) || 0,
        serviceRevenue: Number((response as any)?.serviceRevenue) || 0,
      };
    } catch (error) {
      console.error('[revenueApi.getRevenueByRange] Error:', error);
      return {
        roomRevenue: 0,
        serviceRevenue: 0,
      };
    }
  },

  getBreakdownByRange: async (hotelId: string, startDate: string, endDate: string): Promise<RevenueBreakdownRange> => {
    try {
      const params = new URLSearchParams({ hotelId, startDate, endDate });
      const response = await apiClient.get<{ message: string; data: any }>(
        `${API_ENDPOINTS.FINANCIAL.SUMMARY}?${params.toString()}`
      );
      const data = (response as any)?.data || response;
      const breakdown = data?.breakdown?.revenue || {};
      return {
        roomRevenue: Number(breakdown.roomRevenue) || 0,
        serviceRevenue: Number(breakdown.serviceRevenue) || 0,
        receiptRevenue: Number(breakdown.receiptRevenue) || 0,
        otherRevenue: Number(breakdown.otherRevenue) || 0,
        totalRevenue: Number(data?.totalRevenue) || 0,
        period: data?.period,
      };
    } catch (error) {
      console.error('[revenueApi.getBreakdownByRange] Error:', error);
      return {
        roomRevenue: 0,
        serviceRevenue: 0,
        receiptRevenue: 0,
        otherRevenue: 0,
      };
    }
  },

  getWeekly: async (hotelId?: string): Promise<PeriodRevenue[]> => {
    if (!hotelId) return [];
    try {
      const response = await revenueApi.getRevenueByPeriod({
        hotelId,
        period: 'week',
      });
      const labels = response?.labels || [];
      const revenues = response?.revenueData || [];
      return labels.map((label, index) => ({
        period: label,
        revenue: revenues[index] || 0,
      }));
    } catch (error) {
      console.error('[revenueApi.getWeekly] Error:', error);
      return [];
    }
  },

  getMonthly: async (hotelId?: string): Promise<PeriodRevenue[]> => {
    if (!hotelId) return [];
    try {
      const response = await revenueApi.getRevenueByPeriod({
        hotelId,
        period: 'month',
      });
      const labels = response?.labels || [];
      const revenues = response?.revenueData || [];
      return labels.map((label, index) => ({
        period: label,
        revenue: revenues[index] || 0,
      }));
    } catch (error) {
      console.error('[revenueApi.getMonthly] Error:', error);
      return [];
    }
  }
};
