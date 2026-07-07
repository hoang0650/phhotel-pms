import React, { useMemo, useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Modal,
  Pressable,
  RefreshControl,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { shiftHandoverApi, staffsApi, roomsApi, transactionsApi } from '@/services/api';
import { ShiftHandover, ShiftHandoverHistoryResponse } from '@/types/hotel';
import { useHotel } from '@/contexts/HotelContext';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useRouter } from 'expo-router';
import { Staff } from '@/types/hotel';
import { AccessGuard } from '@/components/AccessGuard';

const parseCurrency = (value: string) => {
  if (!value) return 0;
  const cleaned = value.replace(/[^\d.-]/g, '');
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : 0;
};

type FilterPreset = 'today' | '7days' | '30days' | 'month' | 'custom';

const formatDateInput = (value: Date) => {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const parseDateInput = (value: string, endOfDay = false) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const parsed = new Date(`${value}T${endOfDay ? '23:59:59.999' : '00:00:00.000'}`);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed;
};

const getRangeFromPreset = (preset: Exclude<FilterPreset, 'custom'>) => {
  const endDate = new Date();
  let startDate = new Date();

  switch (preset) {
    case '7days':
      startDate.setDate(endDate.getDate() - 6);
      break;
    case '30days':
      startDate.setDate(endDate.getDate() - 29);
      break;
    case 'month':
      startDate = new Date(endDate.getFullYear(), endDate.getMonth(), 1);
      break;
    case 'today':
    default:
      startDate = new Date(endDate);
      break;
  }

  return {
    startDate: formatDateInput(startDate),
    endDate: formatDateInput(endDate),
  };
};

const isSameDay = (left?: string | Date, right?: string | Date) => {
  if (!left || !right) return false;
  const leftDate = new Date(left);
  const rightDate = new Date(right);
  if (Number.isNaN(leftDate.getTime()) || Number.isNaN(rightDate.getTime())) return false;
  return (
    leftDate.getFullYear() === rightDate.getFullYear() &&
    leftDate.getMonth() === rightDate.getMonth() &&
    leftDate.getDate() === rightDate.getDate()
  );
};

const getStatusColor = (status?: string) => {
  switch (status) {
    case 'confirmed':
      return '#2ECC71';
    case 'pending':
      return '#F39C12';
    case 'rejected':
      return '#E74C3C';
    case 'cancelled':
      return '#95A5A6';
    default:
      return '#7F8C8D';
  }
};

const normalizePaymentStatus = (payment: any) => {
  const raw = String(
    payment?.paymentStatus ||
    payment?.payment?.status ||
    payment?.payment?.paymentStatus ||
    payment?.status ||
    'paid'
  ).toLowerCase();
  const map: Record<string, 'paid' | 'pending' | 'unpaid' | 'refunded' | 'cancelled'> = {
    completed: 'paid',
    success: 'paid',
    paid: 'paid',
    processing: 'pending',
    pending: 'pending',
    waiting: 'pending',
    unpaid: 'unpaid',
    failed: 'unpaid',
    error: 'unpaid',
    declined: 'unpaid',
    refunded: 'refunded',
    cancel: 'cancelled',
    cancelled: 'cancelled',
    canceled: 'cancelled',
  };
  return map[raw] || 'paid';
};

const mapPaymentMethodGroup = (method?: string) => {
  const m = String(method || 'cash').toLowerCase().trim();
  if (m === 'bank_transfer' || m === 'transfer' || m === 'banking') return 'bank_transfer';
  if (m === 'card' || m === 'credit_card' || m === 'virtual_card' || m === 'visa') return 'card';
  return 'cash';
};

const resolveStaffName = (value: any, staffs: Staff[]) => {
  if (!value) return '';
  if (typeof value === 'string') {
    const matched = staffs.find(staff => staff.id === value);
    return matched?.name || value;
  }
  const personalInfo = value.personalInfo;
  const firstName = personalInfo?.firstName || '';
  const lastName = personalInfo?.lastName || '';
  const fullName = `${firstName} ${lastName}`.trim();
  if (fullName) return fullName;
  if (value.name) return value.name;
  if (value.email) return value.email;
  return value._id || '';
};

type RevenueOverviewSummary = {
  cashTotal: number;
  bankTransferTotal: number;
  cardTotal: number;
  expenseTotal: number;
  incomeTotal: number;
  totalRevenue: number;
};

const buildRevenueOverview = (
  paymentHistory: any[] = [],
  expenses: any[] = [],
  incomes: any[] = []
): RevenueOverviewSummary => {
  const enrichedPayments = paymentHistory.map((event: any) => {
    const roomAmount = Number(event.roomAmount) || Number(event.roomTotal) || 0;
    const serviceAmount = Number(event.serviceAmount) || Number(event.serviceTotal) || Number(event.servicesTotal) || 0;
    const additionalCharges = Number(event.additionalCharges) || 0;
    const discount = Number(event.discount) || 0;
    const advancePayment = Number(event.advancePayment) || 0;
    const rawTotal =
      (typeof event.totalAmount === 'number' ? Number(event.totalAmount) : undefined) ??
      (typeof event.amount === 'number' ? Number(event.amount) : undefined) ??
      (typeof event.payment === 'number' ? Number(event.payment) : undefined);
    const totalAmount = Number.isFinite(rawTotal as number)
      ? Number(rawTotal)
      : roomAmount + serviceAmount + additionalCharges - discount - advancePayment;

    return {
      totalAmount,
      status: normalizePaymentStatus(event),
      eventType: String(event.type || event.event || '').toLowerCase(),
      methodGroup: mapPaymentMethodGroup(
        event.paymentMethod || event.payment?.method || event.method || event.advancePaymentMethod || 'cash'
      ),
      advanceMethodGroup: mapPaymentMethodGroup(
        event.advancePaymentMethod || event.paymentMethod || event.method || 'cash'
      ),
      advancePayment,
    };
  });

  const checkoutPayments = enrichedPayments.filter((payment) => {
    const isCheckout = payment.eventType === 'checkout' || payment.eventType === 'check-out';
    return isCheckout && payment.status === 'paid';
  });

  let cashTotal = checkoutPayments
    .filter((payment) => payment.methodGroup === 'cash')
    .reduce((sum, payment) => sum + payment.totalAmount, 0);
  let bankTransferTotal = checkoutPayments
    .filter((payment) => payment.methodGroup === 'bank_transfer')
    .reduce((sum, payment) => sum + payment.totalAmount, 0);
  let cardTotal = checkoutPayments
    .filter((payment) => payment.methodGroup === 'card')
    .reduce((sum, payment) => sum + payment.totalAmount, 0);

  const advanceCheckins = enrichedPayments.filter((payment) => {
    const isCheckin =
      payment.eventType === 'checkin' ||
      payment.eventType === 'check-in' ||
      payment.eventType === 'checkin_event';
    return isCheckin;
  });

  advanceCheckins.forEach((payment) => {
    const amount = Number(payment.advancePayment) || 0;
    if (amount <= 0) return;

    if (payment.advanceMethodGroup === 'bank_transfer') {
      bankTransferTotal += amount;
    } else if (payment.advanceMethodGroup === 'card') {
      cardTotal += amount;
    } else {
      cashTotal += amount;
    }
  });

  const expenseTotal = expenses
    .filter((expense: any) => expense?.status === 'completed')
    .reduce((sum, expense: any) => sum + (Number(expense?.amount) || 0), 0);
  const incomeTotal = incomes
    .filter((income: any) => income?.status === 'completed')
    .reduce((sum, income: any) => sum + (Number(income?.amount) || 0), 0);

  return {
    cashTotal,
    bankTransferTotal,
    cardTotal,
    expenseTotal,
    incomeTotal,
    totalRevenue: cashTotal + bankTransferTotal + cardTotal + incomeTotal - expenseTotal,
  };
};

