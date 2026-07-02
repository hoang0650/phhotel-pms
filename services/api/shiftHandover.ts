import { apiClient } from './client';
import { API_ENDPOINTS } from './config';
import { ShiftHandover, ShiftHandoverCreateRequest, ShiftHandoverHistoryResponse, ManagerHandoverRequest } from '@/types/hotel';

export interface ShiftPreviousAmountResponse {
  previousShiftAmount: number;
  lastShiftHandover?: {
    id: string;
    handoverTime: string;
    handoverAmount: number;
  } | null;
}

export interface ShiftRevenueResponse {
  cashTotal: number;
  bankTransferTotal: number;
  cardTotal: number;
  expenseTotal: number;
  incomeTotal: number;
  totalRevenue: number;
  netRevenue: number;
}

export interface ShiftHandoverCreateResponse {
  message: string;
  shiftHandover: ShiftHandover;
  transaction?: any;
  login?: {
    token: string;
    user: {
      _id: string;
      username: string;
      email: string;
      fullName?: string;
      role: string;
      hotelId?: string;
    };
    staff?: {
      _id: string;
      personalInfo?: any;
      employmentInfo?: any;
    };
  };
}

export const shiftHandoverApi = {
  create: async (payload: ShiftHandoverCreateRequest): Promise<ShiftHandoverCreateResponse> => {
    return apiClient.post<ShiftHandoverCreateResponse>(API_ENDPOINTS.SHIFT_HANDOVER.BASE, payload);
  },

  createManagerHandover: async (payload: ManagerHandoverRequest): Promise<any> => {
    return apiClient.post(API_ENDPOINTS.SHIFT_HANDOVER.MANAGER, payload);
  },

  getPreviousShiftAmount: async (hotelId: string): Promise<ShiftPreviousAmountResponse> => {
    const response = await apiClient.get<{ data: ShiftPreviousAmountResponse }>(
      `${API_ENDPOINTS.SHIFT_HANDOVER.PREVIOUS_AMOUNT}?hotelId=${hotelId}`
    );
    return response?.data || { previousShiftAmount: 0, lastShiftHandover: null };
  },

  getRevenue: async (hotelId: string, startDate?: string, endDate?: string): Promise<ShiftRevenueResponse> => {
    try {
      if (!hotelId) {
        return {
          cashTotal: 0,
          bankTransferTotal: 0,
          cardTotal: 0,
          expenseTotal: 0,
          incomeTotal: 0,
          totalRevenue: 0,
          netRevenue: 0,
        };
      }
      const params = new URLSearchParams({ hotelId });
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);
      const response = await apiClient.get<{ data: ShiftRevenueResponse }>(
        `${API_ENDPOINTS.SHIFT_HANDOVER.REVENUE}?${params.toString()}`
      );
      return response?.data || {
        cashTotal: 0,
        bankTransferTotal: 0,
        cardTotal: 0,
        expenseTotal: 0,
        incomeTotal: 0,
        totalRevenue: 0,
        netRevenue: 0,
      };
    } catch (error: any) {
      // On FORBIDDEN or any error, return zeros and avoid throwing
      console.warn('[shiftHandoverApi.getRevenue] Error:', error?.message || error);
      return {
        cashTotal: 0,
        bankTransferTotal: 0,
        cardTotal: 0,
        expenseTotal: 0,
        incomeTotal: 0,
        totalRevenue: 0,
        netRevenue: 0,
      };
    }
  },

  getHistory: async (
    hotelId: string,
    page = 1,
    limit = 20,
    filters?: {
      startDate?: string;
      endDate?: string;
      staffId?: string;
    }
  ): Promise<ShiftHandoverHistoryResponse> => {
    const params = new URLSearchParams({
      hotelId,
      page: String(page),
      limit: String(limit),
    });
    if (filters?.startDate) params.append('startDate', filters.startDate);
    if (filters?.endDate) params.append('endDate', filters.endDate);
    if (filters?.staffId) params.append('staffId', filters.staffId);
    const response = await apiClient.get<ShiftHandoverHistoryResponse>(
      `${API_ENDPOINTS.SHIFT_HANDOVER.HISTORY}?${params.toString()}`
    );
    return response;
  },
};
