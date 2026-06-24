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
  rateType?: RateType;
  payment?: number;
  totalAmount?: number;
  advancePayment?: number;
  additionalCharges?: number;
  discount?: number;
  selectedServices?: ApiRoomSelectedService[];
  servicesTotal?: number;
  paymentMethod?: string;
  checkinTime?: string;
  checkoutTime?: string;
  notes?: string;
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

export interface ApiRoomSession {
  roomId: string;
  roomNumber: number;
  roomType: string;
  hotelId: string;
  checkinTime?: string;
  guestInfo?: ApiRoomGuestInfo;
  paymentMethod?: string;
  rateType?: RateType;
  advancePayment?: number;
  additionalCharges?: number;
  totalPrice?: number;
  discount?: number;
  notes?: string;
  selectedServices: ApiRoomSelectedService[];
}

export interface RoomSessionData {
  bookingId?: string;
  checkInDate?: string;
  expectedCheckoutTime?: string;
  rateType?: RateType;
  bookingType?: RateType;
  guestInfo?: ApiRoomGuestInfo;
  totalAmount?: number;
  payment?: number;
  roomStatus?: RoomStatus;
  userId?: string;
  staffId?: string;
  additionalCharges?: number;
  discount?: number;
  advancePayment?: number;
  [key: string]: any; 
}
export interface HotelRoomSessions {
  [roomId: string]: string | RoomSessionData; // Redis hash có thể trả về chuỗi JSON string hoặc object đã parse
}

