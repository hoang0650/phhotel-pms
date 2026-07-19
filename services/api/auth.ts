import { apiClient } from './client';
import { API_ENDPOINTS } from './config';
import { extractId, extractIds } from './utils';
import type { PackagePermission, PricingAddon, PricingFeature } from './pricing';

export type UserRole = 'superadmin' | 'admin' | 'business' | 'manager' | 'receptionist' | 'staff' | 'hotel' | 'hotel_manager' | 'guest';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  phone?: string;
  avatar?: string;
  hotelIds?: string[];
  hotelId?: string;
  businessId?: string;
  preferences?: {
    language?: string;
    theme?: string;
    notifications?: {
      email?: boolean;
      sms?: boolean;
      push?: boolean;
    };
    biometricEnabled?: boolean;
  };
  features?: PricingFeature[];
  packagePermissions?: PackagePermission[];
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
}

export interface ApiUser {
  _id: string;
  email: string;
  name?: string;
  fullName?: string;
  role: string;
  phone?: string;
  avatar?: string;
  hotels?: any[]; // Allow any for robustness
  hotelId?: any;  // Allow any for robustness
  businessId?: any; // Allow any for robustness
  preferences?: {
    language?: string;
    theme?: string;
    notifications?: {
      email?: boolean;
      sms?: boolean;
      push?: boolean;
    };
    biometricEnabled?: boolean;
  };
  features?: PricingFeature[];
  packagePermissions?: PackagePermission[];
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
}

const addonKeys: PricingAddon[] = [
  'qrPaymentFeature',
  'otaManagementFeature',
  'emailManagementFeature',
  'electricManagementFeature',
  'paypalPaymentFeature',
  'cryptoPaymentFeature',
  'draftInvoiceFeature',
  'exportInvoiceFeature',
  'aiChatboxFeature',
  'hotelNotificationFeature',
];

export interface LoginRequest {
  email?: string;
  username?: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  name: string;
  phone?: string;
}

export interface ForgotPasswordRequest {
  email?: string;
  username?: string;
}

export interface ResetPasswordRequest {
  token: string;
  password: string;
}

export interface AuthResponse {
  user: ApiUser;
  token: string;
  refreshToken?: string;
  accessToken?: string;
}

export interface UpdateProfileRequest {
  fullName?: string;
  phone?: string;
  avatar?: string;
  avatarId?: string | null;
}

const mapApiUserToUser = (apiUser: ApiUser): User => ({
  id: apiUser._id,
  email: apiUser.email,
  name: apiUser.name || apiUser.fullName || apiUser.email.split('@')[0],
  role: (apiUser.role as UserRole) || 'staff',
  phone: apiUser.phone,
  avatar: apiUser.avatar,
  hotelIds: extractIds(apiUser.hotels),
  hotelId: extractId(apiUser.hotelId),
  businessId: extractId(apiUser.businessId),
  preferences: apiUser.preferences,
  features: Array.isArray(apiUser.features) ? apiUser.features : [],
  packagePermissions: Array.isArray(apiUser.packagePermissions) ? apiUser.packagePermissions : [],
  ...Object.fromEntries(addonKeys.map((key) => [key, apiUser[key] === true])),
});

const isApiUser = (value: unknown): value is ApiUser => {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<ApiUser>;
  return typeof candidate._id === 'string'
    && typeof candidate.email === 'string'
    && typeof candidate.role === 'string';
};

export const authApi = {
  login: async (data: LoginRequest): Promise<{ user: User; token: string }> => {
    console.log('[authApi.login] Attempting login for:', data.email || data.username);
    const response = await apiClient.post<AuthResponse>(API_ENDPOINTS.AUTH.LOGIN, data);
    console.log('[authApi.login] Response:', response);
    
    const token = response.token || response.accessToken || '';
    return {
      user: mapApiUserToUser(response.user),
      token,
    };
  },

  register: async (data: RegisterRequest): Promise<{ user: User; token: string }> => {
    console.log('[authApi.register] Attempting register for:', data.email);
    const response = await apiClient.post<AuthResponse>(API_ENDPOINTS.AUTH.REGISTER, data);
    console.log('[authApi.register] Response:', response);
    
    const token = response.token || response.accessToken || '';
    return {
      user: mapApiUserToUser(response.user),
      token,
    };
  },

  getProfile: async (): Promise<User> => {
    console.log('[authApi.getProfile] Fetching user profile');
    const response = await apiClient.get<ApiUser>(API_ENDPOINTS.AUTH.PROFILE);
    return mapApiUserToUser(response);
  },

  forgotPassword: async (data: ForgotPasswordRequest): Promise<{ message: string }> => {
    console.log('[authApi.forgotPassword] Requesting password reset for:', data.email || data.username);
    const response = await apiClient.post<{ message: string }>(API_ENDPOINTS.AUTH.FORGOT_PASSWORD, data);
    return response;
  },

  resetPassword: async (data: ResetPasswordRequest): Promise<{ message: string }> => {
    console.log('[authApi.resetPassword] Resetting password');
    const response = await apiClient.post<{ message: string }>(API_ENDPOINTS.AUTH.RESET_PASSWORD, data);
    return response;
  },

  updateProfile: async (data: UpdateProfileRequest): Promise<User> => {
    console.log('[authApi.updateProfile] Updating profile');
    try {
      const response = await apiClient.put<{ user?: ApiUser } | ApiUser>(
        API_ENDPOINTS.AUTH.PROFILE,
        data
      );
      const responseWithUser = response as { user?: ApiUser };
      const userData = responseWithUser.user ?? response;
      if (!isApiUser(userData)) {
        throw new Error('Invalid profile response');
      }
      return mapApiUserToUser(userData);
    } catch (error) {
      console.warn('[authApi.updateProfile] Error:', error);
      throw error;
    }
  },
  updatePreferences: async (data: {
    language?: string;
    theme?: string;
    notifications?: {
      email?: boolean;
      sms?: boolean;
      push?: boolean;
    };
    biometricEnabled?: boolean;
  }): Promise<{ preferences?: ApiUser['preferences'] }> => {
    return apiClient.put<{ preferences?: ApiUser['preferences'] }>(`${API_ENDPOINTS.USERS.BASE}/preferences`, data);
  },
  changePassword: async (userId: string, currentPassword: string, newPassword: string): Promise<{ message: string }> => {
    return apiClient.put<{ message: string }>(`${API_ENDPOINTS.USERS.BY_ID(userId)}/password`, {
      currentPassword,
      newPassword,
    });
  },

  logout: async (): Promise<void> => {
    console.log('[authApi.logout] Logging out');
    try {
      await apiClient.post(API_ENDPOINTS.AUTH.LOGOUT, {});
    } catch {
      console.log('[authApi.logout] Logout request failed, continuing with local logout');
    }
  },

  // Thêm vào auth.ts, bên trong authApi
  deleteAccount: async (password: string): Promise<{ success: boolean; message: string }> => {
    console.log('[authApi.deleteAccount] Requesting account deletion');
    // Với axios, body của request DELETE phải được bọc trong object { data: ... }
    return apiClient.delete<{ success: boolean; message: string }>(`${API_ENDPOINTS.USERS.BASE}/me`, { data: { password } });
  },
};
