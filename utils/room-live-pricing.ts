import type { Room } from '@/types/hotel';

export type RateType = 'hourly' | 'daily' | 'nightly' | 'weekly' | 'monthly';

export type OccupiedRoomLivePricing = {
  roomPrice: number;
  serviceAmount: number;
  additionalCharges: number;
  discount: number;
  advancePayment: number;
  totalAmount: number;
  remainingAmount: number;
  durationText: string;
  rateType: RateType;
  checkInTime: Date | null;
};

const DEFAULT_HOLIDAYS = ['01-01', '04-30', '05-01', '09-02'];

const normalizeMoney = (value: any): number => {
  if (Array.isArray(value)) {
    return value.reduce((sum, item) => sum + (Number(item?.amount ?? item) || 0), 0);
  }
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
};

const hasMoneyValue = (value: any): boolean => {
  if (value === null || value === undefined || value === '') return false;
  if (Array.isArray(value)) return value.length > 0;
  return Number.isFinite(Number(value));
};

/**
 * Công thức tính tiền phòng realtime — đồng bộ với hotelapp room.component.ts
 */
export const calculateRoomPriceLocal = (
  room: Room,
  checkinTime: Date,
  rateType: string,
  checkOutTime?: Date
): number => {
  const now = checkOutTime ?? new Date();
  if (!(checkinTime instanceof Date) || Number.isNaN(checkinTime.getTime())) return 0;
  if (Number.isNaN(now.getTime()) || checkinTime.getTime() >= now.getTime()) return 0;

  const durationInMilliseconds = now.getTime() - checkinTime.getTime();
  const durationInMinutes = Math.floor(durationInMilliseconds / (1000 * 60));
  const durationInHours = Math.max(0, Math.floor(durationInMinutes / 60));
  const remainingMinutes = durationInMinutes % 60;
  const durationInDays = Math.max(1, Math.ceil(durationInHours / 24));

  const priceConfig: any = (room as any)?.priceConfig || null;
  const priceSettings: any = (room as any)?.priceSettings || null;

  const hourlyRate =
    room.pricing?.hourly || room.firstHourRate || priceConfig?.hourlyRates?.firstHourPrice || 0;
  const dailyRate = room.pricing?.daily || priceConfig?.dailyRates?.standardPrice || 0;
  const nightlyRate = room.pricing?.nightly || priceConfig?.nightlyRates?.standardPrice || 0;
  const weeklyRate = room.pricing?.weekly || priceConfig?.weeklyRates?.standardPrice || 0;
  const monthlyRate = room.pricing?.monthly || priceConfig?.monthlyRates?.standardPrice || 0;
  const additionalHourRate =
    room.additionalHourRate ||
    priceConfig?.hourlyRates?.additionalHourPrice ||
    hourlyRate * 0.8;

  const gracePeriodMinutes = priceConfig?.hourlyRates?.gracePeriodMinutes || 15;
  const autoDailyHours = priceConfig?.nightlyRates?.autoDailyHours || 24;
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
  const dailyWeekendSurchargePercent = Number(priceConfig?.dailyRates?.weekendSurcharge ?? 0) || 0;
  const dailyHolidaySurchargePercent = Number(priceConfig?.dailyRates?.holidaySurcharge ?? 0) || 0;
  const nightlyWeekendSurchargePercent = Number(priceConfig?.nightlyRates?.weekendSurcharge ?? 0) || 0;
  const nightlyHolidaySurchargePercent = Number(priceConfig?.nightlyRates?.holidaySurcharge ?? 0) || 0;

  const holidaySet = new Set(DEFAULT_HOLIDAYS);

  const parseTime = (timeStr: string) => {
    const parts = String(timeStr || '').split(':');
    return {
      hour: parseInt(parts[0], 10) || 0,
      minute: parseInt(parts[1], 10) || 0,
    };
  };

  const calculateEarlyHours = (actualTime: Date, standardTime: string): number => {
    const actual = parseTime(`${actualTime.getHours()}:${actualTime.getMinutes()}`);
    const standard = parseTime(standardTime);
    const actualMinutes = actual.hour * 60 + actual.minute;
    const standardMinutes = standard.hour * 60 + standard.minute;
    if (actualMinutes < standardMinutes) {
      return Math.ceil((standardMinutes - actualMinutes) / 60);
    }
    return 0;
  };

  const toYmd = (date: Date): string => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  const toMmdd = (date: Date): string => {
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${m}-${d}`;
  };

  const isWeekend = (date: Date): boolean => {
    const dow = date.getDay();
    return dow === 0 || dow === 6;
  };

  const isHoliday = (date: Date): boolean => {
    return holidaySet.has(toYmd(date)) || holidaySet.has(toMmdd(date));
  };

  let total = 0;

  switch (rateType) {
    case 'hourly': {
      const firstHourPrice =
        room.firstHourRate || priceConfig?.hourlyRates?.firstHourPrice || hourlyRate;
      const extraHourPrice =
        room.additionalHourRate ||
        priceConfig?.hourlyRates?.additionalHourPrice ||
        additionalHourRate;
      total = firstHourPrice;

      if (durationInHours >= 1) {
        let billableHours = durationInHours - 1;
        if (durationInHours >= 2 && remainingMinutes > gracePeriodMinutes) {
          billableHours += 1;
        } else if (durationInHours === 1 && remainingMinutes > gracePeriodMinutes) {
          billableHours = 1;
        }
        if (billableHours > 0) {
          total += billableHours * extraHourPrice;
        }
      }
      break;
    }
    case 'daily': {
      const checkInDateOnly = new Date(checkinTime);
      checkInDateOnly.setHours(0, 0, 0, 0);
      const checkOutDateOnly = new Date(now);
      checkOutDateOnly.setHours(0, 0, 0, 0);
      const actualDays = Math.max(
        1,
        Math.ceil((checkOutDateOnly.getTime() - checkInDateOnly.getTime()) / (1000 * 60 * 60 * 24))
      );

      total = actualDays * dailyRate;

      let holidaySurchargeAmount = 0;
      let weekendSurchargeAmount = 0;
      for (let i = 0; i < actualDays; i++) {
        const dayDate = new Date(checkInDateOnly);
        dayDate.setDate(dayDate.getDate() + i);
        if (isHoliday(dayDate) && dailyHolidaySurchargePercent > 0) {
          holidaySurchargeAmount += (dailyRate * dailyHolidaySurchargePercent) / 100;
        } else if (isWeekend(dayDate) && dailyWeekendSurchargePercent > 0) {
          weekendSurchargeAmount += (dailyRate * dailyWeekendSurchargePercent) / 100;
        }
      }
      total += Math.round(holidaySurchargeAmount) + Math.round(weekendSurchargeAmount);

      const checkInMinutes = checkinTime.getHours() * 60 + checkinTime.getMinutes();
      const [startHour, startMinute] = dailyStartTime.split(':').map(Number);
      const startTimeMinutes = startHour * 60 + startMinute;
      if (checkInMinutes < startTimeMinutes && dailyEarlyCheckinSurcharge > 0) {
        total += calculateEarlyHours(checkinTime, dailyStartTime) * dailyEarlyCheckinSurcharge;
      }

      const checkoutMinutes = now.getHours() * 60 + now.getMinutes();
      const [checkOutHour, checkOutMinute] = dailyCheckOutTime.split(':').map(Number);
      const checkOutTimeMinutes = checkOutHour * 60 + checkOutMinute;
      const isNextDay = checkOutDateOnly.getTime() > checkInDateOnly.getTime();
      if (isNextDay && checkoutMinutes > checkOutTimeMinutes && dailyLateCheckoutFee > 0) {
        total += Math.ceil((checkoutMinutes - checkOutTimeMinutes) / 60) * dailyLateCheckoutFee;
      }
      break;
    }
    case 'nightly': {
      const [endHourForNightly, endMinuteForNightly] = nightlyEndTime.split(':').map(Number);
      const nightlyEndDateTime = new Date(checkinTime);
      nightlyEndDateTime.setHours(endHourForNightly || 0, endMinuteForNightly || 0, 0, 0);
      if (nightlyEndDateTime.getTime() <= checkinTime.getTime()) {
        nightlyEndDateTime.setDate(nightlyEndDateTime.getDate() + 1);
      }

      const shouldSplitNightlyToDaily =
        durationInHours > autoDailyHours && dailyRate > 0 && nightlyRate > 0;

      if (shouldSplitNightlyToDaily) {
        const dayMs = 1000 * 60 * 60 * 24;
        let dailyDays = 0;
        if (now.getTime() > nightlyEndDateTime.getTime()) {
          const startDateOnly = new Date(nightlyEndDateTime);
          startDateOnly.setHours(0, 0, 0, 0);
          const endDateOnly = new Date(now);
          endDateOnly.setHours(0, 0, 0, 0);
          dailyDays = Math.max(0, Math.ceil((endDateOnly.getTime() - startDateOnly.getTime()) / dayMs));
        }
        total = nightlyRate + dailyDays * dailyRate;

        const checkInMinutesForNight = checkinTime.getHours() * 60 + checkinTime.getMinutes();
        const endTimeMinutesForNight = (endHourForNightly || 0) * 60 + (endMinuteForNightly || 0);
        const nightlyStartDateForSurcharge = new Date(checkinTime);
        nightlyStartDateForSurcharge.setHours(0, 0, 0, 0);
        if (checkInMinutesForNight <= endTimeMinutesForNight) {
          nightlyStartDateForSurcharge.setDate(nightlyStartDateForSurcharge.getDate() - 1);
        }

        let holidaySurchargeAmount = 0;
        let weekendSurchargeAmount = 0;
        if (isHoliday(nightlyStartDateForSurcharge) && nightlyHolidaySurchargePercent > 0) {
          holidaySurchargeAmount += (nightlyRate * nightlyHolidaySurchargePercent) / 100;
        } else if (isWeekend(nightlyStartDateForSurcharge) && nightlyWeekendSurchargePercent > 0) {
          weekendSurchargeAmount += (nightlyRate * nightlyWeekendSurchargePercent) / 100;
        }
        for (let i = 0; i < dailyDays; i++) {
          const date = new Date(nightlyEndDateTime);
          date.setHours(0, 0, 0, 0);
          date.setDate(date.getDate() + i);
          if (isHoliday(date) && dailyHolidaySurchargePercent > 0) {
            holidaySurchargeAmount += (dailyRate * dailyHolidaySurchargePercent) / 100;
          } else if (isWeekend(date) && dailyWeekendSurchargePercent > 0) {
            weekendSurchargeAmount += (dailyRate * dailyWeekendSurchargePercent) / 100;
          }
        }
        total += Math.round(holidaySurchargeAmount) + Math.round(weekendSurchargeAmount);
      } else {
        total = Math.max(0, nightlyRate);

        const checkInMinutesForNight = checkinTime.getHours() * 60 + checkinTime.getMinutes();
        const endTimeMinutesForNight = (endHourForNightly || 0) * 60 + (endMinuteForNightly || 0);
        const nightlyStartDateForSurcharge = new Date(checkinTime);
        nightlyStartDateForSurcharge.setHours(0, 0, 0, 0);
        if (checkInMinutesForNight <= endTimeMinutesForNight) {
          nightlyStartDateForSurcharge.setDate(nightlyStartDateForSurcharge.getDate() - 1);
        }

        let holidaySurchargeAmount = 0;
        let weekendSurchargeAmount = 0;
        if (isHoliday(nightlyStartDateForSurcharge) && nightlyHolidaySurchargePercent > 0) {
          holidaySurchargeAmount += (nightlyRate * nightlyHolidaySurchargePercent) / 100;
        } else if (isWeekend(nightlyStartDateForSurcharge) && nightlyWeekendSurchargePercent > 0) {
          weekendSurchargeAmount += (nightlyRate * nightlyWeekendSurchargePercent) / 100;
        }
        total += Math.round(holidaySurchargeAmount) + Math.round(weekendSurchargeAmount);
      }

      const checkInMinutes = checkinTime.getHours() * 60 + checkinTime.getMinutes();
      const [startHour, startMinute] = nightlyStartTime.split(':').map(Number);
      const startTimeMinutes = startHour * 60 + startMinute;
      const [endHour, endMinute] = nightlyEndTime.split(':').map(Number);
      const endTimeMinutes = endHour * 60 + endMinute;
      const isInNightlyTime = checkInMinutes >= startTimeMinutes || checkInMinutes <= endTimeMinutes;
      if (!isInNightlyTime && nightlyEarlyCheckinSurcharge > 0) {
        total += calculateEarlyHours(checkinTime, nightlyStartTime) * nightlyEarlyCheckinSurcharge;
      }

      const checkoutMinutes = now.getHours() * 60 + now.getMinutes();
      const nowDateOnly = new Date(now);
      nowDateOnly.setHours(0, 0, 0, 0);
      const checkinDateOnly = new Date(checkinTime);
      checkinDateOnly.setHours(0, 0, 0, 0);
      const isNextDay = nowDateOnly.getTime() > checkinDateOnly.getTime();

      if (shouldSplitNightlyToDaily) {
        const [dailyCoHour, dailyCoMinute] = dailyCheckOutTime.split(':').map(Number);
        const dailyCheckOutMinutes = (dailyCoHour || 0) * 60 + (dailyCoMinute || 0);
        if (checkoutMinutes > dailyCheckOutMinutes && dailyLateCheckoutFee > 0) {
          total += Math.ceil((checkoutMinutes - dailyCheckOutMinutes) / 60) * dailyLateCheckoutFee;
        }
      } else if (isNextDay && checkoutMinutes > endTimeMinutes && nightlyLateCheckoutSurcharge > 0) {
        total += Math.ceil((checkoutMinutes - endTimeMinutes) / 60) * nightlyLateCheckoutSurcharge;
      }
      break;
    }
    case 'weekly': {
      const weeks = Math.max(1, Math.ceil(durationInDays / 7));
      total = weeklyRate > 0 ? weeks * weeklyRate : Math.max(1, weeks * 7) * dailyRate;
      break;
    }
    case 'monthly': {
      const months = Math.max(1, Math.ceil(durationInDays / 30));
      total = monthlyRate > 0 ? months * monthlyRate : Math.max(1, months * 30) * dailyRate;
      break;
    }
    default:
      total = hourlyRate * Math.max(1, durationInHours);
  }

  return Math.max(0, Math.round(total));
};

export const getRoomDurationText = (
  checkInTime: Date | string | null | undefined,
  now: Date = new Date()
): string => {
  if (!checkInTime) return '';
  const checkIn = checkInTime instanceof Date ? checkInTime : new Date(checkInTime);
  if (Number.isNaN(checkIn.getTime()) || Number.isNaN(now.getTime())) return '';

  const durationInMs = Math.max(0, now.getTime() - checkIn.getTime());
  const totalMinutes = Math.floor(durationInMs / (1000 * 60));
  const days = Math.floor(totalMinutes / (24 * 60));
  const hours = Math.floor((totalMinutes % (24 * 60)) / 60);
  const minutes = totalMinutes % 60;

  const parts: string[] = [];
  if (days > 0) parts.push(`${days} ngày`);
  if (hours > 0) parts.push(`${hours} giờ`);
  if (minutes > 0 || (days === 0 && hours === 0)) parts.push(`${minutes} phút`);
  return parts.length > 0 ? parts.join(' ') : '0 phút';
};

export type LivePricingSnapshotInput = {
  checkInTime?: string | Date | null;
  rateType?: string | null;
  additionalCharges?: any;
  discount?: any;
  advancePayment?: any;
  selectedServices?: any[];
  paidAmount?: any;
};

/**
 * Tổng hợp giá card phòng occupied realtime (giống web getRoomDisplayInfo).
 * totalAmount = roomPrice + phụ thu + dịch vụ
 * remaining = total - trả trước - khuyến mãi (hoặc total - paidAmount)
 */
export const buildOccupiedRoomLivePricing = (
  room: Room,
  snapshot: LivePricingSnapshotInput | null | undefined,
  now: Date = new Date()
): OccupiedRoomLivePricing | null => {
  if (!room || room.status !== 'occupied') return null;

  const checkInRaw = snapshot?.checkInTime || room.checkInTime;
  if (!checkInRaw) return null;
  const checkInTime = checkInRaw instanceof Date ? checkInRaw : new Date(checkInRaw);
  if (Number.isNaN(checkInTime.getTime())) return null;

  const rateType = (snapshot?.rateType || room.rateType || 'hourly') as RateType;
  const roomPrice = calculateRoomPriceLocal(room, checkInTime, rateType, now);

  const services = Array.isArray(snapshot?.selectedServices)
    ? snapshot!.selectedServices!
    : Array.isArray(room.selectedServices)
      ? room.selectedServices
      : [];
  const serviceAmount = services.reduce((sum: number, service: any) => {
    const line =
      service?.totalPrice !== undefined && service?.totalPrice !== null
        ? Number(service.totalPrice) || 0
        : (Number(service?.price ?? service?.unitPrice) || 0) * (Number(service?.quantity) || 1);
    return sum + line;
  }, 0);

  const additionalCharges = hasMoneyValue(snapshot?.additionalCharges)
    ? normalizeMoney(snapshot?.additionalCharges)
    : normalizeMoney(room.additionalCharges);
  const discount = hasMoneyValue(snapshot?.discount)
    ? normalizeMoney(snapshot?.discount)
    : normalizeMoney(room.discount);
  const advancePayment = hasMoneyValue(snapshot?.advancePayment)
    ? normalizeMoney(snapshot?.advancePayment)
    : normalizeMoney(room.advancePayment);
  const paidAmount = hasMoneyValue(snapshot?.paidAmount)
    ? normalizeMoney(snapshot?.paidAmount)
    : normalizeMoney((room as any)?.paidAmount);

  const totalAmount = Math.max(0, roomPrice + additionalCharges + serviceAmount);
  const remainingAmount =
    paidAmount > 0
      ? totalAmount - paidAmount
      : totalAmount - advancePayment - discount;

  return {
    roomPrice: Math.round(roomPrice),
    serviceAmount: Math.round(serviceAmount),
    additionalCharges: Math.round(additionalCharges),
    discount: Math.round(discount),
    advancePayment: Math.round(advancePayment),
    totalAmount: Math.round(totalAmount),
    remainingAmount: Math.round(remainingAmount),
    durationText: getRoomDurationText(checkInTime, now),
    rateType,
    checkInTime,
  };
};
