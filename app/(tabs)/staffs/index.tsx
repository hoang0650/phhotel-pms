import React, { useMemo, useState } from 'react';
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
import { useAuth } from '@/contexts/AuthContext';
import { API_ENDPOINTS, apiClient, authApi, staffsApi } from '@/services/api';
import { ApiUser } from '@/services/api/auth';
import { extractId } from '@/services/api/utils';
import {
  Staff,
  StaffContactInfo,
  StaffEmploymentInfo,
  StaffPersonalInfo,
  StaffPermission,
  StaffSchedule,
} from '@/types/hotel';

const STATUS_COLORS: Record<string, string> = {
  active: '#10b981',
  on_leave: '#f59e0b',
  terminated: '#ef4444',
};

const STATUS_LABELS: Record<string, string> = {
  active: 'Đang làm',
  on_leave: 'Nghỉ phép',
  terminated: 'Nghỉ việc',
};

const DEPARTMENTS = [
  { id: 'all', name: 'Tất cả' },
  { id: 'management', name: 'Quản lý' },
  { id: 'reception', name: 'Lễ tân' },
  { id: 'housekeeping', name: 'Buồng phòng' },
  { id: 'kitchen', name: 'Bếp' },
  { id: 'security', name: 'Bảo vệ' },
];

const POSITION_OPTIONS = [
  { value: 'manager', label: 'Quản lý' },
  { value: 'receptionist', label: 'Lễ tân' },
  { value: 'housekeeper', label: 'Buồng phòng' },
  { value: 'maintenance', label: 'Bảo trì' },
  { value: 'other', label: 'Khác' },
];

const STATUS_OPTIONS = [
  { value: 'active', label: 'Đang làm' },
  { value: 'on_leave', label: 'Nghỉ phép' },
  { value: 'terminated', label: 'Nghỉ việc' },
];

const GENDER_OPTIONS = [
  { value: 'male', label: 'Nam' },
  { value: 'female', label: 'Nữ' },
  { value: 'other', label: 'Khác' },
];

const PERMISSION_OPTIONS: { value: StaffPermission; label: string }[] = [
  { value: 'view', label: 'Xem' },
  { value: 'create', label: 'Tạo' },
  { value: 'edit', label: 'Sửa' },
  { value: 'delete', label: 'Xóa' },
  { value: 'manage_rooms', label: 'Quản lý phòng' },
  { value: 'manage_bookings', label: 'Quản lý đặt phòng' },
];

const SHIFT_OPTIONS = [
  { value: 'morning', label: 'Ca sáng' },
  { value: 'afternoon', label: 'Ca chiều' },
  { value: 'night', label: 'Ca tối' },
  { value: 'full-day', label: 'Cả ngày' },
];

const SCHEDULE_STATUS_OPTIONS = [
  { value: 'scheduled', label: 'Đã lên lịch' },
  { value: 'completed', label: 'Hoàn thành' },
  { value: 'absent', label: 'Vắng mặt' },
  { value: 'late', label: 'Đi muộn' },
];

type StaffFormState = {
  userId: string;
  hotelId: string;
  personalInfo: StaffPersonalInfo;
  contactInfo: StaffContactInfo;
  employmentInfo: StaffEmploymentInfo;
  schedule: StaffSchedule[];
  permissions: StaffPermission[];
  notes: string;
};

