import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Modal,
  Pressable,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import {
  BedDouble,
  CalendarCheck,
  CalendarX,
  TrendingUp,
  TrendingDown,
  Sparkles,
  Wrench,
  ChevronRight,
  AlertCircle,
  Building2,
  ChevronDown,
  Check,
  DollarSign,
  BarChart3,
  PieChart,
  Bell,
  Users,
  Briefcase,
  UserCog,
  ClipboardList,
  Search,
  X,
  Wallet,
  Landmark,
  CreditCard,
} from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import Colors from '@/constants/colors';
import { useHotel } from '@/contexts/HotelContext';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { roomsApi, bookingsApi, revenueApi, notificationsApi, shiftHandoverApi } from '@/services/api';
import { TextInput } from 'react-native';
import { ShiftHandover } from '@/types/shift-handover';

// Helper function to map payment methods, similar to backend
const mapPaymentMethod = (method?: string): 'cash' | 'bank_transfer' | 'card' => {
  const m = (method || 'cash').toLowerCase();
  if (['transfer', 'banking', 'bank', 'bank_transfer', 'qr', 'vnpay'].includes(m)) {
    return 'bank_transfer';
  }
  if (['card', 'credit_card', 'virtual_card', 'visa'].includes(m)) {
    return 'card';
  }
  return 'cash';
};

interface QuickAccessItem {
  id: string;
  title: string;
  icon: React.ReactNode;
  route: string;
  color: string;
  bgColor: string;
}

