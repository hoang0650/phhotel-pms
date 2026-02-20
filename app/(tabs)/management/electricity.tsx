import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useLanguage } from '../../../contexts/LanguageContext';
import { useHotel } from '../../../contexts/HotelContext';
import { apiClient } from '../../../services/api/client';

interface Device {
  id: string;
  name: string;
  deviceId: string;
  type: 'light' | 'fan' | 'air_conditioner' | 'outlet' | 'heater';
  status: boolean;
  power?: number;
  voltage?: number;
  current?: number;
  room?: string;
  floor?: number;
  isOnline: boolean;
  lastUpdated: string;
  autoMode?: boolean;
  timer?: { enabled: boolean; startTime?: string; endTime?: string };
}

interface Room {
  roomId?: string;
  roomNumber: string;
  floor?: number;
}

const getDeviceIcon = (type: Device['type']) => {
  switch (type) {
    case 'light': return 'bulb';
    case 'fan': return 'hardware-chip';
    case 'air_conditioner': return 'snow';
    case 'outlet': return 'power';
    case 'heater': return 'flame';
    default: return 'hardware-chip';
  }
};

const getDeviceTypeText = (type: Device['type'], language: string) => {
  const types = {
    light: { vi: 'Đèn', en: 'Light' },
    fan: { vi: 'Quạt', en: 'Fan' },
    air_conditioner: { vi: 'Điều hòa', en: 'AC' },
    outlet: { vi: 'Ổ cắm', en: 'Outlet' },
    heater: { vi: 'Máy sưởi', en: 'Heater' },
  };
  return types[type]?.[language as keyof typeof types[typeof type]] || type;
};

