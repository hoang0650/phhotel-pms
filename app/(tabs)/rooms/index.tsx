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
  Settings,
  X,
  AlertCircle,
} from 'lucide-react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Colors from '@/constants/colors';
import { roomsApi } from '@/services/api';
import { Room, RoomStatus } from '@/types/hotel';
import { useHotel } from '@/contexts/HotelContext';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const GRID_ITEM_WIDTH = (SCREEN_WIDTH - 60) / 2;

const statusConfig: Record<RoomStatus, { label: string; color: string; icon: typeof CheckCircle }> = {
  available: { label: 'Trống', color: Colors.status.available, icon: CheckCircle },
  occupied: { label: 'Đang ở', color: Colors.status.occupied, icon: User },
  cleaning: { label: 'Dọn dẹp', color: Colors.status.cleaning, icon: Sparkles },
  maintenance: { label: 'Bảo trì', color: Colors.status.maintenance, icon: Wrench },
};

const roomTypeLabels: Record<string, string> = {
  standard: 'Standard',
  deluxe: 'Deluxe',
  suite: 'Suite',
  presidential: 'Presidential',
};

type ViewMode = 'list' | 'grid';

interface RoomActionModalProps {
  visible: boolean;
  room: Room | null;
  onClose: () => void;
  onCheckIn: (room: Room) => void;
  onCheckOut: (room: Room) => void;
  onTransfer: (room: Room) => void;
  onCleaning: (room: Room) => void;
  onMarkClean: (room: Room) => void;
  onMaintenance: (room: Room) => void;
}

function RoomActionModal({ 
  visible, 
  room, 
  onClose, 
  onCheckIn, 
  onCheckOut, 
  onTransfer, 
  onCleaning,
  onMarkClean,
  onMaintenance 
}: RoomActionModalProps) {
  if (!room) return null;

  const status = statusConfig[room.status];

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.modalOverlay} onPress={onClose}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <View style={styles.modalRoomInfo}>
              <BedDouble size={24} color={Colors.light.tint} />
              <Text style={styles.modalRoomNumber}>Phòng {room.number}</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.modalCloseBtn}>
              <X size={24} color={Colors.light.textSecondary} />
            </TouchableOpacity>
          </View>

          <View style={[styles.modalStatusBadge, { backgroundColor: status.color + '20' }]}>
            <View style={[styles.statusDot, { backgroundColor: status.color }]} />
            <Text style={[styles.modalStatusText, { color: status.color }]}>{status.label}</Text>
          </View>

          <View style={styles.modalActions}>
            {room.status === 'available' && (
              <TouchableOpacity 
                style={[styles.actionBtn, { backgroundColor: Colors.status.available }]}
                onPress={() => onCheckIn(room)}
              >
                <LogIn size={20} color="#fff" />
                <Text style={styles.actionBtnText}>Nhận phòng</Text>
              </TouchableOpacity>
            )}

            {room.status === 'occupied' && (
              <>
                <TouchableOpacity 
                  style={[styles.actionBtn, { backgroundColor: Colors.status.cleaning }]}
                  onPress={() => onCheckOut(room)}
                >
                  <LogOut size={20} color="#fff" />
                  <Text style={styles.actionBtnText}>Trả phòng</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.actionBtn, { backgroundColor: '#6366f1' }]}
                  onPress={() => onTransfer(room)}
                >
                  <ArrowRightLeft size={20} color="#fff" />
                  <Text style={styles.actionBtnText}>Chuyển phòng</Text>
                </TouchableOpacity>
              </>
            )}

            {room.status === 'cleaning' && (
              <TouchableOpacity 
                style={[styles.actionBtn, { backgroundColor: Colors.status.available }]}
                onPress={() => onMarkClean(room)}
              >
                <CheckCircle size={20} color="#fff" />
                <Text style={styles.actionBtnText}>Hoàn tất dọn dẹp</Text>
              </TouchableOpacity>
            )}

            {(room.status === 'available' || room.status === 'occupied') && (
              <TouchableOpacity 
                style={[styles.actionBtn, { backgroundColor: '#f59e0b' }]}
                onPress={() => onCleaning(room)}
              >
                <Brush size={20} color="#fff" />
                <Text style={styles.actionBtnText}>Dọn dẹp</Text>
              </TouchableOpacity>
            )}

            {room.status !== 'maintenance' && (
              <TouchableOpacity 
                style={[styles.actionBtn, { backgroundColor: Colors.status.maintenance }]}
                onPress={() => onMaintenance(room)}
              >
                <Wrench size={20} color="#fff" />
                <Text style={styles.actionBtnText}>Bảo trì</Text>
              </TouchableOpacity>
            )}

            {room.status === 'maintenance' && (
              <TouchableOpacity 
                style={[styles.actionBtn, { backgroundColor: Colors.status.available }]}
                onPress={() => onMarkClean(room)}
              >
                <CheckCircle size={20} color="#fff" />
                <Text style={styles.actionBtnText}>Hoàn tất bảo trì</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </Pressable>
    </Modal>
  );
}

