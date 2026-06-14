import { API_CONFIG } from './config';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert } from 'react-native';

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  headers?: Record<string, string>;
}

class ApiClient {
  private baseUrl: string;
  private timeout: number;
  private static lastForbiddenAlert = 0;

  constructor() {
    this.baseUrl = API_CONFIG.BASE_URL;
    this.timeout = API_CONFIG.TIMEOUT;
  }

  private async request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
    const { method = 'GET', body, headers = {} } = options;
    
    // Auto-attach token if available
    let authHeader = {};
    try {
      const token = await AsyncStorage.getItem('auth_token');
      if (token) {
        authHeader = { 'Authorization': `Bearer ${token}` };
      }
    } catch (e) {
      console.warn('[ApiClient] Failed to get token from storage', e);
    }

    const url = `${this.baseUrl}${endpoint}`;
    console.log(`[API] ${method} ${url}`);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const fetchOptions: RequestInit = {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          ...authHeader,
          ...headers,
        },
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      };

      const response = await fetch(url, fetchOptions);

      clearTimeout(timeoutId);

      if (!response.ok) {
        // Try parse JSON for consistent messages
        let errorMessage = '';
        try {
          const json = await response.json();
          errorMessage = json?.message || JSON.stringify(json);
        } catch {
          errorMessage = await response.text();
        }
        if (response.status === 401) {
          // Gracefully handle unauthorized: clear local auth and throw a typed error
          console.warn('[API] 401 Unauthorized - clearing local auth and stopping further requests');
          try {
            await AsyncStorage.removeItem('auth_token');
            await AsyncStorage.removeItem('auth_user');
          } catch {}
          // Do not spam console.error for 401 to avoid red error screens on logout
          throw new Error('UNAUTHORIZED');
        }
        if (response.status === 403) {
          const now = Date.now();
          if (now - ApiClient.lastForbiddenAlert > 2000) {
            ApiClient.lastForbiddenAlert = now;
            try {
              Alert.alert('Không có quyền', 'Bạn không có quyền thực hiện thao tác này');
            } catch {}
          }
          console.warn(`[API Warning] 403 Forbidden: ${errorMessage}`);
          throw new Error('FORBIDDEN');
        }
        console.warn(`[API Error] ${response.status}: ${errorMessage}`);
        throw new Error(errorMessage || `API Error: ${response.status}`);
      }

      const data = await response.json();
      console.log(`[API Response] ${endpoint}:`, data);
      return data;
    } catch (error) {
      clearTimeout(timeoutId);
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('Request timeout');
      }
      if (error instanceof TypeError && error.message === 'Failed to fetch') {
        console.warn('[API] CORS or network error - server may not allow requests from this origin');
        throw new Error('Network error: Unable to connect to server. This may be due to CORS restrictions.');
      }
      throw error;
    }
  }

  async get<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'GET' });
  }

  async post<T>(endpoint: string, body?: unknown): Promise<T> {
    return this.request<T>(endpoint, { method: 'POST', body });
  }

  async put<T>(endpoint: string, body?: unknown): Promise<T> {
    return this.request<T>(endpoint, { method: 'PUT', body });
  }

  async patch<T>(endpoint: string, body?: unknown): Promise<T> {
    return this.request<T>(endpoint, { method: 'PATCH', body });
  }

  async delete<T>(endpoint: string, body?: unknown): Promise<T> {
    return this.request<T>(endpoint, { method: 'DELETE', body });
  }

  async getWithAuth<T>(endpoint: string, token: string): Promise<T> {
    return this.request<T>(endpoint, { 
      method: 'GET',
      headers: { 'Authorization': `Bearer ${token}` }
    });
  }

  async postWithAuth<T>(endpoint: string, body: unknown, token: string): Promise<T> {
    return this.request<T>(endpoint, { 
      method: 'POST', 
      body,
      headers: { 'Authorization': `Bearer ${token}` }
    });
  }
}

export const apiClient = new ApiClient();
