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
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Utensils,
  Shirt,
  Car,
  Heart,
  Wine,
  Waves,
  Plus,
  Search,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  X,
  Package,
} from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Colors from '@/constants/colors';
import { useHotel } from '@/contexts/HotelContext';
import { servicesApi } from '@/services/api';
import { Service, ServiceOrder } from '@/types/hotel';

const SERVICE_ICONS: Record<string, React.ComponentType<{ size: number; color: string }>> = {
  food: Utensils,
  laundry: Shirt,
  transport: Car,
  wellness: Heart,
  wine: Wine,
  waves: Waves,
};

const CATEGORIES = [
  { id: 'all', name: 'Tất cả' },
  { id: 'food', name: 'Ẩm thực' },
  { id: 'laundry', name: 'Giặt ủi' },
  { id: 'transport', name: 'Vận chuyển' },
  { id: 'wellness', name: 'Chăm sóc' },
];

const ORDER_STATUS_COLORS: Record<string, string> = {
  pending: '#f59e0b',
  processing: '#3b82f6',
  completed: '#10b981',
  cancelled: '#ef4444',
};

const ORDER_STATUS_LABELS: Record<string, string> = {
  pending: 'Chờ xử lý',
  processing: 'Đang xử lý',
  completed: 'Hoàn thành',
  cancelled: 'Đã hủy',
};

