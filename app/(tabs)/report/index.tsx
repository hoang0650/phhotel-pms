import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  BedDouble,
  Users,
  Briefcase,
  Calendar,
  ChevronDown,
  BarChart3,
  PieChart,
  CreditCard,
  Landmark,
  Wallet,
  MinusCircle,
  CheckCircle,
} from 'lucide-react-native';
import { useHotel } from '@/contexts/HotelContext';
import { useTheme } from '@/contexts/ThemeContext';
import { revenueApi, roomsApi, bookingsApi } from '@/services/api';
import { shiftHandoverApi } from '@/services/api/shiftHandover';
import { format, subDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth, differenceInCalendarDays } from 'date-fns';
import { ShiftHandover } from '@/types/shift-handover';

type PeriodType = 'day' | 'week' | 'month' | 'year';

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

export default function ReportScreen() {
  const insets = useSafeAreaInsets();
  const { selectedHotel, selectedHotelId } = useHotel();
  const { isDark, colors } = useTheme();
  const [period, setPeriod] = useState<PeriodType>('day');

  const { data: revenueData, isLoading, refetch } = useQuery({
    queryKey: ['revenue', selectedHotelId, period],
    queryFn: async () => {
      const today = new Date();
      let startDate, endDate;

      switch (period) {
        case 'day':
          startDate = subDays(today, 6);
          endDate = today;
          break;
        case 'week':
          startDate = subDays(today, 27);
          endDate = today;
          break;
        case 'month':
          startDate = subDays(today, 364);
          endDate = today;
          break;
        case 'year':
           startDate = subDays(today, 364);
           endDate = today;
          break;
        default:
          startDate = subDays(today, 6);
          endDate = today;
      }
      
      return revenueApi.getRevenueByPeriod({
        hotelId: selectedHotelId || '',
        period: period,
        startDate: startDate.toISOString().split('T')[0],
        endDate: today.toISOString().split('T')[0]
      });
    },
    enabled: !!selectedHotelId,
  });
  
  const { data: breakdownRange } = useQuery({
    queryKey: ['revenueBreakdownRange', selectedHotelId, period],
    queryFn: async () => {
      const today = new Date();
      let startDate, endDate;
      switch (period) {
        case 'day':
          startDate = subDays(today, 6);
          endDate = today;
          break;
        case 'week':
          startDate = subDays(today, 27);
          endDate = today;
          break;
        case 'month':
          startDate = subDays(today, 364);
          endDate = today;
          break;
        case 'year':
          startDate = subDays(today, 364);
          endDate = today;
          break;
        default:
          startDate = subDays(today, 6);
          endDate = today;
      }
      return revenueApi.getRevenueByRange(
        selectedHotelId || '',
        startDate.toISOString().split('T')[0],
        endDate.toISOString().split('T')[0]
      );
    },
    enabled: !!selectedHotelId,
  });
  
  const { data: weeklyData, refetch: refetchWeeklyData } = useQuery({
    queryKey: ['revenueWeekly', selectedHotelId],
    queryFn: async () => {
      const today = new Date();
      const startDate = subDays(today, 27);
      return revenueApi.getRevenueByPeriod({
        hotelId: selectedHotelId || '',
        period: 'week',
        startDate: startDate.toISOString().split('T')[0],
        endDate: today.toISOString().split('T')[0],
      });
    },
    enabled: !!selectedHotelId,
  });
  
  const { data: monthlyData, refetch: refetchMonthlyData } = useQuery({
    queryKey: ['revenueMonthly', selectedHotelId],
    queryFn: async () => {
      const today = new Date();
      const startDate = subDays(today, 364);
      return revenueApi.getRevenueByPeriod({
        hotelId: selectedHotelId || '',
        period: 'month',
        startDate: startDate.toISOString().split('T')[0],
        endDate: today.toISOString().split('T')[0],
      });
    },
    enabled: !!selectedHotelId,
  });
  
  const { data: paymentBreakdown } = useQuery({
    queryKey: ['revenuePaymentBreakdown', selectedHotelId, period],
    queryFn: async () => {
      const today = new Date();
      let startDate, endDate;
      switch (period) {
        case 'day':
          startDate = subDays(today, 6);
          endDate = today;
          break;
        case 'week':
          startDate = subDays(today, 27);
          endDate = today;
          break;
        case 'month':
          startDate = subDays(today, 364);
          endDate = today;
          break;
        case 'year':
          startDate = subDays(today, 364);
          endDate = today;
          break;
        default:
          startDate = subDays(today, 6);
          endDate = today;
      }
      return shiftHandoverApi.getRevenue(
        selectedHotelId || '',
        startDate.toISOString().split('T')[0],
        endDate.toISOString().split('T')[0]
      );
    },
    enabled: !!selectedHotelId,
  });

  const totalRevenue = revenueData?.totalRevenue || 0;
  const totalExpense = revenueData?.totalExpense || 0;
  const profit = totalRevenue - totalExpense;

  const { data: rooms = [] } = useQuery({
    queryKey: ['rooms', selectedHotelId],
    queryFn: () => roomsApi.getAll(selectedHotelId || ''),
    enabled: !!selectedHotelId,
  });

  const { data: bookings = [] } = useQuery({
    queryKey: ['bookings', selectedHotelId],
    queryFn: () => (selectedHotelId ? bookingsApi.getByHotel(selectedHotelId) : bookingsApi.getAll()),
    enabled: !!selectedHotelId,
  });

  const computedStats = useMemo(() => {
    const today = new Date();
    let startDate: Date;
    let endDate: Date = today;
    switch (period) {
      case 'day':
        startDate = subDays(today, 6);
        break;
      case 'week':
        startDate = subDays(today, 27);
        break;
      case 'month':
      case 'year':
        startDate = subDays(today, 364);
        break;
      default:
        startDate = subDays(today, 6);
    }

    const startStr = startDate.toISOString().split('T')[0];
    const endStr = endDate.toISOString().split('T')[0];
    const daysInRange = Math.max(1, differenceInCalendarDays(endDate, startDate) + 1);

    const bookingsInRange = bookings.filter(b => {
      const ci = new Date(b.checkIn);
      const co = new Date(b.checkOut);
      // overlap check: booking intersects [startDate, endDate]
      return ci <= endDate && co >= startDate;
    });

    const totalBookings = bookingsInRange.length;

    const uniqueGuests = new Set<string>();
    let fallbackGuestCount = 0;
    bookingsInRange.forEach(b => {
      if (b.guestId) uniqueGuests.add(b.guestId);
      fallbackGuestCount += (Number(b.adults || 0) + Number(b.children || 0));
    });
    const totalGuests = uniqueGuests.size > 0 ? uniqueGuests.size : fallbackGuestCount;

    let occupiedNights = 0;
    let paidAmountSum = 0;
    bookingsInRange.forEach(b => {
      const ci = new Date(b.checkIn);
      const co = new Date(b.checkOut);
      const overlapStart = ci > startDate ? ci : startDate;
      const overlapEnd = co < endDate ? co : endDate;
      if (overlapEnd >= overlapStart) {
        const nights = Math.max(1, differenceInCalendarDays(overlapEnd, overlapStart));
        occupiedNights += nights;
        paidAmountSum += Number(b.paidAmount || 0);
      }
    });

    const totalRooms = rooms.length || 0;
    const occupancyRate = totalRooms > 0 && daysInRange > 0
      ? Math.round((occupiedNights / (totalRooms * daysInRange)) * 100)
      : 0;

    const averageRoomRate = occupiedNights > 0
      ? Math.round(paidAmountSum / occupiedNights)
      : Math.round((paidAmountSum || 0) / Math.max(1, totalBookings));

    return { totalBookings, totalGuests, occupancyRate, averageRoomRate };
  }, [bookings, rooms, period]);


  const handleRefresh = async () => {
    await Promise.all([refetch(), refetchWeeklyData(), refetchMonthlyData()]);
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

  const revenueGrowth = useMemo(() => {
    if (!revenueData?.revenueData || revenueData.revenueData.length < 2) return 0;
    const lastValue = revenueData.revenueData[revenueData.revenueData.length - 1];
    const prevValue = revenueData.revenueData[revenueData.revenueData.length - 2];
    if (prevValue === 0) return lastValue > 0 ? 100 : 0;
    return Math.round(((lastValue - prevValue) / prevValue) * 100);
  }, [revenueData]);
  
  const isPositiveGrowth = revenueGrowth >= 0;

  const maxChartValue = useMemo(() => 
    revenueData?.revenueData ? Math.max(...revenueData.revenueData, 1) : 1
  , [revenueData]);

  const periodOptions: { key: PeriodType; label: string }[] = [
    { key: 'day', label: 'Ngày' },
    { key: 'week', label: 'Tuần' },
    { key: 'month', label: 'Tháng' },
    { key: 'year', label: 'Năm' },
  ];

  const todayRevenue = useMemo(() => {
    if (!revenueData?.revenueData || period !== 'day') return 0;
    return revenueData.revenueData[revenueData.revenueData.length - 1] || 0;
  }, [revenueData, period]);

  const weeklyRevenue = useMemo(() => {
    if (!weeklyData?.revenueData || weeklyData.revenueData.length === 0) return 0;
    return weeklyData.revenueData[weeklyData.revenueData.length - 1] || 0;
  }, [weeklyData]);

  const monthlyRevenue = useMemo(() => {
    if (!monthlyData?.revenueData || monthlyData.revenueData.length === 0) return 0;
    return monthlyData.revenueData[monthlyData.revenueData.length - 1] || 0;
  }, [monthlyData]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <LinearGradient
        colors={isDark ? ['#0f766e', '#14b8a6'] : ['#14b8a6', '#0d9488']}
        style={[styles.header, { paddingTop: insets.top + 12 }]}
      >
        <View style={styles.headerContent}>
          <View>
            <Text style={styles.headerTitle}>Báo cáo</Text>
            <Text style={styles.hotelName}>{selectedHotel?.name || 'Tất cả khách sạn'}</Text>
          </View>
          <View style={[styles.growthBadge, { backgroundColor: isPositiveGrowth ? '#10b98120' : '#ef444420'}]}>
            {isPositiveGrowth ? (
              <TrendingUp size={16} color="#10b981" />
            ) : (
              <TrendingDown size={16} color="#ef4444" />
            )}
            <Text style={[styles.growthText, { color: isPositiveGrowth ? '#10b981' : '#ef4444' }]}>
              {isPositiveGrowth ? '+' : ''}{revenueGrowth.toFixed(1)}%
            </Text>
          </View>
        </View>
      </LinearGradient>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 }}
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={handleRefresh} tintColor={colors.tint} />
        }
      >
        {isLoading && !revenueData ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.tint} />
          </View>
        ) : (
          <>
            <View style={[styles.periodSelector, { backgroundColor: colors.cardBackground }]}>
              {periodOptions.map((option) => (
                <TouchableOpacity
                  key={option.key}
                  style={[
                    styles.periodOption,
                    period === option.key && [styles.periodOptionActive, { backgroundColor: colors.tint }],
                  ]}
                  onPress={() => setPeriod(option.key)}
                >
                  <Text
                    style={[
                      styles.periodOptionText,
                      { color: colors.textSecondary },
                      period === option.key && styles.periodOptionTextActive,
                    ]}
                  >
                    {option.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={styles.summaryCards}>
              <LinearGradient
                colors={isDark ? ['#0f766e', '#0d9488'] : ['#14b8a6', '#0d9488']}
                style={styles.mainRevenueCard}
              >
                <View style={styles.mainRevenueIcon}>
                  <DollarSign size={24} color="#fff" />
                </View>
                <Text style={styles.mainRevenueLabel}>Tổng doanh thu</Text>
                <Text style={styles.mainRevenueValue}>
                  {formatCurrency(totalRevenue)}
                </Text>
              </LinearGradient>

              <View style={styles.secondaryCards}>
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => setPeriod('week')}
                  style={[styles.secondaryCard, { backgroundColor: colors.cardBackground }]}
                >
                  <Calendar size={20} color="#6366f1" />
                  <Text style={[styles.secondaryLabel, { color: colors.textSecondary }]}>Tuần này</Text>
                  <Text style={[styles.secondaryValue, { color: colors.text }]}>
                    {formatCurrency(weeklyRevenue)}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => setPeriod('month')}
                  style={[styles.secondaryCard, { backgroundColor: colors.cardBackground }]}
                >
                  <Calendar size={20} color="#f59e0b" />
                  <Text style={[styles.secondaryLabel, { color: colors.textSecondary }]}>Tháng này</Text>
                  <Text style={[styles.secondaryValue, { color: colors.text }]}>
                    {formatCurrency(monthlyRevenue)}
                  </Text>
                </TouchableOpacity>
                <View style={[styles.secondaryCard, { backgroundColor: colors.cardBackground }]}>
                  <MinusCircle size={20} color="#ef4444" />
                  <Text style={[styles.secondaryLabel, { color: colors.textSecondary }]}>Tổng chi phí</Text>
                  <Text style={[styles.secondaryValue, { color: colors.text }]}>
                    {formatCurrency(totalExpense)}
                  </Text>
                </View>
                <View style={[styles.secondaryCard, { backgroundColor: colors.cardBackground }]}>
                  <CheckCircle size={20} color={profit >= 0 ? '#22c55e' : '#ef4444'} />
                  <Text style={[styles.secondaryLabel, { color: colors.textSecondary }]}>Lợi nhuận</Text>
                  <Text style={[styles.secondaryValue, { color: colors.text }]}>
                    {formatCurrency(profit)}
                  </Text>
                </View>
              </View>
            </View>

            <View style={styles.breakdownSection}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Phân loại doanh thu</Text>
              <View style={styles.breakdownCards}>
                <View style={[styles.breakdownCard, { backgroundColor: colors.cardBackground }]}>
                  <View style={[styles.breakdownIcon, { backgroundColor: isDark ? '#052e16' : '#ecfdf5' }]}>
                    <BedDouble size={20} color="#0d9488" />
                  </View>
                  <View style={styles.breakdownInfo}>
                    <Text style={[styles.breakdownLabel, { color: colors.textSecondary }]}>Doanh thu phòng</Text>
                    <Text style={[styles.breakdownValue, { color: colors.text }]}>
                      {formatCurrency(breakdownRange?.roomRevenue || 0)}
                    </Text>
                  </View>
                </View>
                <View style={[styles.breakdownCard, { backgroundColor: colors.cardBackground }]}>
                  <View style={[styles.breakdownIcon, { backgroundColor: isDark ? '#422006' : '#fef3c7' }]}>
                    <Briefcase size={20} color="#f59e0b" />
                  </View>
                  <View style={styles.breakdownInfo}>
                    <Text style={[styles.breakdownLabel, { color: colors.textSecondary }]}>Doanh thu dịch vụ</Text>
                    <Text style={[styles.breakdownValue, { color: colors.text }]}>
                      {formatCurrency(breakdownRange?.serviceRevenue || 0)}
                    </Text>
                  </View>
                </View>
              </View>
            </View>

            <View style={styles.breakdownSection}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Doanh thu theo thanh toán</Text>
              <View style={styles.breakdownCards}>
                <View style={[styles.breakdownCard, { backgroundColor: colors.cardBackground }]}>
                  <View style={[styles.breakdownIcon, { backgroundColor: isDark ? '#1f2937' : '#f3f4f6' }]}>
                    <Wallet size={20} color="#4b5563" />
                  </View>
                  <View style={styles.breakdownInfo}>
                    <Text style={[styles.breakdownLabel, { color: colors.textSecondary }]}>Tiền mặt</Text>
                    <Text style={[styles.breakdownValue, { color: colors.text }]}>
                      {formatCurrency(paymentBreakdown?.cashTotal || 0)}
                    </Text>
                  </View>
                </View>
                <View style={[styles.breakdownCard, { backgroundColor: colors.cardBackground }]}>
                  <View style={[styles.breakdownIcon, { backgroundColor: isDark ? '#1e293b' : '#e0e7ff' }]}>
                    <Landmark size={20} color="#4f46e5" />
                  </View>
                  <View style={styles.breakdownInfo}>
                    <Text style={[styles.breakdownLabel, { color: colors.textSecondary }]}>Chuyển khoản</Text>
                    <Text style={[styles.breakdownValue, { color: colors.text }]}>
                      {formatCurrency(paymentBreakdown?.bankTransferTotal || 0)}
                    </Text>
                  </View>
                </View>
                <View style={[styles.breakdownCard, { backgroundColor: colors.cardBackground }]}>
                  <View style={[styles.breakdownIcon, { backgroundColor: isDark ? '#312e81' : '#eef2ff' }]}>
                    <CreditCard size={20} color="#6366f1" />
                  </View>
                  <View style={styles.breakdownInfo}>
                    <Text style={[styles.breakdownLabel, { color: colors.textSecondary }]}>Thẻ</Text>
                    <Text style={[styles.breakdownValue, { color: colors.text }]}>
                      {formatCurrency(paymentBreakdown?.cardTotal || 0)}
                    </Text>
                  </View>
                </View>
              </View>
            </View>

            

            <View style={styles.chartSection}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Biểu đồ doanh thu</Text>
              
              {revenueData?.revenueData && revenueData.revenueData.length > 0 ? (
                <View style={[styles.chartContainer, { backgroundColor: colors.cardBackground }]}>
                  <View style={styles.chart}>
                    {revenueData.revenueData.map((value, index) => {
                      let label = '';
                      const rawLabel = revenueData.labels?.[index];
                      if (rawLabel) {
                        const parts = String(rawLabel).split('-');
                        if (period === 'day') {
                          if (parts.length === 3) {
                            label = `${parts[2]}/${parts[1]}`;
                          } else {
                            const d = new Date(rawLabel);
                            label = !isNaN(d.getTime())
                              ? `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`
                              : String(rawLabel);
                          }
                        } else if (period === 'week') {
                          label = `W${index + 1}`;
                        } else if (period === 'month') {
                          if (parts.length >= 2) {
                            label = `T${parts[1]}`;
                          } else {
                            const d = new Date(rawLabel);
                            label = !isNaN(d.getTime())
                              ? `T${String(d.getMonth() + 1).padStart(2, '0')}`
                              : String(rawLabel);
                          }
                        } else if (period === 'year') {
                          label = parts[0] || String(rawLabel);
                        }
                      }

                      return (
                        <View key={index} style={styles.chartBar}>
                          <View style={[styles.chartBarContainer, { backgroundColor: isDark ? colors.border : '#f0f9ff' }]}>
                            <View
                              style={[
                                styles.chartBarFill,
                                { height: `${(value / maxChartValue) * 100}%`, backgroundColor: colors.tint },
                              ]}
                            />
                          </View>
                          <Text style={[styles.chartValue, { color: colors.text }]}>
                            {formatCurrency(value)}
                          </Text>
                          <Text style={[styles.chartLabel, { color: colors.textSecondary }]}>
                            {label}
                          </Text>
                        </View>
                      );
                    })}
                  </View>
                </View>
              ) : (
                <View style={[styles.emptyChart, { backgroundColor: colors.cardBackground }]}>
                  <Text style={[styles.emptyChartText, { color: colors.textSecondary }]}>Chưa có dữ liệu</Text>
                </View>
              )}
            </View>

            <View style={styles.statsSection}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Thống kê tổng quan</Text>
              <View style={styles.statsGrid}>
                <View style={[styles.statItem, { backgroundColor: colors.cardBackground }]}>
                  <Text style={[styles.statValue, { color: colors.text }]}>{computedStats.totalBookings || 0}</Text>
                  <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Đặt phòng</Text>
                </View>
                <View style={[styles.statItem, { backgroundColor: colors.cardBackground }]}>
                  <Text style={[styles.statValue, { color: colors.text }]}>{computedStats.totalGuests || 0}</Text>
                  <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Khách hàng</Text>
                </View>
                <View style={[styles.statItem, { backgroundColor: colors.cardBackground }]}>
                  <Text style={[styles.statValue, { color: colors.text }]}>{computedStats.occupancyRate || 0}%</Text>
                  <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Tỷ lệ lấp đầy</Text>
                </View>
                <View style={[styles.statItem, { backgroundColor: colors.cardBackground }]}>
                  <Text style={[styles.statValue, { color: colors.text }]}>{formatCurrency(computedStats.averageRoomRate || 0)}</Text>
                  <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Giá TB/đêm</Text>
                </View>
              </View>
            </View>
          </>
        )}
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
    paddingBottom: 20,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700' as const,
    color: '#fff',
  },
  hotelName: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 2,
  },
  growthBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 4,
  },
  growthText: {
    fontSize: 14,
    fontWeight: '600' as const,
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
  },
  summaryCards: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  mainRevenueCard: {
    flex: 1.2,
    padding: 16,
    borderRadius: 16,
    minHeight: 140,
  },
  mainRevenueIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  mainRevenueLabel: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.8)',
  },
  mainRevenueValue: {
    fontSize: 22,
    fontWeight: '700' as const,
    color: '#fff',
    marginTop: 4,
  },
  secondaryCards: {
    flex: 1,
    gap: 12,
  },
  secondaryCard: {
    flex: 1,
    borderRadius: 12,
    padding: 12,
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  secondaryLabel: {
    fontSize: 11,
    marginTop: 6,
  },
  secondaryValue: {
    fontSize: 15,
    fontWeight: '700' as const,
    marginTop: 2,
  },
  breakdownSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    marginBottom: 12,
  },
  breakdownCards: {
    gap: 10,
  },
  breakdownCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    padding: 14,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  breakdownIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  breakdownInfo: {
    flex: 1,
  },
  breakdownLabel: {
    fontSize: 13,
  },
  breakdownValue: {
    fontSize: 17,
    fontWeight: '600' as const,
    marginTop: 2,
  },
  periodSelector: {
    flexDirection: 'row',
    borderRadius: 12,
    padding: 4,
    marginBottom: 20,
  },
  periodOption: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
  },
  periodOptionActive: {
  },
  periodOptionText: {
    fontSize: 13,
    fontWeight: '500' as const,
  },
  periodOptionTextActive: {
    color: '#fff',
  },
  chartSection: {
    marginBottom: 20,
  },
  chartContainer: {
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  chart: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: 120,
    gap: 8,
  },
  chartBar: {
    flex: 1,
    alignItems: 'center',
  },
  chartBarContainer: {
    width: '100%',
    height: 100,
    borderRadius: 4,
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  chartBarFill: {
    width: '100%',
    borderRadius: 4,
  },
  chartLabel: {
    fontSize: 10,
    marginTop: 6,
  },
  chartValue: {
    fontSize: 11,
    fontWeight: '600' as const,
    marginTop: 6,
  },
  emptyChart: {
    borderRadius: 16,
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyChartText: {
    fontSize: 14,
  },
  statsSection: {
    marginBottom: 20,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  statItem: {
    width: '48%',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700' as const,
  },
  statLabel: {
    fontSize: 12,
    marginTop: 4,
  },
});