export default function ShiftHandoverScreen() {
  const queryClient = useQueryClient();
  const { selectedHotelId } = useHotel();
  const { user } = useAuth();
  const { language } = useLanguage();
  const router = useRouter();
  const isVi = language === 'vi';
  const text = useMemo(() => ({
    statusConfirmed: isVi ? 'Da xac nhan' : 'Confirmed',
    statusPending: isVi ? 'Dang cho' : 'Pending',
    statusRejected: isVi ? 'Tu choi' : 'Rejected',
    statusCancelled: isVi ? 'Da huy' : 'Cancelled',
    statusUnknown: isVi ? 'Khong ro' : 'Unknown',
    success: isVi ? 'Thanh cong' : 'Success',
    error: isVi ? 'Loi' : 'Error',
    missingInfo: isVi ? 'Thieu thong tin' : 'Missing information',
    invalidFilter: isVi ? 'Bo loc khong hop le' : 'Invalid filter',
    handoverCreated: isVi ? 'Da giao ca thanh cong' : 'Shift handover completed successfully',
    managerHandoverCreated: isVi ? 'Da giao tien quan ly' : 'Manager handover completed successfully',
    handoverFailed: isVi ? 'Khong the giao ca' : 'Unable to complete shift handover',
    managerHandoverFailed: isVi ? 'Khong the giao tien quan ly' : 'Unable to complete manager handover',
    selectHotel: isVi ? 'Vui long chon khach san' : 'Please select a hotel',
    fromStaffMissing: isVi ? 'Khong tim thay nhan vien giao ca' : 'Cannot find the handing-over staff',
    selectToStaff: isVi ? 'Vui long chon nhan vien nhan ca' : 'Please select the receiving staff',
    enterReceiverPassword: isVi ? 'Vui long nhap mat khau nguoi nhan ca' : 'Please enter the receiver password',
    enterManagerAccount: isVi ? 'Vui long nhap tai khoan quan ly' : 'Please enter the manager account',
    managerAmountPositive: isVi ? 'So tien giao quan ly phai lon hon 0' : 'Manager handover amount must be greater than 0',
    invalidDateFormat: isVi ? 'Vui long nhap ngay theo dinh dang YYYY-MM-DD' : 'Please enter dates in YYYY-MM-DD format',
    invalidDateRange: isVi ? 'Ngay bat dau khong duoc lon hon ngay ket thuc' : 'Start date cannot be later than end date',
    direct: isVi ? 'Truc tiep' : 'Direct',
    booking: isVi ? 'Dat phong' : 'Booking',
    walkin: isVi ? 'Khach vang lai' : 'Walk-in',
    cash: isVi ? 'Tien mat' : 'Cash',
    bankTransfer: isVi ? 'Chuyen khoan' : 'Bank transfer',
    card: isVi ? 'Ca the' : 'Card',
    cardCredit: isVi ? 'The tin dung' : 'Credit card',
    title: isVi ? 'Quan Ly Giao Ca' : 'Shift Handover Management',
    subtitle: isVi ? 'Theo doi va ban giao ca lam viec' : 'Track and hand over work shifts',
    revenueOverview: isVi ? 'Tong quan doanh thu' : 'Revenue overview',
    exportExcel: isVi ? 'Xuat Excel' : 'Export Excel',
    history: isVi ? 'Lich su giao ca' : 'Shift handover history',
    filter: isVi ? 'Loc' : 'Filter',
    exportRevenue: isVi ? 'Xuat doanh thu' : 'Export revenue',
    today: isVi ? 'Hom nay' : 'Today',
    sevenDays: isVi ? '7 ngay' : '7 days',
    thirtyDays: isVi ? '30 ngay' : '30 days',
    thisMonth: isVi ? 'Thang nay' : 'This month',
    custom: isVi ? 'Tuy chon' : 'Custom',
    fromDate: isVi ? 'Tu ngay' : 'From date',
    toDate: isVi ? 'Den ngay' : 'To date',
    reset: isVi ? 'Dat lai' : 'Reset',
    apply: isVi ? 'Ap dung' : 'Apply',
    noHistory: isVi ? 'Chua co lich su giao ca' : 'No shift handover history yet',
    staff: isVi ? 'Nhan vien' : 'Staff',
    handoverAmount: isVi ? 'So tien giao ca' : 'Handover amount',
    viewDetail: isVi ? 'Xem chi tiet' : 'View details',
    pageLabel: isVi ? 'Trang' : 'Page',
    selectStaff: isVi ? 'Chon nhan vien' : 'Select staff',
    searchStaffPlaceholder: isVi ? 'Tim kiem nhan vien...' : 'Search staff...',
    detailTitle: isVi ? 'Chi tiet giao ca' : 'Shift handover details',
    handoverInfo: isVi ? 'Thong tin giao ca' : 'Handover information',
    time: isVi ? 'Thoi gian:' : 'Time:',
    from: isVi ? 'Tu:' : 'From:',
    to: isVi ? 'Den:' : 'To:',
    status: isVi ? 'Trang thai:' : 'Status:',
    moneyDetails: isVi ? 'Chi tiet tien' : 'Money details',
    previousShiftCash: isVi ? 'Tien ca truoc:' : 'Previous shift cash:',
    shiftCash: isVi ? 'Tien mat trong ca:' : 'Cash in shift:',
    managerCash: isVi ? 'Tien giao quan ly:' : 'Manager handover:',
    collectedCash: isVi ? 'Tien mat thu:' : 'Collected cash:',
    expenseVoucher: isVi ? 'Phieu chi:' : 'Expense voucher:',
    incomeVoucher: isVi ? 'Phieu thu:' : 'Income voucher:',
    totalRevenue: isVi ? 'Tong doanh thu:' : 'Total revenue:',
    notes: isVi ? 'Ghi chu' : 'Notes',
    expenseDetailsTotal: isVi ? 'Chi tiet phieu chi - Tong:' : 'Expense voucher details - Total:',
    incomeDetailsTotal: isVi ? 'Chi tiet phieu thu - Tong:' : 'Income voucher details - Total:',
    depositDetailsTotal: isVi ? 'Chi tiet dat coc - Tong:' : 'Deposit details - Total:',
    content: isVi ? 'Noi dung' : 'Content',
    amount: isVi ? 'So tien' : 'Amount',
    method: isVi ? 'Phuong thuc' : 'Method',
    room: isVi ? 'Phong' : 'Room',
    customer: isVi ? 'Khach hang' : 'Customer',
    deposit: isVi ? 'Dat coc' : 'Deposit',
    paymentMethodShort: isVi ? 'PT thanh toan' : 'Payment method',
    checkin: 'Check-in',
    checkout: 'Check-out',
    guest: isVi ? 'Khach le' : 'Walk-in guest',
    customerRevenueSummary: isVi
      ? 'Tong doanh thu = Tien mat + Chuyen khoan + The tin dung + Phieu Thu - Phieu Chi:'
      : 'Total revenue = Cash + Bank transfer + Credit card + Income voucher - Expense voucher:',
    action: isVi ? 'Thao tac' : 'Action',
    source: isVi ? 'Nguon' : 'Source',
    roomTotal: isVi ? 'Tong phong' : 'Room total',
    surcharge: isVi ? 'Phu thu' : 'Surcharge',
    discount: isVi ? 'Giam gia' : 'Discount',
    service: isVi ? 'Dich vu' : 'Service',
    advancePayment: isVi ? 'Dat truoc' : 'Advance payment',
    adjustedTotal: isVi ? 'Tong dieu chinh' : 'Adjusted total',
    remaining: isVi ? 'Con lai' : 'Remaining',
    payment: isVi ? 'Thanh toan' : 'Payment',
    formulaLabel: isVi ? 'Cong thuc:' : 'Formula:',
    formulaDescription: isVi
      ? 'Tong doanh thu = Tien mat + Chuyen khoan + The tin dung + Phieu Thu - Phieu Chi'
      : 'Total revenue = Cash + Bank transfer + Credit card + Income voucher - Expense voucher',
    notAvailable: 'N/A',
    checkoutAction: isVi ? 'Thanh toan' : 'Payment',
  }), [isVi]);
  const filterPresetOptions = useMemo(() => ([
    { key: 'today' as const, label: text.today },
    { key: '7days' as const, label: text.sevenDays },
    { key: '30days' as const, label: text.thirtyDays },
    { key: 'month' as const, label: text.thisMonth },
    { key: 'custom' as const, label: text.custom },
  ]), [text]);
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat(isVi ? 'vi-VN' : 'en-US', {
      style: 'currency',
      currency: 'VND',
      maximumFractionDigits: 0,
    }).format(amount || 0);
  };
  const formatDateTime = (value?: string | Date) => {
    if (!value) return '';
    return new Date(value).toLocaleString(isVi ? 'vi-VN' : 'en-US', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };
  const formatFilterDateLabel = (value: string) => {
    const parsed = parseDateInput(value);
    if (!parsed) return value;
    return parsed.toLocaleDateString(isVi ? 'vi-VN' : 'en-US');
  };
  const getStatusLabel = (status?: string) => {
    switch (status) {
      case 'confirmed':
        return text.statusConfirmed;
      case 'pending':
        return text.statusPending;
      case 'rejected':
        return text.statusRejected;
      case 'cancelled':
        return text.statusCancelled;
      default:
        return text.statusUnknown;
    }
  };
  const getGuestSourceLabel = (room: any) => {
    const source = room.source || room.guestSource || 'direct';
    switch (source) {
      case 'direct':
        return text.direct;
      case 'booking':
        return text.booking;
      case 'walkin':
        return text.walkin;
      default:
        return source;
    }
  };
  const getPaymentMethodLabel = (method: string) => {
    switch (mapPaymentMethodGroup(method)) {
      case 'cash':
        return text.cash;
      case 'bank_transfer':
        return text.bankTransfer;
      case 'card':
        return text.card;
      default:
        return method || text.cash;
    }
  };
  const getActionLabel = (action?: string) => {
    const normalized = String(action || '').toLowerCase();
    switch (normalized) {
      case 'check_out':
      case 'checkout':
      case 'check-out':
        return text.checkoutAction;
      case 'check_in':
      case 'checkin':
      case 'check-in':
        return text.checkin;
      default:
        return action || text.checkoutAction;
    }
  };

  const [staffModalVisible, setStaffModalVisible] = useState(false);
  const [staffSearch, setStaffSearch] = useState('');
  const [selectedToStaffId, setSelectedToStaffId] = useState<string | null>(null);
  const [toUserPassword, setToUserPassword] = useState('');
  const [notes, setNotes] = useState('');
  const [previousShiftAmount, setPreviousShiftAmount] = useState('');
  const [cashInShift, setCashInShift] = useState('');
  const [managerHandoverAmount, setManagerHandoverAmount] = useState('');
  const [cashAmount, setCashAmount] = useState('');
  const [bankTransferAmount, setBankTransferAmount] = useState('');
  const [cardPaymentAmount, setCardPaymentAmount] = useState('');
  const [expenseAmount, setExpenseAmount] = useState('');
  const [incomeAmount, setIncomeAmount] = useState('');
  const [hasTouchedPrevious, setHasTouchedPrevious] = useState(false);

  const [managerUsername, setManagerUsername] = useState('');
  const [managerPassword, setManagerPassword] = useState('');
  const [managerAmount, setManagerAmount] = useState('');
  const [managerNotes, setManagerNotes] = useState('');

  const [historyPage, setHistoryPage] = useState(1);
  const pageSize = 10;

  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<ShiftHandover | null>(null);
  const [currentShiftQueryTime, setCurrentShiftQueryTime] = useState(() => new Date().toISOString());
  const defaultFilterRange = getRangeFromPreset('today');
  const [filtersVisible, setFiltersVisible] = useState(false);
  const [filterPreset, setFilterPreset] = useState<FilterPreset>('today');
  const [draftStartDate, setDraftStartDate] = useState(defaultFilterRange.startDate);
  const [draftEndDate, setDraftEndDate] = useState(defaultFilterRange.endDate);
  const [appliedStartDate, setAppliedStartDate] = useState(defaultFilterRange.startDate);
  const [appliedEndDate, setAppliedEndDate] = useState(defaultFilterRange.endDate);

  const appliedStartDateIso = useMemo(
    () => parseDateInput(appliedStartDate)?.toISOString(),
    [appliedStartDate]
  );
  const appliedEndDateIso = useMemo(
    () => parseDateInput(appliedEndDate, true)?.toISOString(),
    [appliedEndDate]
  );
  const currentShiftStartIso = useMemo(() => {
    if (previousShiftData?.lastShiftHandover?.handoverTime) {
      const lastHandoverDate = new Date(previousShiftData.lastShiftHandover.handoverTime);
      if (!Number.isNaN(lastHandoverDate.getTime())) {
        return lastHandoverDate.toISOString();
      }
    }
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    return startOfDay.toISOString();
  }, [previousShiftData?.lastShiftHandover?.handoverTime]);
  const currentShiftEndIso = currentShiftQueryTime;

  const { data: staffs = [], isLoading: staffsLoading, refetch: refetchStaffs } = useQuery({
    queryKey: ['staffs', selectedHotelId],
    queryFn: () => staffsApi.getAll(selectedHotelId || undefined),
    enabled: !!selectedHotelId,
  });

  const { data: previousShiftData, isLoading: previousLoading, refetch: refetchPrevious } = useQuery({
    queryKey: ['shiftHandover', 'previous', selectedHotelId],
    queryFn: () => shiftHandoverApi.getPreviousShiftAmount(selectedHotelId || ''),
    enabled: !!selectedHotelId,
  });

  // Lấy payment history để tính tiền mặt, chuyển khoản, cà thẻ trong ca
  const { data: paymentHistoryData, isLoading: paymentHistoryLoading, refetch: refetchPaymentHistory } = useQuery({
    queryKey: ['paymentHistory', selectedHotelId, currentShiftStartIso, currentShiftEndIso],
    queryFn: () => selectedHotelId ? roomsApi.getEventsByHotel(selectedHotelId, { 
      types: ['checkout', 'checkin'], 
      limit: 1000,
      skip: 0,
      startDate: currentShiftStartIso,
      endDate: currentShiftEndIso,
    }) : Promise.resolve([]),
    enabled: !!selectedHotelId,
  });

  const {
    data: overviewPaymentHistoryData,
    isLoading: overviewPaymentHistoryLoading,
    refetch: refetchOverviewPaymentHistory,
  } = useQuery({
    queryKey: ['paymentHistory', 'overview', selectedHotelId, appliedStartDateIso, appliedEndDateIso],
    queryFn: () =>
      selectedHotelId
        ? roomsApi.getEventsByHotel(selectedHotelId, {
            types: ['checkout', 'checkin'],
            limit: 1000,
            skip: 0,
            startDate: appliedStartDateIso,
            endDate: appliedEndDateIso,
          })
        : Promise.resolve([]),
    enabled: !!selectedHotelId && !!appliedStartDateIso && !!appliedEndDateIso,
  });

  // Lấy danh sách phiếu chi trong ca
  const { data: expensesData, isLoading: expensesLoading, refetch: refetchExpenses } = useQuery({
    queryKey: ['expenses', selectedHotelId, currentShiftStartIso, currentShiftEndIso],
    queryFn: () => selectedHotelId ? transactionsApi.getExpenses({
      hotelId: selectedHotelId,
      startDate: currentShiftStartIso,
      endDate: currentShiftEndIso,
      page: 1,
      limit: 1000
    }) : Promise.resolve({ data: [], total: 0, page: 1, limit: 1000, totalPages: 0 }),
    enabled: !!selectedHotelId,
  });

  // Lấy danh sách phiếu thu trong ca
  const { data: incomesData, isLoading: incomesLoading, refetch: refetchIncomes } = useQuery({
    queryKey: ['incomes', selectedHotelId, currentShiftStartIso, currentShiftEndIso],
    queryFn: () => selectedHotelId ? transactionsApi.getIncomes({
      hotelId: selectedHotelId,
      startDate: currentShiftStartIso,
      endDate: currentShiftEndIso,
      page: 1,
      limit: 1000
    }) : Promise.resolve({ data: [], total: 0, page: 1, limit: 1000, totalPages: 0 }),
    enabled: !!selectedHotelId,
  });

  const {
    data: overviewExpensesData,
    isLoading: overviewExpensesLoading,
    refetch: refetchOverviewExpenses,
  } = useQuery({
    queryKey: ['expenses', 'overview', selectedHotelId, appliedStartDateIso, appliedEndDateIso],
    queryFn: () =>
      selectedHotelId
        ? transactionsApi.getExpenses({
            hotelId: selectedHotelId,
            startDate: appliedStartDateIso,
            endDate: appliedEndDateIso,
            page: 1,
            limit: 1000,
          })
        : Promise.resolve({ data: [], total: 0, page: 1, limit: 1000, totalPages: 0 }),
    enabled: !!selectedHotelId && !!appliedStartDateIso && !!appliedEndDateIso,
  });

  const {
    data: overviewIncomesData,
    isLoading: overviewIncomesLoading,
    refetch: refetchOverviewIncomes,
  } = useQuery({
    queryKey: ['incomes', 'overview', selectedHotelId, appliedStartDateIso, appliedEndDateIso],
    queryFn: () =>
      selectedHotelId
        ? transactionsApi.getIncomes({
            hotelId: selectedHotelId,
            startDate: appliedStartDateIso,
            endDate: appliedEndDateIso,
            page: 1,
            limit: 1000,
          })
        : Promise.resolve({ data: [], total: 0, page: 1, limit: 1000, totalPages: 0 }),
    enabled: !!selectedHotelId && !!appliedStartDateIso && !!appliedEndDateIso,
  });

  const { data: historyData, isLoading: historyLoading, refetch: refetchHistory } = useQuery<ShiftHandoverHistoryResponse>({
    queryKey: ['shiftHandover', 'history', selectedHotelId, historyPage, appliedStartDateIso, appliedEndDateIso],
    queryFn: () =>
      shiftHandoverApi.getHistory(selectedHotelId || '', historyPage, pageSize, {
        startDate: appliedStartDateIso,
        endDate: appliedEndDateIso,
      }),
    enabled: !!selectedHotelId,
  });

  useEffect(() => {
    if (filterPreset === 'custom') return;
    const nextRange = getRangeFromPreset(filterPreset);
    setDraftStartDate(nextRange.startDate);
    setDraftEndDate(nextRange.endDate);
    setAppliedStartDate(nextRange.startDate);
    setAppliedEndDate(nextRange.endDate);
    setHistoryPage(1);
  }, [filterPreset]);

  const fromStaff = useMemo(() => {
    if (!user?.id) return null;
    return staffs.find(staff => staff.userId === user.id) || null;
  }, [staffs, user?.id]);

  const selectedToStaff = useMemo(() => {
    if (!selectedToStaffId) return null;
    return staffs.find(staff => staff.id === selectedToStaffId) || null;
  }, [staffs, selectedToStaffId]);

  useEffect(() => {
    if (previousShiftData && !hasTouchedPrevious) {
      setPreviousShiftAmount(String(previousShiftData.previousShiftAmount || 0));
    }
  }, [previousShiftData, hasTouchedPrevious]);

  // Tính toán tiền mặt và tổng doanh thu theo đúng khoảng thời gian của ca hiện tại
  useEffect(() => {
    if (paymentHistoryData && expensesData && incomesData) {
      const enrichedPayments = (paymentHistoryData || []).map((e: any) => {
        const roomAmount = Number(e.roomAmount) || Number(e.roomTotal) || 0;
        const serviceAmount = Number(e.serviceAmount) || Number(e.serviceTotal) || Number(e.servicesTotal) || 0;
        const additionalCharges = Number(e.additionalCharges) || 0;
        const discount = Number(e.discount) || 0;
        const advancePayment = Number(e.advancePayment) || 0;
        const rawTotal = (typeof e.totalAmount === 'number' ? Number(e.totalAmount) : undefined) 
          ?? (typeof e.amount === 'number' ? Number(e.amount) : undefined)
          ?? (typeof e.payment === 'number' ? Number(e.payment) : undefined);
        const totalAmount = Number.isFinite(rawTotal as number)
          ? (rawTotal as number)
          : roomAmount + serviceAmount + additionalCharges - discount - advancePayment;
        const methodGroup = mapPaymentMethodGroup(e.paymentMethod || e.payment?.method || e.method || e.advancePaymentMethod || 'cash');
        const advanceMethodGroup = mapPaymentMethodGroup(e.advancePaymentMethod || e.paymentMethod || e.method || 'cash');
        const checkoutTime = e.checkoutTime || e.checkOutTime || e.date || e.timestamp || e.createdAt;
        const status = normalizePaymentStatus(e);
        const eventType = String(e.type || e.event || '').toLowerCase();
        return { totalAmount, methodGroup, checkoutTime, status, eventType, advancePayment, advanceMethodGroup };
      });

      const paymentsInShift = enrichedPayments.filter(p => {
        const isCheckout = p.eventType === 'checkout' || p.eventType === 'check-out';
        return isCheckout && p.status === 'paid';
      });
      let cashPayments = paymentsInShift
        .filter(p => p.methodGroup === 'cash')
        .reduce((sum, p) => sum + (p.totalAmount || 0), 0);
      let bankTransferPayments = paymentsInShift
        .filter(p => p.methodGroup === 'bank_transfer')
        .reduce((sum, p) => sum + (p.totalAmount || 0), 0);
      let cardPayments = paymentsInShift
        .filter(p => p.methodGroup === 'card')
        .reduce((sum, p) => sum + (p.totalAmount || 0), 0);

      // Cộng thêm tiền đặt trước (advancePayment) từ sự kiện check-in theo phương thức thanh toán
      const advanceCheckins = enrichedPayments.filter(p => {
        const isCheckin = p.eventType === 'checkin' || p.eventType === 'check-in' || p.eventType === 'checkin_event';
        return isCheckin;
      });
      advanceCheckins.forEach(p => {
        const adv = Number(p.advancePayment) || 0;
        if (adv > 0) {
          if (p.advanceMethodGroup === 'cash') cashPayments += adv;
          else if (p.advanceMethodGroup === 'bank_transfer') bankTransferPayments += adv;
          else if (p.advanceMethodGroup === 'card') cardPayments += adv;
        }
      });

      const expenses = expensesData.data || [];
      const incomes = incomesData.data || [];
      const filteredExpenses = expenses.filter(expense => expense.status === 'completed');
      const filteredIncomes = incomes.filter(income => income.status === 'completed');
      let cashExpense = 0;
      let totalExpenseAmount = 0;
      filteredExpenses.forEach(expense => {
        if (expense.amount > 0) {
          totalExpenseAmount += expense.amount;
          const method = expense.method?.toLowerCase() || '';
          if (method === 'cash') {
            cashExpense += expense.amount;
          }
        }
      });
      let cashIncome = 0;
      let totalIncomeAmount = 0;
      filteredIncomes.forEach(income => {
        if (income.amount > 0) {
          totalIncomeAmount += income.amount;
          const method = income.method?.toLowerCase() || '';
          if (method === 'cash') {
            cashIncome += income.amount;
          }
        }
      });
      const actualCashInShift = cashPayments + cashIncome - cashExpense;
      setCashInShift(String(Math.max(0, actualCashInShift)));
      setBankTransferAmount(String(bankTransferPayments));
      setCashAmount(String(cashPayments));
      setCardPaymentAmount(String(cardPayments));
      setExpenseAmount(String(totalExpenseAmount));
      setIncomeAmount(String(totalIncomeAmount));
    }
  }, [paymentHistoryData, expensesData, incomesData]);

  const filteredStaffs = useMemo(() => {
    const keyword = staffSearch.trim().toLowerCase();
    return staffs.filter(staff => {
      if (fromStaff?.id && staff.id === fromStaff.id) return false;
      if (!keyword) return true;
      const name = (staff.name || '').toLowerCase();
      const email = (staff.email || '').toLowerCase();
      const phone = (staff.phone || '').toLowerCase();
      return (
        name.includes(keyword) ||
        email.includes(keyword) ||
        phone.includes(keyword)
      );
    });
  }, [staffs, staffSearch, fromStaff?.id]);

  const previousAmountValue = parseCurrency(previousShiftAmount);
  const cashInShiftValue = parseCurrency(cashInShift);
  const managerHandoverValue = parseCurrency(managerHandoverAmount);
  const cashAmountValue = parseCurrency(cashAmount);
  const bankTransferAmountValue = parseCurrency(bankTransferAmount);
  const cardPaymentAmountValue = parseCurrency(cardPaymentAmount);
  const expenseAmountValue = parseCurrency(expenseAmount);
  const incomeAmountValue = parseCurrency(incomeAmount);
  const currentShiftTotalRevenue =
    cashAmountValue + bankTransferAmountValue + cardPaymentAmountValue + incomeAmountValue - expenseAmountValue;
  const handoverAmount = previousAmountValue + cashInShiftValue - managerHandoverValue;

  const createMutation = useMutation({
    mutationFn: () =>
      shiftHandoverApi.create({
        hotelId: selectedHotelId || '',
        fromStaffId: fromStaff?.id || '',
        toStaffId: selectedToStaffId || '',
        toUserPassword,
        previousShiftAmount: previousAmountValue,
        cashInShift: cashInShiftValue,
        managerHandoverAmount: managerHandoverValue,
        cashAmount: parseCurrency(cashAmount),
        bankTransferAmount: parseCurrency(bankTransferAmount),
        cardPaymentAmount: parseCurrency(cardPaymentAmount),
        expenseAmount: parseCurrency(expenseAmount),
        incomeAmount: parseCurrency(incomeAmount),
        notes: notes.trim() || undefined,
      }),
    onSuccess: () => {
      Alert.alert(text.success, text.handoverCreated);
      setCurrentShiftQueryTime(new Date().toISOString());
      setToUserPassword('');
      setSelectedToStaffId(null);
      setNotes('');
      queryClient.invalidateQueries({ queryKey: ['shiftHandover'] });
      refetchPrevious();
      refetchHistory();
      refetchPaymentHistory();
      refetchExpenses();
      refetchIncomes();
      refetchOverviewPaymentHistory();
      refetchOverviewExpenses();
      refetchOverviewIncomes();
    },
    onError: (error: any) => {
      Alert.alert(text.error, error?.message || text.handoverFailed);
    },
  });

  const managerMutation = useMutation({
    mutationFn: () =>
      shiftHandoverApi.createManagerHandover({
        hotelId: selectedHotelId || '',
        fromStaffId: fromStaff?.id || '',
        managerUsername,
        managerPassword,
        amount: parseCurrency(managerAmount),
        notes: managerNotes.trim() || undefined,
      }),
    onSuccess: () => {
      Alert.alert(text.success, text.managerHandoverCreated);
      setCurrentShiftQueryTime(new Date().toISOString());
      setManagerUsername('');
      setManagerPassword('');
      setManagerAmount('');
      setManagerNotes('');
      queryClient.invalidateQueries({ queryKey: ['shiftHandover'] });
      refetchPrevious();
      refetchPaymentHistory();
      refetchExpenses();
      refetchIncomes();
      refetchOverviewPaymentHistory();
      refetchOverviewExpenses();
      refetchOverviewIncomes();
    },
    onError: (error: any) => {
      Alert.alert(text.error, error?.message || text.managerHandoverFailed);
    },
  });

  const handleSubmit = () => {
    if (!selectedHotelId) {
      Alert.alert(text.missingInfo, text.selectHotel);
      return;
    }
    if (!fromStaff?.id) {
      Alert.alert(text.missingInfo, text.fromStaffMissing);
      return;
    }
    if (!selectedToStaffId) {
      Alert.alert(text.missingInfo, text.selectToStaff);
      return;
    }
    if (!toUserPassword) {
      Alert.alert(text.missingInfo, text.enterReceiverPassword);
      return;
    }
    createMutation.mutate();
  };

  const handleManagerHandover = () => {
    if (!selectedHotelId) {
      Alert.alert(text.missingInfo, text.selectHotel);
      return;
    }
    if (!fromStaff?.id) {
      Alert.alert(text.missingInfo, text.fromStaffMissing);
      return;
    }
    if (!managerUsername || !managerPassword) {
      Alert.alert(text.missingInfo, text.enterManagerAccount);
      return;
    }
    if (parseCurrency(managerAmount) <= 0) {
      Alert.alert(text.missingInfo, text.managerAmountPositive);
      return;
    }
    managerMutation.mutate();
  };

  const handleRefresh = () => {
    setCurrentShiftQueryTime(new Date().toISOString());
    refetchStaffs();
    refetchPrevious();
    refetchHistory();
    refetchPaymentHistory();
    refetchExpenses();
    refetchIncomes();
    refetchOverviewPaymentHistory();
    refetchOverviewExpenses();
    refetchOverviewIncomes();
  };

  const handleApplyFilters = () => {
    const start = parseDateInput(draftStartDate);
    const end = parseDateInput(draftEndDate, true);

    if (!start || !end) {
      Alert.alert(text.invalidFilter, text.invalidDateFormat);
      return;
    }

    if (start.getTime() > end.getTime()) {
      Alert.alert(text.invalidFilter, text.invalidDateRange);
      return;
    }

    setAppliedStartDate(draftStartDate);
    setAppliedEndDate(draftEndDate);
    setHistoryPage(1);
  };

  const handleResetFilters = () => {
    const nextRange = getRangeFromPreset('today');
    setFilterPreset('today');
    setDraftStartDate(nextRange.startDate);
    setDraftEndDate(nextRange.endDate);
    setAppliedStartDate(nextRange.startDate);
    setAppliedEndDate(nextRange.endDate);
    setHistoryPage(1);
  };

  const handleViewDetail = (record: ShiftHandover) => {
    setSelectedRecord(record);
    setDetailModalVisible(true);
  };

  const handleCloseDetail = () => {
    setDetailModalVisible(false);
    setSelectedRecord(null);
  };

  const getRecordDate = (record: ShiftHandover) => record.handoverTime || record.createdAt;

  const filterRecordItemsByShiftDate = (record: ShiftHandover, items: any[] = []) => {
    const recordDate = getRecordDate(record);
    if (!recordDate) return items;

    return items.filter((item: any) => {
      const timestamp =
        item?.timestamp ||
        item?.createdAt ||
        item?.updatedAt ||
        item?.checkOutTime ||
        item?.checkoutTime;
      return isSameDay(timestamp, recordDate);
    });
  };

  const getTotalRevenue = (record: ShiftHandover) => {
    return (record.cashAmount || 0) + (record.bankTransferAmount || 0) + (record.cardPaymentAmount || 0) + (record.incomeAmount || 0) - (record.expenseAmount || 0);
  };

  const getCustomerPayments = (record: ShiftHandover) => {
    const roomHistory = filterRecordItemsByShiftDate(record, record.roomHistory || []);
    return roomHistory.filter((item: any) => {
      const action = String(item?.action || '').toLowerCase();
      return action === 'check_out' || action === 'checkout' || action === 'check-out';
    });
  };

  const getAdvancePayments = (record: ShiftHandover) => {
    const roomHistory = filterRecordItemsByShiftDate(record, record.roomHistory || []);
    return roomHistory.filter((item: any) => {
      const action = String(item?.action || '').toLowerCase();
      const advance = Number(item?.advancePayment || item?.amount || 0);
      return (action === 'check_in' || action === 'checkin' || action === 'check-in') && advance > 0;
    });
  };

  const getTotalAmount = (items: any[]) => {
    return items.reduce((sum, item) => {
      const amount =
        Number(item?.amount) ||
        Number(item?.totalAmount) ||
        Number(item?.adjustedTotal) ||
        Number(item?.roomTotal) ||
        0;
      return sum + amount;
    }, 0);
  };
  
  const getExpenseDetails = (record: ShiftHandover) => {
    return filterRecordItemsByShiftDate(record, record.expenseDetails || record.expenses || []);
  };
  
  const getIncomeDetails = (record: ShiftHandover) => {
    return filterRecordItemsByShiftDate(record, record.incomeDetails || record.incomes || []);
  };

  // Helper functions for enhanced customer payments table
  const getRoomTotal = (room: any) => room.roomTotal || 0;
  const getAdditionalCharges = (room: any) => room.additionalCharges || 0;
  const getDiscount = (room: any) => room.discount || 0;
  const getServiceAmount = (room: any) => room.serviceAmount || 0;
  const getAdvancePayment = (room: any) => room.advancePayment || 0;
  const getAdjustedTotal = (room: any) => room.adjustedTotal || room.totalAmount || 0;
  const getRemainingAmount = (room: any) => room.remainingAmount || 0;
  const getCheckinTime = (room: any) => room.checkinTime || room.checkInTime;

  const getGuestSourceColor = (room: any) => {
    const source = room.source || room.guestSource || 'direct';
    switch (source) {
      case 'direct': return '#52c41a';
      case 'booking': return '#1890ff';
      case 'walkin': return '#faad14';
      default: return '#7F8C8D';
    }
  };

  const getRecordComputedSummary = (record: ShiftHandover) => {
    const customerPayments = getCustomerPayments(record);
    const advancePayments = getAdvancePayments(record);
    const expenses = getExpenseDetails(record);
    const incomes = getIncomeDetails(record);

    let cash = 0;
    let bankTransfer = 0;
    let card = 0;

    customerPayments.forEach((room: any) => {
      const method = mapPaymentMethodGroup(room.paymentMethod || room.method || 'cash');
      const amount = Number(room.amount || room.totalAmount || room.adjustedTotal || 0);
      if (method === 'bank_transfer') bankTransfer += amount;
      else if (method === 'card') card += amount;
      else cash += amount;
    });

    advancePayments.forEach((room: any) => {
      const method = mapPaymentMethodGroup(room.advancePaymentMethod || room.paymentMethod || room.method || 'cash');
      const amount = Number(room.advancePayment || room.amount || 0);
      if (method === 'bank_transfer') bankTransfer += amount;
      else if (method === 'card') card += amount;
      else cash += amount;
    });

    const expense = expenses.reduce((sum, item) => sum + Number(item?.amount || 0), 0);
    const income = incomes.reduce((sum, item) => sum + Number(item?.amount || 0), 0);
    const totalRevenue = cash + bankTransfer + card + income - expense;

    return {
      cash,
      bankTransfer,
      card,
      expense,
      income,
      totalRevenue,
    };
  };

  const isLoading =
    staffsLoading ||
    previousLoading ||
    historyLoading ||
    paymentHistoryLoading ||
    expensesLoading ||
    incomesLoading ||
    overviewPaymentHistoryLoading ||
    overviewExpensesLoading ||
    overviewIncomesLoading;

  const historyItems = historyData?.data || [];
  const totalPages = historyData?.pagination?.totalPages || 1;
  const revenueOverview = useMemo(
    () =>
      buildRevenueOverview(
        overviewPaymentHistoryData || [],
        overviewExpensesData?.data || [],
        overviewIncomesData?.data || []
      ),
    [overviewExpensesData?.data, overviewIncomesData?.data, overviewPaymentHistoryData]
  );
  const activeFilterSummary = `${formatFilterDateLabel(appliedStartDate)} - ${formatFilterDateLabel(appliedEndDate)}`;

  return (
    <AccessGuard features={['shift_handover']}>
      <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>{text.title}</Text>
          <Text style={styles.headerSubtitle}>{text.subtitle}</Text>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.refreshButton} onPress={handleRefresh}>
            <Ionicons name="refresh" size={18} color="#FFF" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={handleRefresh} />}
      >
        {/* Tổng quan doanh thu - Theo format hotelapp */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{text.revenueOverview}</Text>
            <View style={styles.sectionActions}>
              <TouchableOpacity style={styles.actionButton} onPress={() => {/* TODO: Export Excel */}}>
                <Ionicons name="document-text" size={16} color="#1890ff" />
                <Text style={styles.actionButtonText}>{text.exportExcel}</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.filterSummaryBadge}>
            <Ionicons name="calendar-outline" size={14} color="#1890ff" />
            <Text style={styles.filterSummaryText}>{activeFilterSummary}</Text>
          </View>

          <View style={styles.revenueGrid}>
            <View style={styles.revenueCard}>
              <Text style={styles.revenueLabel}>{text.cash}</Text>
              <Text style={[styles.revenueValue, { color: '#52c41a' }]}>
                {formatCurrency(revenueOverview.cashTotal)}
              </Text>
            </View>
            <View style={styles.revenueCard}>
              <Text style={styles.revenueLabel}>{text.bankTransfer}</Text>
              <Text style={[styles.revenueValue, { color: '#1890ff' }]}>
                {formatCurrency(revenueOverview.bankTransferTotal)}
              </Text>
            </View>
            <View style={styles.revenueCard}>
              <Text style={styles.revenueLabel}>{text.card}</Text>
              <Text style={[styles.revenueValue, { color: '#722ed1' }]}>
                {formatCurrency(revenueOverview.cardTotal)}
              </Text>
            </View>
            <View style={styles.revenueCard}>
              <Text style={styles.revenueLabel}>{text.expenseVoucher}</Text>
              <Text style={[styles.revenueValue, { color: '#f5222d' }]}>
                {formatCurrency(revenueOverview.expenseTotal)}
              </Text>
            </View>
            <View style={styles.revenueCard}>
              <Text style={styles.revenueLabel}>{text.incomeVoucher}</Text>
              <Text style={[styles.revenueValue, { color: '#13c2c2' }]}>
                {formatCurrency(revenueOverview.incomeTotal)}
              </Text>
            </View>
            <View style={styles.revenueCard}>
              <Text style={styles.revenueLabel}>{text.totalRevenue}</Text>
              <Text style={[styles.revenueValue, { color: '#faad14', fontWeight: 'bold' }]}>
                {formatCurrency(revenueOverview.totalRevenue)}
              </Text>
            </View>
          </View>
          
          <View style={styles.formulaNote}>
            <Ionicons name="information-circle" size={14} color="#1890ff" />
            <Text style={styles.formulaText}>
              <Text style={{ fontWeight: 'bold' }}>{text.formulaLabel}</Text> {text.formulaDescription}
            </Text>
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{text.history}</Text>
            <View style={styles.sectionActions}>
              <TouchableOpacity style={styles.actionButton} onPress={() => setFiltersVisible(prev => !prev)}>
                <Ionicons name="filter" size={16} color="#1890ff" />
                <Text style={styles.actionButtonText}>{text.filter}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionButton} onPress={() => {/* TODO: Export History */}}>
                <Ionicons name="document-text" size={16} color="#1890ff" />
                <Text style={styles.actionButtonText}>{text.exportExcel}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionButton} onPress={() => {/* TODO: Export Revenue */}}>
                <Ionicons name="cash" size={16} color="#1890ff" />
                <Text style={styles.actionButtonText}>{text.exportRevenue}</Text>
              </TouchableOpacity>
            </View>
          </View>
          {filtersVisible ? (
            <View style={styles.filterPanel}>
              <View style={styles.filterPresetRow}>
                {filterPresetOptions.map((item) => {
                  const isActive = filterPreset === item.key;
                  return (
                    <TouchableOpacity
                      key={item.key}
                      style={[styles.filterChip, isActive && styles.filterChipActive]}
                      onPress={() => setFilterPreset(item.key as FilterPreset)}
                    >
                      <Text style={[styles.filterChipText, isActive && styles.filterChipTextActive]}>
                        {item.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <View style={styles.filterInputsRow}>
                <View style={styles.filterInputGroup}>
                  <Text style={styles.filterInputLabel}>{text.fromDate}</Text>
                  <TextInput
                    style={styles.filterInput}
                    value={draftStartDate}
                    onChangeText={setDraftStartDate}
                    placeholder="YYYY-MM-DD"
                    autoCapitalize="none"
                  />
                </View>
                <View style={styles.filterInputGroup}>
                  <Text style={styles.filterInputLabel}>{text.toDate}</Text>
                  <TextInput
                    style={styles.filterInput}
                    value={draftEndDate}
                    onChangeText={setDraftEndDate}
                    placeholder="YYYY-MM-DD"
                    autoCapitalize="none"
                  />
                </View>
              </View>

              <View style={styles.filterActionRow}>
                <TouchableOpacity style={styles.secondaryFilterButton} onPress={handleResetFilters}>
                  <Ionicons name="refresh-outline" size={16} color="#1890ff" />
                  <Text style={styles.secondaryFilterButtonText}>{text.reset}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.primaryFilterButton} onPress={handleApplyFilters}>
                  <Ionicons name="search-outline" size={16} color="#FFF" />
                  <Text style={styles.primaryFilterButtonText}>{text.apply}</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : null}
          {historyItems.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="time-outline" size={48} color="#C7C7CC" />
              <Text style={styles.emptyText}>{text.noHistory}</Text>
            </View>
          ) : (
            <View style={styles.historyList}>
              {historyItems.map((item: ShiftHandover) => {
                const fromName = resolveStaffName((item as any).fromStaffId, staffs) || item.fromStaffName;
                const toName = resolveStaffName((item as any).toStaffId, staffs) || item.toStaffName;
                return (
                  <View key={item._id || `${item.fromStaffId}-${item.handoverTime}`} style={styles.historyCard}>
                    <View style={styles.historyHeader}>
                      <Text style={styles.historyTitle}>
                        {fromName || text.staff} → {toName || text.staff}
                      </Text>
                      <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
                        <Text style={styles.statusText}>{getStatusLabel(item.status)}</Text>
                      </View>
                    </View>
                    <Text style={styles.historyTime}>{formatDateTime(item.handoverTime)}</Text>
                    <View style={styles.historyAmountRow}>
              <Text style={styles.historyAmountLabel}>{text.handoverAmount}</Text>
              <Text style={styles.historyAmountValue}>
                {formatCurrency(item.handoverAmount || 0)}
              </Text>
            </View>
            <TouchableOpacity
              style={styles.viewDetailButton}
              onPress={() => handleViewDetail(item)}
            >
              <Ionicons name="eye" size={16} color="#3498DB" />
              <Text style={styles.viewDetailText}>{text.viewDetail}</Text>
            </TouchableOpacity>
                  </View>
                );
              })}
            </View>
          )}

          <View style={styles.pagination}>
            <TouchableOpacity
              style={[styles.pageButton, historyPage === 1 && styles.buttonDisabled]}
              onPress={() => setHistoryPage(prev => Math.max(1, prev - 1))}
              disabled={historyPage === 1}
            >
              <Ionicons name="chevron-back" size={18} color="#FFF" />
            </TouchableOpacity>
            <Text style={styles.pageText}>
              {text.pageLabel} {historyPage} / {totalPages}
            </Text>
            <TouchableOpacity
              style={[styles.pageButton, historyPage >= totalPages && styles.buttonDisabled]}
              onPress={() => setHistoryPage(prev => Math.min(totalPages, prev + 1))}
              disabled={historyPage >= totalPages}
            >
              <Ionicons name="chevron-forward" size={18} color="#FFF" />
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      <Modal
        visible={staffModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setStaffModalVisible(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setStaffModalVisible(false)}>
          <Pressable style={styles.modalContent} onPress={() => {}}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{text.selectStaff}</Text>
              <TouchableOpacity onPress={() => setStaffModalVisible(false)}>
                <Ionicons name="close" size={22} color="#2C3E50" />
              </TouchableOpacity>
            </View>
            <View style={styles.searchBox}>
              <Ionicons name="search" size={18} color="#7F8C8D" />
              <TextInput
                style={styles.searchInput}
                placeholder={text.searchStaffPlaceholder}
                value={staffSearch}
                onChangeText={setStaffSearch}
              />
            </View>
            <ScrollView style={styles.staffList}>
              {filteredStaffs.map(staff => (
                <TouchableOpacity
                  key={staff.id}
                  style={styles.staffItem}
                  onPress={() => {
                    setSelectedToStaffId(staff.id);
                    setStaffModalVisible(false);
                  }}
                >
                  <View>
                    <Text style={styles.staffName}>{staff.name}</Text>
                    <Text style={styles.staffSubtext}>{staff.position || staff.department}</Text>
                  </View>
                  {selectedToStaffId === staff.id && (
                    <Ionicons name="checkmark-circle" size={18} color="#2ECC71" />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Modal chi tiết giao ca */}
      <Modal
        visible={detailModalVisible}
        transparent
        animationType="slide"
        onRequestClose={handleCloseDetail}
      >
        <View style={styles.modalOverlay}>
          <Pressable style={styles.modalBackdrop} onPress={handleCloseDetail} />
          <View style={[styles.modalContent, styles.detailModal]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { fontSize: 18 }]}>{text.detailTitle}</Text>
              <TouchableOpacity onPress={handleCloseDetail} style={{ padding: 8 }}>
                <Ionicons name="close" size={24} color="#2C3E50" />
              </TouchableOpacity>
            </View>
            
            <ScrollView
              style={styles.detailScroll}
              showsVerticalScrollIndicator={false}
              nestedScrollEnabled
              scrollEventThrottle={16}
            >
              {selectedRecord && (
                <View style={styles.detailContent}>
                  {(() => {
                    const computedSummary = getRecordComputedSummary(selectedRecord);
                    return (
                      <>
                  {/* Thông tin cơ bản */}
                  <View style={styles.detailSection}>
                    <Text style={styles.detailSectionTitle}>{text.handoverInfo}</Text>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>{text.time}</Text>
                      <Text style={[styles.detailValue, { fontSize: 11 }]}>{formatDateTime(selectedRecord.handoverTime)}</Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>{text.from}</Text>
                      <Text style={[styles.detailValue, { fontSize: 11 }]}>{selectedRecord.fromStaffName || text.notAvailable}</Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>{text.to}</Text>
                      <Text style={[styles.detailValue, { fontSize: 11 }]}>{selectedRecord.toStaffName || text.notAvailable}</Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>{text.status}</Text>
                      <View style={[styles.statusBadge, { backgroundColor: getStatusColor(selectedRecord.status) }]}>
                        <Text style={styles.statusText}>{getStatusLabel(selectedRecord.status)}</Text>
                      </View>
                    </View>
                  </View>

                  {/* Chi tiết tiền */}
                  <View style={styles.detailSection}>
                    <Text style={styles.detailSectionTitle}>{text.moneyDetails}</Text>
                    <View style={styles.detailRow}>
                      <Text style={[styles.detailLabel, { fontSize: 11 }]}>{text.previousShiftCash}</Text>
                      <Text style={[styles.detailValue, { fontSize: 11 }]}>{formatCurrency(selectedRecord.previousShiftAmount || 0)}</Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={[styles.detailLabel, { fontSize: 11 }]}>{text.shiftCash}</Text>
                      <Text style={[styles.detailValue, { fontSize: 11, color: '#2ECC71', fontWeight: '600' }]}>{formatCurrency(selectedRecord.cashInShift || 0)}</Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={[styles.detailLabel, { fontSize: 11 }]}>{text.managerCash}</Text>
                      <Text style={[styles.detailValue, { fontSize: 11 }]}>{formatCurrency(selectedRecord.managerHandoverAmount || 0)}</Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={[styles.detailLabel, { fontSize: 11 }]}>{text.collectedCash}</Text>
                      <Text style={[styles.detailValue, { fontSize: 11 }]}>{formatCurrency(computedSummary.cash)}</Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={[styles.detailLabel, { fontSize: 11 }]}>{text.bankTransfer}</Text>
                      <Text style={[styles.detailValue, { fontSize: 11 }]}>{formatCurrency(computedSummary.bankTransfer)}</Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={[styles.detailLabel, { fontSize: 11 }]}>{text.card}</Text>
                      <Text style={[styles.detailValue, { fontSize: 11 }]}>{formatCurrency(computedSummary.card)}</Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={[styles.detailLabel, { fontSize: 11 }]}>{text.expenseVoucher}</Text>
                      <Text style={[styles.detailValue, { fontSize: 11, color: '#E74C3C' }]}>{formatCurrency(computedSummary.expense)}</Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={[styles.detailLabel, { fontSize: 11 }]}>{text.incomeVoucher}</Text>
                      <Text style={[styles.detailValue, { fontSize: 11, color: '#2ECC71' }]}>{formatCurrency(computedSummary.income)}</Text>
                    </View>
                    <View style={[styles.detailRow, { borderTopWidth: 1, borderTopColor: '#E9ECEF', marginTop: 4, paddingTop: 6 }]}>
                      <Text style={[styles.detailLabel, { fontSize: 11, fontWeight: '600' }]}>{text.totalRevenue}</Text>
                      <Text style={[styles.detailValue, styles.totalValue, { fontSize: 11 }]}>{formatCurrency(computedSummary.totalRevenue)}</Text>
                    </View>
                    <View style={[styles.detailRow, { marginTop: 2 }]}>
                      <Text style={[styles.detailLabel, { fontSize: 11, fontWeight: '600' }]}>{text.handoverAmount}</Text>
                      <Text style={[styles.detailValue, styles.totalValue, { fontSize: 11 }]}>{formatCurrency(selectedRecord.handoverAmount || 0)}</Text>
                    </View>
                  </View>

                  {/* Ghi chú */}
                  {selectedRecord.notes && (
                    <View style={styles.detailSection}>
                      <Text style={styles.detailSectionTitle}>{text.notes}</Text>
                      <Text style={styles.detailText}>{selectedRecord.notes}</Text>
                    </View>
                  )}

                  {/* Chi tiết phiếu chi */}
                  {getExpenseDetails(selectedRecord).length > 0 && (
                    <View style={styles.detailSection}>
                      <Text style={styles.detailSectionTitle}>
                        {text.expenseDetailsTotal} {formatCurrency(getTotalAmount(getExpenseDetails(selectedRecord)))}
                      </Text>
                      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                        <View>
                <View style={styles.tableHeader}>
                  <Text style={[styles.tableHeaderText, { minWidth: 300 }]}>{text.content}</Text>
                  <Text style={[styles.tableHeaderText, { minWidth: 100, textAlign: 'right' }]}>{text.amount}</Text>
                  <Text style={[styles.tableHeaderText, { minWidth: 100, textAlign: 'right' }]}>{text.method}</Text>
                </View>
                {getExpenseDetails(selectedRecord).map((expense, index) => (
                  <View key={index} style={styles.tableRow}>
                    <Text style={[styles.tableCell, { minWidth: 300 }]}>{expense.description || expense.content || text.notAvailable}</Text>
                    <Text style={[styles.tableCell, { minWidth: 100, textAlign: 'right' }]}>{formatCurrency(expense.amount || 0)}</Text>
                    <Text style={[styles.tableCell, { minWidth: 100, textAlign: 'right' }]}>{getPaymentMethodLabel(expense.method || 'cash')}</Text>
                  </View>
                ))}
              </View>
                      </ScrollView>
                    </View>
                  )}

                  {/* Chi tiết phiếu thu */}
                  {getIncomeDetails(selectedRecord).length > 0 && (
                    <View style={styles.detailSection}>
                      <Text style={styles.detailSectionTitle}>
                        {text.incomeDetailsTotal} {formatCurrency(getTotalAmount(getIncomeDetails(selectedRecord)))}
                      </Text>
                      <ScrollView horizontal showsHorizontalScrollIndicator={true}>
                        <View>
                <View style={styles.tableHeader}>
                  <Text style={[styles.tableHeaderText, { minWidth: 300 }]}>{text.content}</Text>
                  <Text style={[styles.tableHeaderText, { minWidth: 100, textAlign: 'right' }]}>{text.amount}</Text>
                  <Text style={[styles.tableHeaderText, { minWidth: 100, textAlign: 'right' }]}>{text.method}</Text>
                </View>
                {getIncomeDetails(selectedRecord).map((income, index) => (
                  <View key={index} style={styles.tableRow}>
                    <Text style={[styles.tableCell, { minWidth: 300 }]}>{income.description || income.content || text.notAvailable}</Text>
                    <Text style={[styles.tableCell, { minWidth: 100, textAlign: 'right' }]}>{formatCurrency(income.amount || 0)}</Text>
                    <Text style={[styles.tableCell, { minWidth: 100, textAlign: 'right' }]}>{getPaymentMethodLabel(income.method || 'cash')}</Text>
                  </View>
                ))}
              </View>
                      </ScrollView>
                    </View>
                  )}

                  {/* Lịch sử tiền nhận từ đặt cọc */}
                  {getAdvancePayments(selectedRecord).length > 0 && (
                    <View style={styles.detailSection}>
                      <Text style={styles.detailSectionTitle}>
                        {text.depositDetailsTotal} {formatCurrency(getTotalAmount(getAdvancePayments(selectedRecord)))}
                      </Text>
                      <ScrollView horizontal showsHorizontalScrollIndicator={true}>
                        <View>
                          <View style={styles.tableHeader}>
                            <Text style={[styles.tableHeaderText, { minWidth: 120 }]}>{text.room}</Text>
                            <Text style={[styles.tableHeaderText, { minWidth: 160 }]}>{text.customer}</Text>
                            <Text style={[styles.tableHeaderText, { minWidth: 120, textAlign: 'right' }]}>{text.deposit}</Text>
                            <Text style={[styles.tableHeaderText, { minWidth: 120, textAlign: 'right' }]}>{text.paymentMethodShort}</Text>
                            <Text style={[styles.tableHeaderText, { minWidth: 140 }]}>{text.checkin}</Text>
                          </View>
                          {getAdvancePayments(selectedRecord).map((room, index) => (
                            <View key={index} style={styles.tableRow}>
                              <Text style={[styles.tableCell, { minWidth: 120 }]}>{`${text.room} ${room.roomNumber || text.notAvailable}`}</Text>
                              <Text style={[styles.tableCell, { minWidth: 160 }]}>{room.customerName || room.guestName || text.guest}</Text>
                              <Text style={[styles.tableCell, { minWidth: 120, textAlign: 'right' }]}>
                                {formatCurrency(Number(room.advancePayment || room.amount || 0))}
                              </Text>
                              <Text style={[styles.tableCell, { minWidth: 120, textAlign: 'right' }]}>
                                {getPaymentMethodLabel(room.advancePaymentMethod || room.paymentMethod || 'cash')}
                              </Text>
                              <Text style={[styles.tableCell, { minWidth: 140 }]}>{formatDateTime(getCheckinTime(room))}</Text>
                            </View>
                          ))}
                        </View>
                      </ScrollView>
                    </View>
                  )}

                  {/* Lịch sử tiền nhận từ khách */}
                  {getCustomerPayments(selectedRecord).length > 0 && (
                    <View style={styles.detailSection}>
                      <Text style={styles.detailSectionTitle}>
                        {text.customerRevenueSummary} {formatCurrency(computedSummary.totalRevenue)}
                      </Text>
                      <View style={styles.tableContainer}>
                        <ScrollView horizontal showsHorizontalScrollIndicator={true} nestedScrollEnabled scrollEventThrottle={16}>
                          <View>
                            <View style={styles.tableHeader}>
                              <Text style={[styles.tableHeaderText, { minWidth: 80 }]}>{text.room}</Text>
                              <Text style={[styles.tableHeaderText, { minWidth: 100 }]}>{text.action}</Text>
                              <Text style={[styles.tableHeaderText, { minWidth: 120 }]}>{text.customer}</Text>
                              <Text style={[styles.tableHeaderText, { minWidth: 100 }]}>{text.source}</Text>
                              <Text style={[styles.tableHeaderText, { minWidth: 100, textAlign: 'right' }]}>{text.roomTotal}</Text>
                              <Text style={[styles.tableHeaderText, { minWidth: 100, textAlign: 'right' }]}>{text.surcharge}</Text>
                              <Text style={[styles.tableHeaderText, { minWidth: 100, textAlign: 'right' }]}>{text.discount}</Text>
                              <Text style={[styles.tableHeaderText, { minWidth: 100, textAlign: 'right' }]}>{text.service}</Text>
                              <Text style={[styles.tableHeaderText, { minWidth: 120, textAlign: 'right' }]}>{text.advancePayment}</Text>
                              <Text style={[styles.tableHeaderText, { minWidth: 120, textAlign: 'right' }]}>{text.adjustedTotal}</Text>
                              <Text style={[styles.tableHeaderText, { minWidth: 120, textAlign: 'right' }]}>{text.remaining}</Text>
                              <Text style={[styles.tableHeaderText, { minWidth: 120, textAlign: 'right' }]}>{text.payment}</Text>
                              <Text style={[styles.tableHeaderText, { minWidth: 100 }]}>{text.paymentMethodShort}</Text>
                              <Text style={[styles.tableHeaderText, { minWidth: 140 }]}>Check-in</Text>
                              <Text style={[styles.tableHeaderText, { minWidth: 140 }]}>Check-out</Text>
                            </View>
                            <ScrollView
                              style={styles.tableVerticalScroll}
                              nestedScrollEnabled
                              showsVerticalScrollIndicator={true}
                              scrollEventThrottle={16}
                              removeClippedSubviews
                            >
                              {getCustomerPayments(selectedRecord).map((room, index) => (
                                <View key={index} style={styles.tableRow}>
                                  <Text style={[styles.tableCell, { minWidth: 80 }]}>{text.room} {room.roomNumber}</Text>
                                  <Text style={[styles.tableCell, { minWidth: 100 }]}>{getActionLabel(room.action)}</Text>
                                  <Text style={[styles.tableCell, { minWidth: 120 }]}>{room.customerName}</Text>
                                  <Text style={[styles.tableCell, { minWidth: 100 }]}>
                                    <Text style={[styles.sourceTag, { backgroundColor: getGuestSourceColor(room) }]}>
                                      {getGuestSourceLabel(room)}
                                    </Text>
                                  </Text>
                                  <Text style={[styles.tableCell, { minWidth: 100, textAlign: 'right' }]}>{formatCurrency(getRoomTotal(room))}</Text>
                                  <Text style={[styles.tableCell, { minWidth: 100, textAlign: 'right' }]}>{formatCurrency(getAdditionalCharges(room))}</Text>
                                  <Text style={[styles.tableCell, { minWidth: 100, textAlign: 'right' }]}>{formatCurrency(getDiscount(room))}</Text>
                                  <Text style={[styles.tableCell, { minWidth: 100, textAlign: 'right' }]}>{formatCurrency(getServiceAmount(room))}</Text>
                                  <Text style={[styles.tableCell, { minWidth: 120, textAlign: 'right' }]}>{formatCurrency(getAdvancePayment(room))}</Text>
                                  <Text style={[styles.tableCell, { minWidth: 120, textAlign: 'right', fontWeight: '600' }]}>{formatCurrency(getAdjustedTotal(room))}</Text>
                                  <Text style={[styles.tableCell, { minWidth: 120, textAlign: 'right' }]}>{formatCurrency(getRemainingAmount(room))}</Text>
                                  <Text style={[styles.tableCell, { minWidth: 120, textAlign: 'right', fontWeight: '600', color: '#2ECC71' }]}>{formatCurrency(room.amount || 0)}</Text>
                                  <Text style={[styles.tableCell, { minWidth: 100 }]}>
                                    {getPaymentMethodLabel(room.paymentMethod || 'cash')}
                                  </Text>
                                  <Text style={[styles.tableCell, { minWidth: 140 }]}>{formatDateTime(getCheckinTime(room))}</Text>
                                  <Text style={[styles.tableCell, { minWidth: 140 }]}>{formatDateTime(room.timestamp)}</Text>
                                </View>
                              ))}
                            </ScrollView>
                          </View>
                        </ScrollView>
                      </View>
                    </View>
                  )}
                      </>
                    );
                  })()}
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
      </View>
    </AccessGuard>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  header: {
    backgroundColor: '#FFF',
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E9ECEF',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#2C3E50',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#7F8C8D',
    marginTop: 4,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  historyButton: {
    backgroundColor: '#52c41a',
    padding: 10,
    borderRadius: 12,
  },
  refreshButton: {
    backgroundColor: '#3498DB',
    padding: 10,
    borderRadius: 12,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  section: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2C3E50',
    marginBottom: 12,
  },
  summaryGrid: {
    gap: 12,
  },
  summaryCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 12,
  },
  summaryLabel: {
    fontSize: 12,
    color: '#7F8C8D',
  },
  summaryValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2C3E50',
    marginTop: 4,
  },
  summarySubtext: {
    fontSize: 12,
    color: '#95A5A6',
    marginTop: 4,
  },
  formRow: {
    marginBottom: 12,
  },
  formLabel: {
    fontSize: 13,
    color: '#5D6D7E',
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#2C3E50',
    backgroundColor: '#FAFAFA',
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  readonlyBox: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#F2F4F7',
  },
  readonlyText: {
    fontSize: 14,
    color: '#2C3E50',
  },
  selectBox: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: '#FAFAFA',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  selectText: {
    fontSize: 14,
    color: '#2C3E50',
  },
  summaryFooter: {
    marginTop: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  submitButton: {
    backgroundColor: '#2ECC71',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  managerButton: {
    backgroundColor: '#2980B9',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  submitButtonText: {
    color: '#FFF',
    fontWeight: '600',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  emptyText: {
    marginTop: 8,
    color: '#7F8C8D',
  },
  historyList: {
    gap: 12,
  },
  historyCard: {
    borderWidth: 1,
    borderColor: '#EDF2F7',
    borderRadius: 12,
    padding: 12,
    backgroundColor: '#FAFAFA',
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  historyTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2C3E50',
    flex: 1,
  },
  historyTime: {
    fontSize: 12,
    color: '#95A5A6',
    marginTop: 6,
  },
  historyAmountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  historyAmountLabel: {
    fontSize: 12,
    color: '#7F8C8D',
  },
  historyAmountValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2C3E50',
  },
  statusBadge: {
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  statusText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: '600',
  },
  pagination: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  pageButton: {
    backgroundColor: '#3498DB',
    padding: 8,
    borderRadius: 8,
  },
  pageText: {
    fontSize: 13,
    color: '#2C3E50',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    padding: 8,
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  modalContent: {
   backgroundColor: '#FFFF',
    borderRadius: 12,
    padding: 12,
    maxHeight: '92%',
    maxWidth: '100%',
    alignSelf: 'center',
    width: '100%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingRight: 4,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2C3E50',
    flex: 1,
    marginRight: 8,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F2F4F7',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    gap: 8,
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#2C3E50',
  },
  staffList: {
    maxHeight: 360,
  },
  staffItem: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F3F5',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  staffName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2C3E50',
  },
  staffSubtext: {
    fontSize: 12,
    color: '#95A5A6',
    marginTop: 2,
  },
  // Detail modal styles
  detailModal: {
    maxHeight: '92%',
    width: '100%',
    alignSelf: 'center',
  },
  detailScroll: {
    maxHeight: '100%',
  },
  detailContent: {
    gap: 12,
    paddingBottom: 16,
  },
  detailSection: {
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    padding: 10,
    marginBottom: 12,
  },
  detailSectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#2C3E50',
    marginBottom: 6,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 3,
  },
  detailLabel: {
    fontSize: 12,
    color: '#7F8C8D',
    flex: 1,
    paddingRight: 8,
  },
  detailValue: {
    fontSize: 12,
    color: '#2C3E50',
    fontWeight: '500',
    textAlign: 'right',
    flexShrink: 1,
  },
  totalValue: {
    color: '#2ECC71',
    fontWeight: '700',
  },
  detailText: {
    fontSize: 13,
    color: '#2C3E50',
    lineHeight: 18,
  },
  paymentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#EDF2F7',
  },
  paymentInfo: {
    flex: 1,
    paddingRight: 8,
  },
  paymentRoom: {
    fontSize: 12,
    fontWeight: '600',
    color: '#2C3E50',
  },
  paymentGuest: {
    fontSize: 11,
    color: '#7F8C8D',
    marginTop: 1,
  },
  paymentMethod: {
    fontSize: 10,
    color: '#95A5A6',
    marginTop: 1,
  },
  paymentAmount: {
    fontSize: 12,
    fontWeight: '600',
    color: '#2ECC71',
  },
  viewDetailButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 8,
    paddingVertical: 4,
  },
  viewDetailText: {
    fontSize: 12,
    color: '#3498DB',
    fontWeight: '500',
  },
  // Table styles for detail modal
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#F8F9FA',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#E9ECEF',
    // minWidth: 800, // Đã xóa global minWidth để responsive trên mobile
  },
  tableHeaderText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#495057',
    paddingHorizontal: 4,
    textAlign: 'left',
  },
  tableContainer: {
    maxHeight: 260,
  },
  tableVerticalScroll: {
    maxHeight: 220,
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E9ECEF',
    // minWidth: 800, // Đã xóa global minWidth
  },
  tableCell: {
    fontSize: 11,
    color: '#495057',
    paddingHorizontal: 4,
    textAlign: 'left',
  },
  sourceTag: {
    fontSize: 9,
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 3,
    color: '#FFF',
    fontWeight: '500',
  },
  // Revenue Overview Styles - Theo format hotelapp
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionActions: {
    flexDirection: 'row',
    gap: 8,
  },
  filterSummaryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    backgroundColor: '#F0F8FF',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginBottom: 12,
  },
  filterSummaryText: {
    fontSize: 12,
    color: '#1890ff',
    fontWeight: '500',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#f0f8ff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#1890ff20',
  },
  actionButtonText: {
    fontSize: 12,
    color: '#1890ff',
    fontWeight: '500',
  },
  filterPanel: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5EEF7',
    padding: 12,
    marginBottom: 16,
    gap: 12,
  },
  filterPresetRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D9E2EC',
  },
  filterChipActive: {
    backgroundColor: '#1890ff',
    borderColor: '#1890ff',
  },
  filterChipText: {
    fontSize: 12,
    color: '#52606D',
    fontWeight: '500',
  },
  filterChipTextActive: {
    color: '#FFFFFF',
  },
  filterInputsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  filterInputGroup: {
    flex: 1,
  },
  filterInputLabel: {
    fontSize: 12,
    color: '#52606D',
    marginBottom: 6,
  },
  filterInput: {
    borderWidth: 1,
    borderColor: '#D9E2EC',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#2C3E50',
    backgroundColor: '#FFFFFF',
  },
  filterActionRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
  },
  secondaryFilterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D9E2EC',
  },
  secondaryFilterButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1890ff',
  },
  primaryFilterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#1890ff',
  },
  primaryFilterButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  revenueGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 16,
  },
  revenueCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    flex: 1,
    minWidth: 100,
    borderWidth: 1,
    borderColor: '#E9ECEF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  revenueLabel: {
    fontSize: 12,
    color: '#7F8C8D',
    marginBottom: 4,
  },
  revenueValue: {
    fontSize: 16,
    fontWeight: '700',
  },
  formulaNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#f0f8ff',
    padding: 12,
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#1890ff',
  },
  formulaText: {
    fontSize: 12,
    color: '#2C3E50',
    flex: 1,
  },
  // Form Section Styles
  formSection: {
    marginBottom: 20,
  },
  formSectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2C3E50',
    marginBottom: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E9ECEF',
  },
  notesInput: {
    minHeight: 80,
    textAlignVertical: 'top',
    paddingTop: 12,
  },
  // Summary Section Styles
  summarySection: {
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#E9ECEF',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 12,
  },
  summaryItem: {
    flex: 1,
    minWidth: '45%',
    padding: 12,
    backgroundColor: '#FFF',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#E9ECEF',
  },
  highlight: {
    backgroundColor: '#E3F2FD',
    borderColor: '#1890ff',
  },
  summaryAmount: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2C3E50',
  },
  positive: {
    color: '#52c41a',
  },
  negative: {
    color: '#ff4d4f',
  },
  total: {
    color: '#1890ff',
    fontSize: 18,
  },
});
