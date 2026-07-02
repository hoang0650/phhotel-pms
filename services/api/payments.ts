import { apiClient } from './client';

type PaymentMethod = 'sepay' | 'paypal' | 'crypto_usdt';

const PAYMENT_ENDPOINTS = {
  SEPAY_HISTORY: '/sepay/payment-history',
  PAYPAL_HISTORY: '/paypal/payment-history',
  CRYPTO_HISTORY: '/crypto/payment-history',
  BANKHUB_STATUS: '/bankhub/status',
  BANKHUB_LINK_TOKEN: '/bankhub/link-token',
  BANKHUB_BANK_ACCOUNTS: '/bankhub/bank-accounts',
};

export interface PaymentHistoryQuery {
  userId?: string;
  status?: string;
  network?: string;
  limit?: number;
  skip?: number;
}

export interface PaymentPackageInfo {
  _id?: string;
  name?: string;
  price?: number;
  monthlyPrice?: number;
  yearlyPrice?: number;
}

export interface PaymentHistoryItem {
  _id?: string;
  id?: string;
  paymentMethod?: PaymentMethod | string;
  status?: string;
  amount?: number;
  totalAmount?: number;
  currency?: string;
  createdAt?: string;
  created_at?: string;
  completedAt?: string;
  transactionId?: string;
  paypalOrderId?: string;
  cryptoTransactionHash?: string;
  cryptoNetwork?: string;
  cryptoAmount?: number;
  packageId?: PaymentPackageInfo | null;
  paymentGatewayResponse?: {
    transferAmount?: number;
    [key: string]: unknown;
  } | null;
  [key: string]: unknown;
}

export interface PaymentHistoryResponse {
  success?: boolean;
  data?: PaymentHistoryItem[];
  total?: number;
  limit?: number;
  skip?: number;
}

export interface BankHubStatus {
  configured: boolean;
  authenticated?: boolean;
  company_xid?: string;
  message?: string;
}

export interface BankHubLinkToken {
  xid?: string;
  hosted_link_url?: string;
  link_token?: string;
  expires_at?: string;
}

export interface BankHubBankAccount {
  xid?: string;
  bank_brand_name?: string;
  account_number?: string;
  account_type?: string;
  status?: string;
}

export interface HotelPaymentSettings {
  enablePayPalPayment: boolean;
  enableCryptoPayment: boolean;
  enableSePayPayment: boolean;
  enablePaymentSpeaker: boolean;
}

const DEFAULT_PAYMENT_SETTINGS: HotelPaymentSettings = {
  enablePayPalPayment: false,
  enableCryptoPayment: false,
  enableSePayPayment: true,
  enablePaymentSpeaker: false,
};

const buildQueryString = (params?: PaymentHistoryQuery): string => {
  if (!params) return '';
  const query = new URLSearchParams();
  if (params.userId) query.append('userId', params.userId);
  if (params.status) query.append('status', params.status);
  if (params.network) query.append('network', params.network);
  if (typeof params.limit === 'number') query.append('limit', String(params.limit));
  if (typeof params.skip === 'number') query.append('skip', String(params.skip));
  const queryString = query.toString();
  return queryString ? `?${queryString}` : '';
};

const mapPaymentResponse = (response: PaymentHistoryResponse | PaymentHistoryItem[] | null | undefined): PaymentHistoryItem[] => {
  if (Array.isArray(response)) {
    return response;
  }
  if (Array.isArray(response?.data)) {
    return response.data;
  }
  return [];
};

const isNetworkError = (error: unknown): boolean =>
  error instanceof Error && (error.message === 'NETWORK_ERROR' || error.message === 'Request timeout');

const getPaymentHistory = async (endpoint: string, params?: PaymentHistoryQuery): Promise<PaymentHistoryItem[]> => {
  try {
    const response = await apiClient.get<PaymentHistoryResponse>(`${endpoint}${buildQueryString(params)}`);
    return mapPaymentResponse(response);
  } catch (error) {
    if (!isNetworkError(error)) {
      console.warn('[paymentsApi.getPaymentHistory] Error:', error);
    }
    return [];
  }
};

export const paymentsApi = {
  async getHotelPaymentSettings(hotelId: string): Promise<HotelPaymentSettings> {
    if (!hotelId) {
      return DEFAULT_PAYMENT_SETTINGS;
    }

    try {
      const hotel = await apiClient.get<any>(`/hotels/${hotelId}`);
      const hotelSettings = hotel?.settings || {};
      const notificationSettings = hotelSettings?.notificationSettings || {};

      return {
        enablePayPalPayment: !!(hotelSettings.enablePayPalPayment || hotel?.enablePayPalPayment),
        enableCryptoPayment: !!(hotelSettings.enableCryptoPayment || hotel?.enableCryptoPayment),
        enableSePayPayment: true,
        enablePaymentSpeaker: !!notificationSettings.enablePaymentSpeaker,
      };
    } catch (error) {
      if (!isNetworkError(error)) {
        console.warn('[paymentsApi.getHotelPaymentSettings] Error:', error);
      }
      return DEFAULT_PAYMENT_SETTINGS;
    }
  },

  async getPayPalPaymentHistory(params?: PaymentHistoryQuery): Promise<PaymentHistoryItem[]> {
    return getPaymentHistory(PAYMENT_ENDPOINTS.PAYPAL_HISTORY, params);
  },

  async getCryptoPaymentHistory(params?: PaymentHistoryQuery): Promise<PaymentHistoryItem[]> {
    return getPaymentHistory(PAYMENT_ENDPOINTS.CRYPTO_HISTORY, params);
  },

  async getSePayPaymentHistory(params?: PaymentHistoryQuery): Promise<PaymentHistoryItem[]> {
    return getPaymentHistory(PAYMENT_ENDPOINTS.SEPAY_HISTORY, params);
  },

  async getBankHubStatus(): Promise<BankHubStatus | null> {
    try {
      return await apiClient.get<BankHubStatus>(PAYMENT_ENDPOINTS.BANKHUB_STATUS);
    } catch (error) {
      if (!isNetworkError(error)) {
        console.warn('[paymentsApi.getBankHubStatus] Error:', error);
      }
      return null;
    }
  },

  async createBankHubLinkToken(data?: {
    company_xid?: string;
    purpose?: string;
    completion_redirect_uri?: string;
  }): Promise<BankHubLinkToken | null> {
    try {
      return await apiClient.post<BankHubLinkToken>(PAYMENT_ENDPOINTS.BANKHUB_LINK_TOKEN, data || {});
    } catch (error) {
      if (!isNetworkError(error)) {
        console.warn('[paymentsApi.createBankHubLinkToken] Error:', error);
      }
      return null;
    }
  },

  async getBankHubBankAccounts(companyXid?: string): Promise<BankHubBankAccount[]> {
    try {
      const query = companyXid ? `?company_xid=${encodeURIComponent(companyXid)}` : '';
      const response = await apiClient.get<{ data?: BankHubBankAccount[] }>(
        `${PAYMENT_ENDPOINTS.BANKHUB_BANK_ACCOUNTS}${query}`
      );
      return Array.isArray(response?.data) ? response.data : [];
    } catch (error) {
      if (!isNetworkError(error)) {
        console.warn('[paymentsApi.getBankHubBankAccounts] Error:', error);
      }
      return [];
    }
  },
};

export { DEFAULT_PAYMENT_SETTINGS };
