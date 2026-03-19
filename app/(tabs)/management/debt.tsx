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
import { debtsApi, Debt, DebtLabel } from '@/services/api/debts';

interface SettleDebtData {
  amount: number;
  paymentMethod: string;
  notes: string;
}

export default function DebtManagementScreen() {
  const { selectedHotelId, hotels, selectHotel, canSelectMultipleHotels, isLoading: hotelsLoading } = useHotel();
  const { isAdmin, isBusiness, user } = useAuth();
  const [debts, setDebts] = useState<Debt[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [pageIndex, setPageIndex] = useState(1);
  const [pageSize] = useState(20);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [startDateInput, setStartDateInput] = useState('');
  const [endDateInput, setEndDateInput] = useState('');
  const [startDate, setStartDate] = useState<string | null>(null);
  const [endDate, setEndDate] = useState<string | null>(null);
  const [hotelModalVisible, setHotelModalVisible] = useState(false);
  const [settleModalVisible, setSettleModalVisible] = useState(false);
  const [selectedDebt, setSelectedDebt] = useState<Debt | null>(null);
  const [settleData, setSettleData] = useState<SettleDebtData>({
    amount: 0,
    paymentMethod: 'cash',
    notes: '',
  });
  const [labelModalVisible, setLabelModalVisible] = useState(false);
  const [currentLabels, setCurrentLabels] = useState<DebtLabel[]>([]);
  const [newLabelInput, setNewLabelInput] = useState('');
  const [selectedLabelColor, setSelectedLabelColor] = useState('default');
  const [isUpdatingLabels, setIsUpdatingLabels] = useState(false);

  const paymentMethods = [
    { value: 'cash', label: 'Tiền mặt' },
    { value: 'bank_transfer', label: 'Chuyển khoản' },
    { value: 'card', label: 'Thẻ' },
    { value: 'other', label: 'Khác' },
  ];

  const statusOptions = [
    { value: 'all', label: 'Tất cả' },
    { value: 'pending', label: 'Chờ xử lý' },
    { value: 'partial', label: 'Thanh toán một phần' },
    { value: 'settled', label: 'Đã thanh toán' },
    { value: 'cancelled', label: 'Đã hủy' },
  ];

  const labelColors = [
    { value: 'default', label: 'Mặc định', color: '#8E8E93' },
    { value: 'red', label: 'Đỏ', color: '#ef4444' },
    { value: 'orange', label: 'Cam', color: '#f97316' },
    { value: 'gold', label: 'Vàng', color: '#f59e0b' },
    { value: 'green', label: 'Xanh lá', color: '#22c55e' },
    { value: 'blue', label: 'Xanh dương', color: '#3b82f6' },
    { value: 'purple', label: 'Tím', color: '#a855f7' },
    { value: 'cyan', label: 'Cyan', color: '#06b6d4' },
    { value: 'magenta', label: 'Magenta', color: '#d946ef' },
    { value: 'volcano', label: 'Đỏ đậm', color: '#f97316' },
  ];

  const suggestedLabels: DebtLabel[] = [
    { name: 'Quan trọng', color: 'red' },
    { name: 'Cần liên hệ', color: 'orange' },
    { name: 'VIP', color: 'purple' },
    { name: 'Quá hạn', color: 'volcano' },
    { name: 'Đã liên hệ', color: 'blue' },
    { name: 'Chờ xác nhận', color: 'gold' },
  ];

  const loadDebts = useCallback(async () => {
    setLoading(true);
    try {
      const response = await debtsApi.getDebts({
        page: pageIndex,
        pageSize,
        hotelId: selectedHotelId || undefined,
        status: statusFilter !== 'all' ? statusFilter : undefined,
        startDate: startDate ? new Date(startDate).toISOString() : undefined,
        endDate: endDate ? new Date(endDate).toISOString() : undefined,
      });
      setDebts(response.debts);
      setTotal(response.total);
      setTotalPages(response.totalPages || 1);
    } catch {
      Alert.alert('Lỗi', 'Không thể tải danh sách công nợ');
    } finally {
      setLoading(false);
    }
  }, [pageIndex, pageSize, selectedHotelId, statusFilter, startDate, endDate]);

  useEffect(() => {
    if (!selectedHotelId && !isAdmin && !isBusiness) return;
    loadDebts();
  }, [loadDebts, selectedHotelId, isAdmin, isBusiness]);

  const handleSettleDebt = (debt: Debt) => {
    setSelectedDebt(debt);
    setSettleData({
      amount: debt.remainingAmount,
      paymentMethod: 'cash',
      notes: '',
    });
    setSettleModalVisible(true);
  };

  const confirmSettleDebt = async () => {
    if (!selectedDebt) return;
    const amount = Number(settleData.amount) || 0;
    if (amount <= 0) {
      Alert.alert('Lỗi', 'Vui lòng nhập số tiền hợp lệ');
      return;
    }
    if (amount > selectedDebt.remainingAmount) {
      Alert.alert('Lỗi', 'Số tiền vượt quá số dư còn lại');
      return;
    }
    Alert.alert(
      'Xác nhận',
      `Bạn có chắc chắn muốn thanh toán ${formatCurrency(amount)} cho ${selectedDebt.customerName}?`,
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Xác nhận',
          onPress: async () => {
            const updated = await debtsApi.settleDebt(selectedDebt.id, {
              amount,
              paymentMethod: settleData.paymentMethod,
              notes: settleData.notes.trim() || undefined,
            });
            if (updated) {
              setSettleModalVisible(false);
              setSelectedDebt(null);
              loadDebts();
              Alert.alert('Thành công', 'Đã thanh toán công nợ thành công');
            } else {
              Alert.alert('Lỗi', 'Không thể thanh toán công nợ');
            }
          },
        },
      ]
    );
  };

  const handleDeleteDebt = (debt: Debt) => {
    Alert.alert(
      'Xác nhận',
      `Bạn có chắc chắn muốn xóa công nợ của ${debt.customerName}?`,
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Xóa',
          style: 'destructive',
          onPress: async () => {
            const ok = await debtsApi.deleteDebt(debt.id);
            if (ok) {
              loadDebts();
              Alert.alert('Thành công', 'Đã xóa công nợ');
            } else {
              Alert.alert('Lỗi', 'Không thể xóa công nợ');
            }
          },
        },
      ]
    );
  };

  const openLabelModal = (debt: Debt) => {
    setSelectedDebt(debt);
    setCurrentLabels((debt.labels || []).map(label => ({ name: label.name, color: label.color || 'default' })));
    setNewLabelInput('');
    setSelectedLabelColor('default');
    setLabelModalVisible(true);
  };

  const closeLabelModal = () => {
    setLabelModalVisible(false);
    setCurrentLabels([]);
    setNewLabelInput('');
    setSelectedLabelColor('default');
  };

  const addLabel = () => {
    const trimmed = newLabelInput.trim();
    if (!trimmed) return;
    if (!currentLabels.some(l => l.name === trimmed)) {
      setCurrentLabels(prev => [...prev, { name: trimmed, color: selectedLabelColor }]);
    }
    setNewLabelInput('');
  };

  const addSuggestedLabel = (label: DebtLabel) => {
    if (!currentLabels.some(l => l.name === label.name)) {
      setCurrentLabels(prev => [...prev, label]);
    }
  };

  const updateLabelColor = (label: DebtLabel, color: string) => {
    setCurrentLabels(prev => prev.map(l => (l.name === label.name ? { ...l, color } : l)));
  };

  const removeLabel = (label: DebtLabel) => {
    setCurrentLabels(prev => prev.filter(l => l.name !== label.name));
  };

  const saveLabels = async () => {
    if (!selectedDebt) return;
    setIsUpdatingLabels(true);
    const updated = await debtsApi.updateLabels(selectedDebt.id, currentLabels);
    setIsUpdatingLabels(false);
    if (updated) {
      closeLabelModal();
      loadDebts();
      Alert.alert('Thành công', 'Đã cập nhật nhãn công nợ');
    } else {
      Alert.alert('Lỗi', 'Không thể cập nhật nhãn');
    }
  };

  const applyDateRange = () => {
    const start = startDateInput.trim();
    const end = endDateInput.trim();
    setStartDate(start || null);
    setEndDate(end || null);
    setPageIndex(1);
  };

  const canDelete = (debt: Debt) => {
    return (isAdmin || isBusiness) && debt.paidAmount === 0;
  };

  const canSettle = (debt: Debt) => {
    if (user?.role === 'staff' || user?.role === 'guest') return false;
    return debt.status !== 'settled' && debt.status !== 'cancelled';
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return '-';
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return '-';
    return d.toLocaleDateString('vi-VN');
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return '#f97316';
      case 'partial': return '#f59e0b';
      case 'settled': return '#22c55e';
      case 'cancelled': return '#9ca3af';
      default: return '#8E8E93';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending': return 'Chờ xử lý';
      case 'partial': return 'Thanh toán một phần';
      case 'settled': return 'Đã thanh toán';
      case 'cancelled': return 'Đã hủy';
      default: return 'Không xác định';
    }
  };

  const getLabelColorValue = (color?: string) => {
    const found = labelColors.find(item => item.value === color);
    return found?.color || '#8E8E93';
  };

  const isOverdue = (debt: Debt) => {
    if (!debt.dueDate) return false;
    const due = new Date(debt.dueDate);
    if (isNaN(due.getTime())) return false;
    due.setHours(0, 0, 0, 0);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return due.getTime() < today.getTime() && debt.remainingAmount > 0;
  };

  const filteredDebts = useMemo(() => {
    const keyword = searchQuery.trim().toLowerCase();
    return debts.filter(debt => {
      const matchesSearch =
        !keyword ||
        debt.customerName.toLowerCase().includes(keyword) ||
        debt.customerPhone?.toLowerCase().includes(keyword) ||
        debt.invoiceNumber?.toLowerCase().includes(keyword) ||
        debt.roomNumber?.toLowerCase().includes(keyword);
      const matchesStatus = statusFilter === 'all' || debt.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [debts, searchQuery, statusFilter]);

  const debtStats = useMemo(() => {
    return filteredDebts.reduce((acc, debt) => {
      const debtAmount = Number(debt.debtAmount) || 0;
      const paidAmount = Number(debt.paidAmount) || 0;
      const remainingAmount = Number(debt.remainingAmount) || 0;
      acc.totalDebt += debtAmount;
      acc.totalPaid += paidAmount;
      acc.totalRemaining += remainingAmount;
      if (isOverdue(debt)) {
        acc.overdueCount += 1;
      }
      return acc;
    }, {
      totalDebt: 0,
      totalPaid: 0,
      totalRemaining: 0,
      overdueCount: 0
    });
  }, [filteredDebts]);

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
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Quản Lý Công Nợ</Text>
        <View style={styles.headerStats}>
          <Text style={styles.statText}>Hiển thị {filteredDebts.length}/{total} công nợ</Text>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statCardLabel}>Tổng công nợ</Text>
            <Text style={styles.statCardValue}>{formatCurrency(debtStats.totalDebt)}</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statCardLabel}>Đã thanh toán</Text>
            <Text style={[styles.statCardValue, styles.successValue]}>{formatCurrency(debtStats.totalPaid)}</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statCardLabel}>Còn phải thu</Text>
            <Text style={[styles.statCardValue, styles.warningValue]}>{formatCurrency(debtStats.totalRemaining)}</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statCardLabel}>Quá hạn</Text>
            <Text style={[styles.statCardValue, styles.dangerValue]}>{debtStats.overdueCount}</Text>
          </View>
        </ScrollView>
      </View>

      <View style={styles.filterContainer}>
        <View style={styles.filterCard}>
          {canSelectMultipleHotels && (
            <TouchableOpacity style={styles.hotelSelector} onPress={() => setHotelModalVisible(true)}>
              <Ionicons name="business-outline" size={18} color="#007AFF" />
              <Text style={styles.hotelSelectorText}>
                {selectedHotelId
                  ? hotels.find(hotel => hotel.id === selectedHotelId)?.name || 'Chọn khách sạn'
                  : 'Chọn khách sạn'}
              </Text>
              <Ionicons name="chevron-down" size={18} color="#007AFF" />
            </TouchableOpacity>
          )}

          <View style={styles.searchContainer}>
            <Ionicons name="search" size={20} color="#8E8E93" style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Tìm theo tên, SĐT, số phòng, hóa đơn..."
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>

          <View style={styles.dateRangeRow}>
            <TextInput
              style={styles.dateInput}
              placeholder="Từ ngày (YYYY-MM-DD)"
              value={startDateInput}
              onChangeText={setStartDateInput}
              autoCapitalize="none"
            />
            <TextInput
              style={styles.dateInput}
              placeholder="Đến ngày (YYYY-MM-DD)"
              value={endDateInput}
              onChangeText={setEndDateInput}
              autoCapitalize="none"
            />
            <TouchableOpacity style={styles.applyDateButton} onPress={applyDateRange}>
              <Text style={styles.applyDateText}>Lọc</Text>
            </TouchableOpacity>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.statusFilterContainer}
            contentContainerStyle={styles.statusFilterContent}
          >
            {statusOptions.map((option) => (
              <TouchableOpacity
                key={option.value}
                style={[
                  styles.statusFilterButton,
                  statusFilter === option.value && styles.activeStatusFilter
                ]}
                onPress={() => {
                  setStatusFilter(option.value);
                  setPageIndex(1);
                }}
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
      </View>

      <ScrollView style={styles.debtList} contentContainerStyle={styles.debtListContent}>
        {filteredDebts.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="wallet-outline" size={64} color="#C7C7CC" />
            <Text style={styles.emptyText}>Không có công nợ nào</Text>
            <Text style={styles.emptySubText}>Thử thay đổi bộ lọc hoặc khoảng thời gian</Text>
          </View>
        ) : (
          filteredDebts.map((debt) => (
            <View key={debt.id} style={styles.debtCard}>
              <View style={styles.debtHeader}>
                <View style={styles.guestInfo}>
                  <Text style={styles.guestName}>{debt.customerName}</Text>
                  {debt.customerPhone ? <Text style={styles.guestPhone}>{debt.customerPhone}</Text> : null}
                  {debt.roomNumber && (
                    <Text style={styles.roomNumber}>Phòng {debt.roomNumber}</Text>
                  )}
                  {debt.invoiceNumber ? (
                    <Text style={styles.invoiceNumber}>Hóa đơn #{debt.invoiceNumber}</Text>
                  ) : null}
                </View>
                <View style={styles.statusContainer}>
                  <View style={[styles.statusBadge, { backgroundColor: getStatusColor(debt.status) + '20' }]}>
                    <Text style={[styles.statusText, { color: getStatusColor(debt.status) }]}>
                      {getStatusText(debt.status)}
                    </Text>
                  </View>
                  {isOverdue(debt) ? (
                    <View style={styles.overdueBadge}>
                      <Text style={styles.overdueText}>Quá hạn</Text>
                    </View>
                  ) : null}
                </View>
              </View>

              <View style={styles.remainingHighlight}>
                <Text style={styles.remainingLabel}>Còn lại cần thu</Text>
                <Text style={[
                  styles.remainingValue,
                  isOverdue(debt) ? styles.remainingDanger : styles.remainingNormal
                ]}>
                  {formatCurrency(debt.remainingAmount)}
                </Text>
              </View>

              <View style={styles.debtDetails}>
                <View style={styles.amountRow}>
                  <Text style={styles.amountLabel}>Tổng công nợ:</Text>
                  <Text style={styles.amountValue}>{formatCurrency(debt.debtAmount)}</Text>
                </View>
                <View style={styles.amountRow}>
                  <Text style={styles.amountLabel}>Đã thanh toán:</Text>
                  <Text style={styles.amountValue}>{formatCurrency(debt.paidAmount)}</Text>
                </View>
                <View style={styles.amountRow}>
                  <Text style={styles.amountLabel}>Còn lại:</Text>
                  <Text style={styles.amountValue}>{formatCurrency(debt.remainingAmount)}</Text>
                </View>
                <View style={styles.amountRow}>
                  <Text style={styles.amountLabel}>Ngày công nợ:</Text>
                  <Text style={styles.dueDate}>{formatDate(debt.debtDate || '')}</Text>
                </View>
                {debt.dueDate ? (
                  <View style={styles.amountRow}>
                    <Text style={styles.amountLabel}>Hạn thanh toán:</Text>
                    <Text style={styles.dueDate}>{formatDate(debt.dueDate)}</Text>
                  </View>
                ) : null}
                {debt.notes && (
                  <Text style={styles.notes}>{debt.notes}</Text>
                )}
                
                {debt.labels && debt.labels.length > 0 && (
                  <View style={styles.labelsContainer}>
                    {debt.labels.map((label, index) => (
                      <View key={index} style={[styles.labelBadge, { backgroundColor: getLabelColorValue(label.color) + '30' }]}>
                        <Text style={[styles.labelText, { color: getLabelColorValue(label.color) }]}>
                          {label.name}
                        </Text>
                      </View>
                    ))}
                  </View>
                )}
              </View>
              
              <View style={styles.debtActions}>
                {canSettle(debt) && (
                  <TouchableOpacity
                    style={styles.settleButton}
                    onPress={() => handleSettleDebt(debt)}
                  >
                    <Ionicons name="checkmark-circle-outline" size={18} color="#FFF" />
                    <Text style={styles.settleButtonText}>Thanh toán</Text>
                  </TouchableOpacity>
                )}

                <TouchableOpacity
                  style={styles.labelButton}
                  onPress={() => openLabelModal(debt)}
                >
                  <Ionicons name="pricetags-outline" size={18} color="#007AFF" />
                  <Text style={styles.labelButtonText}>Nhãn</Text>
                </TouchableOpacity>

                {canDelete(debt) && (
                  <TouchableOpacity
                    style={styles.deleteButton}
                    onPress={() => handleDeleteDebt(debt)}
                  >
                    <Ionicons name="trash-outline" size={18} color="#FF3B30" />
                    <Text style={styles.deleteButtonText}>Xóa</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          ))
        )}
      </ScrollView>

      {totalPages > 1 && (
        <View style={styles.paginationContainer}>
          <TouchableOpacity
            style={[styles.paginationButton, pageIndex <= 1 && styles.paginationButtonDisabled]}
            onPress={() => setPageIndex(prev => Math.max(1, prev - 1))}
            disabled={pageIndex <= 1}
          >
            <Text style={styles.paginationButtonText}>Trước</Text>
          </TouchableOpacity>
          <Text style={styles.paginationText}>Trang {pageIndex}/{totalPages}</Text>
          <TouchableOpacity
            style={[styles.paginationButton, pageIndex >= totalPages && styles.paginationButtonDisabled]}
            onPress={() => setPageIndex(prev => Math.min(totalPages, prev + 1))}
            disabled={pageIndex >= totalPages}
          >
            <Text style={styles.paginationButtonText}>Tiếp</Text>
          </TouchableOpacity>
        </View>
      )}

      <Modal
        visible={hotelModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setHotelModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Chọn Khách Sạn</Text>
              <TouchableOpacity onPress={() => setHotelModalVisible(false)}>
                <Ionicons name="close" size={24} color="#8E8E93" />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalBody}>
              {hotelsLoading ? (
                <View style={styles.loadingSmall}>
                  <ActivityIndicator size="small" color="#007AFF" />
                  <Text style={styles.loadingText}>Đang tải khách sạn...</Text>
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
                      setPageIndex(1);
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

      <Modal
        visible={labelModalVisible}
        transparent
        animationType="slide"
        onRequestClose={closeLabelModal}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContentLarge}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Nhãn Công Nợ</Text>
              <TouchableOpacity onPress={closeLabelModal}>
                <Ionicons name="close" size={24} color="#8E8E93" />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalBody}>
              {selectedDebt && (
                <Text style={styles.modalSubtitle}>{selectedDebt.customerName}</Text>
              )}

              <Text style={styles.sectionTitle}>Nhãn hiện tại</Text>
              {currentLabels.length === 0 ? (
                <Text style={styles.emptyLabelText}>Chưa có nhãn</Text>
              ) : (
                currentLabels.map((label) => (
                  <View key={label.name} style={styles.labelEditor}>
                    <View style={styles.labelRow}>
                      <View style={[styles.labelBadge, { backgroundColor: getLabelColorValue(label.color) + '30' }]}>
                        <Text style={[styles.labelText, { color: getLabelColorValue(label.color) }]}>
                          {label.name}
                        </Text>
                      </View>
                      <TouchableOpacity onPress={() => removeLabel(label)} style={styles.labelRemoveButton}>
                        <Ionicons name="close-circle" size={20} color="#FF3B30" />
                      </TouchableOpacity>
                    </View>
                    <View style={styles.colorPickerRow}>
                      {labelColors.map(color => (
                        <TouchableOpacity
                          key={color.value}
                          style={[
                            styles.colorOption,
                            label.color === color.value && styles.colorOptionSelected
                          ]}
                          onPress={() => updateLabelColor(label, color.value)}
                        >
                          <View style={[styles.colorOptionInner, { backgroundColor: color.color }]} />
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                ))
              )}

              <Text style={styles.sectionTitle}>Thêm nhãn mới</Text>
              <View style={styles.addLabelRow}>
                <TextInput
                  style={styles.addLabelInput}
                  placeholder="Tên nhãn"
                  value={newLabelInput}
                  onChangeText={setNewLabelInput}
                />
                <TouchableOpacity style={styles.addLabelButton} onPress={addLabel}>
                  <Text style={styles.addLabelButtonText}>Thêm</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.colorPickerRow}>
                {labelColors.map(color => (
                  <TouchableOpacity
                    key={color.value}
                    style={[
                      styles.colorOption,
                      selectedLabelColor === color.value && styles.colorOptionSelected
                    ]}
                    onPress={() => setSelectedLabelColor(color.value)}
                  >
                    <View style={[styles.colorOptionInner, { backgroundColor: color.color }]} />
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.sectionTitle}>Gợi ý</Text>
              <View style={styles.suggestedLabelContainer}>
                {suggestedLabels.map(label => (
                  <TouchableOpacity
                    key={label.name}
                    style={[styles.suggestedLabelButton, { borderColor: getLabelColorValue(label.color) }]}
                    onPress={() => addSuggestedLabel(label)}
                  >
                    <Text style={[styles.suggestedLabelText, { color: getLabelColorValue(label.color) }]}>
                      {label.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
            <TouchableOpacity
              style={[styles.confirmButton, isUpdatingLabels && styles.confirmButtonDisabled]}
              onPress={saveLabels}
              disabled={isUpdatingLabels}
            >
              <Text style={styles.confirmButtonText}>Lưu nhãn</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

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
                  <Text style={styles.debtGuestName}>{selectedDebt.customerName}</Text>
                  <Text style={styles.debtAmount}>Còn lại: {formatCurrency(selectedDebt.remainingAmount)}</Text>
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
    paddingTop: 10,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 4,
  },
  headerStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  statText: {
    fontSize: 14,
    color: '#8E8E93',
  },
  statsRow: {
    gap: 10,
    paddingRight: 8,
  },
  statCard: {
    minWidth: 150,
    borderRadius: 12,
    backgroundColor: '#F7F9FC',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#E9EEF5',
  },
  statCardLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 6,
  },
  statCardValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  successValue: {
    color: '#16a34a',
  },
  warningValue: {
    color: '#d97706',
  },
  dangerValue: {
    color: '#dc2626',
  },
  filterContainer: {
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  filterCard: {
    backgroundColor: '#FFF',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: '#E5EAF1',
  },
  hotelSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F2F2F7',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderRadius: 10,
    marginBottom: 12,
  },
  hotelSelectorText: {
    marginLeft: 8,
    marginRight: 'auto',
    fontSize: 15,
    color: '#007AFF',
    fontWeight: '600',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F2F2F7',
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderRadius: 10,
    marginBottom: 12,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#000',
  },
  dateRangeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  dateInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#E5E5EA',
    borderRadius: 8,
    padding: 10,
    fontSize: 14,
    color: '#000',
    backgroundColor: '#FFF',
  },
  applyDateButton: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#007AFF',
  },
  applyDateText: {
    color: '#FFF',
    fontWeight: '600',
  },
  statusFilterContainer: {
    flexDirection: 'row',
  },
  statusFilterContent: {
    paddingRight: 8,
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
  debtListContent: {
    paddingTop: 12,
    paddingBottom: 16,
  },
  paginationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#FFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E5EA',
  },
  paginationButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#007AFF',
  },
  paginationButtonDisabled: {
    backgroundColor: '#C7C7CC',
  },
  paginationButtonText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
  },
  paginationText: {
    fontSize: 14,
    color: '#8E8E93',
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
  emptySubText: {
    marginTop: 6,
    fontSize: 14,
    color: '#9CA3AF',
  },
  debtCard: {
    backgroundColor: '#FFF',
    borderRadius: 14,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#EAEFF5',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 5,
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
  invoiceNumber: {
    fontSize: 13,
    color: '#8E8E93',
    marginTop: 2,
  },
  statusContainer: {
    alignItems: 'flex-end',
    gap: 6,
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
  overdueBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    backgroundColor: '#FEE2E2',
  },
  overdueText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#DC2626',
  },
  remainingHighlight: {
    borderRadius: 10,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E6EDF5',
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  remainingLabel: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '600',
  },
  remainingValue: {
    fontSize: 17,
    fontWeight: '700',
  },
  remainingDanger: {
    color: '#DC2626',
  },
  remainingNormal: {
    color: '#1D4ED8',
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
    flexWrap: 'wrap',
    gap: 8,
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
    minWidth: 100,
    justifyContent: 'center',
  },
  settleButtonText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
  labelButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#EAF4FF',
    minWidth: 84,
    justifyContent: 'center',
  },
  labelButtonText: {
    color: '#007AFF',
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
    minWidth: 72,
    justifyContent: 'center',
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
  modalContentLarge: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 20,
    maxHeight: '90%',
  },
  hotelOption: {
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: '#F2F2F7',
    marginBottom: 8,
  },
  hotelOptionSelected: {
    backgroundColor: '#007AFF',
  },
  hotelOptionText: {
    fontSize: 16,
    color: '#000',
  },
  hotelOptionTextSelected: {
    color: '#FFF',
    fontWeight: '600',
  },
  loadingSmall: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
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
  modalSubtitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#000',
    marginTop: 10,
    marginBottom: 8,
  },
  emptyLabelText: {
    fontSize: 14,
    color: '#8E8E93',
    marginBottom: 8,
  },
  labelEditor: {
    marginBottom: 12,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  labelRemoveButton: {
    padding: 4,
  },
  colorPickerRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  colorOption: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E5E5EA',
    alignItems: 'center',
    justifyContent: 'center',
  },
  colorOptionSelected: {
    borderColor: '#007AFF',
    borderWidth: 2,
  },
  colorOptionInner: {
    width: 18,
    height: 18,
    borderRadius: 9,
  },
  addLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  addLabelInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#E5E5EA',
    borderRadius: 8,
    padding: 10,
    fontSize: 14,
    color: '#000',
  },
  addLabelButton: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#007AFF',
  },
  addLabelButtonText: {
    color: '#FFF',
    fontWeight: '600',
  },
  suggestedLabelContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  suggestedLabelButton: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  suggestedLabelText: {
    fontSize: 12,
    fontWeight: '600',
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
  confirmButtonDisabled: {
    opacity: 0.6,
  },
  confirmButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
