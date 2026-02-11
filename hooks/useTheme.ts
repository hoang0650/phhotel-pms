import { useColorScheme } from 'react-native';

const lightTheme = {
  background: '#F2F2F7',
  card: '#FFFFFF',
  text: '#000000',
  textSecondary: '#8E8E93',
  primary: '#007AFF',
  success: '#34C759',
  warning: '#FF9500',
  danger: '#FF3B30',
  border: '#E5E5EA',
};

const darkTheme = {
  background: '#000000',
  card: '#1C1C1E',
  text: '#FFFFFF',
  textSecondary: '#8E8E93',
  primary: '#0A84FF',
  success: '#32D74B',
  warning: '#FF9F0A',
  danger: '#FF453A',
  border: '#38383A',
};

export const useTheme = () => {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  
  return {
    colors: isDark ? darkTheme : lightTheme,
    isDark,
  };
};