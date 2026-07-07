import { apiClient } from './client';
import { API_ENDPOINTS } from './config';

export type PackagePermission = 'view' | 'edit' | 'delete' | 'manage';

export type PricingFeature =
  | 'room_management'
  | 'hotel_management'
  | 'company_management'
  | 'staff_management'
  | 'service_management'
  | 'user_management'
  | 'pricing_management'
  | 'ota_management'
  | 'fanpage_messages'
  | 'zalo_messages'
  | 'telegram_messages'
  | 'revenue_chart'
  | 'financial_summary_report'
  | 'shift_handover'
  | 'bank_transfer_history'
  | 'calendar'
  | 'email_admin'
  | 'qr_payment'
  | 'visa_payment'
  | 'electric_management'
  | 'settings_management';

export type PricingAddon =
  | 'qrPaymentFeature'
  | 'otaManagementFeature'
  | 'emailManagementFeature'
  | 'electricManagementFeature'
  | 'paypalPaymentFeature'
  | 'cryptoPaymentFeature'
  | 'draftInvoiceFeature'
  | 'exportInvoiceFeature'
  | 'aiChatboxFeature'
  | 'hotelNotificationFeature';

export interface PricingPackage {
  _id?: string;
  id?: string;
  name: string;
  description?: string;
  monthlyPrice?: number;
  yearlyPrice?: number;
  yearlyDiscount?: number;
  price?: number;
  duration?: number;
  monthlyDuration?: number;
  yearlyDuration?: number;
  features?: PricingFeature[];
  permissions?: PackagePermission[];
  maxUsers?: number | null;
  maxRooms?: number | null;
  isActive?: boolean;
  isContactOnly?: boolean;
  contactLabel?: string;
  contactPhone?: string;
  contactEmail?: string;
  contactUrl?: string;
  qrPaymentFeature?: boolean;
  otaManagementFeature?: boolean;
  emailManagementFeature?: boolean;
  electricManagementFeature?: boolean;
  paypalPaymentFeature?: boolean;
  cryptoPaymentFeature?: boolean;
  draftInvoiceFeature?: boolean;
  exportInvoiceFeature?: boolean;
  aiChatboxFeature?: boolean;
  hotelNotificationFeature?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface PricingPackageListResponse {
  success?: boolean;
  data?: PricingPackage[];
  message?: string;
}

export interface CurrentUserPackageResponse {
  success?: boolean;
  data: PricingPackage | null;
  expiryDate?: string;
  billingType?: 'monthly' | 'yearly';
  message?: string;
}

export const pricingApi = {
  getAllPackages: async (): Promise<PricingPackageListResponse> => {
    return apiClient.get<PricingPackageListResponse>(API_ENDPOINTS.PRICING.BASE);
  },

  getPackageById: async (packageId: string): Promise<{ success?: boolean; data?: PricingPackage; message?: string }> => {
    return apiClient.get<{ success?: boolean; data?: PricingPackage; message?: string }>(
      API_ENDPOINTS.PRICING.BY_ID(packageId)
    );
  },

  getCurrentUserPackage: async (userId: string): Promise<CurrentUserPackageResponse> => {
    return apiClient.get<CurrentUserPackageResponse>(API_ENDPOINTS.PRICING.USER_PACKAGE(userId));
  },

  getPackagePermissions: async (): Promise<PackagePermission[]> => {
    return apiClient.get<PackagePermission[]>(API_ENDPOINTS.PRICING.PERMISSIONS);
  },
};
