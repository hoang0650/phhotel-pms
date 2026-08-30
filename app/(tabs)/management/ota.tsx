import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { useHotel } from '@/contexts/HotelContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTheme } from '@/contexts/ThemeContext';
import { AccessGuard } from '@/components/AccessGuard';
import {
  otaApi,
  OtaBooking,
  OtaIntegration,
} from '@/services/api/ota';

function formatDate(value?: string, locale = 'vi-VN'): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString(locale, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatCurrency(amount = 0, currency = 'VND', locale = 'vi-VN'): string {
  try {
    return new Intl.NumberFormat(locale, { style: 'currency', currency }).format(amount);
  } catch {
    return `${amount.toLocaleString(locale)} ${currency}`;
  }
}

function getStatusColor(status: string): string {
  switch (status) {
    case 'active':
    case 'confirmed':
      return '#16a34a';
    case 'inactive':
    case 'pending':
      return '#f59e0b';
    case 'error':
    case 'cancelled':
      return '#ef4444';
    default:
      return '#64748b';
  }
}

export default function OtaManagementScreen() {
  const { colors } = useTheme();
  const { language } = useLanguage();
  const { selectedHotelId, selectedHotel } = useHotel();
  const isVi = language === 'vi';

  const [integrations, setIntegrations] = useState<OtaIntegration[]>([]);
  const [bookings, setBookings] = useState<OtaBooking[]>([]);
  const [summary, setSummary] = useState<Record<string, number>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [actionId, setActionId] = useState<string | null>(null);

  const t = useMemo(() => ({
    title: isVi ? 'Quản lý OTA / Channel' : 'OTA / Channel Management',
    subtitle: isVi
      ? 'Đồng bộ phòng trống và đặt phòng qua Channex'
      : 'Sync availability and reservations via Channex',
    connections: isVi ? 'Kết nối channel' : 'Channel connections',
    bookings: isVi ? 'Đặt phòng OTA gần đây' : 'Recent OTA bookings',
    noHotel: isVi ? 'Chưa chọn khách sạn' : 'No hotel selected',
    noConnections: isVi ? 'Chưa có kết nối OTA' : 'No OTA connections yet',
  noConnectionsHint: isVi
      ? 'Cấu hình Channex trên admin.phhotel.vn → OTAs Management'
      : 'Configure Channex on admin.phhotel.vn → OTAs Management',
    noBookings: isVi ? 'Chưa có đặt phòng OTA' : 'No OTA bookings yet',
    lastSync: isVi ? 'Đồng bộ lần cuối' : 'Last sync',
    neverSynced: isVi ? 'Chưa đồng bộ' : 'Never synced',
    statusActive: isVi ? 'Hoạt động' : 'Active',
    statusInactive: isVi ? 'Chưa kích hoạt' : 'Inactive',
    statusError: isVi ? 'Lỗi' : 'Error',
    statusPending: isVi ? 'Đang chờ' : 'Pending',
    pullBookings: isVi ? 'Lấy booking' : 'Pull bookings',
    syncInventory: isVi ? 'Đồng bộ phòng trống' : 'Sync availability',
    testConnection: isVi ? 'Test kết nối' : 'Test connection',
    syncAll: isVi ? 'Đồng bộ tất cả OTA' : 'Sync all OTAs',
    refreshBookings: isVi ? 'Làm mới booking' : 'Refresh bookings',
    mappings: isVi ? 'Mapping phòng' : 'Room mappings',
    roomTypes: isVi ? 'loại phòng' : 'room types',
    channexNote: isVi
      ? 'Một kết nối Channex đồng bộ tới Booking.com, Agoda, Expedia...'
      : 'One Channex connection syncs to Booking.com, Agoda, Expedia...',
    success: isVi ? 'Thành công' : 'Success',
    failed: isVi ? 'Thất bại' : 'Failed',
    syncedRooms: (count: number) =>
      isVi ? `Đã đồng bộ ${count} loại phòng` : `Synced ${count} room types`,
    pulledBookings: (count: number) =>
      isVi ? `Đã lấy ${count} booking` : `Pulled ${count} bookings`,
    connected: isVi ? 'Kết nối OK' : 'Connected',
    notConnected: isVi ? 'Không kết nối được' : 'Not connected',
    guest: isVi ? 'Khách' : 'Guest',
    checkIn: isVi ? 'Nhận phòng' : 'Check-in',
    checkOut: isVi ? 'Trả phòng' : 'Check-out',
    total: isVi ? 'Tổng' : 'Total',
  }), [isVi]);

  const loadData = useCallback(async (silent = false) => {
    if (!selectedHotelId) {
      setIntegrations([]);
      setBookings([]);
      setSummary({});
      setIsLoading(false);
      return;
    }

    if (!silent) setIsLoading(true);
    try {
      const [integrationList, calendar] = await Promise.all([
        otaApi.getIntegrations(selectedHotelId),
        otaApi.getCalendarBookings(selectedHotelId),
      ]);

      setIntegrations(integrationList);
      setBookings(calendar.data?.slice(0, 20).map((item) => ({
        _id: item.id,
        otaProvider: item.provider,
        otaBookingId: item.otaBookingId,
        guestDetails: { name: item.guestName },
        roomDetails: { roomTypeName: item.roomType },
        checkInDate: item.start,
        checkOutDate: item.end,
        pricing: { totalAmount: item.totalAmount, currency: item.currency },
        status: item.status,
      })) || []);
      setSummary(calendar.summary?.byProvider || {});
    } catch (error) {
      console.warn('[OtaManagement] loadData error:', error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [selectedHotelId]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'active': return t.statusActive;
      case 'inactive': return t.statusInactive;
      case 'error': return t.statusError;
      case 'pending': return t.statusPending;
      default: return status;
    }
  };

  const handleTest = async (integration: OtaIntegration) => {
    setActionId(`test-${integration._id}`);
    try {
      const result = await otaApi.testConnection(integration._id);
      const connected = result.data?.connected;
      Alert.alert(
        connected ? t.success : t.failed,
        result.data?.message || result.message || (connected ? t.connected : t.notConnected)
      );
    } catch (error) {
      Alert.alert(t.failed, error instanceof Error ? error.message : String(error));
    } finally {
      setActionId(null);
    }
  };

  const handlePull = async (integration: OtaIntegration) => {
    setActionId(`pull-${integration._id}`);
    try {
      const result = await otaApi.pullReservations(integration._id);
      Alert.alert(t.success, t.pulledBookings(result.data?.length || 0));
      await loadData(true);
    } catch (error) {
      Alert.alert(t.failed, error instanceof Error ? error.message : String(error));
    } finally {
      setActionId(null);
    }
  };

  const handleSyncInventory = async (integration: OtaIntegration) => {
    setActionId(`sync-${integration._id}`);
    try {
      const startDate = new Date();
      const endDate = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000);
      const result = await otaApi.syncInventory(integration._id, startDate, endDate);
      const count = result.data?.syncedRooms || 0;
      Alert.alert(t.success, t.syncedRooms(count));
      await loadData(true);
    } catch (error) {
      Alert.alert(t.failed, error instanceof Error ? error.message : String(error));
    } finally {
      setActionId(null);
    }
  };

  const handleSyncAll = async () => {
    if (!selectedHotelId) return;
    setActionId('sync-all');
    try {
      const result = await otaApi.syncAllInventoryForHotel(selectedHotelId);
      const successCount = result.results?.filter((r) => r.success).length || 0;
      const total = result.results?.length || 0;
      Alert.alert(
        t.success,
        isVi
          ? `Đồng bộ thành công ${successCount}/${total} channel`
          : `Synced ${successCount}/${total} channels`
      );
      await loadData(true);
    } catch (error) {
      Alert.alert(t.failed, error instanceof Error ? error.message : String(error));
    } finally {
      setActionId(null);
    }
  };

  const handleRefreshBookings = async () => {
    if (!selectedHotelId) return;
    setActionId('refresh-bookings');
    try {
      const channex = await otaApi.getActiveChannexIntegration(selectedHotelId);
      if (!channex) {
        Alert.alert(
          t.failed,
          isVi
            ? 'Chưa có kết nối Channex đang hoạt động. Vui lòng cấu hình và kích hoạt trên admin.phhotel.vn.'
            : 'No active Channex connection. Please configure and activate on admin.phhotel.vn.'
        );
        return;
      }

      const result = await otaApi.pullReservations(channex._id);
      Alert.alert(t.success, t.pulledBookings(result.data?.length || 0));
      await loadData(true);
    } catch (error) {
      Alert.alert(t.failed, error instanceof Error ? error.message : String(error));
    } finally {
      setActionId(null);
    }
  };

  const renderIntegrationCard = (integration: OtaIntegration) => {
    const providerColor = otaApi.getProviderColor(integration.provider);
    const isActive = integration.status === 'active';
    const mappingCount = integration.mappings?.roomTypes?.length || 0;
    const busy = actionId?.includes(integration._id);

    return (
      <View
        key={integration._id}
        style={[styles.card, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}
      >
        <View style={styles.cardHeader}>
          <View style={[styles.providerDot, { backgroundColor: providerColor }]} />
          <View style={styles.cardTitleWrap}>
            <Text style={[styles.cardTitle, { color: colors.text }]}>
              {integration.channelName || integration.provider}
            </Text>
            <Text style={[styles.cardSubtitle, { color: colors.textSecondary }]}>
              {integration.adapterType || integration.channelCode || 'channel'}
            </Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: `${getStatusColor(integration.status)}22` }]}>
            <Text style={[styles.statusText, { color: getStatusColor(integration.status) }]}>
              {getStatusLabel(integration.status)}
            </Text>
          </View>
        </View>

        <Text style={[styles.metaText, { color: colors.textSecondary }]}>
          {t.lastSync}: {integration.lastSync ? formatDate(integration.lastSync) : t.neverSynced}
        </Text>
        <Text style={[styles.metaText, { color: colors.textSecondary }]}>
          {t.mappings}: {mappingCount} {t.roomTypes}
        </Text>

        {integration.adapterType === 'channex' && (
          <Text style={[styles.noteText, { color: colors.textSecondary }]}>{t.channexNote}</Text>
        )}

        <View style={styles.actionRow}>
          <ActionButton
            icon="pulse-outline"
            label={t.testConnection}
            onPress={() => handleTest(integration)}
            disabled={busy}
            loading={actionId === `test-${integration._id}`}
            colors={colors}
          />
          <ActionButton
            icon="download-outline"
            label={t.pullBookings}
            onPress={() => handlePull(integration)}
            disabled={!isActive || busy}
            loading={actionId === `pull-${integration._id}`}
            colors={colors}
          />
          <ActionButton
            icon="cloud-upload-outline"
            label={t.syncInventory}
            onPress={() => handleSyncInventory(integration)}
            disabled={!isActive || busy}
            loading={actionId === `sync-${integration._id}`}
            colors={colors}
          />
        </View>
      </View>
    );
  };

  const summaryEntries = Object.entries(summary).filter(([, count]) => count > 0);

  return (
    <AccessGuard
      features={['ota_management']}
      addon="otaManagementFeature"
      titleVi="Bạn chưa có quyền quản lý OTA"
      titleEn="You do not have OTA management access"
      descriptionVi="Gói hiện tại chưa mở tính năng OTAs Management."
      descriptionEn="Your current package does not include OTAs Management."
    >
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={() => {
                setIsRefreshing(true);
                loadData(true);
              }}
              tintColor={colors.tint}
            />
          }
        >
          <View style={styles.header}>
            <Text style={[styles.title, { color: colors.text }]}>{t.title}</Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>{t.subtitle}</Text>
            {selectedHotel?.name ? (
              <Text style={[styles.hotelName, { color: colors.tint }]}>{selectedHotel.name}</Text>
            ) : null}
          </View>

          {!selectedHotelId ? (
            <View style={[styles.emptyCard, { backgroundColor: colors.cardBackground }]}>
              <Ionicons name="business-outline" size={28} color={colors.textSecondary} />
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>{t.noHotel}</Text>
            </View>
          ) : isLoading ? (
            <ActivityIndicator size="large" color={colors.tint} style={styles.loader} />
          ) : (
            <>
              <View style={styles.sectionHeader}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>{t.connections}</Text>
                <TouchableOpacity
                  style={[styles.primaryButton, { backgroundColor: colors.tint }]}
                  onPress={handleSyncAll}
                  disabled={!!actionId || integrations.filter((i) => i.status === 'active').length === 0}
                >
                  {actionId === 'sync-all' ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <>
                      <Ionicons name="sync-outline" size={16} color="#fff" />
                      <Text style={styles.primaryButtonText}>{t.syncAll}</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>

              {integrations.length === 0 ? (
                <View style={[styles.emptyCard, { backgroundColor: colors.cardBackground }]}>
                  <Ionicons name="link-outline" size={28} color={colors.textSecondary} />
                  <Text style={[styles.emptyText, { color: colors.text }]}>{t.noConnections}</Text>
                  <Text style={[styles.emptyHint, { color: colors.textSecondary }]}>{t.noConnectionsHint}</Text>
                </View>
              ) : (
                integrations.map(renderIntegrationCard)
              )}

              {summaryEntries.length > 0 && (
                <View style={[styles.summaryCard, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
                  <Text style={[styles.sectionTitle, { color: colors.text }]}>{t.total}</Text>
                  <View style={styles.summaryRow}>
                    {summaryEntries.map(([provider, count]) => (
                      <View key={provider} style={styles.summaryItem}>
                        <View style={[styles.summaryDot, { backgroundColor: otaApi.getProviderColor(provider) }]} />
                        <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>{provider}</Text>
                        <Text style={[styles.summaryValue, { color: colors.text }]}>{count}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}

              <View style={styles.sectionHeader}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>{t.bookings}</Text>
                <TouchableOpacity
                  style={[styles.secondaryButton, { borderColor: colors.border }]}
                  onPress={handleRefreshBookings}
                  disabled={!!actionId}
                >
                  {actionId === 'refresh-bookings' ? (
                    <ActivityIndicator color={colors.tint} size="small" />
                  ) : (
                    <>
                      <Ionicons name="refresh-outline" size={16} color={colors.tint} />
                      <Text style={[styles.secondaryButtonText, { color: colors.tint }]}>{t.refreshBookings}</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>

              {bookings.length === 0 ? (
                <View style={[styles.emptyCard, { backgroundColor: colors.cardBackground }]}>
                  <Ionicons name="calendar-outline" size={28} color={colors.textSecondary} />
                  <Text style={[styles.emptyText, { color: colors.textSecondary }]}>{t.noBookings}</Text>
                </View>
              ) : (
                bookings.map((booking) => (
                  <View
                    key={booking._id || booking.otaBookingId}
                    style={[styles.bookingCard, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}
                  >
                    <View style={styles.bookingHeader}>
                      <View style={[styles.providerDot, { backgroundColor: otaApi.getProviderColor(booking.otaProvider) }]} />
                      <Text style={[styles.bookingProvider, { color: colors.text }]}>{booking.otaProvider}</Text>
                      <Text style={[styles.bookingId, { color: colors.textSecondary }]}>#{booking.otaBookingId}</Text>
                    </View>
                    <Text style={[styles.bookingGuest, { color: colors.text }]}>
                      {t.guest}: {booking.guestDetails?.name || '—'}
                    </Text>
                    <Text style={[styles.bookingMeta, { color: colors.textSecondary }]}>
                      {booking.roomDetails?.roomTypeName || '—'}
                    </Text>
                    <Text style={[styles.bookingMeta, { color: colors.textSecondary }]}>
                      {t.checkIn}: {formatDate(booking.checkInDate)}
                    </Text>
                    <Text style={[styles.bookingMeta, { color: colors.textSecondary }]}>
                      {t.checkOut}: {formatDate(booking.checkOutDate)}
                    </Text>
                    <View style={styles.bookingFooter}>
                      <Text style={[styles.bookingAmount, { color: colors.text }]}>
                        {formatCurrency(booking.pricing?.totalAmount, booking.pricing?.currency)}
                      </Text>
                      <View style={[styles.statusBadge, { backgroundColor: `${getStatusColor(booking.status)}22` }]}>
                        <Text style={[styles.statusText, { color: getStatusColor(booking.status) }]}>
                          {booking.status}
                        </Text>
                      </View>
                    </View>
                  </View>
                ))
              )}
            </>
          )}
        </ScrollView>
      </SafeAreaView>
    </AccessGuard>
  );
}

function ActionButton({
  icon,
  label,
  onPress,
  disabled,
  loading,
  colors,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  colors: { tint: string; textSecondary: string; border: string };
}) {
  return (
    <TouchableOpacity
      style={[styles.actionButton, { borderColor: colors.border, opacity: disabled ? 0.5 : 1 }]}
      onPress={onPress}
      disabled={disabled || loading}
    >
      {loading ? (
        <ActivityIndicator size="small" color={colors.tint} />
      ) : (
        <Ionicons name={icon} size={18} color={colors.tint} />
      )}
      <Text style={[styles.actionButtonText, { color: colors.textSecondary }]} numberOfLines={2}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 32 },
  header: { marginBottom: 20 },
  title: { fontSize: 24, fontWeight: '700' },
  subtitle: { fontSize: 14, marginTop: 6, lineHeight: 20 },
  hotelName: { fontSize: 14, fontWeight: '600', marginTop: 8 },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    gap: 12,
  },
  sectionTitle: { fontSize: 16, fontWeight: '700', flex: 1 },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  primaryButtonText: { color: '#fff', fontWeight: '600', fontSize: 13 },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
  },
  secondaryButtonText: { fontWeight: '600', fontSize: 13 },
  card: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    marginBottom: 12,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  providerDot: { width: 10, height: 10, borderRadius: 5, marginRight: 10 },
  cardTitleWrap: { flex: 1 },
  cardTitle: { fontSize: 16, fontWeight: '700' },
  cardSubtitle: { fontSize: 12, marginTop: 2 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999 },
  statusText: { fontSize: 11, fontWeight: '700' },
  metaText: { fontSize: 12, marginBottom: 4 },
  noteText: { fontSize: 12, lineHeight: 18, marginTop: 6, fontStyle: 'italic' },
  actionRow: { flexDirection: 'row', gap: 8, marginTop: 12 },
  actionButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 6,
    borderRadius: 10,
    borderWidth: 1,
    minHeight: 72,
  },
  actionButtonText: { fontSize: 11, textAlign: 'center' },
  summaryCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    marginBottom: 16,
  },
  summaryRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 8 },
  summaryItem: { flexDirection: 'row', alignItems: 'center', gap: 6, marginRight: 12 },
  summaryDot: { width: 8, height: 8, borderRadius: 4 },
  summaryLabel: { fontSize: 12 },
  summaryValue: { fontSize: 14, fontWeight: '700' },
  bookingCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    marginBottom: 10,
  },
  bookingHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  bookingProvider: { fontSize: 14, fontWeight: '700', flex: 1 },
  bookingId: { fontSize: 11 },
  bookingGuest: { fontSize: 14, fontWeight: '600', marginBottom: 4 },
  bookingMeta: { fontSize: 12, marginBottom: 2 },
  bookingFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  bookingAmount: { fontSize: 14, fontWeight: '700' },
  emptyCard: {
    borderRadius: 14,
    padding: 24,
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  emptyText: { fontSize: 15, fontWeight: '600', textAlign: 'center' },
  emptyHint: { fontSize: 13, textAlign: 'center', lineHeight: 20 },
  loader: { marginTop: 40 },
});