export default function RoomsScreen() {
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const { selectedHotelId } = useHotel();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<RoomStatus | 'all'>('all');
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [actionModalVisible, setActionModalVisible] = useState(false);

  const { data: rooms = [], isLoading, refetch } = useQuery({
    queryKey: ['rooms', selectedHotelId],
    queryFn: () => roomsApi.getAll(selectedHotelId || undefined),
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => 
      roomsApi.updateStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rooms'] });
      setActionModalVisible(false);
    },
    onError: (error) => {
      console.error('Update status error:', error);
      Alert.alert('Lỗi', 'Không thể cập nhật trạng thái phòng');
    },
  });

  const checkInMutation = useMutation({
    mutationFn: ({ id, guestData }: { id: string; guestData: unknown }) => 
      roomsApi.checkIn(id, guestData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rooms'] });
      setActionModalVisible(false);
      Alert.alert('Thành công', 'Đã nhận phòng');
    },
    onError: (error) => {
      console.error('Check-in error:', error);
      Alert.alert('Lỗi', 'Không thể nhận phòng');
    },
  });

  const checkOutMutation = useMutation({
    mutationFn: (id: string) => roomsApi.checkOut(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rooms'] });
      setActionModalVisible(false);
      Alert.alert('Thành công', 'Đã trả phòng');
    },
    onError: (error) => {
      console.error('Check-out error:', error);
      Alert.alert('Lỗi', 'Không thể trả phòng');
    },
  });

  const markCleanMutation = useMutation({
    mutationFn: (id: string) => roomsApi.markClean(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rooms'] });
      setActionModalVisible(false);
      Alert.alert('Thành công', 'Phòng đã sẵn sàng');
    },
    onError: (error) => {
      console.error('Mark clean error:', error);
      Alert.alert('Lỗi', 'Không thể cập nhật trạng thái');
    },
  });

  const filteredRooms = useMemo(() => {
    return rooms.filter((room) => {
      const matchesSearch = room.number.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesFilter = selectedFilter === 'all' || room.status === selectedFilter;
      return matchesSearch && matchesFilter;
    });
  }, [rooms, searchQuery, selectedFilter]);

  const statusCounts = useMemo(() => ({
    all: rooms.length,
    available: rooms.filter((r) => r.status === 'available').length,
    occupied: rooms.filter((r) => r.status === 'occupied').length,
    cleaning: rooms.filter((r) => r.status === 'cleaning').length,
    maintenance: rooms.filter((r) => r.status === 'maintenance').length,
  }), [rooms]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const handleRoomPress = useCallback((room: Room) => {
    setSelectedRoom(room);
    setActionModalVisible(true);
  }, []);

  const { mutate: checkInMutate } = checkInMutation;
  const { mutate: checkOutMutate } = checkOutMutation;
  const { mutate: updateStatusMutate } = updateStatusMutation;
  const { mutate: markCleanMutate } = markCleanMutation;

  const handleCheckIn = useCallback((room: Room) => {
    Alert.prompt(
      'Nhận phòng',
      'Nhập tên khách hàng:',
      [
        { text: 'Hủy', style: 'cancel' },
        { 
          text: 'Nhận phòng', 
          onPress: (guestName: string | undefined) => {
            if (guestName) {
              checkInMutate({ 
                id: room.id, 
                guestData: { guestName, checkInDate: new Date().toISOString() } 
              });
            }
          }
        },
      ],
      'plain-text'
    );
  }, [checkInMutate]);

  const handleCheckOut = useCallback((room: Room) => {
    Alert.alert(
      'Trả phòng',
      `Xác nhận trả phòng ${room.number}?`,
      [
        { text: 'Hủy', style: 'cancel' },
        { text: 'Xác nhận', onPress: () => checkOutMutate(room.id) },
      ]
    );
  }, [checkOutMutate]);

  const handleTransfer = useCallback((room: Room) => {
    Alert.alert('Chuyển phòng', `Tính năng chuyển phòng từ ${room.number} đang được phát triển`);
  }, []);

  const handleCleaning = useCallback((room: Room) => {
    updateStatusMutate({ id: room.id, status: 'cleaning' });
  }, [updateStatusMutate]);

  const handleMarkClean = useCallback((room: Room) => {
    markCleanMutate(room.id);
  }, [markCleanMutate]);

  const handleMaintenance = useCallback((room: Room) => {
    updateStatusMutate({ id: room.id, status: 'maintenance' });
  }, [updateStatusMutate]);

  const renderGridItem = useCallback((room: Room) => {
    const status = statusConfig[room.status];
    const StatusIcon = status.icon;

    return (
      <TouchableOpacity 
        key={room.id} 
        style={styles.gridItem} 
        activeOpacity={0.7}
        onPress={() => handleRoomPress(room)}
      >
        <View style={[styles.gridStatusBar, { backgroundColor: status.color }]} />
        <View style={styles.gridContent}>
          <View style={styles.gridHeader}>
            <Text style={styles.gridRoomNumber}>{room.number}</Text>
            <StatusIcon size={16} color={status.color} />
          </View>
          <Text style={styles.gridRoomType}>{roomTypeLabels[room.type] || room.type}</Text>
          <Text style={styles.gridPrice}>{formatCurrency(room.price)}</Text>
          {room.currentGuest && (
            <View style={styles.gridGuest}>
              <User size={12} color={Colors.light.textSecondary} />
              <Text style={styles.gridGuestName} numberOfLines={1}>{room.currentGuest}</Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  }, [handleRoomPress]);

  const renderListItem = useCallback((room: Room) => {
    const status = statusConfig[room.status];
    const StatusIcon = status.icon;

    return (
      <TouchableOpacity 
        key={room.id} 
        style={styles.roomCard} 
        activeOpacity={0.7}
        onPress={() => handleRoomPress(room)}
      >
        <View style={styles.roomHeader}>
          <View style={styles.roomNumberContainer}>
            <BedDouble size={18} color={Colors.light.tint} />
            <Text style={styles.roomNumber}>{room.number}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: status.color + '20' }]}>
            <StatusIcon size={12} color={status.color} />
            <Text style={[styles.statusText, { color: status.color }]}>{status.label}</Text>
          </View>
        </View>

        <View style={styles.roomInfo}>
          <View style={styles.roomType}>
            <Text style={styles.roomTypeText}>{roomTypeLabels[room.type] || room.type}</Text>
            <Text style={styles.floorText}>Tầng {room.floor}</Text>
          </View>
          <Text style={styles.priceText}>{formatCurrency(room.price)}/đêm</Text>
        </View>

        {room.status === 'occupied' && room.currentGuest && (
          <View style={styles.guestInfo}>
            <User size={14} color={Colors.light.textSecondary} />
            <Text style={styles.guestName}>{room.currentGuest}</Text>
            {room.checkoutDate && (
              <View style={styles.checkoutInfo}>
                <Calendar size={12} color={Colors.light.textSecondary} />
                <Text style={styles.checkoutText}>Out: {room.checkoutDate}</Text>
              </View>
            )}
          </View>
        )}

        <View style={styles.quickActions}>
          {room.status === 'available' && (
            <TouchableOpacity 
              style={[styles.quickActionBtn, { backgroundColor: Colors.status.available }]}
              onPress={() => handleCheckIn(room)}
            >
              <LogIn size={14} color="#fff" />
              <Text style={styles.quickActionText}>Nhận</Text>
            </TouchableOpacity>
          )}
          {room.status === 'occupied' && (
            <TouchableOpacity 
              style={[styles.quickActionBtn, { backgroundColor: Colors.status.cleaning }]}
              onPress={() => handleCheckOut(room)}
            >
              <LogOut size={14} color="#fff" />
              <Text style={styles.quickActionText}>Trả</Text>
            </TouchableOpacity>
          )}
          {room.status === 'cleaning' && (
            <TouchableOpacity 
              style={[styles.quickActionBtn, { backgroundColor: Colors.status.available }]}
              onPress={() => handleMarkClean(room)}
            >
              <CheckCircle size={14} color="#fff" />
              <Text style={styles.quickActionText}>Xong</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity 
            style={[styles.quickActionBtn, { backgroundColor: '#6b7280' }]}
            onPress={() => handleRoomPress(room)}
          >
            <Settings size={14} color="#fff" />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  }, [handleRoomPress, handleCheckIn, handleCheckOut, handleMarkClean]);

  if (isLoading && rooms.length === 0) {
    return (
      <View style={[styles.container, styles.loadingContainer, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color={Colors.light.tint} />
        <Text style={styles.loadingText}>Đang tải danh sách phòng...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.title}>Quản lý phòng</Text>
            <Text style={styles.subtitle}>{rooms.length} phòng</Text>
          </View>
          <View style={styles.viewToggle}>
            <TouchableOpacity 
              style={[styles.viewToggleBtn, viewMode === 'list' && styles.viewToggleBtnActive]}
              onPress={() => setViewMode('list')}
            >
              <List size={18} color={viewMode === 'list' ? '#fff' : Colors.light.textSecondary} />
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.viewToggleBtn, viewMode === 'grid' && styles.viewToggleBtnActive]}
              onPress={() => setViewMode('grid')}
            >
              <Grid3X3 size={18} color={viewMode === 'grid' ? '#fff' : Colors.light.textSecondary} />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <View style={styles.searchContainer}>
        <View style={styles.searchBox}>
          <Search size={18} color={Colors.light.textSecondary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Tìm số phòng..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor={Colors.light.textSecondary}
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
          style={[styles.filterChip, selectedFilter === 'all' && styles.filterChipActive]}
          onPress={() => setSelectedFilter('all')}
        >
          <Text style={[styles.filterChipText, selectedFilter === 'all' && styles.filterChipTextActive]}>
            Tất cả ({statusCounts.all})
          </Text>
        </TouchableOpacity>
        {(Object.keys(statusConfig) as RoomStatus[]).map((status) => (
          <TouchableOpacity
            key={status}
            style={[
              styles.filterChip,
              selectedFilter === status && styles.filterChipActive,
              selectedFilter === status && { backgroundColor: statusConfig[status].color },
            ]}
            onPress={() => setSelectedFilter(status)}
          >
            <Text
              style={[
                styles.filterChipText,
                selectedFilter === status && styles.filterChipTextActive,
              ]}
            >
              {statusConfig[status].label} ({statusCounts[status]})
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView
        style={styles.roomsList}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.roomsListContent,
          viewMode === 'grid' && styles.gridContainer
        ]}
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={refetch} />
        }
      >
        {viewMode === 'list' 
          ? filteredRooms.map(renderListItem)
          : filteredRooms.map(renderGridItem)
        }
        {filteredRooms.length === 0 && (
          <View style={styles.emptyState}>
            {rooms.length === 0 ? (
              <>
                <AlertCircle size={48} color={Colors.light.textSecondary} />
                <Text style={styles.emptyText}>Chưa có dữ liệu phòng</Text>
                <Text style={styles.emptySubtext}>Kiểm tra kết nối API</Text>
              </>
            ) : (
              <>
                <BedDouble size={48} color={Colors.light.textSecondary} />
                <Text style={styles.emptyText}>Không tìm thấy phòng</Text>
              </>
            )}
          </View>
        )}
      </ScrollView>

      <RoomActionModal
        visible={actionModalVisible}
        room={selectedRoom}
        onClose={() => setActionModalVisible(false)}
        onCheckIn={handleCheckIn}
        onCheckOut={handleCheckOut}
        onTransfer={handleTransfer}
        onCleaning={handleCleaning}
        onMarkClean={handleMarkClean}
        onMaintenance={handleMaintenance}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: Colors.light.textSecondary,
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
    color: Colors.light.text,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.light.textSecondary,
    marginTop: 4,
  },
  viewToggle: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  viewToggleBtn: {
    padding: 8,
    borderRadius: 8,
  },
  viewToggleBtnActive: {
    backgroundColor: Colors.light.tint,
  },
  searchContainer: {
    paddingHorizontal: 20,
    marginBottom: 12,
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
    backgroundColor: '#fff',
    marginRight: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  filterChipActive: {
    backgroundColor: Colors.light.tint,
  },
  filterChipText: {
    fontSize: 13,
    color: Colors.light.textSecondary,
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
    backgroundColor: '#fff',
    borderRadius: 16,
    marginBottom: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
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
    color: Colors.light.text,
  },
  gridRoomType: {
    fontSize: 12,
    color: Colors.light.textSecondary,
    marginBottom: 4,
  },
  gridPrice: {
    fontSize: 13,
    color: Colors.light.tint,
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
    color: Colors.light.textSecondary,
    flex: 1,
  },
  roomCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
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
    color: Colors.light.text,
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
    color: Colors.light.text,
    fontWeight: '500' as const,
  },
  floorText: {
    fontSize: 12,
    color: Colors.light.textSecondary,
    backgroundColor: Colors.light.background,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  priceText: {
    fontSize: 14,
    color: Colors.light.tint,
    fontWeight: '600' as const,
  },
  guestInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.light.background,
    padding: 10,
    borderRadius: 10,
    marginBottom: 12,
    gap: 8,
  },
  guestName: {
    fontSize: 13,
    color: Colors.light.text,
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
    color: Colors.light.textSecondary,
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
    color: Colors.light.textSecondary,
  },
  emptySubtext: {
    fontSize: 13,
    color: Colors.light.textSecondary,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    width: '100%',
    maxWidth: 400,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalRoomInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  modalRoomNumber: {
    fontSize: 22,
    fontWeight: '700' as const,
    color: Colors.light.text,
  },
  modalCloseBtn: {
    padding: 4,
  },
  modalStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
    marginBottom: 20,
  },
  modalStatusText: {
    fontSize: 14,
    fontWeight: '600' as const,
  },
  modalActions: {
    gap: 10,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
    borderRadius: 12,
    gap: 10,
  },
  actionBtnText: {
    fontSize: 15,
    color: '#fff',
    fontWeight: '600' as const,
  },
});
