import { apiClient } from './client';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type EInvoiceVendor = 'sepay' | 'easyinvoice';

const STORAGE_VENDOR_KEY = 'phhotel.einvoice.vendor';
const STORAGE_TEMPLATE_KEY = 'phhotel.einvoice.template';

export type EInvoiceTemplate = {
  template_code: string;
  invoice_series: string;
  invoice_label?: string;
};

type ApiResponse<T> = {
  success?: boolean;
  data?: T;
  message?: string;
  error?: { code?: string; message?: string };
  tracking_code?: string;
  provider?: string;
};

const withProviderQuery = (endpoint: string, provider: EInvoiceVendor, extra?: Record<string, string>) => {
  const params = new URLSearchParams({ provider });
  if (extra) {
    Object.entries(extra).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params.append(key, value);
      }
    });
  }
  const qs = params.toString();
  return qs ? `${endpoint}?${qs}` : endpoint;
};

export const eInvoiceStorage = {
  async getVendor(): Promise<EInvoiceVendor> {
    const stored = await AsyncStorage.getItem(STORAGE_VENDOR_KEY);
    return stored === 'easyinvoice' ? 'easyinvoice' : 'sepay';
  },
  async setVendor(vendor: EInvoiceVendor) {
    await AsyncStorage.setItem(STORAGE_VENDOR_KEY, vendor);
  },
  async getTemplate(): Promise<EInvoiceTemplate | null> {
    const raw = await AsyncStorage.getItem(STORAGE_TEMPLATE_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  },
  async setTemplate(template: EInvoiceTemplate | null) {
    if (!template) {
      await AsyncStorage.removeItem(STORAGE_TEMPLATE_KEY);
      return;
    }
    await AsyncStorage.setItem(STORAGE_TEMPLATE_KEY, JSON.stringify(template));
  },
};

const login = (
  username: string,
  password: string,
  provider: EInvoiceVendor,
  extra?: { taxCode?: string; useCommonApi?: boolean }
) => {
  return apiClient.post<ApiResponse<{ token?: string }>>(
    withProviderQuery('/e-invoice/login', provider),
    { username, password, ...extra }
  );
};

const getProviders = () => apiClient.get<ApiResponse<any[]>>('/e-invoice/providers');

const getConfig = () => apiClient.get<ApiResponse<any>>('/e-invoice/config');

const saveConfig = (config: Record<string, unknown>) =>
  apiClient.put<ApiResponse<unknown>>('/e-invoice/config', config);

const getProviderAccounts = (provider: EInvoiceVendor) =>
  apiClient.get<ApiResponse<any[]>>(withProviderQuery('/e-invoice/provider-accounts', provider, { _t: String(Date.now()) }));

const createInvoice = (payload: Record<string, unknown>, provider: EInvoiceVendor) =>
  apiClient.post<ApiResponse<any>>(withProviderQuery('/e-invoice/create', provider), { ...payload, provider });

const checkCreateStatus = (
  trackingCode: string,
  provider: EInvoiceVendor,
  extra?: { template_code?: string; invoice_series?: string }
) =>
  apiClient.get<ApiResponse<any>>(
    withProviderQuery(`/e-invoice/create/check/${trackingCode}`, provider, {
      template_code: extra?.template_code || '',
      invoice_series: extra?.invoice_series || '',
    })
  );

const issueInvoice = (
  payload: { reference_code: string; template_code?: string; invoice_series?: string },
  provider: EInvoiceVendor
) => apiClient.post<ApiResponse<any>>(withProviderQuery('/e-invoice/issue', provider), { ...payload, provider });

const checkIssueStatus = (
  trackingCode: string,
  provider: EInvoiceVendor,
  extra?: { template_code?: string; invoice_series?: string }
) =>
  apiClient.get<ApiResponse<any>>(
    withProviderQuery(`/e-invoice/issue/check/${trackingCode}`, provider, {
      template_code: extra?.template_code || '',
      invoice_series: extra?.invoice_series || '',
    })
  );

const getInvoiceDetails = (
  referenceCode: string,
  provider: EInvoiceVendor,
  extra?: { template_code?: string; invoice_series?: string }
) =>
  apiClient.get<ApiResponse<any>>(
    withProviderQuery(`/e-invoice/${referenceCode}`, provider, {
      template_code: extra?.template_code || '',
      invoice_series: extra?.invoice_series || '',
    })
  );

const getUsage = (provider: EInvoiceVendor) =>
  apiClient.get<ApiResponse<any>>(withProviderQuery('/e-invoice/usage', provider));

const getDrafts = (provider: EInvoiceVendor, page = 1, limit = 10) =>
  apiClient.get<ApiResponse<any>>(
    withProviderQuery('/e-invoice/drafts', provider, { page: String(page), limit: String(limit) })
  );

const getIssued = (provider: EInvoiceVendor, page = 1, limit = 10) =>
  apiClient.get<ApiResponse<any>>(
    withProviderQuery('/e-invoice/issued', provider, { page: String(page), limit: String(limit) })
  );

const exportFromLegacyPayload = (invoiceData: Record<string, unknown>, provider: EInvoiceVendor = 'easyinvoice') =>
  apiClient.post<ApiResponse<any>>(`/invoices/easy-invoice/export?provider=${provider}`, {
    ...invoiceData,
    provider,
  });

export default {
  login,
  getProviders,
  getConfig,
  saveConfig,
  getProviderAccounts,
  createInvoice,
  checkCreateStatus,
  issueInvoice,
  checkIssueStatus,
  getInvoiceDetails,
  getUsage,
  getDrafts,
  getIssued,
  exportFromLegacyPayload,
  storage: eInvoiceStorage,
};
