import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

interface InvoiceProduct {
  id: string;
  name: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

interface InvoiceService {
  id: string;
  name: string;
  price: number;
}

interface GuestInfo {
  name?: string;
  phone?: string;
  email?: string;
}

interface InvoiceData {
  invoiceNumber: string;
  date: Date | string;
  products: InvoiceProduct[];
  services?: InvoiceService[];
  totalAmount: number;
  guestInfo?: GuestInfo;
  remainingAmount?: number;
}

export default function InvoiceManagementScreen() {
  const router = useRouter();
  const [invoices, setInvoices] = useState<InvoiceData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceData | null>(null);

  // Mock data for demonstration
  const mockInvoices: InvoiceData[] = [
    {
      invoiceNumber: 'INV-001',
      date: new Date(),
      products: [
        {
          id: '1',
          name: 'Phòng Deluxe',
          quantity: 1,
          unitPrice: 500000,
          total: 500000,
        },
      ],
      services: [
        {
          id: '1',
          name: 'Dọn phòng',
          price: 50000,
        },
      ],
      totalAmount: 550000,
      guestInfo: {
        name: 'Nguyễn Văn A',
        phone: '0901234567',
        email: 'nguyenvana@email.com',
      },
      remainingAmount: 0,
    },
    {
      invoiceNumber: 'INV-002',
      date: new Date(),
      products: [
        {
          id: '2',
          name: 'Phòng Suite',
          quantity: 1,
          unitPrice: 800000,
          total: 800000,
        },
      ],
      totalAmount: 800000,
      guestInfo: {
        name: 'Trần Thị B',
        phone: '0909876543',
      },
      remainingAmount: 200000,
    },
  ];

  useEffect(() => {
    // Load invoices from API
    setTimeout(() => {
      setInvoices(mockInvoices);
      setLoading(false);
    }, 1000);
  }, []);

  const handleCreateInvoice = () => {
    setSelectedInvoice(null);
    setIsEditMode(false);
    // Navigate to invoice creation screen
    Alert.alert('Tính năng', 'Chức năng tạo hóa đơn sẽ được triển khai');
  };

  const handleEditInvoice = (invoice: InvoiceData) => {
    setSelectedInvoice(invoice);
    setIsEditMode(true);
    Alert.alert('Tính năng', 'Chức năng chỉnh sửa hóa đơn sẽ được triển khai');
  };

  const handleDeleteInvoice = (invoiceNumber: string) => {
    Alert.alert(
      'Xác nhận',
      'Bạn có chắc chắn muốn xóa hóa đơn này?',
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Xóa',
          style: 'destructive',
          onPress: () => {
            setInvoices(invoices.filter(inv => inv.invoiceNumber !== invoiceNumber));
          },
        },
      ]
    );
  };

  const handleExportInvoice = (invoice: InvoiceData) => {
    Alert.alert('Tính năng', 'Chức năng xuất hóa đơn sẽ được triển khai');
  };

  const filteredInvoices = invoices.filter(invoice =>
    invoice.invoiceNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
    invoice.guestInfo?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    invoice.guestInfo?.phone?.includes(searchQuery)
  );

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(amount);
  };

  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleDateString('vi-VN');
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
        <Text style={styles.headerTitle}>Quản Lý Hóa Đơn</Text>
        <TouchableOpacity style={styles.createButton} onPress={handleCreateInvoice}>
          <Ionicons name="add" size={20} color="#FFF" />
          <Text style={styles.createButtonText}>Tạo Hóa Đơn</Text>
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#8E8E93" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Tìm kiếm theo số hóa đơn, tên khách, số điện thoại..."
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {/* Invoices List */}
      <ScrollView style={styles.invoiceList}>
        {filteredInvoices.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="document-text-outline" size={64} color="#C7C7CC" />
            <Text style={styles.emptyText}>Không có hóa đơn nào</Text>
          </View>
        ) : (
          filteredInvoices.map((invoice) => (
            <View key={invoice.invoiceNumber} style={styles.invoiceCard}>
              <View style={styles.invoiceHeader}>
                <Text style={styles.invoiceNumber}>{invoice.invoiceNumber}</Text>
                <Text style={styles.invoiceDate}>{formatDate(invoice.date)}</Text>
              </View>
              
              {invoice.guestInfo && (
                <View style={styles.guestInfo}>
                  <Text style={styles.guestName}>{invoice.guestInfo.name}</Text>
                  <Text style={styles.guestPhone}>{invoice.guestInfo.phone}</Text>
                </View>
              )}
              
              <View style={styles.invoiceDetails}>
                <Text style={styles.totalAmount}>{formatCurrency(invoice.totalAmount)}</Text>
                {invoice.remainingAmount && invoice.remainingAmount > 0 && (
                  <Text style={styles.remainingAmount}>
                    Còn nợ: {formatCurrency(invoice.remainingAmount)}
                  </Text>
                )}
              </View>
              
              <View style={styles.invoiceActions}>
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => handleEditInvoice(invoice)}
                >
                  <Ionicons name="create-outline" size={18} color="#007AFF" />
                  <Text style={styles.actionButtonText}>Sửa</Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => handleExportInvoice(invoice)}
                >
                  <Ionicons name="download-outline" size={18} color="#34C759" />
                  <Text style={styles.actionButtonText}>Xuất</Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[styles.actionButton, styles.deleteButton]}
                  onPress={() => handleDeleteInvoice(invoice.invoiceNumber)}
                >
                  <Ionicons name="trash-outline" size={18} color="#FF3B30" />
                  <Text style={[styles.actionButtonText, styles.deleteButtonText]}>Xóa</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
      </ScrollView>
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#000',
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#007AFF',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  createButtonText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
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
  invoiceList: {
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
  invoiceCard: {
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
  invoiceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  invoiceNumber: {
    fontSize: 16,
    fontWeight: '600',
    color: '#007AFF',
  },
  invoiceDate: {
    fontSize: 14,
    color: '#8E8E93',
  },
  guestInfo: {
    marginBottom: 12,
  },
  guestName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#000',
  },
  guestPhone: {
    fontSize: 14,
    color: '#8E8E93',
    marginTop: 2,
  },
  invoiceDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  totalAmount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
  },
  remainingAmount: {
    fontSize: 14,
    color: '#FF9500',
    fontWeight: '500',
  },
  invoiceActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#E5E5EA',
    paddingTop: 12,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  actionButtonText: {
    fontSize: 14,
    color: '#007AFF',
    marginLeft: 4,
  },
  deleteButton: {
    backgroundColor: '#FFE5E5',
  },
  deleteButtonText: {
    color: '#FF3B30',
  },
});