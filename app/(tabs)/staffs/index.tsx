import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Modal,
  TextInput,
  Alert,
  Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Users,
  Plus,
  Search,
  Phone,
  Mail,
  Calendar,
  DollarSign,
  Clock,
  X,
  ChevronRight,
  Briefcase,
} from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Colors from '@/constants/colors';
import { useHotel } from '@/contexts/HotelContext';
import { staffsApi } from '@/services/api';
import { Staff } from '@/types/hotel';

const STATUS_COLORS: Record<string, string> = {
  active: '#10b981',
  inactive: '#ef4444',
  on_leave: '#f59e0b',
};

const STATUS_LABELS: Record<string, string> = {
  active: 'Đang làm',
  inactive: 'Nghỉ việc',
  on_leave: 'Nghỉ phép',
};

const DEPARTMENTS = [
  { id: 'all', name: 'Tất cả' },
  { id: 'management', name: 'Quản lý' },
  { id: 'reception', name: 'Lễ tân' },
  { id: 'housekeeping', name: 'Buồng phòng' },
  { id: 'kitchen', name: 'Bếp' },
  { id: 'security', name: 'Bảo vệ' },
];

export default function StaffsScreen() {
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const { selectedHotelId } = useHotel();
  const [activeTab, setActiveTab] = useState<'staffs' | 'salary'>('staffs');
  const [selectedDepartment, setSelectedDepartment] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [staffModalVisible, setStaffModalVisible] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState<Staff | null>(null);

  const { data: staffs = [], isLoading: staffsLoading, refetch: refetchStaffs } = useQuery({
    queryKey: ['staffs', selectedHotelId],
    queryFn: () => staffsApi.getAll(selectedHotelId || undefined),
  });

  const { data: salaryRecords = [], isLoading: salaryLoading, refetch: refetchSalary } = useQuery({
    queryKey: ['salaryRecords'],
    queryFn: () => staffsApi.getSalaryRecords(),
  });

  const paySalaryMutation = useMutation({
    mutationFn: ({ staffId, recordId }: { staffId: string; recordId: string }) =>
      staffsApi.paySalary(staffId, recordId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['salaryRecords'] });
      Alert.alert('Thành công', 'Đã thanh toán lương thành công');
    },
  });

  const isLoading = staffsLoading || salaryLoading;

  const filteredStaffs = staffs.filter(staff => {
    const matchesDepartment = selectedDepartment === 'all' || staff.department === selectedDepartment;
    const matchesSearch = staff.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      staff.position.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesDepartment && matchesSearch;
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const handleRefresh = async () => {
    await Promise.all([refetchStaffs(), refetchSalary()]);
  };

  const handlePaySalary = (staffId: string, recordId: string) => {
    Alert.alert(
      'Xác nhận thanh toán',
      'Bạn có chắc muốn thanh toán lương cho nhân viên này?',
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Thanh toán',
          onPress: () => paySalaryMutation.mutate({ staffId, recordId }),
        },
      ]
    );
  };

  const activeStaffs = staffs.filter(s => s.status === 'active').length;
  const onLeaveStaffs = staffs.filter(s => s.status === 'on_leave').length;
  const totalSalary = staffs.reduce((sum, s) => sum + s.salary, 0);

  const pendingSalaryRecords = salaryRecords.filter(r => r.status === 'pending');

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#0369a1', '#0ea5e9']}
        style={[styles.header, { paddingTop: insets.top + 12 }]}
      >
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Nhân viên</Text>
          <TouchableOpacity style={styles.addButton}>
            <Plus size={20} color="#fff" />
          </TouchableOpacity>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{staffs.length}</Text>
            <Text style={styles.statLabel}>Tổng số</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{activeStaffs}</Text>
            <Text style={styles.statLabel}>Đang làm</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{onLeaveStaffs}</Text>
            <Text style={styles.statLabel}>Nghỉ phép</Text>
          </View>
        </View>

        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'staffs' && styles.tabActive]}
            onPress={() => setActiveTab('staffs')}
          >
            <Text style={[styles.tabText, activeTab === 'staffs' && styles.tabTextActive]}>
              Danh sách
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'salary' && styles.tabActive]}
            onPress={() => setActiveTab('salary')}
          >
            <Text style={[styles.tabText, activeTab === 'salary' && styles.tabTextActive]}>
              Lương
            </Text>
            {pendingSalaryRecords.length > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{pendingSalaryRecords.length}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 }}
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={handleRefresh} />
        }
      >
        {activeTab === 'staffs' ? (
          <>
            <View style={styles.searchContainer}>
              <View style={styles.searchBox}>
                <Search size={18} color={Colors.light.textSecondary} />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Tìm kiếm nhân viên..."
                  placeholderTextColor={Colors.light.textSecondary}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                />
              </View>
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.departmentsContainer}
              contentContainerStyle={styles.departmentsContent}
            >
              {DEPARTMENTS.map(dept => (
                <TouchableOpacity
                  key={dept.id}
                  style={[
                    styles.departmentChip,
                    selectedDepartment === dept.id && styles.departmentChipActive,
                  ]}
                  onPress={() => setSelectedDepartment(dept.id)}
                >
                  <Text
                    style={[
                      styles.departmentChipText,
                      selectedDepartment === dept.id && styles.departmentChipTextActive,
                    ]}
                  >
                    {dept.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <View style={styles.staffsList}>
              {filteredStaffs.map(staff => (
                <TouchableOpacity
                  key={staff.id}
                  style={styles.staffCard}
                  onPress={() => {
                    setSelectedStaff(staff);
                    setStaffModalVisible(true);
                  }}
                >
                  <View style={styles.staffAvatar}>
                    {staff.avatar ? (
                      <Image source={{ uri: staff.avatar }} style={styles.avatarImage} />
                    ) : (
                      <View style={styles.avatarPlaceholder}>
                        <Text style={styles.avatarText}>
                          {staff.name.split(' ').pop()?.charAt(0) || 'N'}
                        </Text>
                      </View>
                    )}
                    <View
                      style={[
                        styles.statusIndicator,
                        { backgroundColor: STATUS_COLORS[staff.status] },
                      ]}
                    />
                  </View>

                  <View style={styles.staffInfo}>
                    <Text style={styles.staffName}>{staff.name}</Text>
                    <Text style={styles.staffPosition}>{staff.position}</Text>
                    <View style={styles.staffMeta}>
                      <View style={styles.metaItem}>
                        <Phone size={12} color={Colors.light.textSecondary} />
                        <Text style={styles.metaText}>{staff.phone}</Text>
                      </View>
                    </View>
                  </View>

                  <ChevronRight size={20} color={Colors.light.textSecondary} />
                </TouchableOpacity>
              ))}
            </View>

            {filteredStaffs.length === 0 && !isLoading && (
              <View style={styles.emptyState}>
                <Users size={48} color={Colors.light.textSecondary} />
                <Text style={styles.emptyText}>Không tìm thấy nhân viên</Text>
              </View>
            )}
          </>
        ) : (
          <View style={styles.salaryContainer}>
            <View style={styles.salaryOverview}>
              <View style={styles.salaryOverviewCard}>
                <DollarSign size={24} color="#0ea5e9" />
                <Text style={styles.salaryOverviewLabel}>Tổng quỹ lương</Text>
                <Text style={styles.salaryOverviewValue}>{formatCurrency(totalSalary)}</Text>
              </View>
            </View>

            <Text style={styles.sectionTitle}>Chờ thanh toán</Text>
            {pendingSalaryRecords.map(record => (
              <View key={record.id} style={styles.salaryCard}>
                <View style={styles.salaryHeader}>
                  <View>
                    <Text style={styles.salaryStaffName}>{record.staffName}</Text>
                    <Text style={styles.salaryMonth}>Tháng {record.month}</Text>
                  </View>
                  <View style={styles.salaryBadge}>
                    <Clock size={12} color="#f59e0b" />
                    <Text style={styles.salaryBadgeText}>Chờ thanh toán</Text>
                  </View>
                </View>

                <View style={styles.salaryDetails}>
                  <View style={styles.salaryRow}>
                    <Text style={styles.salaryLabel}>Lương cơ bản</Text>
                    <Text style={styles.salaryValue}>{formatCurrency(record.baseSalary)}</Text>
                  </View>
                  <View style={styles.salaryRow}>
                    <Text style={styles.salaryLabel}>Thưởng</Text>
                    <Text style={[styles.salaryValue, { color: '#10b981' }]}>
                      +{formatCurrency(record.bonus)}
                    </Text>
                  </View>
                  <View style={styles.salaryRow}>
                    <Text style={styles.salaryLabel}>Khấu trừ</Text>
                    <Text style={[styles.salaryValue, { color: '#ef4444' }]}>
                      -{formatCurrency(record.deductions)}
                    </Text>
                  </View>
                  <View style={[styles.salaryRow, styles.salaryTotal]}>
                    <Text style={styles.salaryTotalLabel}>Thực lãnh</Text>
                    <Text style={styles.salaryTotalValue}>{formatCurrency(record.netSalary)}</Text>
                  </View>
                </View>

                <TouchableOpacity
                  style={styles.payButton}
                  onPress={() => handlePaySalary(record.staffId, record.id)}
                >
                  <Text style={styles.payButtonText}>Thanh toán</Text>
                </TouchableOpacity>
              </View>
            ))}

            {pendingSalaryRecords.length === 0 && !isLoading && (
              <View style={styles.emptyState}>
                <DollarSign size={48} color={Colors.light.textSecondary} />
                <Text style={styles.emptyText}>Không có lương chờ thanh toán</Text>
              </View>
            )}
          </View>
        )}
      </ScrollView>

      <Modal
        visible={staffModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setStaffModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Thông tin nhân viên</Text>
              <TouchableOpacity onPress={() => setStaffModalVisible(false)}>
                <X size={24} color={Colors.light.text} />
              </TouchableOpacity>
            </View>

            {selectedStaff && (
              <View style={styles.staffDetail}>
                <View style={styles.staffDetailHeader}>
                  <View style={styles.staffDetailAvatar}>
                    {selectedStaff.avatar ? (
                      <Image source={{ uri: selectedStaff.avatar }} style={styles.detailAvatarImage} />
                    ) : (
                      <View style={styles.detailAvatarPlaceholder}>
                        <Text style={styles.detailAvatarText}>
                          {selectedStaff.name.split(' ').pop()?.charAt(0) || 'N'}
                        </Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.staffDetailName}>{selectedStaff.name}</Text>
                  <View
                    style={[
                      styles.statusBadge,
                      { backgroundColor: `${STATUS_COLORS[selectedStaff.status]}20` },
                    ]}
                  >
                    <View
                      style={[styles.statusDot, { backgroundColor: STATUS_COLORS[selectedStaff.status] }]}
                    />
                    <Text style={[styles.statusText, { color: STATUS_COLORS[selectedStaff.status] }]}>
                      {STATUS_LABELS[selectedStaff.status]}
                    </Text>
                  </View>
                </View>

                <View style={styles.staffDetailInfo}>
                  <View style={styles.detailItem}>
                    <Briefcase size={18} color={Colors.light.textSecondary} />
                    <View style={styles.detailItemContent}>
                      <Text style={styles.detailItemLabel}>Chức vụ</Text>
                      <Text style={styles.detailItemValue}>{selectedStaff.position}</Text>
                    </View>
                  </View>
                  <View style={styles.detailItem}>
                    <Phone size={18} color={Colors.light.textSecondary} />
                    <View style={styles.detailItemContent}>
                      <Text style={styles.detailItemLabel}>Điện thoại</Text>
                      <Text style={styles.detailItemValue}>{selectedStaff.phone}</Text>
                    </View>
                  </View>
                  <View style={styles.detailItem}>
                    <Mail size={18} color={Colors.light.textSecondary} />
                    <View style={styles.detailItemContent}>
                      <Text style={styles.detailItemLabel}>Email</Text>
                      <Text style={styles.detailItemValue}>{selectedStaff.email}</Text>
                    </View>
                  </View>
                  <View style={styles.detailItem}>
                    <Calendar size={18} color={Colors.light.textSecondary} />
                    <View style={styles.detailItemContent}>
                      <Text style={styles.detailItemLabel}>Ngày bắt đầu</Text>
                      <Text style={styles.detailItemValue}>{selectedStaff.startDate}</Text>
                    </View>
                  </View>
                  <View style={styles.detailItem}>
                    <DollarSign size={18} color={Colors.light.textSecondary} />
                    <View style={styles.detailItemContent}>
                      <Text style={styles.detailItemLabel}>Lương</Text>
                      <Text style={styles.detailItemValue}>{formatCurrency(selectedStaff.salary)}</Text>
                    </View>
                  </View>
                </View>
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
    backgroundColor: Colors.light.background,
  },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 0,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700' as const,
    color: '#fff',
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  statsRow: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700' as const,
    color: '#fff',
  },
  statLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 4,
  },
  statDivider: {
    width: 1,
    backgroundColor: 'rgba(255,255,255,0.2)',
    marginHorizontal: 12,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12,
    padding: 4,
    marginBottom: -20,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    gap: 6,
  },
  tabActive: {
    backgroundColor: '#fff',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500' as const,
    color: 'rgba(255,255,255,0.8)',
  },
  tabTextActive: {
    color: '#0ea5e9',
  },
  badge: {
    backgroundColor: '#ef4444',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    minWidth: 20,
    alignItems: 'center',
  },
  badgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600' as const,
  },
  content: {
    flex: 1,
    marginTop: 32,
    paddingHorizontal: 16,
  },
  searchContainer: {
    marginBottom: 16,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: Colors.light.text,
  },
  departmentsContainer: {
    marginBottom: 16,
  },
  departmentsContent: {
    gap: 8,
  },
  departmentChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  departmentChipActive: {
    backgroundColor: '#0ea5e9',
    borderColor: '#0ea5e9',
  },
  departmentChipText: {
    fontSize: 13,
    fontWeight: '500' as const,
    color: Colors.light.textSecondary,
  },
  departmentChipTextActive: {
    color: '#fff',
  },
  staffsList: {
    gap: 12,
  },
  staffCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  staffAvatar: {
    position: 'relative',
    marginRight: 14,
  },
  avatarImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  avatarPlaceholder: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#e0f2fe',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 20,
    fontWeight: '600' as const,
    color: '#0ea5e9',
  },
  statusIndicator: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: '#fff',
  },
  staffInfo: {
    flex: 1,
  },
  staffName: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.light.text,
  },
  staffPosition: {
    fontSize: 13,
    color: Colors.light.textSecondary,
    marginTop: 2,
  },
  staffMeta: {
    flexDirection: 'row',
    marginTop: 6,
    gap: 12,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 12,
    color: Colors.light.textSecondary,
  },
  salaryContainer: {
    gap: 16,
  },
  salaryOverview: {
    marginBottom: 8,
  },
  salaryOverviewCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  salaryOverviewLabel: {
    fontSize: 13,
    color: Colors.light.textSecondary,
    marginTop: 8,
  },
  salaryOverviewValue: {
    fontSize: 24,
    fontWeight: '700' as const,
    color: Colors.light.text,
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.light.text,
    marginBottom: 4,
  },
  salaryCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  salaryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  salaryStaffName: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.light.text,
  },
  salaryMonth: {
    fontSize: 13,
    color: Colors.light.textSecondary,
    marginTop: 2,
  },
  salaryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef3c7',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  salaryBadgeText: {
    fontSize: 12,
    color: '#f59e0b',
    fontWeight: '500' as const,
  },
  salaryDetails: {
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
  },
  salaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  salaryLabel: {
    fontSize: 13,
    color: Colors.light.textSecondary,
  },
  salaryValue: {
    fontSize: 13,
    fontWeight: '500' as const,
    color: Colors.light.text,
  },
  salaryTotal: {
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    paddingTop: 8,
    marginTop: 4,
    marginBottom: 0,
  },
  salaryTotalLabel: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.light.text,
  },
  salaryTotalValue: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: '#0ea5e9',
  },
  payButton: {
    backgroundColor: '#0ea5e9',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  payButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600' as const,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    gap: 12,
  },
  emptyText: {
    fontSize: 15,
    color: Colors.light.textSecondary,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
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
    fontWeight: '700' as const,
    color: Colors.light.text,
  },
  staffDetail: {},
  staffDetailHeader: {
    alignItems: 'center',
    marginBottom: 24,
  },
  staffDetailAvatar: {
    marginBottom: 12,
  },
  detailAvatarImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  detailAvatarPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#e0f2fe',
    justifyContent: 'center',
    alignItems: 'center',
  },
  detailAvatarText: {
    fontSize: 32,
    fontWeight: '600' as const,
    color: '#0ea5e9',
  },
  staffDetailName: {
    fontSize: 22,
    fontWeight: '700' as const,
    color: Colors.light.text,
    marginBottom: 8,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 13,
    fontWeight: '500' as const,
  },
  staffDetailInfo: {
    gap: 16,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  detailItemContent: {
    flex: 1,
  },
  detailItemLabel: {
    fontSize: 12,
    color: Colors.light.textSecondary,
  },
  detailItemValue: {
    fontSize: 15,
    fontWeight: '500' as const,
    color: Colors.light.text,
    marginTop: 2,
  },
});
