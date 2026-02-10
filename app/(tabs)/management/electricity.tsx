import React, { useState, useEffect } from 'react';
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
  roomId: string;
  roomNumber: string;
  floor?: number;
}

const MOCK_DEVICES: Device[] = [
  {
    id: '1',
    name: 'Đèn trần phòng 101',
    deviceId: 'tuya_device_001',
    type: 'light',
    status: true,
    power: 15,
    voltage: 220,
    current: 0.07,
    room: '101',
    floor: 1,
    isOnline: true,
    lastUpdated: '2024-01-15T10:30:00Z',
    autoMode: false,
  },
  {
    id: '2',
    name: 'Quạt trần phòng 101',
    deviceId: 'tuya_device_002',
    type: 'fan',
    status: false,
    power: 0,
    voltage: 220,
    current: 0,
    room: '101',
    floor: 1,
    isOnline: true,
    lastUpdated: '2024-01-15T10:25:00Z',
    autoMode: true,
  },
  {
    id: '3',
    name: 'Điều hòa phòng 102',
    deviceId: 'tuya_device_003',
    type: 'air_conditioner',
    status: true,
    power: 1200,
    voltage: 220,
    current: 5.45,
    room: '102',
    floor: 1,
    isOnline: true,
    lastUpdated: '2024-01-15T10:35:00Z',
    autoMode: true,
    timer: { enabled: true, startTime: '18:00', endTime: '06:00' },
  },
  {
    id: '4',
    name: 'Ổ cắm phòng 201',
    deviceId: 'tuya_device_004',
    type: 'outlet',
    status: false,
    power: 0,
    voltage: 220,
    current: 0,
    room: '201',
    floor: 2,
    isOnline: false,
    lastUpdated: '2024-01-15T09:00:00Z',
  },
  {
    id: '5',
    name: 'Đèn sân thượng',
    deviceId: 'tuya_device_005',
    type: 'light',
    status: true,
    power: 25,
    voltage: 220,
    current: 0.11,
    floor: 3,
    isOnline: true,
    lastUpdated: '2024-01-15T10:40:00Z',
    autoMode: false,
  },
  {
    id: '6',
    name: 'Máy sưởi phòng 202',
    deviceId: 'tuya_device_006',
    type: 'heater',
    status: false,
    power: 0,
    voltage: 220,
    current: 0,
    room: '202',
    floor: 2,
    isOnline: true,
    lastUpdated: '2024-01-15T10:20:00Z',
    autoMode: true,
  },
];

