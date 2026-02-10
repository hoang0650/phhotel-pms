import { useState, useEffect, useCallback, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import createContextHook from '@nkzw/create-context-hook';

export type ThemeMode = 'light' | 'dark';

const THEME_KEY = 'app_theme';

export const [ThemeProvider, useTheme] = createContextHook(() => {
  const [theme, setTheme] = useState<ThemeMode>('light');
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    const loadTheme = async () => {
      try {
        const stored = await AsyncStorage.getItem(THEME_KEY);
        if (stored === 'dark' || stored === 'light') {
          setTheme(stored);
        }
      } catch (error) {
        console.error('[ThemeContext] Error loading theme:', error);
      } finally {
        setIsInitialized(true);
      }
    };
    loadTheme();
  }, []);

  const toggleTheme = useCallback(async () => {
    const newTheme: ThemeMode = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    try {
      await AsyncStorage.setItem(THEME_KEY, newTheme);
      console.log('[ThemeContext] Theme saved:', newTheme);
    } catch (error) {
      console.error('[ThemeContext] Error saving theme:', error);
    }
  }, [theme]);

  const setThemeMode = useCallback(async (mode: ThemeMode) => {
    setTheme(mode);
    try {
      await AsyncStorage.setItem(THEME_KEY, mode);
    } catch (error) {
      console.error('[ThemeContext] Error saving theme:', error);
    }
  }, []);

  const isDark = theme === 'dark';

  const colors = useMemo(() => {
    if (isDark) {
      return {
        text: '#f1f5f9',
        textSecondary: '#94a3b8',
        background: '#0f172a',
        cardBackground: '#1e293b',
        tint: '#14b8a6',
        tintLight: '#2dd4bf',
        tabIconDefault: '#64748b',
        tabIconSelected: '#14b8a6',
        border: '#334155',
        success: '#22c55e',
        warning: '#f59e0b',
        danger: '#ef4444',
        info: '#3b82f6',
        inputBackground: '#1e293b',
        inputBorder: '#334155',
        headerGradient: ['#0f172a', '#1e293b'] as const,
        overlay: 'rgba(0,0,0,0.7)',
        sectionCard: '#1e293b',
        divider: '#334155',
        switchTrack: '#334155',
      };
    }
    return {
      text: '#1a1a2e',
      textSecondary: '#6b7280',
      background: '#f8fafc',
      cardBackground: '#ffffff',
      tint: '#0f766e',
      tintLight: '#14b8a6',
      tabIconDefault: '#9ca3af',
      tabIconSelected: '#0f766e',
      border: '#e5e7eb',
      success: '#22c55e',
      warning: '#f59e0b',
      danger: '#ef4444',
      info: '#3b82f6',
      inputBackground: '#ffffff',
      inputBorder: '#e5e7eb',
      headerGradient: ['#374151', '#4b5563'] as const,
      overlay: 'rgba(0,0,0,0.5)',
      sectionCard: '#ffffff',
      divider: '#f3f4f6',
      switchTrack: '#e5e7eb',
    };
  }, [isDark]);

  return {
    theme,
    isDark,
    colors,
    toggleTheme,
    setThemeMode,
    isInitialized,
  };
});
