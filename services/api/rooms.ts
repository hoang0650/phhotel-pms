import { apiClient } from './client';
import { API_ENDPOINTS } from './config';
import { Room, RoomStatus } from '@/types/hotel';

export type RateType = 'hourly' | 'daily' | 'nightly' | 'weekly' | 'monthly';

export interface ApiRoomPricing {
  hourly?: number;
  daily?: number;
  nightly?: number;
  weekly?: number;
  monthly?: number;
  currency?: string;
}

export interface ApiRoomGuestInfo {
  name?: string;
  phone?: string;
  email?: string;
  idNumber?: string;
  guestSource?: string;
}

export interface ApiRoomGuestDetails {
  name?: string;
  phone?: string;
  email?: string;
  idNumber?: string;
  source?: string;
}

export interface ApiRoomSelectedService {
  serviceId?: string;
  serviceName?: string;
  name?: string;
  price?: number;
  unitPrice?: number;
  quantity?: number;
  totalPrice?: number;
}

export interface ApiRoomBooking {
  _id?: string;
  checkInDate?: string;
  checkOutDate?: string;
  actualCheckInDate?: string;
  actualCheckOutDate?: string;
  rateType?: RateType;
  bookingType?: RateType;
  guestInfo?: ApiRoomGuestInfo;
  guestDetails?: ApiRoomGuestDetails;
  guestName?: string;
  checkinTime?: string;
  advancePayment?: number;
  deposit?: number;
  additionalCharges?: Array<{ amount?: number }> | number;
  discounts?: Array<{ amount?: number }> | number;
  discount?: number;
  selectedServices?: ApiRoomSelectedService[];
  services?: ApiRoomSelectedService[];
  servicesTotal?: number;
  totalAmount?: number;
  paymentMethod?: string;
}

export interface ApiRoomEvent {
  _id?: string;
  type?: string;
  roomId?: string | { _id?: string; roomNumber?: string };
  roomNumber?: string;
  guestInfo?: ApiRoomGuestInfo;
  payment?: number;
  totalAmount?: number;
  advancePayment?: number;
  paymentMethod?: string;
  checkinTime?: string;
  checkoutTime?: string;
  createdAt?: string;
}

export interface RoomEvent {
  id: string;
  type: 'checkin' | 'checkout' | 'maintenance' | 'transfer' | 'booking' | 'cancel_booking' | 'guest_out' | 'guest_return' | string;
  roomId: string;
  roomNumber: string;
  guestName: string;
  payment?: number;
  totalAmount?: number;
  advancePayment?: number;
  paymentMethod?: 'cash' | 'card' | 'bank_transfer' | string;
  checkinTime?: string;
  checkoutTime?: string;
  createdAt: string;
}

const mapApiRoomEventToRoomEvent = (e: ApiRoomEvent): RoomEvent => {
  const roomId = typeof e.roomId === 'object' ? (e.roomId?._id || '') : (e.roomId || '');
  const roomNumber = e.roomNumber || (typeof e.roomId === 'object' ? (e.roomId?.roomNumber || '') : '');
  return {
    id: e._id || '',
    type: (e.type || 'checkin') as RoomEvent['type'],
    roomId,
    roomNumber,
    guestName: e.guestInfo?.name || '',
    payment: typeof e.payment === 'number' ? e.payment : undefined,
    totalAmount: typeof e.totalAmount === 'number' ? e.totalAmount : undefined,
    advancePayment: typeof e.advancePayment === 'number' ? e.advancePayment : undefined,
    paymentMethod: (e.paymentMethod || 'cash') as RoomEvent['paymentMethod'],
    checkinTime: e.checkinTime,
    checkoutTime: e.checkoutTime,
    createdAt: e.createdAt || new Date().toISOString(),
  };
};

export interface ApiRoom {
  _id: string;
  roomNumber: string;
  roomType?: string;
  type?: string;
  floor: number;
  price: number;
  pricing?: ApiRoomPricing;
  firstHourRate?: number;
  additionalHourRate?: number;
  capacity: number | { adults?: number; children?: number };
  amenities: string[];
  status: string;
  guestStatus?: 'in' | 'out';
  currentGuest?: {
    name: string;
    checkOutDate?: string;
  };
  currentBooking?: string | ApiRoomBooking;
  isAvailable: boolean;
  createdAt: string;
  updatedAt: string;
}

