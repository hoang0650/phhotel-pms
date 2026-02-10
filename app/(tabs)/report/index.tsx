import React, { useState } from 'react';
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
} from 'lucide-react-native';
import Colors from '@/constants/colors';
import { useHotel } from '@/contexts/HotelContext';
import { revenueApi } from '@/services/api';

type PeriodType = 'daily' | 'weekly' | 'monthly' | 'yearly';

export default function ReportScreen() {
  const insets = useSafeAreaInsets();
  const { selectedHotel, selectedHotelId } = useHotel();
  const [period, setPeriod] = useState<PeriodType>('monthly');

  const { data: revenueSummary, isLoading: summaryLoading, refetch: refetchSummary } = useQuery({
    queryKey: ['revenue', 'summary', selectedHotelId],
    queryFn: () => revenueApi.getSummary(selectedHotelId || undefined),
    enabled: true,
  });

  const { data: dailyRevenue = [], isLoading: dailyLoading, refetch: refetchDaily } = useQuery({
    queryKey: ['revenue', 'daily', selectedHotelId],
    queryFn: () => revenueApi.getDaily(selectedHotelId || undefined),
    enabled: true,
  });

  const { data: monthlyRevenue = [], isLoading: monthlyLoading, refetch: refetchMonthly } = useQuery({
    queryKey: ['revenue', 'monthly', selectedHotelId],
    queryFn: () => revenueApi.getMonthly(selectedHotelId || undefined),
    enabled: true,
  });

  const isLoading = summaryLoading || dailyLoading || monthlyLoading;

  const handleRefresh = async () => {
    await Promise.all([refetchSummary(), refetchDaily(), refetchMonthly()]);
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

  const revenueGrowth = revenueSummary?.revenueGrowth || 0;
  const isPositiveGrowth = revenueGrowth >= 0;
  const maxDailyRevenue = Math.max(...dailyRevenue.map(d => d.revenue), 1);
  const maxMonthlyRevenue = Math.max(...monthlyRevenue.map(m => m.revenue), 1);

  const periodOptions: { key: PeriodType; label: string }[] = [
    { key: 'daily', label: 'Ngày' },
    { key: 'weekly', label: 'Tuần' },
    { key: 'monthly', label: 'Tháng' },
    { key: 'yearly', label: 'Năm' },
  ];

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#0f766e', '#14b8a6']}
        style={[styles.header, { paddingTop: insets.top + 12 }]}
      >
        <View style={styles.headerContent}>
          <View>
            <Text style={styles.headerTitle}>Báo cáo</Text>
            <Text style={styles.hotelName}>{selectedHotel?.name || 'Tất cả khách sạn'}</Text>
          </View>
          <View style={styles.growthBadge}>
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
          <RefreshControl refreshing={isLoading} onRefresh={handleRefresh} />
        }
      >
        {isLoading && !revenueSummary ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={Colors.light.tint} />
          </View>
        ) : (
          <>
            <View style={styles.summaryCards}>
              <LinearGradient
                colors={['#0f766e', '#0d9488']}
                style={styles.mainRevenueCard}
              >
                <View style={styles.mainRevenueIcon}>
                  <DollarSign size={24} color="#fff" />
                </View>
                <Text style={styles.mainRevenueLabel}>Doanh thu hôm nay</Text>
                <Text style={styles.mainRevenueValue}>
                  {formatCurrency(revenueSummary?.todayRevenue || 0)}
                </Text>
              </LinearGradient>

              <View style={styles.secondaryCards}>
                <View style={styles.secondaryCard}>
                  <Calendar size={20} color="#6366f1" />
                  <Text style={styles.secondaryLabel}>Tuần này</Text>
                  <Text style={styles.secondaryValue}>
                    {formatCurrency(revenueSummary?.weeklyRevenue || 0)}
                  </Text>
                </View>
                <View style={styles.secondaryCard}>
                  <Calendar size={20} color="#f59e0b" />
                  <Text style={styles.secondaryLabel}>Tháng này</Text>
                  <Text style={styles.secondaryValue}>
                    {formatCurrency(revenueSummary?.monthlyRevenue || 0)}
                  </Text>
                </View>
              </View>
            </View>

            <View style={styles.breakdownSection}>
              <Text style={styles.sectionTitle}>Phân loại doanh thu</Text>
              <View style={styles.breakdownCards}>
                <View style={styles.breakdownCard}>
                  <View style={[styles.breakdownIcon, { backgroundColor: '#ecfdf5' }]}>
                    <BedDouble size={20} color="#0d9488" />
                  </View>
                  <View style={styles.breakdownInfo}>
                    <Text style={styles.breakdownLabel}>Doanh thu phòng</Text>
                    <Text style={styles.breakdownValue}>
                      {formatCurrency(revenueSummary?.roomRevenue || 0)}
                    </Text>
                  </View>
                </View>
                <View style={styles.breakdownCard}>
                  <View style={[styles.breakdownIcon, { backgroundColor: '#fef3c7' }]}>
                    <Briefcase size={20} color="#f59e0b" />
                  </View>
                  <View style={styles.breakdownInfo}>
                    <Text style={styles.breakdownLabel}>Doanh thu dịch vụ</Text>
                    <Text style={styles.breakdownValue}>
                      {formatCurrency(revenueSummary?.serviceRevenue || 0)}
                    </Text>
                  </View>
                </View>
              </View>
            </View>

            <View style={styles.periodSelector}>
              {periodOptions.map((option) => (
                <TouchableOpacity
                  key={option.key}
                  style={[
                    styles.periodOption,
                    period === option.key && styles.periodOptionActive,
                  ]}
                  onPress={() => setPeriod(option.key)}
                >
                  <Text
                    style={[
                      styles.periodOptionText,
                      period === option.key && styles.periodOptionTextActive,
                    ]}
                  >
                    {option.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.chartSection}>
              <Text style={styles.sectionTitle}>Biểu đồ doanh thu</Text>
              
              {period === 'daily' && dailyRevenue.length > 0 && (
                <View style={styles.chartContainer}>
                  <View style={styles.chart}>
                    {dailyRevenue.slice(-7).map((day) => (
                      <View key={day.period} style={styles.chartBar}>
                        <View style={styles.chartBarContainer}>
                          <View
                            style={[
                              styles.chartBarFill,
                              { height: `${(day.revenue / maxDailyRevenue) * 100}%` },
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

              {period === 'monthly' && monthlyRevenue.length > 0 && (
                <View style={styles.chartContainer}>
                  <View style={styles.chart}>
                    {monthlyRevenue.slice(-6).map((month) => (
                      <View key={month.period} style={styles.chartBar}>
                        <View style={styles.chartBarContainer}>
                          <View
                            style={[
                              styles.chartBarFill,
                              { height: `${(month.revenue / maxMonthlyRevenue) * 100}%` },
                            ]}
                          />
                        </View>
                        <Text style={styles.chartLabel}>T{month.period.split('-')[1]}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}

              {(period === 'weekly' || period === 'yearly') && (
                <View style={styles.emptyChart}>
                  <Text style={styles.emptyChartText}>Chưa có dữ liệu</Text>
                </View>
              )}
            </View>

            <View style={styles.statsSection}>
              <Text style={styles.sectionTitle}>Thống kê tổng quan</Text>
              <View style={styles.statsGrid}>
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>{revenueSummary?.totalBookings || 0}</Text>
                  <Text style={styles.statLabel}>Đặt phòng</Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>{revenueSummary?.totalGuests || 0}</Text>
                  <Text style={styles.statLabel}>Khách hàng</Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>{revenueSummary?.averageOccupancy || 0}%</Text>
                  <Text style={styles.statLabel}>Tỷ lệ lấp đầy</Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>{formatCurrency(revenueSummary?.averageRoomRate || 0)}</Text>
                  <Text style={styles.statLabel}>Giá TB/đêm</Text>
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
    backgroundColor: Colors.light.background,
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
    backgroundColor: '#fff',
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
  secondaryLabel: {
    fontSize: 11,
    color: Colors.light.textSecondary,
    marginTop: 6,
  },
  secondaryValue: {
    fontSize: 15,
    fontWeight: '700' as const,
    color: Colors.light.text,
    marginTop: 2,
  },
  breakdownSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.light.text,
    marginBottom: 12,
  },
  breakdownCards: {
    gap: 10,
  },
  breakdownCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
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
    color: Colors.light.textSecondary,
  },
  breakdownValue: {
    fontSize: 17,
    fontWeight: '600' as const,
    color: Colors.light.text,
    marginTop: 2,
  },
  periodSelector: {
    flexDirection: 'row',
    backgroundColor: '#fff',
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
    backgroundColor: Colors.light.tint,
  },
  periodOptionText: {
    fontSize: 13,
    fontWeight: '500' as const,
    color: Colors.light.textSecondary,
  },
  periodOptionTextActive: {
    color: '#fff',
  },
  chartSection: {
    marginBottom: 20,
  },
  chartContainer: {
    backgroundColor: '#fff',
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
  emptyChart: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyChartText: {
    fontSize: 14,
    color: Colors.light.textSecondary,
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
    backgroundColor: '#fff',
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
    color: Colors.light.text,
  },
  statLabel: {
    fontSize: 12,
    color: Colors.light.textSecondary,
    marginTop: 4,
  },
});
