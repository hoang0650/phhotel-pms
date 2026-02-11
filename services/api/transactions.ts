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
};
