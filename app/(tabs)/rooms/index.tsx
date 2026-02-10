import React, { useState, useMemo, useCallback } from 'react';
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
} from 'lucide-react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Colors from '@/constants/colors';
import { roomsApi } from '@/services/api';
import { Room, RoomStatus } from '@/types/hotel';
import { useHotel } from '@/contexts/HotelContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useLanguage } from '@/contexts/LanguageContext';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const GRID_ITEM_WIDTH = (SCREEN_WIDTH - 60) / 2;

const statusConfig: Record<RoomStatus, { label: string; labelEn: string; color: string; icon: typeof CheckCircle }> = {
  available: { label: 'Trống', labelEn: 'Available', color: Colors.status.available, icon: CheckCircle },
  occupied: { label: 'Đang ở', labelEn: 'Occupied', color: Colors.status.occupied, icon: User },
  cleaning: { label: 'Dọn dẹp', labelEn: 'Cleaning', color: Colors.status.cleaning, icon: Sparkles },
  maintenance: { label: 'Bảo trì', labelEn: 'Maintenance', color: Colors.status.maintenance, icon: Wrench },
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
type ModalMode = 'actions' | 'checkin' | 'details' | 'transfer';

interface CheckInFormData {
  guestName: string;
  guestPhone: string;
  guestId: string;
  adults: number;
  children: number;
}

export default function RoomsScreen() {
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const { selectedHotelId } = useHotel();
  const { isDark, colors } = useTheme();
  const { t, language } = useLanguage();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<RoomStatus | 'all'>('all');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalMode, setModalMode] = useState<ModalMode>('actions');
  const [transferTargetId, setTransferTargetId] = useState<string | null>(null);

  const [checkInForm, setCheckInForm] = useState<CheckInFormData>({
    guestName: '',
    guestPhone: '',
    guestId: '',
    adults: 1,
    children: 0,
  });

  const { data: rooms = [], isLoading, refetch } = useQuery({
    queryKey: ['rooms', selectedHotelId],
    queryFn: () => roomsApi.getAll(selectedHotelId || undefined),
  });

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
    mutationFn: (id: string) => roomsApi.checkOut(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rooms'] });
      closeModal();
      Alert.alert(t('success'), t('checkedOut'));
    },
    onError: () => {
      Alert.alert(t('error'), t('cannotCheckOut'));
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
      return roomsApi.transferRoom(fromId, toId, {
        guestName: fromRoom?.currentGuest || '',
        checkInDate: new Date().toISOString(),
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
  const { mutate: doTransfer } = transferMutation;
  const { mutate: doUpdateStatus } = updateStatusMutation;
  const { mutate: doMarkClean } = markCleanMutation;

  const filteredRooms = useMemo(() => {
    return rooms.filter((room) => {
      const matchesSearch = room.number.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesFilter = selectedFilter === 'all' || room.status === selectedFilter;
      return matchesSearch && matchesFilter;
    });
  }, [rooms, searchQuery, selectedFilter]);

  const availableRoomsForTransfer = useMemo(() => {
    return rooms.filter(r => r.status === 'available' && r.id !== selectedRoom?.id);
  }, [rooms, selectedRoom]);

  const statusCounts = useMemo(() => ({
    all: rooms.length,
    available: rooms.filter((r) => r.status === 'available').length,
    occupied: rooms.filter((r) => r.status === 'occupied').length,
    cleaning: rooms.filter((r) => r.status === 'cleaning').length,
    maintenance: rooms.filter((r) => r.status === 'maintenance').length,
  }), [rooms]);

  const formatCurrency = useCallback((amount: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
      maximumFractionDigits: 0,
    }).format(amount);
  }, []);

  const closeModal = useCallback(() => {
    setModalVisible(false);
    setModalMode('actions');
    setSelectedRoom(null);
    setTransferTargetId(null);
    setCheckInForm({ guestName: '', guestPhone: '', guestId: '', adults: 1, children: 0 });
  }, []);

  const handleRoomPress = useCallback((room: Room) => {
    setSelectedRoom(room);
    setModalMode('details');
    setModalVisible(true);
  }, []);

  const handleShowCheckIn = useCallback(() => {
    setModalMode('checkin');
  }, []);

  const handleShowTransfer = useCallback(() => {
    setModalMode('transfer');
    setTransferTargetId(null);
  }, []);

  const handleCheckIn = useCallback(() => {
    if (!selectedRoom) return;
    if (!checkInForm.guestName.trim()) {
      Alert.alert(t('error'), t('enterGuestName'));
      return;
    }
    doCheckIn({
      id: selectedRoom.id,
      guestData: {
        guestName: checkInForm.guestName,
        guestPhone: checkInForm.guestPhone,
        guestId: checkInForm.guestId,
        adults: checkInForm.adults,
        children: checkInForm.children,
        checkInDate: new Date().toISOString(),
      },
    });
  }, [selectedRoom, checkInForm, doCheckIn, t]);

  const handleCheckOut = useCallback(() => {
    if (!selectedRoom) return;
    Alert.alert(
      t('confirmCheckOut'),
      `${t('confirmCheckOutMsg')} ${selectedRoom.number}?`,
      [
        { text: t('cancel'), style: 'cancel' },
        { text: t('confirm'), onPress: () => doCheckOut(selectedRoom.id) },
      ]
    );
  }, [selectedRoom, doCheckOut, t]);

  const handleTransfer = useCallback(() => {
    if (!selectedRoom || !transferTargetId) return;
    doTransfer({ fromId: selectedRoom.id, toId: transferTargetId });
  }, [selectedRoom, transferTargetId, doTransfer]);

  const handleCleaning = useCallback(() => {
    if (!selectedRoom) return;
    doUpdateStatus({ id: selectedRoom.id, status: 'cleaning' });
  }, [selectedRoom, doUpdateStatus]);

  const handleMarkClean = useCallback(() => {
    if (!selectedRoom) return;
    doMarkClean(selectedRoom.id);
  }, [selectedRoom, doMarkClean]);

  const handleMaintenance = useCallback(() => {
    if (!selectedRoom) return;
    doUpdateStatus({ id: selectedRoom.id, status: 'maintenance' });
  }, [selectedRoom, doUpdateStatus]);

  const getStatusLabel = useCallback((status: RoomStatus) => {
    return language === 'en' ? statusConfig[status].labelEn : statusConfig[status].label;
  }, [language]);

  const renderGridItem = useCallback((room: Room) => {
    const status = statusConfig[room.status];
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
        </View>
      </TouchableOpacity>
    );
  }, [handleRoomPress, formatCurrency, colors]);

  const renderListItem = useCallback((room: Room) => {
    const status = statusConfig[room.status];
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
          <View style={[styles.statusBadge, { backgroundColor: status.color + '20' }]}>
            <StatusIcon size={12} color={status.color} />
            <Text style={[styles.statusText, { color: status.color }]}>{getStatusLabel(room.status)}</Text>
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
          {room.status === 'available' && (
            <TouchableOpacity
              style={[styles.quickActionBtn, { backgroundColor: Colors.status.available }]}
              onPress={() => { setSelectedRoom(room); setModalMode('checkin'); setModalVisible(true); }}
            >
              <LogIn size={14} color="#fff" />
              <Text style={styles.quickActionText}>{t('checkIn')}</Text>
            </TouchableOpacity>
          )}
          {room.status === 'occupied' && (
            <>
              <TouchableOpacity
                style={[styles.quickActionBtn, { backgroundColor: Colors.status.cleaning }]}
                onPress={() => { setSelectedRoom(room); setModalMode('details'); setModalVisible(true); }}
              >
                <LogOut size={14} color="#fff" />
                <Text style={styles.quickActionText}>{t('checkOut')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.quickActionBtn, { backgroundColor: '#6366f1' }]}
                onPress={() => { setSelectedRoom(room); setModalMode('transfer'); setModalVisible(true); }}
              >
                <ArrowRightLeft size={14} color="#fff" />
              </TouchableOpacity>
            </>
          )}
          {room.status === 'cleaning' && (
            <TouchableOpacity
              style={[styles.quickActionBtn, { backgroundColor: Colors.status.available }]}
              onPress={() => { setSelectedRoom(room); doMarkClean(room.id); }}
            >
              <CheckCircle size={14} color="#fff" />
              <Text style={styles.quickActionText}>{language === 'vi' ? 'Xong' : 'Done'}</Text>
            </TouchableOpacity>
          )}
        </View>
      </TouchableOpacity>
    );
  }, [handleRoomPress, formatCurrency, getStatusLabel, colors, isDark, t, language, doMarkClean]);

  const renderModalContent = useCallback(() => {
    if (!selectedRoom) return null;
    const status = statusConfig[selectedRoom.status];

    if (modalMode === 'details') {
      return (
        <ScrollView showsVerticalScrollIndicator={false}>
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
            {selectedRoom.status === 'available' && (
              <TouchableOpacity
                style={[styles.modalActionBtn, { backgroundColor: Colors.status.available }]}
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
                  onPress={handleCheckOut}
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
                style={[styles.modalActionBtn, { backgroundColor: Colors.status.available }]}
                onPress={handleMarkClean}
              >
                <CheckCircle size={18} color="#fff" />
                <Text style={styles.modalActionBtnText}>{t('completeCleaning')}</Text>
              </TouchableOpacity>
            )}
            {selectedRoom.status === 'maintenance' && (
              <TouchableOpacity
                style={[styles.modalActionBtn, { backgroundColor: Colors.status.available }]}
                onPress={handleMarkClean}
              >
                <CheckCircle size={18} color="#fff" />
                <Text style={styles.modalActionBtnText}>{t('completeMaintenance')}</Text>
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.secondaryActions}>
            {(selectedRoom.status === 'available' || selectedRoom.status === 'occupied') && (
              <TouchableOpacity
                style={[styles.secondaryActionBtn, { borderColor: '#f59e0b' }]}
                onPress={handleCleaning}
              >
                <Brush size={16} color="#f59e0b" />
                <Text style={[styles.secondaryActionText, { color: '#f59e0b' }]}>{t('cleanRoom')}</Text>
              </TouchableOpacity>
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
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView showsVerticalScrollIndicator={false}>
            <View style={[styles.checkInHeader, { borderBottomColor: colors.divider }]}>
              <LogIn size={24} color={Colors.status.available} />
              <Text style={[styles.checkInTitle, { color: colors.text }]}>
                {t('checkIn')} - {t('roomNumber')} {selectedRoom.number}
              </Text>
            </View>

            <View style={styles.formSection}>
              <View style={styles.formField}>
                <View style={styles.formLabelRow}>
                  <User size={16} color={colors.tint} />
                  <Text style={[styles.formLabel, { color: colors.text }]}>{t('guestName')} *</Text>
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

    if (modalMode === 'transfer') {
      return (
        <ScrollView showsVerticalScrollIndicator={false}>
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
  }, [selectedRoom, modalMode, checkInForm, transferTargetId, availableRoomsForTransfer, colors, isDark, t, language,
    handleCheckIn, handleCheckOut, handleShowCheckIn, handleShowTransfer, handleCleaning, handleMarkClean, handleMaintenance, handleTransfer,
    checkInMutation.isPending, transferMutation.isPending, formatCurrency, getStatusLabel]);

  if (isLoading && rooms.length === 0) {
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
        <View style={styles.headerTop}>
          <View>
            <Text style={[styles.title, { color: colors.text }]}>{t('roomManagement')}</Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>{rooms.length} {t('rooms')}</Text>
          </View>
          <View style={[styles.viewToggle, { backgroundColor: colors.cardBackground }]}>
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
      </ScrollView>

      <ScrollView
        style={styles.roomsList}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.roomsListContent,
          viewMode === 'grid' && styles.gridContainer,
        ]}
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={refetch} />
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
          <Pressable style={[styles.modalContent, { backgroundColor: colors.cardBackground }]} onPress={(e) => e.stopPropagation()}>
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
  viewToggleBtn: {
    padding: 8,
    borderRadius: 8,
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
    maxHeight: '85%',
    minHeight: 300,
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
  formSection: {
    gap: 16,
    marginBottom: 20,
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
    backgroundColor: Colors.status.available,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  formSubmitText: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: '#fff',
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