const mapRoomStatus = (status: string): RoomStatus => {
  const normalizedStatus = status?.toLowerCase();
  if (normalizedStatus === 'maintenance') return 'maintenance';
  if (normalizedStatus === 'cleaning') return 'cleaning';
  if (normalizedStatus === 'dirty') return 'dirty';
  if (normalizedStatus === 'booked') return 'booked';
  if (normalizedStatus === 'occupied') return 'occupied';
  if (normalizedStatus === 'vacant') return 'vacant';
  // Fallback
  return 'vacant';
};

const normalizeCapacity = (capacity: ApiRoom['capacity']) => {
  if (typeof capacity === 'number') return capacity;
  if (capacity && typeof capacity === 'object') {
    const adults = Number(capacity.adults || 0);
    const children = Number(capacity.children || 0);
    return adults + children;
  }
  return 0;
};

export const calculateRoomPriceLocal = (
  room: Room,
  checkInTime: Date,
  rateType: RateType,
  checkOutTime?: Date
) => {
  const now = checkOutTime ?? new Date();
  const durationInHours = Math.ceil((now.getTime() - checkInTime.getTime()) / (1000 * 60 * 60));
  const durationInDays = Math.ceil(durationInHours / 24);

  const hourlyRate = room.pricing?.hourly || room.firstHourRate || 0;
  const dailyRate = room.pricing?.daily || 0;
  const nightlyRate = room.pricing?.nightly || 0;
  const weeklyRate = room.pricing?.weekly || 0;
  const monthlyRate = room.pricing?.monthly || 0;
  const additionalHourRate = room.additionalHourRate || (hourlyRate * 0.8);

  let roomPrice = 0;

  switch (rateType) {
    case 'hourly':
      if (room.firstHourRate && room.additionalHourRate) {
        roomPrice = room.firstHourRate;
        if (durationInHours > 1) {
          roomPrice += (durationInHours - 1) * room.additionalHourRate;
        }
      } else {
        roomPrice = hourlyRate * durationInHours;
      }
      break;
    case 'daily': {
      const checkInDateOnly = new Date(checkInTime);
      checkInDateOnly.setHours(0, 0, 0, 0);
      const checkOutDateOnly = new Date(now);
      checkOutDateOnly.setHours(0, 0, 0, 0);
      const actualDays = Math.max(1, Math.ceil((checkOutDateOnly.getTime() - checkInDateOnly.getTime()) / (1000 * 60 * 60 * 24)));
      roomPrice = dailyRate * actualDays;
      break;
    }
    case 'nightly': {
      const checkInDateForNightly = new Date(checkInTime);
      checkInDateForNightly.setHours(0, 0, 0, 0);
      const checkOutDateForNightly = new Date(now);
      checkOutDateForNightly.setHours(0, 0, 0, 0);
      const actualNights = Math.max(1, Math.ceil((checkOutDateForNightly.getTime() - checkInDateForNightly.getTime()) / (1000 * 60 * 60 * 24)));
      roomPrice = nightlyRate * actualNights;
      break;
    }
    case 'weekly':
      if (weeklyRate > 0) {
        const weeks = Math.max(1, Math.ceil(durationInDays / 7));
        roomPrice = weeklyRate * weeks;
      } else {
        const daysFromWeekly = Math.max(1, Math.ceil(durationInDays / 7) * 7);
        roomPrice = dailyRate * daysFromWeekly;
      }
      break;
    case 'monthly':
      if (monthlyRate > 0) {
        const months = Math.max(1, Math.ceil(durationInDays / 30));
        roomPrice = monthlyRate * months;
      } else {
        const daysFromMonthly = Math.max(1, Math.ceil(durationInDays / 30) * 30);
        roomPrice = dailyRate * daysFromMonthly;
      }
      break;
    default:
      roomPrice = hourlyRate * durationInHours;
  }

  return roomPrice;
};

export const calculateRoomTotalAmount = (
  roomPrice: number,
  serviceTotal = 0,
  additionalCharges = 0,
  discount = 0,
  advancePayment = 0
) => {
  return roomPrice + serviceTotal + additionalCharges - discount - advancePayment;
};

