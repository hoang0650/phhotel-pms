import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useHotel } from '@/contexts/HotelContext';
import { useAuth } from '@/contexts/AuthContext';
import { roomsApi } from '@/services/api/rooms';
import { transactionsApi } from '@/services/api/transactions';
import { format } from 'date-fns';
import { enUS, vi } from 'date-fns/locale';
import { useLanguage } from '@/contexts/LanguageContext';

interface Expense {
  _id?: string;
  hotelId: string;
  amount: number;
  method: 'cash' | 'credit_card' | 'bank_transfer' | 'card' | 'virtual_card' | 'other';
  expenseCategory?: 'supplies' | 'utilities' | 'salary' | 'maintenance' | 'marketing' | 'other';
  description?: string;
  notes?: string;
  recipient?: string;
  status?: 'pending' | 'completed' | 'failed' | 'cancelled' | 'approved' | 'rejected';
  createdAt?: Date;
  updatedAt?: Date;
  details?: {
    recipient?: string;
    [key: string]: any;
  };
  approvedBy?: string;
  processedAt?: Date;
  shiftHandoverId?: string;
}

interface Income {
  _id?: string;
  hotelId: string;
  amount: number;
  method: 'cash' | 'credit_card' | 'bank_transfer' | 'card' | 'virtual_card' | 'other';
  incomeCategory?: 'service' | 'rental' | 'other';
  description?: string;
  notes?: string;
  payer?: string;
  status?: 'pending' | 'completed' | 'failed' | 'cancelled' | 'approved' | 'rejected';
  createdAt?: Date;
  updatedAt?: Date;
  shiftHandoverId?: string;
}

