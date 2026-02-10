import { useState, useEffect, useCallback } from 'react';
import { useMutation } from '@tanstack/react-query';
import AsyncStorage from '@react-native-async-storage/async-storage';
import createContextHook from '@nkzw/create-context-hook';
import { authApi, User, LoginRequest, RegisterRequest, ForgotPasswordRequest } from '@/services/api/auth';

const AUTH_TOKEN_KEY = 'auth_token';
const AUTH_USER_KEY = 'auth_user';

export const [AuthProvider, useAuth] = createContextHook(() => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadAuthState = async () => {
      try {
        const [storedToken, storedUser] = await Promise.all([
          AsyncStorage.getItem(AUTH_TOKEN_KEY),
          AsyncStorage.getItem(AUTH_USER_KEY),
        ]);

        if (storedToken && storedUser) {
          setToken(storedToken);
          setUser(JSON.parse(storedUser));
          console.log('[AuthContext] Restored auth state');
        }
      } catch (error) {
        console.error('[AuthContext] Error loading auth state:', error);
      } finally {
        setIsInitialized(true);
        setIsLoading(false);
      }
    };

    loadAuthState();
  }, []);

  const saveAuthState = useCallback(async (newToken: string, newUser: User) => {
    try {
      await Promise.all([
        AsyncStorage.setItem(AUTH_TOKEN_KEY, newToken),
        AsyncStorage.setItem(AUTH_USER_KEY, JSON.stringify(newUser)),
      ]);
      setToken(newToken);
      setUser(newUser);
      console.log('[AuthContext] Saved auth state for user:', newUser.email);
    } catch (error) {
      console.error('[AuthContext] Error saving auth state:', error);
    }
  }, []);

  const clearAuthState = useCallback(async () => {
    try {
      await Promise.all([
        AsyncStorage.removeItem(AUTH_TOKEN_KEY),
        AsyncStorage.removeItem(AUTH_USER_KEY),
      ]);
      setToken(null);
      setUser(null);
      console.log('[AuthContext] Cleared auth state');
    } catch (error) {
      console.error('[AuthContext] Error clearing auth state:', error);
    }
  }, []);

  const loginMutation = useMutation({
    mutationFn: (data: LoginRequest) => authApi.login(data),
    onSuccess: async (response) => {
      await saveAuthState(response.token, response.user);
    },
    onError: (error) => {
      console.error('[AuthContext] Login failed:', error);
    },
  });

  const registerMutation = useMutation({
    mutationFn: (data: RegisterRequest) => authApi.register(data),
    onSuccess: async (response) => {
      await saveAuthState(response.token, response.user);
    },
    onError: (error) => {
      console.error('[AuthContext] Register failed:', error);
    },
  });

  const forgotPasswordMutation = useMutation({
    mutationFn: (data: ForgotPasswordRequest) => authApi.forgotPassword(data),
    onError: (error) => {
      console.error('[AuthContext] Forgot password failed:', error);
    },
  });

  const logoutMutation = useMutation({
    mutationFn: () => authApi.logout(),
    onSettled: async () => {
      await clearAuthState();
    },
  });

  const isAuthenticated = !!token && !!user;
  
  const isAdmin = user?.role === 'superadmin' || user?.role === 'admin';
  const isBusiness = user?.role === 'business';
  const canAccessAllHotels = isAdmin;
  const canAccessMultipleHotels = isAdmin || isBusiness;

  return {
    user,
    token,
    isAuthenticated,
    isInitialized,
    isLoading,
    isAdmin,
    isBusiness,
    canAccessAllHotels,
    canAccessMultipleHotels,
    login: loginMutation.mutateAsync,
    loginLoading: loginMutation.isPending,
    loginError: loginMutation.error,
    register: registerMutation.mutateAsync,
    registerLoading: registerMutation.isPending,
    registerError: registerMutation.error,
    forgotPassword: forgotPasswordMutation.mutateAsync,
    forgotPasswordLoading: forgotPasswordMutation.isPending,
    forgotPasswordError: forgotPasswordMutation.error,
    logout: logoutMutation.mutateAsync,
    logoutLoading: logoutMutation.isPending,
  };
});

export type { User } from '@/services/api/auth';