export default function ElectricityScreen() {
  const { language } = useLanguage();
  const { selectedHotelId } = useHotel();
  const [devices, setDevices] = useState<Device[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showByRoom, setShowByRoom] = useState(false);
  const [isToggling, setIsToggling] = useState<{ [key: string]: boolean }>({});

  const translations = {
    vi: {
      title: 'Quản Lý Điện',
      deviceManagement: 'Quản lý thiết bị',
      showByRoom: 'Hiển thị theo phòng',
      allDevices: 'Tất cả thiết bị',
      room: 'Phòng',
      floor: 'Tầng',
      online: 'Online',
      offline: 'Offline',
      turnOn: 'Bật',
      turnOff: 'Tắt',
      turnOnAll: 'Bật tất cả',
      turnOffAll: 'Tắt tất cả',
      refresh: 'Làm mới',
      power: 'Công suất',
      voltage: 'Điện áp',
      current: 'Dòng điện',
      autoMode: 'Tự động',
      timer: 'Hẹn giờ',
      noDevices: 'Không có thiết bị',
      reload: 'Tải lại',
      confirmTurnOnAll: 'Bạn có chắc chắn muốn bật tất cả thiết bị trong phòng này?',
      confirmTurnOffAll: 'Bạn có chắc chắn muốn tắt tất cả thiết bị trong phòng này?',
    },
    en: {
      title: 'Electricity Management',
      deviceManagement: 'Device Management',
      showByRoom: 'Show by Room',
      allDevices: 'All Devices',
      room: 'Room',
      floor: 'Floor',
      online: 'Online',
      offline: 'Offline',
      turnOn: 'Turn On',
      turnOff: 'Turn Off',
      turnOnAll: 'Turn On All',
      turnOffAll: 'Turn Off All',
      refresh: 'Refresh',
      power: 'Power',
      voltage: 'Voltage',
      current: 'Current',
      autoMode: 'Auto',
      timer: 'Timer',
      noDevices: 'No devices',
      reload: 'Reload',
      confirmTurnOnAll: 'Are you sure you want to turn on all devices in this room?',
      confirmTurnOffAll: 'Are you sure you want to turn off all devices in this room?',
    },
  };

  const t = translations[language as keyof typeof translations];

  const loadDevices = useCallback(async () => {
    setIsLoading(true);
    try {
      const endpoint = selectedHotelId ? `/tuya/devices?hotelId=${selectedHotelId}` : '/tuya/devices';
      const response = await apiClient.get<{ data?: any[] } | any[]>(endpoint);
      const deviceList = Array.isArray(response) ? response : response.data || [];

      const mappedDevices: Device[] = deviceList.map((device, index) => {
        const deviceId = device.deviceId || device.id || `${index}`;
        return {
          id: deviceId,
          name: device.name || `Device ${index + 1}`,
          deviceId,
          type: 'outlet',
          status: !!device.state,
          room: device.roomNumber || device.room?.roomNumber,
          floor: device.room?.floor,
          isOnline: device.online !== false,
          lastUpdated: new Date().toISOString(),
        };
      });

      const roomMap = new Map<string, Room>();
      deviceList.forEach((device) => {
        const roomNumber = device.roomNumber || device.room?.roomNumber;
        if (!roomNumber) return;
        const roomId = device.roomId?._id || device.roomId;
        const floor = device.room?.floor || device.floor;
        if (!roomMap.has(roomNumber)) {
          roomMap.set(roomNumber, { roomId, roomNumber, floor });
        }
      });

      setDevices(mappedDevices);
      setRooms(Array.from(roomMap.values()));
    } catch (error) {
      console.warn('[Electricity] Load devices error:', error);
      Alert.alert(language === 'vi' ? 'Lỗi' : 'Error', language === 'vi' ? 'Không thể tải thiết bị' : 'Failed to load devices');
    } finally {
      setIsLoading(false);
    }
  }, [language, selectedHotelId]);

  useEffect(() => {
    loadDevices();
  }, [loadDevices]);

  const handleToggle = async (device: Device) => {
    if (isToggling[device.deviceId] || !device.isOnline) return;

    setIsToggling(prev => ({ ...prev, [device.deviceId]: true }));

    try {
      const response = await apiClient.post<{ data?: { state?: boolean } }>(
        `/tuya/devices/${device.deviceId}/toggle`,
        {}
      );
      const newState = response?.data?.state ?? !device.status;
      setDevices(prev =>
        prev.map(d =>
          d.deviceId === device.deviceId
            ? {
                ...d,
                status: newState,
                lastUpdated: new Date().toISOString(),
              }
            : d
        )
      );
    } catch (error) {
      console.warn('[Electricity] Toggle device error:', error);
      Alert.alert(language === 'vi' ? 'Lỗi' : 'Error', language === 'vi' ? 'Không thể điều khiển thiết bị' : 'Failed to control device');
    } finally {
      setIsToggling(prev => ({ ...prev, [device.deviceId]: false }));
    }
  };

  const handleTurnOnAll = (room: Room) => {
    Alert.alert(
      t.confirmTurnOnAll,
      '',
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Xác nhận',
          onPress: async () => {
            if (!room.roomId) return;
            try {
              await apiClient.post(`/tuya/rooms/${room.roomId}/auto-turn-on`, {});
              setDevices(prev =>
                prev.map(device =>
                  device.room === room.roomNumber
                    ? { ...device, status: true, lastUpdated: new Date().toISOString() }
                    : device
                )
              );
            } catch (error) {
              console.warn('[Electricity] Turn on all error:', error);
              Alert.alert(language === 'vi' ? 'Lỗi' : 'Error', language === 'vi' ? 'Không thể bật tất cả thiết bị' : 'Failed to turn on all devices');
            }
          },
        },
      ]
    );
  };

  const handleTurnOffAll = (room: Room) => {
    Alert.alert(
      t.confirmTurnOffAll,
      '',
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Xác nhận',
          onPress: async () => {
            if (!room.roomId) return;
            try {
              await apiClient.post(`/tuya/rooms/${room.roomId}/auto-turn-off`, {});
              setDevices(prev =>
                prev.map(device =>
                  device.room === room.roomNumber
                    ? { ...device, status: false, lastUpdated: new Date().toISOString() }
                    : device
                )
              );
            } catch (error) {
              console.warn('[Electricity] Turn off all error:', error);
              Alert.alert(language === 'vi' ? 'Lỗi' : 'Error', language === 'vi' ? 'Không thể tắt tất cả thiết bị' : 'Failed to turn off all devices');
            }
          },
        },
      ]
    );
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadDevices();
    setIsRefreshing(false);
  };

  const renderDeviceItem = (device: Device) => (
    <View key={device.id} style={styles.deviceItem}>
      <View style={styles.deviceInfo}>
        <View style={styles.deviceHeader}>
          <Ionicons 
            name={getDeviceIcon(device.type) as any} 
            size={24} 
            color={device.isOnline ? (device.status ? '#4CAF50' : '#757575') : '#ccc'} 
          />
          <View style={styles.deviceDetails}>
            <Text style={styles.deviceName}>{device.name}</Text>
            <View style={styles.deviceMeta}>
              <Text style={[styles.deviceType, !device.isOnline && styles.offlineText]}>
                {getDeviceTypeText(device.type, language)}
              </Text>
              <Text style={[styles.statusText, device.isOnline ? styles.onlineText : styles.offlineText]}>
                {device.isOnline ? t.online : t.offline}
              </Text>
            </View>
            {device.room && (
              <Text style={styles.roomText}>
                {t.room} {device.room} {device.floor && `- ${t.floor} ${device.floor}`}
              </Text>
            )}
          </View>
        </View>
        
        {device.isOnline && device.power !== undefined && (
          <View style={styles.powerInfo}>
            <Text style={styles.powerText}>
              {t.power}: {device.power}W
            </Text>
            <Text style={styles.voltageText}>
              {t.voltage}: {device.voltage}V | {t.current}: {device.current}A
            </Text>
            {device.autoMode && (
              <Text style={styles.autoModeText}>{t.autoMode}</Text>
            )}
            {device.timer?.enabled && (
              <Text style={styles.timerText}>
                {t.timer}: {device.timer.startTime}-{device.timer.endTime}
              </Text>
            )}
          </View>
        )}
      </View>
      
      <View style={styles.deviceControls}>
        <Switch
          value={device.status}
          onValueChange={() => handleToggle(device)}
          disabled={!device.isOnline || isToggling[device.deviceId]}
          trackColor={{ false: '#767577', true: '#4CAF50' }}
          thumbColor={device.status ? '#fff' : '#f4f3f4'}
        />
        
        <View style={styles.controlButtons}>
          <TouchableOpacity
            style={[styles.controlButton, styles.turnOnButton, (!device.isOnline || device.status) && styles.disabledButton]}
            onPress={() => handleToggle(device)}
            disabled={!device.isOnline || device.status || isToggling[device.deviceId]}
          >
            <Ionicons name="power" size={16} color="#fff" />
            <Text style={styles.controlButtonText}>{t.turnOn}</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.controlButton, styles.turnOffButton, (!device.isOnline || !device.status) && styles.disabledButton]}
            onPress={() => handleToggle(device)}
            disabled={!device.isOnline || !device.status || isToggling[device.deviceId]}
          >
            <Ionicons name="power" size={16} color="#fff" />
            <Text style={styles.controlButtonText}>{t.turnOff}</Text>
          </TouchableOpacity>
        </View>
      </View>
      
      {isToggling[device.deviceId] && (
        <ActivityIndicator size="small" color="#4CAF50" style={styles.loadingIndicator} />
      )}
    </View>
  );

  const renderRoomSection = (room: Room) => {
    const roomDevices = devices.filter(d => d.room === room.roomNumber);
    if (roomDevices.length === 0) return null;

    return (
      <View key={room.roomId || room.roomNumber} style={styles.roomSection}>
        <View style={styles.roomHeader}>
          <Text style={styles.roomTitle}>
            {t.room} {room.roomNumber} {room.floor && `- ${t.floor} ${room.floor}`}
          </Text>
          <View style={styles.roomControls}>
            <TouchableOpacity
              style={[styles.roomControlButton, styles.turnOnAllButton]}
              onPress={() => handleTurnOnAll(room)}
            >
              <Ionicons name="power" size={16} color="#fff" />
              <Text style={styles.roomControlButtonText}>{t.turnOnAll}</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.roomControlButton, styles.turnOffAllButton]}
              onPress={() => handleTurnOffAll(room)}
            >
              <Ionicons name="power" size={16} color="#fff" />
              <Text style={styles.roomControlButtonText}>{t.turnOffAll}</Text>
            </TouchableOpacity>
          </View>
        </View>
        
        <View style={styles.roomDevices}>
          {roomDevices.map(renderDeviceItem)}
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{t.title}</Text>
        <TouchableOpacity
          style={styles.toggleButton}
          onPress={() => setShowByRoom(!showByRoom)}
        >
          <Ionicons 
            name={showByRoom ? 'list' : 'grid'} 
            size={20} 
            color="#fff" 
          />
          <Text style={styles.toggleButtonText}>
            {showByRoom ? t.allDevices : t.showByRoom}
          </Text>
        </TouchableOpacity>
      </View>
      
      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            colors={['#4CAF50']}
          />
        }
      >
        {showByRoom ? (
          <View style={styles.roomsContainer}>
            {rooms.map(renderRoomSection)}
          </View>
        ) : (
          <View style={styles.devicesContainer}>
            {devices.map(renderDeviceItem)}
          </View>
        )}
        
        {devices.length === 0 && !isLoading && (
          <View style={styles.emptyContainer}>
            <Ionicons name="hardware-chip" size={64} color="#ccc" />
            <Text style={styles.emptyText}>{t.noDevices}</Text>
            <TouchableOpacity style={styles.reloadButton} onPress={handleRefresh}>
              <Ionicons name="refresh" size={20} color="#fff" />
              <Text style={styles.reloadButtonText}>{t.reload}</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  toggleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4CAF50',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
  },
  toggleButtonText: {
    color: '#fff',
    marginLeft: 6,
    fontSize: 14,
    fontWeight: '500',
  },
  content: {
    flex: 1,
  },
  roomsContainer: {
    padding: 16,
  },
  devicesContainer: {
    padding: 16,
  },
  roomSection: {
    marginBottom: 20,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  roomHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  roomTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  roomControls: {
    flexDirection: 'row',
  },
  roomControlButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginLeft: 8,
  },
  turnOnAllButton: {
    backgroundColor: '#4CAF50',
  },
  turnOffAllButton: {
    backgroundColor: '#f44336',
  },
  roomControlButtonText: {
    color: '#fff',
    marginLeft: 4,
    fontSize: 12,
    fontWeight: '500',
  },
  roomDevices: {
    marginTop: 8,
  },
  deviceItem: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  deviceInfo: {
    marginBottom: 12,
  },
  deviceHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  deviceDetails: {
    flex: 1,
    marginLeft: 12,
  },
  deviceName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  deviceMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  deviceType: {
    fontSize: 14,
    color: '#666',
    marginRight: 8,
  },
  statusText: {
    fontSize: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  onlineText: {
    backgroundColor: '#e8f5e8',
    color: '#4CAF50',
  },
  offlineText: {
    backgroundColor: '#ffeaea',
    color: '#f44336',
  },
  roomText: {
    fontSize: 14,
    color: '#666',
  },
  powerInfo: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  powerText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    marginBottom: 2,
  },
  voltageText: {
    fontSize: 12,
    color: '#666',
    marginBottom: 2,
  },
  autoModeText: {
    fontSize: 12,
    color: '#2196F3',
    fontWeight: '500',
  },
  timerText: {
    fontSize: 12,
    color: '#FF9800',
  },
  deviceControls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  controlButtons: {
    flexDirection: 'row',
  },
  controlButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    marginLeft: 8,
  },
  turnOnButton: {
    backgroundColor: '#4CAF50',
  },
  turnOffButton: {
    backgroundColor: '#f44336',
  },
  disabledButton: {
    backgroundColor: '#ccc',
  },
  controlButtonText: {
    color: '#fff',
    marginLeft: 4,
    fontSize: 12,
    fontWeight: '500',
  },
  loadingIndicator: {
    position: 'absolute',
    top: 16,
    right: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    marginTop: 16,
    marginBottom: 24,
  },
  reloadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4CAF50',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  reloadButtonText: {
    color: '#fff',
    marginLeft: 8,
    fontSize: 14,
    fontWeight: '500',
  },
});
