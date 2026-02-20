import { apiClient } from './client';
import { API_ENDPOINTS } from './config';
import { extractId } from './utils';

export interface DebtLabel {
  name: string;
  color?: string;
}

export interface Debt {
  id: string;
  hotelId?: string;
  invoiceId?: string;
  invoiceNumber?: string;
  roomId?: string;
  roomNumber?: string;
  customerName: string;
  customerPhone?: string;
  customerEmail?: string;
  debtAmount: number;
  paidAmount: number;
  remainingAmount: number;
  status: 'pending' | 'partial' | 'settled' | 'cancelled';
  debtDate?: string;
  dueDate?: string;
  notes?: string;
  labels?: DebtLabel[];
  createdAt?: string;
  updatedAt?: string;
}

export interface DebtQuery {
  page?: number;
  pageSize?: number;
  hotelId?: string;
  status?: string;
  customerId?: string;
  startDate?: string;
  endDate?: string;
}

export interface DebtResponse {
  debts: Debt[];
  total: number;
  page: number;
  totalPages: number;
}

export interface SettleDebtRequest {
  amount: number;
  paymentMethod: string;
  notes?: string;
}

export interface ApiDebt {
  _id?: string;
  hotelId?: any;
  invoiceId?: any;
  invoiceNumber?: string;
  roomId?: any;
  roomNumber?: string;
  customerName?: string;
  customerPhone?: string;
  customerEmail?: string;
  debtAmount?: number;
  paidAmount?: number;
  remainingAmount?: number;
  status?: string;
  debtDate?: string;
  dueDate?: string;
  notes?: string;
  labels?: DebtLabel[] | string[];
  createdAt?: string;
  updatedAt?: string;
}

const normalizeLabels = (labels?: DebtLabel[] | string[]): DebtLabel[] => {
  if (!labels) return [];
  return labels.map(label => {
    if (typeof label === 'string') return { name: label };
    return { name: label.name, color: label.color };
  });
};

const mapApiDebtToDebt = (apiDebt: ApiDebt): Debt => ({
  id: extractId(apiDebt._id) || '',
  hotelId: extractId(apiDebt.hotelId),
  invoiceId: extractId(apiDebt.invoiceId),
  invoiceNumber: apiDebt.invoiceNumber,
  roomId: extractId(apiDebt.roomId),
  roomNumber: apiDebt.roomNumber,
  customerName: apiDebt.customerName || '',
  customerPhone: apiDebt.customerPhone,
  customerEmail: apiDebt.customerEmail,
  debtAmount: Number(apiDebt.debtAmount) || 0,
  paidAmount: Number(apiDebt.paidAmount) || 0,
  remainingAmount: Number(apiDebt.remainingAmount) || 0,
  status: (apiDebt.status as Debt['status']) || 'pending',
  debtDate: apiDebt.debtDate,
  dueDate: apiDebt.dueDate,
  notes: apiDebt.notes,
  labels: normalizeLabels(apiDebt.labels),
  createdAt: apiDebt.createdAt,
  updatedAt: apiDebt.updatedAt,
});

const buildDebtResponse = (response: any): DebtResponse => {
  const payload = response?.data || response;
  if (Array.isArray(payload)) {
    return {
      debts: payload.map(mapApiDebtToDebt),
      total: payload.length,
      page: 1,
      totalPages: 1,
    };
  }
  const debts = Array.isArray(payload?.debts) ? payload.debts : [];
  return {
    debts: debts.map(mapApiDebtToDebt),
    total: Number(payload?.total) || debts.length,
    page: Number(payload?.page) || 1,
    totalPages: Number(payload?.totalPages) || 1,
  };
};

export const debtsApi = {
  getDebts: async (query?: DebtQuery): Promise<DebtResponse> => {
    try {
      const params = new URLSearchParams();
      if (query?.page) params.append('page', query.page.toString());
      if (query?.pageSize) params.append('limit', query.pageSize.toString());
      if (query?.hotelId) params.append('hotelId', query.hotelId);
      if (query?.status) params.append('status', query.status);
      if (query?.customerId) params.append('customerId', query.customerId);
      if (query?.startDate) params.append('startDate', query.startDate);
      if (query?.endDate) params.append('endDate', query.endDate);
      const endpoint = params.toString()
        ? `${API_ENDPOINTS.DEBTS.BASE}?${params.toString()}`
        : API_ENDPOINTS.DEBTS.BASE;
      const response = await apiClient.get(endpoint);
      return buildDebtResponse(response);
    } catch (error) {
      console.warn('[debtsApi.getDebts] Error:', error);
      return { debts: [], total: 0, page: 1, totalPages: 1 };
    }
  },

  settleDebt: async (id: string, request: SettleDebtRequest): Promise<Debt | null> => {
    try {
      const response = await apiClient.post<{ debt?: ApiDebt }>(API_ENDPOINTS.DEBTS.SETTLE(id), request);
      const debt = (response as any)?.debt || (response as any)?.data?.debt || response;
      if (!debt) return null;
      return mapApiDebtToDebt(debt);
    } catch (error) {
      console.warn('[debtsApi.settleDebt] Error:', error);
      return null;
    }
  },

  updateLabels: async (id: string, labels: DebtLabel[]): Promise<Debt | null> => {
    try {
      const response = await apiClient.patch<{ debt?: ApiDebt }>(API_ENDPOINTS.DEBTS.LABELS(id), { labels });
      const debt = (response as any)?.debt || (response as any)?.data?.debt || response;
      if (!debt) return null;
      return mapApiDebtToDebt(debt);
    } catch (error) {
      console.warn('[debtsApi.updateLabels] Error:', error);
      return null;
    }
  },

  deleteDebt: async (id: string): Promise<boolean> => {
    try {
      await apiClient.delete(API_ENDPOINTS.DEBTS.BY_ID(id));
      return true;
    } catch (error) {
      console.warn('[debtsApi.deleteDebt] Error:', error);
      return false;
    }
  },
};