export default function StaffsScreen() {
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const { selectedHotelId } = useHotel();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'staffs' | 'salary'>('staffs');
  const [selectedDepartment, setSelectedDepartment] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [staffModalVisible, setStaffModalVisible] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState<Staff | null>(null);
  const [staffFormVisible, setStaffFormVisible] = useState(false);
  const [staffFormMode, setStaffFormMode] = useState<'create' | 'edit'>('create');
  const [userModalVisible, setUserModalVisible] = useState(false);
  const [userSearch, setUserSearch] = useState('');
  const [staffForm, setStaffForm] = useState<StaffFormState>({
    userId: '',
    hotelId: selectedHotelId || '',
    personalInfo: {
      firstName: '',
      lastName: '',
      dateOfBirth: '',
      gender: 'male',
      nationality: '',
      idType: 'CMND',
      idNumber: '',
      idExpiryDate: '',
      idScanUrl: '',
    },
    contactInfo: {
      email: '',
      phone: '',
      emergencyContact: { name: '', relationship: '', phone: '' },
      address: { street: '', city: '', state: '', country: 'Việt Nam', postalCode: '' },
    },
    employmentInfo: {
      position: 'receptionist',
      department: '',
      startDate: '',
      endDate: '',
      status: 'active',
      salary: 0,
      allowance: 0,
      insurance: 0,
      penalty: 0,
      bonus: 0,
      advancePayment: 0,
      bankAccount: { bankName: '', accountNumber: '', accountName: '' },
      taxId: '',
    },
    schedule: [],
    permissions: ['view'],
    notes: '',
  });

  const { data: staffs = [], isLoading: staffsLoading, refetch: refetchStaffs } = useQuery({
    queryKey: ['staffs', selectedHotelId],
    queryFn: () => staffsApi.getAll(selectedHotelId || undefined),
  });

  const { data: salaryRecords = [], isLoading: salaryLoading, refetch: refetchSalary } = useQuery({
    queryKey: ['salaryRecords'],
    queryFn: () => staffsApi.getSalaryRecords(),
  });

  const getUserId = (userItem: ApiUser) => userItem._id || (userItem as { id?: string }).id || '';
  const getUserLabel = (userItem: ApiUser) =>
    userItem.fullName || userItem.name || userItem.email || getUserId(userItem);

  const canManageStaff =
    user?.role === 'superadmin' ||
    user?.role === 'admin' ||
    user?.role === 'business' ||
    user?.role === 'hotel';

  const { data: availableUsers = [] } = useQuery({
    queryKey: [
      'users',
      selectedHotelId,
      staffs.map(staff => staff.userId).join(','),
      staffForm.userId,
      staffFormMode,
    ],
    queryFn: async () => {
      if (!selectedHotelId) return [];

      let currentProfile = user;
      if (!currentProfile) {
        try {
          currentProfile = await authApi.getProfile();
        } catch (error) {
          currentProfile = null;
        }
      }

      const assignedUserIds = staffs.map(staff => staff.userId).filter(Boolean);
      const isAdmin = currentProfile?.role === 'superadmin' || currentProfile?.role === 'admin';

      const fetchUsers = async (endpoint: string) => {
        const response = await apiClient.get<ApiUser[] | { data: ApiUser[] }>(endpoint);
        return Array.isArray(response) ? response : response?.data || [];
      };

      let usersList: ApiUser[] = [];
      if (isAdmin) {
        try {
          usersList = await fetchUsers(API_ENDPOINTS.USERS.BASE);
        } catch (error) {
          usersList = [];
        }
      }

      if (!isAdmin || usersList.length === 0) {
        try {
          usersList = await fetchUsers(API_ENDPOINTS.USERS.BY_HOTEL(selectedHotelId));
        } catch (error) {
          usersList = [];
        }
      }

      let filteredUsers = usersList.filter(userItem => {
        const userId = getUserId(userItem);
        const isNotAssigned = !assignedUserIds.includes(userId) || userId === staffForm.userId;
        const hotelId = extractId(userItem.hotelId);
        const canBeAssigned = !hotelId || hotelId === selectedHotelId;
        const isValidRole =
          !userItem.role || ['staff', 'hotel', 'receptionist'].includes(userItem.role);
        return isNotAssigned && (canBeAssigned || isValidRole);
      });

      if (staffForm.userId && !filteredUsers.some(userItem => getUserId(userItem) === staffForm.userId)) {
        try {
          const selectedUser = await apiClient.get<ApiUser>(API_ENDPOINTS.USERS.BY_ID(staffForm.userId));
          if (selectedUser) {
            filteredUsers = [selectedUser, ...filteredUsers];
          }
        } catch (error) {
        }
      }

      return filteredUsers;
    },
    enabled: !!selectedHotelId && canManageStaff,
  });

  const filteredUsers = useMemo(() => {
    const keyword = userSearch.trim().toLowerCase();
    if (!keyword) return availableUsers;
    return availableUsers.filter(userItem => {
      const label = getUserLabel(userItem).toLowerCase();
      const email = userItem.email?.toLowerCase() || '';
      const role = userItem.role?.toLowerCase() || '';
      return label.includes(keyword) || email.includes(keyword) || role.includes(keyword);
    });
  }, [availableUsers, userSearch]);

  const selectedUser = useMemo(
    () => availableUsers.find(userItem => getUserId(userItem) === staffForm.userId) || null,
    [availableUsers, staffForm.userId]
  );

  const paySalaryMutation = useMutation({
    mutationFn: ({ staffId, recordId }: { staffId: string; recordId: string }) =>
      staffsApi.paySalary(staffId, recordId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['salaryRecords'] });
      Alert.alert('Thành công', 'Đã thanh toán lương thành công');
    },
  });

  const createStaffMutation = useMutation({
    mutationFn: (payload: Omit<Staff, 'id'>) => staffsApi.create(payload),
    onSuccess: result => {
      if (!result) {
        Alert.alert('Thông báo', 'Không thể thêm nhân viên');
        return;
      }
      queryClient.invalidateQueries({ queryKey: ['staffs'] });
      setStaffFormVisible(false);
      Alert.alert('Thông báo', 'Đã thêm nhân viên');
    },
    onError: () => {
      Alert.alert('Thông báo', 'Không thể thêm nhân viên');
    },
  });

  const updateStaffMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<Staff> }) =>
      staffsApi.update(id, payload),
    onSuccess: result => {
      if (!result) {
        Alert.alert('Thông báo', 'Không thể cập nhật nhân viên');
        return;
      }
      queryClient.invalidateQueries({ queryKey: ['staffs'] });
      setStaffFormVisible(false);
      Alert.alert('Thông báo', 'Đã cập nhật nhân viên');
    },
    onError: () => {
      Alert.alert('Thông báo', 'Không thể cập nhật nhân viên');
    },
  });

  const deleteStaffMutation = useMutation({
    mutationFn: (id: string) => staffsApi.delete(id),
    onSuccess: result => {
      if (!result) {
        Alert.alert('Thông báo', 'Không thể xóa nhân viên');
        return;
      }
      queryClient.invalidateQueries({ queryKey: ['staffs'] });
      setStaffModalVisible(false);
      Alert.alert('Thông báo', 'Đã xóa nhân viên');
    },
    onError: () => {
      Alert.alert('Thông báo', 'Không thể xóa nhân viên');
    },
  });

  const isLoading = staffsLoading || salaryLoading;

  const getStaffName = (staff: Staff) => {
    const firstName = staff.personalInfo?.firstName || '';
    const lastName = staff.personalInfo?.lastName || '';
    const fullName = `${firstName} ${lastName}`.trim();
    return fullName || staff.name || '';
  };

  const getStaffPhone = (staff: Staff) => staff.contactInfo?.phone || staff.phone || '';
  const getStaffEmail = (staff: Staff) => staff.contactInfo?.email || staff.email || '';
  const getStaffPosition = (staff: Staff) =>
    staff.employmentInfo?.position || staff.position || 'other';
  const getStaffDepartment = (staff: Staff) =>
    staff.employmentInfo?.department || staff.department || '';
  const getStaffStatus = (staff: Staff) => {
    const status = staff.employmentInfo?.status || staff.status || 'active';
    return status === 'inactive' ? 'terminated' : status;
  };

  const filteredStaffs = staffs.filter(staff => {
    const department = getStaffDepartment(staff);
    const matchesDepartment = selectedDepartment === 'all' || department === selectedDepartment;
    const name = getStaffName(staff).toLowerCase();
    const position = getStaffPosition(staff).toLowerCase();
    const phone = getStaffPhone(staff).toLowerCase();
    const email = getStaffEmail(staff).toLowerCase();
    const query = searchQuery.trim().toLowerCase();
    const matchesSearch =
      !query ||
      name.includes(query) ||
      position.includes(query) ||
      phone.includes(query) ||
      email.includes(query);
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

  const activeStaffs = staffs.filter(s => getStaffStatus(s) === 'active').length;
  const onLeaveStaffs = staffs.filter(s => getStaffStatus(s) === 'on_leave').length;
  const totalSalary = staffs.reduce((sum, s) => sum + (s.employmentInfo?.salary || s.salary || 0), 0);

  const pendingSalaryRecords = salaryRecords.filter(r => r.status === 'pending');

  const resetStaffForm = (hotelId?: string) => {
    setStaffForm({
      userId: '',
      hotelId: hotelId || selectedHotelId || '',
      personalInfo: {
        firstName: '',
        lastName: '',
        dateOfBirth: '',
        gender: 'male',
        nationality: '',
        idType: 'CMND',
        idNumber: '',
        idExpiryDate: '',
        idScanUrl: '',
      },
      contactInfo: {
        email: '',
        phone: '',
        emergencyContact: { name: '', relationship: '', phone: '' },
        address: { street: '', city: '', state: '', country: 'Việt Nam', postalCode: '' },
      },
      employmentInfo: {
        position: 'receptionist',
        department: '',
        startDate: '',
        endDate: '',
        status: 'active',
        salary: 0,
        allowance: 0,
        insurance: 0,
        penalty: 0,
        bonus: 0,
        advancePayment: 0,
        bankAccount: { bankName: '', accountNumber: '', accountName: '' },
        taxId: '',
      },
      schedule: [],
      permissions: ['view'],
      notes: '',
    });
  };

  const setFormFromStaff = (staff: Staff) => {
    setStaffForm({
      userId: staff.userId || '',
      hotelId: staff.hotelId || selectedHotelId || '',
      personalInfo: {
        firstName: staff.personalInfo?.firstName || '',
        lastName: staff.personalInfo?.lastName || '',
        dateOfBirth: staff.personalInfo?.dateOfBirth || '',
        gender: staff.personalInfo?.gender || 'male',
        nationality: staff.personalInfo?.nationality || '',
        idType: staff.personalInfo?.idType || 'CMND',
        idNumber: staff.personalInfo?.idNumber || '',
        idExpiryDate: staff.personalInfo?.idExpiryDate || '',
        idScanUrl: staff.personalInfo?.idScanUrl || '',
      },
      contactInfo: {
        email: staff.contactInfo?.email || '',
        phone: staff.contactInfo?.phone || '',
        emergencyContact: {
          name: staff.contactInfo?.emergencyContact?.name || '',
          relationship: staff.contactInfo?.emergencyContact?.relationship || '',
          phone: staff.contactInfo?.emergencyContact?.phone || '',
        },
        address: {
          street: staff.contactInfo?.address?.street || '',
          city: staff.contactInfo?.address?.city || '',
          state: staff.contactInfo?.address?.state || '',
          country: staff.contactInfo?.address?.country || 'Việt Nam',
          postalCode: staff.contactInfo?.address?.postalCode || '',
        },
      },
      employmentInfo: {
        position: staff.employmentInfo?.position || 'receptionist',
        department: staff.employmentInfo?.department || '',
        startDate: staff.employmentInfo?.startDate || '',
        endDate: staff.employmentInfo?.endDate || '',
        status: staff.employmentInfo?.status || 'active',
        salary: staff.employmentInfo?.salary || 0,
        allowance: staff.employmentInfo?.allowance || 0,
        insurance: staff.employmentInfo?.insurance || 0,
        penalty: staff.employmentInfo?.penalty || 0,
        bonus: staff.employmentInfo?.bonus || 0,
        advancePayment: staff.employmentInfo?.advancePayment || 0,
        bankAccount: {
          bankName: staff.employmentInfo?.bankAccount?.bankName || '',
          accountNumber: staff.employmentInfo?.bankAccount?.accountNumber || '',
          accountName: staff.employmentInfo?.bankAccount?.accountName || '',
        },
        taxId: staff.employmentInfo?.taxId || '',
      },
      schedule: staff.schedule || [],
      permissions: staff.permissions || ['view'],
      notes: staff.notes || '',
    });
  };

  const openCreateModal = () => {
    if (!canManageStaff) {
      Alert.alert('Thông báo', 'Bạn không có quyền thực hiện thao tác này');
      return;
    }
    if (!selectedHotelId) {
      Alert.alert('Thông báo', 'Vui lòng chọn khách sạn trước');
      return;
    }
    resetStaffForm(selectedHotelId);
    setStaffFormMode('create');
    setStaffFormVisible(true);
  };

  const openEditModal = (staff: Staff) => {
    if (!canManageStaff) return;
    setFormFromStaff(staff);
    setStaffFormMode('edit');
    setStaffFormVisible(true);
  };

  const parseNumber = (value: string | number | undefined) => {
    if (value === undefined || value === null || value === '') return 0;
    const num = Number(value);
    return Number.isNaN(num) ? 0 : num;
  };

  const handleSaveStaff = () => {
    if (!staffForm.userId.trim()) {
      Alert.alert(
        'Thông báo',
        staffFormMode === 'create' && availableUsers.length === 0
          ? 'Không có tài khoản khả dụng để gán'
          : 'Vui lòng chọn tài khoản'
      );
      return;
    }
    if (
      staffFormMode === 'create' &&
      !availableUsers.some(userItem => getUserId(userItem) === staffForm.userId)
    ) {
      Alert.alert('Thông báo', 'Tài khoản đã được gán hoặc không hợp lệ');
      return;
    }
    if (!staffForm.hotelId) {
      Alert.alert('Thông báo', 'Vui lòng chọn khách sạn');
      return;
    }
    if (!staffForm.personalInfo.firstName.trim() || !staffForm.personalInfo.lastName.trim()) {
      Alert.alert('Thông báo', 'Vui lòng nhập họ và tên');
      return;
    }
    if (!staffForm.contactInfo.phone?.trim()) {
      Alert.alert('Thông báo', 'Vui lòng nhập số điện thoại');
      return;
    }

    const payload: Omit<Staff, 'id'> = {
      userId: staffForm.userId.trim(),
      hotelId: staffForm.hotelId,
      personalInfo: {
        ...staffForm.personalInfo,
        firstName: staffForm.personalInfo.firstName.trim(),
        lastName: staffForm.personalInfo.lastName.trim(),
        nationality: staffForm.personalInfo.nationality?.trim() || '',
        idType: staffForm.personalInfo.idType?.trim() || '',
        idNumber: staffForm.personalInfo.idNumber?.trim() || '',
        idExpiryDate: staffForm.personalInfo.idExpiryDate || '',
        idScanUrl: staffForm.personalInfo.idScanUrl || '',
      },
      contactInfo: {
        email: staffForm.contactInfo.email?.trim() || '',
        phone: staffForm.contactInfo.phone?.trim() || '',
        emergencyContact: {
          name: staffForm.contactInfo.emergencyContact?.name?.trim() || '',
          relationship: staffForm.contactInfo.emergencyContact?.relationship?.trim() || '',
          phone: staffForm.contactInfo.emergencyContact?.phone?.trim() || '',
        },
        address: {
          street: staffForm.contactInfo.address?.street?.trim() || '',
          city: staffForm.contactInfo.address?.city?.trim() || '',
          state: staffForm.contactInfo.address?.state?.trim() || '',
          country: staffForm.contactInfo.address?.country?.trim() || '',
          postalCode: staffForm.contactInfo.address?.postalCode?.trim() || '',
        },
      },
      employmentInfo: {
        ...staffForm.employmentInfo,
        department: staffForm.employmentInfo.department?.trim() || '',
        startDate: staffForm.employmentInfo.startDate || '',
        endDate: staffForm.employmentInfo.endDate || '',
        salary: parseNumber(staffForm.employmentInfo.salary),
        allowance: parseNumber(staffForm.employmentInfo.allowance),
        insurance: parseNumber(staffForm.employmentInfo.insurance),
        penalty: parseNumber(staffForm.employmentInfo.penalty),
        bonus: parseNumber(staffForm.employmentInfo.bonus),
        advancePayment: parseNumber(staffForm.employmentInfo.advancePayment),
        bankAccount: {
          bankName: staffForm.employmentInfo.bankAccount?.bankName?.trim() || '',
          accountNumber: staffForm.employmentInfo.bankAccount?.accountNumber?.trim() || '',
          accountName: staffForm.employmentInfo.bankAccount?.accountName?.trim() || '',
        },
        taxId: staffForm.employmentInfo.taxId?.trim() || '',
      },
      schedule: staffForm.schedule.filter(item => item.date),
      permissions: staffForm.permissions,
      notes: staffForm.notes.trim(),
    };

    if (staffFormMode === 'edit' && selectedStaff) {
      updateStaffMutation.mutate({ id: selectedStaff.id, payload });
      return;
    }
    createStaffMutation.mutate(payload);
  };

  const handleDeleteStaff = () => {
    if (!selectedStaff) return;
    if (!canManageStaff) {
      Alert.alert('Thông báo', 'Bạn không có quyền thực hiện thao tác này');
      return;
    }
    const staffName = getStaffName(selectedStaff);
    Alert.alert(
      'Xác nhận',
      staffName ? `Bạn có chắc muốn xóa nhân viên ${staffName}?` : 'Bạn có chắc muốn xóa nhân viên này?',
      [
        { text: 'Hủy', style: 'cancel' },
        { text: 'Xóa', style: 'destructive', onPress: () => deleteStaffMutation.mutate(selectedStaff.id) },
      ]
    );
  };

  const addScheduleItem = () => {
    setStaffForm(prev => ({
      ...prev,
      schedule: [
        ...prev.schedule,
        { date: '', shift: 'morning', startTime: '08:00', endTime: '16:00', status: 'scheduled' },
      ],
    }));
  };

  const updateScheduleItem = (index: number, nextItem: StaffSchedule) => {
    setStaffForm(prev => ({
      ...prev,
      schedule: prev.schedule.map((item, idx) => (idx === index ? nextItem : item)),
    }));
  };

  const removeScheduleItem = (index: number) => {
    setStaffForm(prev => ({
      ...prev,
      schedule: prev.schedule.filter((_, idx) => idx !== index),
    }));
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#0f766e', '#14b8a6']}
        style={[styles.header, { paddingTop: insets.top + 12 }]}
      >
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Nhân viên</Text>
          {canManageStaff && (
            <TouchableOpacity style={styles.addButton} onPress={openCreateModal}>
              <Plus size={20} color="#fff" />
            </TouchableOpacity>
          )}
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
                          {getStaffName(staff).split(' ').pop()?.charAt(0) || 'N'}
                        </Text>
                      </View>
                    )}
                    <View
                      style={[
                        styles.statusIndicator,
                        { backgroundColor: STATUS_COLORS[getStaffStatus(staff)] },
                      ]}
                    />
                  </View>

                  <View style={styles.staffInfo}>
                    <Text style={styles.staffName}>{getStaffName(staff)}</Text>
                    <Text style={styles.staffPosition}>
                      {POSITION_OPTIONS.find(option => option.value === getStaffPosition(staff))?.label || 'Khác'}
                    </Text>
                    <View style={styles.staffMeta}>
                      <View style={styles.metaItem}>
                        <Phone size={12} color={Colors.light.textSecondary} />
                        <Text style={styles.metaText}>{getStaffPhone(staff)}</Text>
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
                          {getStaffName(selectedStaff).split(' ').pop()?.charAt(0) || 'N'}
                        </Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.staffDetailName}>{getStaffName(selectedStaff)}</Text>
                  <View
                    style={[
                      styles.statusBadge,
                      { backgroundColor: `${STATUS_COLORS[getStaffStatus(selectedStaff)]}20` },
                    ]}
                  >
                    <View
                      style={[styles.statusDot, { backgroundColor: STATUS_COLORS[getStaffStatus(selectedStaff)] }]}
                    />
                    <Text style={[styles.statusText, { color: STATUS_COLORS[getStaffStatus(selectedStaff)] }]}>
                      {STATUS_LABELS[getStaffStatus(selectedStaff)]}
                    </Text>
                  </View>
                </View>

                <View style={styles.staffDetailInfo}>
                  <View style={styles.detailItem}>
                    <Briefcase size={18} color={Colors.light.textSecondary} />
                    <View style={styles.detailItemContent}>
                      <Text style={styles.detailItemLabel}>Chức vụ</Text>
                      <Text style={styles.detailItemValue}>
                        {POSITION_OPTIONS.find(option => option.value === getStaffPosition(selectedStaff))?.label || 'Khác'}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.detailItem}>
                    <Phone size={18} color={Colors.light.textSecondary} />
                    <View style={styles.detailItemContent}>
                      <Text style={styles.detailItemLabel}>Điện thoại</Text>
                      <Text style={styles.detailItemValue}>{getStaffPhone(selectedStaff)}</Text>
                    </View>
                  </View>
                  <View style={styles.detailItem}>
                    <Mail size={18} color={Colors.light.textSecondary} />
                    <View style={styles.detailItemContent}>
                      <Text style={styles.detailItemLabel}>Email</Text>
                      <Text style={styles.detailItemValue}>{getStaffEmail(selectedStaff) || '—'}</Text>
                    </View>
                  </View>
                  <View style={styles.detailItem}>
                    <Calendar size={18} color={Colors.light.textSecondary} />
                    <View style={styles.detailItemContent}>
                      <Text style={styles.detailItemLabel}>Ngày bắt đầu</Text>
                      <Text style={styles.detailItemValue}>
                        {selectedStaff.employmentInfo?.startDate || selectedStaff.startDate || '—'}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.detailItem}>
                    <DollarSign size={18} color={Colors.light.textSecondary} />
                    <View style={styles.detailItemContent}>
                      <Text style={styles.detailItemLabel}>Lương</Text>
                      <Text style={styles.detailItemValue}>
                        {formatCurrency(selectedStaff.employmentInfo?.salary || selectedStaff.salary || 0)}
                      </Text>
                    </View>
                  </View>
                </View>

                <View style={styles.detailSection}>
                  <Text style={styles.detailSectionTitle}>Thông tin cá nhân</Text>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Họ</Text>
                    <Text style={styles.detailValue}>{selectedStaff.personalInfo?.firstName || '—'}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Tên</Text>
                    <Text style={styles.detailValue}>{selectedStaff.personalInfo?.lastName || '—'}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Giới tính</Text>
                    <Text style={styles.detailValue}>
                      {GENDER_OPTIONS.find(option => option.value === selectedStaff.personalInfo?.gender)?.label || '—'}
                    </Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Quốc tịch</Text>
                    <Text style={styles.detailValue}>{selectedStaff.personalInfo?.nationality || '—'}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Số giấy tờ</Text>
                    <Text style={styles.detailValue}>{selectedStaff.personalInfo?.idNumber || '—'}</Text>
                  </View>
                </View>

                <View style={styles.detailSection}>
                  <Text style={styles.detailSectionTitle}>Thông tin liên hệ</Text>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Địa chỉ</Text>
                    <Text style={styles.detailValue}>
                      {[
                        selectedStaff.contactInfo?.address?.street,
                        selectedStaff.contactInfo?.address?.city,
                        selectedStaff.contactInfo?.address?.state,
                        selectedStaff.contactInfo?.address?.country,
                      ]
                        .filter(Boolean)
                        .join(', ') || '—'}
                    </Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Liên hệ khẩn</Text>
                    <Text style={styles.detailValue}>
                      {selectedStaff.contactInfo?.emergencyContact?.name || '—'}
                    </Text>
                  </View>
                </View>

                <View style={styles.detailSection}>
                  <Text style={styles.detailSectionTitle}>Quyền hạn</Text>
                  <View style={styles.permissionContainer}>
                    {(selectedStaff.permissions || ['view']).map(permission => (
                      <View key={permission} style={styles.permissionChip}>
                        <Text style={styles.permissionChipText}>
                          {PERMISSION_OPTIONS.find(option => option.value === permission)?.label || permission}
                        </Text>
                      </View>
                    ))}
                  </View>
                </View>

                {selectedStaff.schedule && selectedStaff.schedule.length > 0 && (
                  <View style={styles.detailSection}>
                    <Text style={styles.detailSectionTitle}>Lịch làm việc</Text>
                    {selectedStaff.schedule.map((item, index) => (
                      <View key={`${item.date}-${index}`} style={styles.scheduleRow}>
                        <Text style={styles.scheduleDate}>{item.date}</Text>
                        <Text style={styles.scheduleShift}>
                          {SHIFT_OPTIONS.find(option => option.value === item.shift)?.label || item.shift}
                        </Text>
                        <Text style={styles.scheduleTime}>
                          {item.startTime && item.endTime ? `${item.startTime} - ${item.endTime}` : '—'}
                        </Text>
                        <Text style={styles.scheduleStatus}>
                          {SCHEDULE_STATUS_OPTIONS.find(option => option.value === item.status)?.label || item.status}
                        </Text>
                      </View>
                    ))}
                  </View>
                )}

                {!!selectedStaff.notes && (
                  <View style={styles.detailSection}>
                    <Text style={styles.detailSectionTitle}>Ghi chú</Text>
                    <Text style={styles.detailNote}>{selectedStaff.notes}</Text>
                  </View>
                )}

                {canManageStaff && (
                  <View style={styles.modalActions}>
                    <TouchableOpacity
                      style={styles.actionButton}
                      onPress={() => {
                        setStaffModalVisible(false);
                        openEditModal(selectedStaff);
                      }}
                    >
                      <Text style={styles.actionButtonText}>Chỉnh sửa</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.actionButton, styles.actionButtonDanger]} onPress={handleDeleteStaff}>
                      <Text style={[styles.actionButtonText, styles.actionButtonDangerText]}>Xóa</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            )}
          </View>
        </View>
      </Modal>
      <Modal
        visible={staffFormVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setStaffFormVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.formModalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {staffFormMode === 'create' ? 'Thêm nhân viên' : 'Cập nhật nhân viên'}
              </Text>
              <TouchableOpacity onPress={() => setStaffFormVisible(false)}>
                <X size={24} color={Colors.light.text} />
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.formSectionTitle}>Tài khoản</Text>
              <View style={styles.formField}>
                <Text style={styles.formLabel}>Tài khoản</Text>
                <TouchableOpacity
                  style={[
                    styles.selectBox,
                    staffFormMode === 'edit' && styles.selectBoxDisabled,
                  ]}
                  onPress={() => {
                    if (staffFormMode === 'edit') return;
                    setUserModalVisible(true);
                  }}
                  disabled={staffFormMode === 'edit'}
                >
                  <Text style={[styles.selectText, staffFormMode === 'edit' && styles.selectTextDisabled]}>
                    {selectedUser
                      ? `${getUserLabel(selectedUser)} (${selectedUser.role || 'user'})`
                      : staffForm.userId || 'Chọn tài khoản'}
                  </Text>
                  <ChevronRight size={18} color={Colors.light.textSecondary} />
                </TouchableOpacity>
                <Text style={styles.helperText}>
                  {staffFormMode === 'edit'
                    ? 'Không thể đổi tài khoản khi chỉnh sửa'
                    : availableUsers.length > 0
                      ? `Có ${availableUsers.length} tài khoản khả dụng`
                      : 'Không có tài khoản khả dụng'}
                </Text>
              </View>

              <Text style={styles.formSectionTitle}>Thông tin cá nhân</Text>
              <View style={styles.formField}>
                <Text style={styles.formLabel}>Họ</Text>
                <TextInput
                  style={styles.formInput}
                  value={staffForm.personalInfo.firstName}
                  onChangeText={text =>
                    setStaffForm(prev => ({
                      ...prev,
                      personalInfo: { ...prev.personalInfo, firstName: text },
                    }))
                  }
                  placeholder="Nguyễn"
                />
              </View>
              <View style={styles.formField}>
                <Text style={styles.formLabel}>Tên</Text>
                <TextInput
                  style={styles.formInput}
                  value={staffForm.personalInfo.lastName}
                  onChangeText={text =>
                    setStaffForm(prev => ({
                      ...prev,
                      personalInfo: { ...prev.personalInfo, lastName: text },
                    }))
                  }
                  placeholder="Văn A"
                />
              </View>
              <View style={styles.formField}>
                <Text style={styles.formLabel}>Ngày sinh</Text>
                <TextInput
                  style={styles.formInput}
                  value={staffForm.personalInfo.dateOfBirth || ''}
                  onChangeText={text =>
                    setStaffForm(prev => ({
                      ...prev,
                      personalInfo: { ...prev.personalInfo, dateOfBirth: text },
                    }))
                  }
                  placeholder="YYYY-MM-DD"
                />
              </View>
              <View style={styles.formField}>
                <Text style={styles.formLabel}>Giới tính</Text>
                <View style={styles.chipRow}>
                  {GENDER_OPTIONS.map(option => (
                    <TouchableOpacity
                      key={option.value}
                      style={[
                        styles.chip,
                        staffForm.personalInfo.gender === option.value && styles.chipActive,
                      ]}
                      onPress={() =>
                        setStaffForm(prev => ({
                          ...prev,
                          personalInfo: { ...prev.personalInfo, gender: option.value as StaffPersonalInfo['gender'] },
                        }))
                      }
                    >
                      <Text
                        style={[
                          styles.chipText,
                          staffForm.personalInfo.gender === option.value && styles.chipTextActive,
                        ]}
                      >
                        {option.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
              <View style={styles.formField}>
                <Text style={styles.formLabel}>Quốc tịch</Text>
                <TextInput
                  style={styles.formInput}
                  value={staffForm.personalInfo.nationality || ''}
                  onChangeText={text =>
                    setStaffForm(prev => ({
                      ...prev,
                      personalInfo: { ...prev.personalInfo, nationality: text },
                    }))
                  }
                  placeholder="Việt Nam"
                />
              </View>
              <View style={styles.formField}>
                <Text style={styles.formLabel}>Loại giấy tờ</Text>
                <TextInput
                  style={styles.formInput}
                  value={staffForm.personalInfo.idType || ''}
                  onChangeText={text =>
                    setStaffForm(prev => ({
                      ...prev,
                      personalInfo: { ...prev.personalInfo, idType: text },
                    }))
                  }
                  placeholder="CMND/CCCD"
                />
              </View>
              <View style={styles.formField}>
                <Text style={styles.formLabel}>Số giấy tờ</Text>
                <TextInput
                  style={styles.formInput}
                  value={staffForm.personalInfo.idNumber || ''}
                  onChangeText={text =>
                    setStaffForm(prev => ({
                      ...prev,
                      personalInfo: { ...prev.personalInfo, idNumber: text },
                    }))
                  }
                  placeholder="0123456789"
                />
              </View>
              <View style={styles.formField}>
                <Text style={styles.formLabel}>Hết hạn</Text>
                <TextInput
                  style={styles.formInput}
                  value={staffForm.personalInfo.idExpiryDate || ''}
                  onChangeText={text =>
                    setStaffForm(prev => ({
                      ...prev,
                      personalInfo: { ...prev.personalInfo, idExpiryDate: text },
                    }))
                  }
                  placeholder="YYYY-MM-DD"
                />
              </View>

              <Text style={styles.formSectionTitle}>Thông tin liên hệ</Text>
              <View style={styles.formField}>
                <Text style={styles.formLabel}>Điện thoại</Text>
                <TextInput
                  style={styles.formInput}
                  value={staffForm.contactInfo.phone || ''}
                  onChangeText={text =>
                    setStaffForm(prev => ({
                      ...prev,
                      contactInfo: { ...prev.contactInfo, phone: text },
                    }))
                  }
                  placeholder="098..."
                  keyboardType="phone-pad"
                />
              </View>
              <View style={styles.formField}>
                <Text style={styles.formLabel}>Email</Text>
                <TextInput
                  style={styles.formInput}
                  value={staffForm.contactInfo.email || ''}
                  onChangeText={text =>
                    setStaffForm(prev => ({
                      ...prev,
                      contactInfo: { ...prev.contactInfo, email: text },
                    }))
                  }
                  placeholder="email@example.com"
                  keyboardType="email-address"
                />
              </View>
              <View style={styles.formField}>
                <Text style={styles.formLabel}>Địa chỉ</Text>
                <TextInput
                  style={styles.formInput}
                  value={staffForm.contactInfo.address?.street || ''}
                  onChangeText={text =>
                    setStaffForm(prev => ({
                      ...prev,
                      contactInfo: {
                        ...prev.contactInfo,
                        address: { ...prev.contactInfo.address, street: text },
                      },
                    }))
                  }
                  placeholder="Số nhà, đường"
                />
                <TextInput
                  style={styles.formInput}
                  value={staffForm.contactInfo.address?.city || ''}
                  onChangeText={text =>
                    setStaffForm(prev => ({
                      ...prev,
                      contactInfo: {
                        ...prev.contactInfo,
                        address: { ...prev.contactInfo.address, city: text },
                      },
                    }))
                  }
                  placeholder="Thành phố"
                />
                <TextInput
                  style={styles.formInput}
                  value={staffForm.contactInfo.address?.state || ''}
                  onChangeText={text =>
                    setStaffForm(prev => ({
                      ...prev,
                      contactInfo: {
                        ...prev.contactInfo,
                        address: { ...prev.contactInfo.address, state: text },
                      },
                    }))
                  }
                  placeholder="Tỉnh/Thành"
                />
                <TextInput
                  style={styles.formInput}
                  value={staffForm.contactInfo.address?.country || ''}
                  onChangeText={text =>
                    setStaffForm(prev => ({
                      ...prev,
                      contactInfo: {
                        ...prev.contactInfo,
                        address: { ...prev.contactInfo.address, country: text },
                      },
                    }))
                  }
                  placeholder="Quốc gia"
                />
              </View>
              <View style={styles.formField}>
                <Text style={styles.formLabel}>Liên hệ khẩn</Text>
                <TextInput
                  style={styles.formInput}
                  value={staffForm.contactInfo.emergencyContact?.name || ''}
                  onChangeText={text =>
                    setStaffForm(prev => ({
                      ...prev,
                      contactInfo: {
                        ...prev.contactInfo,
                        emergencyContact: { ...prev.contactInfo.emergencyContact, name: text },
                      },
                    }))
                  }
                  placeholder="Tên người liên hệ"
                />
                <TextInput
                  style={styles.formInput}
                  value={staffForm.contactInfo.emergencyContact?.relationship || ''}
                  onChangeText={text =>
                    setStaffForm(prev => ({
                      ...prev,
                      contactInfo: {
                        ...prev.contactInfo,
                        emergencyContact: { ...prev.contactInfo.emergencyContact, relationship: text },
                      },
                    }))
                  }
                  placeholder="Quan hệ"
                />
                <TextInput
                  style={styles.formInput}
                  value={staffForm.contactInfo.emergencyContact?.phone || ''}
                  onChangeText={text =>
                    setStaffForm(prev => ({
                      ...prev,
                      contactInfo: {
                        ...prev.contactInfo,
                        emergencyContact: { ...prev.contactInfo.emergencyContact, phone: text },
                      },
                    }))
                  }
                  placeholder="Số điện thoại"
                  keyboardType="phone-pad"
                />
              </View>

              <Text style={styles.formSectionTitle}>Thông tin công việc</Text>
              <View style={styles.formField}>
                <Text style={styles.formLabel}>Chức vụ</Text>
                <View style={styles.chipRow}>
                  {POSITION_OPTIONS.map(option => (
                    <TouchableOpacity
                      key={option.value}
                      style={[
                        styles.chip,
                        staffForm.employmentInfo.position === option.value && styles.chipActive,
                      ]}
                      onPress={() =>
                        setStaffForm(prev => ({
                          ...prev,
                          employmentInfo: { ...prev.employmentInfo, position: option.value as StaffEmploymentInfo['position'] },
                        }))
                      }
                    >
                      <Text
                        style={[
                          styles.chipText,
                          staffForm.employmentInfo.position === option.value && styles.chipTextActive,
                        ]}
                      >
                        {option.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
              <View style={styles.formField}>
                <Text style={styles.formLabel}>Bộ phận</Text>
                <TextInput
                  style={styles.formInput}
                  value={staffForm.employmentInfo.department || ''}
                  onChangeText={text =>
                    setStaffForm(prev => ({
                      ...prev,
                      employmentInfo: { ...prev.employmentInfo, department: text },
                    }))
                  }
                  placeholder="Lễ tân, buồng phòng..."
                />
              </View>
              <View style={styles.formField}>
                <Text style={styles.formLabel}>Trạng thái</Text>
                <View style={styles.chipRow}>
                  {STATUS_OPTIONS.map(option => (
                    <TouchableOpacity
                      key={option.value}
                      style={[
                        styles.chip,
                        staffForm.employmentInfo.status === option.value && styles.chipActive,
                      ]}
                      onPress={() =>
                        setStaffForm(prev => ({
                          ...prev,
                          employmentInfo: { ...prev.employmentInfo, status: option.value as StaffEmploymentInfo['status'] },
                        }))
                      }
                    >
                      <Text
                        style={[
                          styles.chipText,
                          staffForm.employmentInfo.status === option.value && styles.chipTextActive,
                        ]}
                      >
                        {option.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
              <View style={styles.formField}>
                <Text style={styles.formLabel}>Ngày bắt đầu</Text>
                <TextInput
                  style={styles.formInput}
                  value={staffForm.employmentInfo.startDate || ''}
                  onChangeText={text =>
                    setStaffForm(prev => ({
                      ...prev,
                      employmentInfo: { ...prev.employmentInfo, startDate: text },
                    }))
                  }
                  placeholder="YYYY-MM-DD"
                />
              </View>
              <View style={styles.formField}>
                <Text style={styles.formLabel}>Lương cơ bản</Text>
                <TextInput
                  style={styles.formInput}
                  value={String(staffForm.employmentInfo.salary || 0)}
                  onChangeText={text =>
                    setStaffForm(prev => ({
                      ...prev,
                      employmentInfo: { ...prev.employmentInfo, salary: parseNumber(text) },
                    }))
                  }
                  keyboardType="numeric"
                />
              </View>
              <View style={styles.formField}>
                <Text style={styles.formLabel}>Phụ cấp</Text>
                <TextInput
                  style={styles.formInput}
                  value={String(staffForm.employmentInfo.allowance || 0)}
                  onChangeText={text =>
                    setStaffForm(prev => ({
                      ...prev,
                      employmentInfo: { ...prev.employmentInfo, allowance: parseNumber(text) },
                    }))
                  }
                  keyboardType="numeric"
                />
              </View>
              <View style={styles.formField}>
                <Text style={styles.formLabel}>Bảo hiểm</Text>
                <TextInput
                  style={styles.formInput}
                  value={String(staffForm.employmentInfo.insurance || 0)}
                  onChangeText={text =>
                    setStaffForm(prev => ({
                      ...prev,
                      employmentInfo: { ...prev.employmentInfo, insurance: parseNumber(text) },
                    }))
                  }
                  keyboardType="numeric"
                />
              </View>
              <View style={styles.formField}>
                <Text style={styles.formLabel}>Phạt</Text>
                <TextInput
                  style={styles.formInput}
                  value={String(staffForm.employmentInfo.penalty || 0)}
                  onChangeText={text =>
                    setStaffForm(prev => ({
                      ...prev,
                      employmentInfo: { ...prev.employmentInfo, penalty: parseNumber(text) },
                    }))
                  }
                  keyboardType="numeric"
                />
              </View>
              <View style={styles.formField}>
                <Text style={styles.formLabel}>Thưởng</Text>
                <TextInput
                  style={styles.formInput}
                  value={String(staffForm.employmentInfo.bonus || 0)}
                  onChangeText={text =>
                    setStaffForm(prev => ({
                      ...prev,
                      employmentInfo: { ...prev.employmentInfo, bonus: parseNumber(text) },
                    }))
                  }
                  keyboardType="numeric"
                />
              </View>
              <View style={styles.formField}>
                <Text style={styles.formLabel}>Tạm ứng</Text>
                <TextInput
                  style={styles.formInput}
                  value={String(staffForm.employmentInfo.advancePayment || 0)}
                  onChangeText={text =>
                    setStaffForm(prev => ({
                      ...prev,
                      employmentInfo: { ...prev.employmentInfo, advancePayment: parseNumber(text) },
                    }))
                  }
                  keyboardType="numeric"
                />
              </View>
              <View style={styles.formField}>
                <Text style={styles.formLabel}>Tài khoản ngân hàng</Text>
                <TextInput
                  style={styles.formInput}
                  value={staffForm.employmentInfo.bankAccount?.bankName || ''}
                  onChangeText={text =>
                    setStaffForm(prev => ({
                      ...prev,
                      employmentInfo: {
                        ...prev.employmentInfo,
                        bankAccount: { ...prev.employmentInfo.bankAccount, bankName: text },
                      },
                    }))
                  }
                  placeholder="Ngân hàng"
                />
                <TextInput
                  style={styles.formInput}
                  value={staffForm.employmentInfo.bankAccount?.accountNumber || ''}
                  onChangeText={text =>
                    setStaffForm(prev => ({
                      ...prev,
                      employmentInfo: {
                        ...prev.employmentInfo,
                        bankAccount: { ...prev.employmentInfo.bankAccount, accountNumber: text },
                      },
                    }))
                  }
                  placeholder="Số tài khoản"
                />
                <TextInput
                  style={styles.formInput}
                  value={staffForm.employmentInfo.bankAccount?.accountName || ''}
                  onChangeText={text =>
                    setStaffForm(prev => ({
                      ...prev,
                      employmentInfo: {
                        ...prev.employmentInfo,
                        bankAccount: { ...prev.employmentInfo.bankAccount, accountName: text },
                      },
                    }))
                  }
                  placeholder="Tên chủ tài khoản"
                />
              </View>
              <View style={styles.formField}>
                <Text style={styles.formLabel}>Mã số thuế</Text>
                <TextInput
                  style={styles.formInput}
                  value={staffForm.employmentInfo.taxId || ''}
                  onChangeText={text =>
                    setStaffForm(prev => ({
                      ...prev,
                      employmentInfo: { ...prev.employmentInfo, taxId: text },
                    }))
                  }
                  placeholder="Mã số thuế"
                />
              </View>

              <Text style={styles.formSectionTitle}>Quyền hạn</Text>
              <View style={styles.chipRow}>
                {PERMISSION_OPTIONS.map(option => {
                  const isActive = staffForm.permissions.includes(option.value);
                  return (
                    <TouchableOpacity
                      key={option.value}
                      style={[styles.chip, isActive && styles.chipActive]}
                      onPress={() => {
                        setStaffForm(prev => ({
                          ...prev,
                          permissions: isActive
                            ? prev.permissions.filter(item => item !== option.value)
                            : [...prev.permissions, option.value],
                        }));
                      }}
                    >
                      <Text style={[styles.chipText, isActive && styles.chipTextActive]}>
                        {option.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <Text style={styles.formSectionTitle}>Lịch làm việc</Text>
              {staffForm.schedule.map((item, index) => (
                <View key={`${item.date}-${index}`} style={styles.scheduleFormCard}>
                  <View style={styles.formField}>
                    <Text style={styles.formLabel}>Ngày</Text>
                    <TextInput
                      style={styles.formInput}
                      value={item.date}
                      onChangeText={text => updateScheduleItem(index, { ...item, date: text })}
                      placeholder="YYYY-MM-DD"
                    />
                  </View>
                  <View style={styles.formField}>
                    <Text style={styles.formLabel}>Ca</Text>
                    <View style={styles.chipRow}>
                      {SHIFT_OPTIONS.map(option => (
                        <TouchableOpacity
                          key={option.value}
                          style={[
                            styles.chipSmall,
                            item.shift === option.value && styles.chipActive,
                          ]}
                          onPress={() => updateScheduleItem(index, { ...item, shift: option.value as StaffSchedule['shift'] })}
                        >
                          <Text
                            style={[
                              styles.chipText,
                              item.shift === option.value && styles.chipTextActive,
                            ]}
                          >
                            {option.label}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                  <View style={styles.formField}>
                    <Text style={styles.formLabel}>Giờ bắt đầu</Text>
                    <TextInput
                      style={styles.formInput}
                      value={item.startTime || ''}
                      onChangeText={text => updateScheduleItem(index, { ...item, startTime: text })}
                      placeholder="08:00"
                    />
                  </View>
                  <View style={styles.formField}>
                    <Text style={styles.formLabel}>Giờ kết thúc</Text>
                    <TextInput
                      style={styles.formInput}
                      value={item.endTime || ''}
                      onChangeText={text => updateScheduleItem(index, { ...item, endTime: text })}
                      placeholder="16:00"
                    />
                  </View>
                  <View style={styles.formField}>
                    <Text style={styles.formLabel}>Trạng thái</Text>
                    <View style={styles.chipRow}>
                      {SCHEDULE_STATUS_OPTIONS.map(option => (
                        <TouchableOpacity
                          key={option.value}
                          style={[
                            styles.chipSmall,
                            item.status === option.value && styles.chipActive,
                          ]}
                          onPress={() =>
                            updateScheduleItem(index, {
                              ...item,
                              status: option.value as StaffSchedule['status'],
                            })
                          }
                        >
                          <Text
                            style={[
                              styles.chipText,
                              item.status === option.value && styles.chipTextActive,
                            ]}
                          >
                            {option.label}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                  <TouchableOpacity style={styles.removeButton} onPress={() => removeScheduleItem(index)}>
                    <Text style={styles.removeButtonText}>Xóa ca làm</Text>
                  </TouchableOpacity>
                </View>
              ))}
              <TouchableOpacity style={styles.addScheduleButton} onPress={addScheduleItem}>
                <Plus size={16} color="#0ea5e9" />
                <Text style={styles.addScheduleText}>Thêm ca làm</Text>
              </TouchableOpacity>

              <Text style={styles.formSectionTitle}>Ghi chú</Text>
              <TextInput
                style={[styles.formInput, styles.textArea]}
                value={staffForm.notes}
                onChangeText={text => setStaffForm(prev => ({ ...prev, notes: text }))}
                placeholder="Ghi chú thêm"
                multiline
              />

              <TouchableOpacity style={styles.submitButton} onPress={handleSaveStaff}>
                <Text style={styles.submitButtonText}>
                  {staffFormMode === 'create' ? 'Thêm nhân viên' : 'Lưu thay đổi'}
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
      <Modal
        visible={userModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setUserModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.userModalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Chọn tài khoản</Text>
              <TouchableOpacity onPress={() => setUserModalVisible(false)}>
                <X size={24} color={Colors.light.text} />
              </TouchableOpacity>
            </View>
            <View style={styles.searchBox}>
              <Search size={18} color={Colors.light.textSecondary} />
              <TextInput
                style={styles.searchInput}
                placeholder="Tìm theo tên, email hoặc vai trò"
                value={userSearch}
                onChangeText={setUserSearch}
              />
            </View>
            <ScrollView style={styles.userList} showsVerticalScrollIndicator={false}>
              {filteredUsers.map(userItem => (
                <TouchableOpacity
                  key={getUserId(userItem)}
                  style={styles.userItem}
                  onPress={() => {
                    setStaffForm(prev => ({ ...prev, userId: getUserId(userItem) }));
                    setUserModalVisible(false);
                    setUserSearch('');
                  }}
                >
                  <View style={styles.userItemContent}>
                    <Text style={styles.userName}>{getUserLabel(userItem)}</Text>
                    <Text style={styles.userMeta}>
                      {userItem.email || ''} {userItem.role ? `• ${userItem.role}` : ''}
                    </Text>
                  </View>
                  {staffForm.userId === getUserId(userItem) && (
                    <View style={styles.userSelectedBadge}>
                      <Text style={styles.userSelectedText}>Đã chọn</Text>
                    </View>
                  )}
                </TouchableOpacity>
              ))}
              {filteredUsers.length === 0 && (
                <View style={styles.userEmpty}>
                  <Text style={styles.emptyText}>Không có tài khoản phù hợp</Text>
                </View>
              )}
            </ScrollView>
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
  detailSection: {
    marginTop: 20,
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    padding: 12,
  },
  detailSectionTitle: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.light.text,
    marginBottom: 10,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
    gap: 12,
  },
  detailLabel: {
    fontSize: 12,
    color: Colors.light.textSecondary,
    flex: 1,
  },
  detailValue: {
    fontSize: 12,
    fontWeight: '500' as const,
    color: Colors.light.text,
    flex: 1,
    textAlign: 'right',
  },
  permissionContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  permissionChip: {
    backgroundColor: '#e0f2fe',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  permissionChipText: {
    fontSize: 12,
    color: '#0284c7',
    fontWeight: '500' as const,
  },
  scheduleRow: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 10,
    marginBottom: 8,
    gap: 4,
  },
  scheduleDate: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: Colors.light.text,
  },
  scheduleShift: {
    fontSize: 12,
    color: Colors.light.textSecondary,
  },
  scheduleTime: {
    fontSize: 12,
    color: Colors.light.text,
  },
  scheduleStatus: {
    fontSize: 12,
    color: Colors.light.textSecondary,
  },
  detailNote: {
    fontSize: 13,
    color: Colors.light.text,
    lineHeight: 18,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
  actionButton: {
    flex: 1,
    backgroundColor: '#0ea5e9',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  actionButtonText: {
    color: '#fff',
    fontWeight: '600' as const,
    fontSize: 14,
  },
  actionButtonDanger: {
    backgroundColor: '#fee2e2',
  },
  actionButtonDangerText: {
    color: '#ef4444',
  },
  formModalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 30,
    maxHeight: '90%',
  },
  formSectionTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.light.text,
    marginTop: 12,
    marginBottom: 10,
  },
  formField: {
    marginBottom: 12,
  },
  formLabel: {
    fontSize: 12,
    color: Colors.light.textSecondary,
    marginBottom: 6,
  },
  formInput: {
    backgroundColor: '#f9fafb',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: Colors.light.text,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    marginBottom: 8,
  },
  inputDisabled: {
    backgroundColor: '#f3f4f6',
    color: Colors.light.textSecondary,
  },
  selectBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f9fafb',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  selectBoxDisabled: {
    backgroundColor: '#f3f4f6',
  },
  selectText: {
    fontSize: 14,
    color: Colors.light.text,
    flex: 1,
    marginRight: 8,
  },
  selectTextDisabled: {
    color: Colors.light.textSecondary,
  },
  helperText: {
    fontSize: 12,
    color: Colors.light.textSecondary,
    marginTop: 6,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: '#f3f4f6',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  chipSmall: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
    backgroundColor: '#f3f4f6',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  chipActive: {
    backgroundColor: '#0ea5e9',
    borderColor: '#0ea5e9',
  },
  chipText: {
    fontSize: 12,
    fontWeight: '500' as const,
    color: Colors.light.textSecondary,
  },
  chipTextActive: {
    color: '#fff',
  },
  scheduleFormCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    marginBottom: 12,
  },
  removeButton: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#fee2e2',
  },
  removeButtonText: {
    color: '#ef4444',
    fontSize: 12,
    fontWeight: '600' as const,
  },
  addScheduleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#0ea5e9',
    justifyContent: 'center',
    marginBottom: 16,
  },
  addScheduleText: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: '#0ea5e9',
  },
  textArea: {
    minHeight: 90,
    textAlignVertical: 'top',
  },
  submitButton: {
    backgroundColor: '#0ea5e9',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 20,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600' as const,
  },
  userModalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 30,
    maxHeight: '85%',
  },
  userList: {
    marginTop: 12,
  },
  userItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  userItemContent: {
    flex: 1,
    marginRight: 12,
  },
  userName: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.light.text,
  },
  userMeta: {
    fontSize: 12,
    color: Colors.light.textSecondary,
    marginTop: 4,
  },
  userSelectedBadge: {
    backgroundColor: '#e0f2fe',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  userSelectedText: {
    fontSize: 11,
    color: '#0284c7',
    fontWeight: '600' as const,
  },
  userEmpty: {
    paddingVertical: 20,
    alignItems: 'center',
  },
});
