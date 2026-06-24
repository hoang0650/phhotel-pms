import React, { useState, useMemo, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  RefreshControl,
  Modal,
  Pressable,
  Alert,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  FlatList,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Search,
  BedDouble,
  User,
  Calendar,
  Sparkles,
  Wrench,
  CheckCircle,
  Grid3X3,
  List,
  LogIn,
  LogOut,
  ArrowRightLeft,
  Brush,
  X,
  AlertCircle,
  Phone,
  CreditCard,
  Users,
  Wifi,
  Wind,
  Tv,
  Coffee,
  Bath,
  ChevronDown,
  ChevronUp,
  PlusCircle,
  MinusCircle,
} from 'lucide-react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Colors from '@/constants/colors';
import { roomsApi, servicesApi, transactionsApi } from '@/services/api';
import { calculateRoomPriceLocal, calculateRoomTotalAmount } from '@/services/api/rooms';
import { Room, RoomStatus, Service } from '@/types/hotel';
import { useHotel } from '@/contexts/HotelContext';
import { useTheme } from '../../../contexts/ThemeContext';
import { useLanguage } from '../../../contexts/LanguageContext';  
import { useGuestDraftStore } from '@/stores/guestDraft';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const GRID_ITEM_WIDTH = (SCREEN_WIDTH - 60) / 2;

const statusConfig: Record<RoomStatus, { label: string; labelEn: string; color: string; icon: typeof CheckCircle }> = {
  vacant: { label: 'Trống', labelEn: 'Vacant', color: Colors.status.vacant, icon: CheckCircle },
  occupied: { label: 'Đang ở', labelEn: 'Occupied', color: Colors.status.occupied, icon: User },
  cleaning: { label: 'Dọn dẹp', labelEn: 'Cleaning', color: Colors.status.cleaning, icon: Sparkles },
  dirty: { label: 'Bẩn', labelEn: 'Dirty', color: Colors.status.dirty, icon: Brush },
  maintenance: { label: 'Bảo trì', labelEn: 'Maintenance', color: Colors.status.maintenance, icon: Wrench },
  booked: { label: 'Đã đặt', labelEn: 'Booked', color: Colors.status.booked, icon: Calendar },
};

const roomTypeLabels: Record<string, string> = {
  standard: 'Standard',
  deluxe: 'Deluxe',
  suite: 'Suite',
  presidential: 'Presidential',
};

const amenityIcons: Record<string, typeof Wifi> = {
  wifi: Wifi,
  'air-conditioning': Wind,
  tv: Tv,
  minibar: Coffee,
  bathtub: Bath,
};

type ViewMode = 'list' | 'grid';
type ModalMode = 'checkin' | 'checkout' | 'cleaning' | 'details' | 'transfer';
type RateType = 'hourly' | 'daily' | 'nightly' | 'weekly' | 'monthly';
type PaymentMethod = 'cash' | 'transfer' | 'card';

interface RoomSession {
  roomId: string;
  roomNumber: number;
  roomType: string;
  hotelId: string;
  guestInfo?: any;
  paymentMethod?: string;
  rateType?: string;
  advancePayment?: number;
  additionalCharges?: number;
  discount?: number;
  notes?: string;
  selectedServices: SelectedServiceItem[];
}

interface CheckInFormData {
  guestName: string;
  guestPhone: string;
  guestId: string;
  adults: number;
  children: number;
  rateType: RateType;
  paymentMethod: PaymentMethod;
  advancePayment: string;
  additionalCharges: string;
  discount: string;
  notes: string;
}

interface CheckOutFormData {
  guestName: string;
  guestPhone: string;
  guestId: string;
  rateType: RateType;
  paymentMethod: PaymentMethod;
  advancePayment: string;
  additionalCharges: string;
  discount: string;
  notes: string;
}

interface SelectedServiceItem {
  serviceId: string;
  serviceName: string;
  price: number;
  quantity: number;
  totalPrice: number;
}

export default function RoomsScreen() {
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const { selectedHotelId } = useHotel();
  const { isDark, colors } = useTheme();
  const { t, language } = useLanguage();
  const router = useRouter();
  const { assignRoomId } = useLocalSearchParams<{ assignRoomId?: string }>();
  const isCompactHeader = SCREEN_WIDTH < 380;

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<RoomStatus | 'all' | 'guest_out'>('all');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalMode, setModalMode] = useState<ModalMode>('details');
  const [transferTargetId, setTransferTargetId] = useState<string | null>(null);
  const [isIncomeModalVisible, setIncomeModalVisible] = useState(false);
  const [isExpenseModalVisible, setExpenseModalVisible] = useState(false);
  const [incomeAmount, setIncomeAmount] = useState('');
  const [incomeMethod, setIncomeMethod] = useState<'cash' | 'bank_transfer' | 'card' | 'other'>('cash');
  const [incomeCategory, setIncomeCategory] = useState<'service' | 'rental' | 'other'>('service');
  const [incomeDescription, setIncomeDescription] = useState('');
  const [incomePayer, setIncomePayer] = useState('');
  const [incomeNotes, setIncomeNotes] = useState('');
  const [expenseAmount, setExpenseAmount] = useState('');
  const [expenseMethod, setExpenseMethod] = useState<'cash' | 'bank_transfer' | 'card' | 'other'>('cash');
  const [expenseCategory, setExpenseCategory] = useState<'supplies' | 'utilities' | 'salary' | 'maintenance' | 'marketing' | 'other'>('supplies');
  const [expenseDescription, setExpenseDescription] = useState('');
  const [expenseRecipient, setExpenseRecipient] = useState('');
  const [expenseNotes, setExpenseNotes] = useState('');
  const [voucherSubmitting, setVoucherSubmitting] = useState(false);

  const [checkInForm, setCheckInForm] = useState<CheckInFormData>({
    guestName: '',
    guestPhone: '',
    guestId: '',
    adults: 1,
    children: 0,
    rateType: 'hourly',
    paymentMethod: 'cash',
    advancePayment: '',
    additionalCharges: '',
    discount: '',
    notes: '',
  });
  const [checkOutForm, setCheckOutForm] = useState<CheckOutFormData>({
    guestName: '',
    guestPhone: '',
    guestId: '',
    rateType: 'hourly',
    paymentMethod: 'cash',
    advancePayment: '',
    additionalCharges: '',
    discount: '',
    notes: '',
  });
  const [selectedServices, setSelectedServices] = useState<SelectedServiceItem[]>([]);
  const [isCheckoutServiceOpen, setIsCheckoutServiceOpen] = useState(false);
  const [selectedServiceId, setSelectedServiceId] = useState<string | null>(null);
  const [selectedServiceQuantity, setSelectedServiceQuantity] = useState(1);
  const [guestOutNote, setGuestOutNote] = useState('');
  const [guestOutModalVisible, setGuestOutModalVisible] = useState(false);
  const [guestReturnModalVisible, setGuestReturnModalVisible] = useState(false);

  const { 
  data: rooms = [], 
  isLoading: isRoomsLoading, 
  refetch: refetchRooms,
  isFetching: isRoomsFetching 
} = useQuery({
  queryKey: ['rooms', selectedHotelId], 
  queryFn: () => {
    // CHẶN ĐẦU: Nếu lỡ lọt lưới vào đây mà hotelId vẫn rỗng, trả về mảng rỗng ngay lập tức, không gọi lên server
    if (!selectedHotelId || selectedHotelId.trim() === '') {
      return [];
    }
    return roomsApi.getRoomsWithLiveSessions(selectedHotelId);
  },
  // ĐIỀU KIỆN QUAN TRỌNG: Chỉ bật query khi selectedHotelId không null, không undefined và không phải chuỗi rỗng
  enabled: !!selectedHotelId && selectedHotelId.trim() !== '',
  
  refetchInterval: 10000, 
  refetchIntervalInBackground: false,
});

