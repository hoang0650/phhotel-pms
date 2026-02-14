import { apiClient } from './client';
import { API_ENDPOINTS } from './config';

export type TransactionMethod = 'cash' | 'credit_card' | 'bank_transfer' | 'card' | 'virtual_card' | 'other';
export type ExpenseCategory = 'supplies' | 'utilities' | 'salary' | 'maintenance' | 'marketing' | 'other';
export type IncomeCategory = 'service' | 'rental' | 'other';

export interface CreateExpenseRequest {
  hotelId: string;
  amount: number;
  method: TransactionMethod;
  expenseCategory?: ExpenseCategory;
  description?: string;
  notes?: string;
  recipient?: string;
}

export interface CreateIncomeRequest {
  hotelId: string;
  amount: number;
  method: TransactionMethod;
  incomeCategory?: IncomeCategory;
  description?: string;
  notes?: string;
  payer?: string;
}

export interface ExpenseItem {
  _id: string;
  hotelId: string;
  amount: number;
  method: TransactionMethod;
  expenseCategory?: ExpenseCategory;
  description?: string;
  notes?: string;
  recipient?: string;
  status: 'pending' | 'completed' | 'cancelled';
  createdAt: string;
  updatedAt: string;
}

export interface IncomeItem {
  _id: string;
  hotelId: string;
  amount: number;
  method: TransactionMethod;
  incomeCategory?: IncomeCategory;
  description?: string;
  notes?: string;
  payer?: string;
  status: 'pending' | 'completed' | 'cancelled';
  createdAt: string;
  updatedAt: string;
}

export interface GetExpensesRequest {
  hotelId: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}

export interface GetIncomesRequest {
  hotelId: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}

export interface GetExpensesResponse {
  data: ExpenseItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface GetIncomesResponse {
  data: IncomeItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export const transactionsApi = {
  createExpense: async (payload: CreateExpenseRequest): Promise<boolean> => {
    try {
      await apiClient.post(API_ENDPOINTS.TRANSACTIONS.EXPENSE, payload);
      return true;
    } catch (error) {
      console.error('[transactionsApi.createExpense] Error:', error);
      return false;
    }
  },

  createIncome: async (payload: CreateIncomeRequest): Promise<boolean> => {
    try {
      await apiClient.post(API_ENDPOINTS.TRANSACTIONS.INCOME, payload);
      return true;
    } catch (error) {
      console.error('[transactionsApi.createIncome] Error:', error);
      return false;
    }
  },

  getExpenses: async (params: GetExpensesRequest): Promise<GetExpensesResponse> => {
    try {
      const queryParams = new URLSearchParams({
        hotelId: params.hotelId,
        page: String(params.page || 1),
        limit: String(params.limit || 100),
      });
      
      if (params.startDate) {
        queryParams.append('startDate', params.startDate);
      }
      if (params.endDate) {
        queryParams.append('endDate', params.endDate);
      }

      const response = await apiClient.get<{ data: GetExpensesResponse }>(
        `${API_ENDPOINTS.TRANSACTIONS.EXPENSE}?${queryParams.toString()}`
      );
      return response?.data || {
        data: [],
        total: 0,
        page: 1,
        limit: 100,
        totalPages: 0,
      };
    } catch (error) {
      console.error('[transactionsApi.getExpenses] Error:', error);
      return {
        data: [],
        total: 0,
        page: 1,
        limit: 100,
        totalPages: 0,
      };
    }
  },

  getIncomes: async (params: GetIncomesRequest): Promise<GetIncomesResponse> => {
    try {
      const queryParams = new URLSearchParams({
        hotelId: params.hotelId,
        page: String(params.page || 1),
        limit: String(params.limit || 100),
      });
      
      if (params.startDate) {
        queryParams.append('startDate', params.startDate);
      }
      if (params.endDate) {
        queryParams.append('endDate', params.endDate);
      }

      const response = await apiClient.get<{ data: GetIncomesResponse }>(
        `${API_ENDPOINTS.TRANSACTIONS.INCOME}?${queryParams.toString()}`
      );
      return response?.data || {
        data: [],
        total: 0,
        page: 1,
        limit: 100,
        totalPages: 0,
      };
    } catch (error) {
      console.error('[transactionsApi.getIncomes] Error:', error);
      return {
        data: [],
        total: 0,
        page: 1,
        limit: 100,
        totalPages: 0,
      };
    }
  },
};
