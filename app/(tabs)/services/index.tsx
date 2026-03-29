import React, { useState, useMemo, useEffect } from 'react';
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
  Switch,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Utensils,
  Car,
  Heart,
  Wine,
  Coffee,
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
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { servicesApi } from '@/services/api';
import { Service, ServiceOrder } from '@/types/hotel';

const SERVICE_ICONS: Record<string, React.ComponentType<{ size: number; color: string }>> = {
  room_service: Coffee,
  food: Utensils,
  beverage: Wine,
  spa: Heart,
  transport: Car,
  custom: Package,
};

const SERVICE_CATEGORY_OPTIONS = [
  { id: 'room_service', name: 'Dịch vụ phòng' },
  { id: 'food', name: 'Đồ ăn' },
  { id: 'beverage', name: 'Đồ uống' },
  { id: 'spa', name: 'Spa/Massage' },
  { id: 'transport', name: 'Vận chuyển' },
  { id: 'custom', name: 'Khác' },
];

const CATEGORY_FILTERS = [{ id: 'all', name: 'Tất cả' }, ...SERVICE_CATEGORY_OPTIONS];

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
  const { selectedHotelId, hotels, selectHotel, canSelectMultipleHotels, isLoading: hotelsLoading } = useHotel();
  const { user } = useAuth();
  const { isDark, colors } = useTheme();
  const [activeTab, setActiveTab] = useState<'services' | 'orders'>('services');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [serviceModalVisible, setServiceModalVisible] = useState(false);
  const [serviceModalMode, setServiceModalMode] = useState<'create' | 'edit' | 'view'>('view');
  const [hotelModalVisible, setHotelModalVisible] = useState(false);
  const [hotelPickerMode, setHotelPickerMode] = useState<'filter' | 'form'>('filter');
  const [serviceForm, setServiceForm] = useState({
    hotelId: selectedHotelId || '',
    name: '',
    description: '',
    price: '',
    category: 'custom',
    image: '',
    isActive: true,
    currency: 'VND',
    isCustom: false,
    costPrice: '',
    importQuantity: '',
    salesQuantity: '',
  });

  const { data: services = [], isLoading: servicesLoading, refetch: refetchServices } = useQuery({
    queryKey: ['services', selectedHotelId],
    queryFn: () => servicesApi.getAll(selectedHotelId || undefined),
    enabled: !canSelectMultipleHotels || !!selectedHotelId,
  });

  const { data: orders = [], isLoading: ordersLoading, refetch: refetchOrders } = useQuery({
    queryKey: ['serviceOrders', selectedHotelId],
    queryFn: () => servicesApi.getOrders(selectedHotelId || undefined),
    enabled: !canSelectMultipleHotels || !!selectedHotelId,
  });

  const updateOrderMutation = useMutation({
    mutationFn: ({ orderId, status }: { orderId: string; status: ServiceOrder['status'] }) =>
      servicesApi.updateOrderStatus(orderId, status),
    onSuccess: result => {
      if (!result) {
        Alert.alert('Thông báo', 'Không thể cập nhật trạng thái đơn hàng');
        return;
      }
      queryClient.invalidateQueries({ queryKey: ['serviceOrders'] });
      Alert.alert('Thông báo', 'Đã cập nhật trạng thái đơn hàng');
    },
    onError: () => {
      Alert.alert('Thông báo', 'Không thể cập nhật trạng thái đơn hàng');
    },
  });

  const createServiceMutation = useMutation({
    mutationFn: (payload: Omit<Service, 'id'>) => servicesApi.create(payload),
    onSuccess: result => {
      if (!result) {
        Alert.alert('Thông báo', 'Không thể thêm dịch vụ');
        return;
      }
      queryClient.invalidateQueries({ queryKey: ['services'] });
      setServiceModalVisible(false);
      Alert.alert('Thông báo', 'Đã thêm dịch vụ');
    },
    onError: () => {
      Alert.alert('Thông báo', 'Không thể thêm dịch vụ');
    },
  });

  const updateServiceMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<Service> }) =>
      servicesApi.update(id, payload),
    onSuccess: result => {
      if (!result) {
        Alert.alert('Thông báo', 'Không thể cập nhật dịch vụ');
        return;
      }
      queryClient.invalidateQueries({ queryKey: ['services'] });
      setServiceModalVisible(false);
      Alert.alert('Thông báo', 'Đã cập nhật dịch vụ');
    },
    onError: () => {
      Alert.alert('Thông báo', 'Không thể cập nhật dịch vụ');
    },
  });

  const deleteServiceMutation = useMutation({
    mutationFn: (id: string) => servicesApi.delete(id),
    onSuccess: result => {
      if (!result) {
        Alert.alert('Thông báo', 'Không thể xóa dịch vụ');
        return;
      }
      queryClient.invalidateQueries({ queryKey: ['services'] });
      setServiceModalVisible(false);
      Alert.alert('Thông báo', 'Đã xóa dịch vụ');
    },
    onError: () => {
      Alert.alert('Thông báo', 'Không thể xóa dịch vụ');
    },
  });

  const isLoading = servicesLoading || ordersLoading;

  const filteredServices = useMemo(() => {
    return services.filter(service => {
      const matchesCategory = selectedCategory === 'all' || service.category === selectedCategory;
      const matchesSearch = service.name.toLowerCase().includes(searchQuery.trim().toLowerCase());
      const matchesStatus =
        statusFilter === 'all' ||
        (statusFilter === 'active' ? service.isActive : !service.isActive);
      return matchesCategory && matchesSearch && matchesStatus;
    });
  }, [services, selectedCategory, searchQuery, statusFilter]);

  const categoryLabelMap = useMemo(() => {
    const map: Record<string, string> = {};
    SERVICE_CATEGORY_OPTIONS.forEach(option => {
      map[option.id] = option.name;
    });
    return map;
  }, []);

  const formatCurrency = (amount: number, currency?: string) => {
    const resolvedCurrency = currency || 'VND';
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: resolvedCurrency,
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

  const canManageServices =
    user?.role === 'superadmin' ||
    user?.role === 'admin' ||
    user?.role === 'business' ||
    user?.role === 'hotel_manager';

  const isHotelManager = user?.role === 'hotel_manager';

  useEffect(() => {
    if (serviceModalMode === 'create') {
      setServiceForm(prev => ({
        ...prev,
        hotelId: selectedHotelId || prev.hotelId,
      }));
    }
  }, [selectedHotelId, serviceModalMode]);

  const resetServiceForm = (hotelId?: string | null) => {
    setServiceForm({
      hotelId: hotelId || '',
      name: '',
      description: '',
      price: '',
      category: 'custom',
      image: '',
      isActive: true,
      currency: 'VND',
      isCustom: false,
      costPrice: '',
      importQuantity: '',
      salesQuantity: '',
    });
  };

  const setFormFromService = (service: Service) => {
    setServiceForm({
      hotelId: service.hotelId || selectedHotelId || '',
      name: service.name || '',
      description: service.description || '',
      price: String(service.price ?? 0),
      category: service.category || 'custom',
      image: service.image || '',
      isActive: service.isActive ?? true,
      currency: service.currency || 'VND',
      isCustom: service.isCustom ?? false,
      costPrice: String(service.costPrice ?? 0),
      importQuantity: String(service.importQuantity ?? 0),
      salesQuantity: String(service.salesQuantity ?? 0),
    });
  };

  const openCreateModal = () => {
    if (!canManageServices) {
      Alert.alert('Thông báo', 'Bạn không có quyền thực hiện thao tác này');
      return;
    }
    if (!selectedHotelId && canSelectMultipleHotels) {
      Alert.alert('Thông báo', 'Vui lòng chọn khách sạn trước');
      return;
    }
    resetServiceForm(selectedHotelId);
    setSelectedService(null);
    setServiceModalMode('create');
    setServiceModalVisible(true);
  };

  const openServiceModal = (service: Service) => {
    setSelectedService(service);
    setFormFromService(service);
    if (canManageServices) {
      setServiceModalMode('edit');
    } else {
      setServiceModalMode('view');
    }
    setServiceModalVisible(true);
  };

  const handleSaveService = () => {
    const priceValue = Number(serviceForm.price || 0);
    if (!serviceForm.hotelId) {
      Alert.alert('Thông báo', 'Vui lòng chọn khách sạn');
      return;
    }
    if (!serviceForm.name.trim()) {
      Alert.alert('Thông báo', 'Vui lòng nhập tên dịch vụ');
      return;
    }
    if (Number.isNaN(priceValue) || priceValue < 0) {
      Alert.alert('Thông báo', 'Vui lòng nhập giá hợp lệ');
      return;
    }
    if (!serviceForm.category) {
      Alert.alert('Thông báo', 'Vui lòng chọn danh mục');
      return;
    }

    const payload: Omit<Service, 'id'> = {
      hotelId: serviceForm.hotelId,
      name: serviceForm.name.trim(),
      description: serviceForm.description.trim(),
      price: priceValue,
      category: serviceForm.category,
      image: serviceForm.image || undefined,
      isActive: serviceForm.isActive,
      currency: serviceForm.currency || 'VND',
      isCustom: serviceForm.isCustom,
      costPrice: Number(serviceForm.costPrice || 0),
      importQuantity: Number(serviceForm.importQuantity || 0),
      salesQuantity: Number(serviceForm.salesQuantity || 0),
      icon: selectedService?.icon,
    };

    if (serviceModalMode === 'edit' && selectedService) {
      updateServiceMutation.mutate({ id: selectedService.id, payload });
    } else if (serviceModalMode === 'create') {
      createServiceMutation.mutate(payload);
    }
  };

  const handleDeleteService = () => {
    if (!selectedService) return;
    Alert.alert('Xác nhận', 'Bạn có chắc muốn xóa dịch vụ này?', [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Xóa',
        style: 'destructive',
        onPress: () => deleteServiceMutation.mutate(selectedService.id),
      },
    ]);
  };

  const handleSelectHotel = (hotelId: string) => {
    if (hotelPickerMode === 'filter') {
      selectHotel(hotelId);
    } else {
      setServiceForm(prev => ({ ...prev, hotelId }));
    }
    setHotelModalVisible(false);
  };

  const pendingOrders = orders.filter(o => o.status === 'pending').length;
  const processingOrders = orders.filter(o => o.status === 'processing').length;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <LinearGradient
        colors={isDark ? ['#0f172a', '#1e293b'] : ['#0f766e', '#14b8a6']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.header, { paddingTop: insets.top + 12 }]}
      >
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Dịch vụ</Text>
          {canManageServices && (
            <TouchableOpacity style={styles.addButton} onPress={openCreateModal}>
              <Plus size={20} color="#fff" />
            </TouchableOpacity>
          )}
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
            style={[styles.tab, activeTab === 'services' && [styles.tabActive, { backgroundColor: colors.cardBackground }]]}
            onPress={() => setActiveTab('services')}
          >
            <Text style={[styles.tabText, activeTab === 'services' && [styles.tabTextActive, { color: colors.tint }]]}>
              Danh sách
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'orders' && [styles.tabActive, { backgroundColor: colors.cardBackground }]]}
            onPress={() => setActiveTab('orders')}
          >
            <Text style={[styles.tabText, activeTab === 'orders' && [styles.tabTextActive, { color: colors.tint }]]}>
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
            {canSelectMultipleHotels && (
              <View style={styles.hotelSelectorRow}>
                <TouchableOpacity
                  style={[styles.hotelSelector, { backgroundColor: colors.tint }]}
                  onPress={() => {
                    setHotelPickerMode('filter');
                    setHotelModalVisible(true);
                  }}
                >
                  <Text style={styles.hotelSelectorText}>
                    {selectedHotelId
                      ? hotels.find(hotel => hotel.id === selectedHotelId)?.name || 'Chọn khách sạn'
                      : 'Chọn khách sạn'}
                  </Text>
                  {hotelsLoading ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : null}
                </TouchableOpacity>
              </View>
            )}

            <View style={styles.searchContainer}>
              <View style={[styles.searchBox, { backgroundColor: colors.inputBackground }]}>
                <Search size={18} color={colors.textSecondary} />
                <TextInput
                  style={[styles.searchInput, { color: colors.text }]}
                  placeholder="Tìm kiếm dịch vụ..."
                  placeholderTextColor={colors.textSecondary}
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
              {CATEGORY_FILTERS.map(category => (
                <TouchableOpacity
                  key={category.id}
                  style={[
                    styles.categoryChip,
                    { backgroundColor: colors.cardBackground, borderColor: colors.border },
                    selectedCategory === category.id && [styles.categoryChipActive, { backgroundColor: colors.tint, borderColor: colors.tint }],
                  ]}
                  onPress={() => setSelectedCategory(category.id)}
                >
                  <Text
                    style={[
                      styles.categoryChipText,
                      { color: colors.textSecondary },
                      selectedCategory === category.id && styles.categoryChipTextActive,
                    ]}
                  >
                    {category.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <View style={styles.statusFilterRow}>
              {[
                { id: 'all', name: 'Tất cả' },
                { id: 'active', name: 'Hoạt động' },
                { id: 'inactive', name: 'Ngừng' },
              ].map(status => (
                <TouchableOpacity
                  key={status.id}
                  style={[
                    styles.statusChip,
                    { backgroundColor: colors.cardBackground, borderColor: colors.border },
                    statusFilter === status.id && [styles.statusChipActive, { backgroundColor: isDark ? '#1a3a36' : '#ede9fe', borderColor: colors.tint }],
                  ]}
                  onPress={() => setStatusFilter(status.id as 'all' | 'active' | 'inactive')}
                >
                  <Text
                    style={[
                      styles.statusChipText,
                      { color: colors.textSecondary },
                      statusFilter === status.id && [styles.statusChipTextActive, { color: colors.tint }],
                    ]}
                  >
                    {status.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.servicesGrid}>
              {filteredServices.map(service => {
                const IconComponent = getServiceIcon(service.category);
                return (
                  <TouchableOpacity
                    key={service.id}
                    style={[styles.serviceCard, { backgroundColor: colors.cardBackground }]}
                    onPress={() => openServiceModal(service)}
                  >
                    <View style={[styles.serviceIconContainer, { backgroundColor: isDark ? '#2d1b69' : '#f3e8ff' }]}>
                      <IconComponent size={24} color={isDark ? '#a78bfa' : '#7c3aed'} />
                    </View>
                    <Text style={[styles.serviceName, { color: colors.text }]} numberOfLines={2}>
                      {service.name}
                    </Text>
                    <Text style={[styles.serviceCategory, { color: colors.textSecondary }]}>
                      {categoryLabelMap[service.category] || 'Khác'}
                    </Text>
                    <Text style={[styles.servicePrice, { color: colors.tint }]}>
                      {formatCurrency(service.price, service.currency)}
                    </Text>
                    {!service.isActive && (
                      <View style={styles.serviceInactiveBadge}>
                        <Text style={styles.serviceInactiveText}>Ngừng hoạt động</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>

            {filteredServices.length === 0 && !isLoading && (
              <View style={styles.emptyState}>
                <Package size={48} color={colors.textSecondary} />
                <Text style={[styles.emptyText, { color: colors.textSecondary }]}>Không có dịch vụ nào</Text>
              </View>
            )}
          </>
        ) : (
          <View style={styles.ordersContainer}>
            {orders.map(order => (
              <View key={order.id} style={[styles.orderCard, { backgroundColor: colors.cardBackground }]}>
                <View style={styles.orderHeader}>
                  <View style={[styles.orderRoomBadge, { backgroundColor: colors.tint }]}>
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

                <View style={[styles.orderBody, { borderBottomColor: colors.border }]}>
                  <Text style={[styles.orderServiceName, { color: colors.text }]}>{order.serviceName}</Text>
                  <Text style={[styles.orderGuestName, { color: colors.textSecondary }]}>{order.guestName}</Text>
                  <View style={styles.orderDetails}>
                    <Text style={[styles.orderQuantity, { color: colors.textSecondary }]}>SL: {order.quantity}</Text>
                    <Text style={[styles.orderPrice, { color: colors.tint }]}>{formatCurrency(order.totalPrice)}</Text>
                  </View>
                </View>

                <View style={styles.orderFooter}>
                  <View style={styles.orderTime}>
                    <Clock size={14} color={colors.textSecondary} />
                    <Text style={[styles.orderTimeText, { color: colors.textSecondary }]}>
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
                <AlertCircle size={48} color={colors.textSecondary} />
                <Text style={[styles.emptyText, { color: colors.textSecondary }]}>Chưa có đơn hàng nào</Text>
              </View>
            )}
          </View>
        )}
      </ScrollView>

      <Modal
        visible={serviceModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setServiceModalVisible(false)}
      >
        <View style={[styles.modalOverlay, { backgroundColor: colors.overlay }]}>
          <View style={[styles.serviceModalContent, { backgroundColor: colors.cardBackground }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                {serviceModalMode === 'create'
                  ? 'Thêm dịch vụ'
                  : serviceModalMode === 'edit'
                    ? 'Cập nhật dịch vụ'
                    : 'Chi tiết dịch vụ'}
              </Text>
              <TouchableOpacity onPress={() => setServiceModalVisible(false)}>
                <X size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              <View style={styles.formField}>
                <Text style={[styles.formLabel, { color: colors.textSecondary }]}>Khách sạn</Text>
                {canSelectMultipleHotels ? (
                  <TouchableOpacity
                    style={[styles.selectInput, { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder }]}
                    onPress={() => {
                      if (serviceModalMode === 'view' || isHotelManager) return;
                      setHotelPickerMode('form');
                      setHotelModalVisible(true);
                    }}
                    disabled={serviceModalMode === 'view' || isHotelManager}
                  >
                    <Text style={[styles.selectInputText, { color: colors.text }]}>
                      {serviceForm.hotelId
                        ? hotels.find(hotel => hotel.id === serviceForm.hotelId)?.name || 'Chọn khách sạn'
                        : 'Chọn khách sạn'}
                    </Text>
                  </TouchableOpacity>
                ) : (
                  <View style={[styles.readonlyInput, { backgroundColor: isDark ? '#334155' : '#f3f4f6', borderColor: colors.inputBorder }]}>
                    <Text style={[styles.readonlyText, { color: colors.textSecondary }]}>
                      {hotels.find(hotel => hotel.id === (serviceForm.hotelId || selectedHotelId))?.name || 'Chọn khách sạn'}
                    </Text>
                  </View>
                )}
              </View>

              <View style={styles.formField}>
                <Text style={[styles.formLabel, { color: colors.textSecondary }]}>Tên dịch vụ</Text>
                <TextInput
                  style={[styles.textInput, { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder, color: colors.text }]}
                  value={serviceForm.name}
                  onChangeText={value => setServiceForm(prev => ({ ...prev, name: value }))}
                  placeholder="Nhập tên dịch vụ"
                  editable={serviceModalMode !== 'view'}
                />
              </View>

              <View style={styles.formRow}>
                <View style={[styles.formField, styles.formHalf]}>
                  <Text style={[styles.formLabel, { color: colors.textSecondary }]}>Giá bán</Text>
                  <TextInput
                    style={[styles.textInput, { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder, color: colors.text }]}
                    value={serviceForm.price}
                    onChangeText={value => setServiceForm(prev => ({ ...prev, price: value }))}
                    keyboardType="numeric"
                    placeholder="0"
                    editable={serviceModalMode !== 'view'}
                  />
                </View>
                <View style={[styles.formField, styles.formHalf]}>
                  <Text style={[styles.formLabel, { color: colors.textSecondary }]}>Đơn vị tiền</Text>
                  <TextInput
                    style={[styles.textInput, { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder, color: colors.text }]}
                    value={serviceForm.currency}
                    onChangeText={value => setServiceForm(prev => ({ ...prev, currency: value }))}
                    placeholder="VND"
                    editable={serviceModalMode !== 'view'}
                  />
                </View>
              </View>

              <View style={styles.formField}>
                <Text style={[styles.formLabel, { color: colors.textSecondary }]}>Danh mục</Text>
                <View style={styles.categoryOptions}>
                  {SERVICE_CATEGORY_OPTIONS.map(option => (
                    <TouchableOpacity
                      key={option.id}
                      style={[
                        styles.categoryOption,
                        { backgroundColor: colors.cardBackground, borderColor: colors.border },
                        serviceForm.category === option.id && [styles.categoryOptionActive, { backgroundColor: colors.tint, borderColor: colors.tint }],
                      ]}
                      onPress={() => {
                        if (serviceModalMode === 'view') return;
                        setServiceForm(prev => ({ ...prev, category: option.id }));
                      }}
                    >
                      <Text
                        style={[
                          styles.categoryOptionText,
                          { color: colors.textSecondary },
                          serviceForm.category === option.id && styles.categoryOptionTextActive,
                        ]}
                      >
                        {option.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.formField}>
                <Text style={[styles.formLabel, { color: colors.textSecondary }]}>Mô tả</Text>
                <TextInput
                  style={[styles.textInput, styles.textArea, { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder, color: colors.text }]}
                  value={serviceForm.description}
                  onChangeText={value => setServiceForm(prev => ({ ...prev, description: value }))}
                  placeholder="Mô tả chi tiết"
                  multiline
                  numberOfLines={3}
                  editable={serviceModalMode !== 'view'}
                />
              </View>

              <View style={styles.formField}>
                <Text style={[styles.formLabel, { color: colors.textSecondary }]}>Hình ảnh (URL)</Text>
                <TextInput
                  style={[styles.textInput, { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder, color: colors.text }]}
                  value={serviceForm.image}
                  onChangeText={value => setServiceForm(prev => ({ ...prev, image: value }))}
                  placeholder="https://"
                  editable={serviceModalMode !== 'view'}
                />
              </View>

              <View style={styles.formRow}>
                <View style={[styles.formField, styles.formHalf]}>
                  <Text style={[styles.formLabel, { color: colors.textSecondary }]}>Giá vốn</Text>
                  <TextInput
                    style={[styles.textInput, { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder, color: colors.text }]}
                    value={serviceForm.costPrice}
                    onChangeText={value => setServiceForm(prev => ({ ...prev, costPrice: value }))}
                    keyboardType="numeric"
                    placeholder="0"
                    editable={serviceModalMode !== 'view'}
                  />
                </View>
                <View style={[styles.formField, styles.formHalf]}>
                  <Text style={[styles.formLabel, { color: colors.textSecondary }]}>Nhập kho</Text>
                  <TextInput
                    style={[styles.textInput, { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder, color: colors.text }]}
                    value={serviceForm.importQuantity}
                    onChangeText={value => setServiceForm(prev => ({ ...prev, importQuantity: value }))}
                    keyboardType="numeric"
                    placeholder="0"
                    editable={serviceModalMode !== 'view'}
                  />
                </View>
              </View>

              <View style={styles.formRow}>
                <View style={[styles.formField, styles.formHalf]}>
                  <Text style={[styles.formLabel, { color: colors.textSecondary }]}>Bán ra</Text>
                  <TextInput
                    style={[styles.textInput, { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder, color: colors.text }]}
                    value={serviceForm.salesQuantity}
                    onChangeText={value => setServiceForm(prev => ({ ...prev, salesQuantity: value }))}
                    keyboardType="numeric"
                    placeholder="0"
                    editable={serviceModalMode !== 'view'}
                  />
                </View>
                <View style={[styles.formField, styles.formHalf]}>
                  <Text style={[styles.formLabel, { color: colors.textSecondary }]}>Tùy chỉnh</Text>
                  <View style={styles.switchRow}>
                    <Switch
                      value={serviceForm.isCustom}
                      onValueChange={value => setServiceForm(prev => ({ ...prev, isCustom: value }))}
                      disabled={serviceModalMode === 'view'}
                      trackColor={{ false: colors.switchTrack, true: colors.tint }}
                      thumbColor="#fff"
                    />
                    <Text style={[styles.switchLabel, { color: colors.textSecondary }]}>{serviceForm.isCustom ? 'Có' : 'Không'}</Text>
                  </View>
                </View>
              </View>

              <View style={styles.formField}>
                <Text style={[styles.formLabel, { color: colors.textSecondary }]}>Trạng thái</Text>
                <View style={styles.switchRow}>
                  <Switch
                    value={serviceForm.isActive}
                    onValueChange={value => setServiceForm(prev => ({ ...prev, isActive: value }))}
                    disabled={serviceModalMode === 'view'}
                    trackColor={{ false: colors.switchTrack, true: colors.tint }}
                    thumbColor="#fff"
                  />
                  <Text style={[styles.switchLabel, { color: colors.textSecondary }]}>{serviceForm.isActive ? 'Hoạt động' : 'Không hoạt động'}</Text>
                </View>
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              {serviceModalMode === 'view' && canManageServices && (
                <TouchableOpacity
                  style={[styles.editButton, { backgroundColor: isDark ? '#1a3a36' : '#ede9fe' }]}
                  onPress={() => setServiceModalMode('edit')}
                >
                  <Text style={[styles.editButtonText, { color: colors.tint }]}>Chỉnh sửa</Text>
                </TouchableOpacity>
              )}
              {serviceModalMode !== 'view' && (
                <TouchableOpacity
                  style={[styles.saveButton, { backgroundColor: colors.tint }]}
                  onPress={handleSaveService}
                  disabled={createServiceMutation.isPending || updateServiceMutation.isPending}
                >
                  <Text style={styles.saveButtonText}>
                    {serviceModalMode === 'edit' ? 'Cập nhật' : 'Thêm mới'}
                  </Text>
                </TouchableOpacity>
              )}
              {serviceModalMode === 'edit' && (
                <TouchableOpacity style={styles.deleteButton} onPress={handleDeleteService}>
                  <Text style={styles.deleteButtonText}>Xóa</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={hotelModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setHotelModalVisible(false)}
      >
        <View style={[styles.modalOverlay, { backgroundColor: colors.overlay }]}>
          <View style={[styles.hotelModalContent, { backgroundColor: colors.cardBackground }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Chọn khách sạn</Text>
              <TouchableOpacity onPress={() => setHotelModalVisible(false)}>
                <X size={24} color={colors.text} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              {hotelsLoading ? (
                <View style={styles.hotelLoadingRow}>
                  <ActivityIndicator size="small" color={colors.tint} />
                  <Text style={[styles.hotelLoadingText, { color: colors.textSecondary }]}>Đang tải khách sạn...</Text>
                </View>
              ) : (
                hotels.map(hotel => (
                  <TouchableOpacity
                    key={hotel.id}
                    style={[
                      styles.hotelOption,
                      { borderColor: colors.border },
                      (hotelPickerMode === 'filter' ? selectedHotelId : serviceForm.hotelId) === hotel.id &&
                        [styles.hotelOptionSelected, { backgroundColor: isDark ? '#1a3a36' : '#ede9fe', borderColor: colors.tint }],
                    ]}
                    onPress={() => handleSelectHotel(hotel.id)}
                  >
                    <Text
                      style={[
                        styles.hotelOptionText,
                        { color: colors.text },
                        (hotelPickerMode === 'filter' ? selectedHotelId : serviceForm.hotelId) === hotel.id &&
                          [styles.hotelOptionTextSelected, { color: colors.tint }],
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
  hotelSelectorRow: {
    marginBottom: 16,
  },
  hotelSelector: {
    backgroundColor: '#7c3aed',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  hotelSelectorText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600' as const,
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
  statusFilterRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  statusChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  statusChipActive: {
    backgroundColor: '#ede9fe',
    borderColor: '#7c3aed',
  },
  statusChipText: {
    fontSize: 12,
    fontWeight: '500' as const,
    color: Colors.light.textSecondary,
  },
  statusChipTextActive: {
    color: '#7c3aed',
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
  serviceCategory: {
    fontSize: 12,
    color: Colors.light.textSecondary,
    marginBottom: 6,
  },
  servicePrice: {
    fontSize: 15,
    fontWeight: '700' as const,
    color: '#7c3aed',
  },
  serviceInactiveBadge: {
    marginTop: 8,
    alignSelf: 'flex-start',
    backgroundColor: '#fee2e2',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  serviceInactiveText: {
    fontSize: 11,
    color: '#b91c1c',
    fontWeight: '600' as const,
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
  serviceModalContent: {
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
  modalBody: {
    maxHeight: 520,
  },
  modalFooter: {
    marginTop: 16,
    flexDirection: 'row',
    gap: 12,
  },
  saveButton: {
    flex: 1,
    backgroundColor: '#7c3aed',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600' as const,
  },
  deleteButton: {
    backgroundColor: '#fee2e2',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: 'center',
  },
  deleteButtonText: {
    color: '#b91c1c',
    fontSize: 14,
    fontWeight: '600' as const,
  },
  editButton: {
    flex: 1,
    backgroundColor: '#ede9fe',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  editButtonText: {
    color: '#7c3aed',
    fontSize: 15,
    fontWeight: '600' as const,
  },
  formField: {
    marginBottom: 14,
  },
  formRow: {
    flexDirection: 'row',
    gap: 12,
  },
  formHalf: {
    flex: 1,
  },
  formLabel: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: Colors.light.textSecondary,
    marginBottom: 6,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: Colors.light.text,
    backgroundColor: '#fff',
  },
  textArea: {
    minHeight: 90,
    textAlignVertical: 'top',
  },
  selectInput: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: '#f9fafb',
  },
  selectInputText: {
    fontSize: 14,
    color: Colors.light.text,
  },
  readonlyInput: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: '#f3f4f6',
  },
  readonlyText: {
    fontSize: 14,
    color: Colors.light.textSecondary,
  },
  categoryOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  categoryOption: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  categoryOptionActive: {
    backgroundColor: '#7c3aed',
    borderColor: '#7c3aed',
  },
  categoryOptionText: {
    fontSize: 12,
    fontWeight: '500' as const,
    color: Colors.light.textSecondary,
  },
  categoryOptionTextActive: {
    color: '#fff',
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  switchLabel: {
    fontSize: 13,
    color: Colors.light.textSecondary,
  },
  hotelModalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
    maxHeight: '70%',
  },
  hotelOption: {
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    marginBottom: 10,
  },
  hotelOptionSelected: {
    backgroundColor: '#ede9fe',
    borderColor: '#7c3aed',
  },
  hotelOptionText: {
    fontSize: 14,
    color: Colors.light.text,
    fontWeight: '500' as const,
  },
  hotelOptionTextSelected: {
    color: '#7c3aed',
  },
  hotelLoadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 16,
  },
  hotelLoadingText: {
    fontSize: 14,
    color: Colors.light.textSecondary,
  },
});