// 1. QUERY: Lấy danh sách các phiên bản nháp (Sessions) từ Redis backend công khai an toàn
  const { data: roomSessions, refetch: refetchSessions } = useQuery({
    queryKey: ['roomSessions', selectedHotelId],
    // Giải pháp: Sử dụng toán tử rút gọn || '' để loại bỏ hoàn toàn lỗi Type 'null' is not assignable to type 'string'
    queryFn: () => roomsApi.getRoomSessions(selectedHotelId || ''), 
    enabled: !!selectedHotelId && selectedHotelId !== 'null' && selectedHotelId.trim() !== '', 
    refetchInterval: 15000, // Tần suất đồng bộ giãn cách tránh timeout
    retry: 1,
    refetchOnWindowFocus: false,
  });

  // 2. MUTATION: Khai báo hàm đẩy trạng thái đồng bộ lên Redis của Backend đúng chuẩn cấu trúc
  const syncSessionMutation = useMutation({
    mutationFn: (payload: { hotelId: string; roomId: string; sessionData: any }) => 
      roomsApi.updateRoomSession(payload),
  });

  // 3. EFFECT: Khôi phục tự động dữ liệu từ Web/Thiết bị khác đồng bộ sang Mobile khi mở Modal (Web -> Mobile)
  useEffect(() => {
    if (modalVisible && selectedRoom && modalMode === 'checkin' && roomSessions) {
      // Bọc an toàn để tương thích cả id hoặc _id tùy cấu trúc trả về từ backend
      const roomId = selectedRoom.id || (selectedRoom as any)._id || '';
      const currentSession = roomSessions[roomId];
      
      if (currentSession) {
        setCheckInForm(prev => ({
          ...prev,
          guestName: currentSession.guestInfo?.name || '',
          guestPhone: currentSession.guestInfo?.phone || '',
          guestId: currentSession.guestInfo?.idNumber || '',
          rateType: (currentSession.rateType as RateType) || 'hourly', // Khớp kiểu enum nghiêm ngặt
          paymentMethod: (currentSession.paymentMethod as PaymentMethod) || 'cash',
          advancePayment: currentSession.advancePayment?.toString() || '',
          additionalCharges: currentSession.additionalCharges?.toString() || '',
          discount: currentSession.discount?.toString() || '',
          notes: currentSession.notes || '',
        }));

        if (currentSession.selectedServices) {
          setSelectedServices(currentSession.selectedServices.map((s: any) => ({
            serviceId: s.serviceId || s.id || '',
            serviceName: s.serviceName || s.name || '',
            price: Number(s.price) || Number(s.unitPrice) || 0,
            quantity: Number(s.quantity) || 1,
            totalPrice: Number(s.totalPrice) || 0,
          })));
        }
      }
    }
  }, [modalVisible, selectedRoom, modalMode, roomSessions]);

  // 4. EFFECT: Lắng nghe thay đổi trên Form Mobile để tự động sync lên Cloud Redis qua Debounce (Mobile -> Web)
  useEffect(() => {
    if (modalVisible && selectedRoom && modalMode === 'checkin' && selectedHotelId) {
      const roomId = selectedRoom.id || (selectedRoom as any)._id || '';
      if (!roomId) return;

      const syncDebounceTimer = setTimeout(() => {
        const sessionPayload = {
          roomId: roomId,
          roomNumber: Number(selectedRoom.number) || 0,
          roomType: selectedRoom.roomType || '',
          hotelId: selectedHotelId,
          guestInfo: {
            name: checkInForm.guestName,
            phone: checkInForm.guestPhone,
            idNumber: checkInForm.guestId,
          },
          rateType: checkInForm.rateType,
          paymentMethod: checkInForm.paymentMethod,
          advancePayment: Number(checkInForm.advancePayment) || 0,
          additionalCharges: Number(checkInForm.additionalCharges) || 0,
          discount: Number(checkInForm.discount) || 0,
          notes: checkInForm.notes,
          selectedServices: selectedServices.map(s => ({
            serviceId: s.serviceId,
            serviceName: s.serviceName,
            price: s.price,
            quantity: s.quantity,
            totalPrice: s.totalPrice,
          })),
        };

        // Gọi Mutation cập nhật lên Redis
        syncSessionMutation.mutate({
          hotelId: selectedHotelId, // Chắc chắn là string nhờ vào điều kiện if ở trên
          roomId: roomId,
          sessionData: sessionPayload as any, // Ép kiểu an toàn 'as any' để tránh xung đột cấu trúc cục bộ và ApiRoomSession
        });
      }, 800); // Debounce delay 800ms giúp giảm tải số lượng request liên tục khi gõ chữ

      return () => clearTimeout(syncDebounceTimer);
    }
  }, [checkInForm, selectedServices, modalVisible, selectedRoom, modalMode, selectedHotelId]);
  

  const { data: availableServices = [], isLoading: isLoadingServiceList } = useQuery({
    queryKey: ['services', selectedHotelId],
    queryFn: () => servicesApi.getAll(selectedHotelId || undefined),
  });

  const { data: serviceOrders = [] } = useQuery({
    queryKey: ['roomServices', selectedRoom?.id],
    queryFn: () => (selectedRoom ? servicesApi.getOrdersByRoom(selectedRoom.id) : Promise.resolve([])),
    enabled: !!selectedRoom && modalMode === 'checkout',
  });
  const { data: checkoutRoomDetail } = useQuery({
    queryKey: ['roomDetailCheckout', selectedRoom?.id],
    queryFn: () => (selectedRoom ? roomsApi.getById(selectedRoom.id) : Promise.resolve(null)),
    enabled: !!selectedRoom && modalMode === 'checkout',
  });
  const { user } = useAuth();
  const checkoutRoom = checkoutRoomDetail || selectedRoom;

  const serviceTotal = useMemo(() => {
    return selectedServices.reduce((sum, service) => sum + (service.totalPrice || 0), 0);
  }, [selectedServices]);

  const servicePayload = useMemo(() => {
    return selectedServices.map(service => ({
      serviceId: service.serviceId,
      serviceName: service.serviceName,
      price: service.price,
      quantity: service.quantity,
      totalPrice: service.totalPrice,
    }));
  }, [selectedServices]);

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      roomsApi.updateStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rooms'] });
      closeModal();
    },
    onError: () => {
      Alert.alert(t('error'), t('cannotUpdateStatus'));
    },
  });

  const guestOutMutation = useMutation({
    mutationFn: ({ id, note, staffId }: { id: string; note?: string; staffId?: string }) =>
      roomsApi.guestOut(id, note, staffId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rooms'] });
      closeModal();
      Alert.alert(language === 'vi' ? 'Thành công' : 'Success', language === 'vi' ? 'Đã ghi nhận khách ra ngoài' : 'Guest marked as out');
    },
    onError: (err: any) => {
      Alert.alert(t('error'), err?.message || t('cannotUpdateStatus'));
    },
  });
  const guestReturnMutation = useMutation({
    mutationFn: ({ id, staffId }: { id: string; staffId?: string }) => roomsApi.guestReturn(id, staffId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rooms'] });
      closeModal();
      Alert.alert(language === 'vi' ? 'Thành công' : 'Success', language === 'vi' ? 'Khách đã quay lại' : 'Guest returned');
    },
    onError: (err: any) => {
      Alert.alert(t('error'), err?.message || t('cannotUpdateStatus'));
    },
  });

  const checkInMutation = useMutation({
    mutationFn: ({ id, guestData }: { id: string; guestData: unknown }) =>
      roomsApi.checkIn(id, guestData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rooms'] });
      closeModal();
      Alert.alert(t('success'), t('checkedIn'));
    },
    onError: () => {
      Alert.alert(t('error'), t('cannotCheckIn'));
    },
  });

  const checkOutMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: unknown }) => roomsApi.checkOut(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rooms'] });
      closeModal();
      Alert.alert(t('success'), t('checkedOut'));
    },
    onError: () => {
      Alert.alert(t('error'), t('cannotCheckOut'));
    },
  });

  const saveCheckinInfoMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: unknown }) => roomsApi.updateCheckinInfo(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rooms'] });
      Alert.alert(t('success'), t('save'));
    },
    onError: () => {
      Alert.alert(t('error'), t('cannotUpdateStatus'));
    },
  });

  const markCleanMutation = useMutation({
    mutationFn: (id: string) => roomsApi.markClean(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rooms'] });
      closeModal();
      Alert.alert(t('success'), t('roomReady'));
    },
    onError: () => {
      Alert.alert(t('error'), t('cannotUpdateStatus'));
    },
  });

  const transferMutation = useMutation({
    mutationFn: async ({ fromId, toId }: { fromId: string; toId: string }) => {
      const fromRoom = rooms.find(r => r.id === fromId);
      const checkInTime = fromRoom?.checkInTime || new Date().toISOString();
      return roomsApi.transferRoom(fromId, toId, {
        guestName: fromRoom?.currentGuest || '',
        checkInDate: checkInTime,
        checkInTime: checkInTime,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rooms'] });
      closeModal();
      Alert.alert(t('success'), t('transferRoom'));
    },
    onError: () => {
      Alert.alert(t('error'), t('cannotUpdateStatus'));
    },
  });

  const { mutate: doCheckIn } = checkInMutation;
  const { mutate: doCheckOut } = checkOutMutation;
  const { mutate: doSaveCheckinInfo } = saveCheckinInfoMutation;
  const { mutate: doTransfer } = transferMutation;
  const { mutate: doUpdateStatus } = updateStatusMutation;
  const { mutate: doMarkClean } = markCleanMutation;
  const { mutate: doGuestOut } = guestOutMutation;
  const { mutate: doGuestReturn } = guestReturnMutation;

  const filteredRooms = useMemo(() => {
    return rooms.filter((room) => {
      // Bọc an toàn: Nếu room.number bị undefined, sẽ tự động dùng chuỗi rỗng '' thay thế
      const roomNumberSafe = room.number || '';
      const matchesSearch = roomNumberSafe.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesFilter =
        selectedFilter === 'all'
          || room.status === selectedFilter
          || (selectedFilter === 'guest_out' && room.status === 'occupied' && room.guestStatus === 'out');
          
      return matchesSearch && matchesFilter;
    });
  }, [rooms, searchQuery, selectedFilter]);

  const availableRoomsForTransfer = useMemo(() => {
    return rooms.filter(r => r.status === 'vacant' && r.id !== selectedRoom?.id);
  }, [rooms, selectedRoom]);

  const statusCounts = useMemo(() => ({
    all: rooms.length,
    vacant: rooms.filter((r) => r.status === 'vacant').length,
    occupied: rooms.filter((r) => r.status === 'occupied').length,
    cleaning: rooms.filter((r) => r.status === 'cleaning').length,
    dirty: rooms.filter((r) => r.status === 'dirty').length,
    maintenance: rooms.filter((r) => r.status === 'maintenance').length,
    booked: rooms.filter((r) => r.status === 'booked').length,
    guest_out: rooms.filter((r) => r.status === 'occupied' && r.guestStatus === 'out').length,
  }), [rooms]);

  const formatCurrency = useCallback((amount: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
      maximumFractionDigits: 0,
    }).format(amount);
  }, []);

  const formatDateTime = useCallback((value?: string) => {
    if (!value) return '';
    const date = new Date(value);
    if (isNaN(date.getTime())) return '';
    return new Intl.DateTimeFormat(language === 'vi' ? 'vi-VN' : 'en-US', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  }, [language]);

  const getRoomPriceDetails = useCallback(
    (room: Room | null, checkInTime?: string, rateType?: RateType, checkOutTime?: Date) => {
      if (!room || !checkInTime || !rateType) return null;

      const checkInDate = new Date(checkInTime);
      if (isNaN(checkInDate.getTime())) return null;
      const now = checkOutTime ?? new Date();
      if (isNaN(now.getTime()) || now.getTime() < checkInDate.getTime()) return null;

      const durationInMilliseconds = now.getTime() - checkInDate.getTime();
      const durationInMinutes = Math.floor(durationInMilliseconds / (1000 * 60));
      const durationInHours = Math.floor(durationInMinutes / 60);
      const remainingMinutes = durationInMinutes % 60;
      const durationInDays = Math.ceil(durationInHours / 24);

      const priceConfig = (room as any)?.priceConfig;
      const priceSettings = (room as any)?.priceSettings;

      const hourlyRate =
        room.pricing?.hourly || room.firstHourRate || priceConfig?.hourlyRates?.firstHourPrice || 0;
      const dailyRate =
        room.pricing?.daily || priceConfig?.dailyRates?.standardPrice || 0;
      const nightlyRate =
        room.pricing?.nightly || priceConfig?.nightlyRates?.standardPrice || 0;
      const weeklyRate =
        room.pricing?.weekly || priceConfig?.weeklyRates?.standardPrice || 0;
      const monthlyRate =
        room.pricing?.monthly || priceConfig?.monthlyRates?.standardPrice || 0;
      const additionalHourRate =
        room.additionalHourRate || priceConfig?.hourlyRates?.additionalHourPrice || hourlyRate * 0.8;
      const gracePeriodMinutes = priceConfig?.hourlyRates?.gracePeriodMinutes || 15;

      const nightlyStartTime =
        priceConfig?.nightlyRates?.startTime || priceSettings?.nightlyStartTime || '20:00';
      const nightlyEndTime =
        priceConfig?.nightlyRates?.endTime || priceSettings?.nightlyEndTime || '12:00';
      const dailyStartTime =
        priceConfig?.dailyRates?.checkInTime || priceSettings?.dailyStartTime || '12:00';
      const dailyCheckOutTime =
        priceConfig?.dailyRates?.checkOutTime || priceSettings?.dailyEndTime || '12:00';
      const nightlyEarlyCheckinSurcharge =
        priceConfig?.nightlyRates?.earlyCheckinSurcharge ||
        priceSettings?.nightlyEarlyCheckinSurcharge ||
        0;
      const nightlyLateCheckoutSurcharge =
        priceConfig?.nightlyRates?.lateCheckoutSurcharge ||
        priceSettings?.nightlyLateCheckoutSurcharge ||
        0;
      const dailyEarlyCheckinSurcharge =
        priceConfig?.dailyRates?.earlyCheckinSurcharge ||
        priceSettings?.dailyEarlyCheckinSurcharge ||
        0;
      const dailyLateCheckoutFee =
        priceConfig?.dailyRates?.latecheckOutFee || priceSettings?.dailyLateCheckoutFee || 0;

      const parseTime = (timeStr: string) => {
        const parts = timeStr.split(':');
        return {
          hour: parseInt(parts[0]) || 0,
          minute: parseInt(parts[1]) || 0,
        };
      };

      const calculateEarlyHours = (actualTime: Date, standardTime: string): number => {
        const actual = parseTime(`${actualTime.getHours()}:${actualTime.getMinutes()}`);
        const standard = parseTime(standardTime);
        const actualMinutes = actual.hour * 60 + actual.minute;
        const standardMinutes = standard.hour * 60 + standard.minute;
        if (actualMinutes < standardMinutes) {
          const earlyMinutes = standardMinutes - actualMinutes;
          return Math.ceil(earlyMinutes / 60);
        }
        return 0;
      };

      let total = 0;
      const details: Record<string, number | string | undefined> = {};

      switch (rateType) {
        case 'hourly': {
          const firstHourPrice =
            room.firstHourRate || priceConfig?.hourlyRates?.firstHourPrice || hourlyRate;
          const computedAdditionalHourRate =
            room.additionalHourRate || priceConfig?.hourlyRates?.additionalHourPrice || additionalHourRate;
          total = firstHourPrice;
          details.firstHourPrice = firstHourPrice;

          if (durationInHours >= 1) {
            let billableHours = durationInHours - 1;
            if (durationInHours >= 2 && remainingMinutes > gracePeriodMinutes) {
              billableHours += 1;
            } else if (durationInHours === 1 && remainingMinutes > gracePeriodMinutes) {
              billableHours = 1;
            }
            if (billableHours > 0) {
              const additionalPrice = billableHours * computedAdditionalHourRate;
              total += additionalPrice;
              details.additionalHoursCount = billableHours;
              details.additionalHoursPrice = additionalPrice;
              details.remainingMinutes = remainingMinutes;
              details.gracePeriodMinutes = gracePeriodMinutes;
            }
          }

          details.durationInHours = durationInHours;
          details.totalHours = durationInHours + remainingMinutes / 60;
          details.rateType = 'hourly';
          break;
        }
        case 'daily': {
          const checkInDateOnly = new Date(checkInDate);
          checkInDateOnly.setHours(0, 0, 0, 0);
          const checkOutDateOnly = new Date(now);
          checkOutDateOnly.setHours(0, 0, 0, 0);
          const actualDays = Math.max(
            1,
            Math.ceil((checkOutDateOnly.getTime() - checkInDateOnly.getTime()) / (1000 * 60 * 60 * 24))
          );
          total = actualDays * dailyRate;
          details.basePrice = dailyRate;
          details.days = actualDays;
          details.rateType = 'daily';

          const checkInMinutes = checkInDate.getHours() * 60 + checkInDate.getMinutes();
          const [startHour, startMinute] = dailyStartTime.split(':').map(Number);
          const startTimeMinutes = startHour * 60 + startMinute;
          if (checkInMinutes < startTimeMinutes) {
            const earlyHours = calculateEarlyHours(checkInDate, dailyStartTime);
            if (earlyHours > 0 && dailyEarlyCheckinSurcharge > 0) {
              const earlySurcharge = earlyHours * dailyEarlyCheckinSurcharge;
              total += earlySurcharge;
              details.earlyCheckinHours = earlyHours;
              details.earlyCheckinSurcharge = earlySurcharge;
            }
          }

          const checkOutDateOnlyForDaily = new Date(now);
          checkOutDateOnlyForDaily.setHours(0, 0, 0, 0);
          const checkInDateOnlyForDaily = new Date(checkInDate);
          checkInDateOnlyForDaily.setHours(0, 0, 0, 0);
          const isNextDay = checkOutDateOnlyForDaily.getTime() > checkInDateOnlyForDaily.getTime();
          const checkOutMinutes = now.getHours() * 60 + now.getMinutes();
          const [checkOutHour, checkOutMinute] = dailyCheckOutTime.split(':').map(Number);
          const checkOutTimeMinutes = checkOutHour * 60 + checkOutMinute;
          if (isNextDay && checkOutMinutes > checkOutTimeMinutes && dailyLateCheckoutFee > 0) {
            const lateMinutes = checkOutMinutes - checkOutTimeMinutes;
            const lateHours = Math.ceil(lateMinutes / 60);
            const lateSurcharge = lateHours * dailyLateCheckoutFee;
            total += lateSurcharge;
            details.lateCheckoutHours = lateHours;
            details.lateCheckoutSurcharge = lateSurcharge;
          }
          break;
        }
        case 'nightly': {
          const checkInDateOnly = new Date(checkInDate);
          checkInDateOnly.setHours(0, 0, 0, 0);
          const checkOutDateOnly = new Date(now);
          checkOutDateOnly.setHours(0, 0, 0, 0);
          const actualNights = Math.max(
            1,
            Math.ceil((checkOutDateOnly.getTime() - checkInDateOnly.getTime()) / (1000 * 60 * 60 * 24))
          );
          total = actualNights * nightlyRate;
          details.basePrice = nightlyRate;
          details.nights = actualNights;
          details.rateType = 'nightly';

          const checkInMinutes = checkInDate.getHours() * 60 + checkInDate.getMinutes();
          const [startHour, startMinute] = nightlyStartTime.split(':').map(Number);
          const startTimeMinutes = startHour * 60 + startMinute;
          const [endHour, endMinute] = nightlyEndTime.split(':').map(Number);
          const endTimeMinutes = endHour * 60 + endMinute;
          const isInNightlyTime = checkInMinutes >= startTimeMinutes || checkInMinutes <= endTimeMinutes;
          if (!isInNightlyTime) {
            const earlyHours = calculateEarlyHours(checkInDate, nightlyStartTime);
            if (earlyHours > 0 && nightlyEarlyCheckinSurcharge > 0) {
              const earlySurcharge = earlyHours * nightlyEarlyCheckinSurcharge;
              total += earlySurcharge;
              details.earlyCheckinHours = earlyHours;
              details.earlyCheckinSurcharge = earlySurcharge;
            }
          }

          const checkOutDateOnlyForNightly = new Date(now);
          checkOutDateOnlyForNightly.setHours(0, 0, 0, 0);
          const checkInDateOnlyForNightly = new Date(checkInDate);
          checkInDateOnlyForNightly.setHours(0, 0, 0, 0);
          const isNextDay = checkOutDateOnlyForNightly.getTime() > checkInDateOnlyForNightly.getTime();
          const checkOutMinutes = now.getHours() * 60 + now.getMinutes();
          if (isNextDay && checkOutMinutes > endTimeMinutes && nightlyLateCheckoutSurcharge > 0) {
            const lateMinutes = checkOutMinutes - endTimeMinutes;
            const lateHours = Math.ceil(lateMinutes / 60);
            const lateSurcharge = lateHours * nightlyLateCheckoutSurcharge;
            total += lateSurcharge;
            details.lateCheckoutHours = lateHours;
            details.lateCheckoutSurcharge = lateSurcharge;
          }
          break;
        }
        case 'weekly': {
          const weeks = Math.max(1, Math.ceil(durationInDays / 7));
          total = weeks * weeklyRate;
          details.basePrice = weeklyRate;
          details.weeks = weeks;
          details.rateType = 'weekly';
          break;
        }
        case 'monthly': {
          const months = Math.max(1, Math.ceil(durationInDays / 30));
          total = months * monthlyRate;
          details.basePrice = monthlyRate;
          details.months = months;
          details.rateType = 'monthly';
          break;
        }
        default:
          total = hourlyRate * durationInHours;
          details.rateType = 'hourly';
      }

      return {
        total: Math.max(0, Math.round(total)),
        details
      };
    },
    []
  );

  const closeModal = useCallback(() => {
    setModalVisible(false);
    setModalMode('details');
    setSelectedRoom(null);
    setTransferTargetId(null);
    setIsCheckoutServiceOpen(false);
    setSelectedServiceId(null);
    setSelectedServiceQuantity(1);
    setCheckInForm({
      guestName: '',
      guestPhone: '',
      guestId: '',
      adults: 1,
      children: 0,
      rateType: 'hourly',
      paymentMethod: 'cash',
      advancePayment: '',
      additionalCharges: '',
      discount: '',
      notes: '',
    });
    setCheckOutForm({
      guestName: '',
      guestPhone: '',
      guestId: '',
      rateType: 'hourly',
      paymentMethod: 'cash',
      advancePayment: '',
      additionalCharges: '',
      discount: '',
      notes: '',
    });
    setSelectedServices([]);
  }, []);

  const getModalModeForStatus = useCallback((status: RoomStatus): ModalMode => {
    if (status === 'vacant') return 'checkin';
    if (status === 'occupied') return 'checkout';
    if (status === 'dirty' || status === 'cleaning' || status === 'maintenance') return 'cleaning';
    return 'details';
  }, []);

  const openRoomModal = useCallback((room: Room, mode: ModalMode) => {
    setSelectedRoom(room);
    setModalMode(mode);
    setModalVisible(true);
    setTransferTargetId(null);
    setIsCheckoutServiceOpen(true);
    setSelectedServiceId(null);
    setSelectedServiceQuantity(1);
    setCheckInForm(prev => ({
      ...prev,
      guestName: '',
      guestPhone: '',
      guestId: '',
      adults: 1,
      children: 0,
      rateType: 'hourly',
      paymentMethod: 'cash',
      advancePayment: '',
      additionalCharges: '',
      discount: '',
      notes: '',
    }));
    setCheckOutForm(prev => ({
      ...prev,
      guestName: room.currentGuest || '',
      guestPhone: room.guestPhone || '',
      guestId: room.guestIdNumber || '',
      rateType: (room.rateType as RateType) || 'hourly',
      paymentMethod: (room.paymentMethod as PaymentMethod) || 'cash',
      advancePayment: room.advancePayment ? String(room.advancePayment) : '',
      additionalCharges: '',
      discount: '',
      notes: '',
    }));
    setSelectedServices([]);
  }, []);

  const normalizedAssignRoomId = useMemo(() => {
    if (!assignRoomId) return null;
    return Array.isArray(assignRoomId) ? assignRoomId[0] : assignRoomId;
  }, [assignRoomId]);

  useEffect(() => {
    if (!normalizedAssignRoomId || rooms.length === 0) return;
    const targetRoom = rooms.find(room => room.id === normalizedAssignRoomId);
    if (!targetRoom) return;
    openRoomModal(targetRoom, 'checkin');
    router.replace('/(tabs)/rooms');
  }, [normalizedAssignRoomId, rooms, openRoomModal, router]);

  useEffect(() => {
    if (!modalVisible || modalMode !== 'checkout') return;
    if (selectedServices.length > 0) return;
    if (!serviceOrders.length) return;
    setSelectedServices(serviceOrders.map(order => ({
      serviceId: order.serviceId,
      serviceName: order.serviceName,
      price: order.quantity ? order.totalPrice / order.quantity : order.totalPrice,
      quantity: order.quantity || 1,
      totalPrice: order.totalPrice || 0,
    })));
  }, [modalVisible, modalMode, serviceOrders, selectedServices.length]);

  useEffect(() => {
    if (!modalVisible || modalMode !== 'checkout') return;
    if (selectedServices.length > 0) return;
    if (serviceOrders.length > 0) return;
    if (!checkoutRoom?.selectedServices || checkoutRoom.selectedServices.length === 0) return;
    setSelectedServices(checkoutRoom.selectedServices.map(service => ({
      serviceId: typeof service.serviceId === 'string' ? service.serviceId : (service.serviceId as any)?._id || '',
      serviceName: service.serviceName || service.name || t('services'),
      price: Number(service.price || service.unitPrice || 0),
      quantity: Number(service.quantity || 1),
      totalPrice: Number(service.totalPrice || (service.price || service.unitPrice || 0) * (service.quantity || 1)),
    })));
  }, [modalVisible, modalMode, checkoutRoom, selectedServices.length, serviceOrders.length, t]);

  useEffect(() => {
    if (!modalVisible || modalMode !== 'checkout') return;
    if (!checkoutRoomDetail?.rateType) return;
    if (checkOutForm.rateType === checkoutRoomDetail.rateType) return;
    if (checkOutForm.rateType !== 'hourly') return;
    setCheckOutForm(prev => ({ ...prev, rateType: checkoutRoomDetail.rateType as RateType }));
  }, [modalVisible, modalMode, checkoutRoomDetail, checkOutForm.rateType]);

  const updateServiceQuantity = useCallback((service: Service, delta: number) => {
    setSelectedServices(prev => {
      const existing = prev.find(item => item.serviceId === service.id);
      const nextQuantity = Math.max(0, (existing?.quantity || 0) + delta);
      if (nextQuantity === 0) {
        return prev.filter(item => item.serviceId !== service.id);
      }
      const nextItem = {
        serviceId: service.id,
        serviceName: service.name,
        price: service.price,
        quantity: nextQuantity,
        totalPrice: service.price * nextQuantity,
      };
      if (existing) {
        return prev.map(item => (item.serviceId === service.id ? nextItem : item));
      }
      return [...prev, nextItem];
    });
  }, []);

  const selectedServiceOption = useMemo(() => {
    if (!selectedServiceId) return null;
    return availableServices.find(service => service.id === selectedServiceId) || null;
  }, [availableServices, selectedServiceId]);

  const renderServiceDropdownSubtitle = useMemo(() => {
    if (selectedServiceOption) {
      return formatCurrency(selectedServiceOption.price);
    }
    return `${availableServices.length} ${t('services')}`;
  }, [selectedServiceOption, availableServices.length, t]);

  const handleAddSelectedService = useCallback(() => {
    if (!selectedServiceOption) return;
    setSelectedServices(prev => {
      const existing = prev.find(item => item.serviceId === selectedServiceOption.id);
      const nextQuantity = (existing?.quantity || 0) + selectedServiceQuantity;
      const nextItem = {
        serviceId: selectedServiceOption.id,
        serviceName: selectedServiceOption.name,
        price: selectedServiceOption.price,
        quantity: nextQuantity,
        totalPrice: selectedServiceOption.price * nextQuantity,
      };
      if (existing) {
        return prev.map(item => (item.serviceId === selectedServiceOption.id ? nextItem : item));
      }
      return [...prev, nextItem];
    });
    setSelectedServiceId(null);
    setSelectedServiceQuantity(1);
    setIsCheckoutServiceOpen(false);
  }, [selectedServiceOption, selectedServiceQuantity]);

  const checkoutTotals = useMemo(() => {
    let roomTotal = checkoutRoom?.price || 0;
    const roomPriceInfo = getRoomPriceDetails(
      checkoutRoom,
      checkoutRoom?.checkInTime,
      checkOutForm.rateType
    );
    if (roomPriceInfo?.total && roomPriceInfo.total > 0) {
      roomTotal = roomPriceInfo.total;
    }
    const roomPriceDetails: any = roomPriceInfo?.details || null;
    const parseNumber = (value: unknown) => {
      if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
      if (typeof value === 'string') {
        const normalized = value.replace(/[^\d.-]/g, '');
        const parsed = Number(normalized);
        return Number.isFinite(parsed) ? parsed : 0;
      }
      return 0;
    };
    const parseTime = (timeStr: string) => {
      const [hour, minute] = String(timeStr || '0:0').split(':').map(Number);
      return { hour: hour || 0, minute: minute || 0 };
    };
    const calcEarlyHours = (actualTime: Date, standardTime: string) => {
      const actualMinutes = actualTime.getHours() * 60 + actualTime.getMinutes();
      const { hour, minute } = parseTime(standardTime);
      const standardMinutes = hour * 60 + minute;
      if (actualMinutes < standardMinutes) {
        return Math.ceil((standardMinutes - actualMinutes) / 60);
      }
      return 0;
    };
    const getFallbackSurcharge = () => {
      if (!checkoutRoom?.checkInTime) {
        return {
          earlyHours: 0,
          earlySurcharge: 0,
          lateHours: 0,
          lateSurcharge: 0
        };
      }
      const checkInDate = new Date(checkoutRoom.checkInTime);
      const now = new Date();
      if (isNaN(checkInDate.getTime()) || isNaN(now.getTime())) {
        return {
          earlyHours: 0,
          earlySurcharge: 0,
          lateHours: 0,
          lateSurcharge: 0
        };
      }
      const priceConfig = (checkoutRoom as any)?.priceConfig;
      const priceSettings = (checkoutRoom as any)?.priceSettings;
      const dailyStartTime = priceConfig?.dailyRates?.checkInTime || priceSettings?.dailyStartTime || '12:00';
      const dailyCheckOutTime = priceConfig?.dailyRates?.checkOutTime || priceSettings?.dailyEndTime || '12:00';
      const nightlyStartTime = priceConfig?.nightlyRates?.startTime || priceSettings?.nightlyStartTime || '20:00';
      const nightlyEndTime = priceConfig?.nightlyRates?.endTime || priceSettings?.nightlyEndTime || '12:00';
      const dailyEarlyRate = parseNumber(priceConfig?.dailyRates?.earlyCheckinSurcharge || priceSettings?.dailyEarlyCheckinSurcharge);
      const dailyLateRate = parseNumber(priceConfig?.dailyRates?.latecheckOutFee || priceSettings?.dailyLateCheckoutFee);
      const nightlyEarlyRate = parseNumber(priceConfig?.nightlyRates?.earlyCheckinSurcharge || priceSettings?.nightlyEarlyCheckinSurcharge);
      const nightlyLateRate = parseNumber(priceConfig?.nightlyRates?.lateCheckoutSurcharge || priceSettings?.nightlyLateCheckoutSurcharge);
      const checkOutDateOnly = new Date(now);
      checkOutDateOnly.setHours(0, 0, 0, 0);
      const checkInDateOnly = new Date(checkInDate);
      checkInDateOnly.setHours(0, 0, 0, 0);
      const isNextDay = checkOutDateOnly.getTime() > checkInDateOnly.getTime();

      if (checkOutForm.rateType === 'daily') {
        const earlyHours = calcEarlyHours(checkInDate, dailyStartTime);
        const checkOutMinutes = now.getHours() * 60 + now.getMinutes();
        const { hour, minute } = parseTime(dailyCheckOutTime);
        const checkoutLimitMinutes = hour * 60 + minute;
        const lateHours = isNextDay && checkOutMinutes > checkoutLimitMinutes
          ? Math.ceil((checkOutMinutes - checkoutLimitMinutes) / 60)
          : 0;
        return {
          earlyHours,
          earlySurcharge: earlyHours * dailyEarlyRate,
          lateHours,
          lateSurcharge: lateHours * dailyLateRate
        };
      }
      if (checkOutForm.rateType === 'nightly') {
        const checkInMinutes = checkInDate.getHours() * 60 + checkInDate.getMinutes();
        const nightlyStart = parseTime(nightlyStartTime);
        const nightlyEnd = parseTime(nightlyEndTime);
        const nightlyStartMinutes = nightlyStart.hour * 60 + nightlyStart.minute;
        const nightlyEndMinutes = nightlyEnd.hour * 60 + nightlyEnd.minute;
        const isInNightlyTime = checkInMinutes >= nightlyStartMinutes || checkInMinutes <= nightlyEndMinutes;
        const earlyHours = isInNightlyTime ? 0 : calcEarlyHours(checkInDate, nightlyStartTime);
        const checkOutMinutes = now.getHours() * 60 + now.getMinutes();
        const lateHours = isNextDay && checkOutMinutes > nightlyEndMinutes
          ? Math.ceil((checkOutMinutes - nightlyEndMinutes) / 60)
          : 0;
        return {
          earlyHours,
          earlySurcharge: earlyHours * nightlyEarlyRate,
          lateHours,
          lateSurcharge: lateHours * nightlyLateRate
        };
      }
      return {
        earlyHours: 0,
        earlySurcharge: 0,
        lateHours: 0,
        lateSurcharge: 0
      };
    };
    const fallbackSurcharge = getFallbackSurcharge();
    const earlyCheckinSurcharge = parseNumber(
      roomPriceDetails?.breakdown?.beforeNightly?.earlyCheckinSurcharge ??
      roomPriceDetails?.earlyCheckinSurcharge ??
      fallbackSurcharge.earlySurcharge
    );
    const lateCheckoutSurcharge = parseNumber(
      roomPriceDetails?.breakdown?.afterNightly?.lateCheckoutSurcharge ??
      roomPriceDetails?.lateCheckoutSurcharge ??
      fallbackSurcharge.lateSurcharge
    );
    const earlyCheckinHours = parseNumber(
      roomPriceDetails?.breakdown?.beforeNightly?.hours ??
      roomPriceDetails?.earlyCheckinHours ??
      fallbackSurcharge.earlyHours
    );
    const lateCheckoutHours = parseNumber(
      roomPriceDetails?.breakdown?.afterNightly?.hours ??
      roomPriceDetails?.lateCheckoutHours ??
      fallbackSurcharge.lateHours
    );
    const baseAdditionalCharges = Number(checkoutRoom?.additionalCharges) || 0;
    const baseDiscount = Number(checkoutRoom?.discount) || 0;
    const baseAdvancePayment = Number(checkoutRoom?.advancePayment) || 0;
    const checkoutAdditionalCharges = Number(checkOutForm.additionalCharges) || 0;
    const checkoutDiscount = Number(checkOutForm.discount) || 0;
    const totalAdditionalCharges = baseAdditionalCharges + checkoutAdditionalCharges;
    const totalDiscount = baseDiscount + checkoutDiscount;
    const advancePayment = checkOutForm.advancePayment !== ''
      ? Number(checkOutForm.advancePayment) || 0
      : baseAdvancePayment;
    const totalAmount = calculateRoomTotalAmount(
      roomTotal,
      serviceTotal,
      totalAdditionalCharges,
      totalDiscount,
      advancePayment
    );
    const grossTotal = roomTotal + serviceTotal + totalAdditionalCharges - totalDiscount;
    const remainingAmount = totalAmount;
    return {
      roomTotal,
      additionalCharges: totalAdditionalCharges,
      discount: totalDiscount,
      advancePayment,
      totalAmount,
      grossTotal,
      remainingAmount,
      earlyCheckinSurcharge,
      lateCheckoutSurcharge,
      earlyCheckinHours,
      lateCheckoutHours,
      roomPriceDetails,
    };
  }, [checkoutRoom, checkOutForm, serviceTotal, getRoomPriceDetails]);
  const handleRoomPress = useCallback((room: Room) => {
    openRoomModal(room, getModalModeForStatus(room.status));
  }, [openRoomModal, getModalModeForStatus]);

  const handleShowCheckIn = useCallback(() => {
    setModalMode('checkin');
    setIsCheckoutServiceOpen(false);
    setSelectedServiceId(null);
    setSelectedServiceQuantity(1);
  }, []);

  const handleShowCheckOut = useCallback(() => {
    setModalMode('checkout');
    setIsCheckoutServiceOpen(false);
    setSelectedServiceId(null);
    setSelectedServiceQuantity(1);
  }, []);

  const handleShowTransfer = useCallback(() => {
    setModalMode('transfer');
    setTransferTargetId(null);
    setIsCheckoutServiceOpen(false);
  }, []);

  const handleCheckIn = useCallback(() => {
    if (!selectedRoom) return;
    const guestName = checkInForm.guestName.trim() || t('walkInGuest');
    doCheckIn({
      id: selectedRoom.id,
      guestData: {
        guestName,
        guestPhone: checkInForm.guestPhone,
        guestId: checkInForm.guestId,
        adults: checkInForm.adults,
        children: checkInForm.children,
        checkInDate: new Date().toISOString(),
        guestInfo: {
          name: guestName,
          phone: checkInForm.guestPhone,
          idNumber: checkInForm.guestId,
        },
        numberOfGuests: {
          adults: checkInForm.adults,
          children: checkInForm.children,
        },
        checkinTime: new Date().toISOString(),
        rateType: checkInForm.rateType,
        paymentMethod: checkInForm.paymentMethod,
        advancePayment: Number(checkInForm.advancePayment) || 0,
        additionalCharges: Number(checkInForm.additionalCharges) || 0,
        discount: Number(checkInForm.discount) || 0,
        selectedServices: servicePayload,
        servicesTotal: serviceTotal,
        notes: checkInForm.notes.trim(),
      },
    });
  }, [selectedRoom, checkInForm, doCheckIn, t, servicePayload, serviceTotal]);

  const handleSaveCheckOutInfo = useCallback(() => {
    if (!selectedRoom) return;
    const { additionalCharges, discount, advancePayment } = checkoutTotals;
    doSaveCheckinInfo({
      id: selectedRoom.id,
      payload: {
        guestInfo: {
          name: checkOutForm.guestName,
          phone: checkOutForm.guestPhone,
          idNumber: checkOutForm.guestId,
          guestSource: 'walkin',
        },
        advancePayment: advancePayment || 0,
        rateType: checkOutForm.rateType,
        additionalCharges,
        discount,
        selectedServices: servicePayload,
        advancePaymentMethod: checkOutForm.paymentMethod,
      },
    });
  }, [selectedRoom, checkOutForm, checkoutTotals, doSaveCheckinInfo, servicePayload]);

  const handleCheckOut = useCallback(() => {
    if (!selectedRoom) return;
    const { additionalCharges, discount, advancePayment, roomTotal, totalAmount } = checkoutTotals;
    doCheckOut({
      id: selectedRoom.id,
      payload: {
        paymentMethod: checkOutForm.paymentMethod,
        checkoutTime: new Date().toISOString(),
        notes: checkOutForm.notes.trim(),
        additionalCharges,
        discount,
        advancePayment,
        servicesTotal: serviceTotal,
        services: servicePayload,
        roomTotal,
        totalAmount,
        remainingAmount: totalAmount,
        rateType: checkOutForm.rateType,
        guestName: checkOutForm.guestName,
        guestPhone: checkOutForm.guestPhone,
        guestId: checkOutForm.guestId,
        guestInfo: {
          name: checkOutForm.guestName,
          phone: checkOutForm.guestPhone,
          idNumber: checkOutForm.guestId,
        },
      },
    });
  }, [selectedRoom, doCheckOut, checkOutForm, serviceTotal, servicePayload, checkoutTotals]);

  const handleTransfer = useCallback(() => {
    if (!selectedRoom || !transferTargetId) return;
    doTransfer({ fromId: selectedRoom.id, toId: transferTargetId });
  }, [selectedRoom, transferTargetId, doTransfer]);

  const handleCleaning = useCallback(() => {
    if (!selectedRoom) return;
    doUpdateStatus({ id: selectedRoom.id, status: 'cleaning' });
  }, [selectedRoom, doUpdateStatus]);

  const handleDirty = useCallback(() => {
    if (!selectedRoom) return;
    doUpdateStatus({ id: selectedRoom.id, status: 'dirty' });
  }, [selectedRoom, doUpdateStatus]);

  const handleMarkClean = useCallback(() => {
    if (!selectedRoom) return;
    doMarkClean(selectedRoom.id);
  }, [selectedRoom, doMarkClean]);

  const handleMaintenance = useCallback(() => {
    if (!selectedRoom) return;
    doUpdateStatus({ id: selectedRoom.id, status: 'maintenance' });
  }, [selectedRoom, doUpdateStatus]);
  
  const handleGuestOut = useCallback(() => {
    if (!selectedRoom) return;
    setGuestOutNote('');
    setGuestOutModalVisible(true);
  }, [selectedRoom]);
  
  const handleGuestReturn = useCallback(() => {
    if (!selectedRoom) return;
    setGuestReturnModalVisible(true);
  }, [selectedRoom]);

  const confirmGuestOut = useCallback(() => {
    if (!selectedRoom) return;
    doGuestOut({
      id: selectedRoom.id,
      note: guestOutNote.trim() || undefined,
      staffId: user?.id,
    });
    setGuestOutModalVisible(false);
  }, [selectedRoom, doGuestOut, guestOutNote, user?.id]);

  const confirmGuestReturn = useCallback(() => {
    if (!selectedRoom) return;
    doGuestReturn({ id: selectedRoom.id, staffId: user?.id });
    setGuestReturnModalVisible(false);
  }, [selectedRoom, doGuestReturn, user?.id]);

  const getStatusLabel = useCallback((status: RoomStatus) => {
    return language === 'en' ? statusConfig[status].labelEn : statusConfig[status].label;
  }, [language]);

  const renderGridItem = useCallback((room: Room) => {
    const status = statusConfig[room.status];
    if (!status) {
      console.warn(`Unknown room status: ${room.status}`);
      return null;
    }
    const StatusIcon = status.icon;

    return (
      <TouchableOpacity
        key={room.id}
        style={[styles.gridItem, { backgroundColor: colors.cardBackground }]}
        activeOpacity={0.7}
        onPress={() => handleRoomPress(room)}
      >
        <View style={[styles.gridStatusBar, { backgroundColor: status.color }]} />
        <View style={styles.gridContent}>
          <View style={styles.gridHeader}>
            <Text style={[styles.gridRoomNumber, { color: colors.text }]}>{room.number}</Text>
            <StatusIcon size={16} color={status.color} />
          </View>
          <Text style={[styles.gridRoomType, { color: colors.textSecondary }]}>
            {roomTypeLabels[room.type] || room.type}
          </Text>
          <Text style={[styles.gridPrice, { color: colors.tint }]}>{formatCurrency(room.price)}</Text>
          {room.currentGuest && (
            <View style={styles.gridGuest}>
              <User size={12} color={colors.textSecondary} />
              <Text style={[styles.gridGuestName, { color: colors.textSecondary }]} numberOfLines={1}>
                {room.currentGuest}
              </Text>
            </View>
          )}
          {room.status === 'occupied' && room.guestStatus === 'out' && (
            <View style={[styles.guestOutBadge, { backgroundColor: Colors.status.guestOut + '20' }]}>
              <LogOut size={12} color={Colors.status.guestOut} />
              <Text style={[styles.guestOutBadgeText, { color: Colors.status.guestOut }]}>
                {language === 'vi' ? 'Khách ra ngoài' : 'Guest Out'}
              </Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  }, [handleRoomPress, formatCurrency, colors]);

  const renderListItem = useCallback((room: Room) => {
    const status = statusConfig[room.status];
    if (!status) {
      console.warn(`Unknown room status: ${room.status}`);
      return null;
    }
    const StatusIcon = status.icon;

    return (
      <TouchableOpacity
        key={room.id}
        style={[styles.roomCard, { backgroundColor: colors.cardBackground }]}
        activeOpacity={0.7}
        onPress={() => handleRoomPress(room)}
      >
        <View style={styles.roomHeader}>
          <View style={styles.roomNumberContainer}>
            <BedDouble size={18} color={colors.tint} />
            <Text style={[styles.roomNumber, { color: colors.text }]}>{room.number}</Text>
          </View>
          <View style={styles.statusBadgeGroup}>
            <View style={[styles.statusBadge, { backgroundColor: status.color + '20' }]}>
              <StatusIcon size={12} color={status.color} />
              <Text style={[styles.statusText, { color: status.color }]}>{getStatusLabel(room.status)}</Text>
            </View>
            {room.status === 'occupied' && room.guestStatus === 'out' && (
              <View style={[styles.statusBadge, { backgroundColor: Colors.status.guestOut + '20' }]}>
                <LogOut size={12} color={Colors.status.guestOut} />
                <Text style={[styles.statusText, { color: Colors.status.guestOut }]}>
                  {language === 'vi' ? 'Khách ra ngoài' : 'Guest Out'}
                </Text>
              </View>
            )}
          </View>
        </View>

        <View style={styles.roomInfo}>
          <View style={styles.roomType}>
            <Text style={[styles.roomTypeText, { color: colors.text }]}>
              {roomTypeLabels[room.type] || room.type}
            </Text>
            <Text style={[styles.floorText, { color: colors.textSecondary, backgroundColor: isDark ? '#334155' : '#f3f4f6' }]}>
              {t('floor')} {room.floor}
            </Text>
          </View>
          <Text style={[styles.priceText, { color: colors.tint }]}>
            {formatCurrency(room.price)}{t('perNight')}
          </Text>
        </View>

        {room.status === 'occupied' && room.currentGuest && (
          <View style={[styles.guestInfo, { backgroundColor: isDark ? '#1e293b' : '#f8fafc' }]}>
            <User size={14} color={colors.textSecondary} />
            <Text style={[styles.guestName, { color: colors.text }]}>{room.currentGuest}</Text>
            {room.checkoutDate && (
              <View style={styles.checkoutInfo}>
                <Calendar size={12} color={colors.textSecondary} />
                <Text style={[styles.checkoutText, { color: colors.textSecondary }]}>
                  {t('checkOutDate')}: {room.checkoutDate}
                </Text>
              </View>
            )}
          </View>
        )}

        <View style={styles.quickActions}>
          {room.status === 'vacant' && (
            <>
              <TouchableOpacity
                style={[styles.quickActionBtn, { backgroundColor: Colors.status.vacant }]}
                onPress={() => openRoomModal(room, 'checkin')}
              >
                <LogIn size={14} color="#fff" />
                <Text style={styles.quickActionText}>{t('checkIn')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.quickActionBtn, { backgroundColor: Colors.status.dirty }]}
                onPress={() => doUpdateStatus({ id: room.id, status: 'dirty' })}
              >
                <Brush size={14} color="#fff" />
                <Text style={styles.quickActionText}>{language === 'vi' ? 'Bẩn' : 'Dirty'}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.quickActionBtn, { backgroundColor: Colors.status.maintenance }]}
                onPress={() => doUpdateStatus({ id: room.id, status: 'maintenance' })}
              >
                <Wrench size={14} color="#fff" />
                <Text style={styles.quickActionText}>{t('maintenance')}</Text>
              </TouchableOpacity>
            </>
          )}
          {room.status === 'occupied' && (
            <>
              <TouchableOpacity
                style={[styles.quickActionBtn, { backgroundColor: Colors.status.cleaning }]}
                onPress={() => openRoomModal(room, 'checkout')}
              >
                <LogOut size={14} color="#fff" />
                <Text style={styles.quickActionText}>{t('checkOut')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.quickActionBtn, { backgroundColor: '#6366f1' }]}
                onPress={() => openRoomModal(room, 'transfer')}
              >
                <ArrowRightLeft size={14} color="#fff" />
              </TouchableOpacity>
              {room.guestStatus !== 'out' ? (
                <TouchableOpacity
                  style={[styles.quickActionBtn, { backgroundColor: Colors.status.guestOut }, guestOutMutation.isPending && { opacity: 0.6 }]}
                  onPress={() => { if (guestOutMutation.isPending) return; setSelectedRoom(room); handleGuestOut(); }}
                  disabled={guestOutMutation.isPending}
                >
                  {guestOutMutation.isPending ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <>
                      <LogOut size={14} color="#fff" />
                      <Text style={styles.quickActionText}>{language === 'vi' ? 'Ra ngoài' : 'Guest Out'}</Text>
                    </>
                  )}
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={[styles.quickActionBtn, { backgroundColor: Colors.status.vacant }, guestReturnMutation.isPending && { opacity: 0.6 }]}
                  onPress={() => { if (guestReturnMutation.isPending) return; setSelectedRoom(room); handleGuestReturn(); }}
                  disabled={guestReturnMutation.isPending}
                >
                  {guestReturnMutation.isPending ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <>
                      <LogIn size={14} color="#fff" />
                      <Text style={styles.quickActionText}>{language === 'vi' ? 'Quay lại' : 'Return'}</Text>
                    </>
                  )}
                </TouchableOpacity>
              )}
            </>
          )}
          {(room.status === 'cleaning' || room.status === 'dirty' || room.status === 'maintenance') && (
            <TouchableOpacity
              style={[styles.quickActionBtn, { backgroundColor: Colors.status.vacant }]}
              onPress={() => { setSelectedRoom(room); doMarkClean(room.id); }}
            >
              <CheckCircle size={14} color="#fff" />
              <Text style={styles.quickActionText}>{language === 'vi' ? 'Xong' : 'Done'}</Text>
            </TouchableOpacity>
          )}
        </View>
      </TouchableOpacity>
    );
  }, [handleRoomPress, openRoomModal, formatCurrency, getStatusLabel, colors, isDark, t, language, doMarkClean]);

  const renderModalContent = useCallback(() => {
    if (!selectedRoom) return null;
    const status = statusConfig[selectedRoom.status];

    if (modalMode === 'details') {
      return (
        <ScrollView
          showsVerticalScrollIndicator={true}
          nestedScrollEnabled
          contentContainerStyle={{ paddingBottom: 24 }}
          decelerationRate="normal"
          scrollEventThrottle={16}
        >
          <View style={[styles.modalRoomHeader, { borderBottomColor: colors.divider }]}>
            <View style={[styles.modalRoomIcon, { backgroundColor: status.color + '15' }]}>
              <BedDouble size={28} color={status.color} />
            </View>
            <View style={styles.modalRoomTitleSection}>
              <Text style={[styles.modalRoomNumber, { color: colors.text }]}>
                {t('roomNumber')} {selectedRoom.number}
              </Text>
              <Text style={[styles.modalRoomType, { color: colors.textSecondary }]}>
                {roomTypeLabels[selectedRoom.type] || selectedRoom.type}
              </Text>
            </View>
            <View style={[styles.modalStatusChip, { backgroundColor: status.color + '20' }]}>
              <View style={[styles.statusDot, { backgroundColor: status.color }]} />
              <Text style={[styles.modalStatusLabel, { color: status.color }]}>
                {getStatusLabel(selectedRoom.status)}
              </Text>
            </View>
          </View>

          <View style={styles.detailsGrid}>
            <View style={[styles.detailItem, { backgroundColor: isDark ? '#1e293b' : '#f8fafc' }]}>
              <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>{t('floor')}</Text>
              <Text style={[styles.detailValue, { color: colors.text }]}>{selectedRoom.floor}</Text>
            </View>
            <View style={[styles.detailItem, { backgroundColor: isDark ? '#1e293b' : '#f8fafc' }]}>
              <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>{t('price')}</Text>
              <Text style={[styles.detailValue, { color: colors.tint }]}>{formatCurrency(selectedRoom.price)}</Text>
            </View>
            <View style={[styles.detailItem, { backgroundColor: isDark ? '#1e293b' : '#f8fafc' }]}>
              <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>{t('capacity')}</Text>
              <Text style={[styles.detailValue, { color: colors.text }]}>{selectedRoom.capacity} {t('people')}</Text>
            </View>
            {selectedRoom.currentGuest && (
              <View style={[styles.detailItem, { backgroundColor: isDark ? '#1e293b' : '#f8fafc' }]}>
                <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>{t('guest')}</Text>
                <Text style={[styles.detailValue, { color: colors.text }]}>{selectedRoom.currentGuest}</Text>
              </View>
            )}
          </View>

          {selectedRoom.amenities && selectedRoom.amenities.length > 0 && (
            <View style={styles.amenitiesSection}>
              <Text style={[styles.amenitiesTitle, { color: colors.text }]}>{t('amenities')}</Text>
              <View style={styles.amenitiesList}>
                {selectedRoom.amenities.map((amenity, index) => {
                  const IconComp = amenityIcons[amenity.toLowerCase()] || Coffee;
                  return (
                    <View key={index} style={[styles.amenityChip, { backgroundColor: isDark ? '#1e293b' : '#f0fdf4' }]}>
                      <IconComp size={14} color={colors.tint} />
                      <Text style={[styles.amenityText, { color: colors.text }]}>{amenity}</Text>
                    </View>
                  );
                })}
              </View>
            </View>
          )}

          <View style={styles.modalActionsRow}>
            {selectedRoom.status === 'vacant' && (
              <TouchableOpacity
                style={[styles.modalActionBtn, { backgroundColor: Colors.status.vacant }]}
                onPress={handleShowCheckIn}
              >
                <LogIn size={18} color="#fff" />
                <Text style={styles.modalActionBtnText}>{t('checkIn')}</Text>
              </TouchableOpacity>
            )}
            {selectedRoom.status === 'occupied' && (
              <>
                <TouchableOpacity
                  style={[styles.modalActionBtn, { backgroundColor: Colors.status.cleaning }]}
                  onPress={handleShowCheckOut}
                >
                  <LogOut size={18} color="#fff" />
                  <Text style={styles.modalActionBtnText}>{t('checkOut')}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalActionBtn, { backgroundColor: '#6366f1' }]}
                  onPress={handleShowTransfer}
                >
                  <ArrowRightLeft size={18} color="#fff" />
                  <Text style={styles.modalActionBtnText}>{t('transferRoom')}</Text>
                </TouchableOpacity>
              </>
            )}
            {selectedRoom.status === 'cleaning' && (
              <TouchableOpacity
                style={[styles.modalActionBtn, { backgroundColor: Colors.status.vacant }]}
                onPress={handleMarkClean}
              >
                <CheckCircle size={18} color="#fff" />
                <Text style={styles.modalActionBtnText}>{t('completeCleaning')}</Text>
              </TouchableOpacity>
            )}
            {selectedRoom.status === 'maintenance' && (
              <TouchableOpacity
                style={[styles.modalActionBtn, { backgroundColor: Colors.status.vacant }]}
                onPress={handleMarkClean}
              >
                <CheckCircle size={18} color="#fff" />
                <Text style={styles.modalActionBtnText}>{t('completeMaintenance')}</Text>
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.secondaryActions}>
            {(selectedRoom.status === 'vacant' || selectedRoom.status === 'occupied') && (
              <TouchableOpacity
                style={[styles.secondaryActionBtn, { borderColor: '#f59e0b' }]}
                onPress={handleCleaning}
              >
                <Brush size={16} color="#f59e0b" />
                <Text style={[styles.secondaryActionText, { color: '#f59e0b' }]}>{t('cleanRoom')}</Text>
              </TouchableOpacity>
            )}
            {selectedRoom.status === 'vacant' && (
              <TouchableOpacity
                style={[styles.secondaryActionBtn, { borderColor: Colors.status.dirty }]}
                onPress={handleDirty}
              >
                <Brush size={16} color={Colors.status.dirty} />
                <Text style={[styles.secondaryActionText, { color: Colors.status.dirty }]}>{language === 'vi' ? 'Đánh dấu bẩn' : 'Mark Dirty'}</Text>
              </TouchableOpacity>
            )}
            {selectedRoom.status === 'occupied' && (
              selectedRoom.guestStatus !== 'out' ? (
                <TouchableOpacity
                  style={[styles.secondaryActionBtn, { borderColor: Colors.status.guestOut }, guestOutMutation.isPending && { opacity: 0.6 }]}
                  onPress={() => { if (guestOutMutation.isPending) return; handleGuestOut(); }}
                  disabled={guestOutMutation.isPending}
                >
                  {guestOutMutation.isPending ? (
                    <ActivityIndicator size="small" color={Colors.status.guestOut} />
                  ) : (
                    <>
                      <LogOut size={16} color={Colors.status.guestOut} />
                      <Text style={[styles.secondaryActionText, { color: Colors.status.guestOut }]}>{language === 'vi' ? 'Khách ra ngoài' : 'Guest Out'}</Text>
                    </>
                  )}
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={[styles.secondaryActionBtn, { borderColor: Colors.status.vacant }, guestReturnMutation.isPending && { opacity: 0.6 }]}
                  onPress={() => { if (guestReturnMutation.isPending) return; handleGuestReturn(); }}
                  disabled={guestReturnMutation.isPending}
                >
                  {guestReturnMutation.isPending ? (
                    <ActivityIndicator size="small" color={Colors.status.vacant} />
                  ) : (
                    <>
                      <LogIn size={16} color={Colors.status.vacant} />
                      <Text style={[styles.secondaryActionText, { color: Colors.status.vacant }]}>{language === 'vi' ? 'Khách quay lại' : 'Guest Return'}</Text>
                    </>
                  )}
                </TouchableOpacity>
              )
            )}
            {selectedRoom.status !== 'maintenance' && (
              <TouchableOpacity
                style={[styles.secondaryActionBtn, { borderColor: Colors.status.maintenance }]}
                onPress={handleMaintenance}
              >
                <Wrench size={16} color={Colors.status.maintenance} />
                <Text style={[styles.secondaryActionText, { color: Colors.status.maintenance }]}>{t('maintenance')}</Text>
              </TouchableOpacity>
            )}
          </View>
        </ScrollView>
      );
    }

    if (modalMode === 'checkin') {
      return (
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <ScrollView
            showsVerticalScrollIndicator={true}
            keyboardShouldPersistTaps="handled"
            nestedScrollEnabled
            contentContainerStyle={styles.modalScrollContent}
            scrollEnabled={true}
            decelerationRate="normal"
            scrollEventThrottle={16}
          >
            <View style={[styles.checkInHeader, { borderBottomColor: colors.divider }]}>
              <LogIn size={24} color={Colors.status.vacant} />
              <Text style={[styles.checkInTitle, { color: colors.text }]}>
                {t('checkIn')} - {t('roomNumber')} {selectedRoom.number}
              </Text>
            </View>

            <View style={styles.formSection}>
              <View style={styles.formField}>
                <View style={styles.formLabelRow}>
                  <User size={16} color={colors.tint} />
                  <Text style={[styles.formLabel, { color: colors.text }]}>{t('guestName')}</Text>
                </View>
                <TextInput
                  style={[styles.formInput, { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder, color: colors.text }]}
                  value={checkInForm.guestName}
                  onChangeText={(v) => setCheckInForm(prev => ({ ...prev, guestName: v }))}
                  placeholder={t('enterGuestName')}
                  placeholderTextColor={colors.textSecondary}
                />
              </View>

              <View style={styles.formField}>
                <View style={styles.formLabelRow}>
                  <Phone size={16} color={colors.tint} />
                  <Text style={[styles.formLabel, { color: colors.text }]}>{t('guestPhone')}</Text>
                </View>
                <TextInput
                  style={[styles.formInput, { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder, color: colors.text }]}
                  value={checkInForm.guestPhone}
                  onChangeText={(v) => setCheckInForm(prev => ({ ...prev, guestPhone: v }))}
                  placeholder={t('enterGuestPhone')}
                  placeholderTextColor={colors.textSecondary}
                  keyboardType="phone-pad"
                />
              </View>

              <View style={styles.formField}>
                <View style={styles.formLabelRow}>
                  <CreditCard size={16} color={colors.tint} />
                  <Text style={[styles.formLabel, { color: colors.text }]}>{t('guestId')}</Text>
                </View>
                <TextInput
                  style={[styles.formInput, { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder, color: colors.text }]}
                  value={checkInForm.guestId}
                  onChangeText={(v) => setCheckInForm(prev => ({ ...prev, guestId: v }))}
                  placeholder={t('enterGuestId')}
                  placeholderTextColor={colors.textSecondary}
                />
              </View>

              <View style={styles.guestCountRow}>
                <View style={styles.guestCountItem}>
                  <View style={styles.formLabelRow}>
                    <Users size={16} color={colors.tint} />
                    <Text style={[styles.formLabel, { color: colors.text }]}>
                      {language === 'vi' ? 'Người lớn' : 'Adults'}
                    </Text>
                  </View>
                  <View style={styles.counterControl}>
                    <TouchableOpacity
                      style={[styles.counterBtn, { backgroundColor: isDark ? '#334155' : '#f3f4f6' }]}
                      onPress={() => setCheckInForm(prev => ({ ...prev, adults: Math.max(1, prev.adults - 1) }))}
                    >
                      <Text style={[styles.counterBtnText, { color: colors.text }]}>-</Text>
                    </TouchableOpacity>
                    <Text style={[styles.counterValue, { color: colors.text }]}>{checkInForm.adults}</Text>
                    <TouchableOpacity
                      style={[styles.counterBtn, { backgroundColor: isDark ? '#334155' : '#f3f4f6' }]}
                      onPress={() => setCheckInForm(prev => ({ ...prev, adults: prev.adults + 1 }))}
                    >
                      <Text style={[styles.counterBtnText, { color: colors.text }]}>+</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                <View style={styles.guestCountItem}>
                  <View style={styles.formLabelRow}>
                    <Users size={16} color={colors.tint} />
                    <Text style={[styles.formLabel, { color: colors.text }]}>
                      {language === 'vi' ? 'Trẻ em' : 'Children'}
                    </Text>
                  </View>
                  <View style={styles.counterControl}>
                    <TouchableOpacity
                      style={[styles.counterBtn, { backgroundColor: isDark ? '#334155' : '#f3f4f6' }]}
                      onPress={() => setCheckInForm(prev => ({ ...prev, children: Math.max(0, prev.children - 1) }))}
                    >
                      <Text style={[styles.counterBtnText, { color: colors.text }]}>-</Text>
                    </TouchableOpacity>
                    <Text style={[styles.counterValue, { color: colors.text }]}>{checkInForm.children}</Text>
                    <TouchableOpacity
                      style={[styles.counterBtn, { backgroundColor: isDark ? '#334155' : '#f3f4f6' }]}
                      onPress={() => setCheckInForm(prev => ({ ...prev, children: prev.children + 1 }))}
                    >
                      <Text style={[styles.counterBtnText, { color: colors.text }]}>+</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>

              <View style={styles.formField}>
                <View style={styles.formLabelRow}>
                  <Calendar size={16} color={colors.tint} />
                  <Text style={[styles.formLabel, { color: colors.text }]}>{t('rateType')}</Text>
                </View>
                <View style={styles.optionRow}>
                  {(['hourly', 'daily', 'nightly', 'weekly', 'monthly'] as RateType[]).map(option => (
                    <TouchableOpacity
                      key={option}
                      style={[
                        styles.optionChip,
                        { backgroundColor: colors.cardBackground, borderColor: colors.border },
                        checkInForm.rateType === option && { backgroundColor: colors.tint, borderColor: colors.tint },
                      ]}
                      onPress={() => setCheckInForm(prev => ({ ...prev, rateType: option }))}
                    >
                      <Text style={[styles.optionText, { color: checkInForm.rateType === option ? '#fff' : colors.textSecondary }]}>
                        {t(option)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.formField}>
                <View style={styles.formLabelRow}>
                  <CreditCard size={16} color={colors.tint} />
                  <Text style={[styles.formLabel, { color: colors.text }]}>{t('paymentMethod')}</Text>
                </View>
                <View style={styles.optionRow}>
                  {(['cash', 'transfer', 'card'] as PaymentMethod[]).map(option => (
                    <TouchableOpacity
                      key={option}
                      style={[
                        styles.optionChip,
                        { backgroundColor: colors.cardBackground, borderColor: colors.border },
                        checkInForm.paymentMethod === option && { backgroundColor: colors.tint, borderColor: colors.tint },
                      ]}
                      onPress={() => setCheckInForm(prev => ({ ...prev, paymentMethod: option }))}
                    >
                      <Text style={[styles.optionText, { color: checkInForm.paymentMethod === option ? '#fff' : colors.textSecondary }]}>
                        {t(option)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.formField}>
                <View style={styles.formLabelRow}>
                  <Coffee size={16} color={colors.tint} />
                  <Text style={[styles.formLabel, { color: colors.text }]}>{t('services')}</Text>
                </View>
                {isLoadingServiceList ? (
                  <ActivityIndicator size="small" color={colors.tint} />
                ) : (
                  <>
                    {availableServices.length === 0 ? (
                      <Text style={[styles.serviceEmptyText, { color: colors.textSecondary }]}>
                        {t('noServices')}
                      </Text>
                    ) : (
                      <View style={[styles.serviceList, { borderColor: colors.border, backgroundColor: colors.cardBackground }]}>
                        <View style={styles.serviceDropdownScroll}>
                          {availableServices.map((item) => {
                            const qty = selectedServices.find(s => s.serviceId === item.id)?.quantity ?? 0;
                            return (
                              <View key={item.id} style={[styles.serviceListItem, { borderBottomColor: colors.border }]}>
                                <View style={styles.serviceDropdownInfo}>
                                  <Text style={[styles.serviceDropdownName, { color: colors.text }]}>{item.name}</Text>
                                  <Text style={[styles.serviceDropdownPrice, { color: colors.textSecondary }]}>{formatCurrency(item.price)}</Text>
                                </View>
                                <View style={styles.serviceListActions}>
                                  <TouchableOpacity
                                    style={[styles.counterBtn, { backgroundColor: isDark ? '#334155' : '#f3f4f6' }]}
                                    onPress={() => updateServiceQuantity(item as Service, -1)}
                                  >
                                    <Text style={[styles.counterBtnText, { color: colors.text }]}>-</Text>
                                  </TouchableOpacity>
                                  <Text style={[styles.counterValue, { color: colors.text }]}>{qty}</Text>
                                  <TouchableOpacity
                                    style={[styles.counterBtn, { backgroundColor: isDark ? '#334155' : '#f3f4f6' }]}
                                    onPress={() => updateServiceQuantity(item as Service, 1)}
                                  >
                                    <Text style={[styles.counterBtnText, { color: colors.text }]}>+</Text>
                                  </TouchableOpacity>
                                </View>
                              </View>
                            );
                          })}
                        </View>
                        {selectedServices.length > 0 && (
                          <View style={styles.selectedServiceList}>
                            {selectedServices.map(service => (
                            <View key={service.serviceId} style={[styles.selectedServiceItem, { borderColor: colors.border }]}>
                              <View style={styles.selectedServiceInfo}>
                                <Text style={[styles.selectedServiceName, { color: colors.text }]}>{service.serviceName}</Text>
                                <Text style={[styles.selectedServiceMeta, { color: colors.textSecondary }]}>
                                  {service.quantity} × {formatCurrency(service.price)}
                                </Text>
                              </View>
                              <View style={styles.selectedServiceActions}>
                                <Text style={[styles.selectedServiceTotal, { color: colors.text }]}>{formatCurrency(service.totalPrice)}</Text>
                                <TouchableOpacity
                                  style={[styles.removeServiceBtn, { backgroundColor: isDark ? '#374151' : '#f3f4f6' }]}
                                  onPress={() => updateServiceQuantity({ id: service.serviceId } as Service, -service.quantity)}
                                >
                                  <X size={14} color={colors.textSecondary} />
                                </TouchableOpacity>
                              </View>
                            </View>
                          ))}
                          </View>
                        )}
                      </View>
                    )}
                  </>
                )}
                <View style={styles.serviceTotalRow}>
                  <Text style={[styles.serviceTotalLabel, { color: colors.textSecondary }]}>{t('serviceTotal')}</Text>
                  <Text style={[styles.serviceTotalValue, { color: colors.text }]}>{formatCurrency(serviceTotal)}</Text>
                </View>
              </View>

              <View style={styles.formField}>
                <View style={styles.formLabelRow}>
                  <CreditCard size={16} color={colors.tint} />
                  <Text style={[styles.formLabel, { color: colors.text }]}>{t('advancePayment')}</Text>
                </View>
                <TextInput
                  style={[styles.formInput, { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder, color: colors.text }]}
                  value={checkInForm.advancePayment}
                  onChangeText={(v) => setCheckInForm(prev => ({ ...prev, advancePayment: v }))}
                  placeholder="0"
                  placeholderTextColor={colors.textSecondary}
                  keyboardType="numeric"
                />
              </View>

              <View style={styles.formField}>
                <View style={styles.formLabelRow}>
                  <CreditCard size={16} color={colors.tint} />
                  <Text style={[styles.formLabel, { color: colors.text }]}>{t('additionalCharges')}</Text>
                </View>
                <TextInput
                  style={[styles.formInput, { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder, color: colors.text }]}
                  value={checkInForm.additionalCharges}
                  onChangeText={(v) => setCheckInForm(prev => ({ ...prev, additionalCharges: v }))}
                  placeholder="0"
                  placeholderTextColor={colors.textSecondary}
                  keyboardType="numeric"
                />
              </View>

              <View style={styles.formField}>
                <View style={styles.formLabelRow}>
                  <CreditCard size={16} color={colors.tint} />
                  <Text style={[styles.formLabel, { color: colors.text }]}>{t('discount')}</Text>
                </View>
                <TextInput
                  style={[styles.formInput, { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder, color: colors.text }]}
                  value={checkInForm.discount}
                  onChangeText={(v) => setCheckInForm(prev => ({ ...prev, discount: v }))}
                  placeholder="0"
                  placeholderTextColor={colors.textSecondary}
                  keyboardType="numeric"
                />
              </View>

              <View style={styles.formField}>
                <View style={styles.formLabelRow}>
                  <CreditCard size={16} color={colors.tint} />
                  <Text style={[styles.formLabel, { color: colors.text }]}>{t('notes')}</Text>
                </View>
                <TextInput
                  style={[styles.formInput, styles.notesInput, { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder, color: colors.text }]}
                  value={checkInForm.notes}
                  onChangeText={(v) => setCheckInForm(prev => ({ ...prev, notes: v }))}
                  placeholder={t('notes')}
                  placeholderTextColor={colors.textSecondary}
                  multiline
                />
              </View>
            </View>

            <View style={styles.formActions}>
              <TouchableOpacity
                style={[styles.formCancelBtn, { borderColor: colors.border }]}
                onPress={() => setModalMode('details')}
              >
                <Text style={[styles.formCancelText, { color: colors.textSecondary }]}>{t('cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.formSubmitBtn, checkInMutation.isPending && { opacity: 0.6 }]}
                onPress={handleCheckIn}
                disabled={checkInMutation.isPending}
              >
                {checkInMutation.isPending ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <LogIn size={18} color="#fff" />
                    <Text style={styles.formSubmitText}>{t('checkIn')}</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      );
    }

    if (modalMode === 'checkout') {
      const checkInDisplay = formatDateTime(selectedRoom.checkInTime);
      const guestDisplay = checkOutForm.guestName || selectedRoom.currentGuest || t('walkInGuest');
      const phoneDisplay = checkOutForm.guestPhone || selectedRoom.guestPhone || '';
      const idDisplay = checkOutForm.guestId || selectedRoom.guestIdNumber || '';
      return (
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <ScrollView
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            nestedScrollEnabled
            contentContainerStyle={styles.modalScrollContent}
            scrollEnabled={true}
            decelerationRate="normal"
            scrollEventThrottle={16}
          >
            <View style={[styles.checkInHeader, { borderBottomColor: colors.divider }]}>
              <LogOut size={24} color={Colors.status.cleaning} />
              <Text style={[styles.checkInTitle, { color: colors.text }]}>
                {t('checkOut')} - {t('roomNumber')} {selectedRoom.number}
              </Text>
            </View>

            <View style={[styles.checkoutInfoCard, { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder }]}>
              <View style={styles.checkoutInfoRow}>
                <Text style={[styles.checkoutInfoLabel, { color: colors.textSecondary }]}>{t('checkIn')}</Text>
                <Text style={[styles.checkoutInfoValue, { color: colors.text }]}>{checkInDisplay || '-'}</Text>
              </View>
              <View style={styles.checkoutInfoRow}>
                <Text style={[styles.checkoutInfoLabel, { color: colors.textSecondary }]}>{t('guestName')}</Text>
                <Text style={[styles.checkoutInfoValue, { color: colors.text }]}>{guestDisplay}</Text>
              </View>
              {phoneDisplay ? (
                <View style={styles.checkoutInfoRow}>
                  <Text style={[styles.checkoutInfoLabel, { color: colors.textSecondary }]}>{t('guestPhone')}</Text>
                  <Text style={[styles.checkoutInfoValue, { color: colors.text }]}>{phoneDisplay}</Text>
                </View>
              ) : null}
              {idDisplay ? (
                <View style={styles.checkoutInfoRow}>
                  <Text style={[styles.checkoutInfoLabel, { color: colors.textSecondary }]}>{t('guestId')}</Text>
                  <Text style={[styles.checkoutInfoValue, { color: colors.text }]}>{idDisplay}</Text>
                </View>
              ) : null}
              <View style={styles.checkoutInfoRow}>
                <Text style={[styles.checkoutInfoLabel, { color: colors.textSecondary }]}>{t('rateType')}</Text>
                <Text style={[styles.checkoutInfoValue, { color: colors.text }]}>{t(checkOutForm.rateType)}</Text>
              </View>
            </View>

            <View style={styles.formSection}>
              <View style={styles.formField}>
                <View style={styles.formLabelRow}>
                  <User size={16} color={colors.tint} />
                  <Text style={[styles.formLabel, { color: colors.text }]}>{t('guestName')}</Text>
                </View>
                <TextInput
                  style={[styles.formInput, { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder, color: colors.text }]}
                  value={checkOutForm.guestName}
                  onChangeText={(v) => setCheckOutForm(prev => ({ ...prev, guestName: v }))}
                  placeholder={t('enterGuestName')}
                  placeholderTextColor={colors.textSecondary}
                />
              </View>

              <View style={styles.formField}>
                <View style={styles.formLabelRow}>
                  <Phone size={16} color={colors.tint} />
                  <Text style={[styles.formLabel, { color: colors.text }]}>{t('guestPhone')}</Text>
                </View>
                <TextInput
                  style={[styles.formInput, { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder, color: colors.text }]}
                  value={checkOutForm.guestPhone}
                  onChangeText={(v) => setCheckOutForm(prev => ({ ...prev, guestPhone: v }))}
                  placeholder={t('enterGuestPhone')}
                  placeholderTextColor={colors.textSecondary}
                  keyboardType="phone-pad"
                />
              </View>

              <View style={styles.formField}>
                <View style={styles.formLabelRow}>
                  <CreditCard size={16} color={colors.tint} />
                  <Text style={[styles.formLabel, { color: colors.text }]}>{t('guestId')}</Text>
                </View>
                <TextInput
                  style={[styles.formInput, { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder, color: colors.text }]}
                  value={checkOutForm.guestId}
                  onChangeText={(v) => setCheckOutForm(prev => ({ ...prev, guestId: v }))}
                  placeholder={t('enterGuestId')}
                  placeholderTextColor={colors.textSecondary}
                />
              </View>

              <View style={styles.formField}>
                <View style={styles.formLabelRow}>
                  <Calendar size={16} color={colors.tint} />
                  <Text style={[styles.formLabel, { color: colors.text }]}>{t('rateType')}</Text>
                </View>
                <View style={styles.optionRow}>
                  {(['hourly', 'daily', 'nightly', 'weekly', 'monthly'] as RateType[]).map(option => (
                    <TouchableOpacity
                      key={option}
                      style={[
                        styles.optionChip,
                        { backgroundColor: colors.cardBackground, borderColor: colors.border },
                        checkOutForm.rateType === option && { backgroundColor: colors.tint, borderColor: colors.tint },
                      ]}
                      onPress={() => setCheckOutForm(prev => ({ ...prev, rateType: option }))}
                    >
                      <Text style={[styles.optionText, { color: checkOutForm.rateType === option ? '#fff' : colors.textSecondary }]}>
                        {t(option)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.formField}>
                <View style={styles.formLabelRow}>
                  <CreditCard size={16} color={colors.tint} />
                  <Text style={[styles.formLabel, { color: colors.text }]}>{t('paymentMethod')}</Text>
                </View>
                <View style={styles.optionRow}>
                  {(['cash', 'transfer', 'card'] as PaymentMethod[]).map(option => (
                    <TouchableOpacity
                      key={option}
                      style={[
                        styles.optionChip,
                        { backgroundColor: colors.cardBackground, borderColor: colors.border },
                        checkOutForm.paymentMethod === option && { backgroundColor: colors.tint, borderColor: colors.tint },
                      ]}
                      onPress={() => setCheckOutForm(prev => ({ ...prev, paymentMethod: option }))}
                    >
                      <Text style={[styles.optionText, { color: checkOutForm.paymentMethod === option ? '#fff' : colors.textSecondary }]}>
                        {t(option)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.formField}>
                <View style={styles.formLabelRow}>
                  <CreditCard size={16} color={colors.tint} />
                  <Text style={[styles.formLabel, { color: colors.text }]}>{t('advancePayment')}</Text>
                </View>
                <TextInput
                  style={[styles.formInput, { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder, color: colors.text }]}
                  value={checkOutForm.advancePayment}
                  onChangeText={(v) => setCheckOutForm(prev => ({ ...prev, advancePayment: v }))}
                  placeholder="0"
                  placeholderTextColor={colors.textSecondary}
                  keyboardType="numeric"
                />
              </View>

              <View style={styles.formField}>
                <View style={styles.formLabelRow}>
                  <Coffee size={16} color={colors.tint} />
                  <Text style={[styles.formLabel, { color: colors.text }]}>{t('services')}</Text>
                </View>
                {isLoadingServiceList ? (
                  <ActivityIndicator size="small" color={colors.tint} />
                ) : (
                  <>
                    {availableServices.length === 0 ? (
                      <Text style={[styles.serviceEmptyText, { color: colors.textSecondary }]}>
                        {t('noServices')}
                      </Text>
                    ) : (
                      <View style={styles.serviceDropdown}>
                        <TouchableOpacity
                          style={[styles.serviceDropdownHeader, { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder }]}
                          onPress={() => setIsCheckoutServiceOpen(prev => !prev)}
                          activeOpacity={0.7}
                        >
                          <View>
                            <Text style={[styles.serviceDropdownTitle, { color: colors.text }]}>
                              {selectedServiceOption ? selectedServiceOption.name : t('services')}
                            </Text>
                            <Text style={[styles.serviceDropdownSubtitle, { color: colors.textSecondary }]}>
                              {renderServiceDropdownSubtitle}
                            </Text>
                          </View>
                          {isCheckoutServiceOpen ? (
                            <ChevronUp size={18} color={colors.textSecondary} />
                          ) : (
                            <ChevronDown size={18} color={colors.textSecondary} />
                          )}
                        </TouchableOpacity>
                        <View style={[styles.serviceList, { borderColor: colors.border, backgroundColor: colors.cardBackground }]}>
                          <View style={styles.serviceDropdownScroll}>
                            {availableServices.map((item) => {
                              const qty = selectedServices.find(s => s.serviceId === item.id)?.quantity ?? 0;
                              return (
                                <View key={item.id} style={[styles.serviceListItem, { borderBottomColor: colors.border }]}>
                                  <View style={styles.serviceDropdownInfo}>
                                    <Text style={[styles.serviceDropdownName, { color: colors.text }]}>{item.name}</Text>
                                    <Text style={[styles.serviceDropdownPrice, { color: colors.textSecondary }]}>{formatCurrency(item.price)}</Text>
                                  </View>
                                  <View style={styles.serviceListActions}>
                                    <TouchableOpacity
                                      style={[styles.counterBtn, { backgroundColor: isDark ? '#334155' : '#f3f4f6' }]}
                                      onPress={() => updateServiceQuantity(item as Service, -1)}
                                    >
                                      <Text style={[styles.counterBtnText, { color: colors.text }]}>-</Text>
                                    </TouchableOpacity>
                                    <Text style={[styles.counterValue, { color: colors.text }]}>{qty}</Text>
                                    <TouchableOpacity
                                      style={[styles.counterBtn, { backgroundColor: isDark ? '#334155' : '#f3f4f6' }]}
                                      onPress={() => updateServiceQuantity(item as Service, 1)}
                                    >
                                      <Text style={[styles.counterBtnText, { color: colors.text }]}>+</Text>
                                    </TouchableOpacity>
                                  </View>
                                </View>
                              );
                            })}
                          </View>
                        </View>
                        {selectedServices.length > 0 && (
                          <View style={styles.selectedServiceList}>
                            {selectedServices.map(service => (
                              <View key={service.serviceId} style={[styles.selectedServiceItem, { borderColor: colors.border }]}>
                                <View style={styles.selectedServiceInfo}>
                                  <Text style={[styles.selectedServiceName, { color: colors.text }]}>{service.serviceName}</Text>
                                  <Text style={[styles.selectedServiceMeta, { color: colors.textSecondary }]}>
                                    {service.quantity} × {formatCurrency(service.price)}
                                  </Text>
                                </View>
                                <View style={styles.selectedServiceActions}>
                                  <Text style={[styles.selectedServiceTotal, { color: colors.text }]}>{formatCurrency(service.totalPrice)}</Text>
                                  <TouchableOpacity
                                    style={[styles.removeServiceBtn, { backgroundColor: isDark ? '#374151' : '#f3f4f6' }]}
                                    onPress={() => updateServiceQuantity({ id: service.serviceId } as Service, -service.quantity)}
                                  >
                                    <X size={14} color={colors.textSecondary} />
                                  </TouchableOpacity>
                                </View>
                              </View>
                            ))}
                          </View>
                        )}
                      </View>
                    )}
                  </>
                )}
                <View style={styles.serviceTotalRow}>
                  <Text style={[styles.serviceTotalLabel, { color: colors.textSecondary }]}>{t('serviceTotal')}</Text>
                  <Text style={[styles.serviceTotalValue, { color: colors.text }]}>{formatCurrency(serviceTotal)}</Text>
                </View>
              </View>

              <View style={styles.formField}>
                <View style={styles.formLabelRow}>
                  <CreditCard size={16} color={colors.tint} />
                  <Text style={[styles.formLabel, { color: colors.text }]}>{t('additionalCharges')}</Text>
                </View>
                <TextInput
                  style={[styles.formInput, { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder, color: colors.text }]}
                  value={checkOutForm.additionalCharges}
                  onChangeText={(v) => setCheckOutForm(prev => ({ ...prev, additionalCharges: v }))}
                  placeholder="0"
                  placeholderTextColor={colors.textSecondary}
                  keyboardType="numeric"
                />
              </View>

              <View style={styles.formField}>
                <View style={styles.formLabelRow}>
                  <CreditCard size={16} color={colors.tint} />
                  <Text style={[styles.formLabel, { color: colors.text }]}>{t('discount')}</Text>
                </View>
                <TextInput
                  style={[styles.formInput, { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder, color: colors.text }]}
                  value={checkOutForm.discount}
                  onChangeText={(v) => setCheckOutForm(prev => ({ ...prev, discount: v }))}
                  placeholder="0"
                  placeholderTextColor={colors.textSecondary}
                  keyboardType="numeric"
                />
              </View>

              <View style={[styles.summaryCard, { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder }]}>
                <View style={styles.summaryRow}>
                  <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>{t('roomTotal')}</Text>
                  <Text style={[styles.summaryValue, { color: colors.text }]}>{formatCurrency(checkoutTotals.roomTotal)}</Text>
                </View>
                {checkoutTotals.roomPriceDetails?.rateType === 'daily' && Number(checkoutTotals.roomPriceDetails.days) > 0 && (
                  <View style={styles.summaryDetailRow}>
                    <Text style={[styles.summaryDetailLabel, { color: colors.textSecondary }]}>
                      {`${checkoutTotals.roomPriceDetails.days} ngày × ${formatCurrency(Number(checkoutTotals.roomPriceDetails.basePrice) || 0)}/ngày:`}
                    </Text>
                    <Text style={[styles.summaryDetailValue, { color: colors.text }]}>
                      {formatCurrency((Number(checkoutTotals.roomPriceDetails.days) || 0) * (Number(checkoutTotals.roomPriceDetails.basePrice) || 0))}
                    </Text>
                  </View>
                )}
                {checkoutTotals.roomPriceDetails?.rateType === 'nightly' && Number(checkoutTotals.roomPriceDetails.nights) > 0 && (
                  <View style={styles.summaryDetailRow}>
                    <Text style={[styles.summaryDetailLabel, { color: colors.textSecondary }]}>
                      {`${checkoutTotals.roomPriceDetails.nights} đêm × ${formatCurrency(Number(checkoutTotals.roomPriceDetails.basePrice) || 0)}/đêm:`}
                    </Text>
                    <Text style={[styles.summaryDetailValue, { color: colors.text }]}>
                      {formatCurrency((Number(checkoutTotals.roomPriceDetails.nights) || 0) * (Number(checkoutTotals.roomPriceDetails.basePrice) || 0))}
                    </Text>
                  </View>
                )}
                {checkoutTotals.roomPriceDetails?.rateType === 'hourly' && (
                  <>
                    <View style={styles.summaryDetailRow}>
                      <Text style={[styles.summaryDetailLabel, { color: colors.textSecondary }]}>Giờ đầu tiên:</Text>
                      <Text style={[styles.summaryDetailValue, { color: colors.text }]}>
                        {formatCurrency(Number(checkoutTotals.roomPriceDetails.firstHourPrice) || Number(checkoutTotals.roomPriceDetails.basePrice) || 0)}
                      </Text>
                    </View>
                    {Number(checkoutTotals.roomPriceDetails.additionalHoursCount) > 0 && (
                      <View style={styles.summaryDetailRow}>
                        <Text style={[styles.summaryDetailLabel, { color: colors.textSecondary }]}>
                          {`${checkoutTotals.roomPriceDetails.additionalHoursCount} giờ tiếp theo (${formatCurrency(
                            (Number(checkoutTotals.roomPriceDetails.additionalHoursPrice) || 0) / (Number(checkoutTotals.roomPriceDetails.additionalHoursCount) || 1)
                          )}/giờ):`}
                        </Text>
                        <Text style={[styles.summaryDetailValue, { color: colors.text }]}>
                          {formatCurrency(Number(checkoutTotals.roomPriceDetails.additionalHoursPrice) || 0)}
                        </Text>
                      </View>
                    )}
                  </>
                )}
                {checkoutTotals.earlyCheckinSurcharge > 0 && (
                  <View style={styles.summaryDetailRow}>
                    <Text style={[styles.summaryDetailLabel, { color: colors.textSecondary }]}>
                      {`Phụ thu checkin sớm${checkoutTotals.earlyCheckinHours > 0 ? ` (${checkoutTotals.earlyCheckinHours} giờ)` : ''}:`}
                    </Text>
                    <Text style={[styles.summaryDetailValue, styles.summarySurchargeValue]}>
                      {`+ ${formatCurrency(checkoutTotals.earlyCheckinSurcharge)}`}
                    </Text>
                  </View>
                )}
                {checkoutTotals.lateCheckoutSurcharge > 0 && (
                  <View style={styles.summaryDetailRow}>
                    <Text style={[styles.summaryDetailLabel, { color: colors.textSecondary }]}>
                      {`Phụ thu checkout trễ${checkoutTotals.lateCheckoutHours > 0 ? ` (${checkoutTotals.lateCheckoutHours} giờ)` : ''}:`}
                    </Text>
                    <Text style={[styles.summaryDetailValue, styles.summarySurchargeValue]}>
                      {`+ ${formatCurrency(checkoutTotals.lateCheckoutSurcharge)}`}
                    </Text>
                  </View>
                )}
                <View style={styles.summaryRow}>
                  <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>{t('serviceTotal')}</Text>
                  <Text style={[styles.summaryValue, { color: colors.text }]}>{formatCurrency(serviceTotal)}</Text>
                </View>
                <View style={styles.summaryRow}>
                  <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>{t('additionalCharges')}</Text>
                  <Text style={[styles.summaryValue, { color: colors.text }]}>{formatCurrency(checkoutTotals.additionalCharges)}</Text>
                </View>
                <View style={styles.summaryRow}>
                  <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>{t('discount')}</Text>
                  <Text style={[styles.summaryValue, { color: colors.text }]}>{formatCurrency(checkoutTotals.discount)}</Text>
                </View>
                <View style={styles.summaryRow}>
                  <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>{t('totalBeforeAdvance')}</Text>
                  <Text style={[styles.summaryValue, { color: colors.text }]}>{formatCurrency(checkoutTotals.grossTotal)}</Text>
                </View>
                <View style={styles.summaryRow}>
                  <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>{t('advancePayment')}</Text>
                  <Text style={[styles.summaryValue, { color: colors.text }]}>{formatCurrency(checkoutTotals.advancePayment)}</Text>
                </View>
                <View style={[styles.summaryDivider, { backgroundColor: colors.border }]} />
                <View style={styles.summaryRow}>
                  <Text style={[styles.summaryLabel, { color: colors.text }]}>{t('remainingAmount')}</Text>
                  <Text style={[styles.summaryValue, { color: colors.tint }]}>{formatCurrency(checkoutTotals.remainingAmount)}</Text>
                </View>
              </View>

              <View style={styles.formField}>
                <View style={styles.formLabelRow}>
                  <CreditCard size={16} color={colors.tint} />
                  <Text style={[styles.formLabel, { color: colors.text }]}>{t('notes')}</Text>
                </View>
                <TextInput
                  style={[styles.formInput, styles.notesInput, { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder, color: colors.text }]}
                  value={checkOutForm.notes}
                  onChangeText={(v) => setCheckOutForm(prev => ({ ...prev, notes: v }))}
                  placeholder={t('notes')}
                  placeholderTextColor={colors.textSecondary}
                  multiline
                />
              </View>
            </View>

            <View style={styles.formActions}>
              <TouchableOpacity
                style={[styles.formCancelBtn, { borderColor: colors.border }]}
                onPress={() => setModalMode('details')}
              >
                <Text style={[styles.formCancelText, { color: colors.textSecondary }]}>{t('cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.formSecondaryBtn, saveCheckinInfoMutation.isPending && { opacity: 0.6 }]}
                onPress={handleSaveCheckOutInfo}
                disabled={saveCheckinInfoMutation.isPending}
              >
                {saveCheckinInfoMutation.isPending ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <CheckCircle size={18} color="#fff" />
                    <Text style={styles.formSubmitText}>{t('save')}</Text>
                  </>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.formSubmitBtn, checkOutMutation.isPending && { opacity: 0.6 }]}
                onPress={handleCheckOut}
                disabled={checkOutMutation.isPending}
              >
                {checkOutMutation.isPending ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <LogOut size={18} color="#fff" />
                    <Text style={styles.formSubmitText}>{t('checkOut')}</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      );
    }

    if (modalMode === 'cleaning') {
      const isMaintenance = selectedRoom.status === 'maintenance';
      return (
        <View>
          <View style={[styles.cleaningHeader, { borderBottomColor: colors.divider }]}>
            <Brush size={24} color={isMaintenance ? Colors.status.maintenance : Colors.status.cleaning} />
            <Text style={[styles.cleaningTitle, { color: colors.text }]}>
              {(isMaintenance ? t('maintenance') : t('cleanRoom'))} - {t('roomNumber')} {selectedRoom.number}
            </Text>
          </View>
          <Text style={[styles.cleaningNote, { color: colors.textSecondary }]}>
            {isMaintenance ? t('completeMaintenance') : t('completeCleaning')}
          </Text>
          <View style={styles.formActions}>
            <TouchableOpacity
              style={[styles.formCancelBtn, { borderColor: colors.border }]}
              onPress={() => setModalMode('details')}
            >
              <Text style={[styles.formCancelText, { color: colors.textSecondary }]}>{t('cancel')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.formSubmitBtn, markCleanMutation.isPending && { opacity: 0.6 }]}
              onPress={handleMarkClean}
              disabled={markCleanMutation.isPending}
            >
              {markCleanMutation.isPending ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <CheckCircle size={18} color="#fff" />
                  <Text style={styles.formSubmitText}>
                    {isMaintenance ? t('completeMaintenance') : t('completeCleaning')}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      );
    }

    if (modalMode === 'transfer') {
      return (
        <ScrollView
          showsVerticalScrollIndicator={false}
          nestedScrollEnabled
          contentContainerStyle={{ paddingBottom: 24 }}
          decelerationRate="normal"
          scrollEventThrottle={16}
        >
          <View style={[styles.transferHeader, { borderBottomColor: colors.divider }]}>
            <ArrowRightLeft size={24} color="#6366f1" />
            <Text style={[styles.transferTitle, { color: colors.text }]}>
              {t('transferRoomFrom')} {selectedRoom.number}
            </Text>
          </View>

          {selectedRoom.currentGuest && (
            <View style={[styles.transferGuestInfo, { backgroundColor: isDark ? '#1e293b' : '#f8fafc' }]}>
              <User size={16} color={colors.tint} />
              <Text style={[styles.transferGuestName, { color: colors.text }]}>{selectedRoom.currentGuest}</Text>
            </View>
          )}

          <Text style={[styles.transferSubtitle, { color: colors.textSecondary }]}>{t('selectTargetRoom')}</Text>

          <View style={styles.transferRoomList}>
            {availableRoomsForTransfer.length > 0 ? (
              availableRoomsForTransfer.map(room => (
                <TouchableOpacity
                  key={room.id}
                  style={[
                    styles.transferRoomItem,
                    { backgroundColor: colors.cardBackground, borderColor: colors.border },
                    transferTargetId === room.id && { borderColor: '#6366f1', backgroundColor: isDark ? '#1e1b4b' : '#eef2ff' },
                  ]}
                  onPress={() => setTransferTargetId(room.id)}
                >
                  <View style={styles.transferRoomLeft}>
                    <BedDouble size={18} color={transferTargetId === room.id ? '#6366f1' : colors.textSecondary} />
                    <View>
                      <Text style={[styles.transferRoomNum, { color: colors.text }]}>{room.number}</Text>
                      <Text style={[styles.transferRoomMeta, { color: colors.textSecondary }]}>
                        {roomTypeLabels[room.type]} • {t('floor')} {room.floor}
                      </Text>
                    </View>
                  </View>
                  {transferTargetId === room.id && (
                    <CheckCircle size={20} color="#6366f1" />
                  )}
                </TouchableOpacity>
              ))
            ) : (
              <View style={styles.noRoomsAvailable}>
                <AlertCircle size={24} color={colors.textSecondary} />
                <Text style={[styles.noRoomsText, { color: colors.textSecondary }]}>
                  {language === 'vi' ? 'Không có phòng trống' : 'No rooms available'}
                </Text>
              </View>
            )}
          </View>

          <View style={styles.formActions}>
            <TouchableOpacity
              style={[styles.formCancelBtn, { borderColor: colors.border }]}
              onPress={() => setModalMode('details')}
            >
              <Text style={[styles.formCancelText, { color: colors.textSecondary }]}>{t('cancel')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.transferSubmitBtn, (!transferTargetId || transferMutation.isPending) && { opacity: 0.5 }]}
              onPress={handleTransfer}
              disabled={!transferTargetId || transferMutation.isPending}
            >
              {transferMutation.isPending ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <ArrowRightLeft size={18} color="#fff" />
                  <Text style={styles.formSubmitText}>{t('transferRoom')}</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      );
    }

    return null;
  }, [selectedRoom, modalMode, checkInForm, checkOutForm, transferTargetId, availableRoomsForTransfer, colors, isDark, t, language,
    availableServices, isLoadingServiceList, selectedServices, serviceTotal, updateServiceQuantity, checkoutTotals, saveCheckinInfoMutation.isPending,
    handleCheckIn, handleCheckOut, handleSaveCheckOutInfo, handleShowCheckIn, handleShowCheckOut, handleShowTransfer, handleCleaning, handleMarkClean, handleMaintenance, handleTransfer,
    checkInMutation.isPending, checkOutMutation.isPending, markCleanMutation.isPending, transferMutation.isPending, formatCurrency, formatDateTime, getStatusLabel]);

  const draft = useGuestDraftStore(s => s.draft);
  useEffect(() => {
    if (!draft) return;
    if (!selectedRoom) return;
    if (modalMode === 'checkin') {
      setCheckInForm(prev => ({
        ...prev,
        guestName: draft.fullName || prev.guestName,
        guestPhone: draft.phone || prev.guestPhone,
        guestId: draft.idNumber || prev.guestId,
        notes: prev.notes,
      }));
    }
    if (modalMode === 'checkout') {
      setCheckOutForm(prev => ({
        ...prev,
        guestName: draft.fullName || prev.guestName,
        guestPhone: draft.phone || prev.guestPhone,
        guestId: draft.idNumber || prev.guestId,
        notes: prev.notes,
      }));
    }
  }, [draft, modalMode, selectedRoom]);

  if (isRoomsLoading && rooms.length === 0) {
    return (
      <View style={[styles.container, styles.loadingContainer, { paddingTop: insets.top, backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.tint} />
        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>{t('loadingRooms')}</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top, backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <View style={[styles.headerTop, isCompactHeader && styles.headerTopCompact]}>
          <View>
            <Text style={[styles.title, { color: colors.text }]}>{t('roomManagement')}</Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>{rooms.length} {t('rooms')}</Text>
          </View>
          <View style={[styles.viewToggle, isCompactHeader && styles.viewToggleCompact, { backgroundColor: colors.cardBackground }]}>
            <TouchableOpacity
              style={[styles.viewToggleBtn, viewMode === 'list' && { backgroundColor: colors.tint }]}
              onPress={() => setViewMode('list')}
            >
              <List size={18} color={viewMode === 'list' ? '#fff' : colors.textSecondary} />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.viewToggleBtn, viewMode === 'grid' && { backgroundColor: colors.tint }]}
              onPress={() => setViewMode('grid')}
            >
              <Grid3X3 size={18} color={viewMode === 'grid' ? '#fff' : colors.textSecondary} />
            </TouchableOpacity>
          </View>
        </View>
        <View style={[styles.headerActions, isCompactHeader && styles.headerActionsCompact]}>
          <TouchableOpacity
            style={[styles.voucherBtn, isCompactHeader && styles.voucherBtnCompact, { borderColor: colors.tint }]}
            onPress={() => setIncomeModalVisible(true)}
          >
            <PlusCircle size={16} color={colors.tint} />
            <Text style={[styles.voucherBtnText, { color: colors.tint }]}>Phiếu thu</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.voucherBtn, isCompactHeader && styles.voucherBtnCompact, { borderColor: colors.textSecondary }]}
            onPress={() => setExpenseModalVisible(true)}
          >
            <MinusCircle size={16} color={colors.textSecondary} />
            <Text style={[styles.voucherBtnText, { color: colors.textSecondary }]}>Phiếu chi</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.searchContainer}>
        <View style={[styles.searchBox, { backgroundColor: colors.cardBackground }]}>
          <Search size={18} color={colors.textSecondary} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder={t('searchRoom')}
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor={colors.textSecondary}
          />
        </View>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterContainer}
        contentContainerStyle={styles.filterContent}
      >
        <TouchableOpacity
          style={[styles.filterChip, { backgroundColor: colors.cardBackground }, selectedFilter === 'all' && { backgroundColor: colors.tint }]}
          onPress={() => setSelectedFilter('all')}
        >
          <Text style={[styles.filterChipText, { color: colors.textSecondary }, selectedFilter === 'all' && styles.filterChipTextActive]}>
            {t('all')} ({statusCounts.all})
          </Text>
        </TouchableOpacity>
        {(Object.keys(statusConfig) as RoomStatus[]).map((status) => (
          <TouchableOpacity
            key={status}
            style={[
              styles.filterChip,
              { backgroundColor: colors.cardBackground },
              selectedFilter === status && { backgroundColor: statusConfig[status].color },
            ]}
            onPress={() => setSelectedFilter(status)}
          >
            <Text
              style={[
                styles.filterChipText,
                { color: colors.textSecondary },
                selectedFilter === status && styles.filterChipTextActive,
              ]}
            >
              {getStatusLabel(status)} ({statusCounts[status]})
            </Text>
          </TouchableOpacity>
        ))}
        <TouchableOpacity
          style={[
            styles.filterChip,
            { backgroundColor: colors.cardBackground },
            selectedFilter === 'guest_out' && { backgroundColor: Colors.status.guestOut },
          ]}
          onPress={() => setSelectedFilter('guest_out')}
        >
          <Text
            style={[
              styles.filterChipText,
              { color: colors.textSecondary },
              selectedFilter === 'guest_out' && styles.filterChipTextActive,
            ]}
          >
            {language === 'vi' ? 'Khách ra ngoài' : 'Guest Out'} ({statusCounts.guest_out})
          </Text>
        </TouchableOpacity>
      </ScrollView>

      <ScrollView
        style={styles.roomsList}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.roomsListContent,
          viewMode === 'grid' && styles.gridContainer,
        ]}
        refreshControl={
          <RefreshControl refreshing={isRoomsLoading || isRoomsFetching} onRefresh={() =>{ refetchRooms(); }} />
        }
      >
        {viewMode === 'list'
          ? filteredRooms.map(renderListItem)
          : filteredRooms.map(renderGridItem)}
        {filteredRooms.length === 0 && (
          <View style={styles.emptyState}>
            {rooms.length === 0 ? (
              <>
                <AlertCircle size={48} color={colors.textSecondary} />
                <Text style={[styles.emptyText, { color: colors.textSecondary }]}>{t('noRoomData')}</Text>
                <Text style={[styles.emptySubtext, { color: colors.textSecondary }]}>{t('checkApiConnection')}</Text>
              </>
            ) : (
              <>
                <BedDouble size={48} color={colors.textSecondary} />
                <Text style={[styles.emptyText, { color: colors.textSecondary }]}>{t('noRoomFound')}</Text>
              </>
            )}
          </View>
        )}
      </ScrollView>

      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={closeModal}
      >
        <Pressable style={[styles.modalOverlay, { backgroundColor: colors.overlay }]} onPress={closeModal}>
          <Pressable style={[styles.modalContent, { backgroundColor: colors.cardBackground }]} onPress={(e) => {
            e.stopPropagation();
            // Close dropdown when clicking outside
            if (isCheckoutServiceOpen) {
              setIsCheckoutServiceOpen(false);
            }
          }}>
            <View style={styles.modalDragHandle}>
              <View style={[styles.dragBar, { backgroundColor: isDark ? '#475569' : '#d1d5db' }]} />
            </View>
            <TouchableOpacity onPress={closeModal} style={styles.modalCloseBtn}>
              <X size={24} color={colors.textSecondary} />
            </TouchableOpacity>
            {renderModalContent()}
          </Pressable>
        </Pressable>
      </Modal>

      <Modal
        visible={guestOutModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setGuestOutModalVisible(false)}
      >
        <Pressable style={[styles.modalOverlay, { backgroundColor: colors.overlay }]} onPress={() => setGuestOutModalVisible(false)}>
          <Pressable style={[styles.modalContent, { backgroundColor: colors.cardBackground }]} onPress={(e) => e.stopPropagation()}>
            <View style={styles.modalDragHandle}>
              <View style={[styles.dragBar, { backgroundColor: isDark ? '#475569' : '#d1d5db' }]} />
            </View>
            <TouchableOpacity onPress={() => setGuestOutModalVisible(false)} style={styles.modalCloseBtn}>
              <X size={24} color={colors.textSecondary} />
            </TouchableOpacity>
            <Text style={[styles.checkInTitle, { color: colors.text }]}>
              {language === 'vi' ? `Khách ra ngoài - Phòng ${selectedRoom?.number || ''}` : `Guest Out - Room ${selectedRoom?.number || ''}`}
            </Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              {language === 'vi' ? 'Xác nhận khách tạm thời ra ngoài. Phòng vẫn được giữ và tính phí.' : 'Confirm guest is temporarily out. Room remains occupied and billed.'}
            </Text>
            <View style={styles.formRow}>
              <Text style={[styles.formLabel, { color: colors.textSecondary }]}>
                {language === 'vi' ? 'Ghi chú (không bắt buộc)' : 'Note (optional)'}
              </Text>
              <TextInput
                style={[styles.input, styles.textArea, { color: colors.text, borderColor: colors.border }]}
                multiline
                value={guestOutNote}
                onChangeText={setGuestOutNote}
                placeholder={language === 'vi' ? 'Nhập ghi chú' : 'Enter note'}
                placeholderTextColor={colors.textSecondary}
              />
            </View>
            <View style={styles.confirmActions}>
              <TouchableOpacity
                style={[styles.confirmButton, styles.confirmButtonSecondary, { borderColor: colors.border }]}
                onPress={() => setGuestOutModalVisible(false)}
              >
                <Text style={[styles.confirmButtonText, { color: colors.textSecondary }]}>
                  {language === 'vi' ? 'Hủy' : 'Cancel'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.confirmButton, { backgroundColor: Colors.status.guestOut }, guestOutMutation.isPending && { opacity: 0.6 }]}
                onPress={() => { if (!guestOutMutation.isPending) confirmGuestOut(); }}
                disabled={guestOutMutation.isPending}
              >
                {guestOutMutation.isPending ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={[styles.confirmButtonText, { color: '#fff' }]}>
                    {language === 'vi' ? 'Xác nhận' : 'Confirm'}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal
        visible={guestReturnModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setGuestReturnModalVisible(false)}
      >
        <Pressable style={[styles.modalOverlay, { backgroundColor: colors.overlay }]} onPress={() => setGuestReturnModalVisible(false)}>
          <Pressable style={[styles.modalContent, { backgroundColor: colors.cardBackground }]} onPress={(e) => e.stopPropagation()}>
            <View style={styles.modalDragHandle}>
              <View style={[styles.dragBar, { backgroundColor: isDark ? '#475569' : '#d1d5db' }]} />
            </View>
            <TouchableOpacity onPress={() => setGuestReturnModalVisible(false)} style={styles.modalCloseBtn}>
              <X size={24} color={colors.textSecondary} />
            </TouchableOpacity>
            <Text style={[styles.checkInTitle, { color: colors.text }]}>
              {language === 'vi' ? `Khách quay lại - Phòng ${selectedRoom?.number || ''}` : `Guest Return - Room ${selectedRoom?.number || ''}`}
            </Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              {language === 'vi' ? 'Xác nhận khách đã quay lại phòng.' : 'Confirm guest has returned to the room.'}
            </Text>
            <View style={styles.confirmActions}>
              <TouchableOpacity
                style={[styles.confirmButton, styles.confirmButtonSecondary, { borderColor: colors.border }]}
                onPress={() => setGuestReturnModalVisible(false)}
              >
                <Text style={[styles.confirmButtonText, { color: colors.textSecondary }]}>
                  {language === 'vi' ? 'Hủy' : 'Cancel'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.confirmButton, { backgroundColor: Colors.status.vacant }, guestReturnMutation.isPending && { opacity: 0.6 }]}
                onPress={() => { if (!guestReturnMutation.isPending) confirmGuestReturn(); }}
                disabled={guestReturnMutation.isPending}
              >
                {guestReturnMutation.isPending ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={[styles.confirmButtonText, { color: '#fff' }]}>
                    {language === 'vi' ? 'Xác nhận' : 'Confirm'}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal
        visible={isIncomeModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setIncomeModalVisible(false)}
      >
        <Pressable style={[styles.modalOverlay, { backgroundColor: colors.overlay }]} onPress={() => setIncomeModalVisible(false)}>
          <Pressable style={[styles.modalContent, { backgroundColor: colors.cardBackground }]} onPress={(e) => e.stopPropagation()}>
            <View style={styles.modalDragHandle}>
              <View style={[styles.dragBar, { backgroundColor: isDark ? '#475569' : '#d1d5db' }]} />
            </View>
            <TouchableOpacity onPress={() => setIncomeModalVisible(false)} style={styles.modalCloseBtn}>
              <X size={24} color={colors.textSecondary} />
            </TouchableOpacity>
            <Text style={[styles.checkInTitle, { color: colors.text }]}>Tạo phiếu thu</Text>
            <View style={styles.formRow}>
              <Text style={[styles.formLabel, { color: colors.textSecondary }]}>Số tiền</Text>
              <TextInput
                style={[styles.input, { color: colors.text, borderColor: colors.border }]}
                keyboardType="numeric"
                value={incomeAmount}
                onChangeText={setIncomeAmount}
                placeholder="0"
                placeholderTextColor={colors.textSecondary}
              />
            </View>
            <View style={styles.formRow}>
              <Text style={[styles.formLabel, { color: colors.textSecondary }]}>Hình thức</Text>
              <View style={styles.chipsRow}>
                {(['cash','bank_transfer','card','other'] as const).map(m => (
                  <TouchableOpacity
                    key={m}
                    style={[
                      styles.chip,
                      { borderColor: colors.border },
                      incomeMethod === m && { backgroundColor: colors.tint }
                    ]}
                    onPress={() => setIncomeMethod(m)}
                  >
                    <Text style={[styles.chipText, { color: incomeMethod === m ? '#fff' : colors.textSecondary }]}>
                      {m === 'cash' ? 'Tiền mặt' : m === 'bank_transfer' ? 'Chuyển khoản' : m === 'card' ? 'Thẻ' : 'Khác'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            <View style={styles.formRow}>
              <Text style={[styles.formLabel, { color: colors.textSecondary }]}>Loại</Text>
              <View style={styles.chipsRow}>
                {(['service','rental','other'] as const).map(c => (
                  <TouchableOpacity
                    key={c}
                    style={[
                      styles.chip,
                      { borderColor: colors.border },
                      incomeCategory === c && { backgroundColor: colors.tint }
                    ]}
                    onPress={() => setIncomeCategory(c)}
                  >
                    <Text style={[styles.chipText, { color: incomeCategory === c ? '#fff' : colors.textSecondary }]}>
                      {c === 'service' ? 'Dịch vụ' : c === 'rental' ? 'Thuê' : 'Khác'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            <View style={styles.formRow}>
              <Text style={[styles.formLabel, { color: colors.textSecondary }]}>Mô tả</Text>
              <TextInput
                style={[styles.input, { color: colors.text, borderColor: colors.border }]}
                value={incomeDescription}
                onChangeText={setIncomeDescription}
                placeholder="Mô tả"
                placeholderTextColor={colors.textSecondary}
              />
            </View>
            <View style={styles.formRow}>
              <Text style={[styles.formLabel, { color: colors.textSecondary }]}>Người nộp</Text>
              <TextInput
                style={[styles.input, { color: colors.text, borderColor: colors.border }]}
                value={incomePayer}
                onChangeText={setIncomePayer}
                placeholder="Tên người nộp"
                placeholderTextColor={colors.textSecondary}
              />
            </View>
            <View style={styles.formRow}>
              <Text style={[styles.formLabel, { color: colors.textSecondary }]}>Ghi chú</Text>
              <TextInput
                style={[styles.input, styles.textArea, { color: colors.text, borderColor: colors.border }]}
                multiline
                value={incomeNotes}
                onChangeText={setIncomeNotes}
                placeholder="Ghi chú"
                placeholderTextColor={colors.textSecondary}
              />
            </View>
            <TouchableOpacity
              style={[styles.submitButton, voucherSubmitting && styles.buttonDisabled, { backgroundColor: colors.tint }]}
              onPress={async () => {
                if (!selectedHotelId) {
                  Alert.alert('Lỗi', 'Vui lòng chọn khách sạn');
                  return;
                }
                const amountNum = Number(incomeAmount);
                if (!amountNum || amountNum <= 0) {
                  Alert.alert('Lỗi', 'Số tiền không hợp lệ');
                  return;
                }
                setVoucherSubmitting(true);
                const ok = await transactionsApi.createIncome({
                  hotelId: selectedHotelId,
                  amount: amountNum,
                  method: incomeMethod,
                  incomeCategory,
                  description: incomeDescription,
                  notes: incomeNotes,
                  payer: incomePayer,
                });
                setVoucherSubmitting(false);
                if (ok) {
                  setIncomeModalVisible(false);
                  setIncomeAmount('');
                  setIncomeDescription('');
                  setIncomePayer('');
                  setIncomeNotes('');
                  Alert.alert('Thành công', 'Đã tạo phiếu thu');
                } else {
                  Alert.alert('Lỗi', 'Không thể tạo phiếu thu');
                }
              }}
              disabled={voucherSubmitting}
            >
              {voucherSubmitting ? (
                <ActivityIndicator size="small" color="#FFF" />
              ) : (
                <Text style={styles.submitButtonText}>Tạo phiếu thu</Text>
              )}
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal
        visible={isExpenseModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setExpenseModalVisible(false)}
      >
        <Pressable style={[styles.modalOverlay, { backgroundColor: colors.overlay }]} onPress={() => setExpenseModalVisible(false)}>
          <Pressable style={[styles.modalContent, { backgroundColor: colors.cardBackground }]} onPress={(e) => e.stopPropagation()}>
            <View style={styles.modalDragHandle}>
              <View style={[styles.dragBar, { backgroundColor: isDark ? '#475569' : '#d1d5db' }]} />
            </View>
            <TouchableOpacity onPress={() => setExpenseModalVisible(false)} style={styles.modalCloseBtn}>
              <X size={24} color={colors.textSecondary} />
            </TouchableOpacity>
            <Text style={[styles.checkInTitle, { color: colors.text }]}>Tạo phiếu chi</Text>
            <View style={styles.formRow}>
              <Text style={[styles.formLabel, { color: colors.textSecondary }]}>Số tiền</Text>
              <TextInput
                style={[styles.input, { color: colors.text, borderColor: colors.border }]}
                keyboardType="numeric"
                value={expenseAmount}
                onChangeText={setExpenseAmount}
                placeholder="0"
                placeholderTextColor={colors.textSecondary}
              />
            </View>
            <View style={styles.formRow}>
              <Text style={[styles.formLabel, { color: colors.textSecondary }]}>Hình thức</Text>
              <View style={styles.chipsRow}>
                {(['cash','bank_transfer','card','other'] as const).map(m => (
                  <TouchableOpacity
                    key={m}
                    style={[
                      styles.chip,
                      { borderColor: colors.border },
                      expenseMethod === m && { backgroundColor: colors.tint }
                    ]}
                    onPress={() => setExpenseMethod(m)}
                  >
                    <Text style={[styles.chipText, { color: expenseMethod === m ? '#fff' : colors.textSecondary }]}>
                      {m === 'cash' ? 'Tiền mặt' : m === 'bank_transfer' ? 'Chuyển khoản' : m === 'card' ? 'Thẻ' : 'Khác'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            <View style={styles.formRow}>
              <Text style={[styles.formLabel, { color: colors.textSecondary }]}>Loại</Text>
              <View style={styles.chipsRow}>
                {(['supplies','utilities','salary','maintenance','marketing','other'] as const).map(c => (
                  <TouchableOpacity
                    key={c}
                    style={[
                      styles.chip,
                      { borderColor: colors.border },
                      expenseCategory === c && { backgroundColor: colors.tint }
                    ]}
                    onPress={() => setExpenseCategory(c)}
                  >
                    <Text style={[styles.chipText, { color: expenseCategory === c ? '#fff' : colors.textSecondary }]}>
                      {c === 'supplies' ? 'Vật tư' : c === 'utilities' ? 'Tiện ích' : c === 'salary' ? 'Lương' : c === 'maintenance' ? 'Bảo trì' : c === 'marketing' ? 'Marketing' : 'Khác'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            <View style={styles.formRow}>
              <Text style={[styles.formLabel, { color: colors.textSecondary }]}>Mô tả</Text>
              <TextInput
                style={[styles.input, { color: colors.text, borderColor: colors.border }]}
                value={expenseDescription}
                onChangeText={setExpenseDescription}
                placeholder="Mô tả"
                placeholderTextColor={colors.textSecondary}
              />
            </View>
            <View style={styles.formRow}>
              <Text style={[styles.formLabel, { color: colors.textSecondary }]}>Người nhận</Text>
              <TextInput
                style={[styles.input, { color: colors.text, borderColor: colors.border }]}
                value={expenseRecipient}
                onChangeText={setExpenseRecipient}
                placeholder="Tên người nhận"
                placeholderTextColor={colors.textSecondary}
              />
            </View>
            <View style={styles.formRow}>
              <Text style={[styles.formLabel, { color: colors.textSecondary }]}>Ghi chú</Text>
              <TextInput
                style={[styles.input, styles.textArea, { color: colors.text, borderColor: colors.border }]}
                multiline
                value={expenseNotes}
                onChangeText={setExpenseNotes}
                placeholder="Ghi chú"
                placeholderTextColor={colors.textSecondary}
              />
            </View>
            <TouchableOpacity
              style={[styles.submitButton, voucherSubmitting && styles.buttonDisabled, { backgroundColor: colors.tint }]}
              onPress={async () => {
                if (!selectedHotelId) {
                  Alert.alert('Lỗi', 'Vui lòng chọn khách sạn');
                  return;
                }
                const amountNum = Number(expenseAmount);
                if (!amountNum || amountNum <= 0) {
                  Alert.alert('Lỗi', 'Số tiền không hợp lệ');
                  return;
                }
                setVoucherSubmitting(true);
                const ok = await transactionsApi.createExpense({
                  hotelId: selectedHotelId,
                  amount: amountNum,
                  method: expenseMethod,
                  expenseCategory,
                  description: expenseDescription,
                  notes: expenseNotes,
                  recipient: expenseRecipient,
                });
                setVoucherSubmitting(false);
                if (ok) {
                  setExpenseModalVisible(false);
                  setExpenseAmount('');
                  setExpenseDescription('');
                  setExpenseRecipient('');
                  setExpenseNotes('');
                  Alert.alert('Thành công', 'Đã tạo phiếu chi');
                } else {
                  Alert.alert('Lỗi', 'Không thể tạo phiếu chi');
                }
              }}
              disabled={voucherSubmitting}
            >
              {voucherSubmitting ? (
                <ActivityIndicator size="small" color="#FFF" />
              ) : (
                <Text style={styles.submitButtonText}>Tạo phiếu chi</Text>
              )}
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTopCompact: {
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: 12,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerActionsCompact: {
    width: '100%',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
    alignItems: 'center',
    rowGap: 8,
    columnGap: 8,
    marginTop: 10,
  },
  title: {
    fontSize: 28,
    fontWeight: '700' as const,
  },
  subtitle: {
    fontSize: 14,
    marginTop: 4,
  },
  viewToggle: {
    flexDirection: 'row',
    borderRadius: 10,
    padding: 4,
  },
  viewToggleCompact: {
    alignSelf: 'flex-end',
    flexShrink: 0,
  },
  viewToggleBtn: {
    padding: 8,
    borderRadius: 8,
  },
  voucherBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  voucherBtnCompact: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    flexShrink: 1,
  },
  voucherBtnText: {
    fontSize: 12,
    fontWeight: '600' as const,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  searchContainer: {
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
  },
  filterContainer: {
    maxHeight: 50,
    marginBottom: 12,
  },
  filterContent: {
    paddingHorizontal: 20,
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: '500' as const,
  },
  filterChipTextActive: {
    color: '#fff',
  },
  roomsList: {
    flex: 1,
  },
  roomsListContent: {
    paddingHorizontal: 20,
    paddingBottom: 100,
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  gridItem: {
    width: GRID_ITEM_WIDTH,
    borderRadius: 16,
    marginBottom: 12,
    overflow: 'hidden',
  },
  gridStatusBar: {
    height: 4,
  },
  gridContent: {
    padding: 12,
  },
  gridHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  gridRoomNumber: {
    fontSize: 18,
    fontWeight: '700' as const,
  },
  gridRoomType: {
    fontSize: 12,
    marginBottom: 4,
  },
  gridPrice: {
    fontSize: 13,
    fontWeight: '600' as const,
  },
  gridGuest: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 4,
  },
  gridGuestName: {
    fontSize: 11,
    flex: 1,
  },
  guestOutBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    marginTop: 8,
    alignSelf: 'flex-start',
  },
  guestOutBadgeText: {
    fontSize: 11,
    fontWeight: '600' as const,
  },
  roomCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  roomHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  roomNumberContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  roomNumber: {
    fontSize: 20,
    fontWeight: '700' as const,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    gap: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600' as const,
  },
  statusBadgeGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  roomInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  roomType: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  roomTypeText: {
    fontSize: 14,
    fontWeight: '500' as const,
  },
  floorText: {
    fontSize: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  priceText: {
    fontSize: 14,
    fontWeight: '600' as const,
  },
  guestInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 10,
    marginBottom: 12,
    gap: 8,
  },
  guestName: {
    fontSize: 13,
    fontWeight: '500' as const,
    flex: 1,
  },
  checkoutInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  checkoutText: {
    fontSize: 11,
  },
  quickActions: {
    flexDirection: 'row',
    gap: 8,
  },
  quickActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 4,
  },
  quickActionText: {
    fontSize: 12,
    color: '#fff',
    fontWeight: '600' as const,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    gap: 12,
    width: '100%',
  },
  emptyText: {
    fontSize: 16,
  },
  emptySubtext: {
    fontSize: 13,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: '90%',
    minHeight: 300,
    overflow: 'hidden',
  },
  formRow: {
    marginBottom: 12,
  },
  input: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
  },
  textArea: {
    minHeight: 80,
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  chipText: {
    fontSize: 12,
    fontWeight: '600' as const,
  },
  submitButton: {
    marginTop: 6,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700' as const,
  },
  confirmActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 6,
  },
  confirmButton: {
    flex: 1,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmButtonSecondary: {
    borderWidth: 1,
    backgroundColor: 'transparent',
  },
  confirmButtonText: {
    fontSize: 14,
    fontWeight: '700' as const,
  },
  modalDragHandle: {
    alignItems: 'center',
    paddingBottom: 12,
  },
  dragBar: {
    width: 40,
    height: 4,
    borderRadius: 2,
  },
  modalCloseBtn: {
    position: 'absolute',
    top: 16,
    right: 20,
    zIndex: 10,
    padding: 4,
  },
  modalRoomHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: 16,
    borderBottomWidth: 1,
    marginBottom: 16,
    gap: 12,
  },
  modalRoomIcon: {
    width: 52,
    height: 52,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalRoomTitleSection: {
    flex: 1,
  },
  modalRoomNumber: {
    fontSize: 20,
    fontWeight: '700' as const,
  },
  modalRoomType: {
    fontSize: 14,
    marginTop: 2,
  },
  modalStatusChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
  },
  modalStatusLabel: {
    fontSize: 12,
    fontWeight: '600' as const,
  },
  detailsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 16,
  },
  detailItem: {
    width: '48%',
    padding: 12,
    borderRadius: 12,
  },
  detailLabel: {
    fontSize: 12,
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 15,
    fontWeight: '600' as const,
  },
  amenitiesSection: {
    marginBottom: 20,
  },
  amenitiesTitle: {
    fontSize: 15,
    fontWeight: '600' as const,
    marginBottom: 10,
  },
  amenitiesList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  amenityChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 6,
  },
  amenityText: {
    fontSize: 12,
  },
  modalActionsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
  },
  modalActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
    borderRadius: 12,
    gap: 8,
  },
  modalActionBtnText: {
    fontSize: 14,
    color: '#fff',
    fontWeight: '600' as const,
  },
  secondaryActions: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
  },
  secondaryActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    gap: 6,
  },
  secondaryActionText: {
    fontSize: 13,
    fontWeight: '600' as const,
  },
  checkInHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingBottom: 16,
    borderBottomWidth: 1,
    marginBottom: 20,
  },
  checkInTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
  },
  checkoutInfoCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    gap: 6,
    marginBottom: 12,
  },
  checkoutInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  checkoutInfoLabel: {
    fontSize: 13,
    fontWeight: '500' as const,
  },
  checkoutInfoValue: {
    fontSize: 13,
    fontWeight: '600' as const,
  },
  formSection: {
    gap: 16,
    marginBottom: 20,
  },
  modalScrollContent: {
    paddingBottom: 24,
  },
  formField: {
    gap: 8,
  },
  formLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  formLabel: {
    fontSize: 14,
    fontWeight: '500' as const,
  },
  formInput: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
  },
  optionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  optionChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
  },
  optionText: {
    fontSize: 13,
    fontWeight: '600' as const,
  },
  notesInput: {
    minHeight: 90,
    textAlignVertical: 'top' as const,
  },
  guestCountRow: {
    flexDirection: 'row',
    gap: 16,
  },
  guestCountItem: {
    flex: 1,
    gap: 8,
  },
  counterControl: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  counterBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  counterBtnText: {
    fontSize: 20,
    fontWeight: '600' as const,
  },
  counterValue: {
    fontSize: 18,
    fontWeight: '700' as const,
    minWidth: 24,
    textAlign: 'center',
  },
  serviceList: {
    gap: 10,
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
  },
  serviceDropdown: {
    gap: 10,
    position: 'relative',
  },
  serviceDropdownHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    minHeight: 54,
  },
  serviceDropdownTitle: {
    fontSize: 15,
    fontWeight: '600' as const,
  },
  serviceDropdownSubtitle: {
    fontSize: 12,
    marginTop: 4,
  },
  serviceDropdownList: {
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
    zIndex: 50,
    elevation: 8,
  },
  serviceDropdownScroll: {
    maxHeight: 220,
    paddingVertical: 6,
  },
  serviceDropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  serviceDropdownInfo: {
    flex: 1,
  },
  serviceDropdownName: {
    fontSize: 13,
    fontWeight: '600' as const,
  },
  serviceDropdownPrice: {
    fontSize: 12,
    marginTop: 4,
  },
  serviceListItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  serviceListActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  serviceDropdownActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  serviceAddBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  serviceAddText: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: '#fff',
  },
  selectedServiceList: {
    gap: 10,
  },
  selectedServiceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
  },
  selectedServiceInfo: {
    flex: 1,
  },
  selectedServiceName: {
    fontSize: 13,
    fontWeight: '600' as const,
  },
  selectedServiceMeta: {
    fontSize: 11,
    marginTop: 2,
  },
  selectedServiceActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  selectedServiceTotal: {
    fontSize: 14,
    fontWeight: '700' as const,
  },
  removeServiceBtn: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  serviceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
  },
  serviceInfo: {
    flex: 1,
  },
  serviceName: {
    fontSize: 14,
    fontWeight: '600' as const,
    marginBottom: 2,
  },
  servicePrice: {
    fontSize: 12,
  },
  serviceTotalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  serviceTotalLabel: {
    fontSize: 13,
    fontWeight: '500' as const,
  },
  serviceTotalValue: {
    fontSize: 14,
    fontWeight: '700' as const,
  },
  serviceEmptyText: {
    fontSize: 13,
  },
  summaryCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    gap: 8,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  summaryDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingLeft: 6,
  },
  summaryLabel: {
    fontSize: 13,
    fontWeight: '500' as const,
  },
  summaryDetailLabel: {
    fontSize: 12,
    fontWeight: '400' as const,
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '700' as const,
  },
  summaryDetailValue: {
    fontSize: 12,
    fontWeight: '600' as const,
  },
  summarySurchargeValue: {
    color: '#f59e0b',
  },
  summaryDivider: {
    height: 1,
    width: '100%',
  },
  formActions: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  formCancelBtn: {
    flex: 1,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  formCancelText: {
    fontSize: 15,
    fontWeight: '600' as const,
  },
  formSubmitBtn: {
    flex: 2,
    flexDirection: 'row',
    padding: 14,
    borderRadius: 12,
    backgroundColor: Colors.status.vacant,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  formSecondaryBtn: {
    flex: 1,
    flexDirection: 'row',
    padding: 14,
    borderRadius: 12,
    backgroundColor: '#0ea5e9',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  formSubmitText: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: '#fff',
  },
  cleaningHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingBottom: 16,
    borderBottomWidth: 1,
    marginBottom: 16,
  },
  cleaningTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
  },
  cleaningNote: {
    fontSize: 14,
    marginBottom: 20,
  },
  transferHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingBottom: 16,
    borderBottomWidth: 1,
    marginBottom: 16,
  },
  transferTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
  },
  transferGuestInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    gap: 10,
    marginBottom: 16,
  },
  transferGuestName: {
    fontSize: 15,
    fontWeight: '500' as const,
  },
  transferSubtitle: {
    fontSize: 14,
    marginBottom: 12,
  },
  transferRoomList: {
    gap: 8,
    marginBottom: 20,
  },
  transferRoomItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1.5,
  },
  transferRoomLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  transferRoomNum: {
    fontSize: 16,
    fontWeight: '600' as const,
  },
  transferRoomMeta: {
    fontSize: 12,
    marginTop: 2,
  },
  transferSubmitBtn: {
    flex: 2,
    flexDirection: 'row',
    padding: 14,
    borderRadius: 12,
    backgroundColor: '#6366f1',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  noRoomsAvailable: {
    alignItems: 'center',
    padding: 30,
    gap: 10,
  },
  noRoomsText: {
    fontSize: 14,
  },
});