export default function ServicesScreen() {
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const { selectedHotelId } = useHotel();
  const [activeTab, setActiveTab] = useState<'services' | 'orders'>('services');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [orderModalVisible, setOrderModalVisible] = useState(false);
  const [selectedService, setSelectedService] = useState<Service | null>(null);

  const { data: services = [], isLoading: servicesLoading, refetch: refetchServices } = useQuery({
    queryKey: ['services', selectedHotelId],
    queryFn: () => servicesApi.getAll(selectedHotelId || undefined),
  });

  const { data: orders = [], isLoading: ordersLoading, refetch: refetchOrders } = useQuery({
    queryKey: ['serviceOrders', selectedHotelId],
    queryFn: () => servicesApi.getOrders(selectedHotelId || undefined),
  });

  const updateOrderMutation = useMutation({
    mutationFn: ({ orderId, status }: { orderId: string; status: ServiceOrder['status'] }) =>
      servicesApi.updateOrderStatus(orderId, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['serviceOrders'] });
    },
  });

  const isLoading = servicesLoading || ordersLoading;

  const filteredServices = services.filter(service => {
    const matchesCategory = selectedCategory === 'all' || service.category === selectedCategory;
    const matchesSearch = service.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch && service.isActive;
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const handleRefresh = async () => {
    await Promise.all([refetchServices(), refetchOrders()]);
  };

  const handleUpdateOrderStatus = (orderId: string, newStatus: ServiceOrder['status']) => {
    Alert.alert(
      'Xác nhận',
      `Bạn có chắc muốn cập nhật trạng thái đơn hàng?`,
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Xác nhận',
          onPress: () => updateOrderMutation.mutate({ orderId, status: newStatus }),
        },
      ]
    );
  };

  const getServiceIcon = (category: string) => {
    const IconComponent = SERVICE_ICONS[category] || Package;
    return IconComponent;
  };

  const pendingOrders = orders.filter(o => o.status === 'pending').length;
  const processingOrders = orders.filter(o => o.status === 'processing').length;

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#7c3aed', '#a855f7']}
        style={[styles.header, { paddingTop: insets.top + 12 }]}
      >
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Dịch vụ</Text>
          <TouchableOpacity style={styles.addButton}>
            <Plus size={20} color="#fff" />
          </TouchableOpacity>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{services.length}</Text>
            <Text style={styles.statLabel}>Dịch vụ</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{pendingOrders}</Text>
            <Text style={styles.statLabel}>Chờ xử lý</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{processingOrders}</Text>
            <Text style={styles.statLabel}>Đang xử lý</Text>
          </View>
        </View>

        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'services' && styles.tabActive]}
            onPress={() => setActiveTab('services')}
          >
            <Text style={[styles.tabText, activeTab === 'services' && styles.tabTextActive]}>
              Danh sách
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'orders' && styles.tabActive]}
            onPress={() => setActiveTab('orders')}
          >
            <Text style={[styles.tabText, activeTab === 'orders' && styles.tabTextActive]}>
              Đơn hàng
            </Text>
            {pendingOrders > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{pendingOrders}</Text>
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
        {activeTab === 'services' ? (
          <>
            <View style={styles.searchContainer}>
              <View style={styles.searchBox}>
                <Search size={18} color={Colors.light.textSecondary} />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Tìm kiếm dịch vụ..."
                  placeholderTextColor={Colors.light.textSecondary}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                />
              </View>
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.categoriesContainer}
              contentContainerStyle={styles.categoriesContent}
            >
              {CATEGORIES.map(category => (
                <TouchableOpacity
                  key={category.id}
                  style={[
                    styles.categoryChip,
                    selectedCategory === category.id && styles.categoryChipActive,
                  ]}
                  onPress={() => setSelectedCategory(category.id)}
                >
                  <Text
                    style={[
                      styles.categoryChipText,
                      selectedCategory === category.id && styles.categoryChipTextActive,
                    ]}
                  >
                    {category.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <View style={styles.servicesGrid}>
              {filteredServices.map(service => {
                const IconComponent = getServiceIcon(service.category);
                return (
                  <TouchableOpacity
                    key={service.id}
                    style={styles.serviceCard}
                    onPress={() => {
                      setSelectedService(service);
                      setOrderModalVisible(true);
                    }}
                  >
                    <View style={[styles.serviceIconContainer, { backgroundColor: '#f3e8ff' }]}>
                      <IconComponent size={24} color="#7c3aed" />
                    </View>
                    <Text style={styles.serviceName} numberOfLines={2}>
                      {service.name}
                    </Text>
                    <Text style={styles.servicePrice}>{formatCurrency(service.price)}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {filteredServices.length === 0 && !isLoading && (
              <View style={styles.emptyState}>
                <Package size={48} color={Colors.light.textSecondary} />
                <Text style={styles.emptyText}>Không có dịch vụ nào</Text>
              </View>
            )}
          </>
        ) : (
          <View style={styles.ordersContainer}>
            {orders.map(order => (
              <View key={order.id} style={styles.orderCard}>
                <View style={styles.orderHeader}>
                  <View style={styles.orderRoomBadge}>
                    <Text style={styles.orderRoomText}>P.{order.roomNumber}</Text>
                  </View>
                  <View
                    style={[
                      styles.orderStatusBadge,
                      { backgroundColor: `${ORDER_STATUS_COLORS[order.status]}20` },
                    ]}
                  >
                    <View
                      style={[
                        styles.orderStatusDot,
                        { backgroundColor: ORDER_STATUS_COLORS[order.status] },
                      ]}
                    />
                    <Text
                      style={[styles.orderStatusText, { color: ORDER_STATUS_COLORS[order.status] }]}
                    >
                      {ORDER_STATUS_LABELS[order.status]}
                    </Text>
                  </View>
                </View>

                <View style={styles.orderBody}>
                  <Text style={styles.orderServiceName}>{order.serviceName}</Text>
                  <Text style={styles.orderGuestName}>{order.guestName}</Text>
                  <View style={styles.orderDetails}>
                    <Text style={styles.orderQuantity}>SL: {order.quantity}</Text>
                    <Text style={styles.orderPrice}>{formatCurrency(order.totalPrice)}</Text>
                  </View>
                </View>

                <View style={styles.orderFooter}>
                  <View style={styles.orderTime}>
                    <Clock size={14} color={Colors.light.textSecondary} />
                    <Text style={styles.orderTimeText}>
                      {new Date(order.createdAt).toLocaleTimeString('vi-VN', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </Text>
                  </View>

                  {order.status === 'pending' && (
                    <View style={styles.orderActions}>
                      <TouchableOpacity
                        style={[styles.orderActionBtn, { backgroundColor: '#dcfce7' }]}
                        onPress={() => handleUpdateOrderStatus(order.id, 'processing')}
                      >
                        <CheckCircle size={16} color="#10b981" />
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.orderActionBtn, { backgroundColor: '#fee2e2' }]}
                        onPress={() => handleUpdateOrderStatus(order.id, 'cancelled')}
                      >
                        <XCircle size={16} color="#ef4444" />
                      </TouchableOpacity>
                    </View>
                  )}

                  {order.status === 'processing' && (
                    <TouchableOpacity
                      style={[styles.completeBtn]}
                      onPress={() => handleUpdateOrderStatus(order.id, 'completed')}
                    >
                      <Text style={styles.completeBtnText}>Hoàn thành</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            ))}

            {orders.length === 0 && !isLoading && (
              <View style={styles.emptyState}>
                <AlertCircle size={48} color={Colors.light.textSecondary} />
                <Text style={styles.emptyText}>Chưa có đơn hàng nào</Text>
              </View>
            )}
          </View>
        )}
      </ScrollView>

      <Modal
        visible={orderModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setOrderModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{selectedService?.name}</Text>
              <TouchableOpacity onPress={() => setOrderModalVisible(false)}>
                <X size={24} color={Colors.light.text} />
              </TouchableOpacity>
            </View>
            <Text style={styles.modalDescription}>{selectedService?.description}</Text>
            <Text style={styles.modalPrice}>
              Giá: {formatCurrency(selectedService?.price || 0)}
            </Text>
            <TouchableOpacity
              style={styles.orderButton}
              onPress={() => {
                Alert.alert('Thông báo', 'Tính năng đặt dịch vụ sẽ được cập nhật sau');
                setOrderModalVisible(false);
              }}
            >
              <Text style={styles.orderButtonText}>Đặt dịch vụ</Text>
            </TouchableOpacity>
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
    color: '#7c3aed',
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
  categoriesContainer: {
    marginBottom: 16,
  },
  categoriesContent: {
    gap: 8,
  },
  categoryChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  categoryChipActive: {
    backgroundColor: '#7c3aed',
    borderColor: '#7c3aed',
  },
  categoryChipText: {
    fontSize: 13,
    fontWeight: '500' as const,
    color: Colors.light.textSecondary,
  },
  categoryChipTextActive: {
    color: '#fff',
  },
  servicesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  serviceCard: {
    width: '48%',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  serviceIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  serviceName: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.light.text,
    marginBottom: 4,
  },
  servicePrice: {
    fontSize: 15,
    fontWeight: '700' as const,
    color: '#7c3aed',
  },
  ordersContainer: {
    gap: 12,
  },
  orderCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  orderRoomBadge: {
    backgroundColor: '#7c3aed',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  orderRoomText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600' as const,
  },
  orderStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 6,
  },
  orderStatusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  orderStatusText: {
    fontSize: 12,
    fontWeight: '500' as const,
  },
  orderBody: {
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
    paddingBottom: 12,
    marginBottom: 12,
  },
  orderServiceName: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.light.text,
  },
  orderGuestName: {
    fontSize: 13,
    color: Colors.light.textSecondary,
    marginTop: 2,
  },
  orderDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  orderQuantity: {
    fontSize: 13,
    color: Colors.light.textSecondary,
  },
  orderPrice: {
    fontSize: 15,
    fontWeight: '700' as const,
    color: '#7c3aed',
  },
  orderFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  orderTime: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  orderTimeText: {
    fontSize: 12,
    color: Colors.light.textSecondary,
  },
  orderActions: {
    flexDirection: 'row',
    gap: 8,
  },
  orderActionBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  completeBtn: {
    backgroundColor: '#10b981',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  completeBtnText: {
    color: '#fff',
    fontSize: 13,
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
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: Colors.light.text,
  },
  modalDescription: {
    fontSize: 14,
    color: Colors.light.textSecondary,
    marginBottom: 12,
  },
  modalPrice: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: '#7c3aed',
    marginBottom: 20,
  },
  orderButton: {
    backgroundColor: '#7c3aed',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  orderButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600' as const,
  },
});
