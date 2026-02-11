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
import { shiftHandoverApi, staffsApi } from '@/services/api';
import { ShiftHandover, ShiftHandoverHistoryResponse } from '@/types/hotel';
import { useHotel } from '@/contexts/HotelContext';
import { useAuth } from '@/contexts/AuthContext';
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

  const filteredStaffs = useMemo(() => {
    const keyword = staffSearch.trim().toLowerCase();
    return staffs.filter(staff => {
      if (fromStaff?.id && staff.id === fromStaff.id) return false;
      if (!keyword) return true;
      return (
        staff.name.toLowerCase().includes(keyword) ||
        staff.email.toLowerCase().includes(keyword) ||
        staff.phone.toLowerCase().includes(keyword)
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
  };

  const isLoading = staffsLoading || previousLoading || revenueLoading || historyLoading;

  const historyItems = historyData?.data || [];
  const totalPages = historyData?.pagination?.totalPages || 1;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Quản Lý Giao Ca</Text>
          <Text style={styles.headerSubtitle}>Theo dõi và bàn giao ca làm việc</Text>
        </View>
        <TouchableOpacity style={styles.refreshButton} onPress={handleRefresh}>
          <Ionicons name="refresh" size={18} color="#FFF" />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={handleRefresh} />}
      >
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Tóm tắt ca</Text>
          <View style={styles.summaryGrid}>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryLabel}>Tiền ca trước</Text>
              <Text style={styles.summaryValue}>
                {formatCurrency(previousShiftData?.previousShiftAmount || 0)}
              </Text>
              <Text style={styles.summarySubtext}>
                {previousShiftData?.lastShiftHandover?.handoverTime
                  ? formatDateTime(previousShiftData.lastShiftHandover.handoverTime)
                  : 'Chưa có dữ liệu'}
              </Text>
            </View>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryLabel}>Doanh thu tổng</Text>
              <Text style={styles.summaryValue}>
                {formatCurrency(revenueData?.totalRevenue || 0)}
              </Text>
              <Text style={styles.summarySubtext}>
                Thực thu: {formatCurrency(revenueData?.netRevenue || 0)}
              </Text>
            </View>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryLabel}>Tiền mặt</Text>
              <Text style={styles.summaryValue}>
                {formatCurrency(revenueData?.cashTotal || 0)}
              </Text>
              <Text style={styles.summarySubtext}>
                Chi: {formatCurrency(revenueData?.expenseTotal || 0)}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Thông tin giao ca</Text>
          <View style={styles.formRow}>
            <Text style={styles.formLabel}>Nhân viên giao ca</Text>
            <View style={styles.readonlyBox}>
              <Text style={styles.readonlyText}>
                {fromStaff?.name || user?.name || 'Chưa xác định'}
              </Text>
            </View>
          </View>

          <View style={styles.formRow}>
            <Text style={styles.formLabel}>Nhân viên nhận ca</Text>
            <TouchableOpacity
              style={styles.selectBox}
              onPress={() => setStaffModalVisible(true)}
            >
              <Text style={styles.selectText}>
                {selectedToStaff?.name || 'Chọn nhân viên'}
              </Text>
              <Ionicons name="chevron-down" size={18} color="#7F8C8D" />
            </TouchableOpacity>
          </View>

          <View style={styles.formRow}>
            <Text style={styles.formLabel}>Mật khẩu người nhận</Text>
            <TextInput
              style={styles.input}
              placeholder="Nhập mật khẩu xác nhận"
              secureTextEntry
              value={toUserPassword}
              onChangeText={setToUserPassword}
            />
          </View>

          <View style={styles.formRow}>
            <Text style={styles.formLabel}>Tiền ca trước</Text>
            <TextInput
              style={styles.input}
              keyboardType="numeric"
              value={previousShiftAmount}
              onChangeText={(value) => {
                setHasTouchedPrevious(true);
                setPreviousShiftAmount(value);
              }}
              placeholder="0"
            />
          </View>

          <View style={styles.formRow}>
            <Text style={styles.formLabel}>Tiền mặt trong ca</Text>
            <TextInput
              style={styles.input}
              keyboardType="numeric"
              value={cashInShift}
              onChangeText={setCashInShift}
              placeholder="0"
            />
          </View>

          <View style={styles.formRow}>
            <Text style={styles.formLabel}>Tiền giao quản lý</Text>
            <TextInput
              style={styles.input}
              keyboardType="numeric"
              value={managerHandoverAmount}
              onChangeText={setManagerHandoverAmount}
              placeholder="0"
            />
          </View>

          <View style={styles.formRow}>
            <Text style={styles.formLabel}>Tiền mặt thu</Text>
            <TextInput
              style={styles.input}
              keyboardType="numeric"
              value={cashAmount}
              onChangeText={setCashAmount}
              placeholder="0"
            />
          </View>

          <View style={styles.formRow}>
            <Text style={styles.formLabel}>Chuyển khoản</Text>
            <TextInput
              style={styles.input}
              keyboardType="numeric"
              value={bankTransferAmount}
              onChangeText={setBankTransferAmount}
              placeholder="0"
            />
          </View>

          <View style={styles.formRow}>
            <Text style={styles.formLabel}>Cà thẻ</Text>
            <TextInput
              style={styles.input}
              keyboardType="numeric"
              value={cardPaymentAmount}
              onChangeText={setCardPaymentAmount}
              placeholder="0"
            />
          </View>

          <View style={styles.formRow}>
            <Text style={styles.formLabel}>Phiếu chi</Text>
            <TextInput
              style={styles.input}
              keyboardType="numeric"
              value={expenseAmount}
              onChangeText={setExpenseAmount}
              placeholder="0"
            />
          </View>

          <View style={styles.formRow}>
            <Text style={styles.formLabel}>Phiếu thu</Text>
            <TextInput
              style={styles.input}
              keyboardType="numeric"
              value={incomeAmount}
              onChangeText={setIncomeAmount}
              placeholder="0"
            />
          </View>

          <View style={styles.formRow}>
            <Text style={styles.formLabel}>Ghi chú</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              multiline
              value={notes}
              onChangeText={setNotes}
              placeholder="Ghi chú giao ca"
            />
          </View>

          <View style={styles.summaryFooter}>
            <View>
              <Text style={styles.summaryLabel}>Số tiền giao ca</Text>
              <Text style={styles.summaryValue}>{formatCurrency(handoverAmount)}</Text>
            </View>
            <TouchableOpacity
              style={[styles.submitButton, createMutation.isPending && styles.buttonDisabled]}
              onPress={handleSubmit}
              disabled={createMutation.isPending}
            >
              {createMutation.isPending ? (
                <ActivityIndicator size="small" color="#FFF" />
              ) : (
                <>
                  <Ionicons name="checkmark-circle" size={18} color="#FFF" />
                  <Text style={styles.submitButtonText}>Xác nhận giao ca</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Giao tiền quản lý</Text>
          <View style={styles.formRow}>
            <Text style={styles.formLabel}>Tài khoản quản lý</Text>
            <TextInput
              style={styles.input}
              value={managerUsername}
              onChangeText={setManagerUsername}
              placeholder="Email hoặc username"
            />
          </View>
          <View style={styles.formRow}>
            <Text style={styles.formLabel}>Mật khẩu quản lý</Text>
            <TextInput
              style={styles.input}
              secureTextEntry
              value={managerPassword}
              onChangeText={setManagerPassword}
              placeholder="Nhập mật khẩu"
            />
          </View>
          <View style={styles.formRow}>
            <Text style={styles.formLabel}>Số tiền giao</Text>
            <TextInput
              style={styles.input}
              keyboardType="numeric"
              value={managerAmount}
              onChangeText={setManagerAmount}
              placeholder="0"
            />
          </View>
          <View style={styles.formRow}>
            <Text style={styles.formLabel}>Ghi chú</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              multiline
              value={managerNotes}
              onChangeText={setManagerNotes}
              placeholder="Ghi chú giao tiền"
            />
          </View>
          <TouchableOpacity
            style={[styles.managerButton, managerMutation.isPending && styles.buttonDisabled]}
            onPress={handleManagerHandover}
            disabled={managerMutation.isPending}
          >
            {managerMutation.isPending ? (
              <ActivityIndicator size="small" color="#FFF" />
            ) : (
              <>
                <Ionicons name="cash-outline" size={18} color="#FFF" />
                <Text style={styles.submitButtonText}>Giao tiền quản lý</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Lịch sử giao ca</Text>
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
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  statusText: {
    color: '#FFF',
    fontSize: 11,
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
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 16,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2C3E50',
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
});
