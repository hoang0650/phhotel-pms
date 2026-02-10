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
  payment?: {
    status?: string;
    paymentStatus?: string;
  };
}

export default function PaymentHistoryScreen() {
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);

  // Mock data based on hotelapp table component logic
  const mockPayments: PaymentRecord[] = [
    {
      id: '1',
      event: 'check-out',
      type: 'payment',
      roomNumber: '101',
      guestName: 'Nguyễn Văn A',
      checkOutTime: '2024-01-15T10:30:00Z',
      checkoutTime: '2024-01-15T10:30:00Z',
      roomAmount: 500000,
      serviceAmount: 50000,
      additionalCharges: 0,
      discount: 0,
      advancePayment: 200000,
      totalAmount: 350000,
      paymentStatus: 'paid',
    },
    {
      id: '2',
      event: 'service',
      type: 'payment',
      roomNumber: '102',
      guestName: 'Trần Thị B',
      checkOutTime: '2024-01-15T14:20:00Z',
      checkoutTime: '2024-01-15T14:20:00Z',
      roomAmount: 800000,
      serviceAmount: 100000,
      additionalCharges: 50000,
      discount: 50000,
      advancePayment: 300000,
      totalAmount: 600000,
      paymentStatus: 'paid',
    },
    {
      id: '3',
      event: 'cleaning',
      type: 'service',
      roomNumber: '103',
      guestName: 'Lê Văn C',
      // This should be excluded from paidData
    },
  ];

  React.useEffect(() => {
    // Load payment history from API
    setTimeout(() => {
      setPayments(mockPayments);
      setLoading(false);
    }, 1000);
  }, []);

  // Filter logic based on hotelapp table component
  const paidData = useMemo(() => {
    if (!payments) return [];
    
    return payments.filter(item => {
      const excludedEvents = ['cleaning', 'maintenance', 'check-in'];
      const eventType = (item.event || item.type || '').toLowerCase();
      
      // Exclude certain events and require checkout time
      return !excludedEvents.includes(eventType) && (item.checkOutTime || item.checkoutTime);
    }).map(item => {
      // Calculate totals if not provided
      const roomAmount = item.roomAmount || 0;
      const serviceAmount = item.serviceAmount || 0;
      const additionalCharges = item.additionalCharges || 0;
      const discount = item.discount || 0;
      const advancePayment = item.advancePayment || 0;
      
      const calculatedTotal = roomAmount + serviceAmount + additionalCharges - discount - advancePayment;
      
      return {
        ...item,
        totalAmount: item.totalAmount || calculatedTotal,
        roomTotal: item.roomTotal || item.roomAmount,
        servicesTotal: item.servicesTotal || item.serviceAmount,
      };
    });
  }, [payments]);

  const filteredData = useMemo(() => {
    if (!searchQuery) return paidData;
    
    return paidData.filter(item =>
      item.roomNumber?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.guestName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.event?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [paidData, searchQuery]);

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

  const getPaymentStatus = (item: PaymentRecord) => {
    const paymentStatus = item.paymentStatus || item.payment?.status || item.payment?.paymentStatus || item.status || 'unpaid';
    return paymentStatus === 'completed' ? 'paid' : paymentStatus;
  };

  const isPaidTransaction = (item: PaymentRecord) => {
    return getPaymentStatus(item) === 'paid';
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Đang tải dữ liệu...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Lịch Sử Thanh Toán</Text>
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

      {/* Payment List */}
      <ScrollView style={styles.paymentList}>
        {paginatedData.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="time-outline" size={64} color="#C7C7CC" />
            <Text style={styles.emptyText}>Không có giao dịch nào</Text>
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
                  <View style={[
                    styles.statusBadge,
                    isPaidTransaction(item) ? styles.paidBadge : styles.unpaidBadge
                  ]}>
                    <Text style={[
                      styles.statusText,
                      isPaidTransaction(item) ? styles.paidText : styles.unpaidText
                    ]}>
                      {isPaidTransaction(item) ? 'Đã thanh toán' : 'Chưa thanh toán'}
                    </Text>
                  </View>
                </View>
              </View>
              
              <View style={styles.paymentDetails}>
                <View style={styles.amountRow}>
                  <Text style={styles.amountLabel}>Tiền phòng:</Text>
                  <Text style={styles.amountValue}>{formatCurrency(item.roomTotal || 0)}</Text>
                </View>
                {item.servicesTotal && item.servicesTotal > 0 && (
                  <View style={styles.amountRow}>
                    <Text style={styles.amountLabel}>Dịch vụ:</Text>
                    <Text style={styles.amountValue}>{formatCurrency(item.servicesTotal)}</Text>
                  </View>
                )}
                {item.additionalCharges && item.additionalCharges > 0 && (
                  <View style={styles.amountRow}>
                    <Text style={styles.amountLabel}>Phụ thu:</Text>
                    <Text style={styles.amountValue}>{formatCurrency(item.additionalCharges)}</Text>
                  </View>
                )}
                {item.discount && item.discount > 0 && (
                  <View style={styles.amountRow}>
                    <Text style={styles.amountLabel}>Giảm giá:</Text>
                    <Text style={[styles.amountValue, styles.discountValue]}>-{formatCurrency(item.discount)}</Text>
                  </View>
                )}
                {item.advancePayment && item.advancePayment > 0 && (
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
    paddingTop: 60,
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
  unpaidBadge: {
    backgroundColor: '#FFF3E0',
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