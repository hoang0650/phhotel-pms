import React, { useState } from 'react';
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
} from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import Colors from '@/constants/colors';
import { useHotel } from '@/contexts/HotelContext';
import { roomsApi, bookingsApi, revenueApi } from '@/services/api';

export default function DashboardScreen() {
  const insets = useSafeAreaInsets();
  const [hotelModalVisible, setHotelModalVisible] = useState(false);
  const { hotels, selectedHotel, selectedHotelId, selectHotel, isLoading: hotelsLoading } = useHotel();

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

  const { data: revenueSummary, isLoading: revenueLoading, refetch: refetchRevenue } = useQuery({
    queryKey: ['revenue', 'summary', selectedHotelId],
    queryFn: () => revenueApi.getSummary(selectedHotelId || undefined),
    enabled: true,
  });

  const { data: dailyRevenue = [], refetch: refetchDailyRevenue } = useQuery({
    queryKey: ['revenue', 'daily', selectedHotelId],
    queryFn: () => revenueApi.getDaily(selectedHotelId || undefined),
    enabled: true,
  });

  const isLoading = hotelsLoading || roomsLoading || bookingsLoading || revenueLoading;

  const today = new Date().toISOString().split('T')[0];
  
  const stats = {
    totalRooms: rooms.length,
    occupiedRooms: rooms.filter(r => r.status === 'occupied').length,
    availableRooms: rooms.filter(r => r.status === 'available').length,
    cleaningRooms: rooms.filter(r => r.status === 'cleaning').length,
    maintenanceRooms: rooms.filter(r => r.status === 'maintenance').length,
    todayCheckIns: bookings.filter(b => b.checkIn === today && b.status === 'confirmed').length,
    todayCheckOuts: bookings.filter(b => b.checkOut === today && b.status === 'checked_in').length,
    occupancyRate: rooms.length > 0 
      ? Math.round((rooms.filter(r => r.status === 'occupied').length / rooms.length) * 100) 
      : 0,
  };

  const todayCheckIns = bookings.filter(b => b.checkIn === today && b.status === 'confirmed');
  const todayCheckOuts = bookings.filter(b => b.checkOut === today && b.status === 'checked_in');

  const handleRefresh = async () => {
    await Promise.all([refetchRooms(), refetchBookings(), refetchRevenue(), refetchDailyRevenue()]);
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

  const revenueGrowth = revenueSummary?.revenueGrowth || 0;
  const isPositiveGrowth = revenueGrowth >= 0;

  const maxDailyRevenue = Math.max(...dailyRevenue.map(d => d.revenue), 1);

  if (isLoading && !selectedHotel) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <ActivityIndicator size="large" color={Colors.light.tint} />
        <Text style={styles.loadingText}>Đang tải dữ liệu...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#0f766e', '#14b8a6']}
        style={[styles.header, { paddingTop: insets.top + 12 }]}
      >
        <View style={styles.headerContent}>
          <View style={styles.headerLeft}>
            <Text style={styles.greeting}>Xin chào!</Text>
            <TouchableOpacity 
              style={styles.hotelSelector}
              onPress={() => setHotelModalVisible(true)}
            >
              <Building2 size={18} color="#fff" />
              <Text style={styles.hotelName} numberOfLines={1}>
                {selectedHotel?.name || 'Chọn khách sạn'}
              </Text>
              <ChevronDown size={18} color="#fff" />
            </TouchableOpacity>
          </View>
          <View style={styles.dateContainer}>
            <Text style={styles.dateText}>{dateStr}</Text>
            <Text style={styles.dayText}>{dayStr}</Text>
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
              <View style={[styles.statusDot, { backgroundColor: Colors.status.available }]} />
              <Text style={styles.occupancyStatText}>
                {stats.availableRooms} trống
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
        <View style={styles.quickStats}>
          <View style={[styles.statCard, { backgroundColor: '#ecfdf5' }]}>
            <View style={[styles.statIcon, { backgroundColor: '#d1fae5' }]}>
              <CalendarCheck size={20} color={Colors.status.available} />
            </View>
            <Text style={styles.statValue}>{stats.todayCheckIns}</Text>
            <Text style={styles.statLabel}>Check-in hôm nay</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: '#fef3c7' }]}>
            <View style={[styles.statIcon, { backgroundColor: '#fde68a' }]}>
              <CalendarX size={20} color={Colors.status.cleaning} />
            </View>
            <Text style={styles.statValue}>{stats.todayCheckOuts}</Text>
            <Text style={styles.statLabel}>Check-out hôm nay</Text>
          </View>
        </View>

        <View style={styles.quickStats}>
          <View style={[styles.statCard, { backgroundColor: '#eff6ff' }]}>
            <View style={[styles.statIcon, { backgroundColor: '#dbeafe' }]}>
              <Sparkles size={20} color={Colors.status.occupied} />
            </View>
            <Text style={styles.statValue}>{stats.cleaningRooms}</Text>
            <Text style={styles.statLabel}>Đang dọn dẹp</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: '#fef2f2' }]}>
            <View style={[styles.statIcon, { backgroundColor: '#fee2e2' }]}>
              <Wrench size={20} color={Colors.status.maintenance} />
            </View>
            <Text style={styles.statValue}>{stats.maintenanceRooms}</Text>
            <Text style={styles.statLabel}>Bảo trì</Text>
          </View>
        </View>

        <View style={styles.revenueSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Doanh thu</Text>
            <View style={styles.growthBadge}>
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
              colors={['#0f766e', '#0d9488']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.revenueMainCard}
            >
              <View style={styles.revenueMainIcon}>
                <DollarSign size={24} color="#fff" />
              </View>
              <Text style={styles.revenueMainLabel}>Hôm nay</Text>
              <Text style={styles.revenueMainValue}>
                {formatFullCurrency(revenueSummary?.todayRevenue || 0)}
              </Text>
              <View style={styles.revenueCompare}>
                <Text style={styles.revenueCompareText}>
                  Hôm qua: {formatCurrency(revenueSummary?.yesterdayRevenue || 0)}
                </Text>
              </View>
            </LinearGradient>

            <View style={styles.revenueSecondaryCards}>
              <View style={styles.revenueSecondaryCard}>
                <BarChart3 size={18} color="#6366f1" />
                <Text style={styles.revenueSecondaryLabel}>Tuần này</Text>
                <Text style={styles.revenueSecondaryValue}>
                  {formatCurrency(revenueSummary?.weeklyRevenue || 0)}
                </Text>
              </View>
              <View style={styles.revenueSecondaryCard}>
                <PieChart size={18} color="#f59e0b" />
                <Text style={styles.revenueSecondaryLabel}>Tháng này</Text>
                <Text style={styles.revenueSecondaryValue}>
                  {formatCurrency(revenueSummary?.monthlyRevenue || 0)}
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.revenueBreakdown}>
            <View style={styles.breakdownItem}>
              <View style={[styles.breakdownDot, { backgroundColor: '#0d9488' }]} />
              <Text style={styles.breakdownLabel}>Phòng</Text>
              <Text style={styles.breakdownValue}>
                {formatCurrency(revenueSummary?.roomRevenue || 0)}
              </Text>
            </View>
            <View style={styles.breakdownItem}>
              <View style={[styles.breakdownDot, { backgroundColor: '#f59e0b' }]} />
              <Text style={styles.breakdownLabel}>Dịch vụ</Text>
              <Text style={styles.breakdownValue}>
                {formatCurrency(revenueSummary?.serviceRevenue || 0)}
              </Text>
            </View>
          </View>

          {dailyRevenue.length > 0 && (
            <View style={styles.chartContainer}>
              <Text style={styles.chartTitle}>Doanh thu 7 ngày qua</Text>
              <View style={styles.chart}>
                {dailyRevenue.map((day, index) => (
                  <View key={day.period} style={styles.chartBar}>
                    <View style={styles.chartBarContainer}>
                      <View 
                        style={[
                          styles.chartBarFill, 
                          { height: `${(day.revenue / maxDailyRevenue) * 100}%` }
                        ]} 
                      />
                    </View>
                    <Text style={styles.chartLabel}>
                      {new Date(day.period).getDate()}/{new Date(day.period).getMonth() + 1}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          )}
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Check-in hôm nay</Text>
            <TouchableOpacity style={styles.seeAllBtn}>
              <Text style={styles.seeAllText}>Xem tất cả</Text>
              <ChevronRight size={16} color={Colors.light.tint} />
            </TouchableOpacity>
          </View>
          {todayCheckIns.length > 0 ? (
            todayCheckIns.slice(0, 3).map((booking) => (
              <View key={booking.id} style={styles.bookingCard}>
                <View style={styles.bookingInfo}>
                  <View style={styles.roomBadge}>
                    <BedDouble size={14} color="#fff" />
                    <Text style={styles.roomBadgeText}>{booking.roomNumber}</Text>
                  </View>
                  <View style={styles.bookingDetails}>
                    <Text style={styles.guestName}>{booking.guestName}</Text>
                    <Text style={styles.bookingMeta}>
                      {booking.adults} người lớn • {booking.checkIn} - {booking.checkOut}
                    </Text>
                  </View>
                </View>
                <TouchableOpacity style={styles.checkInBtn}>
                  <Text style={styles.checkInBtnText}>Check-in</Text>
                </TouchableOpacity>
              </View>
            ))
          ) : (
            <View style={styles.emptyState}>
              <AlertCircle size={20} color={Colors.light.textSecondary} />
              <Text style={styles.emptyText}>Không có check-in hôm nay</Text>
            </View>
          )}
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Check-out hôm nay</Text>
            <TouchableOpacity style={styles.seeAllBtn}>
              <Text style={styles.seeAllText}>Xem tất cả</Text>
              <ChevronRight size={16} color={Colors.light.tint} />
            </TouchableOpacity>
          </View>
          {todayCheckOuts.length > 0 ? (
            todayCheckOuts.slice(0, 3).map((booking) => (
              <View key={booking.id} style={styles.bookingCard}>
                <View style={styles.bookingInfo}>
                  <View style={[styles.roomBadge, { backgroundColor: Colors.status.cleaning }]}>
                    <BedDouble size={14} color="#fff" />
                    <Text style={styles.roomBadgeText}>{booking.roomNumber}</Text>
                  </View>
                  <View style={styles.bookingDetails}>
                    <Text style={styles.guestName}>{booking.guestName}</Text>
                    <Text style={styles.bookingMeta}>
                      Còn nợ: {formatFullCurrency(booking.totalAmount - booking.paidAmount)}
                    </Text>
                  </View>
                </View>
                <TouchableOpacity style={[styles.checkInBtn, { backgroundColor: Colors.status.cleaning }]}>
                  <Text style={styles.checkInBtnText}>Check-out</Text>
                </TouchableOpacity>
              </View>
            ))
          ) : (
            <View style={styles.emptyState}>
              <AlertCircle size={20} color={Colors.light.textSecondary} />
              <Text style={styles.emptyText}>Không có check-out hôm nay</Text>
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
          style={styles.modalOverlay}
          onPress={() => setHotelModalVisible(false)}
        >
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Chọn khách sạn</Text>
            <ScrollView style={styles.hotelList}>
              {hotels.map((hotel) => (
                <TouchableOpacity
                  key={hotel.id}
                  style={[
                    styles.hotelItem,
                    selectedHotelId === hotel.id && styles.hotelItemSelected
                  ]}
                  onPress={() => handleSelectHotel(hotel.id)}
                >
                  <Building2 
                    size={20} 
                    color={selectedHotelId === hotel.id ? Colors.light.tint : Colors.light.textSecondary} 
                  />
                  <Text style={[
                    styles.hotelItemText,
                    selectedHotelId === hotel.id && styles.hotelItemTextSelected
                  ]}>
                    {hotel.name}
                  </Text>
                  {selectedHotelId === hotel.id && (
                    <Check size={20} color={Colors.light.tint} />
                  )}
                </TouchableOpacity>
              ))}
              {hotels.length === 0 && (
                <View style={styles.emptyHotels}>
                  <AlertCircle size={24} color={Colors.light.textSecondary} />
                  <Text style={styles.emptyHotelsText}>Chưa có khách sạn nào</Text>
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
  hotelName: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#fff',
    flex: 1,
  },
  dateContainer: {
    alignItems: 'flex-end',
  },
  dateText: {
    fontSize: 16,
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
});