export const mergeRoomWithSession = (room: Room, sessionData: any): Room => {
  if (!sessionData) return room;

  const mergedRoom = {
    ...room,
    status: sessionData.roomStatus || sessionData.status || room.status,
  } as any;

  // Gán động thuộc tính mở rộng
  mergedRoom.currentBooking = sessionData;

  return mergedRoom as Room;
};

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
  priceSettings?: Record<string, any>;
  priceConfig?: Record<string, any> | null;
  events?: ApiRoomEvent[];
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

  const priceConfig = (room as any)?.priceConfig;
  const priceSettings = (room as any)?.priceSettings;
  const nightlyStartTime =
    priceConfig?.nightlyRates?.startTime || priceSettings?.nightlyStartTime || '20:00';
  const nightlyEndTime =
    priceConfig?.nightlyRates?.endTime || priceSettings?.nightlyEndTime || '12:00';
  const dailyStartTime = '12:00';
  const dailyCheckOutTime =
    priceConfig?.dailyRates?.checkOutTime || priceSettings?.dailyEndTime || '12:00';
  const nightlyEarlyCheckinSurcharge =
    priceConfig?.nightlyRates?.earlyCheckinSurcharge ||
    priceSettings?.nightlyEarlyCheckinSurcharge ||
    0;
  const nightlyLateCheckoutSurcharge =
    priceConfig?.nightlyRates?.lateCheckoutSurcharge ||
    priceSettings?.nightlyLateCheckoutSurcharge ||
    0;
  const dailyEarlyCheckinSurcharge =
    priceConfig?.dailyRates?.earlyCheckinSurcharge ||
    priceSettings?.dailyEarlyCheckinSurcharge ||
    0;
  const dailyLateCheckoutFee =
    priceConfig?.dailyRates?.latecheckOutFee || priceSettings?.dailyLateCheckoutFee || 0;

  const parseTime = (timeStr: string) => {
    const parts = timeStr.split(':');
    return {
      hour: parseInt(parts[0]) || 0,
      minute: parseInt(parts[1]) || 0,
    };
  };

  const calculateEarlyHours = (actualTime: Date, standardTime: string): number => {
    const actual = parseTime(`${actualTime.getHours()}:${actualTime.getMinutes()}`);
    const standard = parseTime(standardTime);
    const actualMinutes = actual.hour * 60 + actual.minute;
    const standardMinutes = standard.hour * 60 + standard.minute;
    if (actualMinutes < standardMinutes) {
      const earlyMinutes = standardMinutes - actualMinutes;
      return Math.ceil(earlyMinutes / 60);
    }
    return 0;
  };

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
      if (checkInTime) {
        const checkInMinutes = checkInTime.getHours() * 60 + checkInTime.getMinutes();
        const [startHour, startMinute] = dailyStartTime.split(':').map(Number);
        const startTimeMinutes = startHour * 60 + startMinute;
        if (checkInMinutes < startTimeMinutes) {
          const earlyCheckinHours = calculateEarlyHours(checkInTime, dailyStartTime);
          if (earlyCheckinHours > 0 && dailyEarlyCheckinSurcharge > 0) {
            roomPrice += earlyCheckinHours * dailyEarlyCheckinSurcharge;
          }
        }
      }
      if (now) {
        const checkOutDateOnlyLocal = new Date(now);
        checkOutDateOnlyLocal.setHours(0, 0, 0, 0);
        const checkInDateOnlyLocal = new Date(checkInTime);
        checkInDateOnlyLocal.setHours(0, 0, 0, 0);
        const isNextDay = checkOutDateOnlyLocal.getTime() > checkInDateOnlyLocal.getTime();
        const checkOutMinutes = now.getHours() * 60 + now.getMinutes();
        const [checkOutHour, checkOutMinute] = dailyCheckOutTime.split(':').map(Number);
        const checkOutTimeMinutes = checkOutHour * 60 + checkOutMinute;
        if (isNextDay && checkOutMinutes > checkOutTimeMinutes && dailyLateCheckoutFee > 0) {
          const lateMinutes = checkOutMinutes - checkOutTimeMinutes;
          const lateCheckoutHours = Math.ceil(lateMinutes / 60);
          roomPrice += lateCheckoutHours * dailyLateCheckoutFee;
        }
      }
      break;
    }
    case 'nightly': {
      const checkInDateForNightly = new Date(checkInTime);
      checkInDateForNightly.setHours(0, 0, 0, 0);
      const checkOutDateForNightly = new Date(now);
      checkOutDateForNightly.setHours(0, 0, 0, 0);
      const actualNights = Math.max(1, Math.ceil((checkOutDateForNightly.getTime() - checkInDateForNightly.getTime()) / (1000 * 60 * 60 * 24)));
      roomPrice = nightlyRate * actualNights;
      if (checkInTime) {
        const checkInMinutes = checkInTime.getHours() * 60 + checkInTime.getMinutes();
        const [startHour, startMinute] = nightlyStartTime.split(':').map(Number);
        const startTimeMinutes = startHour * 60 + startMinute;
        const [endHour, endMinute] = nightlyEndTime.split(':').map(Number);
        const endTimeMinutes = endHour * 60 + endMinute;
        const isInNightlyTime = checkInMinutes >= startTimeMinutes || checkInMinutes <= endTimeMinutes;
        if (!isInNightlyTime) {
          const earlyCheckinHours = calculateEarlyHours(checkInTime, nightlyStartTime);
          if (earlyCheckinHours > 0 && nightlyEarlyCheckinSurcharge > 0) {
            roomPrice += earlyCheckinHours * nightlyEarlyCheckinSurcharge;
          }
        }
      }
      if (now) {
        const checkOutDateOnly = new Date(now);
        checkOutDateOnly.setHours(0, 0, 0, 0);
        const checkInDateOnly = new Date(checkInTime);
        checkInDateOnly.setHours(0, 0, 0, 0);
        const isNextDay = checkOutDateOnly.getTime() > checkInDateOnly.getTime();
        const checkOutMinutes = now.getHours() * 60 + now.getMinutes();
        const [endHour, endMinute] = nightlyEndTime.split(':').map(Number);
        const endTimeMinutes = endHour * 60 + endMinute;
        if (isNextDay && checkOutMinutes > endTimeMinutes && nightlyLateCheckoutSurcharge > 0) {
          const lateMinutes = checkOutMinutes - endTimeMinutes;
          const lateCheckoutHours = Math.ceil(lateMinutes / 60);
          roomPrice += lateCheckoutHours * nightlyLateCheckoutSurcharge;
        }
      }
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
  const events = Array.isArray(apiRoom.events) ? apiRoom.events : [];
  const latestCheckinEvent = [...events]
    .filter((event) => event?.type === 'checkin' && event?.checkinTime)
    .sort((a, b) => {
      const aTime = new Date(a.checkinTime || 0).getTime();
      const bTime = new Date(b.checkinTime || 0).getTime();
      return bTime - aTime;
    })[0];
  const guestName = booking?.guestInfo?.name
    || booking?.guestDetails?.name
    || booking?.guestName
    || latestCheckinEvent?.guestInfo?.name
    || apiRoom.currentGuest?.name
    || '';
  const checkInTime = booking?.actualCheckInDate
    || booking?.checkInDate
    || booking?.checkinTime
    || latestCheckinEvent?.checkinTime;
  const checkOutDate = booking?.actualCheckOutDate
    || booking?.checkOutDate
    || apiRoom.currentGuest?.checkOutDate;
  const rateType = (booking?.rateType || booking?.bookingType || latestCheckinEvent?.rateType || 'hourly') as RateType;
  const guestPhone = booking?.guestInfo?.phone
    || booking?.guestDetails?.phone
    || latestCheckinEvent?.guestInfo?.phone
    || '';
  const guestIdNumber = booking?.guestInfo?.idNumber
    || booking?.guestDetails?.idNumber
    || latestCheckinEvent?.guestInfo?.idNumber
    || '';
  const selectedServices = Array.isArray(booking?.selectedServices)
    ? booking?.selectedServices
    : (Array.isArray(latestCheckinEvent?.selectedServices) ? latestCheckinEvent.selectedServices : []);
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
    : Number(booking?.additionalCharges ?? latestCheckinEvent?.additionalCharges) || 0;
  const discount = Array.isArray(booking?.discounts)
    ? booking?.discounts.reduce((sum, item) => sum + (Number(item?.amount) || 0), 0)
    : Number(booking?.discount ?? booking?.discounts ?? latestCheckinEvent?.discount) || 0;
  const advancePayment = Number(booking?.advancePayment ?? booking?.deposit ?? latestCheckinEvent?.advancePayment) || 0;
  const paymentMethod = booking?.paymentMethod || latestCheckinEvent?.paymentMethod || undefined;
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
    totalAmount: Number(booking?.totalAmount ?? latestCheckinEvent?.totalAmount) || 0,
  };
  const baseRoomAny = baseRoom as any;
  baseRoomAny.priceConfig = apiRoom.priceConfig || null;
  baseRoomAny.priceSettings = apiRoom.priceSettings || null;
  baseRoomAny.events = events;
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
      console.warn('[roomsApi.getAll] Error:', error);
      return [];
    }
  },

  getRoomSessions: async (hotelId: string): Promise<Record<string, RoomSessionData>> => {
    try {
      // 1. Chặn an toàn các chuỗi không hợp lệ từ Mobile gửi lên trước khi gọi API
      if (!hotelId || hotelId === 'undefined' || hotelId === 'null' || String(hotelId).trim() === '') {
        return {};
      }

      // 2. CHỈ TRUYỀN 1 THAM SỐ: Khớp chuẩn cấu trúc signature của apiClient.get(url)
      const endpoint = `/sessions/rooms?hotelId=${hotelId}`;
      const response = await apiClient.get<HotelRoomSessions>(endpoint);
      
      const normalizedSessions: Record<string, RoomSessionData> = {};
      
      // 3. Chuẩn hóa và ép kiểu dữ liệu trả về an toàn từ Redis hash
      if (response && typeof response === 'object') {
        Object.entries(response).forEach(([roomId, value]) => {
          try {
            // Nếu dữ liệu Redis lưu dạng JSON string thô, tiến hành giải mã an toàn
            if (typeof value === 'string') {
              normalizedSessions[roomId] = JSON.parse(value);
            } else {
              normalizedSessions[roomId] = value as RoomSessionData;
            }
          } catch (e) {
            console.error(`[roomsApi] Lỗi parse JSON session cho phòng ${roomId}:`, e);
          }
        });
      }
      
      return normalizedSessions;
    } catch (error: any) {
      // Bọc catch nhẹ nhàng để nếu xảy ra lỗi timeout mạng, App Mobile không bị văng/crash màn hình chính
      console.warn('[roomsApi.getRoomSessions] Lỗi kết nối hoặc Timeout:', error?.message || error);
      return {};
    }
  },

  updateRoomSession: async (payload: {
    hotelId: string;
    roomId: string;
    sessionData: Partial<ApiRoomSession>;
  }): Promise<any> => {
    try {
      // Backend nhận dữ liệu từ req.body gồm: hotelId, roomId, sessionData
      // Tuỳ thuộc vào cấu hình route của bạn, endpoint có thể là '/sessions/update'
      const endpoint = `/sessions/update`;
      
      const response = await apiClient.post<any>(endpoint, payload);
      return response;
    } catch (error) {
      console.warn('[roomsApi.updateRoomSession] Error:', error);
      throw error;
    }
  },

  getRoomsWithLiveSessions: async (hotelId: string): Promise<Room[]> => {
    if (!hotelId || hotelId.trim() === '') {
      console.warn('[roomsApi] hotelId bị rỗng, hủy gọi API.');
      return [];
    }
    try {
      // 1. Chạy lấy dữ liệu
      const [roomsResponse, sessionsMap] = await Promise.all([
        apiClient.get<Room[] | { data: Room[] }>(`${API_ENDPOINTS.ROOMS.BASE}?hotelId=${hotelId}`),
        roomsApi.getRoomSessions(hotelId)
      ]);

      const rooms = Array.isArray(roomsResponse) ? roomsResponse : (roomsResponse as any)?.data || [];

      // 2. Map dữ liệu
      return rooms.map((room: Room) => {
        const roomIdStr = String(room.id || (room as any)._id || '');
        const liveSession = sessionsMap[roomIdStr] || null;
        return mergeRoomWithSession(room, liveSession);
      });
    } catch (error) {
      console.error('[roomsApi.getRoomsWithLiveSessions] Lỗi kết hợp dữ liệu:', error);
      
      // FALLBACK: Trả về danh sách phòng cơ bản nếu bị timeout
      try {
        console.log('Đang thử lấy danh sách phòng cơ bản...');
        const fallbackResponse = await apiClient.get<Room[] | { data: Room[] }>(`${API_ENDPOINTS.ROOMS.BASE}?hotelId=${hotelId}`);
        return Array.isArray(fallbackResponse) ? fallbackResponse : (fallbackResponse as any)?.data || [];
      } catch (fallbackError) {
        console.error('Lỗi Fallback (Có thể đứt mạng hoàn toàn):', fallbackError);
        return []; // Trả về mảng rỗng để không crash App
      }
    }
  },

  getById: async (id: string): Promise<Room | null> => {
    try {
      const response = await apiClient.get<ApiRoom>(API_ENDPOINTS.ROOMS.BY_ID(id));
      return mapApiRoomToRoom(response);
    } catch (error) {
      console.warn('[roomsApi.getById] Error:', error);
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
      console.warn('[roomsApi.getAvailable] Error:', error);
      return [];
    }
  },

  create: async (roomData: Partial<Room>): Promise<Room | null> => {
    try {
      const response = await apiClient.post<ApiRoom>(API_ENDPOINTS.ROOMS.BASE, roomData);
      return mapApiRoomToRoom(response);
    } catch (error) {
      console.warn('[roomsApi.create] Error:', error);
      return null;
    }
  },

  update: async (id: string, roomData: Partial<Room>): Promise<Room | null> => {
    try {
      const response = await apiClient.put<ApiRoom>(API_ENDPOINTS.ROOMS.BY_ID(id), roomData);
      return mapApiRoomToRoom(response);
    } catch (error) {
      console.warn('[roomsApi.update] Error:', error);
      return null;
    }
  },

  delete: async (id: string): Promise<boolean> => {
    try {
      await apiClient.delete(API_ENDPOINTS.ROOMS.BY_ID(id));
      return true;
    } catch (error) {
      console.warn('[roomsApi.delete] Error:', error);
      return false;
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
      console.warn('[roomsApi.getEventsByHotel] Error:', error);
      return [];
    }
  },

  getHistory: async (hotelId: string, filterType: string = 'all', page: number = 1, limit: number = 100): Promise<{
    history: any[];
    totalPages: number;
    currentPage: number;
    totalPayment: number;
    totalItems: number;
  }> => {
    try {
      const params = new URLSearchParams({
        hotelId,
        filterType,
        page: String(page),
        limit: String(limit)
      });
      const endpoint = `${API_ENDPOINTS.ROOMS.HISTORY}?${params.toString()}`;
      const response = await apiClient.get<{
        history: any[];
        totalPages: number;
        currentPage: number;
        totalPayment: number;
        totalItems: number;
      }>(endpoint);
      return response;
    } catch (error) {
      console.warn('[roomsApi.getHistory] Error:', error);
      return {
        history: [],
        totalPages: 0,
        currentPage: 1,
        totalPayment: 0,
        totalItems: 0
      };
    }
  },
};
