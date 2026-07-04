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
import { useTheme } from '@/contexts/ThemeContext';
import { useHotel } from '@/contexts/HotelContext';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
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
  const { isDark, colors } = useTheme();
  const { user, isAdmin, isBusiness } = useAuth();
  const { language } = useLanguage();
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
  const isVi = language === 'vi';
  const text = useMemo(() => ({
    active: isVi ? 'Dang lam' : 'Active',
    onLeave: isVi ? 'Nghi phep' : 'On leave',
    terminated: isVi ? 'Nghi viec' : 'Terminated',
    all: isVi ? 'Tat ca' : 'All',
    management: isVi ? 'Quan ly' : 'Management',
    reception: isVi ? 'Le tan' : 'Reception',
    housekeeping: isVi ? 'Buong phong' : 'Housekeeping',
    kitchen: isVi ? 'Bep' : 'Kitchen',
    security: isVi ? 'Bao ve' : 'Security',
    manager: isVi ? 'Quan ly' : 'Manager',
    receptionist: isVi ? 'Le tan' : 'Receptionist',
    housekeeper: isVi ? 'Buong phong' : 'Housekeeper',
    maintenance: isVi ? 'Bao tri' : 'Maintenance',
    other: isVi ? 'Khac' : 'Other',
    male: isVi ? 'Nam' : 'Male',
    female: isVi ? 'Nu' : 'Female',
    view: isVi ? 'Xem' : 'View',
    create: isVi ? 'Tao' : 'Create',
    edit: isVi ? 'Sua' : 'Edit',
    delete: isVi ? 'Xoa' : 'Delete',
    manageRooms: isVi ? 'Quan ly phong' : 'Manage rooms',
    manageBookings: isVi ? 'Quan ly dat phong' : 'Manage bookings',
    morning: isVi ? 'Ca sang' : 'Morning shift',
    afternoon: isVi ? 'Ca chieu' : 'Afternoon shift',
    night: isVi ? 'Ca toi' : 'Night shift',
    fullDay: isVi ? 'Ca ngay' : 'Full day',
    scheduled: isVi ? 'Da len lich' : 'Scheduled',
    completed: isVi ? 'Hoan thanh' : 'Completed',
    absent: isVi ? 'Vang mat' : 'Absent',
    late: isVi ? 'Di muon' : 'Late',
    success: isVi ? 'Thanh cong' : 'Success',
    notice: isVi ? 'Thong bao' : 'Notice',
    confirm: isVi ? 'Xac nhan' : 'Confirm',
    paySuccess: isVi ? 'Da thanh toan luong thanh cong' : 'Salary paid successfully',
    addFailed: isVi ? 'Khong the them nhan vien' : 'Unable to add staff',
    addSuccess: isVi ? 'Da them nhan vien' : 'Staff added',
    updateFailed: isVi ? 'Khong the cap nhat nhan vien' : 'Unable to update staff',
    updateSuccess: isVi ? 'Da cap nhat nhan vien' : 'Staff updated',
    deleteFailed: isVi ? 'Khong the xoa nhan vien' : 'Unable to delete staff',
    deleteSuccess: isVi ? 'Da xoa nhan vien' : 'Staff deleted',
    confirmPaySalary: isVi ? 'Ban co chac muon thanh toan luong cho nhan vien nay?' : 'Do you want to pay salary for this staff?',
    cancel: isVi ? 'Huy' : 'Cancel',
    pay: isVi ? 'Thanh toan' : 'Pay',
    noPermission: isVi ? 'Ban khong co quyen thuc hien thao tac nay' : 'You do not have permission for this action',
    selectHotelFirst: isVi ? 'Vui long chon khach san truoc' : 'Please select a hotel first',
    noAvailableAccount: isVi ? 'Khong co tai khoan kha dung de gan' : 'No available accounts to assign',
    chooseAccount: isVi ? 'Vui long chon tai khoan' : 'Please select an account',
    invalidAccount: isVi ? 'Tai khoan da duoc gan hoac khong hop le' : 'Account is already assigned or invalid',
    hotelRequired: isVi ? 'Vui long chon khach san' : 'Please select a hotel',
    nameRequired: isVi ? 'Vui long nhap ho va ten' : 'Please enter first and last name',
    phoneRequired: isVi ? 'Vui long nhap so dien thoai' : 'Please enter a phone number',
    confirmDeleteStaff: (name: string) => isVi
      ? (name ? `Ban co chac muon xoa nhan vien ${name}?` : 'Ban co chac muon xoa nhan vien nay?')
      : (name ? `Do you want to delete staff ${name}?` : 'Do you want to delete this staff?'),
    title: isVi ? 'Nhan vien' : 'Staffs',
    total: isVi ? 'Tong so' : 'Total',
    list: isVi ? 'Danh sach' : 'List',
    salary: isVi ? 'Luong' : 'Salary',
    searchStaff: isVi ? 'Tim kiem nhan vien...' : 'Search staffs...',
    notFound: isVi ? 'Khong tim thay nhan vien' : 'No staffs found',
    salaryFund: isVi ? 'Tong quy luong' : 'Total salary fund',
    pendingPayment: isVi ? 'Cho thanh toan' : 'Pending payment',
    month: isVi ? 'Thang' : 'Month',
    basicSalary: isVi ? 'Luong co ban' : 'Base salary',
    bonus: isVi ? 'Thuong' : 'Bonus',
    deduction: isVi ? 'Khau tru' : 'Deduction',
    netSalary: isVi ? 'Thuc lanh' : 'Net salary',
    noPendingSalary: isVi ? 'Khong co luong cho thanh toan' : 'No pending salaries',
    staffInfo: isVi ? 'Thong tin nhan vien' : 'Staff details',
    position: isVi ? 'Chuc vu' : 'Position',
    phone: isVi ? 'Dien thoai' : 'Phone',
    email: 'Email',
    startDate: isVi ? 'Ngay bat dau' : 'Start date',
    personalInfo: isVi ? 'Thong tin ca nhan' : 'Personal information',
    firstName: isVi ? 'Ho' : 'First name',
    lastName: isVi ? 'Ten' : 'Last name',
    gender: isVi ? 'Gioi tinh' : 'Gender',
    nationality: isVi ? 'Quoc tich' : 'Nationality',
    documentNumber: isVi ? 'So giay to' : 'Document number',
    contactInfo: isVi ? 'Thong tin lien he' : 'Contact information',
    address: isVi ? 'Dia chi' : 'Address',
    emergencyContact: isVi ? 'Lien he khan' : 'Emergency contact',
    permissions: isVi ? 'Quyen han' : 'Permissions',
    schedule: isVi ? 'Lich lam viec' : 'Work schedule',
    notes: isVi ? 'Ghi chu' : 'Notes',
    editStaff: isVi ? 'Chinh sua' : 'Edit',
    addStaff: isVi ? 'Them nhan vien' : 'Add staff',
    updateStaff: isVi ? 'Cap nhat nhan vien' : 'Update staff',
    account: isVi ? 'Tai khoan' : 'Account',
    accountHelperLocked: isVi ? 'Khong the doi tai khoan khi chinh sua' : 'Account cannot be changed while editing',
    accountHelperAvailable: (count: number) => isVi ? `Co ${count} tai khoan kha dung` : `${count} accounts available`,
    accountHelperNone: isVi ? 'Khong co tai khoan kha dung' : 'No available accounts',
    chooseUser: isVi ? 'Chon tai khoan' : 'Select account',
    searchUser: isVi ? 'Tim theo ten, email hoac vai tro' : 'Search by name, email, or role',
    selected: isVi ? 'Da chon' : 'Selected',
    noMatchingUser: isVi ? 'Khong co tai khoan phu hop' : 'No matching accounts',
    saveChanges: isVi ? 'Luu thay doi' : 'Save changes',
    addShift: isVi ? 'Them ca lam' : 'Add shift',
    removeShift: isVi ? 'Xoa ca lam' : 'Remove shift',
  }), [isVi]);

  const { data: staffs = [], isLoading: staffsLoading, refetch: refetchStaffs } = useQuery({
    queryKey: ['staffs', selectedHotelId],
    queryFn: () => staffsApi.getAll(selectedHotelId || undefined),
  });

  const { data: salaryRecords = [], isLoading: salaryLoading, refetch: refetchSalary } = useQuery({
    queryKey: ['salaryRecords', selectedHotelId],
    queryFn: () => staffsApi.getSalaryRecords(),
  });

  const getUserId = (userItem: ApiUser) => userItem._id || (userItem as { id?: string }).id || '';
  const getUserLabel = (userItem: ApiUser) =>
    userItem.fullName || userItem.name || userItem.email || getUserId(userItem);

  const canManageStaff =
    isAdmin ||
    isBusiness ||
    user?.role === 'manager' ||
    user?.role === 'hotel_manager';

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
      queryClient.invalidateQueries({ queryKey: ['salaryRecords', selectedHotelId] });
      Alert.alert(text.success, text.paySuccess);
    },
  });

  const createStaffMutation = useMutation({
    mutationFn: (payload: Omit<Staff, 'id'>) => staffsApi.create(payload),
    onSuccess: result => {
      if (!result) {
        Alert.alert(text.notice, text.addFailed);
        return;
      }
      queryClient.invalidateQueries({ queryKey: ['staffs'] });
      setStaffFormVisible(false);
      Alert.alert(text.notice, text.addSuccess);
    },
    onError: () => {
      Alert.alert(text.notice, text.addFailed);
    },
  });

  const updateStaffMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<Staff> }) =>
      staffsApi.update(id, payload),
    onSuccess: result => {
      if (!result) {
        Alert.alert(text.notice, text.updateFailed);
        return;
      }
      queryClient.invalidateQueries({ queryKey: ['staffs'] });
      setStaffFormVisible(false);
      Alert.alert(text.notice, text.updateSuccess);
    },
    onError: () => {
      Alert.alert(text.notice, text.updateFailed);
    },
  });

  const deleteStaffMutation = useMutation({
    mutationFn: (id: string) => staffsApi.delete(id),
    onSuccess: result => {
      if (!result) {
        Alert.alert(text.notice, text.deleteFailed);
        return;
      }
      queryClient.invalidateQueries({ queryKey: ['staffs'] });
      setStaffModalVisible(false);
      Alert.alert(text.notice, text.deleteSuccess);
    },
    onError: () => {
      Alert.alert(text.notice, text.deleteFailed);
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
  const normalizeStaffStatus = (value?: string): StaffEmploymentInfo['status'] => {
    if (value === 'inactive') return 'terminated';
    if (value === 'active' || value === 'on_leave' || value === 'terminated') return value;
    return 'active';
  };

  const getStaffStatus = (staff: Staff) =>
    normalizeStaffStatus(staff.employmentInfo?.status || staff.status);
  const statusLabels = useMemo(() => ({
    active: text.active,
    on_leave: text.onLeave,
    terminated: text.terminated,
  }), [text.active, text.onLeave, text.terminated]);
  const departments = useMemo(() => ([
    { id: 'all', name: text.all },
    { id: 'management', name: text.management },
    { id: 'reception', name: text.reception },
    { id: 'housekeeping', name: text.housekeeping },
    { id: 'kitchen', name: text.kitchen },
    { id: 'security', name: text.security },
  ]), [text]);
  const positionOptions = useMemo(() => ([
    { value: 'manager', label: text.manager },
    { value: 'receptionist', label: text.receptionist },
    { value: 'housekeeper', label: text.housekeeper },
    { value: 'maintenance', label: text.maintenance },
    { value: 'other', label: text.other },
  ]), [text]);
  const statusOptions = useMemo(() => ([
    { value: 'active', label: text.active },
    { value: 'on_leave', label: text.onLeave },
    { value: 'terminated', label: text.terminated },
  ]), [text]);
  const genderOptions = useMemo(() => ([
    { value: 'male', label: text.male },
    { value: 'female', label: text.female },
    { value: 'other', label: text.other },
  ]), [text]);
  const permissionOptions: { value: StaffPermission; label: string }[] = useMemo(() => ([
    { value: 'view', label: text.view },
    { value: 'create', label: text.create },
    { value: 'edit', label: text.edit },
    { value: 'delete', label: text.delete },
    { value: 'manage_rooms', label: text.manageRooms },
    { value: 'manage_bookings', label: text.manageBookings },
  ]), [text]);
  const shiftOptions = useMemo(() => ([
    { value: 'morning', label: text.morning },
    { value: 'afternoon', label: text.afternoon },
    { value: 'night', label: text.night },
    { value: 'full-day', label: text.fullDay },
  ]), [text]);
  const scheduleStatusOptions = useMemo(() => ([
    { value: 'scheduled', label: text.scheduled },
    { value: 'completed', label: text.completed },
    { value: 'absent', label: text.absent },
    { value: 'late', label: text.late },
  ]), [text]);

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
    return new Intl.NumberFormat(isVi ? 'vi-VN' : 'en-US', {
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
      text.confirm,
      text.confirmPaySalary,
      [
        { text: text.cancel, style: 'cancel' },
        {
          text: text.pay,
          onPress: () => paySalaryMutation.mutate({ staffId, recordId }),
        },
      ]
    );
  };

  const activeStaffs = staffs.filter(s => getStaffStatus(s) === 'active').length;
  const onLeaveStaffs = staffs.filter(s => getStaffStatus(s) === 'on_leave').length;
  const totalSalary = staffs.reduce((sum, s) => sum + (s.employmentInfo?.salary || s.salary || 0), 0);

  const filteredSalaryRecords = useMemo(() => 
    salaryRecords.filter(r => staffs.some(staff => staff.id === r.staffId)),
    [salaryRecords, staffs]
  );
  const pendingSalaryRecords = useMemo(() => 
    filteredSalaryRecords.filter(r => r.status === 'pending'),
    [filteredSalaryRecords]
  );

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
      Alert.alert(text.notice, text.noPermission);
      return;
    }
    if (!selectedHotelId) {
      Alert.alert(text.notice, text.selectHotelFirst);
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
        text.notice,
        staffFormMode === 'create' && availableUsers.length === 0
          ? text.noAvailableAccount
          : text.chooseAccount
      );
      return;
    }
    if (
      staffFormMode === 'create' &&
      !availableUsers.some(userItem => getUserId(userItem) === staffForm.userId)
    ) {
      Alert.alert(text.notice, text.invalidAccount);
      return;
    }
    if (!staffForm.hotelId) {
      Alert.alert(text.notice, text.hotelRequired);
      return;
    }
    if (!staffForm.personalInfo.firstName.trim() || !staffForm.personalInfo.lastName.trim()) {
      Alert.alert(text.notice, text.nameRequired);
      return;
    }
    if (!staffForm.contactInfo.phone?.trim()) {
      Alert.alert(text.notice, text.phoneRequired);
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
      Alert.alert(text.notice, text.noPermission);
      return;
    }
    const staffName = getStaffName(selectedStaff);
    Alert.alert(
      text.confirm,
      text.confirmDeleteStaff(staffName),
      [
        { text: text.cancel, style: 'cancel' },
        { text: text.delete, style: 'destructive', onPress: () => deleteStaffMutation.mutate(selectedStaff.id) },
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
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <LinearGradient
        colors={isDark ? ['#0f766e', '#14b8a6'] : ['#0f766e', '#14b8a6']}
        style={[styles.header, { paddingTop: insets.top + 12 }]}
      >
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>{text.title}</Text>
          {canManageStaff && (
            <TouchableOpacity style={styles.addButton} onPress={openCreateModal}>
              <Plus size={20} color="#fff" />
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{staffs.length}</Text>
            <Text style={styles.statLabel}>{text.total}</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{activeStaffs}</Text>
            <Text style={styles.statLabel}>{text.active}</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{onLeaveStaffs}</Text>
            <Text style={styles.statLabel}>{text.onLeave}</Text>
          </View>
        </View>

        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'staffs' && [styles.tabActive, { backgroundColor: colors.cardBackground }]]}
            onPress={() => setActiveTab('staffs')}
          >
            <Text style={[styles.tabText, activeTab === 'staffs' && [styles.tabTextActive, { color: colors.tint }]]}>
              {text.list}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'salary' && [styles.tabActive, { backgroundColor: colors.cardBackground }]]}
            onPress={() => setActiveTab('salary')}
          >
            <Text style={[styles.tabText, activeTab === 'salary' && [styles.tabTextActive, { color: colors.tint }]]}>
              {text.salary}
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
              <View style={[styles.searchBox, { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder }]}>
                <Search size={18} color={colors.textSecondary} />
                <TextInput
                  style={[styles.searchInput, { color: colors.text }]}
                  placeholder={text.searchStaff}
                  placeholderTextColor={colors.textSecondary}
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
              {departments.map(dept => (
                <TouchableOpacity
                  key={dept.id}
                  style={[
                    styles.departmentChip,
                    { backgroundColor: colors.cardBackground, borderColor: colors.border },
                    selectedDepartment === dept.id && [styles.departmentChipActive, { backgroundColor: colors.tint, borderColor: colors.tint }],
                  ]}
                  onPress={() => setSelectedDepartment(dept.id)}
                >
                  <Text
                    style={[
                      styles.departmentChipText,
                      { color: colors.textSecondary },
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
                  style={[styles.staffCard, { backgroundColor: colors.cardBackground, borderColor: colors.border, shadowColor: isDark ? '#000' : '#000' }]}
                  onPress={() => {
                    setSelectedStaff(staff);
                    setStaffModalVisible(true);
                  }}
                >
                  <View style={styles.staffAvatar}>
                    {staff.avatar ? (
                      <Image source={{ uri: staff.avatar }} style={styles.avatarImage} />
                    ) : (
                      <View style={[styles.avatarPlaceholder, { backgroundColor: isDark ? '#1e3a5f' : '#e0f2fe' }]}>
                        <Text style={styles.avatarText}>
                          {getStaffName(staff).split(' ').pop()?.charAt(0) || 'N'}
                        </Text>
                      </View>
                    )}
                    <View
                      style={[
                        styles.statusIndicator,
                        { backgroundColor: STATUS_COLORS[getStaffStatus(staff)], borderColor: colors.cardBackground },
                      ]}
                    />
                  </View>

                  <View style={styles.staffInfo}>
                    <Text style={[styles.staffName, { color: colors.text }]}>{getStaffName(staff)}</Text>
                    <Text style={[styles.staffPosition, { color: colors.textSecondary }]}>
                      {positionOptions.find(option => option.value === getStaffPosition(staff))?.label || text.other}
                    </Text>
                    <View style={styles.staffMeta}>
                      <View style={styles.metaItem}>
                        <Phone size={12} color={colors.textSecondary} />
                        <Text style={[styles.metaText, { color: colors.textSecondary }]}>{getStaffPhone(staff)}</Text>
                      </View>
                    </View>
                  </View>

                  <ChevronRight size={20} color={colors.textSecondary} />
                </TouchableOpacity>
              ))}
            </View>

            {filteredStaffs.length === 0 && !isLoading && (
              <View style={styles.emptyState}>
                <Users size={48} color={colors.textSecondary} />
                <Text style={[styles.emptyText, { color: colors.textSecondary }]}>{text.notFound}</Text>
              </View>
            )}
          </>
        ) : (
          <View style={styles.salaryContainer}>
            <View style={styles.salaryOverview}>
              <View style={[styles.salaryOverviewCard, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
                <DollarSign size={24} color="#0ea5e9" />
                <Text style={[styles.salaryOverviewLabel, { color: colors.textSecondary }]}>{text.salaryFund}</Text>
                <Text style={[styles.salaryOverviewValue, { color: colors.text }]}>{formatCurrency(totalSalary)}</Text>
              </View>
            </View>

            <Text style={[styles.sectionTitle, { color: colors.text }]}>{text.pendingPayment}</Text>
            {pendingSalaryRecords.map(record => (
              <View key={`${record.staffId}-${record.id}`} style={[styles.salaryCard, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
                <View style={styles.salaryHeader}>
                  <View>
                    <Text style={[styles.salaryStaffName, { color: colors.text }]}>{record.staffName}</Text>
                    <Text style={[styles.salaryMonth, { color: colors.textSecondary }]}>{text.month} {record.month}</Text>
                  </View>
                  <View style={styles.salaryBadge}>
                    <Clock size={12} color="#f59e0b" />
                    <Text style={styles.salaryBadgeText}>{text.pendingPayment}</Text>
                  </View>
                </View>

                <View style={[styles.salaryDetails, { backgroundColor: isDark ? '#0f172a' : '#f8fafc' }]}>
                  <View style={styles.salaryRow}>
                    <Text style={[styles.salaryLabel, { color: colors.textSecondary }]}>{text.basicSalary}</Text>
                    <Text style={[styles.salaryValue, { color: colors.text }]}>{formatCurrency(record.baseSalary)}</Text>
                  </View>
                  <View style={styles.salaryRow}>
                    <Text style={[styles.salaryLabel, { color: colors.textSecondary }]}>{text.bonus}</Text>
                    <Text style={[styles.salaryValue, { color: '#10b981' }]}>
                      +{formatCurrency(record.bonus)}
                    </Text>
                  </View>
                  <View style={styles.salaryRow}>
                    <Text style={[styles.salaryLabel, { color: colors.textSecondary }]}>{text.deduction}</Text>
                    <Text style={[styles.salaryValue, { color: '#ef4444' }]}>
                      -{formatCurrency(record.deductions)}
                    </Text>
                  </View>
                  <View style={[styles.salaryRow, styles.salaryTotal, { borderTopColor: colors.border }]}>
                    <Text style={[styles.salaryTotalLabel, { color: colors.text }]}>{text.netSalary}</Text>
                    <Text style={styles.salaryTotalValue}>{formatCurrency(record.netSalary)}</Text>
                  </View>
                </View>

                <TouchableOpacity
                  style={styles.payButton}
                  onPress={() => handlePaySalary(record.staffId, record.id)}
                >
                  <Text style={styles.payButtonText}>{text.pay}</Text>
                </TouchableOpacity>
              </View>
            ))}

            {pendingSalaryRecords.length === 0 && !isLoading && (
              <View style={styles.emptyState}>
                <DollarSign size={48} color={colors.textSecondary} />
                <Text style={[styles.emptyText, { color: colors.textSecondary }]}>{text.noPendingSalary}</Text>
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
        <View style={[styles.modalOverlay, { backgroundColor: colors.overlay }]}>
          <View style={[styles.modalContent, { backgroundColor: colors.cardBackground }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>{text.staffInfo}</Text>
              <TouchableOpacity onPress={() => setStaffModalVisible(false)}>
                <X size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            {selectedStaff && (
              <>
                <ScrollView
                  style={styles.staffDetailScroll}
                  contentContainerStyle={{ paddingBottom: 16 }}
                  showsVerticalScrollIndicator={false}
                >
                  <View style={styles.staffDetail}>
                    <View style={styles.staffDetailHeader}>
                      <View style={styles.staffDetailAvatar}>
                        {selectedStaff.avatar ? (
                          <Image source={{ uri: selectedStaff.avatar }} style={styles.detailAvatarImage} />
                        ) : (
                          <View style={[styles.detailAvatarPlaceholder, { backgroundColor: isDark ? '#1e3a5f' : '#e0f2fe' }]}>
                            <Text style={styles.detailAvatarText}>
                              {getStaffName(selectedStaff).split(' ').pop()?.charAt(0) || 'N'}
                            </Text>
                          </View>
                        )}
                      </View>
                      <Text style={[styles.staffDetailName, { color: colors.text }]}>{getStaffName(selectedStaff)}</Text>
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
                          {statusLabels[getStaffStatus(selectedStaff)]}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.staffDetailInfo}>
                      <View style={styles.detailItem}>
                        <Briefcase size={18} color={colors.textSecondary} />
                        <View style={styles.detailItemContent}>
                          <Text style={[styles.detailItemLabel, { color: colors.textSecondary }]}>{text.position}</Text>
                          <Text style={[styles.detailItemValue, { color: colors.text }]}>
                            {positionOptions.find(option => option.value === getStaffPosition(selectedStaff))?.label || text.other}
                          </Text>
                        </View>
                      </View>
                      <View style={styles.detailItem}>
                        <Phone size={18} color={colors.textSecondary} />
                        <View style={styles.detailItemContent}>
                          <Text style={[styles.detailItemLabel, { color: colors.textSecondary }]}>{text.phone}</Text>
                          <Text style={[styles.detailItemValue, { color: colors.text }]}>{getStaffPhone(selectedStaff)}</Text>
                        </View>
                      </View>
                      <View style={styles.detailItem}>
                        <Mail size={18} color={colors.textSecondary} />
                        <View style={styles.detailItemContent}>
                          <Text style={[styles.detailItemLabel, { color: colors.textSecondary }]}>Email</Text>
                          <Text style={[styles.detailItemValue, { color: colors.text }]}>{getStaffEmail(selectedStaff) || '—'}</Text>
                        </View>
                      </View>
                      <View style={styles.detailItem}>
                        <Calendar size={18} color={colors.textSecondary} />
                        <View style={styles.detailItemContent}>
                          <Text style={[styles.detailItemLabel, { color: colors.textSecondary }]}>{text.startDate}</Text>
                          <Text style={[styles.detailItemValue, { color: colors.text }]}>
                            {selectedStaff.employmentInfo?.startDate || selectedStaff.startDate || '—'}
                          </Text>
                        </View>
                      </View>
                      <View style={styles.detailItem}>
                        <DollarSign size={18} color={colors.textSecondary} />
                        <View style={styles.detailItemContent}>
                          <Text style={[styles.detailItemLabel, { color: colors.textSecondary }]}>{text.salary}</Text>
                          <Text style={[styles.detailItemValue, { color: colors.text }]}>
                            {formatCurrency(selectedStaff.employmentInfo?.salary || selectedStaff.salary || 0)}
                          </Text>
                        </View>
                      </View>
                    </View>

                    <View style={[styles.detailSection, { backgroundColor: isDark ? '#0f172a' : '#f9fafb' }]}>
                      <Text style={[styles.detailSectionTitle, { color: colors.text }]}>{text.personalInfo}</Text>
                      <View style={styles.detailRow}>
                        <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>{text.firstName}</Text>
                        <Text style={[styles.detailValue, { color: colors.text }]}>{selectedStaff.personalInfo?.firstName || '—'}</Text>
                      </View>
                      <View style={styles.detailRow}>
                        <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>{text.lastName}</Text>
                        <Text style={[styles.detailValue, { color: colors.text }]}>{selectedStaff.personalInfo?.lastName || '—'}</Text>
                      </View>
                      <View style={styles.detailRow}>
                        <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>{text.gender}</Text>
                        <Text style={[styles.detailValue, { color: colors.text }]}>
                          {genderOptions.find(option => option.value === selectedStaff.personalInfo?.gender)?.label || '—'}
                        </Text>
                      </View>
                      <View style={styles.detailRow}>
                        <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>{text.nationality}</Text>
                        <Text style={[styles.detailValue, { color: colors.text }]}>{selectedStaff.personalInfo?.nationality || '—'}</Text>
                      </View>
                      <View style={styles.detailRow}>
                        <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>{text.documentNumber}</Text>
                        <Text style={[styles.detailValue, { color: colors.text }]}>{selectedStaff.personalInfo?.idNumber || '—'}</Text>
                      </View>
                    </View>

                    <View style={[styles.detailSection, { backgroundColor: isDark ? '#0f172a' : '#f9fafb' }]}>
                      <Text style={[styles.detailSectionTitle, { color: colors.text }]}>{text.contactInfo}</Text>
                      <View style={styles.detailRow}>
                        <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>{text.address}</Text>
                        <Text style={[styles.detailValue, { color: colors.text }]}>
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
                        <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>{text.emergencyContact}</Text>
                        <Text style={[styles.detailValue, { color: colors.text }]}>
                          {selectedStaff.contactInfo?.emergencyContact?.name || '—'}
                        </Text>
                      </View>
                    </View>

                    <View style={[styles.detailSection, { backgroundColor: isDark ? '#0f172a' : '#f9fafb' }]}>
                      <Text style={[styles.detailSectionTitle, { color: colors.text }]}>{text.permissions}</Text>
                      <View style={styles.permissionContainer}>
                        {(selectedStaff.permissions || ['view']).map(permission => (
                          <View key={permission} style={[styles.permissionChip, { backgroundColor: isDark ? '#1e3a5f' : '#e0f2fe' }]}>
                            <Text style={styles.permissionChipText}>
                              {permissionOptions.find(option => option.value === permission)?.label || permission}
                            </Text>
                          </View>
                        ))}
                      </View>
                    </View>

                    {selectedStaff.schedule && selectedStaff.schedule.length > 0 && (
                      <View style={[styles.detailSection, { backgroundColor: isDark ? '#0f172a' : '#f9fafb' }]}>
                        <Text style={[styles.detailSectionTitle, { color: colors.text }]}>{text.schedule}</Text>
                        {selectedStaff.schedule.map((item, index) => (
                          <View key={`${item.date}-${index}`} style={[styles.scheduleRow, { backgroundColor: colors.cardBackground }]}>
                            <Text style={[styles.scheduleDate, { color: colors.text }]}>{item.date}</Text>
                            <Text style={[styles.scheduleShift, { color: colors.textSecondary }]}>
                              {shiftOptions.find(option => option.value === item.shift)?.label || item.shift}
                            </Text>
                            <Text style={[styles.scheduleTime, { color: colors.text }]}>
                              {item.startTime && item.endTime ? `${item.startTime} - ${item.endTime}` : '—'}
                            </Text>
                            <Text style={[styles.scheduleStatus, { color: colors.textSecondary }]}>
                              {scheduleStatusOptions.find(option => option.value === item.status)?.label || item.status}
                            </Text>
                          </View>
                        ))}
                      </View>
                    )}

                    {!!selectedStaff.notes && (
                      <View style={[styles.detailSection, { backgroundColor: isDark ? '#0f172a' : '#f9fafb' }]}>
                        <Text style={[styles.detailSectionTitle, { color: colors.text }]}>{text.notes}</Text>
                        <Text style={[styles.detailNote, { color: colors.text }]}>{selectedStaff.notes}</Text>
                      </View>
                    )}
                  </View>
                </ScrollView>

                {canManageStaff && (
                  <View style={styles.modalActions}>
                    <TouchableOpacity
                      style={styles.actionButton}
                      onPress={() => {
                        setStaffModalVisible(false);
                        openEditModal(selectedStaff);
                      }}
                    >
                      <Text style={styles.actionButtonText}>{text.editStaff}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.actionButton, styles.actionButtonDanger]} onPress={handleDeleteStaff}>
                      <Text style={[styles.actionButtonText, styles.actionButtonDangerText]}>{text.delete}</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </>
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
        <View style={[styles.modalOverlay, { backgroundColor: colors.overlay }]}>
          <View style={[styles.formModalContent, { backgroundColor: colors.cardBackground }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                {staffFormMode === 'create' ? text.addStaff : text.updateStaff}
              </Text>
              <TouchableOpacity onPress={() => setStaffFormVisible(false)}>
                <X size={24} color={colors.text} />
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={[styles.formSectionTitle, { color: colors.text }]}>{text.account}</Text>
              <View style={styles.formField}>
                <Text style={[styles.formLabel, { color: colors.textSecondary }]}>{text.account}</Text>
                <TouchableOpacity
                  style={[
                    styles.selectBox,
                    { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder },
                    staffFormMode === 'edit' && [styles.selectBoxDisabled, { backgroundColor: isDark ? '#0f172a' : '#f3f4f6' }],
                  ]}
                  onPress={() => {
                    if (staffFormMode === 'edit') return;
                    setUserModalVisible(true);
                  }}
                  disabled={staffFormMode === 'edit'}
                >
                  <Text style={[styles.selectText, { color: colors.text }, staffFormMode === 'edit' && { color: colors.textSecondary }]}>
                    {selectedUser
                      ? `${getUserLabel(selectedUser)} (${selectedUser.role || 'user'})`
                      : staffForm.userId || text.chooseUser}
                  </Text>
                  <ChevronRight size={18} color={colors.textSecondary} />
                </TouchableOpacity>
                <Text style={[styles.helperText, { color: colors.textSecondary }]}>
                  {staffFormMode === 'edit'
                    ? text.accountHelperLocked
                    : availableUsers.length > 0
                      ? text.accountHelperAvailable(availableUsers.length)
                      : text.accountHelperNone}
                </Text>
              </View>

              <Text style={[styles.formSectionTitle, { color: colors.text }]}>{text.personalInfo}</Text>
              <View style={styles.formField}>
                <Text style={[styles.formLabel, { color: colors.textSecondary }]}>{text.firstName}</Text>
                <TextInput
                  style={[styles.formInput, { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder, color: colors.text }]}
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
                <Text style={[styles.formLabel, { color: colors.textSecondary }]}>{text.lastName}</Text>
                <TextInput
                  style={[styles.formInput, { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder, color: colors.text }]}
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
                <Text style={[styles.formLabel, { color: colors.textSecondary }]}>{text.dob || 'Date of birth'}</Text>
                <TextInput
                  style={[styles.formInput, { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder, color: colors.text }]}
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
                <Text style={[styles.formLabel, { color: colors.textSecondary }]}>{text.gender}</Text>
                <View style={styles.chipRow}>
                  {genderOptions.map(option => (
                    <TouchableOpacity
                      key={option.value}
                      style={[
                        styles.chip,
                        { backgroundColor: isDark ? '#0f172a' : '#f3f4f6', borderColor: colors.border },
                        staffForm.personalInfo.gender === option.value && [styles.chipActive, { backgroundColor: colors.tint, borderColor: colors.tint }],
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
                          { color: colors.textSecondary },
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
                <Text style={[styles.formLabel, { color: colors.textSecondary }]}>{text.nationality}</Text>
                <TextInput
                  style={[styles.formInput, { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder, color: colors.text }]}
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
                <Text style={[styles.formLabel, { color: colors.textSecondary }]}>{text.documentNumber}</Text>
                <TextInput
                  style={[styles.formInput, { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder, color: colors.text }]}
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
                <Text style={[styles.formLabel, { color: colors.textSecondary }]}>{text.documentNumber}</Text>
                <TextInput
                  style={[styles.formInput, { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder, color: colors.text }]}
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
                <Text style={[styles.formLabel, { color: colors.textSecondary }]}>Hết hạn</Text>
                <TextInput
                  style={[styles.formInput, { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder, color: colors.text }]}
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

              <Text style={[styles.formSectionTitle, { color: colors.text }]}>{text.contactInfo}</Text>
              <View style={styles.formField}>
                <Text style={[styles.formLabel, { color: colors.textSecondary }]}>{text.phone}</Text>
                <TextInput
                  style={[styles.formInput, { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder, color: colors.text }]}
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
                <Text style={[styles.formLabel, { color: colors.textSecondary }]}>Email</Text>
                <TextInput
                  style={[styles.formInput, { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder, color: colors.text }]}
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
                <Text style={[styles.formLabel, { color: colors.textSecondary }]}>{text.address}</Text>
                <TextInput
                  style={[styles.formInput, { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder, color: colors.text }]}
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
                  style={[styles.formInput, { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder, color: colors.text }]}
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
                  style={[styles.formInput, { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder, color: colors.text }]}
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
                  style={[styles.formInput, { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder, color: colors.text }]}
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
                <Text style={[styles.formLabel, { color: colors.textSecondary }]}>{text.emergencyContact}</Text>
                <TextInput
                  style={[styles.formInput, { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder, color: colors.text }]}
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
                  style={[styles.formInput, { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder, color: colors.text }]}
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
                  style={[styles.formInput, { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder, color: colors.text }]}
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

              <Text style={[styles.formSectionTitle, { color: colors.text }]}>{text.position}</Text>
              <View style={styles.formField}>
                <Text style={[styles.formLabel, { color: colors.textSecondary }]}>{text.position}</Text>
                <View style={styles.chipRow}>
                  {positionOptions.map(option => (
                    <TouchableOpacity
                      key={option.value}
                      style={[
                        styles.chip,
                        { backgroundColor: isDark ? '#0f172a' : '#f3f4f6', borderColor: colors.border },
                        staffForm.employmentInfo.position === option.value && [styles.chipActive, { backgroundColor: colors.tint, borderColor: colors.tint }],
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
                          { color: colors.textSecondary },
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
                <Text style={[styles.formLabel, { color: colors.textSecondary }]}>{text.management}</Text>
                <TextInput
                  style={[styles.formInput, { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder, color: colors.text }]}
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
                <Text style={[styles.formLabel, { color: colors.textSecondary }]}>{text.active}</Text>
                <View style={styles.chipRow}>
                  {statusOptions.map(option => (
                    <TouchableOpacity
                      key={option.value}
                      style={[
                        styles.chip,
                        { backgroundColor: isDark ? '#0f172a' : '#f3f4f6', borderColor: colors.border },
                        staffForm.employmentInfo.status === option.value && [styles.chipActive, { backgroundColor: colors.tint, borderColor: colors.tint }],
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
                          { color: colors.textSecondary },
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
                <Text style={[styles.formLabel, { color: colors.textSecondary }]}>{text.startDate}</Text>
                <TextInput
                  style={[styles.formInput, { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder, color: colors.text }]}
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
                <Text style={[styles.formLabel, { color: colors.textSecondary }]}>{text.basicSalary}</Text>
                <TextInput
                  style={[styles.formInput, { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder, color: colors.text }]}
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
                <Text style={[styles.formLabel, { color: colors.textSecondary }]}>{isVi ? 'Phu cap' : 'Allowance'}</Text>
                <TextInput
                  style={[styles.formInput, { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder, color: colors.text }]}
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
                <Text style={[styles.formLabel, { color: colors.textSecondary }]}>{isVi ? 'Bao hiem' : 'Insurance'}</Text>
                <TextInput
                  style={[styles.formInput, { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder, color: colors.text }]}
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
                <Text style={[styles.formLabel, { color: colors.textSecondary }]}>{isVi ? 'Phat' : 'Penalty'}</Text>
                <TextInput
                  style={[styles.formInput, { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder, color: colors.text }]}
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
                <Text style={[styles.formLabel, { color: colors.textSecondary }]}>{text.bonus}</Text>
                <TextInput
                  style={[styles.formInput, { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder, color: colors.text }]}
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
                <Text style={[styles.formLabel, { color: colors.textSecondary }]}>{isVi ? 'Tam ung' : 'Advance payment'}</Text>
                <TextInput
                  style={[styles.formInput, { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder, color: colors.text }]}
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
                <Text style={[styles.formLabel, { color: colors.textSecondary }]}>{isVi ? 'Tai khoan ngan hang' : 'Bank account'}</Text>
                <TextInput
                  style={[styles.formInput, { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder, color: colors.text }]}
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
                  style={[styles.formInput, { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder, color: colors.text }]}
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
                  style={[styles.formInput, { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder, color: colors.text }]}
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
                <Text style={[styles.formLabel, { color: colors.textSecondary }]}>{isVi ? 'Ma so thue' : 'Tax ID'}</Text>
                <TextInput
                  style={[styles.formInput, { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder, color: colors.text }]}
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

              <Text style={[styles.formSectionTitle, { color: colors.text }]}>{text.permissions}</Text>
              <View style={styles.chipRow}>
                {permissionOptions.map(option => {
                  const isActive = staffForm.permissions.includes(option.value);
                  return (
                    <TouchableOpacity
                      key={option.value}
                      style={[styles.chip, { backgroundColor: isDark ? '#0f172a' : '#f3f4f6', borderColor: colors.border }, isActive && [styles.chipActive, { backgroundColor: colors.tint, borderColor: colors.tint }]]}
                      onPress={() => {
                        setStaffForm(prev => ({
                          ...prev,
                          permissions: isActive
                            ? prev.permissions.filter(item => item !== option.value)
                            : [...prev.permissions, option.value],
                        }));
                      }}
                    >
                      <Text style={[styles.chipText, { color: colors.textSecondary }, isActive && styles.chipTextActive]}>
                        {option.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <Text style={[styles.formSectionTitle, { color: colors.text }]}>{text.schedule}</Text>
              {staffForm.schedule.map((item, index) => (
                <View key={`${item.date}-${index}`} style={[styles.scheduleFormCard, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
                  <View style={styles.formField}>
                    <Text style={[styles.formLabel, { color: colors.textSecondary }]}>{isVi ? 'Ngay' : 'Date'}</Text>
                    <TextInput
                      style={[styles.formInput, { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder, color: colors.text }]}
                      value={item.date}
                      onChangeText={text => updateScheduleItem(index, { ...item, date: text })}
                      placeholder="YYYY-MM-DD"
                    />
                  </View>
                  <View style={styles.formField}>
                    <Text style={[styles.formLabel, { color: colors.textSecondary }]}>{isVi ? 'Ca' : 'Shift'}</Text>
                    <View style={styles.chipRow}>
                      {shiftOptions.map(option => (
                        <TouchableOpacity
                          key={option.value}
                          style={[
                            styles.chipSmall,
                            { backgroundColor: isDark ? '#0f172a' : '#f3f4f6', borderColor: colors.border },
                            item.shift === option.value && [styles.chipActive, { backgroundColor: colors.tint, borderColor: colors.tint }],
                          ]}
                          onPress={() => updateScheduleItem(index, { ...item, shift: option.value as StaffSchedule['shift'] })}
                        >
                          <Text
                            style={[
                              styles.chipText,
                              { color: colors.textSecondary },
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
                    <Text style={[styles.formLabel, { color: colors.textSecondary }]}>{isVi ? 'Gio bat dau' : 'Start time'}</Text>
                    <TextInput
                      style={[styles.formInput, { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder, color: colors.text }]}
                      value={item.startTime || ''}
                      onChangeText={text => updateScheduleItem(index, { ...item, startTime: text })}
                      placeholder="08:00"
                    />
                  </View>
                  <View style={styles.formField}>
                    <Text style={[styles.formLabel, { color: colors.textSecondary }]}>{isVi ? 'Gio ket thuc' : 'End time'}</Text>
                    <TextInput
                      style={[styles.formInput, { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder, color: colors.text }]}
                      value={item.endTime || ''}
                      onChangeText={text => updateScheduleItem(index, { ...item, endTime: text })}
                      placeholder="16:00"
                    />
                  </View>
                  <View style={styles.formField}>
                    <Text style={[styles.formLabel, { color: colors.textSecondary }]}>{isVi ? 'Trang thai' : 'Status'}</Text>
                    <View style={styles.chipRow}>
                      {scheduleStatusOptions.map(option => (
                        <TouchableOpacity
                          key={option.value}
                          style={[
                            styles.chipSmall,
                            { backgroundColor: isDark ? '#0f172a' : '#f3f4f6', borderColor: colors.border },
                            item.status === option.value && [styles.chipActive, { backgroundColor: colors.tint, borderColor: colors.tint }],
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
                              { color: colors.textSecondary },
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
                    <Text style={styles.removeButtonText}>{text.removeShift}</Text>
                  </TouchableOpacity>
                </View>
              ))}
              <TouchableOpacity style={styles.addScheduleButton} onPress={addScheduleItem}>
                <Plus size={16} color="#0ea5e9" />
                <Text style={styles.addScheduleText}>{text.addShift}</Text>
              </TouchableOpacity>

              <Text style={[styles.formSectionTitle, { color: colors.text }]}>{text.notes}</Text>
              <TextInput
                style={[styles.formInput, styles.textArea]}
                value={staffForm.notes}
                onChangeText={text => setStaffForm(prev => ({ ...prev, notes: text }))}
                placeholder="Ghi chú thêm"
                multiline
              />

              <TouchableOpacity style={styles.submitButton} onPress={handleSaveStaff}>
                <Text style={styles.submitButtonText}>
                  {staffFormMode === 'create' ? text.addStaff : text.saveChanges}
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
        <View style={[styles.modalOverlay, { backgroundColor: colors.overlay }]}>
          <View style={[styles.userModalContent, { backgroundColor: colors.cardBackground }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>{text.chooseUser}</Text>
              <TouchableOpacity onPress={() => setUserModalVisible(false)}>
                <X size={24} color={colors.text} />
              </TouchableOpacity>
            </View>
            <View style={[styles.searchBox, { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder }]}>
              <Search size={18} color={colors.textSecondary} />
              <TextInput
                style={[styles.searchInput, { color: colors.text }]}
                placeholder={text.searchUser}
                placeholderTextColor={colors.textSecondary}
                value={userSearch}
                onChangeText={setUserSearch}
              />
            </View>
            <ScrollView style={styles.userList} showsVerticalScrollIndicator={false}>
              {filteredUsers.map(userItem => (
                <TouchableOpacity
                  key={getUserId(userItem)}
                  style={[styles.userItem, { borderBottomColor: colors.border }]}
                  onPress={() => {
                    setStaffForm(prev => ({ ...prev, userId: getUserId(userItem) }));
                    setUserModalVisible(false);
                    setUserSearch('');
                  }}
                >
                  <View style={styles.userItemContent}>
                    <Text style={[styles.userName, { color: colors.text }]}>{getUserLabel(userItem)}</Text>
                    <Text style={[styles.userMeta, { color: colors.textSecondary }]}>
                      {userItem.email || ''} {userItem.role ? `• ${userItem.role}` : ''}
                    </Text>
                  </View>
                  {staffForm.userId === getUserId(userItem) && (
                    <View style={[styles.userSelectedBadge, { backgroundColor: isDark ? '#1e3a5f' : '#e0f2fe' }]}>
                      <Text style={styles.userSelectedText}>{text.selected}</Text>
                    </View>
                  )}
                </TouchableOpacity>
              ))}
              {filteredUsers.length === 0 && (
                <View style={styles.userEmpty}>
                  <Text style={[styles.emptyText, { color: colors.textSecondary }]}>{text.noMatchingUser}</Text>
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
    paddingBottom: 8,
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
    borderRadius: 14,
    padding: 18,
    marginBottom: 18,
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
    borderRadius: 14,
    padding: 4,
    marginBottom: -18,
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
    marginTop: 28,
    paddingHorizontal: 16,
  },
  searchContainer: {
    marginBottom: 14,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 10,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: Colors.light.text,
  },
  departmentsContainer: {
    marginBottom: 14,
  },
  departmentsContent: {
    gap: 8,
    paddingRight: 8,
  },
  departmentChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 18,
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
    gap: 10,
  },
  staffCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 2,
    elevation: 1,
  },
  staffAvatar: {
    position: 'relative',
    marginRight: 12,
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
    fontSize: 15,
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
    borderRadius: 14,
    padding: 18,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 2,
    elevation: 1,
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
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 2,
    elevation: 1,
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
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 12,
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
    padding: 20,
    paddingBottom: 36,
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
  staffDetailScroll: {
    flex: 1,
  },
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
