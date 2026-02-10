import { apiClient } from './client';
import { API_ENDPOINTS } from './config';

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
}

export interface ApiUser {
  _id: string;
  email: string;
  name?: string;
  fullName?: string;
  role: string;
  phone?: string;
  avatar?: string;
  hotels?: string[];
  hotelId?: string;
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

const mapApiUserToUser = (apiUser: ApiUser): User => ({
  id: apiUser._id,
  email: apiUser.email,
  name: apiUser.name || apiUser.fullName || apiUser.email.split('@')[0],
  role: (apiUser.role as UserRole) || 'staff',
  phone: apiUser.phone,
  avatar: apiUser.avatar,
  hotelIds: apiUser.hotels,
  hotelId: apiUser.hotelId,
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

  getProfile: async (token: string): Promise<User> => {
    console.log('[authApi.getProfile] Getting user profile');
    const response = await apiClient.getWithAuth<ApiUser>(API_ENDPOINTS.AUTH.PROFILE, token);
    return mapApiUserToUser(response);
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
