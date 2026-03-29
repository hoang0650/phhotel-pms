import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  RefreshControl,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Search,
  Calendar,
  User,
  BedDouble,
  Clock,
  CreditCard,
  ChevronRight,
  Plus,
  CheckCircle,
  LogIn,
  LogOut,
  XCircle,
  AlertCircle,
} from 'lucide-react-native';
import { useQuery } from '@tanstack/react-query';
import Colors from '@/constants/colors';
import { bookingsApi } from '@/services/api';
import { Booking, BookingStatus } from '@/types/hotel';
import { useHotel } from '@/contexts/HotelContext';
import { useTheme } from '@/contexts/ThemeContext';

const statusConfig: Record<BookingStatus, { label: string; color: string; icon: typeof CheckCircle }> = {
  confirmed: { label: 'Đã xác nhận', color: Colors.booking.confirmed, icon: CheckCircle },
  checked_in: { label: 'Đã nhận phòng', color: Colors.booking.checked_in, icon: LogIn },
  checked_out: { label: 'Đã trả phòng', color: Colors.booking.checked_out, icon: LogOut },
  cancelled: { label: 'Đã hủy', color: Colors.booking.cancelled, icon: XCircle },
};

export default function BookingsScreen() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const isSmallScreen = width < 380;
  const { selectedHotelId, selectedHotel } = useHotel();
  const { isDark, colors } = useTheme();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<BookingStatus | 'all'>('all');

  const { data: bookings = [], isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['bookings', selectedHotelId],
    queryFn: () => selectedHotelId ? bookingsApi.getByHotel(selectedHotelId) : bookingsApi.getAll(),
  });

  const normalizedSearchQuery = searchQuery.trim().toLowerCase();
  const filteredBookings = useMemo(() => {
    return bookings.filter((booking) => {
      const roomNumber = String(booking.roomNumber || '');
      const matchesSearch =
        booking.guestName.toLowerCase().includes(normalizedSearchQuery) ||
        roomNumber.toLowerCase().includes(normalizedSearchQuery);
      const matchesFilter = selectedFilter === 'all' || booking.status === selectedFilter;
      return matchesSearch && matchesFilter;
    });
  }, [bookings, normalizedSearchQuery, selectedFilter]);

  const bookingStats = useMemo(() => {
    return filteredBookings.reduce(
      (acc, booking) => {
        const totalAmount = Number(booking.totalAmount) || 0;
        const paidAmount = Number(booking.paidAmount) || 0;
        acc.totalRevenue += totalAmount;
        if (paidAmount >= totalAmount && totalAmount > 0) {
          acc.paidCount += 1;
        } else {
          acc.unpaidCount += 1;
        }
        if (booking.status === 'checked_in') {
          acc.checkedInCount += 1;
        }
        return acc;
      },
      { totalRevenue: 0, paidCount: 0, unpaidCount: 0, checkedInCount: 0 }
    );
  }, [filteredBookings]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const calculateNights = (checkIn: string, checkOut: string) => {
    const start = new Date(checkIn);
    const end = new Date(checkOut);
    const nights = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    return nights > 0 ? nights : 1;
  };

  const formatDate = (value: string) => {
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      return value;
    }
    return parsed.toLocaleDateString('vi-VN');
  };

  const renderBookingCard = (booking: Booking) => {
    const status = statusConfig[booking.status];
    const StatusIcon = status.icon;
    const nights = calculateNights(booking.checkIn, booking.checkOut);
    const isPaid = Number(booking.paidAmount) >= Number(booking.totalAmount);
    const remainingAmount = Math.max((Number(booking.totalAmount) || 0) - (Number(booking.paidAmount) || 0), 0);

    return (
      <TouchableOpacity key={booking.id} style={[styles.bookingCard, { backgroundColor: isDark ? colors.cardBackground : '#fff' }]} activeOpacity={0.7}>
        <View style={styles.cardHeader}>
          <View style={styles.bookingIdContainer}>
            <Text style={[styles.bookingId, { color: colors.textSecondary }]}>#{booking.id.slice(-6).toUpperCase()}</Text>
            <View style={[styles.statusBadge, { backgroundColor: status.color + '15' }]}>
              <StatusIcon size={12} color={status.color} />
              <Text style={[styles.statusText, { color: status.color }]}>{status.label}</Text>
            </View>
          </View>
          <ChevronRight size={20} color={colors.textSecondary} />
        </View>

        <View style={styles.guestRow}>
          <View style={[styles.guestAvatar, { backgroundColor: colors.tint }]}>
            <User size={18} color="#fff" />
          </View>
          <View style={styles.guestInfo}>
            <Text style={[styles.guestName, { color: colors.text }]}>{booking.guestName}</Text>
            <Text style={[styles.guestMeta, { color: colors.textSecondary }]}>
              {Number(booking.adults) || 1} người lớn{Number(booking.children) > 0 ? ` • ${Number(booking.children)} trẻ em` : ''}
            </Text>
          </View>
        </View>

        <View style={styles.detailsRow}>
          {booking.roomNumber && (
            <View style={styles.detailItem}>
              <BedDouble size={16} color={colors.tint} />
              <Text style={[styles.detailText, { color: colors.text }]}>Phòng {booking.roomNumber}</Text>
            </View>
          )}
          <View style={styles.detailItem}>
            <Clock size={16} color={colors.textSecondary} />
            <Text style={[styles.detailText, { color: colors.text }]}>{nights} đêm</Text>
          </View>
        </View>

        <View style={[styles.dateRow, { backgroundColor: isDark ? colors.background : Colors.light.background }]}>
          <View style={styles.dateItem}>
            <Text style={[styles.dateLabel, { color: colors.textSecondary }]}>Nhận phòng</Text>
            <Text style={[styles.dateValue, { color: colors.text }]}>{formatDate(booking.checkIn)}</Text>
          </View>
          <View style={styles.dateArrow}>
            <ChevronRight size={16} color={colors.textSecondary} />
          </View>
          <View style={[styles.dateItem, { alignItems: 'flex-end' }]}>
            <Text style={[styles.dateLabel, { color: colors.textSecondary }]}>Trả phòng</Text>
            <Text style={[styles.dateValue, { color: colors.text }]}>{formatDate(booking.checkOut)}</Text>
          </View>
        </View>

        <View style={styles.paymentRow}>
          <View style={styles.paymentInfo}>
            <CreditCard size={16} color={colors.textSecondary} />
            <View>
              <Text style={[styles.totalAmount, { color: colors.text }]}>{formatCurrency(booking.totalAmount)}</Text>
              {!isPaid && (
                <Text style={styles.remainingText}>Còn thiếu {formatCurrency(remainingAmount)}</Text>
              )}
            </View>
          </View>
          <View style={[styles.paymentBadge, { backgroundColor: isPaid ? (isDark ? '#052e16' : '#dcfce7') : (isDark ? '#451a03' : '#fef3c7') }]}>
            <Text style={[styles.paymentStatus, { color: isPaid ? Colors.status.available : Colors.status.cleaning }]}>
              {isPaid ? 'Đã thanh toán' : 'Chưa thanh toán'}
            </Text>
          </View>
        </View>

        {booking.specialRequests && (
          <View style={[styles.specialRequest, { borderTopColor: colors.border }]}>
            <Text style={[styles.specialRequestLabel, { color: colors.textSecondary }]}>Yêu cầu đặc biệt:</Text>
            <Text style={[styles.specialRequestText, { color: colors.text }]}>{booking.specialRequests}</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  if (isLoading && bookings.length === 0) {
    return (
      <View style={[styles.container, styles.loadingContainer, { paddingTop: insets.top, backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.tint} />
        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Đang tải danh sách đặt phòng...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <LinearGradient
        colors={['#0f766e', '#14b8a6']}
        style={[styles.header, { paddingTop: insets.top + 12 }]}
      >
        <View style={styles.headerTop}>
          <View style={styles.headerLeft}>
            <Text style={[styles.title, { color: '#fff' }]}>Đặt phòng</Text>
            <Text style={[styles.subtitle, { color: 'rgba(255,255,255,0.8)' }]}>{filteredBookings.length}/{bookings.length} booking</Text>
            <View style={[styles.hotelBadge, { backgroundColor: 'rgba(255,255,255,0.2)', borderColor: 'rgba(255,255,255,0.3)' }]}>
              <Text style={[styles.hotelBadgeText, { color: '#fff' }]}>{selectedHotel?.name || 'Tất cả khách sạn'}</Text>
            </View>
          </View>
          <TouchableOpacity style={[styles.addButton, { backgroundColor: 'rgba(255,255,255,0.2)', shadowColor: 'transparent' }]}>
            <Plus size={20} color="#fff" />
          </TouchableOpacity>
        </View>

        <View style={styles.searchContainer}>
          <View style={[styles.searchBox, { backgroundColor: 'rgba(255,255,255,0.15)', shadowOpacity: 0 }]}>
            <Search size={18} color="rgba(255,255,255,0.7)" />
            <TextInput
              style={[styles.searchInput, { color: '#fff' }]}
              placeholder="Tìm khách hoặc phòng..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholderTextColor="rgba(255,255,255,0.5)"
            />
          </View>
        </View>
      </LinearGradient>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.statsScroll}
        contentContainerStyle={styles.statsContent}
      >
        <View style={[styles.statCard, isSmallScreen && styles.statCardCompact, { backgroundColor: colors.cardBackground }]}>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Doanh thu</Text>
          <Text style={[styles.statValue, { color: colors.text }]}>{formatCurrency(bookingStats.totalRevenue)}</Text>
        </View>
        <View style={[styles.statCard, isSmallScreen && styles.statCardCompact, { backgroundColor: colors.cardBackground }]}>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Đang ở</Text>
          <Text style={[styles.statValue, { color: colors.text }]}>{bookingStats.checkedInCount}</Text>
        </View>
        <View style={[styles.statCard, isSmallScreen && styles.statCardCompact, { backgroundColor: colors.cardBackground }]}>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Đã thanh toán</Text>
          <Text style={[styles.statValue, { color: Colors.status.available }]}>{bookingStats.paidCount}</Text>
        </View>
        <View style={[styles.statCard, isSmallScreen && styles.statCardCompact, { backgroundColor: colors.cardBackground }]}>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Chưa thanh toán</Text>
          <Text style={[styles.statValue, { color: Colors.status.cleaning }]}>{bookingStats.unpaidCount}</Text>
        </View>
      </ScrollView>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterContainer}
        contentContainerStyle={styles.filterContent}
      >
        <TouchableOpacity
          style={[styles.filterChip, { backgroundColor: selectedFilter === 'all' ? colors.tint : colors.cardBackground }, selectedFilter === 'all' && styles.filterChipActive]}
          onPress={() => setSelectedFilter('all')}
        >
          <Text style={[styles.filterChipText, { color: selectedFilter === 'all' ? '#fff' : colors.textSecondary }]}>
            Tất cả
          </Text>
        </TouchableOpacity>
        {(Object.keys(statusConfig) as BookingStatus[]).map((status) => (
          <TouchableOpacity
            key={status}
            style={[
              styles.filterChip,
              { backgroundColor: selectedFilter === status ? statusConfig[status].color : colors.cardBackground },
            ]}
            onPress={() => setSelectedFilter(status)}
          >
            <Text
              style={[
                styles.filterChipText,
                { color: selectedFilter === status ? '#fff' : colors.textSecondary },
              ]}
            >
              {statusConfig[status].label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView
        style={styles.bookingsList}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.bookingsListContent}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.tint} />
        }
      >
        {filteredBookings.map(renderBookingCard)}
        {filteredBookings.length === 0 && (
          <View style={[styles.emptyStateCard, { backgroundColor: colors.cardBackground }]}>
            <View style={styles.emptyState}>
            {bookings.length === 0 ? (
              <>
                <AlertCircle size={48} color={colors.textSecondary} />
                <Text style={[styles.emptyText, { color: colors.textSecondary }]}>Chưa có dữ liệu đặt phòng</Text>
                <Text style={[styles.emptySubtext, { color: colors.textSecondary }]}>Kiểm tra kết nối API</Text>
              </>
            ) : (
              <>
                <Calendar size={48} color={colors.textSecondary} />
                <Text style={[styles.emptyText, { color: colors.textSecondary }]}>Không tìm thấy booking</Text>
                <Text style={[styles.emptySubtext, { color: colors.textSecondary }]}>Thử đổi bộ lọc hoặc từ khóa tìm kiếm</Text>
              </>
            )}
          </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
  },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  headerLeft: {
    flex: 1,
    paddingRight: 12,
  },
  title: {
    fontSize: 28,
    fontWeight: '700' as const,
  },
  subtitle: {
    fontSize: 14,
    marginTop: 4,
  },
  hotelBadge: {
    alignSelf: 'flex-start',
    marginTop: 8,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  hotelBadgeText: {
    fontSize: 12,
    fontWeight: '500' as const,
  },
  addButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchContainer: {
    marginBottom: 0,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
  },
  statsScroll: {
    maxHeight: 92,
    marginTop: 12,
    marginBottom: 10,
  },
  statsContent: {
    paddingHorizontal: 20,
    gap: 10,
  },
  statCard: {
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    minWidth: 140,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  statCardCompact: {
    minWidth: 120,
  },
  statLabel: {
    fontSize: 12,
  },
  statValue: {
    marginTop: 4,
    fontSize: 18,
    fontWeight: '700' as const,
  },
  filterContainer: {
    maxHeight: 50,
    marginBottom: 10,
  },
  filterContent: {
    paddingHorizontal: 20,
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  filterChipActive: {},
  filterChipText: {
    fontSize: 13,
    fontWeight: '500' as const,
  },
  filterChipTextActive: {
    color: '#fff',
  },
  bookingsList: {
    flex: 1,
  },
  bookingsListContent: {
    paddingHorizontal: 20,
    paddingBottom: 100,
  },
  bookingCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  bookingIdContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  bookingId: {
    fontSize: 14,
    fontWeight: '600' as const,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    gap: 4,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600' as const,
  },
  guestRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
    gap: 12,
  },
  guestAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  guestInfo: {
    flex: 1,
  },
  guestName: {
    fontSize: 16,
    fontWeight: '600' as const,
  },
  guestMeta: {
    fontSize: 13,
    marginTop: 2,
  },
  detailsRow: {
    flexDirection: 'row',
    gap: 20,
    marginBottom: 14,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  detailText: {
    fontSize: 13,
    fontWeight: '500' as const,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 10,
    marginBottom: 14,
  },
  dateItem: {
    flex: 1,
  },
  dateLabel: {
    fontSize: 11,
    marginBottom: 2,
  },
  dateValue: {
    fontSize: 14,
    fontWeight: '600' as const,
  },
  dateArrow: {
    paddingHorizontal: 12,
  },
  paymentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  paymentInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  totalAmount: {
    fontSize: 16,
    fontWeight: '700' as const,
  },
  paymentBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  paymentStatus: {
    fontSize: 11,
    fontWeight: '600' as const,
  },
  remainingText: {
    marginTop: 2,
    fontSize: 12,
    color: Colors.status.cleaning,
    fontWeight: '500' as const,
  },
  specialRequest: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  specialRequestLabel: {
    fontSize: 11,
    marginBottom: 4,
  },
  specialRequestText: {
    fontSize: 13,
    fontStyle: 'italic' as const,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    gap: 12,
  },
  emptyStateCard: {
    marginTop: 8,
    borderRadius: 16,
    paddingHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  emptyText: {
    fontSize: 16,
  },
  emptySubtext: {
    fontSize: 13,
  },
});
