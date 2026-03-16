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
import { useRouter } from 'expo-router';
import { Staff } from '@/types/hotel';

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
  }).format(amount || 0);
};

const parseCurrency = (value: string) => {
  if (!value) return 0;
  const cleaned = value.replace(/[^\d.-]/g, '');
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : 0;
};

const formatDateTime = (value?: string | Date) => {
  if (!value) return '';
  return new Date(value).toLocaleString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const getStatusLabel = (status?: string) => {
  switch (status) {
    case 'confirmed':
      return 'Đã xác nhận';
    case 'pending':
      return 'Đang chờ';
    case 'rejected':
      return 'Từ chối';
    case 'cancelled':
      return 'Đã hủy';
    default:
      return 'Không rõ';
  }
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

export default function ShiftHandoverScreen() {
  const queryClient = useQueryClient();
  const { selectedHotelId } = useHotel();
  const { user } = useAuth();
  const router = useRouter();

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

  const { data: revenueData, isLoading: revenueLoading, refetch: refetchRevenue } = useQuery({
    queryKey: ['shiftHandover', 'revenue', selectedHotelId],
    queryFn: () => shiftHandoverApi.getRevenue(selectedHotelId || ''),
    enabled: !!selectedHotelId,
  });

  // Lấy payment history để tính tiền mặt, chuyển khoản, cà thẻ trong ca
  const { data: paymentHistoryData, isLoading: paymentHistoryLoading, refetch: refetchPaymentHistory } = useQuery({
    queryKey: ['paymentHistory', selectedHotelId],
    queryFn: () => selectedHotelId ? roomsApi.getEventsByHotel(selectedHotelId, { 
      types: ['checkout', 'checkin'], 
      limit: 1000,
      skip: 0
    }) : Promise.resolve([]),
    enabled: !!selectedHotelId,
  });

  // Lấy danh sách phiếu chi trong ca
  const { data: expensesData, isLoading: expensesLoading, refetch: refetchExpenses } = useQuery({
    queryKey: ['expenses', selectedHotelId],
    queryFn: () => selectedHotelId ? transactionsApi.getExpenses({
      hotelId: selectedHotelId,
      startDate: new Date(new Date().setHours(0, 0, 0, 0)).toISOString(),
      endDate: new Date().toISOString(),
      page: 1,
      limit: 1000
    }) : Promise.resolve({ data: [], total: 0, page: 1, limit: 1000, totalPages: 0 }),
    enabled: !!selectedHotelId,
  });

  // Lấy danh sách phiếu thu trong ca
  const { data: incomesData, isLoading: incomesLoading, refetch: refetchIncomes } = useQuery({
    queryKey: ['incomes', selectedHotelId],
    queryFn: () => selectedHotelId ? transactionsApi.getIncomes({
      hotelId: selectedHotelId,
      startDate: new Date(new Date().setHours(0, 0, 0, 0)).toISOString(),
      endDate: new Date().toISOString(),
      page: 1,
      limit: 1000
    }) : Promise.resolve({ data: [], total: 0, page: 1, limit: 1000, totalPages: 0 }),
    enabled: !!selectedHotelId,
  });

  const { data: historyData, isLoading: historyLoading, refetch: refetchHistory } = useQuery<ShiftHandoverHistoryResponse>({
    queryKey: ['shiftHandover', 'history', selectedHotelId, historyPage],
    queryFn: () => shiftHandoverApi.getHistory(selectedHotelId || '', historyPage, pageSize),
    enabled: !!selectedHotelId,
  });

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

  // Tính toán tiền mặt, chuyển khoản, cà thẻ trong ca theo logic hotelapp
  useEffect(() => {
    if (revenueData && paymentHistoryData && expensesData && incomesData) {
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);
      const currentTime = new Date();
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
      const lastManagerHandoverTime = previousShiftData?.lastShiftHandover?.handoverTime 
        ? new Date(previousShiftData.lastShiftHandover.handoverTime) 
        : null;
      const baselineTime = lastManagerHandoverTime || startOfDay;
      const paymentsInShift = enrichedPayments.filter(p => {
        const isCheckout = p.eventType === 'checkout' || p.eventType === 'check-out';
        const t = p.checkoutTime ? new Date(p.checkoutTime) : null;
        return isCheckout && p.status === 'paid' && t && t > baselineTime && t <= currentTime;
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
        const t = p.checkoutTime ? new Date(p.checkoutTime) : null;
        return isCheckin && t && t > baselineTime && t <= currentTime;
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
      const filteredExpenses = lastManagerHandoverTime 
        ? expenses.filter(expense => {
            const expenseTime = expense.createdAt ? new Date(expense.createdAt) : 
                              expense.updatedAt ? new Date(expense.updatedAt) : new Date();
            return expenseTime > lastManagerHandoverTime && expense.status === 'completed';
          })
        : expenses.filter(expense => expense.status === 'completed');
      const filteredIncomes = lastManagerHandoverTime 
        ? incomes.filter(income => {
            const incomeTime = income.createdAt ? new Date(income.createdAt) : 
                              income.updatedAt ? new Date(income.updatedAt) : new Date();
            return incomeTime > lastManagerHandoverTime && income.status === 'completed';
          })
        : incomes.filter(income => income.status === 'completed');
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
      const actualCashInShift = Math.max(0, cashPayments - cashExpense + cashIncome);
      setCashInShift(String(actualCashInShift));
      setBankTransferAmount(String(bankTransferPayments));
      setCashAmount(String(cashPayments));
      setCardPaymentAmount(String(cardPayments));
      setExpenseAmount(String(totalExpenseAmount));
      setIncomeAmount(String(totalIncomeAmount));
    }
  }, [revenueData, paymentHistoryData, expensesData, incomesData, previousShiftData]);

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
      Alert.alert('Thành công', 'Đã giao ca thành công');
      setToUserPassword('');
      setSelectedToStaffId(null);
      setNotes('');
      queryClient.invalidateQueries({ queryKey: ['shiftHandover'] });
      refetchPrevious();
      refetchHistory();
      refetchRevenue();
      refetchPaymentHistory();
      refetchExpenses();
      refetchIncomes();
    },
    onError: (error: any) => {
      Alert.alert('Lỗi', error?.message || 'Không thể giao ca');
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
      Alert.alert('Thành công', 'Đã giao tiền quản lý');
      setManagerUsername('');
      setManagerPassword('');
      setManagerAmount('');
      setManagerNotes('');
      queryClient.invalidateQueries({ queryKey: ['shiftHandover'] });
      refetchPrevious();
      refetchRevenue();
      refetchPaymentHistory();
      refetchExpenses();
      refetchIncomes();
    },
    onError: (error: any) => {
      Alert.alert('Lỗi', error?.message || 'Không thể giao tiền quản lý');
    },
  });

  const handleSubmit = () => {
    if (!selectedHotelId) {
      Alert.alert('Thiếu thông tin', 'Vui lòng chọn khách sạn');
      return;
    }
    if (!fromStaff?.id) {
      Alert.alert('Thiếu thông tin', 'Không tìm thấy nhân viên giao ca');
      return;
    }
    if (!selectedToStaffId) {
      Alert.alert('Thiếu thông tin', 'Vui lòng chọn nhân viên nhận ca');
      return;
    }
    if (!toUserPassword) {
      Alert.alert('Thiếu thông tin', 'Vui lòng nhập mật khẩu người nhận ca');
      return;
    }
    createMutation.mutate();
  };

  const handleManagerHandover = () => {
    if (!selectedHotelId) {
      Alert.alert('Thiếu thông tin', 'Vui lòng chọn khách sạn');
      return;
    }
    if (!fromStaff?.id) {
      Alert.alert('Thiếu thông tin', 'Không tìm thấy nhân viên giao ca');
      return;
    }
    if (!managerUsername || !managerPassword) {
      Alert.alert('Thiếu thông tin', 'Vui lòng nhập tài khoản quản lý');
      return;
    }
    if (parseCurrency(managerAmount) <= 0) {
      Alert.alert('Thiếu thông tin', 'Số tiền giao quản lý phải lớn hơn 0');
      return;
    }
    managerMutation.mutate();
  };

  const handleRefresh = () => {
    refetchStaffs();
    refetchPrevious();
    refetchRevenue();
    refetchHistory();
    refetchPaymentHistory();
    refetchExpenses();
    refetchIncomes();
  };

  const handleViewDetail = (record: ShiftHandover) => {
    setSelectedRecord(record);
    setDetailModalVisible(true);
  };

  const handleCloseDetail = () => {
    setDetailModalVisible(false);
    setSelectedRecord(null);
  };

  const getTotalRevenue = (record: ShiftHandover) => {
    return (record.cashAmount || 0) + (record.bankTransferAmount || 0) + (record.cardPaymentAmount || 0) + (record.incomeAmount || 0) - (record.expenseAmount || 0);
  };

  const getCustomerPayments = (record: ShiftHandover) => {
    return record.roomHistory || [];
  };

  const getTotalAmount = (items: any[]) => {
    return items.reduce((sum, item) => sum + (item.totalAmount || 0), 0);
  };
  
  const getExpenseDetails = (record: ShiftHandover) => {
    return record.expenseDetails || record.expenses || [];
  };
  
  const getIncomeDetails = (record: ShiftHandover) => {
    return record.incomeDetails || record.incomes || [];
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

  const getGuestSourceLabel = (room: any) => {
    const source = room.source || room.guestSource || 'direct';
    switch (source) {
      case 'direct': return 'Trực tiếp';
      case 'booking': return 'Đặt phòng';
      case 'walkin': return 'Khách vãng lai';
      default: return source;
    }
  };

  const getGuestSourceColor = (room: any) => {
    const source = room.source || room.guestSource || 'direct';
    switch (source) {
      case 'direct': return '#52c41a';
      case 'booking': return '#1890ff';
      case 'walkin': return '#faad14';
      default: return '#7F8C8D';
    }
  };

  const getPaymentMethodLabel = (method: string) => {
    switch (method) {
      case 'cash': return 'Tiền mặt';
      case 'bank_transfer': return 'Chuyển khoản';
      case 'card': return 'Cà thẻ';
      default: return method || 'Tiền mặt';
    }
  };

  const isLoading = staffsLoading || previousLoading || revenueLoading || historyLoading || paymentHistoryLoading || expensesLoading || incomesLoading;

  const historyItems = historyData?.data || [];
  const totalPages = historyData?.pagination?.totalPages || 1;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Quản Lý Giao Ca</Text>
          <Text style={styles.headerSubtitle}>Theo dõi và bàn giao ca làm việc</Text>
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
            <Text style={styles.sectionTitle}>Tổng quan doanh thu</Text>
            <View style={styles.sectionActions}>
              <TouchableOpacity style={styles.actionButton} onPress={() => {/* TODO: Export Excel */}}>
                <Ionicons name="document-text" size={16} color="#1890ff" />
                <Text style={styles.actionButtonText}>Xuất Excel</Text>
              </TouchableOpacity>
            </View>
          </View>
          
          <View style={styles.revenueGrid}>
            <View style={styles.revenueCard}>
              <Text style={styles.revenueLabel}>Tiền mặt</Text>
              <Text style={[styles.revenueValue, { color: '#52c41a' }]}>
                {formatCurrency(revenueData?.cashTotal || 0)}
              </Text>
            </View>
            <View style={styles.revenueCard}>
              <Text style={styles.revenueLabel}>Chuyển khoản</Text>
              <Text style={[styles.revenueValue, { color: '#1890ff' }]}>
                {formatCurrency(revenueData?.bankTransferTotal || 0)}
              </Text>
            </View>
            <View style={styles.revenueCard}>
              <Text style={styles.revenueLabel}>Cà thẻ</Text>
              <Text style={[styles.revenueValue, { color: '#722ed1' }]}>
                {formatCurrency(revenueData?.cardTotal || 0)}
              </Text>
            </View>
            <View style={styles.revenueCard}>
              <Text style={styles.revenueLabel}>Phiếu Chi</Text>
              <Text style={[styles.revenueValue, { color: '#f5222d' }]}>
                {formatCurrency(revenueData?.expenseTotal || 0)}
              </Text>
            </View>
            <View style={styles.revenueCard}>
              <Text style={styles.revenueLabel}>Tổng doanh thu</Text>
              <Text style={[styles.revenueValue, { color: '#faad14', fontWeight: 'bold' }]}>
                {formatCurrency(revenueData?.totalRevenue || 0)}
              </Text>
            </View>
          </View>
          
          <View style={styles.formulaNote}>
            <Ionicons name="information-circle" size={14} color="#1890ff" />
            <Text style={styles.formulaText}>
              <Text style={{ fontWeight: 'bold' }}>Công thức:</Text> Tổng doanh thu = Tiền mặt + Chuyển khoản + Thẻ tín dụng + Phiếu Thu - Phiếu Chi
            </Text>
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Lịch sử giao ca</Text>
            <View style={styles.sectionActions}>
              <TouchableOpacity style={styles.actionButton} onPress={() => {/* TODO: Filter */}}>
                <Ionicons name="filter" size={16} color="#1890ff" />
                <Text style={styles.actionButtonText}>Lọc</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionButton} onPress={() => {/* TODO: Export History */}}>
                <Ionicons name="document-text" size={16} color="#1890ff" />
                <Text style={styles.actionButtonText}>Xuất Excel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionButton} onPress={() => {/* TODO: Export Revenue */}}>
                <Ionicons name="cash" size={16} color="#1890ff" />
                <Text style={styles.actionButtonText}>Xuất Doanh Thu</Text>
              </TouchableOpacity>
            </View>
          </View>
          {historyItems.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="time-outline" size={48} color="#C7C7CC" />
              <Text style={styles.emptyText}>Chưa có lịch sử giao ca</Text>
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
                        {fromName || 'Nhân viên'} → {toName || 'Nhân viên'}
                      </Text>
                      <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
                        <Text style={styles.statusText}>{getStatusLabel(item.status)}</Text>
                      </View>
                    </View>
                    <Text style={styles.historyTime}>{formatDateTime(item.handoverTime)}</Text>
                    <View style={styles.historyAmountRow}>
              <Text style={styles.historyAmountLabel}>Số tiền giao ca</Text>
              <Text style={styles.historyAmountValue}>
                {formatCurrency(item.handoverAmount || 0)}
              </Text>
            </View>
            <TouchableOpacity
              style={styles.viewDetailButton}
              onPress={() => handleViewDetail(item)}
            >
              <Ionicons name="eye" size={16} color="#3498DB" />
              <Text style={styles.viewDetailText}>Xem chi tiết</Text>
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
              Trang {historyPage} / {totalPages}
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
              <Text style={styles.modalTitle}>Chọn nhân viên</Text>
              <TouchableOpacity onPress={() => setStaffModalVisible(false)}>
                <Ionicons name="close" size={22} color="#2C3E50" />
              </TouchableOpacity>
            </View>
            <View style={styles.searchBox}>
              <Ionicons name="search" size={18} color="#7F8C8D" />
              <TextInput
                style={styles.searchInput}
                placeholder="Tìm kiếm nhân viên..."
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
        <Pressable style={styles.modalOverlay} onPress={handleCloseDetail}>
          <Pressable style={[styles.modalContent, styles.detailModal]} onPress={() => {}}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { fontSize: 18 }]}>Chi tiết giao ca</Text>
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
                  {/* Thông tin cơ bản */}
                  <View style={styles.detailSection}>
                    <Text style={styles.detailSectionTitle}>Thông tin giao ca</Text>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Thời gian:</Text>
                      <Text style={[styles.detailValue, { fontSize: 11 }]}>{formatDateTime(selectedRecord.handoverTime)}</Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Từ:</Text>
                      <Text style={[styles.detailValue, { fontSize: 11 }]}>{selectedRecord.fromStaffName || 'N/A'}</Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Đến:</Text>
                      <Text style={[styles.detailValue, { fontSize: 11 }]}>{selectedRecord.toStaffName || 'N/A'}</Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Trạng thái:</Text>
                      <View style={[styles.statusBadge, { backgroundColor: getStatusColor(selectedRecord.status) }]}>
                        <Text style={styles.statusText}>{getStatusLabel(selectedRecord.status)}</Text>
                      </View>
                    </View>
                  </View>

                  {/* Chi tiết tiền */}
                  <View style={styles.detailSection}>
                    <Text style={styles.detailSectionTitle}>Chi tiết tiền</Text>
                    <View style={styles.detailRow}>
                      <Text style={[styles.detailLabel, { fontSize: 11 }]}>Tiền ca trước:</Text>
                      <Text style={[styles.detailValue, { fontSize: 11 }]}>{formatCurrency(selectedRecord.previousShiftAmount || 0)}</Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={[styles.detailLabel, { fontSize: 11 }]}>Tiền mặt trong ca:</Text>
                      <Text style={[styles.detailValue, { fontSize: 11, color: '#2ECC71', fontWeight: '600' }]}>{formatCurrency(selectedRecord.cashInShift || 0)}</Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={[styles.detailLabel, { fontSize: 11 }]}>Tiền giao quản lý:</Text>
                      <Text style={[styles.detailValue, { fontSize: 11 }]}>{formatCurrency(selectedRecord.managerHandoverAmount || 0)}</Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={[styles.detailLabel, { fontSize: 11 }]}>Tiền mặt thu:</Text>
                      <Text style={[styles.detailValue, { fontSize: 11 }]}>{formatCurrency(selectedRecord.cashAmount || 0)}</Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={[styles.detailLabel, { fontSize: 11 }]}>Chuyển khoản:</Text>
                      <Text style={[styles.detailValue, { fontSize: 11 }]}>{formatCurrency(selectedRecord.bankTransferAmount || 0)}</Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={[styles.detailLabel, { fontSize: 11 }]}>Cà thẻ:</Text>
                      <Text style={[styles.detailValue, { fontSize: 11 }]}>{formatCurrency(selectedRecord.cardPaymentAmount || 0)}</Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={[styles.detailLabel, { fontSize: 11 }]}>Phiếu chi:</Text>
                      <Text style={[styles.detailValue, { fontSize: 11, color: '#E74C3C' }]}>{formatCurrency(selectedRecord.expenseAmount || 0)}</Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={[styles.detailLabel, { fontSize: 11 }]}>Phiếu thu:</Text>
                      <Text style={[styles.detailValue, { fontSize: 11, color: '#2ECC71' }]}>{formatCurrency(selectedRecord.incomeAmount || 0)}</Text>
                    </View>
                    <View style={[styles.detailRow, { borderTopWidth: 1, borderTopColor: '#E9ECEF', marginTop: 4, paddingTop: 6 }]}>
                      <Text style={[styles.detailLabel, { fontSize: 11, fontWeight: '600' }]}>Tổng doanh thu:</Text>
                      <Text style={[styles.detailValue, styles.totalValue, { fontSize: 11 }]}>{formatCurrency(getTotalRevenue(selectedRecord))}</Text>
                    </View>
                    <View style={[styles.detailRow, { marginTop: 2 }]}>
                      <Text style={[styles.detailLabel, { fontSize: 11, fontWeight: '600' }]}>Số tiền giao ca:</Text>
                      <Text style={[styles.detailValue, styles.totalValue, { fontSize: 11 }]}>{formatCurrency(selectedRecord.handoverAmount || 0)}</Text>
                    </View>
                  </View>

                  {/* Ghi chú */}
                  {selectedRecord.notes && (
                    <View style={styles.detailSection}>
                      <Text style={styles.detailSectionTitle}>Ghi chú</Text>
                      <Text style={styles.detailText}>{selectedRecord.notes}</Text>
                    </View>
                  )}

                  {/* Chi tiết phiếu chi */}
                  {getExpenseDetails(selectedRecord).length > 0 && (
                    <View style={styles.detailSection}>
                      <Text style={styles.detailSectionTitle}>
                        Chi tiết phiếu chi - Tổng: {formatCurrency(getTotalAmount(getExpenseDetails(selectedRecord)))}
                      </Text>
                      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                        <View>
                <View style={styles.tableHeader}>
                  <Text style={[styles.tableHeaderText, { minWidth: 300 }]}>Nội dung</Text>
                  <Text style={[styles.tableHeaderText, { minWidth: 100, textAlign: 'right' }]}>Số tiền</Text>
                  <Text style={[styles.tableHeaderText, { minWidth: 100, textAlign: 'right' }]}>Phương thức</Text>
                </View>
                {getExpenseDetails(selectedRecord).map((expense, index) => (
                  <View key={index} style={styles.tableRow}>
                    <Text style={[styles.tableCell, { minWidth: 300 }]}>{expense.description || expense.content || 'N/A'}</Text>
                    <Text style={[styles.tableCell, { minWidth: 100, textAlign: 'right' }]}>{formatCurrency(expense.amount || 0)}</Text>
                    <Text style={[styles.tableCell, { minWidth: 100, textAlign: 'right' }]}>{expense.method || 'Tiền mặt'}</Text>
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
                        Chi tiết phiếu thu - Tổng: {formatCurrency(getTotalAmount(getIncomeDetails(selectedRecord)))}
                      </Text>
                      <ScrollView horizontal showsHorizontalScrollIndicator={true}>
                        <View>
                <View style={styles.tableHeader}>
                  <Text style={[styles.tableHeaderText, { minWidth: 300 }]}>Nội dung</Text>
                  <Text style={[styles.tableHeaderText, { minWidth: 100, textAlign: 'right' }]}>Số tiền</Text>
                  <Text style={[styles.tableHeaderText, { minWidth: 100, textAlign: 'right' }]}>Phương thức</Text>
                </View>
                {getIncomeDetails(selectedRecord).map((income, index) => (
                  <View key={index} style={styles.tableRow}>
                    <Text style={[styles.tableCell, { minWidth: 300 }]}>{income.description || income.content || 'N/A'}</Text>
                    <Text style={[styles.tableCell, { minWidth: 100, textAlign: 'right' }]}>{formatCurrency(income.amount || 0)}</Text>
                    <Text style={[styles.tableCell, { minWidth: 100, textAlign: 'right' }]}>{income.method || 'Tiền mặt'}</Text>
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
                        Tổng doanh thu = Tiền mặt + Chuyển khoản + Thẻ tín dụng + Phiếu Thu - Phiếu Chi: {formatCurrency(getTotalRevenue(selectedRecord))}
                      </Text>
                      <View style={styles.tableContainer}>
                        <ScrollView horizontal showsHorizontalScrollIndicator={true} nestedScrollEnabled scrollEventThrottle={16}>
                          <View>
                            <View style={styles.tableHeader}>
                              <Text style={[styles.tableHeaderText, { minWidth: 80 }]}>Phòng</Text>
                              <Text style={[styles.tableHeaderText, { minWidth: 100 }]}>Thao tác</Text>
                              <Text style={[styles.tableHeaderText, { minWidth: 120 }]}>Khách hàng</Text>
                              <Text style={[styles.tableHeaderText, { minWidth: 100 }]}>Nguồn</Text>
                              <Text style={[styles.tableHeaderText, { minWidth: 100, textAlign: 'right' }]}>Tổng phòng</Text>
                              <Text style={[styles.tableHeaderText, { minWidth: 100, textAlign: 'right' }]}>Phụ thu</Text>
                              <Text style={[styles.tableHeaderText, { minWidth: 100, textAlign: 'right' }]}>Giảm giá</Text>
                              <Text style={[styles.tableHeaderText, { minWidth: 100, textAlign: 'right' }]}>Dịch vụ</Text>
                              <Text style={[styles.tableHeaderText, { minWidth: 120, textAlign: 'right' }]}>Đặt trước</Text>
                              <Text style={[styles.tableHeaderText, { minWidth: 120, textAlign: 'right' }]}>Tổng điều chỉnh</Text>
                              <Text style={[styles.tableHeaderText, { minWidth: 120, textAlign: 'right' }]}>Còn lại</Text>
                              <Text style={[styles.tableHeaderText, { minWidth: 120, textAlign: 'right' }]}>Thanh toán</Text>
                              <Text style={[styles.tableHeaderText, { minWidth: 100 }]}>PT thanh toán</Text>
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
                                  <Text style={[styles.tableCell, { minWidth: 80 }]}>Phòng {room.roomNumber}</Text>
                                  <Text style={[styles.tableCell, { minWidth: 100 }]}>{room.action || 'Thanh toán'}</Text>
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
                                    {getPaymentMethodLabel(room.paymentMethod)}
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
                </View>
              )}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
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
    paddingTop: 40,
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
    // Remove flex: 1 to allow content to determine height up to maxHeight
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
