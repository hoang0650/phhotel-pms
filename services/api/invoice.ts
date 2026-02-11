import { apiClient } from './client';
import { Invoice } from '../../types/invoice';

const INVOICE_API_URL = '/invoices';

type ApiResponse<T> = {
  message?: string;
  success?: boolean;
  data?: T;
  pagination?: {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    itemsPerPage: number;
  };
};

const createInvoice = (invoiceData: Partial<Invoice>) => {
  return apiClient.post<ApiResponse<Invoice>>(INVOICE_API_URL, invoiceData)
    .then((resp) => ({ data: (resp as ApiResponse<Invoice>)?.data ?? (resp as unknown as Invoice) }));
};

const getInvoices = (params?: any) => {
  let endpoint = INVOICE_API_URL;
  if (params && typeof params === 'object') {
    const search = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null) search.append(k, String(v));
    });
    const qs = search.toString();
    if (qs) endpoint = `${INVOICE_API_URL}?${qs}`;
  }
  return apiClient.get<ApiResponse<Invoice[]>>(endpoint)
    .then((resp) => {
      const arr = Array.isArray((resp as ApiResponse<Invoice[]>)?.data)
        ? (resp as ApiResponse<Invoice[]>)!.data!
        : Array.isArray(resp)
          ? (resp as unknown as Invoice[])
          : [];
      return { data: arr };
    });
};

const getInvoiceById = (id: string) => {
  return apiClient.get<ApiResponse<Invoice>>(`${INVOICE_API_URL}/${id}`)
    .then((resp) => ({ data: (resp as ApiResponse<Invoice>)?.data ?? (resp as unknown as Invoice) }));
};

const updateInvoice = (id: string, updates: Partial<Invoice>) => {
  return apiClient.put<ApiResponse<Invoice>>(`${INVOICE_API_URL}/${id}`, updates)
    .then((resp) => ({ data: (resp as ApiResponse<Invoice>)?.data ?? (resp as unknown as Invoice) }));
};

const deleteInvoice = (id: string) => {
  return apiClient.delete<ApiResponse<unknown>>(`${INVOICE_API_URL}/${id}`)
    .then((resp) => ({ data: (resp as ApiResponse<unknown>)?.success ?? true }));
};

const getInvoiceStats = (params?: any) => {
    let endpoint = `${INVOICE_API_URL}/stats`;
    if (params && typeof params === 'object') {
      const search = new URLSearchParams();
      Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined && v !== null) search.append(k, String(v));
      });
      const qs = search.toString();
      if (qs) endpoint = `${endpoint}?${qs}`;
    }
    return apiClient.get<ApiResponse<any>>(endpoint)
      .then((resp) => ({ data: (resp as ApiResponse<any>)?.data ?? resp }));
};

export default {
  createInvoice,
  getInvoices,
  getInvoiceById,
  updateInvoice,
  deleteInvoice,
  getInvoiceStats,
};
