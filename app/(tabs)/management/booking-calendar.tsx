import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  NativeScrollEvent,
  NativeSyntheticEvent,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useHotel } from '@/contexts/HotelContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTheme } from '@/contexts/ThemeContext';
import { AccessGuard } from '@/components/AccessGuard';
import { bookingsApi } from '@/services/api/bookings';
import { calendarApi } from '@/services/api/calendar';
import { roomsApi } from '@/services/api/rooms';
import { Room } from '@/types/hotel';
import {
  CalendarBooking,
  CATEGORY_HEADER_HEIGHT,
  DAY_COL_WIDTH,
  LEFT_COL_WIDTH,
  LOAD_BUFFER_DAYS,
  ROW_HEIGHT,
  VISIBLE_DAYS,
  addDays,
  buildDateRange,
  formatDayHeader,
  getBookingBarLayout,
  getDayOccupancy,
  getStatusColor,
  groupRoomsByCategory,
  isToday,
  startOfDay,
} from '@/utils/booking-calendar';

type ViewMode = 'timeline' | 'list';

function formatDateTime(value?: Date | string, locale = 'vi-VN'): string {
  if (!value) return '—';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString(locale, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getBookingStatusLabel(status: string, isVi: boolean): string {
  switch (status) {
    case 'checked_in':
      return isVi ? 'Đã nhận phòng' : 'Checked in';
    case 'booked':
    case 'confirmed':
      return isVi ? 'Đã đặt' : 'Booked';
    case 'cancelled':
      return isVi ? 'Đã hủy' : 'Cancelled';
    default:
      return isVi ? 'Đặt trước' : 'Pre-booked';
  }
}

export default function BookingCalendarScreen() {
  const { colors } = useTheme();
  const { language } = useLanguage();
  const { selectedHotelId, selectedHotel } = useHotel();
  const router = useRouter();
  const isVi = language === 'vi';
  const locale = isVi ? 'vi-VN' : 'en-US';

  const [rangeStart, setRangeStart] = useState(() => startOfDay(new Date()));
  const [rooms, setRooms] = useState<Room[]>([]);
  const [bookings, setBookings] = useState<CalendarBooking[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [actionId, setActionId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('timeline');
  const [selectedBooking, setSelectedBooking] = useState<CalendarBooking | null>(null);

  const headerScrollRef = useRef<ScrollView>(null);
  const rowScrollRefs = useRef<Record<string, ScrollView | null>>({});
  const isSyncingScroll = useRef(false);

  const dayCount = VISIBLE_DAYS + LOAD_BUFFER_DAYS;
  const dates = useMemo(() => buildDateRange(rangeStart, dayCount), [rangeStart, dayCount]);
  const roomGroups = useMemo(() => groupRoomsByCategory(rooms), [rooms]);
  const allRoomIds = useMemo(() => rooms.map((room) => room.id), [rooms]);
  const gridWidth = dayCount * DAY_COL_WIDTH;

  const t = useMemo(
    () => ({
      title: isVi ? 'Lịch đặt phòng' : 'Booking Calendar',
      subtitle: isVi
        ? 'Đồng bộ với lịch trên web admin'
        : 'Synced with web admin calendar',
      noHotel: isVi ? 'Chưa chọn khách sạn' : 'No hotel selected',
      timeline: isVi ? 'Timeline' : 'Timeline',
      list: isVi ? 'Danh sách' : 'List',
      today: isVi ? 'Hôm nay' : 'Today',
      refresh: isVi ? 'Làm mới' : 'Refresh',
      history: isVi ? 'Lịch sử đặt phòng' : 'Booking history',
      checkin: isVi ? 'Nhận phòng' : 'Check in',
      cancel: isVi ? 'Hủy đặt' : 'Cancel',
      room: isVi ? 'Phòng' : 'Room',
      guest: isVi ? 'Khách' : 'Guest',
      checkInDate: isVi ? 'Nhận phòng' : 'Check-in',
      checkOutDate: isVi ? 'Trả phòng' : 'Check-out',
      status: isVi ? 'Trạng thái' : 'Status',
      noBookings: isVi ? 'Chưa có đặt phòng trong khoảng thời gian này' : 'No bookings in this range',
      newBooking: isVi ? 'Đặt phòng mới' : 'New booking',
      occupancy: isVi ? 'Công suất' : 'Occupancy',
      close: isVi ? 'Đóng' : 'Close',
      cancelConfirm: isVi ? 'Bạn có chắc muốn hủy đặt phòng này?' : 'Cancel this booking?',
      successCheckin: isVi ? 'Nhận phòng thành công' : 'Checked in successfully',
      successCancel: isVi ? 'Đã hủy đặt phòng' : 'Booking cancelled',
      error: isVi ? 'Có lỗi xảy ra' : 'Something went wrong',
    }),
    [isVi]
  );

  const sortedBookings = useMemo(
    () =>
      [...bookings].sort(
        (a, b) => b.checkInDate.getTime() - a.checkInDate.getTime()
      ),
    [bookings]
  );

  const loadData = useCallback(
    async (refreshing = false) => {
      if (!selectedHotelId) {
        setRooms([]);
        setBookings([]);
        setIsLoading(false);
        setIsRefreshing(false);
        return;
      }

      if (refreshing) setIsRefreshing(true);
      else setIsLoading(true);

      try {
        const data = await calendarApi.getCalendarData({
          hotelId: selectedHotelId,
          rangeStart,
          dayCount,
        });
        setRooms(data.rooms);
        setBookings(data.bookings);
      } catch (error) {
        console.warn('[BookingCalendar] load error:', error);
        Alert.alert(t.error, String(error));
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [selectedHotelId, rangeStart, dayCount, t.error]
  );

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const syncHorizontalScroll = (x: number, sourceKey: string) => {
    if (isSyncingScroll.current) return;
    isSyncingScroll.current = true;
    if (sourceKey !== 'header') {
      headerScrollRef.current?.scrollTo({ x, animated: false });
    }
    Object.entries(rowScrollRefs.current).forEach(([key, ref]) => {
      if (key !== sourceKey) {
        ref?.scrollTo({ x, animated: false });
      }
    });
    isSyncingScroll.current = false;
  };

  const handleHorizontalScroll =
    (sourceKey: string) => (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      syncHorizontalScroll(event.nativeEvent.contentOffset.x, sourceKey);
    };

  const shiftRange = (days: number) => {
    setRangeStart((current) => addDays(current, days));
  };

  const goToToday = () => {
    setRangeStart(startOfDay(new Date()));
  };

  const handleCheckIn = async (booking: CalendarBooking) => {
    if (!booking.roomId || !selectedHotelId) return;
    setActionId(booking.id);
    try {
      await roomsApi.checkIn(booking.roomId, {
        hotelId: selectedHotelId,
        guestInfo: { name: booking.guestName },
      });
      Alert.alert(t.successCheckin);
      setSelectedBooking(null);
      await loadData(true);
    } catch (error) {
      Alert.alert(t.error, String(error));
    } finally {
      setActionId(null);
    }
  };

  const handleCancel = (booking: CalendarBooking) => {
    const roomId = booking.roomId;
    if (!roomId) return;
    Alert.alert(t.cancel, t.cancelConfirm, [
      { text: isVi ? 'Không' : 'No', style: 'cancel' },
      {
        text: isVi ? 'Hủy đặt' : 'Cancel booking',
        style: 'destructive',
        onPress: async () => {
          setActionId(booking.id);
          try {
            const success = await bookingsApi.cancel(roomId);
            if (!success) throw new Error('cancel failed');
            Alert.alert(t.successCancel);
            setSelectedBooking(null);
            await loadData(true);
          } catch (error) {
            Alert.alert(t.error, String(error));
          } finally {
            setActionId(null);
          }
        },
      },
    ]);
  };

  const renderDateHeader = () => (
    <View style={[styles.dateHeaderRow, { borderBottomColor: colors.border }]}>
      <View style={[styles.leftColumn, { backgroundColor: colors.cardBackground }]}>
        <Text style={[styles.leftColumnHint, { color: colors.textSecondary }]}>{t.room}</Text>
      </View>
      <ScrollView
        ref={headerScrollRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        scrollEventThrottle={16}
        onScroll={handleHorizontalScroll('header')}
      >
        <View style={[styles.dateHeaderGrid, { width: gridWidth }]}>
          {dates.map((date) => {
            const { weekday, dateLabel } = formatDayHeader(date, locale);
            const occupancy = getDayOccupancy(allRoomIds, bookings, date);
            const active = isToday(date);
            return (
              <View
                key={date.toISOString()}
                style={[
                  styles.dateHeaderCell,
                  active && styles.dateHeaderCellActive,
                  active && { backgroundColor: '#1e3a5f' },
                ]}
              >
                <Text style={[styles.weekdayText, active && styles.dateHeaderTextActive]}>
                  {weekday}
                </Text>
                <Text style={[styles.dateLabelText, active && styles.dateHeaderTextActive]}>
                  {dateLabel}
                </Text>
                <View style={styles.occupancyRow}>
                  <View style={[styles.occupancyBadge, styles.occupancyBadgeGreen]}>
                    <Text style={styles.occupancyBadgeText}>{occupancy.occupied}</Text>
                  </View>
                  <View style={[styles.occupancyBadge, styles.occupancyBadgeRed]}>
                    <Text style={styles.occupancyBadgeText}>{occupancy.percent}%</Text>
                  </View>
                </View>
              </View>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );

  const renderBookingBar = (booking: CalendarBooking, rowKey: string) => {
    const layout = getBookingBarLayout(booking, rangeStart, dayCount);
    if (!layout.visible) return null;

    return (
      <TouchableOpacity
        key={`${rowKey}-${booking.id}`}
        style={[
          styles.bookingBar,
          {
            left: layout.left,
            width: layout.width,
            backgroundColor: booking.color,
          },
        ]}
        onPress={() => setSelectedBooking(booking)}
        activeOpacity={0.85}
      >
        <Text style={styles.bookingBarText} numberOfLines={1}>
          {booking.label}
        </Text>
      </TouchableOpacity>
    );
  };

  const renderTimeline = () => (
    <ScrollView
      style={styles.timelineScroll}
      refreshControl={
        <RefreshControl refreshing={isRefreshing} onRefresh={() => loadData(true)} />
      }
      showsVerticalScrollIndicator={false}
    >
      {renderDateHeader()}

      {roomGroups.map((group) => (
        <View key={group.category}>
          <View style={[styles.categoryHeader, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
            <Text style={[styles.categoryTitle, { color: colors.text }]}>{group.category}</Text>
            <View style={styles.categoryStats}>
              {dates.slice(0, VISIBLE_DAYS).map((date) => {
                const roomIds = group.rooms.map((room) => room.id);
                const dayBookings = bookings.filter(
                  (booking) =>
                    booking.roomId &&
                    roomIds.includes(booking.roomId) &&
                    bookingCoversDaySafe(booking, date)
                );
                return (
                  <View key={`${group.category}-${date.toISOString()}`} style={styles.categoryDayStat}>
                    <Text style={styles.categoryDayStatText}>{dayBookings.length}</Text>
                  </View>
                );
              })}
            </View>
          </View>

          {group.rooms.map((room) => {
            const rowKey = `${group.category}-${room.id}`;
            const roomBookings = bookings.filter(
              (booking) => booking.roomId === room.id && booking.status !== 'cancelled'
            );

            return (
              <View
                key={rowKey}
                style={[styles.roomRow, { borderBottomColor: colors.border }]}
              >
                <View style={[styles.leftColumn, { backgroundColor: colors.cardBackground }]}>
                  <View style={[styles.roomStatusDot, { backgroundColor: getStatusColor(room.status) }]}>
                    <Text style={styles.roomStatusDotText}>D</Text>
                  </View>
                  <Text style={[styles.roomNumberText, { color: colors.text }]}>{room.number}</Text>
                </View>

                <ScrollView
                  ref={(ref) => {
                    rowScrollRefs.current[rowKey] = ref;
                  }}
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  scrollEventThrottle={16}
                  onScroll={handleHorizontalScroll(rowKey)}
                >
                  <View style={[styles.roomGrid, { width: gridWidth, height: ROW_HEIGHT }]}>
                    {dates.map((date, index) => (
                      <View
                        key={`${rowKey}-${date.toISOString()}`}
                        style={[
                          styles.dayCell,
                          { left: index * DAY_COL_WIDTH, borderRightColor: colors.border },
                        ]}
                      />
                    ))}
                    {roomBookings.map((booking) => renderBookingBar(booking, rowKey))}
                  </View>
                </ScrollView>
              </View>
            );
          })}
        </View>
      ))}

      <View style={[styles.historySection, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
        <Text style={[styles.historyTitle, { color: colors.text }]}>{t.history}</Text>
        {sortedBookings.length === 0 ? (
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>{t.noBookings}</Text>
        ) : (
          sortedBookings.slice(0, 20).map((booking) => (
            <TouchableOpacity
              key={`history-${booking.id}`}
              style={[styles.historyItem, { borderBottomColor: colors.border }]}
              onPress={() => setSelectedBooking(booking)}
            >
              <View style={styles.historyItemHeader}>
                <Text style={[styles.historyGuest, { color: colors.text }]} numberOfLines={1}>
                  {booking.label}
                </Text>
                <View style={[styles.statusPill, { backgroundColor: `${getStatusColor(booking.status)}22` }]}>
                  <Text style={[styles.statusPillText, { color: getStatusColor(booking.status) }]}>
                    {getBookingStatusLabel(booking.status, isVi)}
                  </Text>
                </View>
              </View>
              <Text style={[styles.historyMeta, { color: colors.textSecondary }]}>
                {t.room} {booking.roomNumber || '—'} · {formatDateTime(booking.checkInDate, locale)} → {formatDateTime(booking.checkOutDate, locale)}
              </Text>
            </TouchableOpacity>
          ))
        )}
      </View>
    </ScrollView>
  );

  const renderListView = () => (
    <ScrollView
      style={styles.listScroll}
      refreshControl={
        <RefreshControl refreshing={isRefreshing} onRefresh={() => loadData(true)} />
      }
    >
      {sortedBookings.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="calendar-outline" size={40} color={colors.textSecondary} />
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>{t.noBookings}</Text>
        </View>
      ) : (
        sortedBookings.map((booking) => (
          <TouchableOpacity
            key={`list-${booking.id}`}
            style={[styles.listCard, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}
            onPress={() => setSelectedBooking(booking)}
          >
            <View style={[styles.listColorBar, { backgroundColor: booking.color }]} />
            <View style={styles.listCardBody}>
              <Text style={[styles.listGuest, { color: colors.text }]}>{booking.label}</Text>
              <Text style={[styles.listMeta, { color: colors.textSecondary }]}>
                {t.room} {booking.roomNumber || '—'}
              </Text>
              <Text style={[styles.listMeta, { color: colors.textSecondary }]}>
                {formatDateTime(booking.checkInDate, locale)} → {formatDateTime(booking.checkOutDate, locale)}
              </Text>
              <Text style={[styles.listStatus, { color: getStatusColor(booking.status) }]}>
                {getBookingStatusLabel(booking.status, isVi)}
              </Text>
            </View>
          </TouchableOpacity>
        ))
      )}
    </ScrollView>
  );

  return (
    <AccessGuard features={['calendar', 'room_management']}>
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.toolbar, { backgroundColor: colors.cardBackground, borderBottomColor: colors.border }]}>
          <View style={styles.toolbarTop}>
            <View style={styles.toolbarTitles}>
              <Text style={[styles.title, { color: colors.text }]}>{t.title}</Text>
              <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                {selectedHotel?.name || t.noHotel}
              </Text>
            </View>
            <TouchableOpacity
              style={[styles.iconButton, { borderColor: colors.border }]}
              onPress={() => loadData(true)}
            >
              <Ionicons name="refresh" size={18} color={colors.tint} />
            </TouchableOpacity>
          </View>

          <View style={styles.toolbarControls}>
            <View style={[styles.viewToggle, { borderColor: colors.border }]}>
              <TouchableOpacity
                style={[styles.viewToggleBtn, viewMode === 'timeline' && { backgroundColor: colors.tint }]}
                onPress={() => setViewMode('timeline')}
              >
                <Text style={[styles.viewToggleText, viewMode === 'timeline' && styles.viewToggleTextActive]}>
                  {t.timeline}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.viewToggleBtn, viewMode === 'list' && { backgroundColor: colors.tint }]}
                onPress={() => setViewMode('list')}
              >
                <Text style={[styles.viewToggleText, viewMode === 'list' && styles.viewToggleTextActive]}>
                  {t.list}
                </Text>
              </TouchableOpacity>
            </View>

            {viewMode === 'timeline' && (
              <View style={styles.dateNav}>
                <TouchableOpacity style={styles.navBtn} onPress={() => shiftRange(-VISIBLE_DAYS)}>
                  <Ionicons name="chevron-back" size={20} color={colors.text} />
                </TouchableOpacity>
                <TouchableOpacity style={[styles.todayBtn, { borderColor: colors.border }]} onPress={goToToday}>
                  <Text style={[styles.todayBtnText, { color: colors.tint }]}>{t.today}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.navBtn} onPress={() => shiftRange(VISIBLE_DAYS)}>
                  <Ionicons name="chevron-forward" size={20} color={colors.text} />
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>

        {!selectedHotelId ? (
          <View style={styles.emptyState}>
            <Ionicons name="business-outline" size={42} color={colors.textSecondary} />
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>{t.noHotel}</Text>
          </View>
        ) : isLoading ? (
          <View style={styles.loadingState}>
            <ActivityIndicator size="large" color={colors.tint} />
          </View>
        ) : viewMode === 'timeline' ? (
          renderTimeline()
        ) : (
          renderListView()
        )}

        <TouchableOpacity
          style={[styles.fab, { backgroundColor: '#111827' }]}
          onPress={() => router.push('/(tabs)/bookings')}
          activeOpacity={0.9}
        >
          <Ionicons name="add" size={28} color="#fff" />
        </TouchableOpacity>

        {selectedBooking && (
          <View style={styles.modalOverlay}>
            <View style={[styles.modalCard, { backgroundColor: colors.cardBackground }]}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>{selectedBooking.label}</Text>
              <Text style={[styles.modalMeta, { color: colors.textSecondary }]}>
                {t.room}: {selectedBooking.roomNumber || '—'}
              </Text>
              <Text style={[styles.modalMeta, { color: colors.textSecondary }]}>
                {t.checkInDate}: {formatDateTime(selectedBooking.checkInDate, locale)}
              </Text>
              <Text style={[styles.modalMeta, { color: colors.textSecondary }]}>
                {t.checkOutDate}: {formatDateTime(selectedBooking.checkOutDate, locale)}
              </Text>
              <Text style={[styles.modalStatus, { color: getStatusColor(selectedBooking.status) }]}>
                {getBookingStatusLabel(selectedBooking.status, isVi)}
              </Text>

              <View style={styles.modalActions}>
                {selectedBooking.roomId &&
                  selectedBooking.status !== 'cancelled' &&
                  selectedBooking.status !== 'checked_in' && (
                    <>
                      <TouchableOpacity
                        style={[styles.modalBtn, { backgroundColor: colors.tint }]}
                        onPress={() => handleCheckIn(selectedBooking)}
                        disabled={actionId === selectedBooking.id}
                      >
                        {actionId === selectedBooking.id ? (
                          <ActivityIndicator color="#fff" />
                        ) : (
                          <Text style={styles.modalBtnText}>{t.checkin}</Text>
                        )}
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.modalBtn, styles.modalBtnDanger]}
                        onPress={() => handleCancel(selectedBooking)}
                        disabled={actionId === selectedBooking.id}
                      >
                        <Text style={styles.modalBtnText}>{t.cancel}</Text>
                      </TouchableOpacity>
                    </>
                  )}
                <TouchableOpacity
                  style={[styles.modalBtn, { backgroundColor: colors.border }]}
                  onPress={() => setSelectedBooking(null)}
                >
                  <Text style={[styles.modalBtnText, { color: colors.text }]}>{t.close}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}
      </SafeAreaView>
    </AccessGuard>
  );
}

function bookingCoversDaySafe(booking: CalendarBooking, day: Date): boolean {
  const dayStart = startOfDay(day).getTime();
  const dayEnd = dayStart + 24 * 60 * 60 * 1000;
  const checkIn = startOfDay(booking.checkInDate).getTime();
  const checkOut = booking.checkOutDate
    ? startOfDay(booking.checkOutDate).getTime()
    : checkIn + 24 * 60 * 60 * 1000;
  return booking.status !== 'cancelled' && checkIn < dayEnd && checkOut > dayStart;
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  toolbar: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  toolbarTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  toolbarTitles: { flex: 1, paddingRight: 12 },
  title: { fontSize: 20, fontWeight: '700' },
  subtitle: { fontSize: 13, marginTop: 2 },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toolbarControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  viewToggle: {
    flexDirection: 'row',
    borderWidth: 1,
    borderRadius: 10,
    overflow: 'hidden',
  },
  viewToggleBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  viewToggleText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748b',
  },
  viewToggleTextActive: { color: '#fff' },
  dateNav: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  navBtn: { padding: 6 },
  todayBtn: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  todayBtnText: { fontSize: 12, fontWeight: '600' },
  timelineScroll: { flex: 1 },
  listScroll: { flex: 1, padding: 16, paddingBottom: 88 },
  dateHeaderRow: {
    flexDirection: 'row',
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  leftColumn: {
    width: LEFT_COL_WIDTH,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 8,
  },
  leftColumnHint: { fontSize: 11, fontWeight: '600' },
  dateHeaderGrid: { flexDirection: 'row' },
  dateHeaderCell: {
    width: DAY_COL_WIDTH,
    paddingVertical: 8,
    paddingHorizontal: 6,
    alignItems: 'center',
    backgroundColor: '#f8fafc',
  },
  dateHeaderCellActive: {},
  weekdayText: { fontSize: 11, color: '#64748b', fontWeight: '600' },
  dateLabelText: { fontSize: 12, fontWeight: '700', color: '#111827', marginTop: 2 },
  dateHeaderTextActive: { color: '#fff' },
  occupancyRow: { flexDirection: 'row', gap: 4, marginTop: 6 },
  occupancyBadge: {
    minWidth: 28,
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 4,
    alignItems: 'center',
  },
  occupancyBadgeGreen: { backgroundColor: '#16a34a' },
  occupancyBadgeRed: { backgroundColor: '#ef4444' },
  occupancyBadgeText: { color: '#fff', fontSize: 10, fontWeight: '700' },
  categoryHeader: {
    minHeight: CATEGORY_HEADER_HEIGHT,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  categoryTitle: { fontSize: 14, fontWeight: '700', flex: 1 },
  categoryStats: { flexDirection: 'row', gap: 8, opacity: 0.5 },
  categoryDayStat: { width: 18, alignItems: 'center' },
  categoryDayStatText: { fontSize: 10, fontWeight: '700' },
  roomRow: {
    flexDirection: 'row',
    borderBottomWidth: StyleSheet.hairlineWidth,
    minHeight: ROW_HEIGHT,
  },
  roomStatusDot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  roomStatusDotText: { color: '#fff', fontSize: 9, fontWeight: '700' },
  roomNumberText: { fontSize: 13, fontWeight: '700' },
  roomGrid: { position: 'relative' },
  dayCell: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: DAY_COL_WIDTH,
    borderRightWidth: StyleSheet.hairlineWidth,
  },
  bookingBar: {
    position: 'absolute',
    top: 8,
    height: ROW_HEIGHT - 16,
    borderRadius: 6,
    justifyContent: 'center',
    paddingHorizontal: 8,
    zIndex: 2,
  },
  bookingBarText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  historySection: {
    margin: 16,
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    marginBottom: 88,
  },
  historyTitle: { fontSize: 16, fontWeight: '700', marginBottom: 10 },
  historyItem: {
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  historyItemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  historyGuest: { fontSize: 14, fontWeight: '600', flex: 1 },
  historyMeta: { fontSize: 12, marginTop: 4 },
  statusPill: {
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  statusPillText: { fontSize: 11, fontWeight: '700' },
  listCard: {
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 10,
    overflow: 'hidden',
    flexDirection: 'row',
  },
  listColorBar: { width: 5 },
  listCardBody: { flex: 1, padding: 12 },
  listGuest: { fontSize: 15, fontWeight: '700' },
  listMeta: { fontSize: 12, marginTop: 4 },
  listStatus: { fontSize: 12, fontWeight: '700', marginTop: 8 },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 10,
  },
  emptyText: { fontSize: 14, textAlign: 'center' },
  loadingState: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
  },
  modalOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    maxWidth: 420,
    borderRadius: 16,
    padding: 18,
  },
  modalTitle: { fontSize: 17, fontWeight: '700' },
  modalMeta: { fontSize: 13, marginTop: 8 },
  modalStatus: { fontSize: 13, fontWeight: '700', marginTop: 10 },
  modalActions: { marginTop: 16, gap: 8 },
  modalBtn: {
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  modalBtnDanger: { backgroundColor: '#ef4444' },
  modalBtnText: { color: '#fff', fontWeight: '700' },
});
