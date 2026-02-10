import { Tabs } from 'expo-router';
import { Home, BedDouble, BarChart3, Settings, Briefcase } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useLanguage } from '@/contexts/LanguageContext';

export default function TabLayout() {
  const { isDark, colors } = useTheme();
  const { language } = useLanguage();

  const tabLabels = {
    home: language === 'vi' ? 'Trang chủ' : 'Home',
    rooms: language === 'vi' ? 'Phòng' : 'Rooms',
    management: language === 'vi' ? 'Quản Lý' : 'Management',
    report: language === 'vi' ? 'Báo cáo' : 'Report',
    settings: language === 'vi' ? 'Cài đặt' : 'Settings',
  };

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.tint,
        tabBarInactiveTintColor: colors.tabIconDefault,
        tabBarStyle: {
          backgroundColor: isDark ? '#1e293b' : '#fff',
          borderTopWidth: 0,
          elevation: 20,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: isDark ? 0.3 : 0.08,
          shadowRadius: 12,
          height: 65,
          paddingBottom: 8,
          paddingTop: 8,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '500',
        },
      }}
    >
      <Tabs.Screen
        name="(dashboard)"
        options={{
          title: tabLabels.home,
          tabBarIcon: ({ color, size }) => <Home size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="rooms"
        options={{
          title: tabLabels.rooms,
          tabBarIcon: ({ color, size }) => <BedDouble size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="management"
        options={{
          title: tabLabels.management,
          tabBarIcon: ({ color, size }) => <Briefcase size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="report"
        options={{
          title: tabLabels.report,
          tabBarIcon: ({ color, size }) => <BarChart3 size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: tabLabels.settings,
          tabBarIcon: ({ color, size }) => <Settings size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="bookings"
        options={{ href: null }}
      />
      <Tabs.Screen
        name="guests"
        options={{ href: null }}
      />
      <Tabs.Screen
        name="services"
        options={{ href: null }}
      />
      <Tabs.Screen
        name="staffs"
        options={{ href: null }}
      />
    </Tabs>
  );
}
