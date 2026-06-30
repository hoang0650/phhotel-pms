import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { roomsApi } from '@/services/api';
import { useHotel } from '@/contexts/HotelContext';
import { useLanguage } from '@/contexts/LanguageContext';

interface PaymentRecord {
  id: string;
  event: string;
  type: string;
  roomNumber?: string;
  guestName?: string;
  checkInTime?: string;
  checkOutTime?: string;
  checkoutTime?: string;
  roomAmount?: number;
  serviceAmount?: number;
  additionalCharges?: number;
  discount?: number;
  advancePayment?: number;
  totalAmount?: number;
  paymentStatus?: string;
  paymentMethod?: 'cash' | 'card' | 'bank_transfer' | string;
  advancePaymentMethod?: 'cash' | 'card' | 'bank_transfer' | string;
  payment?: {
    status?: string;
    paymentStatus?: string;
    method?: 'cash' | 'card' | 'bank_transfer' | string;
  };
}

export default function PaymentHistoryScreen() {
  const { selectedHotelId } = useHotel();
  const { t } = useLanguage();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'paid' | 'pending' | 'unpaid'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);

  const { data: roomEvents = [], isLoading } = useQuery({
    queryKey: ['roomEvents', selectedHotelId],
    queryFn: () => selectedHotelId ? roomsApi.getEventsByHotel(selectedHotelId, { types: ['checkout'], limit: 200 }) : Promise.resolve([]),
  });

  const payments: PaymentRecord[] = useMemo(() => {
    return roomEvents.map((e: any) => ({
      id: e.id,
      event: e.type,
      type: e.type,
      roomNumber: e.roomNumber,
      guestName: e.guestName,
      checkInTime: e.checkinTime,
      checkOutTime: e.checkoutTime,
      checkoutTime: e.checkoutTime,
      totalAmount: typeof e.totalAmount === 'number' ? e.totalAmount : undefined,
      advancePayment: typeof e.advancePayment === 'number' ? e.advancePayment : undefined,
      paymentStatus: e.paymentStatus || e.payment?.status || e.payment?.paymentStatus,
      paymentMethod: e.paymentMethod || e.payment?.method,
      advancePaymentMethod: e.advancePaymentMethod,
      payment: e.payment,
    }));
  }, [roomEvents]);

  const normalizePaymentStatus = (item: PaymentRecord) => {
    const raw = (item.paymentStatus || item.payment?.status || item.payment?.paymentStatus || 'paid').toLowerCase();
    const map: Record<string, 'paid' | 'pending' | 'unpaid' | 'refunded' | 'cancelled'> = {
      completed: 'paid',
      success: 'paid',
      paid: 'paid',
      processing: 'pending',
      pending: 'pending',
      waiting: 'pending',
      unpaid: 'unpaid',
      failed: 'unpaid',
      error: 'unpaid',
      declined: 'unpaid',
      refunded: 'refunded',
      cancel: 'cancelled',
      cancelled: 'cancelled',
      canceled: 'cancelled',
    };
    return map[raw] || 'paid';
  };

  const getPaymentStatusLabel = (status: 'paid' | 'pending' | 'unpaid' | 'refunded' | 'cancelled') => {
    if (status === 'paid') return 'Đã thanh toán';
    if (status === 'pending') return 'Chờ thanh toán';
    if (status === 'refunded') return 'Đã hoàn tiền';
    if (status === 'cancelled') return 'Đã hủy';
    return 'Đã thanh toán';
  };

  const getStatusBadgeStyle = (status: 'paid' | 'pending' | 'unpaid' | 'refunded' | 'cancelled') => {
    if (status === 'paid') return styles.paidBadge;
    if (status === 'pending') return styles.pendingBadge;
    if (status === 'refunded') return styles.refundedBadge;
    if (status === 'cancelled') return styles.cancelledBadge;
    return styles.paidBadge;
  };

  // Filter logic based on hotelapp table component
  const paidData = useMemo(() => {
    if (!payments) return [];
    return payments
      .filter(item => {
        const excludedEvents = ['cleaning', 'maintenance', 'check-in'];
        const eventType = (item.event || item.type || '').toLowerCase();
        return !excludedEvents.includes(eventType) && (item.checkOutTime || item.checkoutTime);
      })
      .map(item => {
        const roomAmount = item.roomAmount || 0;
        const serviceAmount = item.serviceAmount || 0;
        const additionalCharges = item.additionalCharges || 0;
        const discount = item.discount || 0;
        const advancePayment = item.advancePayment || 0;
        const calculatedTotal = (item.totalAmount ?? (roomAmount + serviceAmount + additionalCharges - discount - advancePayment));
        return {
          ...item,
          totalAmount: calculatedTotal,
          roomTotal: item.roomAmount,
          servicesTotal: item.serviceAmount,
        };
      });
  }, [payments]);

  const statusFilteredData = useMemo(() => {
    if (statusFilter === 'all') return paidData;
    return paidData.filter(item => normalizePaymentStatus(item) === statusFilter);
  }, [paidData, statusFilter]);

  const filteredData = useMemo(() => {
    if (!searchQuery) return statusFilteredData;
    return statusFilteredData.filter(item =>
      item.roomNumber?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.guestName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.event?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [statusFilteredData, searchQuery]);

  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    return filteredData.slice(startIndex, endIndex);
  }, [filteredData, currentPage, pageSize]);

  const totalPages = Math.ceil(filteredData.length / pageSize);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(amount || 0);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>{t('loadingData')}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{t('paymentHistory')}</Text>
        <View style={styles.headerStats}>
          <Text style={styles.statText}>Tổng: {filteredData.length} giao dịch</Text>
        </View>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#8E8E93" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Tìm kiếm theo phòng, tên khách, loại giao dịch..."
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      <View style={styles.statusFilterContainer}>
        {[
          { key: 'all', label: 'Tất cả' },
          { key: 'paid', label: 'Đã thanh toán' },
          { key: 'pending', label: 'Chờ thanh toán' },
          { key: 'unpaid', label: 'Chưa thanh toán' },
        ].map((item) => {
          const isActive = statusFilter === item.key;
          return (
            <TouchableOpacity
              key={item.key}
              style={[styles.statusFilterChip, isActive && styles.statusFilterChipActive]}
              onPress={() => {
                setStatusFilter(item.key as 'all' | 'paid' | 'pending' | 'unpaid');
                setCurrentPage(1);
              }}
            >
              <Text style={[styles.statusFilterText, isActive && styles.statusFilterTextActive]}>
                {item.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Payment List */}
      <ScrollView style={styles.paymentList}>
        {paginatedData.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="time-outline" size={64} color="#C7C7CC" />
            <Text style={styles.emptyText}>{t('noServices')}</Text>
          </View>
        ) : (
          paginatedData.map((item) => (
            <View key={item.id} style={styles.paymentCard}>
              <View style={styles.paymentHeader}>
                <View style={styles.roomInfo}>
                  <Text style={styles.roomNumber}>Phòng {item.roomNumber}</Text>
                  <Text style={styles.guestName}>{item.guestName}</Text>
                </View>
                <View style={styles.statusContainer}>
                  {(() => {
                    const s = normalizePaymentStatus(item);
                    return (
                      <View style={[styles.statusBadge, getStatusBadgeStyle(s)]}>
                        <Text style={[styles.statusText]}>
                          {getPaymentStatusLabel(s)}
                        </Text>
                      </View>
                    );
                  })()}
                </View>
              </View>
              
              <View style={styles.paymentDetails}>
                <View style={styles.amountRow}>
                  <Text style={styles.amountLabel}>Tiền phòng:</Text>
                  <Text style={styles.amountValue}>{formatCurrency(item.roomTotal || 0)}</Text>
                </View>
                {typeof item.servicesTotal === 'number' && item.servicesTotal > 0 && (
                  <View style={styles.amountRow}>
                    <Text style={styles.amountLabel}>Dịch vụ:</Text>
                    <Text style={styles.amountValue}>{formatCurrency(item.servicesTotal)}</Text>
                  </View>
                )}
                {typeof item.additionalCharges === 'number' && item.additionalCharges > 0 && (
                  <View style={styles.amountRow}>
                    <Text style={styles.amountLabel}>Phụ thu:</Text>
                    <Text style={styles.amountValue}>{formatCurrency(item.additionalCharges)}</Text>
                  </View>
                )}
                {typeof item.discount === 'number' && item.discount > 0 && (
                  <View style={styles.amountRow}>
                    <Text style={styles.amountLabel}>Giảm giá:</Text>
                    <Text style={[styles.amountValue, styles.discountValue]}>-{formatCurrency(item.discount)}</Text>
                  </View>
                )}
                {typeof item.advancePayment === 'number' && item.advancePayment > 0 && (
                  <View style={styles.amountRow}>
                    <Text style={styles.amountLabel}>Đã cọc:</Text>
                    <Text style={[styles.amountValue, styles.advanceValue]}>-{formatCurrency(item.advancePayment)}</Text>
                  </View>
                )}
                <View style={[styles.amountRow, styles.totalRow]}>
                  <Text style={styles.totalLabel}>Tổng cộng:</Text>
                  <Text style={styles.totalValue}>{formatCurrency(item.totalAmount || 0)}</Text>
                </View>
              </View>
              
              <View style={styles.paymentFooter}>
                <Text style={styles.paymentTime}>
                  {formatDate(item.checkOutTime || item.checkoutTime || '')}
                </Text>
                <Text style={styles.eventType}>{item.event}</Text>
              </View>
            </View>
          ))
        )}
      </ScrollView>

      {/* Pagination */}
      {totalPages > 1 && (
        <View style={styles.paginationContainer}>
          <TouchableOpacity
            style={[styles.pageButton, currentPage === 1 && styles.disabledButton]}
            onPress={() => setCurrentPage(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1}
          >
            <Ionicons name="chevron-back" size={20} color="#007AFF" />
          </TouchableOpacity>
          
          <Text style={styles.pageInfo}>
            {currentPage} / {totalPages}
          </Text>
          
          <TouchableOpacity
            style={[styles.pageButton, currentPage === totalPages && styles.disabledButton]}
            onPress={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage === totalPages}
          >
            <Ionicons name="chevron-forward" size={20} color="#007AFF" />
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F2F2F7',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#8E8E93',
  },
  header: {
    backgroundColor: '#FFF',
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 5,
  },
  headerStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statText: {
    fontSize: 14,
    color: '#8E8E93',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    margin: 20,
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  statusFilterContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingHorizontal: 20,
    marginBottom: 10,
  },
  statusFilterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  statusFilterChipActive: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  statusFilterText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#8E8E93',
  },
  statusFilterTextActive: {
    color: '#FFFFFF',
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#000',
  },
  paymentList: {
    flex: 1,
    paddingHorizontal: 20,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
  },
  emptyText: {
    fontSize: 18,
    color: '#8E8E93',
    marginTop: 10,
  },
  paymentCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  paymentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  roomInfo: {
    flex: 1,
  },
  roomNumber: {
    fontSize: 16,
    fontWeight: '600',
    color: '#007AFF',
  },
  guestName: {
    fontSize: 14,
    color: '#8E8E93',
    marginTop: 2,
  },
  statusContainer: {
    alignItems: 'flex-end',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  paidBadge: {
    backgroundColor: '#E8F5E8',
  },
  pendingBadge: {
    backgroundColor: '#E6F0FF',
  },
  unpaidBadge: {
    backgroundColor: '#FFF3E0',
  },
  refundedBadge: {
    backgroundColor: '#E6FFFB',
  },
  cancelledBadge: {
    backgroundColor: '#FFE6E6',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  paidText: {
    color: '#34C759',
  },
  unpaidText: {
    color: '#FF9500',
  },
  paymentDetails: {
    marginBottom: 12,
  },
  amountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  totalRow: {
    borderTopWidth: 1,
    borderTopColor: '#E5E5EA',
    paddingTop: 8,
    marginTop: 4,
  },
  amountLabel: {
    fontSize: 14,
    color: '#8E8E93',
  },
  amountValue: {
    fontSize: 14,
    color: '#000',
    fontWeight: '500',
  },
  discountValue: {
    color: '#34C759',
  },
  advanceValue: {
    color: '#007AFF',
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  totalValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000',
  },
  paymentFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  paymentTime: {
    fontSize: 12,
    color: '#8E8E93',
  },
  eventType: {
    fontSize: 12,
    color: '#007AFF',
    fontWeight: '500',
  },
  paginationContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 20,
    backgroundColor: '#FFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E5EA',
  },
  pageButton: {
    padding: 10,
    borderRadius: 8,
    backgroundColor: '#F2F2F7',
    marginHorizontal: 10,
  },
  disabledButton: {
    opacity: 0.5,
  },
  pageInfo: {
    fontSize: 16,
    color: '#000',
    fontWeight: '500',
  },
});
