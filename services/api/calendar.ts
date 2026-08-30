import { apiClient } from './client';
import { API_ENDPOINTS } from './config';
import { otaApi } from './ota';
import { roomsApi } from './rooms';
import {
  CalendarBooking,
  addDays,
  getSourceMeta,
  normalizeGuestSource,
} from '@/utils/booking-calendar';
import { Room } from '@/types/hotel';

export interface RoomBookingApiItem {
  _id?: string;
  bookingId?: string;
  roomId?: string;
  roomNumber?: string;
  hotelId?: string;
  guestInfo?: {
    name?: string;
    phone?: string;
    guestSource?: string;
  };
  checkInDate?: string;
  checkOutDate?: string;
  status?: string;
  source?: string;
  otaSource?: string;
}

export interface RoomBookingsResponse {
  message?: string;
  bookings: RoomBookingApiItem[];
}

export interface CalendarData {
  rooms: Room[];
  bookings: CalendarBooking[];
}

function mapPmsBooking(item: RoomBookingApiItem): CalendarBooking | null {
  if (!item.checkInDate) return null;
  const guestName =
    item.guestInfo?.name ||
    'Khách đặt trước';
  const guestSource = normalizeGuestSource(
    item.guestInfo?.guestSource || item.source,
    item.otaSource
  );
  const meta = getSourceMeta(guestSource);

  return {
    id: String(item._id || item.bookingId || `${item.roomId}_${item.checkInDate}`),
    roomId: item.roomId ? String(item.roomId) : undefined,
    roomNumber: item.roomNumber,
    guestName,
    checkInDate: new Date(item.checkInDate),
    checkOutDate: item.checkOutDate ? new Date(item.checkOutDate) : undefined,
    status: item.status || 'booked',
    source: 'pms',
    guestSource,
    color: meta.color,
    label: `${meta.label} - ${guestName}`,
  };
}

function dedupeBookings(bookings: CalendarBooking[]): CalendarBooking[] {
  const seen = new Set<string>();
  const result: CalendarBooking[] = [];

  bookings.forEach((booking) => {
    const key = [
      booking.roomId || 'unassigned',
      booking.checkInDate.toISOString(),
      booking.guestName,
      booking.source,
    ].join('|');
    if (seen.has(key)) return;
    seen.add(key);
    result.push(booking);
  });

  return result;
}

export const calendarApi = {
  getRoomBookings: async (params: {
    hotelId: string;
    startDate: Date;
    endDate: Date;
    limit?: number;
  }): Promise<CalendarBooking[]> => {
    const query = new URLSearchParams({
      hotelId: params.hotelId,
      startDate: params.startDate.toISOString(),
      endDate: params.endDate.toISOString(),
      limit: String(params.limit || 300),
    });

    const response = await apiClient.get<RoomBookingsResponse>(
      `${API_ENDPOINTS.ROOMS.BOOKINGS}?${query.toString()}`
    );

    return (response.bookings || [])
      .map(mapPmsBooking)
      .filter((item): item is CalendarBooking => Boolean(item));
  },

  getOtaCalendarBookings: async (
    hotelId: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<CalendarBooking[]> => {
    const response = await otaApi.getCalendarBookings(hotelId, {
      startDate: startDate?.toISOString(),
      endDate: endDate?.toISOString(),
    });

    return (response.data || []).map((item) => {
      const provider = item.provider || 'OTA';
      const guestName = item.guestName || 'Khách OTA';
      const color = item.color || otaApi.getProviderColor(provider);
      const roomId =
        typeof item.roomId === 'object' && item.roomId
          ? String((item.roomId as { _id?: string })._id || '')
          : item.roomId
            ? String(item.roomId)
            : undefined;

      return {
        id: String(item.id || item.otaBookingId),
        roomId,
        roomNumber: item.roomNumber,
        guestName,
        checkInDate: new Date(item.start),
        checkOutDate: item.end ? new Date(item.end) : undefined,
        status: item.status || 'confirmed',
        source: 'ota' as const,
        provider,
        color,
        label: `${provider} - ${guestName}`,
      };
    });
  },

  getCalendarData: async (params: {
    hotelId: string;
    rangeStart: Date;
    dayCount: number;
  }): Promise<CalendarData> => {
    const rangeEnd = addDays(params.rangeStart, params.dayCount + 7);

    const [rooms, pmsBookings, otaBookings] = await Promise.all([
      roomsApi.getAll(params.hotelId, { lite: true }),
      calendarApi.getRoomBookings({
        hotelId: params.hotelId,
        startDate: addDays(params.rangeStart, -7),
        endDate: rangeEnd,
        limit: 300,
      }),
      calendarApi.getOtaCalendarBookings(params.hotelId, addDays(params.rangeStart, -7), rangeEnd),
    ]);

    const pmsKeys = new Set(
      pmsBookings.map((booking) =>
        `${booking.roomId || ''}|${booking.checkInDate.toISOString()}|${booking.guestName}`
      )
    );

    const mergedOta = otaBookings.filter((booking) => {
      const key = `${booking.roomId || ''}|${booking.checkInDate.toISOString()}|${booking.guestName}`;
      return !pmsKeys.has(key);
    });

    return {
      rooms,
      bookings: dedupeBookings([...pmsBookings, ...mergedOta]),
    };
  },
};