export default function DashboardScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { isDark, colors } = useTheme();
  const [hotelModalVisible, setHotelModalVisible] = useState(false);
  const [notificationModalVisible, setNotificationModalVisible] = useState(false);
  const [notifTab, setNotifTab] = useState<'all' | 'system' | 'hotel'>('all');
  const [markingAll, setMarkingAll] = useState(false);
  const [hotelSearchText, setHotelSearchText] = useState('');
  const { hotels, selectedHotel, selectedHotelId, selectHotel, isLoading: hotelsLoading, canSelectMultipleHotels } = useHotel();
  const { user } = useAuth();

  const filteredHotels = hotels.filter(hotel => 
    hotel.name.toLowerCase().includes(hotelSearchText.toLowerCase())
  );

  const { data: rooms = [], isLoading: roomsLoading, refetch: refetchRooms } = useQuery({
    queryKey: ['rooms', selectedHotelId],
    queryFn: () => roomsApi.getAll(selectedHotelId || undefined),
    enabled: !!selectedHotelId,
  });

  const { data: bookings = [], isLoading: bookingsLoading, refetch: refetchBookings } = useQuery({
    queryKey: ['bookings', selectedHotelId],
    queryFn: () => selectedHotelId ? bookingsApi.getByHotel(selectedHotelId) : bookingsApi.getAll(),
    enabled: true,
  });
  
  const { data: roomEvents = [], isLoading: eventsLoading, refetch: refetchEvents } = useQuery({
    queryKey: ['roomEvents', selectedHotelId],
    queryFn: () => selectedHotelId ? roomsApi.getEventsByHotel(selectedHotelId, { limit: 50, types: ['checkin', 'checkout'] }) : Promise.resolve([]),
    enabled: !!selectedHotelId,
  });

  const { data: revenueData, isLoading: revenueLoading, refetch: refetchRevenue } = useQuery({
    queryKey: ['revenue', selectedHotelId],
    queryFn: async () => {
      const today = new Date();
      const startDate = new Date(today);
      startDate.setDate(today.getDate() - 6); // Last 7 days
      
      return revenueApi.getRevenueByPeriod({
        hotelId: selectedHotelId || '',
        period: 'day',
        startDate: startDate.toISOString().split('T')[0],
        endDate: today.toISOString().split('T')[0]
      });
    },
    enabled: !!selectedHotelId,
  });
  
  const { data: revenueSummary } = useQuery({
    queryKey: ['revenueSummary', selectedHotelId],
    queryFn: () => revenueApi.getSummary(selectedHotelId || ''),
    enabled: !!selectedHotelId,
  });
  const { data: breakdownRange } = useQuery({
    queryKey: ['revenueBreakdownRangeDashboard', selectedHotelId],
    queryFn: async () => {
      const today = new Date();
      const startDate = new Date(today);
      startDate.setDate(today.getDate() - 6);
      return revenueApi.getBreakdownByRange(
        selectedHotelId || '',
        startDate.toISOString().split('T')[0],
        today.toISOString().split('T')[0]
      );
    },
    enabled: !!selectedHotelId,
  });

  const { data: paymentBreakdown } = useQuery({
    queryKey: ['shiftRevenueDashboard', selectedHotelId],
    queryFn: async () => {
      const today = new Date();
      const startDate = new Date(today);
      startDate.setDate(today.getDate() - 6);
      return shiftHandoverApi.getRevenue(
        selectedHotelId || '',
        startDate.toISOString().split('T')[0],
        today.toISOString().split('T')[0]
      );
    },
    enabled: !!selectedHotelId,
  });

  const totalRevenuePeriod = revenueData?.totalRevenue || 0;

  const { data: notifications = [], refetch: refetchNotifications } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => notificationsApi.getAll(),
  });
  const { data: unreadSummary = { total: 0, system: 0, hotel: 0 }, refetch: refetchUnread } = useQuery({
    queryKey: ['notificationsUnread'],
    queryFn: () => notificationsApi.getUnreadCount(),
  });

  const unreadCount = unreadSummary?.total ?? notifications.filter(n => !n.isRead).length;
  const filteredNotifications = useMemo(() => {
    if (notifTab === 'system') return notifications.filter(n => (n.metadata?.targetType || 'system') === 'system');
    if (notifTab === 'hotel') return notifications.filter(n => n.metadata?.targetType === 'hotel');
    return notifications;
  }, [notifications, notifTab]);

  const isLoading = hotelsLoading || roomsLoading || bookingsLoading || revenueLoading || eventsLoading;

  const today = new Date().toISOString().split('T')[0];
  const isSameDay = (d: string | Date, now: Date) => {
    const dt = typeof d === 'string' ? new Date(d) : d;
    return dt.getFullYear() === now.getFullYear() && dt.getMonth() === now.getMonth() && dt.getDate() === now.getDate();
  };
  
  // Calculate stats based on hotelapp logic
  // guestOutRooms: rooms where status is occupied and guestStatus is out
  // occupancyRate: (occupied rooms / total rooms) * 100
  const occupiedRoomsCount = rooms.filter(r => r.status === 'occupied').length;
  const totalRoomsCount = rooms.length;
  
  const stats = {
    totalRooms: totalRoomsCount,
    occupiedRooms: occupiedRoomsCount,
    vacantRooms: rooms.filter(r => r.status === 'vacant').length,
    dirtyRooms: rooms.filter(r => r.status === 'dirty').length,
    cleaningRooms: rooms.filter(r => r.status === 'cleaning').length,
    maintenanceRooms: rooms.filter(r => r.status === 'maintenance').length,
    bookedRooms: rooms.filter(r => r.status === 'booked').length,
    guestOutRooms: rooms.filter(r => r.status === 'occupied' && r.guestStatus === 'out').length,
    todayCheckIns: bookings.filter(b => b.checkIn === today && b.status === 'confirmed').length,
    todayCheckOuts: bookings.filter(b => b.checkOut === today && b.status === 'checked_in').length,
    occupancyRate: totalRoomsCount > 0 
      ? Math.round((occupiedRoomsCount / totalRoomsCount) * 100) 
      : 0,
    totalRevenue: totalRevenuePeriod,
    todayRevenue: revenueSummary?.todayRevenue || 0
  };

  const todayCheckIns = roomEvents.filter(e => e.type === 'checkin' && (e.checkinTime ? isSameDay(e.checkinTime, new Date()) : isSameDay(e.createdAt, new Date())));
  const todayCheckOuts = roomEvents.filter(e => e.type === 'checkout' && (e.checkoutTime ? isSameDay(e.checkoutTime, new Date()) : isSameDay(e.createdAt, new Date())));

  const quickAccessItems: QuickAccessItem[] = [
    { id: 'bookings', title: 'Đặt phòng', icon: <ClipboardList size={22} color="#6366f1" />, route: '/(tabs)/bookings', color: '#6366f1', bgColor: '#eef2ff' },
    { id: 'guests', title: 'Khách hàng', icon: <Users size={22} color="#10b981" />, route: '/(tabs)/guests', color: '#10b981', bgColor: '#ecfdf5' },
    { id: 'services', title: 'Dịch vụ', icon: <Briefcase size={22} color="#f59e0b" />, route: '/(tabs)/services', color: '#f59e0b', bgColor: '#fef3c7' },
    { id: 'staffs', title: 'Nhân viên', icon: <UserCog size={22} color="#ec4899" />, route: '/(tabs)/staffs', color: '#ec4899', bgColor: '#fce7f3' },
  ];

  const handleRefresh = async () => {
    await Promise.all([refetchRooms(), refetchBookings(), refetchRevenue(), refetchNotifications(), refetchUnread()]);
  };

  const handleMarkAllRead = async () => {
    if (markingAll) return;
    setMarkingAll(true);
    try {
      await notificationsApi.markAllAsRead();
      await Promise.all([refetchNotifications(), refetchUnread()]);
    } catch {}
    setMarkingAll(false);
  };

  const formatCurrency = (amount: number) => {
    if (amount >= 1000000000) {
      return `${(amount / 1000000000).toFixed(1)}B`;
    }
    if (amount >= 1000000) {
      return `${(amount / 1000000).toFixed(1)}M`;
    }
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatFullCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const dateObj = new Date();
  const dateStr = dateObj.toLocaleDateString('vi-VN');
  const dayNames = ['Chủ nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];
  const dayStr = dayNames[dateObj.getDay()];

  const handleSelectHotel = (hotelId: string) => {
    selectHotel(hotelId);
    setHotelModalVisible(false);
  };

  const handleQuickAccess = (route: string) => {
    router.push(route as any);
  };

  // Calculate growth based on revenue data (compare last day with previous day)
  const revenueGrowth = (() => {
    if (!revenueData?.revenueData || revenueData.revenueData.length < 2) return 0;
    const lastDay = revenueData.revenueData[revenueData.revenueData.length - 1];
    const prevDay = revenueData.revenueData[revenueData.revenueData.length - 2];
    if (prevDay === 0) return lastDay > 0 ? 100 : 0;
    return Math.round(((lastDay - prevDay) / prevDay) * 100);
  })();
  
  const isPositiveGrowth = revenueGrowth >= 0;

  const maxDailyRevenue = revenueData?.revenueData 
    ? Math.max(...revenueData.revenueData, 1) 
    : 1;

  if (isLoading && !selectedHotel) {
    return (
      <View style={[styles.container, styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.tint} />
        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Đang tải dữ liệu...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <LinearGradient
        colors={['#0f766e', '#14b8a6']}
        style={[styles.header, { paddingTop: insets.top + 12 }]}
      >
        <View style={styles.headerContent}>
          <View style={styles.headerLeft}>
            <Text style={styles.greeting}>Xin chào, {user?.name || 'Quản lý'}!</Text>
            {hotels.length > 1 ? (
              <TouchableOpacity 
                style={styles.hotelSelector}
                onPress={() => setHotelModalVisible(true)}
              >
                <Building2 size={18} color="#fff" />
                <Text style={styles.hotelName} numberOfLines={1}>
                  {selectedHotel?.name || (isLoading ? 'Đang tải...' : 'Chọn khách sạn')}
                </Text>
                <ChevronDown size={18} color="#fff" />
              </TouchableOpacity>
            ) : (
              <View style={styles.hotelSelector}>
                <Building2 size={18} color="#fff" />
                <Text style={styles.hotelName} numberOfLines={1}>
                  {selectedHotel?.name || (hotels.length > 0 ? hotels[0].name : (isLoading ? 'Đang tải...' : 'Chưa có khách sạn'))}
                </Text>
              </View>
            )}
          </View>
          <View style={styles.headerRight}>        
            <View style={styles.dateContainer}>
              <Text style={styles.dateText}>{dateStr}</Text>
              <Text style={styles.dayText}>{dayStr}</Text>
            </View>
            <TouchableOpacity 
              style={styles.notificationBtn}
              onPress={() => setNotificationModalVisible(true)}
            >
              <Bell size={22} color="#fff" />
              {unreadCount > 0 && (
                <View style={styles.notificationBadge}>
                  <Text style={styles.notificationBadgeText}>
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.occupancyCard}>
          <View style={styles.occupancyHeader}>
            <Text style={styles.occupancyLabel}>Tỷ lệ lấp đầy</Text>
            <Text style={styles.occupancyValue}>{stats.occupancyRate}%</Text>
          </View>
          <View style={styles.progressBar}>
            <View
              style={[styles.progressFill, { width: `${stats.occupancyRate}%` }]}
            />
          </View>
          <View style={styles.occupancyStats}>
            <View style={styles.occupancyStat}>
              <View style={[styles.statusDot, { backgroundColor: Colors.status.occupied }]} />
              <Text style={styles.occupancyStatText}>
                {stats.occupiedRooms} đang ở
              </Text>
            </View>
            <View style={styles.occupancyStat}>
              <View style={[styles.statusDot, { backgroundColor: Colors.status.vacant }]} />
              <Text style={styles.occupancyStatText}>
                {stats.vacantRooms} trống
              </Text>
            </View>
            <View style={styles.occupancyStat}>
              <View style={[styles.statusDot, { backgroundColor: Colors.status.dirty }]} />
              <Text style={styles.occupancyStatText}>
                {stats.dirtyRooms} bẩn
              </Text>
            </View>
          </View>
        </View>
      </LinearGradient>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 }}
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={handleRefresh} />
        }
      >
        <View style={styles.quickAccessSection}>
          <Text style={[styles.quickAccessTitle, { color: colors.text }]}>Truy cập nhanh</Text>
          <View style={styles.quickAccessGrid}>
            {quickAccessItems.map((item) => (
              <TouchableOpacity
                key={item.id}
                style={[styles.quickAccessItem, { backgroundColor: item.bgColor }]}
                onPress={() => handleQuickAccess(item.route)}
              >
                {item.icon}
                <Text style={[styles.quickAccessText, { color: item.color }]}>{item.title}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.quickStats}>
          <View style={[styles.statCard, { backgroundColor: isDark ? '#052e16' : '#ecfdf5' }]}>
            <View style={[styles.statIcon, { backgroundColor: isDark ? '#14532d' : '#d1fae5' }]}>
              <CalendarCheck size={20} color={Colors.status.vacant} />
            </View>
            <Text style={[styles.statValue, { color: colors.text }]}>{stats.vacantRooms}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Phòng trống</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: isDark ? '#083344' : '#ecfeff' }]}>
            <View style={[styles.statIcon, { backgroundColor: isDark ? '#164e63' : '#cffafe' }]}>
              <Users size={20} color={Colors.status.guestOut} />
            </View>
            <Text style={[styles.statValue, { color: colors.text }]}>{stats.guestOutRooms}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Khách ra ngoài</Text>
          </View>
        </View>

        <View style={styles.quickStats}>
          <View style={[styles.statCard, { backgroundColor: isDark ? '#172554' : '#eff6ff' }]}>
            <View style={[styles.statIcon, { backgroundColor: isDark ? '#1e3a5f' : '#dbeafe' }]}>
              <Sparkles size={20} color={Colors.status.cleaning} />
            </View>
            <Text style={[styles.statValue, { color: colors.text }]}>{stats.cleaningRooms}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Đang dọn dẹp</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: isDark ? '#450a0a' : '#fef2f2' }]}>
            <View style={[styles.statIcon, { backgroundColor: isDark ? '#7f1d1d' : '#fee2e2' }]}>
              <Wrench size={20} color={Colors.status.maintenance} />
            </View>
            <Text style={[styles.statValue, { color: colors.text }]}>{stats.maintenanceRooms}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Bảo trì</Text>
          </View>
        </View>

        <View style={styles.quickStats}>
           <View style={[styles.statCard, { backgroundColor: isDark ? '#4a044e' : '#fdf4ff' }]}>
            <View style={[styles.statIcon, { backgroundColor: isDark ? '#701a75' : '#f5d0fe' }]}>
              <BedDouble size={20} color={Colors.status.booked} />
            </View>
            <Text style={[styles.statValue, { color: colors.text }]}>{stats.bookedRooms}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Đã đặt</Text>
          </View>
           <View style={[styles.statCard, { backgroundColor: isDark ? '#431407' : '#fff7ed' }]}>
            <View style={[styles.statIcon, { backgroundColor: isDark ? '#7c2d12' : '#ffedd5' }]}>
              <AlertCircle size={20} color={Colors.status.dirty} />
            </View>
            <Text style={[styles.statValue, { color: colors.text }]}>{stats.dirtyRooms}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Phòng bẩn</Text>
          </View>
        </View>

        <View style={styles.revenueSection}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Doanh thu</Text>
            <View style={[styles.growthBadge, { backgroundColor: isPositiveGrowth ? '#10b98120' : '#ef444420'}]}>
              {isPositiveGrowth ? (
                <TrendingUp size={14} color="#10b981" />
              ) : (
                <TrendingDown size={14} color="#ef4444" />
              )}
              <Text style={[styles.growthText, { color: isPositiveGrowth ? '#10b981' : '#ef4444' }]}>
                {isPositiveGrowth ? '+' : ''}{revenueGrowth.toFixed(1)}%
              </Text>
            </View>
          </View>
          
          <View style={styles.revenueCards}>
            <LinearGradient
              colors={isDark ? ['#0f766e', '#0d9488'] : ['#14b8a6', '#0d9488']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.revenueMainCard}
            >
              <View style={styles.revenueMainIcon}>
                <DollarSign size={24} color="#fff" />
              </View>
              <Text style={styles.revenueMainLabel}>Hôm nay</Text>
              <Text style={styles.revenueMainValue}>
                {formatCurrency(stats.todayRevenue)}
              </Text>
              <View style={styles.revenueCompare}>
                <Text style={styles.revenueCompareText}>
                  Tổng doanh thu: {formatCurrency(totalRevenuePeriod)}
                </Text>
              </View>
            </LinearGradient>

            <View style={styles.revenueSecondaryCards}>
              <View style={[styles.revenueSecondaryCard, { backgroundColor: colors.cardBackground }]}>
                <BarChart3 size={18} color="#6366f1" />
                <Text style={[styles.revenueSecondaryLabel, { color: colors.textSecondary }]}>Tổng thanh toán</Text>
                <Text style={[styles.revenueSecondaryValue, { color: colors.text }]}>
                  {formatCurrency(revenueData?.totalPayment || 0)}
                </Text>
              </View>
              <View style={[styles.revenueSecondaryCard, { backgroundColor: colors.cardBackground }]}>
                <PieChart size={18} color="#f59e0b" />
                <Text style={[styles.revenueSecondaryLabel, { color: colors.textSecondary }]}>Tổng chi phí</Text>
                <Text style={[styles.revenueSecondaryValue, { color: colors.text }]}>
                  {formatCurrency(revenueData?.totalExpense || 0)}
                </Text>
              </View>
            </View>
          </View>

          <View style={[styles.revenueBreakdown, { backgroundColor: colors.cardBackground }]}>
            <View style={styles.breakdownItem}>
              <View style={[styles.breakdownDot, { backgroundColor: '#0d9488' }]} />
              <Text style={[styles.breakdownLabel, { color: colors.textSecondary }]}>Doanh thu phòng</Text>
              <Text style={[styles.breakdownValue, { color: colors.text }]}>
                {formatCurrency((breakdownRange?.roomRevenue ?? revenueSummary?.roomRevenue) || 0)}
              </Text>
            </View>
            <View style={styles.breakdownItem}>
              <View style={[styles.breakdownDot, { backgroundColor: '#f59e0b' }]} />
              <Text style={[styles.breakdownLabel, { color: colors.textSecondary }]}>Doanh thu dịch vụ</Text>
              <Text style={[styles.breakdownValue, { color: colors.text }]}>
                {formatCurrency((breakdownRange?.serviceRevenue ?? revenueSummary?.serviceRevenue) || 0)}
              </Text>
            </View>
          </View>

        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Check-in hôm nay</Text>
            <TouchableOpacity 
              style={styles.seeAllBtn}
              onPress={() => router.push('/(tabs)/bookings' as any)}
            >
              <Text style={[styles.seeAllText, { color: colors.tint }]}>Xem tất cả</Text>
              <ChevronRight size={16} color={colors.tint} />
            </TouchableOpacity>
          </View>
          {todayCheckIns.length > 0 ? (
            todayCheckIns.slice(0, 3).map((ev) => (
              <View key={ev.id} style={[styles.bookingCard, { backgroundColor: colors.cardBackground }]}>
                <View style={styles.bookingInfo}>
                  <View style={[styles.roomBadge, { backgroundColor: colors.tint }]}>
                    <BedDouble size={14} color="#fff" />
                    <Text style={styles.roomBadgeText}>{ev.roomNumber}</Text>
                  </View>
                  <View style={styles.bookingDetails}>
                    <Text style={[styles.guestName, { color: colors.text }]}>{ev.guestName || 'Khách lẻ'}</Text>
                    <Text style={[styles.bookingMeta, { color: colors.textSecondary }]}>
                      {(() => {
                        const dt = ev.checkinTime ? new Date(ev.checkinTime) : new Date(ev.createdAt);
                        const hh = String(dt.getHours()).padStart(2, '0');
                        const mm = String(dt.getMinutes()).padStart(2, '0');
                        const dd = String(dt.getDate()).padStart(2, '0');
                        const mo = String(dt.getMonth() + 1).padStart(2, '0');
                        return `${hh}:${mm} • ${dd}/${mo}`;
                      })()}
                    </Text>
                  </View>
                </View>
                <TouchableOpacity style={[styles.checkInBtn, { backgroundColor: colors.tint }]}>
                  <Text style={styles.checkInBtnText}>Check-in</Text>
                </TouchableOpacity>
              </View>
            ))
          ) : (
            <View style={[styles.emptyState, { backgroundColor: colors.cardBackground }]}>
              <AlertCircle size={20} color={colors.textSecondary} />
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>Không có check-in hôm nay</Text>
            </View>
          )}
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Check-out hôm nay</Text>
            <TouchableOpacity 
              style={styles.seeAllBtn}
              onPress={() => router.push('/(tabs)/bookings' as any)}
            >
              <Text style={[styles.seeAllText, { color: colors.tint }]}>Xem tất cả</Text>
              <ChevronRight size={16} color={colors.tint} />
            </TouchableOpacity>
          </View>
          {todayCheckOuts.length > 0 ? (
            todayCheckOuts.slice(0, 3).map((ev) => (
              <View key={ev.id} style={[styles.bookingCard, { backgroundColor: colors.cardBackground }]}>
                <View style={styles.bookingInfo}>
                  <View style={[styles.roomBadge, { backgroundColor: Colors.status.cleaning }]}>
                    <BedDouble size={14} color="#fff" />
                    <Text style={styles.roomBadgeText}>{ev.roomNumber}</Text>
                  </View>
                  <View style={styles.bookingDetails}>
                    <Text style={[styles.guestName, { color: colors.text }]}>{ev.guestName || 'Khách lẻ'}</Text>
                  </View>
                </View>
                <TouchableOpacity style={[styles.checkInBtn, { backgroundColor: Colors.status.cleaning }]}>
                  <Text style={styles.checkInBtnText}>Check-out</Text>
                </TouchableOpacity>
              </View>
            ))
          ) : (
            <View style={[styles.emptyState, { backgroundColor: colors.cardBackground }]}>
              <AlertCircle size={20} color={colors.textSecondary} />
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>Không có check-out hôm nay</Text>
            </View>
          )}
        </View>
      </ScrollView>

      <Modal
        visible={hotelModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setHotelModalVisible(false)}
      >
        <Pressable 
          style={[styles.modalOverlay, { backgroundColor: colors.overlay }]}
          onPress={() => setHotelModalVisible(false)}
        >
          <View style={[styles.modalContent, { backgroundColor: colors.cardBackground }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Chọn khách sạn</Text>
            
            <View style={[styles.searchContainer, { backgroundColor: isDark ? '#1e293b' : '#f1f5f9' }]}>
              <Search size={20} color={colors.textSecondary} />
              <TextInput
                style={[styles.searchInput, { color: colors.text }]}
                placeholder="Tìm kiếm khách sạn..."
                placeholderTextColor={colors.textSecondary}
                value={hotelSearchText}
                onChangeText={setHotelSearchText}
              />
              {hotelSearchText.length > 0 && (
                <TouchableOpacity onPress={() => setHotelSearchText('')}>
                  <X size={18} color={colors.textSecondary} />
                </TouchableOpacity>
              )}
            </View>

            <ScrollView style={styles.hotelList}>
              {filteredHotels.map((hotel) => (
                <TouchableOpacity
                  key={hotel.id}
                  style={[
                    styles.hotelItem,
                    { backgroundColor: isDark ? '#1e293b' : '#f8fafc' },
                    selectedHotelId === hotel.id && { backgroundColor: isDark ? '#064e3b' : '#ecfdf5', borderWidth: 1, borderColor: colors.tint }
                  ]}
                  onPress={() => handleSelectHotel(hotel.id)}
                >
                  <Building2 
                    size={20} 
                    color={selectedHotelId === hotel.id ? colors.tint : colors.textSecondary} 
                  />
                  <Text style={[
                    styles.hotelItemText,
                    { color: colors.text },
                    selectedHotelId === hotel.id && { fontWeight: '600' as const, color: colors.tint }
                  ]}>
                    {hotel.name}
                  </Text>
                  {selectedHotelId === hotel.id && (
                    <Check size={20} color={colors.tint} />
                  )}
                </TouchableOpacity>
              ))}
              {filteredHotels.length === 0 && (
                <View style={styles.emptyHotels}>
                  <AlertCircle size={24} color={colors.textSecondary} />
                  <Text style={[styles.emptyHotelsText, { color: colors.textSecondary }]}>
                    {hotels.length === 0 ? 'Chưa có khách sạn nào' : 'Không tìm thấy khách sạn phù hợp'}
                  </Text>
                </View>
              )}
            </ScrollView>
          </View>
        </Pressable>
      </Modal>

      <Modal
        visible={notificationModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setNotificationModalVisible(false)}
      >
        <Pressable 
          style={[styles.modalOverlay, { backgroundColor: colors.overlay }]}
          onPress={() => setNotificationModalVisible(false)}
        >
          <View style={[styles.modalContent, { backgroundColor: colors.cardBackground }]}>
            <View style={styles.modalHeaderRow}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Thông báo</Text>
              <TouchableOpacity
                style={[styles.markAllBtn, { borderColor: colors.tint }]}
                onPress={handleMarkAllRead}
                disabled={markingAll}
              >
                {markingAll ? (
                  <ActivityIndicator size="small" color={colors.tint} />
                ) : (
                  <Text style={[styles.markAllBtnText, { color: colors.tint }]}>Mark all as read</Text>
                )}
              </TouchableOpacity>
            </View>
            <View style={styles.tabsRow}>
              <TouchableOpacity
                style={[styles.tabItem, notifTab === 'all' && styles.tabItemActive]}
                onPress={() => setNotifTab('all')}
              >
                <Text style={[styles.tabText, notifTab === 'all' && styles.tabTextActive]}>All</Text>
                <View style={[styles.tabUnderline, notifTab === 'all' && styles.tabUnderlineActive]} />
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.tabItem, notifTab === 'system' && styles.tabItemActive]}
                onPress={() => setNotifTab('system')}
              >
                <Text style={[styles.tabText, notifTab === 'system' && styles.tabTextActive]}>
                  System {unreadSummary?.system ? `(${unreadSummary.system})` : ''}
                </Text>
                <View style={[styles.tabUnderline, notifTab === 'system' && styles.tabUnderlineActive]} />
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.tabItem, notifTab === 'hotel' && styles.tabItemActive]}
                onPress={() => setNotifTab('hotel')}
              >
                <Text style={[styles.tabText, notifTab === 'hotel' && styles.tabTextActive]}>
                  Hotel {unreadSummary?.hotel ? `(${unreadSummary.hotel})` : ''}
                </Text>
                <View style={[styles.tabUnderline, notifTab === 'hotel' && styles.tabUnderlineActive]} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.notificationList}>
              {filteredNotifications.length > 0 ? (
                filteredNotifications.slice(0, 10).map((notification) => (
                  <View 
                    key={notification.id} 
                    style={[
                      styles.notificationItem,
                      !notification.isRead && styles.notificationItemUnread
                    ]}
                  >
                    <View style={styles.notificationDot}>
                      {!notification.isRead && <View style={styles.unreadDot} />}
                    </View>
                    <View style={styles.notificationContent}>
                      <Text style={[styles.notificationTitle, { color: colors.text }]}>{notification.title}</Text>
                      <Text style={[styles.notificationMessage, { color: colors.textSecondary }]} numberOfLines={2}>
                        {notification.message}
                      </Text>
                      <Text style={[styles.notificationTime, { color: colors.textSecondary }]}>
                        {new Date(notification.createdAt).toLocaleDateString('vi-VN')}
                      </Text>
                    </View>
                  </View>
                ))
              ) : (
                <View style={styles.emptyNotifications}>
                  <Bell size={32} color={colors.textSecondary} />
                  <Text style={[styles.emptyNotificationsText, { color: colors.textSecondary }]}>Không có thông báo</Text>
                </View>
              )}
            </ScrollView>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: Colors.light.textSecondary,
  },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 80,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  headerLeft: {
    flex: 1,
    marginRight: 12,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  greeting: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
  },
  hotelSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    marginTop: 6,
    gap: 8,
  },
  hotelInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    gap: 6,
  },
  hotelName: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#fff',
    flex: 1,
  },
  hotelNameStatic: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.9)',
  },
  notificationBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  notificationBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: '#ef4444',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  notificationBadgeText: {
    fontSize: 11,
    fontWeight: '600' as const,
    color: '#fff',
  },
  dateContainer: {
    alignItems: 'flex-end',
  },
  dateText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#fff',
  },
  dayText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 2,
  },
  occupancyCard: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 16,
    padding: 16,
  },
  occupancyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  occupancyLabel: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.9)',
  },
  occupancyValue: {
    fontSize: 28,
    fontWeight: '700' as const,
    color: '#fff',
  },
  progressBar: {
    height: 8,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#fff',
    borderRadius: 4,
  },
  occupancyStats: {
    flexDirection: 'row',
    marginTop: 12,
    gap: 16,
  },
  occupancyStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  occupancyStatText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.9)',
  },
  content: {
    flex: 1,
    marginTop: -50,
    paddingHorizontal: 16,
  },
  quickAccessSection: {
    marginBottom: 16,
  },
  quickAccessTitle: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.light.text,
    marginBottom: 10,
  },
  quickAccessGrid: {
    flexDirection: 'row',
    gap: 10,
  },
  quickAccessItem: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 8,
    borderRadius: 12,
    alignItems: 'center',
    gap: 6,
  },
  quickAccessText: {
    fontSize: 11,
    fontWeight: '500' as const,
  },
  quickStats: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  statCard: {
    flex: 1,
    padding: 16,
    borderRadius: 16,
    minHeight: 100,
  },
  statIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700' as const,
    color: Colors.light.text,
  },
  statLabel: {
    fontSize: 12,
    color: Colors.light.textSecondary,
    marginTop: 4,
  },
  revenueSection: {
    marginTop: 8,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: Colors.light.text,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  growthBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0fdf4',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    gap: 4,
  },
  growthText: {
    fontSize: 13,
    fontWeight: '600' as const,
  },
  revenueCards: {
    flexDirection: 'row',
    gap: 12,
  },
  revenueMainCard: {
    flex: 1.2,
    padding: 16,
    borderRadius: 16,
    minHeight: 140,
  },
  revenueMainIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  revenueMainLabel: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.8)',
  },
  revenueMainValue: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: '#fff',
    marginTop: 4,
  },
  revenueCompare: {
    marginTop: 12,
  },
  revenueCompareText: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.7)',
  },
  revenueSecondaryCards: {
    flex: 1,
    gap: 12,
  },
  revenueSecondaryCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  revenueSecondaryLabel: {
    fontSize: 11,
    color: Colors.light.textSecondary,
    marginTop: 6,
  },
  revenueSecondaryValue: {
    fontSize: 15,
    fontWeight: '700' as const,
    color: Colors.light.text,
    marginTop: 2,
  },
  revenueBreakdown: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    marginTop: 12,
    gap: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  breakdownItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  breakdownDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  breakdownLabel: {
    fontSize: 13,
    color: Colors.light.textSecondary,
  },
  breakdownValue: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: Colors.light.text,
    marginLeft: 'auto',
  },
  chartContainer: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginTop: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  chartTitle: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.light.text,
    marginBottom: 16,
  },
  chart: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: 100,
    gap: 8,
  },
  chartBar: {
    flex: 1,
    alignItems: 'center',
  },
  chartBarContainer: {
    width: '100%',
    height: 80,
    backgroundColor: '#f0f9ff',
    borderRadius: 4,
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  chartBarFill: {
    width: '100%',
    backgroundColor: '#0d9488',
    borderRadius: 4,
  },
  chartLabel: {
    fontSize: 10,
    color: Colors.light.textSecondary,
    marginTop: 6,
  },
  chartValue: {
    fontSize: 11,
    fontWeight: '600' as const,
    color: Colors.light.text,
    marginTop: 6,
  },
  section: {
    marginBottom: 24,
  },
  seeAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  seeAllText: {
    fontSize: 14,
    color: Colors.light.tint,
  },
  bookingCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  bookingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  roomBadge: {
    backgroundColor: Colors.light.tint,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  roomBadgeText: {
    color: '#fff',
    fontWeight: '600' as const,
    fontSize: 14,
  },
  bookingDetails: {
    flex: 1,
  },
  guestName: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: Colors.light.text,
  },
  bookingMeta: {
    fontSize: 12,
    color: Colors.light.textSecondary,
    marginTop: 2,
  },
  checkInBtn: {
    backgroundColor: Colors.light.tint,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  checkInBtnText: {
    color: '#fff',
    fontWeight: '600' as const,
    fontSize: 13,
  },
  emptyState: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  emptyText: {
    color: Colors.light.textSecondary,
    fontSize: 14,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    width: '100%',
    maxWidth: 400,
    maxHeight: '70%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: Colors.light.text,
    marginBottom: 16,
    textAlign: 'center',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    marginBottom: 16,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    padding: 0,
  },
  hotelList: {
    maxHeight: 300,
  },
  hotelItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    backgroundColor: Colors.light.background,
    marginBottom: 8,
    gap: 12,
  },
  hotelItemSelected: {
    backgroundColor: '#ecfdf5',
    borderWidth: 1,
    borderColor: Colors.light.tint,
  },
  hotelItemText: {
    fontSize: 16,
    color: Colors.light.text,
    flex: 1,
  },
  hotelItemTextSelected: {
    fontWeight: '600' as const,
    color: Colors.light.tint,
  },
  emptyHotels: {
    alignItems: 'center',
    padding: 30,
    gap: 12,
  },
  emptyHotelsText: {
    fontSize: 14,
    color: Colors.light.textSecondary,
  },
  notificationList: {
    maxHeight: 400,
  },
  notificationItem: {
    flexDirection: 'row',
    padding: 14,
    borderRadius: 12,
    backgroundColor: Colors.light.background,
    marginBottom: 8,
    gap: 12,
  },
  notificationItemUnread: {
    backgroundColor: '#ecfdf5',
  },
  notificationDot: {
    width: 20,
    justifyContent: 'flex-start',
    alignItems: 'center',
    paddingTop: 4,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.light.tint,
  },
  notificationContent: {
    flex: 1,
  },
  notificationTitle: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.light.text,
  },
  notificationMessage: {
    fontSize: 13,
    color: Colors.light.textSecondary,
    marginTop: 4,
  },
  notificationTime: {
    fontSize: 11,
    color: Colors.light.textSecondary,
    marginTop: 6,
  },
  emptyNotifications: {
    alignItems: 'center',
    padding: 40,
    gap: 12,
  },
  emptyNotificationsText: {
    fontSize: 14,
    color: Colors.light.textSecondary,
  },
  modalHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  tabsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 12,
  },
  markAllBtn: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  markAllBtnText: {
    fontSize: 12,
    fontWeight: '600' as const,
  },
  tabItem: {
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  tabItemActive: {
    opacity: 1,
  },
  tabText: {
    fontSize: 14,
    color: Colors.light.textSecondary,
  },
  tabTextActive: {
    color: Colors.light.text,
    fontWeight: '600' as const,
  },
  tabUnderline: {
    height: 2,
    width: 24,
    backgroundColor: 'transparent',
    marginTop: 6,
    borderRadius: 1,
  },
  tabUnderlineActive: {
    backgroundColor: Colors.light.tint,
  },
});
