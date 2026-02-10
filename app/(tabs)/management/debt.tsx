import React, { useState, useEffect } from 'react';
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

interface Debt {
  id: string;
  guestName: string;
  guestPhone?: string;
  roomNumber?: string;
  amount: number;
  dueDate: string;
  status: 'pending' | 'overdue' | 'paid' | 'partial';
  notes?: string;
  labels?: Array<{ name: string; color: string }>;
  createdAt: string;
  updatedAt: string;
}

interface SettleDebtData {
  amount: number;
  paymentMethod: string;
  notes: string;
}

export default function DebtManagementScreen() {
  const [debts, setDebts] = useState<Debt[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [settleModalVisible, setSettleModalVisible] = useState(false);
  const [selectedDebt, setSelectedDebt] = useState<Debt | null>(null);
  const [settleData, setSettleData] = useState<SettleDebtData>({
    amount: 0,
    paymentMethod: 'cash',
    notes: '',
  });

  // Mock data for demonstration
  const mockDebts: Debt[] = [
    {
      id: '1',
      guestName: 'Nguyễn Văn A',
      guestPhone: '0901234567',
      roomNumber: '101',
      amount: 1500000,
      dueDate: '2024-02-15',
      status: 'overdue',
      notes: 'Khách hẹn thanh toán cuối tuần',
      labels: [
        { name: 'Quan trọng', color: 'red' },
        { name: 'Cần liên hệ', color: 'orange' },
      ],
      createdAt: '2024-01-15',
      updatedAt: '2024-01-15',
    },
    {
      id: '2',
      guestName: 'Trần Thị B',
      guestPhone: '0909876543',
      roomNumber: '205',
      amount: 800000,
      dueDate: '2024-02-20',
      status: 'pending',
      notes: '',
      labels: [],
      createdAt: '2024-01-20',
      updatedAt: '2024-01-20',
    },
    {
      id: '3',
      guestName: 'Lê Văn C',
      guestPhone: '0905555555',
      roomNumber: '308',
      amount: 2000000,
      dueDate: '2024-02-10',
      status: 'partial',
      notes: 'Đã thanh toán 1 triệu',
      labels: [
        { name: 'VIP', color: 'purple' },
      ],
      createdAt: '2024-01-10',
      updatedAt: '2024-01-10',
    },
  ];

  const paymentMethods = [
    { value: 'cash', label: 'Tiền mặt' },
    { value: 'bank_transfer', label: 'Chuyển khoản' },
    { value: 'credit_card', label: 'Thẻ tín dụng' },
    { value: 'digital_wallet', label: 'Ví điện tử' },
  ];

  const statusOptions = [
    { value: 'all', label: 'Tất cả' },
    { value: 'pending', label: 'Chờ xử lý' },
    { value: 'overdue', label: 'Quá hạn' },
    { value: 'partial', label: 'Thanh toán một phần' },
    { value: 'paid', label: 'Đã thanh toán' },
  ];

  useEffect(() => {
    // Load debts from API
    setTimeout(() => {
      setDebts(mockDebts);
      setLoading(false);
    }, 1000);
  }, []);

  const handleSettleDebt = (debt: Debt) => {
    setSelectedDebt(debt);
    setSettleData({
      amount: debt.amount,
      paymentMethod: 'cash',
      notes: '',
    });
    setSettleModalVisible(true);
  };

  const confirmSettleDebt = () => {
    if (!selectedDebt) return;

    // Mock API call to settle debt
    Alert.alert(
      'Xác nhận',
      `Bạn có chắc chắn muốn thanh toán ${formatCurrency(settleData.amount)} cho ${selectedDebt.guestName}?`,
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Xác nhận',
          onPress: () => {
            // Update debt status
            setDebts(debts.map(debt =>
              debt.id === selectedDebt.id
                ? { ...debt, status: 'paid', updatedAt: new Date().toISOString() }
                : debt
            ));
            setSettleModalVisible(false);
            Alert.alert('Thành công', 'Đã thanh toán công nợ thành công!');
          },
        },
      ]
    );
  };

  const handleDeleteDebt = (debtId: string) => {
    Alert.alert(
      'Xác nhận',
      'Bạn có chắc chắn muốn xóa công nợ này?',
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Xóa',
          style: 'destructive',
          onPress: () => {
            setDebts(debts.filter(debt => debt.id !== debtId));
          },
        },
      ]
    );
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('vi-VN');
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'overdue': return '#FF3B30';
      case 'pending': return '#FF9500';
      case 'partial': return '#007AFF';
      case 'paid': return '#34C759';
      default: return '#8E8E93';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'overdue': return 'Quá hạn';
      case 'pending': return 'Chờ xử lý';
      case 'partial': return 'Một phần';
      case 'paid': return 'Đã thanh toán';
      default: return 'Không xác định';
    }
  };

  const filteredDebts = debts.filter(debt => {
    const matchesSearch = 
      debt.guestName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      debt.guestPhone?.includes(searchQuery) ||
      debt.roomNumber?.includes(searchQuery);
    
    const matchesStatus = statusFilter === 'all' || debt.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Đang tải dữ liệu...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Quản Lý Công Nợ</Text>
        <View style={styles.headerStats}>
          <Text style={styles.statText}>Tổng: {filteredDebts.length} công nợ</Text>
        </View>
      </View>

      {/* Filters */}
      <View style={styles.filterContainer}>
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color="#8E8E93" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Tìm kiếm theo tên, SĐT, số phòng..."
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
        
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          style={styles.statusFilterContainer}
        >
          {statusOptions.map((option) => (
            <TouchableOpacity
              key={option.value}
              style={[
                styles.statusFilterButton,
                statusFilter === option.value && styles.activeStatusFilter
              ]}
              onPress={() => setStatusFilter(option.value)}
            >
              <Text style={[
                styles.statusFilterText,
                statusFilter === option.value && styles.activeStatusFilterText
              ]}>
                {option.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Debt List */}
      <ScrollView style={styles.debtList}>
        {filteredDebts.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="wallet-outline" size={64} color="#C7C7CC" />
            <Text style={styles.emptyText}>Không có công nợ nào</Text>
          </View>
        ) : (
          filteredDebts.map((debt) => (
            <View key={debt.id} style={styles.debtCard}>
              <View style={styles.debtHeader}>
                <View style={styles.guestInfo}>
                  <Text style={styles.guestName}>{debt.guestName}</Text>
                  <Text style={styles.guestPhone}>{debt.guestPhone}</Text>
                  {debt.roomNumber && (
                    <Text style={styles.roomNumber}>Phòng {debt.roomNumber}</Text>
                  )}
                </View>
                <View style={styles.statusContainer}>
                  <View style={[styles.statusBadge, { backgroundColor: getStatusColor(debt.status) + '20' }]}>
                    <Text style={[styles.statusText, { color: getStatusColor(debt.status) }]}>
                      {getStatusText(debt.status)}
                    </Text>
                  </View>
                </View>
              </View>
              
              <View style={styles.debtDetails}>
                <View style={styles.amountRow}>
                  <Text style={styles.amountLabel}>Số tiền:</Text>
                  <Text style={styles.amountValue}>{formatCurrency(debt.amount)}</Text>
                </View>
                <View style={styles.amountRow}>
                  <Text style={styles.amountLabel}>Hạn thanh toán:</Text>
                  <Text style={styles.dueDate}>{formatDate(debt.dueDate)}</Text>
                </View>
                {debt.notes && (
                  <Text style={styles.notes}>{debt.notes}</Text>
                )}
                
                {debt.labels && debt.labels.length > 0 && (
                  <View style={styles.labelsContainer}>
                    {debt.labels.map((label, index) => (
                      <View key={index} style={[styles.labelBadge, { backgroundColor: label.color + '30' }]}>
                        <Text style={[styles.labelText, { color: label.color }]}>
                          {label.name}
                        </Text>
                      </View>
                    ))}
                  </View>
                )}
              </View>
              
              <View style={styles.debtActions}>
                {debt.status !== 'paid' && (
                  <TouchableOpacity
                    style={styles.settleButton}
                    onPress={() => handleSettleDebt(debt)}
                  >
                    <Ionicons name="checkmark-circle-outline" size={18} color="#FFF" />
                    <Text style={styles.settleButtonText}>Thanh toán</Text>
                  </TouchableOpacity>
                )}
                
                <TouchableOpacity
                  style={styles.deleteButton}
                  onPress={() => handleDeleteDebt(debt.id)}
                >
                  <Ionicons name="trash-outline" size={18} color="#FF3B30" />
                  <Text style={styles.deleteButtonText}>Xóa</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
      </ScrollView>

      {/* Settle Debt Modal */}
      <Modal
        visible={settleModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setSettleModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Thanh Toán Công Nợ</Text>
              <TouchableOpacity onPress={() => setSettleModalVisible(false)}>
                <Ionicons name="close" size={24} color="#8E8E93" />
              </TouchableOpacity>
            </View>
            
            {selectedDebt && (
              <View style={styles.modalBody}>
                <View style={styles.debtInfo}>
                  <Text style={styles.debtGuestName}>{selectedDebt.guestName}</Text>
                  <Text style={styles.debtAmount}>{formatCurrency(selectedDebt.amount)}</Text>
                </View>
                
                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>Số tiền thanh toán</Text>
                  <TextInput
                    style={styles.formInput}
                    value={settleData.amount.toString()}
                    onChangeText={(text) => setSettleData({...settleData, amount: parseFloat(text) || 0})}
                    keyboardType="numeric"
                    placeholder="Nhập số tiền"
                  />
                </View>
                
                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>Phương thức thanh toán</Text>
                  <View style={styles.paymentMethodContainer}>
                    {paymentMethods.map((method) => (
                      <TouchableOpacity
                        key={method.value}
                        style={[
                          styles.paymentMethodButton,
                          settleData.paymentMethod === method.value && styles.activePaymentMethod
                        ]}
                        onPress={() => setSettleData({...settleData, paymentMethod: method.value})}
                      >
                        <Text style={[
                          styles.paymentMethodText,
                          settleData.paymentMethod === method.value && styles.activePaymentMethodText
                        ]}>
                          {method.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
                
                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>Ghi chú</Text>
                  <TextInput
                    style={[styles.formInput, styles.textArea]}
                    value={settleData.notes}
                    onChangeText={(text) => setSettleData({...settleData, notes: text})}
                    placeholder="Nhập ghi chú (tùy chọn)"
                    multiline
                    numberOfLines={3}
                  />
                </View>
                
                <TouchableOpacity style={styles.confirmButton} onPress={confirmSettleDebt}>
                  <Text style={styles.confirmButtonText}>Xác nhận thanh toán</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F2F2F7',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#8E8E93',
  },
  header: {
    backgroundColor: '#FFF',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 5,
  },
  headerStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statText: {
    fontSize: 14,
    color: '#8E8E93',
  },
  filterContainer: {
    backgroundColor: '#FFF',
    paddingHorizontal: 20,
    paddingVertical: 15,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F2F2F7',
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderRadius: 10,
    marginBottom: 15,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#000',
  },
  statusFilterContainer: {
    flexDirection: 'row',
  },
  statusFilterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F2F2F7',
    marginRight: 8,
  },
  activeStatusFilter: {
    backgroundColor: '#007AFF',
  },
  statusFilterText: {
    fontSize: 14,
    color: '#8E8E93',
  },
  activeStatusFilterText: {
    color: '#FFF',
    fontWeight: '600',
  },
  debtList: {
    flex: 1,
    paddingHorizontal: 20,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
  },
  emptyText: {
    fontSize: 18,
    color: '#8E8E93',
    marginTop: 10,
  },
  debtCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  debtHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  guestInfo: {
    flex: 1,
  },
  guestName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  guestPhone: {
    fontSize: 14,
    color: '#8E8E93',
    marginTop: 2,
  },
  roomNumber: {
    fontSize: 14,
    color: '#007AFF',
    marginTop: 2,
  },
  statusContainer: {
    alignItems: 'flex-end',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  debtDetails: {
    marginBottom: 12,
  },
  amountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  amountLabel: {
    fontSize: 14,
    color: '#8E8E93',
  },
  amountValue: {
    fontSize: 14,
    color: '#000',
    fontWeight: '500',
  },
  dueDate: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '500',
  },
  notes: {
    fontSize: 14,
    color: '#8E8E93',
    marginTop: 8,
    fontStyle: 'italic',
  },
  labelsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
  },
  labelBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 6,
    marginBottom: 4,
  },
  labelText: {
    fontSize: 12,
    fontWeight: '500',
  },
  debtActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    borderTopWidth: 1,
    borderTopColor: '#E5E5EA',
    paddingTop: 12,
  },
  settleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#34C759',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    marginRight: 10,
  },
  settleButtonText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#FFE5E5',
  },
  deleteButtonText: {
    color: '#FF3B30',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000',
  },
  modalBody: {
    marginBottom: 20,
  },
  debtInfo: {
    backgroundColor: '#F2F2F7',
    padding: 15,
    borderRadius: 10,
    marginBottom: 20,
  },
  debtGuestName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 5,
  },
  debtAmount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  formGroup: {
    marginBottom: 20,
  },
  formLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 8,
  },
  formInput: {
    borderWidth: 1,
    borderColor: '#E5E5EA',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#000',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  paymentMethodContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  paymentMethodButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E5EA',
    backgroundColor: '#FFF',
  },
  activePaymentMethod: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  paymentMethodText: {
    fontSize: 14,
    color: '#8E8E93',
  },
  activePaymentMethodText: {
    color: '#FFF',
    fontWeight: '600',
  },
  confirmButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 16,
    borderRadius: 10,
    alignItems: 'center',
  },
  confirmButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
});