const MOCK_ROOMS: Room[] = [
  { roomId: '1', roomNumber: '101', floor: 1 },
  { roomId: '2', roomNumber: '102', floor: 1 },
  { roomId: '3', roomNumber: '201', floor: 2 },
  { roomId: '4', roomNumber: '202', floor: 2 },
  { roomId: '5', roomNumber: 'Sân thượng', floor: 3 },
];

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
  const [devices, setDevices] = useState<Device[]>(MOCK_DEVICES);
  const [rooms, setRooms] = useState<Room[]>(MOCK_ROOMS);
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

  // Simulate real-time power updates
  useEffect(() => {
    const interval = setInterval(() => {
      setDevices(prev => prev.map(device => {
        if (device.status && device.isOnline) {
          // Simulate power fluctuation
          const basePower = device.type === 'air_conditioner' ? 1200 : 
                           device.type === 'heater' ? 800 :
                           device.type === 'light' ? 15 : 50;
          const variation = (Math.random() - 0.5) * 0.1; // ±5% variation
          const newPower = Math.round(basePower * (1 + variation));
          return {
            ...device,
            power: newPower,
            current: newPower > 0 ? +(newPower / 220).toFixed(2) : 0,
            lastUpdated: new Date().toISOString(),
          };
        }
        return device;
      }));
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const handleToggle = async (device: Device) => {
    if (isToggling[device.id] || !device.isOnline) return;

    setIsToggling(prev => ({ ...prev, [device.id]: true }));

    // Simulate API call
    setTimeout(() => {
      setDevices(prev => prev.map(d => 
        d.id === device.id 
          ? { 
              ...d, 
              status: !d.status,
              power: !d.status ? (d.power || 50) : 0,
              current: !d.status ? (d.current || 0.23) : 0,
              lastUpdated: new Date().toISOString(),
            }
          : d
      ));
      setIsToggling(prev => ({ ...prev, [device.id]: false }));
    }, 1000);
  };

  const handleTurnOnAll = (roomId: string) => {
    Alert.alert(
      t.confirmTurnOnAll,
      '',
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Xác nhận',
          onPress: () => {
            setDevices(prev => prev.map(device => 
              device.room === roomId && device.isOnline
                ? { 
                    ...device, 
                    status: true,
                    power: device.type === 'air_conditioner' ? 1200 :
                           device.type === 'heater' ? 800 :
                           device.type === 'light' ? 15 : 50,
                    current: device.type === 'air_conditioner' ? 5.45 :
                            device.type === 'heater' ? 3.64 :
                            device.type === 'light' ? 0.07 : 0.23,
                    lastUpdated: new Date().toISOString(),
                  }
                : device
            ));
          },
        },
      ]
    );
  };

  const handleTurnOffAll = (roomId: string) => {
    Alert.alert(
      t.confirmTurnOffAll,
      '',
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Xác nhận',
          onPress: () => {
            setDevices(prev => prev.map(device => 
              device.room === roomId
                ? { 
                    ...device, 
                    status: false,
                    power: 0,
                    current: 0,
                    lastUpdated: new Date().toISOString(),
                  }
                : device
            ));
          },
        },
      ]
    );
  };

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      setIsRefreshing(false);
    }, 2000);
  };

  const groupDevicesByRoom = () => {
    const grouped: { [key: string]: Device[] } = {};
    devices.forEach(device => {
      const roomKey = device.room || 'no-room';
      if (!grouped[roomKey]) {
        grouped[roomKey] = [];
      }
      grouped[roomKey].push(device);
    });
    return grouped;
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
          disabled={!device.isOnline || isToggling[device.id]}
          trackColor={{ false: '#767577', true: '#4CAF50' }}
          thumbColor={device.status ? '#fff' : '#f4f3f4'}
        />
        
        <View style={styles.controlButtons}>
          <TouchableOpacity
            style={[styles.controlButton, styles.turnOnButton, (!device.isOnline || device.status) && styles.disabledButton]}
            onPress={() => handleToggle(device)}
            disabled={!device.isOnline || device.status || isToggling[device.id]}
          >
            <Ionicons name="power" size={16} color="#fff" />
            <Text style={styles.controlButtonText}>{t.turnOn}</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.controlButton, styles.turnOffButton, (!device.isOnline || !device.status) && styles.disabledButton]}
            onPress={() => handleToggle(device)}
            disabled={!device.isOnline || !device.status || isToggling[device.id]}
          >
            <Ionicons name="power" size={16} color="#fff" />
            <Text style={styles.controlButtonText}>{t.turnOff}</Text>
          </TouchableOpacity>
        </View>
      </View>
      
      {isToggling[device.id] && (
        <ActivityIndicator size="small" color="#4CAF50" style={styles.loadingIndicator} />
      )}
    </View>
  );

  const renderRoomSection = (room: Room) => {
    const roomDevices = devices.filter(d => d.room === room.roomNumber);
    if (roomDevices.length === 0) return null;

    return (
      <View key={room.roomId} style={styles.roomSection}>
        <View style={styles.roomHeader}>
          <Text style={styles.roomTitle}>
            {t.room} {room.roomNumber} {room.floor && `- ${t.floor} ${room.floor}`}
          </Text>
          <View style={styles.roomControls}>
            <TouchableOpacity
              style={[styles.roomControlButton, styles.turnOnAllButton]}
              onPress={() => handleTurnOnAll(room.roomNumber)}
            >
              <Ionicons name="power" size={16} color="#fff" />
              <Text style={styles.roomControlButtonText}>{t.turnOnAll}</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.roomControlButton, styles.turnOffAllButton]}
              onPress={() => handleTurnOffAll(room.roomNumber)}
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