const mapApiRoomToRoom = (apiRoom: ApiRoom): Room => {
  const normalizedCapacity = normalizeCapacity(apiRoom.capacity);
  const resolvedRoomType = apiRoom.roomType || apiRoom.type || 'standard';
  const mappedPrice = apiRoom.pricing?.daily || apiRoom.pricing?.nightly || apiRoom.pricing?.hourly || 0;
  const booking = apiRoom.currentBooking && typeof apiRoom.currentBooking === 'object' ? apiRoom.currentBooking : null;
  const guestName = booking?.guestInfo?.name
    || booking?.guestDetails?.name
    || booking?.guestName
    || apiRoom.currentGuest?.name
    || '';
  const checkInTime = booking?.actualCheckInDate
    || booking?.checkInDate
    || booking?.checkinTime;
  const checkOutDate = booking?.actualCheckOutDate
    || booking?.checkOutDate
    || apiRoom.currentGuest?.checkOutDate;
  const rateType = (booking?.rateType || booking?.bookingType || 'hourly') as RateType;
  const guestPhone = booking?.guestInfo?.phone
    || booking?.guestDetails?.phone
    || '';
  const guestIdNumber = booking?.guestInfo?.idNumber
    || booking?.guestDetails?.idNumber
    || '';
  const selectedServices = Array.isArray(booking?.selectedServices) ? booking?.selectedServices : [];
  const fallbackServices = Array.isArray(booking?.services) ? booking?.services : [];
  const normalizeServiceItem = (service: ApiRoomSelectedService) => {
    const resolvedServiceId = (typeof service.serviceId === 'string' ? service.serviceId : (service.serviceId as any)?._id)
      || (service as any)?.service?._id
      || (service as any)?._id
      || '';
    const resolvedServiceName = service.serviceName
      || service.name
      || (service as any)?.service?.name
      || '';
    const resolvedPrice = Number(service.price ?? service.unitPrice ?? (service as any)?.service?.price ?? 0);
    const resolvedQuantity = Number(service.quantity ?? 1);
    const resolvedTotal = Number(service.totalPrice ?? resolvedPrice * resolvedQuantity);
    return {
      serviceId: resolvedServiceId,
      serviceName: resolvedServiceName || service.name || '',
      name: service.name || resolvedServiceName,
      price: resolvedPrice,
      unitPrice: Number(service.unitPrice ?? resolvedPrice),
      quantity: resolvedQuantity,
      totalPrice: resolvedTotal
    };
  };
  const normalizedServices = (selectedServices.length > 0 ? selectedServices : fallbackServices).map(normalizeServiceItem);
  const servicesTotalFromBooking = Number(booking?.servicesTotal) || 0;
  const computedServicesTotal = normalizedServices.reduce(
    (sum, service) => sum + (Number(service.totalPrice) || (Number(service.price || service.unitPrice) || 0) * (Number(service.quantity) || 1)),
    0
  );
  const additionalCharges = Array.isArray(booking?.additionalCharges)
    ? booking?.additionalCharges.reduce((sum, charge) => sum + (Number(charge?.amount) || 0), 0)
    : Number(booking?.additionalCharges) || 0;
  const discount = Array.isArray(booking?.discounts)
    ? booking?.discounts.reduce((sum, item) => sum + (Number(item?.amount) || 0), 0)
    : Number(booking?.discount ?? booking?.discounts) || 0;
  const advancePayment = Number(booking?.advancePayment ?? booking?.deposit) || 0;
  const paymentMethod = booking?.paymentMethod || undefined;
  const baseRoom: Room = {
    id: apiRoom._id,
    number: apiRoom.roomNumber,
    floor: apiRoom.floor || 1,
    type: (resolvedRoomType?.toLowerCase() || 'standard') as Room['type'],
    roomType: resolvedRoomType,
    status: mapRoomStatus(apiRoom.status),
    guestStatus: apiRoom.guestStatus,
    price: apiRoom.price || mappedPrice,
    capacity: normalizedCapacity > 0 ? normalizedCapacity : 2,
    amenities: apiRoom.amenities || [],
    pricing: apiRoom.pricing,
    firstHourRate: apiRoom.firstHourRate,
    additionalHourRate: apiRoom.additionalHourRate,
    currentGuest: guestName || undefined,
    checkoutDate: checkOutDate,
    checkInTime: checkInTime,
    rateType: rateType,
    paymentMethod: paymentMethod as Room['paymentMethod'],
    guestPhone: guestPhone || undefined,
    guestIdNumber: guestIdNumber || undefined,
    advancePayment: advancePayment || 0,
    additionalCharges: additionalCharges || 0,
    discount: discount || 0,
    selectedServices: normalizedServices,
    servicesTotal: servicesTotalFromBooking || computedServicesTotal,
    totalAmount: Number(booking?.totalAmount) || 0,
  };
  if (baseRoom.status === 'occupied' && checkInTime) {
    const parsedCheckIn = new Date(checkInTime);
    if (!isNaN(parsedCheckIn.getTime())) {
      const computedPrice = calculateRoomPriceLocal(baseRoom, parsedCheckIn, rateType);
      if (!isNaN(computedPrice) && computedPrice > 0) {
        baseRoom.price = computedPrice;
      }
    }
  }
  return baseRoom;
};

