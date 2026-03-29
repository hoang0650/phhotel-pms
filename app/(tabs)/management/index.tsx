import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
} from 'react-native';
import {
  FileText,
  Clock,
  Wallet,
  DollarSign,
  Zap,
  ArrowRightLeft,
  MessageSquare,
  Sparkles,
  Building2,
  ChevronRight,
} from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/contexts/ThemeContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useHotel } from '@/contexts/HotelContext';

interface ManagementModule {
  id: string;
  titleVi: string;
  titleEn: string;
  descriptionVi: string;
  descriptionEn: string;
  icon: React.ComponentType<{ size: number; color: string }>;
  route: string;
  gradient: [string, string];
}

const managementModules: ManagementModule[] = [
  {
    id: 'invoice',
    titleVi: 'Quản Lý Hóa Đơn',
    titleEn: 'Invoice Management',
    descriptionVi: 'Tạo và quản lý hóa đơn cho khách hàng',
    descriptionEn: 'Create and manage customer invoices',
    icon: FileText,
    route: '/management/invoice',
    gradient: ['#FF6B6B', '#FF8E8E'],
  },
  {
    id: 'payment-history',
    titleVi: 'Lịch Sử Thanh Toán',
    titleEn: 'Payment History',
    descriptionVi: 'Xem lịch sử thanh toán của khách',
    descriptionEn: 'View customer payment history',
    icon: Clock,
    route: '/management/payment-history',
    gradient: ['#4ECDC4', '#44A08D'],
  },
  {
    id: 'debt',
    titleVi: 'Quản Lý Công Nợ',
    titleEn: 'Debt Management',
    descriptionVi: 'Theo dõi và quản lý công nợ',
    descriptionEn: 'Track and manage debts',
    icon: Wallet,
    route: '/management/debt',
    gradient: ['#45B7D1', '#96C93D'],
  },
  {
    id: 'rooms',
    titleVi: 'Quản Lý Thu/Chi',
    titleEn: 'Income/Expense',
    descriptionVi: 'Quản lý phiếu thu và chi',
    descriptionEn: 'Manage income and expense receipts',
    icon: DollarSign,
    route: '/management/rooms',
    gradient: ['#F093FB', '#F5576C'],
  },
  {
    id: 'electricity',
    titleVi: 'Quản Lý Điện',
    titleEn: 'Electricity Management',
    descriptionVi: 'Điều khiển thiết bị điện trong phòng',
    descriptionEn: 'Control electrical devices in rooms',
    icon: Zap,
    route: '/management/electricity',
    gradient: ['#FFD93D', '#FF6B6B'],
  },
  {
    id: 'shift-handover',
    titleVi: 'Quản Lý Giao Ca',
    titleEn: 'Shift Handover',
    descriptionVi: 'Bàn giao ca làm việc và doanh thu',
    descriptionEn: 'Handover shifts and revenue',
    icon: ArrowRightLeft,
    route: '/management/shift-handover',
    gradient: ['#5B8DEF', '#6BCBFF'],
  },
  {
    id: 'fanpage',
    titleVi: 'Quản Lý Fanpage',
    titleEn: 'Fanpage Management',
    descriptionVi: 'Quản lý tin nhắn từ fanpage',
    descriptionEn: 'Manage messages from fanpage',
    icon: MessageSquare,
    route: '/management/fanpage',
    gradient: ['#6BCF7F', '#2E8B57'],
  },
  {
    id: 'ai-chat',
    titleVi: 'AI Chatbox',
    titleEn: 'AI Chatbox',
    descriptionVi: 'Trợ lý AI hỗ trợ khách hàng',
    descriptionEn: 'AI assistant for customer support',
    icon: Sparkles,
    route: '/management/ai-chat',
    gradient: ['#667eea', '#764ba2'],
  },
];

export default function ManagementScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { isDark, colors } = useTheme();
  const { language } = useLanguage();
  const { selectedHotel } = useHotel();

  const isVi = language === 'vi';

  const handleModulePress = (route: string) => {
    router.push(route as any);
  };

  const renderModule = (module: ManagementModule) => {
    const IconComponent = module.icon;
    return (
      <TouchableOpacity
        key={module.id}
        style={[
          styles.moduleCard,
          {
            shadowColor: isDark ? '#000' : '#000',
            shadowOpacity: isDark ? 0.3 : 0.1,
            elevation: isDark ? 3 : 5,
          },
        ]}
        onPress={() => handleModulePress(module.route)}
        activeOpacity={0.8}
      >
        <LinearGradient
          colors={module.gradient}
          style={styles.moduleGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={styles.moduleIconWrap}>
            <IconComponent size={28} color="#FFF" />
          </View>
          <Text style={styles.moduleTitle} numberOfLines={2}>
            {isVi ? module.titleVi : module.titleEn}
          </Text>
          <Text style={styles.moduleDescription} numberOfLines={2}>
            {isVi ? module.descriptionVi : module.descriptionEn}
          </Text>
          <View style={styles.moduleArrow}>
            <ChevronRight size={16} color="rgba(255,255,255,0.7)" />
          </View>
        </LinearGradient>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Gradient Header */}
      <LinearGradient
        colors={['#0f766e', '#14b8a6']}
        style={[styles.header, { paddingTop: insets.top + 12 }]}
      >
        <View style={styles.headerContent}>
          <View style={styles.headerLeft}>
            <Text style={styles.headerSubtitle}>
              {isVi ? 'Quản lý khách sạn' : 'Hotel Management'}
            </Text>
            <View style={styles.hotelRow}>
              <Building2 size={18} color="#fff" />
              <Text style={styles.hotelName} numberOfLines={1}>
                {selectedHotel?.name || (isVi ? 'Khách sạn của bạn' : 'Your Hotel')}
              </Text>
            </View>
          </View>
        </View>
        <Text style={styles.headerDesc}>
          {isVi
            ? 'Tất cả công cụ quản lý trong một nơi'
            : 'All management tools in one place'}
        </Text>
      </LinearGradient>

      {/* Module Grid */}
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 20 }]}
      >
        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
          {isVi ? 'Công cụ quản lý' : 'Management Tools'} ({managementModules.length})
        </Text>
        <View style={styles.modulesGrid}>
          {managementModules.map(renderModule)}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 24,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  headerLeft: {
    flex: 1,
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    marginBottom: 4,
  },
  hotelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  hotelName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
    flex: 1,
  },
  headerDesc: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 10,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  modulesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  moduleCard: {
    width: '48%',
    marginBottom: 14,
    borderRadius: 16,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
    ...Platform.select({
      android: {
        overflow: 'hidden',
      },
    }),
  },
  moduleGradient: {
    borderRadius: 16,
    padding: 16,
    minHeight: 150,
    justifyContent: 'flex-start',
  },
  moduleIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  moduleTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFF',
    marginBottom: 4,
  },
  moduleDescription: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.85)',
    lineHeight: 16,
    flex: 1,
  },
  moduleArrow: {
    alignSelf: 'flex-end',
    marginTop: 8,
  },
});
