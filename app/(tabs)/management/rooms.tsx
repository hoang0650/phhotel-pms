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

interface Room {
  id: string;
  roomNumber: string;
  roomType: string;
  floor: number;
  status: 'available' | 'occupied' | 'maintenance' | 'cleaning';
  price: number;
  capacity: number;
  amenities: string[];
  description?: string;
  images?: string[];
  lastCleaned?: string;
  nextMaintenance?: string;
  guestName?: string;
  checkInDate?: string;
  checkOutDate?: string;
}

interface RoomFilter {
  status: string;
  roomType: string;
  floor: string;
  searchQuery: string;
}

export default function RoomManagementScreen() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<RoomFilter>({
    status: 'all',
    roomType: 'all',
    floor: 'all',
    searchQuery: '',
  });
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [editMode, setEditMode] = useState(false);

  // Mock data for demonstration
  const mockRooms: Room[] = [
    {
      id: '1',
      roomNumber: '101',
      roomType: 'Standard',
      floor: 1,
      status: 'available',
      price: 500000,
      capacity: 2,
      amenities: ['WiFi', 'TV', 'Mini Bar', 'Air Conditioning'],
      description: 'Phòng tiêu chuẩn với đầy đủ tiện nghi',
      lastCleaned: '2024-01-15T08:00:00Z',
      nextMaintenance: '2024-02-01T00:00:00Z',
    },
    {
      id: '2',
      roomNumber: '201',
      roomType: 'Deluxe',
      floor: 2,
      status: 'occupied',
      price: 800000,
      capacity: 3,
      amenities: ['WiFi', 'TV', 'Mini Bar', 'Air Conditioning', 'Balcony'],
      description: 'Phòng cao cấp với ban công riêng',
      guestName: 'Nguyễn Văn A',
      checkInDate: '2024-01-10T14:00:00Z',
      checkOutDate: '2024-01-20T12:00:00Z',
    },
    {
      id: '3',
      roomNumber: '301',
      roomType: 'Suite',
      floor: 3,
      status: 'maintenance',
      price: 1200000,
      capacity: 4,
      amenities: ['WiFi', 'TV', 'Mini Bar', 'Air Conditioning', 'Balcony', 'Kitchen'],
      description: 'Phòng cao cấp với bếp riêng',
      nextMaintenance: '2024-01-18T00:00:00Z',
    },
    {
      id: '4',
      roomNumber: '102',
      roomType: 'Standard',
      floor: 1,
      status: 'cleaning',
      price: 500000,
      capacity: 2,
      amenities: ['WiFi', 'TV', 'Mini Bar'],
      lastCleaned: '2024-01-16T10:00:00Z',
    },
    {
      id: '5',
      roomNumber: '202',
      roomType: 'Deluxe',
      floor: 2,
      status: 'available',
      price: 800000,
      capacity: 3,
      amenities: ['WiFi', 'TV', 'Mini Bar', 'Air Conditioning'],
      description: 'Phòng cao cấp với view đẹp',
      lastCleaned: '2024-01-16T09:00:00Z',
      nextMaintenance: '2024-02-15T00:00:00Z',
    },
  ];

  useEffect(() => {
    // Simulate API call
    setTimeout(() => {
      setRooms(mockRooms);
      setLoading(false);
    }, 1000);
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'available':
        return '#4CAF50';
      case 'occupied':
        return '#FF9800';
      case 'maintenance':
        return '#F44336';
      case 'cleaning':
        return '#2196F3';
      default:
        return '#9E9E9E';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'available':
        return 'Có sẵn';
      case 'occupied':
        return 'Đã thuê';
      case 'maintenance':
        return 'Bảo trì';
      case 'cleaning':
        return 'Đang dọn';
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

  const filteredRooms = rooms.filter(room => {
    const matchesSearch = room.roomNumber.toLowerCase().includes(filter.searchQuery.toLowerCase()) ||
                         room.roomType.toLowerCase().includes(filter.searchQuery.toLowerCase()) ||
                         room.guestName?.toLowerCase().includes(filter.searchQuery.toLowerCase());
    
    const matchesStatus = filter.status === 'all' || room.status === filter.status;
    const matchesRoomType = filter.roomType === 'all' || room.roomType === filter.roomType;
    const matchesFloor = filter.floor === 'all' || room.floor === parseInt(filter.floor);

    return matchesSearch && matchesStatus && matchesRoomType && matchesFloor;
  });

  const handleRoomPress = (room: Room) => {
    setSelectedRoom(room);
    setModalVisible(true);
  };

  const handleEditRoom = () => {
    setEditMode(true);
    Alert.alert('Chỉnh sửa', 'Chức năng chỉnh sửa phòng sẽ được triển khai');
  };

  const handleChangeStatus = (newStatus: Room['status']) => {
    if (selectedRoom) {
      Alert.alert(
        'Xác nhận',
        `Bạn có chắc chắn muốn đổi trạng thái phòng ${selectedRoom.roomNumber} sang ${getStatusText(newStatus)}?`,
        [
          { text: 'Hủy', style: 'cancel' },
          {
            text: 'Xác nhận',
            onPress: () => {
              setRooms(prev => prev.map(room => 
                room.id === selectedRoom.id 
                  ? { ...room, status: newStatus }
                  : room
              ));
              setModalVisible(false);
            },
          },
        ]
      );
    }
  };

  const handleAddRoom = () => {
    Alert.alert('Thêm phòng', 'Chức năng thêm phòng mới sẽ được triển khai');
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
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Quản Lý Phòng</Text>
        <TouchableOpacity style={styles.addButton} onPress={handleAddRoom}>
          <Ionicons name="add" size={24} color="white" />
        </TouchableOpacity>
      </View>

      {/* Filters */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Tìm kiếm phòng..."
          value={filter.searchQuery}
          onChangeText={(text) => setFilter(prev => ({ ...prev, searchQuery: text }))}
        />
        
        <View style={styles.filterButton}>
          <Text style={styles.filterButtonText}>Trạng thái</Text>
          <Ionicons name="chevron-down" size={16} color="#666" />
        </View>
        
        <View style={styles.filterButton}>
          <Text style={styles.filterButtonText}>Loại phòng</Text>
          <Ionicons name="chevron-down" size={16} color="#666" />
        </View>
        
        <View style={styles.filterButton}>
          <Text style={styles.filterButtonText}>Tầng</Text>
          <Ionicons name="chevron-down" size={16} color="#666" />
        </View>
      </ScrollView>

      {/* Room Grid */}
      <ScrollView contentContainerStyle={styles.roomGrid}>
        {filteredRooms.map(room => (
          <TouchableOpacity
            key={room.id}
            style={styles.roomCard}
            onPress={() => handleRoomPress(room)}
          >
            <View style={[styles.statusBadge, { backgroundColor: getStatusColor(room.status) }]}>
              <Text style={styles.statusText}>{getStatusText(room.status)}</Text>
            </View>
            
            <View style={styles.roomInfo}>
              <Text style={styles.roomNumber}>{room.roomNumber}</Text>
              <Text style={styles.roomType}>{room.roomType}</Text>
              <Text style={styles.roomPrice}>{formatCurrency(room.price)}</Text>
              
              {room.guestName && (
                <Text style={styles.guestName}>Khách: {room.guestName}</Text>
              )}
              
              {room.checkOutDate && (
                <Text style={styles.checkoutDate}>
                  Trả phòng: {new Date(room.checkOutDate).toLocaleDateString('vi-VN')}
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

      {/* Room Detail Modal */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            {selectedRoom && (
              <>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Phòng {selectedRoom.roomNumber}</Text>
                  <TouchableOpacity onPress={() => setModalVisible(false)}>
                    <Ionicons name="close" size={24} color="#666" />
                  </TouchableOpacity>
                </View>

                <ScrollView style={styles.modalBody}>
                  <View style={styles.detailSection}>
                    <Text style={styles.detailLabel}>Loại phòng:</Text>
                    <Text style={styles.detailValue}>{selectedRoom.roomType}</Text>
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

                  {selectedRoom.description && (
                    <View style={styles.detailSection}>
                      <Text style={styles.detailLabel}>Mô tả:</Text>
                      <Text style={styles.detailValue}>{selectedRoom.description}</Text>
                    </View>
                  )}

                  {selectedRoom.guestName && (
                    <View style={styles.detailSection}>
                      <Text style={styles.detailLabel}>Khách hiện tại:</Text>
                      <Text style={styles.detailValue}>{selectedRoom.guestName}</Text>
                    </View>
                  )}

                  {selectedRoom.checkInDate && (
                    <View style={styles.detailSection}>
                      <Text style={styles.detailLabel}>Ngày nhận:</Text>
                      <Text style={styles.detailValue}>
                        {new Date(selectedRoom.checkInDate).toLocaleDateString('vi-VN')}
                      </Text>
                    </View>
                  )}

                  {selectedRoom.checkOutDate && (
                    <View style={styles.detailSection}>
                      <Text style={styles.detailLabel}>Ngày trả:</Text>
                      <Text style={styles.detailValue}>
                        {new Date(selectedRoom.checkOutDate).toLocaleDateString('vi-VN')}
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
                      <Text style={styles.detailValue}>
                        {new Date(selectedRoom.lastCleaned).toLocaleDateString('vi-VN')}
                      </Text>
                    </View>
                  )}

                  {selectedRoom.nextMaintenance && (
                    <View style={styles.detailSection}>
                      <Text style={styles.detailLabel}>Bảo trì tiếp theo:</Text>
                      <Text style={styles.detailValue}>
                        {new Date(selectedRoom.nextMaintenance).toLocaleDateString('vi-VN')}
                      </Text>
                    </View>
                  )}
                </ScrollView>

                <View style={styles.modalFooter}>
                  <TouchableOpacity
                    style={[styles.actionButton, styles.editButton]}
                    onPress={handleEditRoom}
                  >
                    <Ionicons name="create-outline" size={20} color="white" />
                    <Text style={styles.actionButtonText}>Chỉnh sửa</Text>
                  </TouchableOpacity>

                  {selectedRoom.status === 'available' && (
                    <TouchableOpacity
                      style={[styles.actionButton, styles.occupyButton]}
                      onPress={() => handleChangeStatus('occupied')}
                    >
                      <Ionicons name="person-add" size={20} color="white" />
                      <Text style={styles.actionButtonText}>Thuê phòng</Text>
                    </TouchableOpacity>
                  )}

                  {selectedRoom.status === 'occupied' && (
                    <TouchableOpacity
                      style={[styles.actionButton, styles.availableButton]}
                      onPress={() => handleChangeStatus('available')}
                    >
                      <Ionicons name="checkmark-circle" size={20} color="white" />
                      <Text style={styles.actionButtonText}>Trả phòng</Text>
                    </TouchableOpacity>
                  )}

                  {(selectedRoom.status === 'available' || selectedRoom.status === 'occupied') && (
                    <TouchableOpacity
                      style={[styles.actionButton, styles.maintenanceButton]}
                      onPress={() => handleChangeStatus('maintenance')}
                    >
                      <Ionicons name="construct" size={20} color="white" />
                      <Text style={styles.actionButtonText}>Bảo trì</Text>
                    </TouchableOpacity>
                  )}

                  {selectedRoom.status === 'maintenance' && (
                    <TouchableOpacity
                      style={[styles.actionButton, styles.availableButton]}
                      onPress={() => handleChangeStatus('available')}
                    >
                      <Ionicons name="home" size={20} color="white" />
                      <Text style={styles.actionButtonText}>Hoàn thành</Text>
                    </TouchableOpacity>
                  )}
                </View>
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
  addButton: {
    backgroundColor: '#007AFF',
    borderRadius: 25,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 2,
  },
  filterContainer: {
    backgroundColor: 'white',
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  searchInput: {
    backgroundColor: '#f0f0f0',
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 10,
    minWidth: 200,
    marginRight: 10,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 10,
    marginRight: 10,
  },
  filterButtonText: {
    fontSize: 14,
    color: '#666',
    marginRight: 5,
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
    maxHeight: '80%',
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
  editButton: {
    backgroundColor: '#FF9800',
  },
  occupyButton: {
    backgroundColor: '#4CAF50',
  },
  availableButton: {
    backgroundColor: '#2196F3',
  },
  maintenanceButton: {
    backgroundColor: '#F44336',
  },
});