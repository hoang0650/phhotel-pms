import { otaApi } from '@/services/api/ota';

export const DAY_COL_WIDTH = 96;
export const LEFT_COL_WIDTH = 68;
export const ROW_HEIGHT = 48;
export const CATEGORY_HEADER_HEIGHT = 34;
export const VISIBLE_DAYS = 7;
export const LOAD_BUFFER_DAYS = 7;

export interface CalendarBooking {
  id: string;
  roomId?: string;
  roomNumber?: string;
  guestName: string;
  checkInDate: Date;
  checkOutDate?: Date;
  status: string;
  source: 'pms' | 'ota';
  provider?: string;
  guestSource?: string;
  color: string;
  label: string;
}

export interface RoomCategoryGroup {
  category: string;
  rooms: Array<{
    id: string;
    number: string;
    status: string;
    roomType?: string;
  }>;
}

export function startOfDay(date: Date): Date {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

export function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return startOfDay(next);
}

export function differenceInCalendarDays(end: Date, start: Date): number {
  const msPerDay = 24 * 60 * 60 * 1000;
  return Math.round((startOfDay(end).getTime() - startOfDay(start).getTime()) / msPerDay);
}

export function buildDateRange(start: Date, count: number): Date[] {
  return Array.from({ length: count }, (_, index) => addDays(start, index));
}

export function formatDayHeader(date: Date, locale: string): { weekday: string; dateLabel: string } {
  const weekday = date.toLocaleDateString(locale, { weekday: 'short' });
  const dateLabel = date.toLocaleDateString(locale, {
    day: '2-digit',
    month: '2-digit',
  });
  return { weekday, dateLabel };
}

export function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function isToday(date: Date): boolean {
  return isSameDay(date, new Date());
}

const SOURCE_COLOR_MAP: Record<string, string> = {
  walkin: '#2563eb',
  direct: '#2563eb',
  booking: '#16a34a',
  agoda: '#f97316',
  traveloka: '#a855f7',
  expedia: '#0891b2',
  trip: '#d946ef',
  g2j: '#eab308',
  other: '#64748b',
};

const SOURCE_LABEL_MAP: Record<string, string> = {
  walkin: 'Direct',
  direct: 'Direct',
  booking: 'Booking.com',
  agoda: 'Agoda',
  traveloka: 'Traveloka',
  expedia: 'Expedia',
  trip: 'Trip.com',
  g2j: 'G2J',
  other: 'Other',
};

export function normalizeGuestSource(source?: string, otaSource?: string): string {
  let normalized = String(source || '').toLowerCase().trim();
  if ((!normalized || normalized === 'ota') && otaSource) {
    normalized = String(otaSource).toLowerCase().trim();
  }
  if (
    !normalized ||
    normalized === 'walk-in' ||
    normalized === 'walk_in' ||
    normalized === 'phone' ||
    normalized === 'regular' ||
    normalized === 'guest' ||
    normalized === 'khach le' ||
    normalized === 'khách lẻ'
  ) {
    return 'walkin';
  }
  if (normalized.includes('booking')) return 'booking';
  if (normalized.includes('agoda')) return 'agoda';
  if (normalized.includes('traveloka')) return 'traveloka';
  if (normalized.includes('expedia')) return 'expedia';
  if (normalized.includes('trip')) return 'trip';
  if (normalized.includes('g2j')) return 'g2j';
  return normalized || 'walkin';
}

export function getSourceMeta(sourceKey: string, provider?: string): { label: string; color: string } {
  if (provider) {
    return {
      label: provider,
      color: otaApi.getProviderColor(provider),
    };
  }
  const key = normalizeGuestSource(sourceKey);
  return {
    label: SOURCE_LABEL_MAP[key] || sourceKey || 'Direct',
    color: SOURCE_COLOR_MAP[key] || SOURCE_COLOR_MAP.other,
  };
}

export function bookingCoversDay(booking: CalendarBooking, day: Date): boolean {
  if (booking.status === 'cancelled') return false;
  const dayStart = startOfDay(day).getTime();
  const dayEnd = dayStart + 24 * 60 * 60 * 1000;
  const checkIn = startOfDay(booking.checkInDate).getTime();
  const checkOut = booking.checkOutDate
    ? startOfDay(booking.checkOutDate).getTime()
    : checkIn + 24 * 60 * 60 * 1000;
  return checkIn < dayEnd && checkOut > dayStart;
}

export function getDayOccupancy(
  roomIds: string[],
  bookings: CalendarBooking[],
  day: Date
): { occupied: number; total: number; percent: number } {
  const total = roomIds.length;
  if (!total) return { occupied: 0, total: 0, percent: 0 };

  const occupied = roomIds.filter((roomId) =>
    bookings.some((booking) => booking.roomId === roomId && bookingCoversDay(booking, day))
  ).length;

  return {
    occupied,
    total,
    percent: Math.round((occupied / total) * 100),
  };
}

export function getBookingBarLayout(
  booking: CalendarBooking,
  rangeStart: Date,
  totalDays: number
): { left: number; width: number; visible: boolean } {
  const rangeEnd = addDays(rangeStart, totalDays);
  const checkIn = startOfDay(booking.checkInDate);
  const checkOut = booking.checkOutDate
    ? startOfDay(booking.checkOutDate)
    : addDays(checkIn, 1);

  if (checkOut <= rangeStart || checkIn >= rangeEnd) {
    return { left: 0, width: 0, visible: false };
  }

  const visibleStart = checkIn < rangeStart ? rangeStart : checkIn;
  const visibleEnd = checkOut > rangeEnd ? rangeEnd : checkOut;
  const startIndex = differenceInCalendarDays(visibleStart, rangeStart);
  const spanDays = Math.max(1, differenceInCalendarDays(visibleEnd, visibleStart));

  return {
    left: startIndex * DAY_COL_WIDTH + 4,
    width: spanDays * DAY_COL_WIDTH - 8,
    visible: true,
  };
}

export function groupRoomsByCategory(
  rooms: Array<{ id: string; number: string; status: string; roomType?: string; type?: string }>
): RoomCategoryGroup[] {
  const groups = new Map<string, RoomCategoryGroup>();

  rooms.forEach((room) => {
    const category = room.roomType || room.type || 'Standard';
    if (!groups.has(category)) {
      groups.set(category, { category, rooms: [] });
    }
    groups.get(category)!.rooms.push({
      id: room.id,
      number: room.number,
      status: room.status,
      roomType: room.roomType || room.type,
    });
  });

  return Array.from(groups.values())
    .map((group) => ({
      ...group,
      rooms: [...group.rooms].sort((a, b) =>
        String(a.number).localeCompare(String(b.number), undefined, { numeric: true })
      ),
    }))
    .sort((a, b) => a.category.localeCompare(b.category));
}

export function getStatusColor(status: string): string {
  switch (status) {
    case 'checked_in':
    case 'occupied':
      return '#ef4444';
    case 'booked':
      return '#0ea5e9';
    case 'vacant':
      return '#22c55e';
    case 'cleaning':
      return '#3b82f6';
    case 'dirty':
      return '#f97316';
    case 'maintenance':
      return '#a855f7';
    case 'cancelled':
      return '#9ca3af';
    default:
      return '#64748b';
  }
}
