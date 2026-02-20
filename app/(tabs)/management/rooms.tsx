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
import { vi } from 'date-fns/locale';

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

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(amount);
  };

  const formatDate = (date: Date | string) => {
    return format(new Date(date), 'dd/MM/yyyy HH:mm', { locale: vi });
  };

  const getMethodText = (method: string) => {
    switch (method) {
      case 'cash':
        return 'Tiền mặt';
      case 'bank_transfer':
        return 'Chuyển khoản';
      case 'card':
      case 'credit_card':
        return 'Thẻ';
      case 'virtual_card':
        return 'Thẻ ảo';
      default:
        return 'Khác';
    }
  };

  const getExpenseCategoryText = (category: string) => {
    switch (category) {
      case 'supplies':
        return 'Vật tư';
      case 'utilities':
        return 'Tiện ích';
      case 'salary':
        return 'Lương';
      case 'maintenance':
        return 'Bảo trì';
      case 'marketing':
        return 'Marketing';
      default:
        return 'Khác';
    }
  };

  const getIncomeCategoryText = (category: string) => {
    switch (category) {
      case 'service':
        return 'Dịch vụ';
      case 'rental':
        return 'Thuê';
      default:
        return 'Khác';
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
      Alert.alert('Lỗi', 'Không thể tải danh sách chi tiêu');
    } finally {
      setExpenseLoading(false);
    }
  }, [selectedHotelId, canSelectMultipleHotels, dateFilter]);

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
      Alert.alert('Lỗi', 'Không thể tải danh sách thu nhập');
    } finally {
      setIncomeLoading(false);
    }
  }, [selectedHotelId, canSelectMultipleHotels, dateFilter]);

  useEffect(() => {
    loadExpenses();
    loadIncomes();
  }, [loadExpenses, loadIncomes]);

  const submitExpense = async () => {
    if (!selectedHotelId) {
      Alert.alert('Lỗi', 'Vui lòng chọn khách sạn');
      return;
    }
    
    if (!expenseForm.amount || !expenseForm.description) {
      Alert.alert('Lỗi', 'Vui lòng điền đầy đủ thông tin bắt buộc');
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
      Alert.alert('Thành công', 'Tạo phiếu chi thành công');
      setIsExpenseModalVisible(false);
      resetExpenseForm();
      loadExpenses();
    } catch (error) {
      console.warn('Error creating expense:', error);
      Alert.alert('Lỗi', 'Không thể tạo phiếu chi');
    }
  };

  const submitIncome = async () => {
    if (!selectedHotelId) {
      Alert.alert('Lỗi', 'Vui lòng chọn khách sạn');
      return;
    }
    
    if (!incomeForm.amount || !incomeForm.description) {
      Alert.alert('Lỗi', 'Vui lòng điền đầy đủ thông tin bắt buộc');
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
      Alert.alert('Thành công', 'Tạo phiếu thu thành công');
      setIsIncomeModalVisible(false);
      resetIncomeForm();
      loadIncomes();
    } catch (error) {
      console.warn('Error creating income:', error);
      Alert.alert('Lỗi', 'Không thể tạo phiếu thu');
    }
  };

  const deleteExpense = async (expenseId: string) => {
    Alert.alert(
      'Xác nhận',
      'Bạn có chắc chắn muốn xóa phiếu chi này?',
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Xóa',
          style: 'destructive',
          onPress: async () => {
            try {
              await transactionsApi.deleteExpense(expenseId);
              Alert.alert('Thành công', 'Xóa phiếu chi thành công');
              loadExpenses();
            } catch (error) {
              console.warn('Error deleting expense:', error);
              Alert.alert('Lỗi', 'Không thể xóa phiếu chi');
            }
          },
        },
      ]
    );
  };

  const deleteIncome = async (incomeId: string) => {
    Alert.alert(
      'Xác nhận',
      'Bạn có chắc chắn muốn xóa phiếu thu này?',
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Xóa',
          style: 'destructive',
          onPress: async () => {
            try {
              await transactionsApi.deleteIncome(incomeId);
              Alert.alert('Thành công', 'Xóa phiếu thu thành công');
              loadIncomes();
            } catch (error) {
              console.warn('Error deleting income:', error);
              Alert.alert('Lỗi', 'Không thể xóa phiếu thu');
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
      Alert.alert('Lỗi', 'Vui lòng chọn khách sạn');
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
  }, [selectedHotelId, loadExpenses]);
  
  const openIncomeModal = useCallback(() => {
    if (!selectedHotelId) {
      Alert.alert('Lỗi', 'Vui lòng chọn khách sạn');
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
  }, [selectedHotelId, loadIncomes]);

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
        <Text>Đang tải...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Quản lý thu chi</Text>
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
            {hotels.find(h => h.id === selectedHotelId)?.name || 'Chọn khách sạn'}
          </Text>
          <Ionicons name="chevron-down" size={16} color="#666" />
        </TouchableOpacity>
      </View>

      {/* Summary Cards */}
      <View style={styles.summaryContainer}>
        <View style={[styles.summaryCard, styles.roomRevenueCard]}>
          <Ionicons name="bed" size={24} color="#722ed1" />
          <View style={styles.summaryText}>
            <Text style={styles.summaryLabel}>Doanh thu phòng</Text>
            <Text style={styles.summaryAmount}>+{formatCurrency(roomRevenue)}</Text>
          </View>
        </View>

        <View style={[styles.summaryCard, styles.incomeCard]}>
          <Ionicons name="trending-up" size={24} color="#52c41a" />
          <View style={styles.summaryText}>
            <Text style={styles.summaryLabel}>Phiếu thu</Text>
            <Text style={styles.summaryAmount}>+{formatCurrency(totalIncome)}</Text>
          </View>
        </View>
        
        <View style={[styles.summaryCard, styles.expenseCard]}>
          <Ionicons name="trending-down" size={24} color="#ff4d4f" />
          <View style={styles.summaryText}>
            <Text style={styles.summaryLabel}>Phiếu chi</Text>
            <Text style={styles.summaryAmount}>-{formatCurrency(totalExpense)}</Text>
          </View>
        </View>
        
        <View style={[styles.summaryCard, netBalance >= 0 ? styles.profitCard : styles.lossCard]}>
          <Ionicons name="wallet" size={24} color={netBalance >= 0 ? '#1890ff' : '#ff4d4f'} />
          <View style={styles.summaryText}>
            <Text style={styles.summaryLabel}>Lãi/Lỗ (Thực thu)</Text>
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
          <Text style={styles.actionButtonText}>Tạo phiếu thu</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.actionButton, styles.expenseButton]}
          onPress={openExpenseModal}
        >
          <Ionicons name="remove-circle" size={20} color="#fff" />
          <Text style={styles.actionButtonText}>Tạo phiếu chi</Text>
        </TouchableOpacity>
      </View>

      {/* Filters */}
      <View style={styles.filterContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Tìm kiếm theo mô tả, ghi chú, người nhận..."
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        
        <View style={styles.filterRow}>
          <TouchableOpacity
            style={[styles.filterButton, typeFilter === 'all' && styles.filterButtonActive]}
            onPress={() => setTypeFilter('all')}
          >
            <Text style={[styles.filterButtonText, typeFilter === 'all' && styles.filterButtonTextActive]}>
              Tất cả
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.filterButton, typeFilter === 'income' && styles.filterButtonActive]}
            onPress={() => setTypeFilter('income')}
          >
            <Text style={[styles.filterButtonText, typeFilter === 'income' && styles.filterButtonTextActive]}>
              Phiếu thu
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.filterButton, typeFilter === 'expense' && styles.filterButtonActive]}
            onPress={() => setTypeFilter('expense')}
          >
            <Text style={[styles.filterButtonText, typeFilter === 'expense' && styles.filterButtonTextActive]}>
              Phiếu chi
            </Text>
          </TouchableOpacity>
        </View>
        
        <View style={styles.filterRow}>
          <TouchableOpacity
            style={[styles.filterButton, methodFilter === 'all' && styles.filterButtonActive]}
            onPress={() => setMethodFilter('all')}
          >
            <Text style={[styles.filterButtonText, methodFilter === 'all' && styles.filterButtonTextActive]}>
              Tất cả PTTT
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.filterButton, methodFilter === 'cash' && styles.filterButtonActive]}
            onPress={() => setMethodFilter('cash')}
          >
            <Text style={[styles.filterButtonText, methodFilter === 'cash' && styles.filterButtonTextActive]}>
              Tiền mặt
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.filterButton, methodFilter === 'bank_transfer' && styles.filterButtonActive]}
            onPress={() => setMethodFilter('bank_transfer')}
          >
            <Text style={[styles.filterButtonText, methodFilter === 'bank_transfer' && styles.filterButtonTextActive]}>
              Chuyển khoản
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.filterButton, methodFilter === 'card' && styles.filterButtonActive]}
            onPress={() => setMethodFilter('card')}
          >
            <Text style={[styles.filterButtonText, methodFilter === 'card' && styles.filterButtonTextActive]}>
              Thẻ
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
                  {item.type === 'income' ? 'THU' : 'CHI'}
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
                  <Text style={styles.transactionRecipient}>Người nhận: {(item as Expense).recipient}</Text>
                )}
                {(item as Income).payer && (
                  <Text style={styles.transactionPayer}>Người nộp: {(item as Income).payer}</Text>
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
                  <Text style={styles.deleteButtonText}>Xóa</Text>
                </TouchableOpacity>
              )}
              {item.shiftHandoverId && (
                <Text style={styles.shiftHandoveredText}>Đã giao ca</Text>
              )}
            </View>
          </View>
        ))}
        
        {filteredData.length === 0 && (
          <View style={styles.emptyContainer}>
            <Ionicons name="document-text" size={48} color="#ccc" />
            <Text style={styles.emptyText}>Không có giao dịch nào</Text>
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
            <Text style={styles.modalTitle}>Tạo phiếu chi</Text>
            <TouchableOpacity onPress={() => setIsExpenseModalVisible(false)}>
              <Ionicons name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>
          
          <View style={styles.modalContent}>
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Số tiền <Text style={styles.required}>*</Text></Text>
              <TextInput
                style={styles.formInput}
                placeholder="Nhập số tiền"
                keyboardType="numeric"
                value={expenseForm.amount}
                onChangeText={(text) => setExpenseForm({...expenseForm, amount: text})}
              />
            </View>
            
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Phương thức thanh toán <Text style={styles.required}>*</Text></Text>
              <View style={styles.radioGroup}>
                {[
                  {value: 'cash', label: 'Tiền mặt'},
                  {value: 'bank_transfer', label: 'Chuyển khoản'},
                  {value: 'card', label: 'Thẻ'},
                  {value: 'other', label: 'Khác'}
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
              <Text style={styles.formLabel}>Loại chi phí <Text style={styles.required}>*</Text></Text>
              <View style={styles.radioGroup}>
                {[
                  {value: 'supplies', label: 'Vật tư'},
                  {value: 'utilities', label: 'Tiện ích'},
                  {value: 'salary', label: 'Lương'},
                  {value: 'maintenance', label: 'Bảo trì'},
                  {value: 'marketing', label: 'Marketing'},
                  {value: 'other', label: 'Khác'}
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
              <Text style={styles.formLabel}>Mô tả <Text style={styles.required}>*</Text></Text>
              <TextInput
                style={styles.formInput}
                placeholder="Nhập mô tả"
                value={expenseForm.description}
                onChangeText={(text) => setExpenseForm({...expenseForm, description: text})}
              />
            </View>
            
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Người nhận</Text>
              <TextInput
                style={styles.formInput}
                placeholder="Nhập người nhận"
                value={expenseForm.recipient}
                onChangeText={(text) => setExpenseForm({...expenseForm, recipient: text})}
              />
            </View>
            
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Ghi chú</Text>
              <TextInput
                style={[styles.formInput, styles.formTextArea]}
                placeholder="Nhập ghi chú"
                multiline
                numberOfLines={3}
                value={expenseForm.notes}
                onChangeText={(text) => setExpenseForm({...expenseForm, notes: text})}
              />
            </View>
            
            <TouchableOpacity style={styles.submitButton} onPress={submitExpense}>
              <Text style={styles.submitButtonText}>Tạo phiếu chi</Text>
            </TouchableOpacity>
            
            <Text style={styles.modalSectionTitle}>Danh sách phiếu chi</Text>
            {expenseLoading ? (
              <View style={styles.loadingSmall}>
                <ActivityIndicator size="small" color="#1890ff" />
                <Text>Đang tải...</Text>
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
                          <Text style={styles.transactionRecipient}>Người nhận: {expense.recipient}</Text>
                        )}
                      </View>
                      <View style={styles.transactionActions}>
                        {!expense.shiftHandoverId && (
                          <TouchableOpacity
                            style={styles.deleteButton}
                            onPress={() => expense._id && deleteExpense(expense._id)}
                          >
                            <Ionicons name="trash" size={16} color="#ff4d4f" />
                            <Text style={styles.deleteButtonText}>Xóa</Text>
                          </TouchableOpacity>
                        )}
                        {!!expense.shiftHandoverId && (
                          <Text style={styles.shiftHandoveredText}>Đã giao ca</Text>
                        )}
                      </View>
                    </View>
                  </View>
                ))}
                {expenses.length === 0 && (
                  <View style={styles.emptyContainer}>
                    <Ionicons name="document-text" size={48} color="#ccc" />
                    <Text style={styles.emptyText}>Không có phiếu chi</Text>
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
            <Text style={styles.modalTitle}>Tạo phiếu thu</Text>
            <TouchableOpacity onPress={() => setIsIncomeModalVisible(false)}>
              <Ionicons name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>
          
          <View style={styles.modalContent}>
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Số tiền <Text style={styles.required}>*</Text></Text>
              <TextInput
                style={styles.formInput}
                placeholder="Nhập số tiền"
                keyboardType="numeric"
                value={incomeForm.amount}
                onChangeText={(text) => setIncomeForm({...incomeForm, amount: text})}
              />
            </View>
            
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Phương thức thanh toán <Text style={styles.required}>*</Text></Text>
              <View style={styles.radioGroup}>
                {[
                  {value: 'cash', label: 'Tiền mặt'},
                  {value: 'bank_transfer', label: 'Chuyển khoản'},
                  {value: 'card', label: 'Thẻ'},
                  {value: 'other', label: 'Khác'}
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
              <Text style={styles.formLabel}>Loại thu nhập <Text style={styles.required}>*</Text></Text>
              <View style={styles.radioGroup}>
                {[
                  {value: 'service', label: 'Dịch vụ'},
                  {value: 'rental', label: 'Thuê'},
                  {value: 'other', label: 'Khác'}
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
              <Text style={styles.formLabel}>Mô tả <Text style={styles.required}>*</Text></Text>
              <TextInput
                style={styles.formInput}
                placeholder="Nhập mô tả"
                value={incomeForm.description}
                onChangeText={(text) => setIncomeForm({...incomeForm, description: text})}
              />
            </View>
            
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Người nộp</Text>
              <TextInput
                style={styles.formInput}
                placeholder="Nhập người nộp"
                value={incomeForm.payer}
                onChangeText={(text) => setIncomeForm({...incomeForm, payer: text})}
              />
            </View>
            
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Ghi chú</Text>
              <TextInput
                style={[styles.formInput, styles.formTextArea]}
                placeholder="Nhập ghi chú"
                multiline
                numberOfLines={3}
                value={incomeForm.notes}
                onChangeText={(text) => setIncomeForm({...incomeForm, notes: text})}
              />
            </View>
            
            <TouchableOpacity style={styles.submitButton} onPress={submitIncome}>
              <Text style={styles.submitButtonText}>Tạo phiếu thu</Text>
            </TouchableOpacity>
            
            <Text style={styles.modalSectionTitle}>Danh sách phiếu thu</Text>
            {incomeLoading ? (
              <View style={styles.loadingSmall}>
                <ActivityIndicator size="small" color="#1890ff" />
                <Text>Đang tải...</Text>
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
                          <Text style={styles.transactionPayer}>Người nộp: {income.payer}</Text>
                        )}
                      </View>
                      <View style={styles.transactionActions}>
                        {!income.shiftHandoverId && (
                          <TouchableOpacity
                            style={styles.deleteButton}
                            onPress={() => income._id && deleteIncome(income._id)}
                          >
                            <Ionicons name="trash" size={16} color="#ff4d4f" />
                            <Text style={styles.deleteButtonText}>Xóa</Text>
                          </TouchableOpacity>
                        )}
                        {!!income.shiftHandoverId && (
                          <Text style={styles.shiftHandoveredText}>Đã giao ca</Text>
                        )}
                      </View>
                    </View>
                  </View>
                ))}
                {incomes.length === 0 && (
                  <View style={styles.emptyContainer}>
                    <Ionicons name="document-text" size={48} color="#ccc" />
                    <Text style={styles.emptyText}>Không có phiếu thu</Text>
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
              <Text style={styles.modalTitle}>Chọn Khách Sạn</Text>
              <TouchableOpacity onPress={() => setHotelModalVisible(false)}>
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.hotelModalBody}>
              {hotelsLoading ? (
                <View style={styles.loadingSmall}>
                  <ActivityIndicator size="small" color="#1890ff" />
                  <Text>Đang tải khách sạn...</Text>
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