export default function IncomeExpenseManagementScreen() {
  const { selectedHotelId, hotels, selectHotel, canSelectMultipleHotels, isLoading: hotelsLoading } = useHotel();
  const { user } = useAuth();
  const { language } = useLanguage();
  const isVi = language === 'vi';
  const [hotelModalVisible, setHotelModalVisible] = useState(false);
  
  // State for room revenue
  const [roomRevenue, setRoomRevenue] = useState(0);
  const [roomHistory, setRoomHistory] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // State for expense management
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [expenseLoading, setExpenseLoading] = useState(false);
  const [isExpenseModalVisible, setIsExpenseModalVisible] = useState(false);
  
  // State for income management
  const [incomes, setIncomes] = useState<Income[]>([]);
  const [incomeLoading, setIncomeLoading] = useState(false);
  const [isIncomeModalVisible, setIsIncomeModalVisible] = useState(false);
  
  // Form states for expense
  const [expenseForm, setExpenseForm] = useState({
    amount: '',
    method: 'cash' as 'cash' | 'credit_card' | 'bank_transfer' | 'card' | 'virtual_card' | 'other',
    expenseCategory: 'other' as 'supplies' | 'utilities' | 'salary' | 'maintenance' | 'marketing' | 'other',
    description: '',
    notes: '',
    recipient: '',
  });
  
  // Form states for income
  const [incomeForm, setIncomeForm] = useState({
    amount: '',
    method: 'cash' as 'cash' | 'credit_card' | 'bank_transfer' | 'card' | 'virtual_card' | 'other',
    incomeCategory: 'other' as 'service' | 'rental' | 'other',
    description: '',
    notes: '',
    payer: '',
  });
  
  // Filter and search states
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState<'today' | 'week' | 'month' | 'all'>('all');
  const [typeFilter, setTypeFilter] = useState<'all' | 'expense' | 'income'>('all');
  const [methodFilter, setMethodFilter] = useState<'all' | 'cash' | 'bank_transfer' | 'card' | 'other'>('all');
  const text = useMemo(() => ({
    cash: isVi ? 'Tiền mặt' : 'Cash',
    bankTransfer: isVi ? 'Chuyển khoản' : 'Bank transfer',
    card: isVi ? 'Thẻ' : 'Card',
    virtualCard: isVi ? 'Thẻ ảo' : 'Virtual card',
    other: isVi ? 'Khác' : 'Other',
    supplies: isVi ? 'Vật tư' : 'Supplies',
    utilities: isVi ? 'Tiện ích' : 'Utilities',
    salary: isVi ? 'Lương' : 'Salary',
    maintenance: isVi ? 'Bảo trì' : 'Maintenance',
    marketing: 'Marketing',
    service: isVi ? 'Dịch vụ' : 'Service',
    rental: isVi ? 'Thuê' : 'Rental',
    error: isVi ? 'Lỗi' : 'Error',
    success: isVi ? 'Thành công' : 'Success',
    confirm: isVi ? 'Xác nhận' : 'Confirm',
    cancel: isVi ? 'Hủy' : 'Cancel',
    delete: isVi ? 'Xóa' : 'Delete',
    chooseHotel: isVi ? 'Chọn khách sạn' : 'Select hotel',
    fillRequired: isVi ? 'Vui lòng điền đầy đủ thông tin bắt buộc' : 'Please fill in all required fields',
    loadExpenseFailed: isVi ? 'Không thể tải danh sách chi tiêu' : 'Unable to load expenses',
    loadIncomeFailed: isVi ? 'Không thể tải danh sách thu nhập' : 'Unable to load incomes',
    createExpenseSuccess: isVi ? 'Tạo phiếu chi thành công' : 'Expense voucher created successfully',
    createExpenseFailed: isVi ? 'Không thể tạo phiếu chi' : 'Unable to create expense voucher',
    createIncomeSuccess: isVi ? 'Tạo phiếu thu thành công' : 'Income voucher created successfully',
    createIncomeFailed: isVi ? 'Không thể tạo phiếu thu' : 'Unable to create income voucher',
    deleteExpenseConfirm: isVi ? 'Bạn có chắc chắn muốn xóa phiếu chi này?' : 'Do you want to delete this expense voucher?',
    deleteIncomeConfirm: isVi ? 'Bạn có chắc chắn muốn xóa phiếu thu này?' : 'Do you want to delete this income voucher?',
    deleteExpenseSuccess: isVi ? 'Xóa phiếu chi thành công' : 'Expense voucher deleted',
    deleteExpenseFailed: isVi ? 'Không thể xóa phiếu chi' : 'Unable to delete expense voucher',
    deleteIncomeSuccess: isVi ? 'Xóa phiếu thu thành công' : 'Income voucher deleted',
    deleteIncomeFailed: isVi ? 'Không thể xóa phiếu thu' : 'Unable to delete income voucher',
    loading: isVi ? 'Đang tải...' : 'Loading...',
    title: isVi ? 'Quản lý thu chi' : 'Income & Expense Management',
    roomRevenue: isVi ? 'Doanh thu phòng' : 'Room revenue',
    incomeVoucher: isVi ? 'Phiếu thu' : 'Income voucher',
    expenseVoucher: isVi ? 'Phiếu chi' : 'Expense voucher',
    netProfit: isVi ? 'Lãi/Lỗ (Thực thu)' : 'Net profit/loss',
    createIncome: isVi ? 'Tạo phiếu thu' : 'Create income voucher',
    createExpense: isVi ? 'Tạo phiếu chi' : 'Create expense voucher',
    searchPlaceholder: isVi ? 'Tìm kiếm theo mô tả, ghi chú, người nhận...' : 'Search by description, notes, recipient...',
    all: isVi ? 'Tất cả' : 'All',
    allPaymentMethods: isVi ? 'Tất cả PTTT' : 'All payment methods',
    recipient: isVi ? 'Người nhận' : 'Recipient',
    payer: isVi ? 'Người nộp' : 'Payer',
    noTransactions: isVi ? 'Không có giao dịch nào' : 'No transactions found',
    expenseModalTitle: isVi ? 'Tạo phiếu chi' : 'Create expense voucher',
    incomeModalTitle: isVi ? 'Tạo phiếu thu' : 'Create income voucher',
    amount: isVi ? 'Số tiền' : 'Amount',
    paymentMethod: isVi ? 'Phương thức thanh toán' : 'Payment method',
    expenseCategory: isVi ? 'Loại chi phí' : 'Expense category',
    incomeCategory: isVi ? 'Loại thu nhập' : 'Income category',
    description: isVi ? 'Mô tả' : 'Description',
    notes: isVi ? 'Ghi chú' : 'Notes',
    enterAmount: isVi ? 'Nhập số tiền' : 'Enter amount',
    enterDescription: isVi ? 'Nhập mô tả' : 'Enter description',
    enterRecipient: isVi ? 'Nhập người nhận' : 'Enter recipient',
    enterPayer: isVi ? 'Nhập người nộp' : 'Enter payer',
    enterNotes: isVi ? 'Nhập ghi chú' : 'Enter notes',
    expenseList: isVi ? 'Danh sách phiếu chi' : 'Expense vouchers',
    incomeList: isVi ? 'Danh sách phiếu thu' : 'Income vouchers',
    noExpense: isVi ? 'Không có phiếu chi' : 'No expense vouchers',
    noIncome: isVi ? 'Không có phiếu thu' : 'No income vouchers',
    shiftHandedOver: isVi ? 'Đã giao ca' : 'Shift handed over',
  }), [isVi]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat(isVi ? 'vi-VN' : 'en-US', {
      style: 'currency',
      currency: 'VND',
    }).format(amount);
  };

  const formatDate = (date: Date | string) => {
    return format(new Date(date), 'dd/MM/yyyy HH:mm', { locale: isVi ? vi : enUS });
  };

  const getMethodText = (method: string) => {
    switch (method) {
      case 'cash':
        return text.cash;
      case 'bank_transfer':
        return text.bankTransfer;
      case 'card':
      case 'credit_card':
        return text.card;
      case 'virtual_card':
        return text.virtualCard;
      default:
        return text.other;
    }
  };

  const getExpenseCategoryText = (category: string) => {
    switch (category) {
      case 'supplies':
        return text.supplies;
      case 'utilities':
        return text.utilities;
      case 'salary':
        return text.salary;
      case 'maintenance':
        return text.maintenance;
      case 'marketing':
        return text.marketing;
      default:
        return text.other;
    }
  };

  const getIncomeCategoryText = (category: string) => {
    switch (category) {
      case 'service':
        return text.service;
      case 'rental':
        return text.rental;
      default:
        return text.other;
    }
  };

  const loadExpenses = useCallback(async () => {
    if (!selectedHotelId && canSelectMultipleHotels) {
      setExpenses([]);
      return;
    }
    setExpenseLoading(true);
    try {
      const params: any = { hotelId: selectedHotelId || '', page: 1, limit: 1000 };
      if (dateFilter !== 'all') {
        const now = new Date();
        let startDate: Date;
        switch (dateFilter) {
          case 'today':
            startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            break;
          case 'week':
            startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            break;
          case 'month':
            startDate = new Date(now.getFullYear(), now.getMonth(), 1);
            break;
        }
        params.startDate = startDate.toISOString();
        params.endDate = now.toISOString();
      }
      
      const response = await transactionsApi.getExpenses(params);
      setExpenses(response.data || []);
    } catch (error) {
      console.warn('Error loading expenses:', error);
      Alert.alert(text.error, text.loadExpenseFailed);
    } finally {
      setExpenseLoading(false);
    }
  }, [selectedHotelId, canSelectMultipleHotels, dateFilter, text.error, text.loadExpenseFailed]);

  const loadIncomes = useCallback(async () => {
    if (!selectedHotelId && canSelectMultipleHotels) {
      setIncomes([]);
      return;
    }
    setIncomeLoading(true);
    try {
      const params: any = { hotelId: selectedHotelId || '', page: 1, limit: 1000 };
      if (dateFilter !== 'all') {
        const now = new Date();
        let startDate: Date;
        switch (dateFilter) {
          case 'today':
            startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            break;
          case 'week':
            startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            break;
          case 'month':
            startDate = new Date(now.getFullYear(), now.getMonth(), 1);
            break;
        }
        params.startDate = startDate.toISOString();
        params.endDate = now.toISOString();
      }
      
      const response = await transactionsApi.getIncomes(params);
      setIncomes(response.data || []);
    } catch (error) {
      console.warn('Error loading incomes:', error);
      Alert.alert(text.error, text.loadIncomeFailed);
    } finally {
      setIncomeLoading(false);
    }
  }, [selectedHotelId, canSelectMultipleHotels, dateFilter, text.error, text.loadIncomeFailed]);

  useEffect(() => {
    loadExpenses();
    loadIncomes();
  }, [loadExpenses, loadIncomes]);

  const submitExpense = async () => {
    if (!selectedHotelId) {
      Alert.alert(text.error, text.chooseHotel);
      return;
    }
    
    if (!expenseForm.amount || !expenseForm.description) {
      Alert.alert(text.error, text.fillRequired);
      return;
    }

    try {
      const expenseData = {
        hotelId: selectedHotelId,
        amount: parseFloat(expenseForm.amount),
        method: expenseForm.method,
        expenseCategory: expenseForm.expenseCategory,
        description: expenseForm.description,
        notes: expenseForm.notes,
        recipient: expenseForm.recipient,
      };
      
      await transactionsApi.createExpense(expenseData);
      Alert.alert(text.success, text.createExpenseSuccess);
      setIsExpenseModalVisible(false);
      resetExpenseForm();
      loadExpenses();
    } catch (error) {
      console.warn('Error creating expense:', error);
      Alert.alert(text.error, text.createExpenseFailed);
    }
  };

  const submitIncome = async () => {
    if (!selectedHotelId) {
      Alert.alert(text.error, text.chooseHotel);
      return;
    }
    
    if (!incomeForm.amount || !incomeForm.description) {
      Alert.alert(text.error, text.fillRequired);
      return;
    }

    try {
      const incomeData = {
        hotelId: selectedHotelId,
        amount: parseFloat(incomeForm.amount),
        method: incomeForm.method,
        incomeCategory: incomeForm.incomeCategory,
        description: incomeForm.description,
        notes: incomeForm.notes,
        payer: incomeForm.payer,
      };
      
      await transactionsApi.createIncome(incomeData);
      Alert.alert(text.success, text.createIncomeSuccess);
      setIsIncomeModalVisible(false);
      resetIncomeForm();
      loadIncomes();
    } catch (error) {
      console.warn('Error creating income:', error);
      Alert.alert(text.error, text.createIncomeFailed);
    }
  };

  const deleteExpense = async (expenseId: string) => {
    Alert.alert(
      text.confirm,
      text.deleteExpenseConfirm,
      [
        { text: text.cancel, style: 'cancel' },
        {
          text: text.delete,
          style: 'destructive',
          onPress: async () => {
            try {
              await transactionsApi.deleteExpense(expenseId);
              Alert.alert(text.success, text.deleteExpenseSuccess);
              loadExpenses();
            } catch (error) {
              console.warn('Error deleting expense:', error);
              Alert.alert(text.error, text.deleteExpenseFailed);
            }
          },
        },
      ]
    );
  };

  const deleteIncome = async (incomeId: string) => {
    Alert.alert(
      text.confirm,
      text.deleteIncomeConfirm,
      [
        { text: text.cancel, style: 'cancel' },
        {
          text: text.delete,
          style: 'destructive',
          onPress: async () => {
            try {
              await transactionsApi.deleteIncome(incomeId);
              Alert.alert(text.success, text.deleteIncomeSuccess);
              loadIncomes();
            } catch (error) {
              console.warn('Error deleting income:', error);
              Alert.alert(text.error, text.deleteIncomeFailed);
            }
          },
        },
      ]
    );
  };

  const resetExpenseForm = () => {
    setExpenseForm({
      amount: '',
      method: 'cash',
      expenseCategory: 'other',
      description: '',
      notes: '',
      recipient: '',
    });
  };

  const resetIncomeForm = () => {
    setIncomeForm({
      amount: '',
      method: 'cash',
      incomeCategory: 'other',
      description: '',
      notes: '',
      payer: '',
    });
  };
  
  const openExpenseModal = useCallback(() => {
    if (!selectedHotelId) {
      Alert.alert(text.error, text.chooseHotel);
      return;
    }
    setExpenseForm({
      amount: '',
      method: 'cash',
      expenseCategory: 'other',
      description: '',
      notes: '',
      recipient: '',
    });
    setIsExpenseModalVisible(true);
    loadExpenses();
  }, [selectedHotelId, loadExpenses, text.chooseHotel, text.error]);
  
  const openIncomeModal = useCallback(() => {
    if (!selectedHotelId) {
      Alert.alert(text.error, text.chooseHotel);
      return;
    }
    setIncomeForm({
      amount: '',
      method: 'cash',
      incomeCategory: 'other',
      description: '',
      notes: '',
      payer: '',
    });
    setIsIncomeModalVisible(true);
    loadIncomes();
  }, [selectedHotelId, loadIncomes, text.chooseHotel, text.error]);

  const filteredData = useMemo(() => {
    let data = [];
    
    // Combine expenses and incomes
    if (typeFilter === 'all' || typeFilter === 'expense') {
      data = data.concat(expenses.map(expense => ({ ...expense, type: 'expense' })));
    }
    if (typeFilter === 'all' || typeFilter === 'income') {
      data = data.concat(incomes.map(income => ({ ...income, type: 'income' })));
    }
    
    // Apply search filter
    if (searchQuery.trim()) {
      const keyword = searchQuery.trim().toLowerCase();
      data = data.filter(item => 
        item.description?.toLowerCase().includes(keyword) ||
        item.notes?.toLowerCase().includes(keyword) ||
        (item.type === 'expense' && (item as Expense).recipient?.toLowerCase().includes(keyword)) ||
        (item.type === 'income' && (item as Income).payer?.toLowerCase().includes(keyword))
      );
    }
    
    // Apply method filter
    if (methodFilter !== 'all') {
      data = data.filter(item => item.method === methodFilter);
    }
    
    // Sort by created date (newest first)
    data.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
    
    return data;
  }, [expenses, incomes, searchQuery, typeFilter, methodFilter]);

  const totalExpense = useMemo(() => {
    return expenses.reduce((sum, expense) => sum + expense.amount, 0);
  }, [expenses]);

  const totalIncome = useMemo(() => {
    return incomes.reduce((sum, income) => sum + income.amount, 0);
  }, [incomes]);

  const netBalance = totalIncome + roomRevenue - totalExpense;

  if (hotelsLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1890ff" />
        <Text>{text.loading}</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{text.title}</Text>
        <TouchableOpacity
          style={styles.hotelSelector}
          onPress={() => {
            if (canSelectMultipleHotels) {
              setHotelModalVisible(true);
            }
          }}
        >
          <Ionicons name="business" size={16} color="#666" />
          <Text style={styles.hotelSelectorText}>
            {hotels.find(h => h.id === selectedHotelId)?.name || text.chooseHotel}
          </Text>
          <Ionicons name="chevron-down" size={16} color="#666" />
        </TouchableOpacity>
      </View>

      {/* Summary Cards */}
      <View style={styles.summaryContainer}>
        <View style={[styles.summaryCard, styles.roomRevenueCard]}>
          <Ionicons name="bed" size={24} color="#722ed1" />
          <View style={styles.summaryText}>
            <Text style={styles.summaryLabel}>{text.roomRevenue}</Text>
            <Text style={styles.summaryAmount}>+{formatCurrency(roomRevenue)}</Text>
          </View>
        </View>

        <View style={[styles.summaryCard, styles.incomeCard]}>
          <Ionicons name="trending-up" size={24} color="#52c41a" />
          <View style={styles.summaryText}>
            <Text style={styles.summaryLabel}>{text.incomeVoucher}</Text>
            <Text style={styles.summaryAmount}>+{formatCurrency(totalIncome)}</Text>
          </View>
        </View>
        
        <View style={[styles.summaryCard, styles.expenseCard]}>
          <Ionicons name="trending-down" size={24} color="#ff4d4f" />
          <View style={styles.summaryText}>
            <Text style={styles.summaryLabel}>{text.expenseVoucher}</Text>
            <Text style={styles.summaryAmount}>-{formatCurrency(totalExpense)}</Text>
          </View>
        </View>
        
        <View style={[styles.summaryCard, netBalance >= 0 ? styles.profitCard : styles.lossCard]}>
          <Ionicons name="wallet" size={24} color={netBalance >= 0 ? '#1890ff' : '#ff4d4f'} />
          <View style={styles.summaryText}>
            <Text style={styles.summaryLabel}>{text.netProfit}</Text>
            <Text style={styles.summaryAmount}>
              {netBalance >= 0 ? '+' : ''}{formatCurrency(netBalance)}
            </Text>
          </View>
        </View>
      </View>

      {/* Action Buttons */}
      <View style={styles.actionContainer}>
        <TouchableOpacity
          style={[styles.actionButton, styles.incomeButton]}
          onPress={openIncomeModal}
        >
          <Ionicons name="add-circle" size={20} color="#fff" />
          <Text style={styles.actionButtonText}>{text.createIncome}</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.actionButton, styles.expenseButton]}
          onPress={openExpenseModal}
        >
          <Ionicons name="remove-circle" size={20} color="#fff" />
          <Text style={styles.actionButtonText}>{text.createExpense}</Text>
        </TouchableOpacity>
      </View>

      {/* Filters */}
      <View style={styles.filterContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder={text.searchPlaceholder}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        
        <View style={styles.filterRow}>
          <TouchableOpacity
            style={[styles.filterButton, typeFilter === 'all' && styles.filterButtonActive]}
            onPress={() => setTypeFilter('all')}
          >
            <Text style={[styles.filterButtonText, typeFilter === 'all' && styles.filterButtonTextActive]}>
              {text.all}
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.filterButton, typeFilter === 'income' && styles.filterButtonActive]}
            onPress={() => setTypeFilter('income')}
          >
            <Text style={[styles.filterButtonText, typeFilter === 'income' && styles.filterButtonTextActive]}>
              {text.incomeVoucher}
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.filterButton, typeFilter === 'expense' && styles.filterButtonActive]}
            onPress={() => setTypeFilter('expense')}
          >
            <Text style={[styles.filterButtonText, typeFilter === 'expense' && styles.filterButtonTextActive]}>
              {text.expenseVoucher}
            </Text>
          </TouchableOpacity>
        </View>
        
        <View style={styles.filterRow}>
          <TouchableOpacity
            style={[styles.filterButton, methodFilter === 'all' && styles.filterButtonActive]}
            onPress={() => setMethodFilter('all')}
          >
            <Text style={[styles.filterButtonText, methodFilter === 'all' && styles.filterButtonTextActive]}>
              {text.allPaymentMethods}
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.filterButton, methodFilter === 'cash' && styles.filterButtonActive]}
            onPress={() => setMethodFilter('cash')}
          >
            <Text style={[styles.filterButtonText, methodFilter === 'cash' && styles.filterButtonTextActive]}>
              {text.cash}
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.filterButton, methodFilter === 'bank_transfer' && styles.filterButtonActive]}
            onPress={() => setMethodFilter('bank_transfer')}
          >
            <Text style={[styles.filterButtonText, methodFilter === 'bank_transfer' && styles.filterButtonTextActive]}>
              {text.bankTransfer}
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.filterButton, methodFilter === 'card' && styles.filterButtonActive]}
            onPress={() => setMethodFilter('card')}
          >
            <Text style={[styles.filterButtonText, methodFilter === 'card' && styles.filterButtonTextActive]}>
              {text.card}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Transaction List */}
      <View style={styles.listContainer}>
        {filteredData.map((item, index) => (
          <View key={`${item.type}-${item._id}-${index}`} style={styles.transactionItem}>
            <View style={styles.transactionHeader}>
              <View style={[styles.transactionTypeBadge, item.type === 'income' ? styles.incomeBadge : styles.expenseBadge]}>
                <Text style={styles.transactionTypeText}>
                  {item.type === 'income' ? (isVi ? 'THU' : 'IN') : (isVi ? 'CHI' : 'OUT')}
                </Text>
              </View>
              <Text style={styles.transactionDate}>{formatDate(item.createdAt || '')}</Text>
            </View>
            
            <View style={styles.transactionContent}>
              <View style={styles.transactionInfo}>
                <Text style={styles.transactionDescription}>{item.description}</Text>
                <Text style={styles.transactionCategory}>
                  {item.type === 'expense' 
                    ? getExpenseCategoryText((item as Expense).expenseCategory || 'other')
                    : getIncomeCategoryText((item as Income).incomeCategory || 'other')
                  }
                </Text>
                <Text style={styles.transactionMethod}>
                  {getMethodText(item.method)}
                </Text>
              </View>
              
              <View style={styles.transactionAmountContainer}>
                <Text style={[styles.transactionAmount, item.type === 'income' ? styles.incomeAmount : styles.expenseAmount]}>
                  {item.type === 'income' ? '+' : '-'}{formatCurrency(item.amount)}
                </Text>
                {(item as Expense).recipient && (
                  <Text style={styles.transactionRecipient}>{text.recipient}: {(item as Expense).recipient}</Text>
                )}
                {(item as Income).payer && (
                  <Text style={styles.transactionPayer}>{text.payer}: {(item as Income).payer}</Text>
                )}
              </View>
            </View>
            
            <View style={styles.transactionActions}>
              {!item.shiftHandoverId && (
                <TouchableOpacity
                  style={styles.deleteButton}
                  onPress={() => item.type === 'expense' ? deleteExpense(item._id!) : deleteIncome(item._id!)}
                >
                  <Ionicons name="trash" size={16} color="#ff4d4f" />
                  <Text style={styles.deleteButtonText}>{text.delete}</Text>
                </TouchableOpacity>
              )}
              {item.shiftHandoverId && (
                <Text style={styles.shiftHandoveredText}>{text.shiftHandedOver}</Text>
              )}
            </View>
          </View>
        ))}
        
        {filteredData.length === 0 && (
          <View style={styles.emptyContainer}>
            <Ionicons name="document-text" size={48} color="#ccc" />
            <Text style={styles.emptyText}>{text.noTransactions}</Text>
          </View>
        )}
      </View>

      {/* Expense Modal */}
      <Modal
        visible={isExpenseModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setIsExpenseModalVisible(false)}
      >
        <ScrollView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{text.expenseModalTitle}</Text>
            <TouchableOpacity onPress={() => setIsExpenseModalVisible(false)}>
              <Ionicons name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>
          
          <View style={styles.modalContent}>
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>{text.amount} <Text style={styles.required}>*</Text></Text>
              <TextInput
                style={styles.formInput}
                placeholder={text.enterAmount}
                keyboardType="numeric"
                value={expenseForm.amount}
                onChangeText={(text) => setExpenseForm({...expenseForm, amount: text})}
              />
            </View>
            
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>{text.paymentMethod} <Text style={styles.required}>*</Text></Text>
              <View style={styles.radioGroup}>
                {[
                  {value: 'cash', label: text.cash},
                  {value: 'bank_transfer', label: text.bankTransfer},
                  {value: 'card', label: text.card},
                  {value: 'other', label: text.other}
                ].map((option) => (
                  <TouchableOpacity
                    key={option.value}
                    style={[styles.radioButton, expenseForm.method === option.value && styles.radioButtonActive]}
                    onPress={() => setExpenseForm({...expenseForm, method: option.value as any})}
                  >
                    <Text style={[styles.radioButtonText, expenseForm.method === option.value && styles.radioButtonTextActive]}>
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>{text.expenseCategory} <Text style={styles.required}>*</Text></Text>
              <View style={styles.radioGroup}>
                {[
                  {value: 'supplies', label: text.supplies},
                  {value: 'utilities', label: text.utilities},
                  {value: 'salary', label: text.salary},
                  {value: 'maintenance', label: text.maintenance},
                  {value: 'marketing', label: text.marketing},
                  {value: 'other', label: text.other}
                ].map((option) => (
                  <TouchableOpacity
                    key={option.value}
                    style={[styles.radioButton, expenseForm.expenseCategory === option.value && styles.radioButtonActive]}
                    onPress={() => setExpenseForm({...expenseForm, expenseCategory: option.value as any})}
                  >
                    <Text style={[styles.radioButtonText, expenseForm.expenseCategory === option.value && styles.radioButtonTextActive]}>
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>{text.description} <Text style={styles.required}>*</Text></Text>
              <TextInput
                style={styles.formInput}
                placeholder={text.enterDescription}
                value={expenseForm.description}
                onChangeText={(text) => setExpenseForm({...expenseForm, description: text})}
              />
            </View>
            
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>{text.recipient}</Text>
              <TextInput
                style={styles.formInput}
                placeholder={text.enterRecipient}
                value={expenseForm.recipient}
                onChangeText={(text) => setExpenseForm({...expenseForm, recipient: text})}
              />
            </View>
            
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>{text.notes}</Text>
              <TextInput
                style={[styles.formInput, styles.formTextArea]}
                placeholder={text.enterNotes}
                multiline
                numberOfLines={3}
                value={expenseForm.notes}
                onChangeText={(text) => setExpenseForm({...expenseForm, notes: text})}
              />
            </View>
            
            <TouchableOpacity style={styles.submitButton} onPress={submitExpense}>
              <Text style={styles.submitButtonText}>{text.createExpense}</Text>
            </TouchableOpacity>
            
            <Text style={styles.modalSectionTitle}>{text.expenseList}</Text>
            {expenseLoading ? (
              <View style={styles.loadingSmall}>
                <ActivityIndicator size="small" color="#1890ff" />
                <Text>{text.loading}</Text>
              </View>
            ) : (
              <View style={styles.modalListContainer}>
                {expenses.map((expense) => (
                  <View key={expense._id} style={styles.transactionItem}>
                    <View style={styles.transactionHeader}>
                      <Text style={styles.transactionDate}>{formatDate(expense.createdAt || '')}</Text>
                      <Text style={[styles.transactionAmount, styles.expenseAmount]}>
                        -{formatCurrency(expense.amount)}
                      </Text>
                    </View>
                    <View style={styles.transactionContent}>
                      <View style={styles.transactionInfo}>
                        <Text style={styles.transactionDescription}>{expense.description}</Text>
                        <Text style={styles.transactionCategory}>
                          {getExpenseCategoryText(expense.expenseCategory || 'other')}
                        </Text>
                        <Text style={styles.transactionMethod}>{getMethodText(expense.method)}</Text>
                        {!!expense.recipient && (
                          <Text style={styles.transactionRecipient}>{text.recipient}: {expense.recipient}</Text>
                        )}
                      </View>
                      <View style={styles.transactionActions}>
                        {!expense.shiftHandoverId && (
                          <TouchableOpacity
                            style={styles.deleteButton}
                            onPress={() => expense._id && deleteExpense(expense._id)}
                          >
                            <Ionicons name="trash" size={16} color="#ff4d4f" />
                            <Text style={styles.deleteButtonText}>{text.delete}</Text>
                          </TouchableOpacity>
                        )}
                        {!!expense.shiftHandoverId && (
                          <Text style={styles.shiftHandoveredText}>{text.shiftHandedOver}</Text>
                        )}
                      </View>
                    </View>
                  </View>
                ))}
                {expenses.length === 0 && (
                  <View style={styles.emptyContainer}>
                    <Ionicons name="document-text" size={48} color="#ccc" />
                    <Text style={styles.emptyText}>{text.noExpense}</Text>
                  </View>
                )}
              </View>
            )}
          </View>
        </ScrollView>
      </Modal>

      {/* Income Modal */}
      <Modal
        visible={isIncomeModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setIsIncomeModalVisible(false)}
      >
        <ScrollView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{text.incomeModalTitle}</Text>
            <TouchableOpacity onPress={() => setIsIncomeModalVisible(false)}>
              <Ionicons name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>
          
          <View style={styles.modalContent}>
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>{text.amount} <Text style={styles.required}>*</Text></Text>
              <TextInput
                style={styles.formInput}
                placeholder={text.enterAmount}
                keyboardType="numeric"
                value={incomeForm.amount}
                onChangeText={(text) => setIncomeForm({...incomeForm, amount: text})}
              />
            </View>
            
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>{text.paymentMethod} <Text style={styles.required}>*</Text></Text>
              <View style={styles.radioGroup}>
                {[
                  {value: 'cash', label: text.cash},
                  {value: 'bank_transfer', label: text.bankTransfer},
                  {value: 'card', label: text.card},
                  {value: 'other', label: text.other}
                ].map((option) => (
                  <TouchableOpacity
                    key={option.value}
                    style={[styles.radioButton, incomeForm.method === option.value && styles.radioButtonActive]}
                    onPress={() => setIncomeForm({...incomeForm, method: option.value as any})}
                  >
                    <Text style={[styles.radioButtonText, incomeForm.method === option.value && styles.radioButtonTextActive]}>
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>{text.incomeCategory} <Text style={styles.required}>*</Text></Text>
              <View style={styles.radioGroup}>
                {[
                  {value: 'service', label: text.service},
                  {value: 'rental', label: text.rental},
                  {value: 'other', label: text.other}
                ].map((option) => (
                  <TouchableOpacity
                    key={option.value}
                    style={[styles.radioButton, incomeForm.incomeCategory === option.value && styles.radioButtonActive]}
                    onPress={() => setIncomeForm({...incomeForm, incomeCategory: option.value as any})}
                  >
                    <Text style={[styles.radioButtonText, incomeForm.incomeCategory === option.value && styles.radioButtonTextActive]}>
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>{text.description} <Text style={styles.required}>*</Text></Text>
              <TextInput
                style={styles.formInput}
                placeholder={text.enterDescription}
                value={incomeForm.description}
                onChangeText={(text) => setIncomeForm({...incomeForm, description: text})}
              />
            </View>
            
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>{text.payer}</Text>
              <TextInput
                style={styles.formInput}
                placeholder={text.enterPayer}
                value={incomeForm.payer}
                onChangeText={(text) => setIncomeForm({...incomeForm, payer: text})}
              />
            </View>
            
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>{text.notes}</Text>
              <TextInput
                style={[styles.formInput, styles.formTextArea]}
                placeholder={text.enterNotes}
                multiline
                numberOfLines={3}
                value={incomeForm.notes}
                onChangeText={(text) => setIncomeForm({...incomeForm, notes: text})}
              />
            </View>
            
            <TouchableOpacity style={styles.submitButton} onPress={submitIncome}>
              <Text style={styles.submitButtonText}>{text.createIncome}</Text>
            </TouchableOpacity>
            
            <Text style={styles.modalSectionTitle}>{text.incomeList}</Text>
            {incomeLoading ? (
              <View style={styles.loadingSmall}>
                <ActivityIndicator size="small" color="#1890ff" />
                <Text>{text.loading}</Text>
              </View>
            ) : (
              <View style={styles.modalListContainer}>
                {incomes.map((income) => (
                  <View key={income._id} style={styles.transactionItem}>
                    <View style={styles.transactionHeader}>
                      <Text style={styles.transactionDate}>{formatDate(income.createdAt || '')}</Text>
                      <Text style={[styles.transactionAmount, styles.incomeAmount]}>
                        +{formatCurrency(income.amount)}
                      </Text>
                    </View>
                    <View style={styles.transactionContent}>
                      <View style={styles.transactionInfo}>
                        <Text style={styles.transactionDescription}>{income.description}</Text>
                        <Text style={styles.transactionCategory}>
                          {getIncomeCategoryText(income.incomeCategory || 'other')}
                        </Text>
                        <Text style={styles.transactionMethod}>{getMethodText(income.method)}</Text>
                        {!!income.payer && (
                          <Text style={styles.transactionPayer}>{text.payer}: {income.payer}</Text>
                        )}
                      </View>
                      <View style={styles.transactionActions}>
                        {!income.shiftHandoverId && (
                          <TouchableOpacity
                            style={styles.deleteButton}
                            onPress={() => income._id && deleteIncome(income._id)}
                          >
                            <Ionicons name="trash" size={16} color="#ff4d4f" />
                            <Text style={styles.deleteButtonText}>{text.delete}</Text>
                          </TouchableOpacity>
                        )}
                        {!!income.shiftHandoverId && (
                          <Text style={styles.shiftHandoveredText}>{text.shiftHandedOver}</Text>
                        )}
                      </View>
                    </View>
                  </View>
                ))}
                {incomes.length === 0 && (
                  <View style={styles.emptyContainer}>
                    <Ionicons name="document-text" size={48} color="#ccc" />
                    <Text style={styles.emptyText}>{text.noIncome}</Text>
                  </View>
                )}
              </View>
            )}
          </View>
        </ScrollView>
      </Modal>
      
      {/* Hotel Selection Modal */}
      <Modal
        visible={hotelModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setHotelModalVisible(false)}
      >
        <View style={styles.hotelModalBackdrop}>
          <View style={styles.hotelModalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{text.chooseHotel}</Text>
              <TouchableOpacity onPress={() => setHotelModalVisible(false)}>
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.hotelModalBody}>
              {hotelsLoading ? (
                <View style={styles.loadingSmall}>
                  <ActivityIndicator size="small" color="#1890ff" />
                  <Text>{isVi ? 'Đang tải khách sạn...' : 'Loading hotels...'}</Text>
                </View>
              ) : (
                hotels.map((hotel) => (
                  <TouchableOpacity
                    key={hotel.id}
                    style={[
                      styles.hotelOption,
                      selectedHotelId === hotel.id && styles.hotelOptionSelected
                    ]}
                    onPress={() => {
                      selectHotel(hotel.id);
                      setHotelModalVisible(false);
                    }}
                  >
                    <Text
                      style={[
                        styles.hotelOptionText,
                        selectedHotelId === hotel.id && styles.hotelOptionTextSelected
                      ]}
                    >
                      {hotel.name}
                    </Text>
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  header: {
    backgroundColor: '#fff',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e8e8e8',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  hotelSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  hotelSelectorText: {
    marginHorizontal: 8,
    fontSize: 14,
    color: '#666',
  },
  summaryContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 16,
    gap: 12,
  },
  summaryCard: {
    flexGrow: 1,
    flexBasis: '45%',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  incomeCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#52c41a',
  },
  roomRevenueCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#722ed1',
    backgroundColor: '#f9f0ff',
  },
  expenseCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#ff4d4f',
  },
  profitCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#1890ff',
  },
  lossCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#ff4d4f',
  },
  summaryText: {
    marginLeft: 12,
    flex: 1,
  },
  summaryLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  summaryAmount: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  actionContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 12,
    marginBottom: 16,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  incomeButton: {
    backgroundColor: '#52c41a',
  },
  expenseButton: {
    backgroundColor: '#ff4d4f',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  filterContainer: {
    backgroundColor: '#fff',
    padding: 16,
    marginBottom: 16,
  },
  searchInput: {
    borderWidth: 1,
    borderColor: '#d9d9d9',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    marginBottom: 12,
  },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  filterButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#d9d9d9',
    borderRadius: 16,
  },
  filterButtonActive: {
    backgroundColor: '#1890ff',
    borderColor: '#1890ff',
  },
  filterButtonText: {
    fontSize: 12,
    color: '#666',
  },
  filterButtonTextActive: {
    color: '#fff',
  },
  listContainer: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  transactionItem: {
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    paddingVertical: 12,
  },
  transactionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  transactionTypeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  incomeBadge: {
    backgroundColor: '#f6ffed',
    borderWidth: 1,
    borderColor: '#b7eb8f',
  },
  expenseBadge: {
    backgroundColor: '#fff1f0',
    borderWidth: 1,
    borderColor: '#ffa39e',
  },
  transactionTypeText: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  transactionDate: {
    fontSize: 12,
    color: '#999',
  },
  transactionContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  transactionInfo: {
    flex: 1,
  },
  transactionDescription: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    marginBottom: 4,
  },
  transactionCategory: {
    fontSize: 12,
    color: '#666',
    marginBottom: 2,
  },
  transactionMethod: {
    fontSize: 11,
    color: '#999',
  },
  transactionAmountContainer: {
    alignItems: 'flex-end',
  },
  transactionAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  incomeAmount: {
    color: '#52c41a',
  },
  expenseAmount: {
    color: '#ff4d4f',
  },
  transactionRecipient: {
    fontSize: 11,
    color: '#666',
  },
  transactionPayer: {
    fontSize: 11,
    color: '#666',
  },
  transactionActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 8,
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#ff4d4f',
    borderRadius: 16,
    gap: 4,
  },
  deleteButtonText: {
    fontSize: 12,
    color: '#ff4d4f',
  },
  shiftHandoveredText: {
    fontSize: 11,
    color: '#999',
    fontStyle: 'italic',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyText: {
    fontSize: 14,
    color: '#999',
    marginTop: 12,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e8e8e8',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  modalContent: {
    padding: 16,
  },
  formGroup: {
    marginBottom: 16,
  },
  formLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    marginBottom: 8,
  },
  required: {
    color: '#ff4d4f',
  },
  formInput: {
    borderWidth: 1,
    borderColor: '#d9d9d9',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
  },
  formTextArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  radioGroup: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  radioButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#d9d9d9',
    borderRadius: 16,
  },
  radioButtonActive: {
    backgroundColor: '#1890ff',
    borderColor: '#1890ff',
  },
  radioButtonText: {
    fontSize: 12,
    color: '#666',
  },
  radioButtonTextActive: {
    color: '#fff',
  },
  submitButton: {
    backgroundColor: '#1890ff',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 24,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  modalSectionTitle: {
    marginTop: 24,
    marginBottom: 12,
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  modalListContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingVertical: 8,
  },
  hotelModalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 20,
  },
  hotelModalCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    maxHeight: '80%',
    padding: 16,
  },
  hotelModalBody: {
    maxHeight: '70%',
  },
  hotelOption: {
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: '#f5f5f5',
    marginBottom: 8,
  },
  hotelOptionSelected: {
    backgroundColor: '#1890ff',
  },
  hotelOptionText: {
    fontSize: 16,
    color: '#000',
  },
  hotelOptionTextSelected: {
    color: '#fff',
    fontWeight: '600',
  },
  loadingSmall: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
  },
});
