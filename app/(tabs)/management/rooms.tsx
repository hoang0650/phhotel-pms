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
import { Room, RoomStatus } from '@/types/hotel';

export default function RoomManagementScreen() {
  const { selectedHotelId, hotels, selectHotel, canSelectMultipleHotels, isLoading: hotelsLoading } = useHotel();
  const { user } = useAuth();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | RoomStatus>('all');
  const [roomTypeFilter, setRoomTypeFilter] = useState('all');
  const [floorFilter, setFloorFilter] = useState('all');
  const [pageIndex, setPageIndex] = useState(1);
  const [pageSize] = useState(10);
  const [hotelModalVisible, setHotelModalVisible] = useState(false);
  const [roomModalVisible, setRoomModalVisible] = useState(false);
  const [floorModalVisible, setFloorModalVisible] = useState(false);
  const [typeModalVisible, setTypeModalVisible] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);

  const loadRooms = useCallback(async () => {
    if (!selectedHotelId && canSelectMultipleHotels) {
      setRooms([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const data = await roomsApi.getAll(selectedHotelId || undefined);
    setRooms(data);
    setLoading(false);
    setPageIndex(1);
  }, [selectedHotelId, canSelectMultipleHotels]);

  useEffect(() => {
    loadRooms();
  }, [loadRooms]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'vacant':
        return '#4CAF50';
      case 'occupied':
        return '#FF9800';
      case 'maintenance':
        return '#F44336';
      case 'cleaning':
        return '#2196F3';
      case 'dirty':
        return '#EF4444';
      case 'booked':
        return '#8B5CF6';
      default:
        return '#9E9E9E';
    }
  };

  const getStatusText = (status: RoomStatus) => {
    switch (status) {
      case 'vacant':
        return 'Trống';
      case 'occupied':
        return 'Đang ở';
      case 'maintenance':
        return 'Bảo trì';
      case 'cleaning':
        return 'Đang dọn';
      case 'dirty':
        return 'Cần dọn';
      case 'booked':
        return 'Đã đặt';
      default:
        return 'Không xác định';
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(amount);
  };

  const roomTypeOptions = useMemo(() => {
    const types = new Set<string>();
    rooms.forEach(room => {
      if (room.roomType) types.add(room.roomType);
      else if (room.type) types.add(room.type);
    });
    return Array.from(types).sort();
  }, [rooms]);

  const floorOptions = useMemo(() => {
    const floors = new Set<string>();
    rooms.forEach(room => {
      floors.add(String(room.floor ?? 0));
    });
    return Array.from(floors).sort((a, b) => (parseInt(a) || 0) - (parseInt(b) || 0));
  }, [rooms]);

  const filteredRooms = useMemo(() => {
    const keyword = searchQuery.trim().toLowerCase();
    return rooms.filter(room => {
      const roomTypeLabel = room.roomType || room.type || '';
      const matchesSearch =
        !keyword ||
        room.number.toLowerCase().includes(keyword) ||
        roomTypeLabel.toLowerCase().includes(keyword) ||
        room.currentGuest?.toLowerCase().includes(keyword);
      const matchesStatus = statusFilter === 'all' || room.status === statusFilter;
      const matchesRoomType = roomTypeFilter === 'all' || roomTypeLabel === roomTypeFilter;
      const matchesFloor = floorFilter === 'all' || String(room.floor) === floorFilter;
      return matchesSearch && matchesStatus && matchesRoomType && matchesFloor;
    });
  }, [rooms, searchQuery, statusFilter, roomTypeFilter, floorFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredRooms.length / pageSize));
  const paginatedRooms = useMemo(() => {
    const start = (pageIndex - 1) * pageSize;
    return filteredRooms.slice(start, start + pageSize);
  }, [filteredRooms, pageIndex, pageSize]);

  const handleRoomPress = (room: Room) => {
    setSelectedRoom(room);
    setRoomModalVisible(true);
  };

  const canManageRoom = user?.role === 'superadmin' || user?.role === 'admin' || user?.role === 'hotel_manager';

  const handleChangeStatus = (newStatus: RoomStatus) => {
    if (!selectedRoom) return;
    Alert.alert(
      'Xác nhận',
      `Bạn có chắc chắn muốn đổi trạng thái phòng ${selectedRoom.number} sang ${getStatusText(newStatus)}?`,
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Xác nhận',
          onPress: async () => {
            await roomsApi.updateStatus(selectedRoom.id, newStatus);
            setRoomModalVisible(false);
            loadRooms();
          },
        },
      ]
    );
  };

  const formatDate = (value?: string) => {
    if (!value) return '-';
    const date = new Date(value);
    if (isNaN(date.getTime())) return '-';
    return date.toLocaleDateString('vi-VN');
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Đang tải danh sách phòng...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Quản Lý Phòng</Text>
          <Text style={styles.subtitle}>Tổng: {filteredRooms.length} phòng</Text>
        </View>
        <TouchableOpacity style={styles.reloadButton} onPress={loadRooms}>
          <Ionicons name="reload" size={20} color="#007AFF" />
        </TouchableOpacity>
      </View>

      <View style={styles.filterContainer}>
        {canSelectMultipleHotels && (
          <TouchableOpacity style={styles.hotelSelector} onPress={() => setHotelModalVisible(true)}>
            <Ionicons name="business-outline" size={18} color="#007AFF" />
            <Text style={styles.hotelSelectorText}>
              {selectedHotelId
                ? hotels.find(hotel => hotel.id === selectedHotelId)?.name || 'Chọn khách sạn'
                : 'Chọn khách sạn'}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.filterContainer}>
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color="#8E8E93" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Tìm theo số phòng, loại, khách..."
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.statusFilterContainer}>
          {[
            { value: 'all', label: 'Tất cả' },
            { value: 'vacant', label: 'Trống' },
            { value: 'occupied', label: 'Đang ở' },
            { value: 'cleaning', label: 'Đang dọn' },
            { value: 'dirty', label: 'Cần dọn' },
            { value: 'maintenance', label: 'Bảo trì' },
            { value: 'booked', label: 'Đã đặt' },
          ].map(option => (
            <TouchableOpacity
              key={option.value}
              style={[
                styles.statusFilterButton,
                statusFilter === option.value && styles.activeStatusFilter
              ]}
              onPress={() => {
                setStatusFilter(option.value as RoomStatus | 'all');
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

        <View style={styles.quickFilters}>
          <TouchableOpacity style={styles.filterSelect} onPress={() => setTypeModalVisible(true)}>
            <Text style={styles.filterSelectText}>
              {roomTypeFilter === 'all' ? 'Loại phòng' : roomTypeFilter}
            </Text>
            <Ionicons name="chevron-down" size={16} color="#8E8E93" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.filterSelect} onPress={() => setFloorModalVisible(true)}>
            <Text style={styles.filterSelectText}>
              {floorFilter === 'all' ? 'Tầng' : `Tầng ${floorFilter}`}
            </Text>
            <Ionicons name="chevron-down" size={16} color="#8E8E93" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.roomGrid}
        showsVerticalScrollIndicator={false}
        nestedScrollEnabled
        decelerationRate="normal"
        scrollEventThrottle={16}
      >
        {paginatedRooms.map(room => (
          <TouchableOpacity
            key={room.id}
            style={styles.roomCard}
            onPress={() => handleRoomPress(room)}
          >
            <View style={[styles.statusBadge, { backgroundColor: getStatusColor(room.status) }]}>
              <Text style={styles.statusText}>{getStatusText(room.status)}</Text>
            </View>
            
            <View style={styles.roomInfo}>
              <Text style={styles.roomNumber}>{room.number}</Text>
              <Text style={styles.roomType}>{room.roomType || room.type}</Text>
              <Text style={styles.roomPrice}>{formatCurrency(room.price)}</Text>
              
              {room.currentGuest && (
                <Text style={styles.guestName}>Khách: {room.currentGuest}</Text>
              )}
              
              {room.checkoutDate && (
                <Text style={styles.checkoutDate}>
                  Trả phòng: {formatDate(room.checkoutDate)}
                </Text>
              )}
            </View>

            <View style={styles.roomCapacity}>
              <Ionicons name="people" size={16} color="#666" />
              <Text style={styles.capacityText}>{room.capacity}</Text>
            </View>
          </TouchableOpacity>
        ))}
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
                <Ionicons name="close" size={24} color="#666" />
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
        visible={typeModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setTypeModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Loại Phòng</Text>
              <TouchableOpacity onPress={() => setTypeModalVisible(false)}>
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalBody}>
              <TouchableOpacity
                style={[styles.hotelOption, roomTypeFilter === 'all' && styles.hotelOptionSelected]}
                onPress={() => {
                  setRoomTypeFilter('all');
                  setPageIndex(1);
                  setTypeModalVisible(false);
                }}
              >
                <Text
                  style={[
                    styles.hotelOptionText,
                    roomTypeFilter === 'all' && styles.hotelOptionTextSelected
                  ]}
                >
                  Tất cả
                </Text>
              </TouchableOpacity>
              {roomTypeOptions.map((type) => (
                <TouchableOpacity
                  key={type}
                  style={[
                    styles.hotelOption,
                    roomTypeFilter === type && styles.hotelOptionSelected
                  ]}
                  onPress={() => {
                    setRoomTypeFilter(type);
                    setPageIndex(1);
                    setTypeModalVisible(false);
                  }}
                >
                  <Text
                    style={[
                      styles.hotelOptionText,
                      roomTypeFilter === type && styles.hotelOptionTextSelected
                    ]}
                  >
                    {type}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal
        visible={floorModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setFloorModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Chọn Tầng</Text>
              <TouchableOpacity onPress={() => setFloorModalVisible(false)}>
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalBody}>
              <TouchableOpacity
                style={[styles.hotelOption, floorFilter === 'all' && styles.hotelOptionSelected]}
                onPress={() => {
                  setFloorFilter('all');
                  setPageIndex(1);
                  setFloorModalVisible(false);
                }}
              >
                <Text
                  style={[
                    styles.hotelOptionText,
                    floorFilter === 'all' && styles.hotelOptionTextSelected
                  ]}
                >
                  Tất cả
                </Text>
              </TouchableOpacity>
              {floorOptions.map((floor) => (
                <TouchableOpacity
                  key={floor}
                  style={[
                    styles.hotelOption,
                    floorFilter === floor && styles.hotelOptionSelected
                  ]}
                  onPress={() => {
                    setFloorFilter(floor);
                    setPageIndex(1);
                    setFloorModalVisible(false);
                  }}
                >
                  <Text
                    style={[
                      styles.hotelOptionText,
                      floorFilter === floor && styles.hotelOptionTextSelected
                    ]}
                  >
                    Tầng {floor}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal
        visible={roomModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setRoomModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            {selectedRoom && (
              <>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Phòng {selectedRoom.number}</Text>
                  <TouchableOpacity onPress={() => setRoomModalVisible(false)}>
                    <Ionicons name="close" size={24} color="#666" />
                  </TouchableOpacity>
                </View>

                <ScrollView
                  style={styles.modalBody}
                  contentContainerStyle={{ paddingBottom: 16 }}
                  showsVerticalScrollIndicator={false}
                  nestedScrollEnabled
                  decelerationRate="normal"
                  scrollEventThrottle={16}
                >
                  <View style={styles.detailSection}>
                    <Text style={styles.detailLabel}>Loại phòng:</Text>
                    <Text style={styles.detailValue}>{selectedRoom.roomType || selectedRoom.type}</Text>
                  </View>

                  <View style={styles.detailSection}>
                    <Text style={styles.detailLabel}>Tầng:</Text>
                    <Text style={styles.detailValue}>{selectedRoom.floor}</Text>
                  </View>

                  <View style={styles.detailSection}>
                    <Text style={styles.detailLabel}>Trạng thái:</Text>
                    <View style={[styles.statusBadge, { backgroundColor: getStatusColor(selectedRoom.status) }]}>
                      <Text style={styles.statusText}>{getStatusText(selectedRoom.status)}</Text>
                    </View>
                  </View>

                  <View style={styles.detailSection}>
                    <Text style={styles.detailLabel}>Giá:</Text>
                    <Text style={styles.detailValue}>{formatCurrency(selectedRoom.price)}</Text>
                  </View>

                  <View style={styles.detailSection}>
                    <Text style={styles.detailLabel}>Sức chứa:</Text>
                    <Text style={styles.detailValue}>{selectedRoom.capacity} người</Text>
                  </View>

                  {selectedRoom.currentGuest && (
                    <View style={styles.detailSection}>
                      <Text style={styles.detailLabel}>Khách hiện tại:</Text>
                      <Text style={styles.detailValue}>{selectedRoom.currentGuest}</Text>
                    </View>
                  )}

                  {selectedRoom.checkInTime && (
                    <View style={styles.detailSection}>
                      <Text style={styles.detailLabel}>Ngày nhận:</Text>
                      <Text style={styles.detailValue}>
                        {formatDate(selectedRoom.checkInTime)}
                      </Text>
                    </View>
                  )}

                  {selectedRoom.checkoutDate && (
                    <View style={styles.detailSection}>
                      <Text style={styles.detailLabel}>Ngày trả:</Text>
                      <Text style={styles.detailValue}>
                        {formatDate(selectedRoom.checkoutDate)}
                      </Text>
                    </View>
                  )}

                  {selectedRoom.amenities.length > 0 && (
                    <View style={styles.detailSection}>
                      <Text style={styles.detailLabel}>Tiện nghi:</Text>
                      <View style={styles.amenitiesContainer}>
                        {selectedRoom.amenities.map((amenity, index) => (
                          <View key={index} style={styles.amenityBadge}>
                            <Text style={styles.amenityText}>{amenity}</Text>
                          </View>
                        ))}
                      </View>
                    </View>
                  )}

                  {selectedRoom.lastCleaned && (
                    <View style={styles.detailSection}>
                      <Text style={styles.detailLabel}>Dọn dẹp lần cuối:</Text>
                      <Text style={styles.detailValue}>{formatDate(selectedRoom.lastCleaned)}</Text>
                    </View>
                  )}

                  {selectedRoom.lastMaintenance && (
                    <View style={styles.detailSection}>
                      <Text style={styles.detailLabel}>Bảo trì gần nhất:</Text>
                      <Text style={styles.detailValue}>{formatDate(selectedRoom.lastMaintenance)}</Text>
                    </View>
                  )}
                </ScrollView>

                {canManageRoom && (
                  <View style={styles.modalFooter}>
                    {selectedRoom.status !== 'vacant' && (
                      <TouchableOpacity
                        style={[styles.actionButton, styles.availableButton]}
                        onPress={() => handleChangeStatus('vacant')}
                      >
                        <Ionicons name="home" size={20} color="white" />
                        <Text style={styles.actionButtonText}>Chuyển trống</Text>
                      </TouchableOpacity>
                    )}

                    {selectedRoom.status !== 'occupied' && (
                      <TouchableOpacity
                        style={[styles.actionButton, styles.occupyButton]}
                        onPress={() => handleChangeStatus('occupied')}
                      >
                        <Ionicons name="person-add" size={20} color="white" />
                        <Text style={styles.actionButtonText}>Đang ở</Text>
                      </TouchableOpacity>
                    )}

                    {selectedRoom.status !== 'cleaning' && (
                      <TouchableOpacity
                        style={[styles.actionButton, styles.cleaningButton]}
                        onPress={() => handleChangeStatus('cleaning')}
                      >
                        <Ionicons name="sparkles" size={20} color="white" />
                        <Text style={styles.actionButtonText}>Đang dọn</Text>
                      </TouchableOpacity>
                    )}

                    {selectedRoom.status !== 'maintenance' && (
                      <TouchableOpacity
                        style={[styles.actionButton, styles.maintenanceButton]}
                        onPress={() => handleChangeStatus('maintenance')}
                      >
                        <Ionicons name="construct" size={20} color="white" />
                        <Text style={styles.actionButtonText}>Bảo trì</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                )}
              </>
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
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 10,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  subtitle: {
    fontSize: 13,
    color: '#8E8E93',
    marginTop: 2,
  },
  reloadButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#EAF4FF',
  },
  filterContainer: {
    backgroundColor: 'white',
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  hotelSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F2F2F7',
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderRadius: 10,
  },
  hotelSelectorText: {
    marginLeft: 8,
    fontSize: 16,
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
  quickFilters: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
  },
  filterSelect: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F2F2F7',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    flex: 1,
    justifyContent: 'space-between',
  },
  filterSelectText: {
    fontSize: 14,
    color: '#333',
  },
  roomGrid: {
    padding: 15,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  roomCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
    width: '48%',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  statusBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  statusText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },
  roomInfo: {
    marginTop: 20,
  },
  roomNumber: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  roomType: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  roomPrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#007AFF',
    marginBottom: 5,
  },
  guestName: {
    fontSize: 12,
    color: '#FF9800',
    marginBottom: 3,
  },
  checkoutDate: {
    fontSize: 11,
    color: '#999',
  },
  roomCapacity: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
  },
  capacityText: {
    fontSize: 12,
    color: '#666',
    marginLeft: 5,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 12,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  modalBody: {
    padding: 20,
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
  detailSection: {
    marginBottom: 15,
  },
  detailLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  detailValue: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  amenitiesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 5,
  },
  amenityBadge: {
    backgroundColor: '#f0f0f0',
    borderRadius: 15,
    paddingHorizontal: 10,
    paddingVertical: 5,
    marginRight: 8,
    marginBottom: 5,
  },
  amenityText: {
    fontSize: 12,
    color: '#666',
  },
  modalFooter: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 8,
    paddingHorizontal: 15,
    paddingVertical: 10,
    marginBottom: 10,
    minWidth: '48%',
    justifyContent: 'center',
  },
  actionButtonText: {
    color: 'white',
    fontWeight: 'bold',
    marginLeft: 8,
  },
  occupyButton: {
    backgroundColor: '#4CAF50',
  },
  availableButton: {
    backgroundColor: '#2196F3',
  },
  cleaningButton: {
    backgroundColor: '#0EA5E9',
  },
  maintenanceButton: {
    backgroundColor: '#F44336',
  },
  paginationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
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
});
