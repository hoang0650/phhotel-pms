import { apiClient } from './client';
import { API_ENDPOINTS } from './config';
import { extractId, extractIds } from './utils';

export type UserRole = 'superadmin' | 'admin' | 'business' | 'manager' | 'receptionist' | 'staff';

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
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  name: string;
  phone?: string;
}

export interface ForgotPasswordRequest {
  email: string;
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
});

export const authApi = {
  login: async (data: LoginRequest): Promise<{ user: User; token: string }> => {
    console.log('[authApi.login] Attempting login for:', data.email);
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
    console.log('[authApi.forgotPassword] Requesting password reset for:', data.email);
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
      const userData = 'user' in response ? response.user : response;
      if (!userData) {
        throw new Error('Invalid profile response');
      }
      return mapApiUserToUser(userData);
    } catch (error) {
      console.error('[authApi.updateProfile] Error:', error);
      throw error;
    }
  },

  logout: async (): Promise<void> => {
    console.log('[authApi.logout] Logging out');
    try {
      await apiClient.post(API_ENDPOINTS.AUTH.LOGOUT, {});
    } catch {
      console.log('[authApi.logout] Logout request failed, continuing with local logout');
    }
  },
};