export const roomsApi = {
  getAll: async (hotelId?: string): Promise<Room[]> => {
    try {
      const endpoint = hotelId 
        ? `${API_ENDPOINTS.ROOMS.BASE}?hotelId=${hotelId}` 
        : API_ENDPOINTS.ROOMS.BASE;
      const response = await apiClient.get<ApiRoom[]>(endpoint);
      const rooms = Array.isArray(response) ? response : [];
      return rooms.map(mapApiRoomToRoom);
    } catch (error) {
      console.error('[roomsApi.getAll] Error:', error);
      return [];
    }
  },

  getById: async (id: string): Promise<Room | null> => {
    try {
      const response = await apiClient.get<ApiRoom>(API_ENDPOINTS.ROOMS.BY_ID(id));
      return mapApiRoomToRoom(response);
    } catch (error) {
      console.error('[roomsApi.getById] Error:', error);
      return null;
    }
  },

  getAvailable: async (hotelId?: string): Promise<Room[]> => {
    try {
      const endpoint = hotelId 
        ? `${API_ENDPOINTS.ROOMS.AVAILABLE}?hotelId=${hotelId}` 
        : API_ENDPOINTS.ROOMS.AVAILABLE;
      const response = await apiClient.get<ApiRoom[]>(endpoint);
      const rooms = Array.isArray(response) ? response : [];
      return rooms.map(mapApiRoomToRoom);
    } catch (error) {
      console.error('[roomsApi.getAvailable] Error:', error);
      return [];
    }
  },

  create: async (roomData: Partial<Room>): Promise<Room | null> => {
    try {
      const response = await apiClient.post<ApiRoom>(API_ENDPOINTS.ROOMS.BASE, roomData);
      return mapApiRoomToRoom(response);
    } catch (error) {
      console.error('[roomsApi.create] Error:', error);
      return null;
    }
  },

  update: async (id: string, roomData: Partial<Room>): Promise<Room | null> => {
    try {
      const response = await apiClient.put<ApiRoom>(API_ENDPOINTS.ROOMS.BY_ID(id), roomData);
      return mapApiRoomToRoom(response);
    } catch (error) {
      console.error('[roomsApi.update] Error:', error);
      return null;
    }
  },

  checkIn: async (id: string, payload: unknown) => {
    return apiClient.post(API_ENDPOINTS.ROOMS.CHECKIN(id), payload);
  },

  checkOut: async (id: string, payload?: unknown) => {
    return apiClient.post(API_ENDPOINTS.ROOMS.CHECKOUT(id), payload ?? {});
  },

  markClean: async (id: string) => {
    return apiClient.post(`/rooms/clean/${id}`, {});
  },

  updateStatus: async (id: string, status: string) => {
    return apiClient.patch(`/rooms/${id}/status`, { status });
  },

  updateCheckinInfo: async (id: string, payload: unknown) => {
    return apiClient.patch(`/rooms/${id}/checkin-info`, payload);
  },

  transferRoom: async (fromRoomId: string, toRoomId: string, payload?: unknown) => {
    return apiClient.post('/rooms/transfer', { fromRoomId, toRoomId, ...((payload as object) || {}) });
  },
  
  guestOut: async (id: string, note?: string, staffId?: string) => {
    return apiClient.post(API_ENDPOINTS.ROOMS.GUEST_OUT(id), { note, staffId });
  },
  
  guestReturn: async (id: string, staffId?: string) => {
    return apiClient.post(API_ENDPOINTS.ROOMS.GUEST_RETURN(id), { staffId });
  },
  
  getEventsByHotel: async (hotelId: string, options?: { limit?: number; skip?: number; types?: string[] }): Promise<RoomEvent[]> => {
    try {
      const params = new URLSearchParams({ hotelId });
      if (options?.limit !== undefined) params.append('limit', String(options.limit));
      if (options?.skip !== undefined) params.append('skip', String(options.skip));
      if (options?.types && options.types.length > 0) {
        params.append('types', JSON.stringify(options.types));
      }
      const endpoint = `${API_ENDPOINTS.ROOMS.BASE}/events?${params.toString()}`;
      const response = await apiClient.get<ApiRoomEvent[] | { data: ApiRoomEvent[] }>(endpoint);
      const events = Array.isArray(response) ? response : (response as any)?.data || [];
      return events.map(mapApiRoomEventToRoomEvent);
    } catch (error) {
      console.error('[roomsApi.getEventsByHotel] Error:', error);
      return [];
    }
  },
};
