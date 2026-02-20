import { apiClient } from './client';
import { API_ENDPOINTS } from './config';
import { Booking, BookingStatus } from '@/types/hotel';

export interface ApiBooking {
  _id: string;
  guest?: {
    _id: string;
    name: string;
    email?: string;
    phone?: string;
  };
  guestName?: string;
  guestDetails?: {
    name?: string;
    email?: string;
    phone?: string;
    idNumber?: string;
    address?: string;
  };
  room?: {
    _id: string;
    roomNumber: string;
  };
  roomNumber?: string;
  checkInDate: string;
  checkOutDate: string;
  actualCheckInDate?: string;
  actualCheckOutDate?: string;
  status: string;
  bookingType?: string;
  rateType?: string;
  totalAmount: number;
  basePrice?: number;
  paidAmount?: number;
  paymentStatus?: string;
  paymentMethod?: string;
  deposit?: number;
  advancePayment?: number;
  additionalCharges?: Array<{ description?: string; amount?: number }> | number;
  discounts?: Array<{ description?: string; amount?: number }> | number;
  numberOfGuests?: {
    adults: number;
    children: number;
  };
  adults?: number;
  children?: number;
  source?: string;
  otaSource?: string;
  otaBookingId?: string;
  notes?: string;
  specialRequests?: string;
  createdAt: string;
  updatedAt: string;
}

const mapBookingStatus = (status: string): BookingStatus => {
  const statusMap: Record<string, BookingStatus> = {
    'confirmed': 'confirmed',
    'pending': 'confirmed',
    'checked_in': 'checked_in',
    'checkedIn': 'checked_in',
    'checked-in': 'checked_in',
    'checked_out': 'checked_out',
    'checkedOut': 'checked_out',
    'checked-out': 'checked_out',
    'cancelled': 'cancelled',
    'canceled': 'cancelled',
  };
  return statusMap[status] || 'confirmed';
};

const mapApiBookingToBooking = (apiBooking: ApiBooking): Booking => {
  const adults = Number(apiBooking.numberOfGuests?.adults ?? apiBooking.adults ?? 1);
  const children = Number(apiBooking.numberOfGuests?.children ?? apiBooking.children ?? 0);
  const bookingType = apiBooking.bookingType || apiBooking.rateType;
  const guestName = apiBooking.guest?.name || apiBooking.guestDetails?.name || apiBooking.guestName || 'Khách hàng';
  const guestEmail = apiBooking.guest?.email || apiBooking.guestDetails?.email;
  const guestPhone = apiBooking.guest?.phone || apiBooking.guestDetails?.phone;
  const guestIdNumber = apiBooking.guestDetails?.idNumber;
  const guestAddress = apiBooking.guestDetails?.address;
  const deposit = apiBooking.deposit ?? apiBooking.advancePayment;
  const additionalCharges = Array.isArray(apiBooking.additionalCharges) ? apiBooking.additionalCharges : undefined;
  const discounts = Array.isArray(apiBooking.discounts) ? apiBooking.discounts : undefined;

  return {
    id: apiBooking._id,
    guestId: apiBooking.guest?._id || '',
    guestName,
    guestEmail,
    guestPhone,
    guestIdNumber,
    guestAddress,
    roomId: apiBooking.room?._id || '',
    roomNumber: apiBooking.room?.roomNumber || apiBooking.roomNumber || '',
    checkIn: apiBooking.checkInDate?.split('T')[0] || '',
    checkOut: apiBooking.checkOutDate?.split('T')[0] || '',
    status: mapBookingStatus(apiBooking.status),
    bookingType: bookingType as Booking['bookingType'],
    rateType: bookingType as Booking['rateType'],
    totalAmount: apiBooking.totalAmount || 0,
    basePrice: apiBooking.basePrice,
    paidAmount: apiBooking.paidAmount || 0,
    paymentStatus: apiBooking.paymentStatus as Booking['paymentStatus'],
    paymentMethod: apiBooking.paymentMethod as Booking['paymentMethod'],
    adults,
    children,
    numberOfGuests: {
      adults,
      children
    },
    deposit: typeof deposit === 'number' ? deposit : undefined,
    advancePayment: typeof deposit === 'number' ? deposit : undefined,
    additionalCharges,
    discounts,
    source: apiBooking.source,
    otaSource: apiBooking.otaSource,
    otaBookingId: apiBooking.otaBookingId,
    notes: apiBooking.notes,
    specialRequests: apiBooking.specialRequests,
    createdAt: apiBooking.createdAt,
    updatedAt: apiBooking.updatedAt,
  };
};

export const bookingsApi = {
  getAll: async (): Promise<Booking[]> => {
    try {
      const response = await apiClient.get<ApiBooking[] | { data: ApiBooking[] }>(API_ENDPOINTS.BOOKINGS.BASE);
      const bookings = Array.isArray(response) ? response : (response?.data || []);
      return bookings.map(mapApiBookingToBooking);
    } catch (error) {
      console.warn('[bookingsApi.getAll] Error:', error);
      return [];
    }
  },

  getById: async (id: string): Promise<Booking | null> => {
    try {
      const response = await apiClient.get<ApiBooking>(API_ENDPOINTS.BOOKINGS.BY_ID(id));
      return mapApiBookingToBooking(response);
    } catch (error) {
      console.warn('[bookingsApi.getById] Error:', error);
      return null;
    }
  },

  create: async (bookingData: Partial<Booking>): Promise<Booking | null> => {
    try {
      const response = await apiClient.post<ApiBooking>(API_ENDPOINTS.BOOKINGS.BASE, bookingData);
      return mapApiBookingToBooking(response);
    } catch (error) {
      console.warn('[bookingsApi.create] Error:', error);
      return null;
    }
  },

  update: async (id: string, bookingData: Partial<Booking>): Promise<Booking | null> => {
    try {
      const response = await apiClient.put<ApiBooking>(API_ENDPOINTS.BOOKINGS.BY_ID(id), bookingData);
      return mapApiBookingToBooking(response);
    } catch (error) {
      console.warn('[bookingsApi.update] Error:', error);
      return null;
    }
  },

  cancel: async (id: string): Promise<boolean> => {
    try {
      await apiClient.post(API_ENDPOINTS.ROOMS.CANCEL_BOOKING(id), {});
      return true;
    } catch (error) {
      console.warn('[bookingsApi.cancel] Error:', error);
      return false;
    }
  },

  getByHotel: async (hotelId: string): Promise<Booking[]> => {
    try {
      const response = await apiClient.get<ApiBooking[] | { data: ApiBooking[] }>(
        `${API_ENDPOINTS.BOOKINGS.BASE}?hotelId=${hotelId}`
      );
      const bookings = Array.isArray(response) ? response : (response?.data || []);
      return bookings.map(mapApiBookingToBooking);
    } catch (error) {
      console.warn('[bookingsApi.getByHotel] Error:', error);
      return [];
    }
  },

  delete: async (id: string): Promise<boolean> => {
    try {
      await apiClient.delete(API_ENDPOINTS.BOOKINGS.BY_ID(id));
      return true;
    } catch (error) {
      console.warn('[bookingsApi.delete] Error:', error);
      return false;
    }
  },
};
