import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Alert } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useTheme } from '@/hooks/useTheme';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import invoiceApi from '@/services/api/invoice';
import { Invoice, InvoiceProduct, Service as InvoiceService } from '@/types/invoice';
import { Ionicons } from '@expo/vector-icons';
import { useHotel } from '@/contexts/HotelContext';

interface EditableProduct {
  id?: string;
  name: string;
  quantity: number;
  price: number;
  totalPrice: number;
  isService?: boolean;
}

export default function InvoiceEditorScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { invoiceId } = useLocalSearchParams<{ invoiceId: string }>();
  const queryClient = useQueryClient();
  const { selectedHotel } = useHotel();
  
  const [isEditMode, setIsEditMode] = useState(false);
  const [editableProducts, setEditableProducts] = useState<EditableProduct[]>([]);
  const [formData, setFormData] = useState({
    customerName: '',
    customerPhone: '',
    customerIdNumber: '',
    taxCode: '',
    customerAddress: '',
    guestSource: 'walkin',
    paymentMethod: 'cash',
    notes: '',
    checkInTime: new Date(),
    checkOutTime: new Date(),
  });
  const [showCheckInPicker, setShowCheckInPicker] = useState(false);
  const [showCheckOutPicker, setShowCheckOutPicker] = useState(false);
  const [checkInInput, setCheckInInput] = useState('');
  const [checkOutInput, setCheckOutInput] = useState('');
  const guestSourceOptions = [
    { label: 'Khách lẻ', value: 'walkin' },
    { label: 'Booking', value: 'booking' },
    { label: 'Agoda', value: 'agoda' },
    { label: 'Traveloka', value: 'traveloka' },
    { label: 'Expedia', value: 'expedia' },
    { label: 'Trip.com', value: 'trip' },
    { label: 'G2J', value: 'g2j' },
    { label: 'Fanpage', value: 'fanpage' },
    { label: 'Zalo', value: 'zalo' },
    { label: 'Khác', value: 'other' },
  ];
  const paymentMethodOptions = [
    { label: 'Tiền mặt', value: 'cash' },
    { label: 'Chuyển khoản', value: 'bank_transfer' },
    { label: 'Thẻ', value: 'card' },
  ];
  const parseDateInput = (s: string) => {
    const parts = s.split(/[\/\-\.]/).map(p => p.trim());
    if (parts.length === 3) {
      const d = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10) - 1;
      const y = parseInt(parts[2], 10);
      const dt = new Date(y, m, d);
      return isNaN(dt.getTime()) ? null : dt;
    }
    const dt = new Date(s);
    return isNaN(dt.getTime()) ? null : dt;
  };

  // Fetch invoice data
  const { data: invoice, isLoading } = useQuery({
    queryKey: ['invoice', invoiceId],
    queryFn: () => invoiceApi.getInvoiceById(invoiceId!).then(res => res.data),
    enabled: !!invoiceId,
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: (data: any) => invoiceApi.updateInvoice(invoiceId!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoice', invoiceId] });
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      Alert.alert('Thành công', 'Cập nhật hóa đơn thành công');
      setIsEditMode(false);
    },
    onError: (error) => {
      Alert.alert('Lỗi', 'Không thể cập nhật hóa đơn: ' + error.message);
    },
  });

  // Initialize form data when invoice loads
  useEffect(() => {
    if (invoice) {
      setFormData({
        customerName: invoice.customerName || invoice.guestInfo?.name || '',
        customerPhone: invoice.customerPhone || invoice.guestInfo?.phone || '',
        customerIdNumber: invoice.customerIdNumber || invoice.guestInfo?.idNumber || '',
        taxCode: invoice.guestInfo?.tax_code || '',
        customerAddress: invoice.guestInfo?.address || '',
        guestSource: invoice.guestSource || 'walkin',
        paymentMethod: invoice.paymentMethod || 'cash',
        notes: invoice.notes || '',
        checkInTime: invoice.checkInTime ? new Date(invoice.checkInTime) : new Date(),
        checkOutTime: invoice.checkOutTime ? new Date(invoice.checkOutTime) : new Date(),
      });
      setCheckInInput((invoice.checkInTime ? new Date(invoice.checkInTime) : new Date()).toLocaleDateString('vi-VN'));
      setCheckOutInput((invoice.checkOutTime ? new Date(invoice.checkOutTime) : new Date()).toLocaleDateString('vi-VN'));

      // Initialize editable products
      const products: EditableProduct[] = [];
      
      // Add room charge if no products
      if ((!invoice.products || invoice.products.length === 0) && invoice.roomAmount) {
        products.push({
          name: `Tiền phòng ${invoice.roomNumber || ''}`,
          quantity: 1,
          price: invoice.roomAmount,
          totalPrice: invoice.roomAmount,
        });
      }
      
      // Add products
      if (invoice.products) {
        invoice.products.forEach((product: InvoiceProduct) => {
          products.push({
            id: product._id,
            name: product.name,
            quantity: product.quantity || 1,
            price: product.price || 0,
            totalPrice: (product.price || 0) * (product.quantity || 1),
          });
        });
      }
      
      // Add services (only those not in products)
      if (invoice.services) {
        invoice.services.forEach((service: InvoiceService) => {
          if (!isServiceInProducts(service, invoice.products)) {
            products.push({
              id: service._id,
              name: service.name,
              quantity: service.quantity || 1,
              price: service.price || 0,
              totalPrice: (service.price || 0) * (service.quantity || 1),
              isService: true,
            });
          }
        });
      }
      
      setEditableProducts(products);
    }
  }, [invoice]);

  // Helper function to check if service is in products
  const isServiceInProducts = (service: InvoiceService, products?: InvoiceProduct[]): boolean => {
    if (!products || !service.name) return false;
    return products.some(p => p.name === service.name);
  };

  // Format currency
  const formatCurrency = (amount: number): string => {
    return amount.toLocaleString('vi-VN') + ' ₫';
  };

  // Calculate totals
  const calculateTotals = () => {
    const subtotal = editableProducts.reduce((total, item) => total + item.totalPrice, 0);
    const serviceTotal = editableProducts.filter(item => item.isService).reduce((total, item) => total + item.totalPrice, 0);
    const additionalCharges = invoice?.additionalCharges || 0;
    const totalAmount = subtotal + additionalCharges;
    const finalTotalAmount = totalAmount - (invoice?.advancePayment || 0) - (invoice?.discount || 0);
    
    return { subtotal, serviceTotal, totalAmount, finalTotalAmount };
  };

  const { subtotal, serviceTotal, totalAmount, finalTotalAmount } = calculateTotals();

  const formatDate = (date: Date | string | undefined) => {
    if (!date) return '';
    const d = typeof date === 'string' ? new Date(date) : date;
    try {
      return d.toLocaleDateString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return '';
    }
  };

  const getDurationText = () => {
    const start = formData.checkInTime;
    const end = formData.checkOutTime;
    const ms = end.getTime() - start.getTime();
    const totalMinutes = Math.floor(ms / (1000 * 60));
    const days = Math.floor(totalMinutes / (24 * 60));
    const hours = Math.floor((totalMinutes % (24 * 60)) / 60);
    const minutes = totalMinutes % 60;
    const parts: string[] = [];
    if (days > 0) parts.push(`${days} ngày`);
    if (hours > 0) parts.push(`${hours} giờ`);
    if (minutes > 0 || (days === 0 && hours === 0)) parts.push(`${minutes} phút`);
    return parts.length ? parts.join(' ') : '0 phút';
  };

  const getPaymentStatusLabel = (status?: string) => {
    if (!status) return 'Đã thanh toán';
    const map: Record<string, string> = {
      paid: 'Đã thanh toán',
      pending: 'Chưa thanh toán',
      partial: 'Thanh toán một phần',
      cancelled: 'Đã hủy',
      included_in_room_charge: 'Đã tính vào tiền phòng',
    };
    return map[status.toLowerCase()] || status;
  };

  const getPaymentStatusColor = (status?: string) => {
    if (!status) return colors.success;
    const map: Record<string, string> = {
      paid: colors.success,
      pending: colors.warning,
      partial: colors.primary,
      cancelled: colors.danger,
      included_in_room_charge: colors.textSecondary,
    };
    return map[status.toLowerCase()] || colors.textSecondary;
  };

  const getPaymentMethodLabel = (method?: string) => {
    if (!method) return 'Tiền mặt';
    const map: Record<string, string> = {
      cash: 'Tiền mặt',
      card: 'Thẻ tín dụng',
      bank_transfer: 'Chuyển khoản',
      transfer: 'Chuyển khoản',
      banking: 'Chuyển khoản',
      qr: 'QR Code',
      visa: 'Thẻ VISA',
      momo: 'Ví MoMo',
      zalopay: 'ZaloPay',
      vnpay: 'VNPay',
    };
    return map[method.toLowerCase()] || method;
  };

  const formatBusinessAddress = (address: any): string => {
    if (!address) return 'Chưa có địa chỉ';
    if (typeof address === 'string') return address;
    if (typeof address === 'object') {
      const { street, city, state, country, postalCode } = address as Record<string, string>;
      const parts = [street, city, state, country, postalCode].filter(Boolean);
      return parts.length ? parts.join(', ') : 'Chưa có địa chỉ';
    }
    return 'Chưa có địa chỉ';
  };

  // Update product total
  const updateProductTotal = (index: number) => {
    const updatedProducts = [...editableProducts];
    const product = updatedProducts[index];
    product.totalPrice = product.price * product.quantity;
    setEditableProducts(updatedProducts);
  };

  // Add new product
  const addProduct = () => {
    const newProduct: EditableProduct = {
      name: 'Sản phẩm mới',
      quantity: 1,
      price: 0,
      totalPrice: 0,
    };
    setEditableProducts([...editableProducts, newProduct]);
  };

  // Remove product
  const removeProduct = (index: number) => {
    const updatedProducts = editableProducts.filter((_, i) => i !== index);
    setEditableProducts(updatedProducts);
  };

  // Handle form submission
  const handleSave = () => {
    if (!formData.customerName.trim()) {
      Alert.alert('Lỗi', 'Vui lòng nhập tên khách hàng');
      return;
    }

    const updateData = {
      customerName: formData.customerName,
      customerPhone: formData.customerPhone,
      customerIdNumber: formData.customerIdNumber,
      guestInfo: {
        ...invoice?.guestInfo,
        name: formData.customerName,
        phone: formData.customerPhone,
        idNumber: formData.customerIdNumber,
        tax_code: formData.taxCode,
        address: formData.customerAddress,
      },
      guestSource: formData.guestSource,
      paymentMethod: formData.paymentMethod,
      notes: formData.notes,
      checkInTime: formData.checkInTime.toISOString(),
      checkOutTime: formData.checkOutTime.toISOString(),
      products: editableProducts.filter(item => !item.isService).map(item => ({
        name: item.name,
        quantity: item.quantity,
        price: item.price,
        totalPrice: item.totalPrice,
      })),
      services: editableProducts.filter(item => item.isService).map(item => ({
        name: item.name,
        quantity: item.quantity,
        price: item.price,
        totalPrice: item.totalPrice,
      })),
    };

    updateMutation.mutate(updateData);
  };

  if (isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Text style={{ color: colors.text }}>Đang tải...</Text>
      </View>
    );
  }

  if (!invoice) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Text style={{ color: colors.text }}>Không tìm thấy hóa đơn</Text>
      </View>
    );
  }

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.card }]}>
        <View style={styles.headerLeft}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>
            {isEditMode ? 'Chỉnh sửa hóa đơn' : 'Chi tiết hóa đơn'}
          </Text>
        </View>
        <TouchableOpacity onPress={() => setIsEditMode(!isEditMode)}>
          <Ionicons name={isEditMode ? "eye" : "pencil"} size={24} color={colors.primary} />
        </TouchableOpacity>
      </View>

      <View style={[styles.invoiceHeader, { backgroundColor: colors.card }]}>
        <View style={styles.businessInfo}>
          <Text style={[styles.businessName, { color: colors.text }]}>
            {invoice.businessName || selectedHotel?.name || 'Khách sạn'}
          </Text>
          <Text style={[styles.businessAddress, { color: colors.text }]}>
            {formatBusinessAddress(invoice.business_address || selectedHotel?.address)}
          </Text>
          <Text style={[styles.businessPhone, { color: colors.text }]}>
            ĐT: {invoice.phoneNumber || selectedHotel?.phone || 'Chưa có số điện thoại'}
          </Text>
        </View>
        <View style={styles.invoiceInfo}>
          <Text style={[styles.invoiceNumber, { color: colors.primary }]}>
            Số: {invoice.invoiceNumber || invoice.bookingId || 'N/A'}
          </Text>
          <Text style={[styles.invoiceDate, { color: colors.textSecondary }]}>
            {formatDate(invoice.date)}
          </Text>
          <View style={[styles.chip, { borderColor: getPaymentStatusColor(invoice.paymentStatus) }]}>
            <Text style={[styles.chipText, { color: getPaymentStatusColor(invoice.paymentStatus) }]}>
              {getPaymentStatusLabel(invoice.paymentStatus)}
            </Text>
          </View>
        </View>
      </View>

      {/* Invoice Title */}
      <Text style={[styles.invoiceTitle, { color: colors.text }]}>HOÁ ĐƠN THANH TOÁN</Text>

      {/* Customer Info */}
      <View style={[styles.section, { backgroundColor: colors.card }]}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Thông tin khách hàng</Text>
        
        {isEditMode ? (
          <View style={styles.formContainer}>
            <View style={styles.formRow}>
              <View style={styles.formField}>
                <Text style={[styles.label, { color: colors.text }]}>Mã đặt phòng</Text>
                <Text style={[styles.readOnlyValue, { color: colors.text }]}>
                  {invoice.bookingId || 'N/A'}
                </Text>
              </View>
              <View style={styles.formField}>
                <Text style={[styles.label, { color: colors.text }]}>Tên khách hàng *</Text>
                <TextInput
                  style={[styles.input, { color: colors.text, borderColor: colors.border }]}
                  value={formData.customerName}
                  onChangeText={(text) => setFormData({...formData, customerName: text})}
                  placeholder="Nhập tên khách hàng"
                />
              </View>
            </View>

            <View style={styles.formRow}>
              <View style={styles.formField}>
                <Text style={[styles.label, { color: colors.text }]}>Phòng</Text>
                <Text style={[styles.readOnlyValue, { color: colors.text }]}>
                  {invoice.roomNumber || 'N/A'}
                </Text>
              </View>
              <View style={styles.formField}>
                <Text style={[styles.label, { color: colors.text }]}>Nhân viên</Text>
                <Text style={[styles.readOnlyValue, { color: colors.text }]}>
                  {invoice.staffName || 'Không có thông tin'}
                </Text>
              </View>
            </View>

            <View style={styles.formRow}>
              <View style={styles.formField}>
                <Text style={[styles.label, { color: colors.text }]}>Ngày đến</Text>
                <TextInput
                  style={[styles.dateInput, { color: colors.text, borderColor: colors.border }]}
                  value={checkInInput}
                  onChangeText={(text) => {
                    setCheckInInput(text);
                    const dt = parseDateInput(text);
                    if (dt) setFormData({ ...formData, checkInTime: dt });
                  }}
                  placeholder="dd/MM/yyyy"
                />
              </View>
              <View style={styles.formField}>
                <Text style={[styles.label, { color: colors.text }]}>Ngày đi</Text>
                <TextInput
                  style={[styles.dateInput, { color: colors.text, borderColor: colors.border }]}
                  value={checkOutInput}
                  onChangeText={(text) => {
                    setCheckOutInput(text);
                    const dt = parseDateInput(text);
                    if (dt) setFormData({ ...formData, checkOutTime: dt });
                  }}
                  placeholder="dd/MM/yyyy"
                />
              </View>
            </View>

            <View style={styles.formRow}>
              <View style={styles.formField}>
                <Text style={[styles.label, { color: colors.text }]}>SĐT khách hàng</Text>
                <TextInput
                  style={[styles.input, { color: colors.text, borderColor: colors.border }]}
                  value={formData.customerPhone}
                  onChangeText={(text) => setFormData({...formData, customerPhone: text})}
                  placeholder="Nhập số điện thoại"
                  keyboardType="phone-pad"
                />
              </View>
              <View style={styles.formField}>
                <Text style={[styles.label, { color: colors.text }]}>CCCD/CMND</Text>
                <TextInput
                  style={[styles.input, { color: colors.text, borderColor: colors.border }]}
                  value={formData.customerIdNumber}
                  onChangeText={(text) => setFormData({...formData, customerIdNumber: text})}
                  placeholder="Nhập CCCD/CMND"
                />
              </View>
            </View>

            <View style={styles.formRow}>
              <View style={styles.formField}>
                <Text style={[styles.label, { color: colors.text }]}>Mã số thuế</Text>
                <TextInput
                  style={[styles.input, { color: colors.text, borderColor: colors.border }]}
                  value={formData.taxCode}
                  onChangeText={(text) => setFormData({...formData, taxCode: text})}
                  placeholder="Nhập mã số thuế"
                />
              </View>
              <View style={styles.formField}>
                <Text style={[styles.label, { color: colors.text }]}>Nguồn khách</Text>
                <View style={styles.optionRow}>
                  {guestSourceOptions.map(opt => (
                    <TouchableOpacity
                      key={opt.value}
                      style={[
                        styles.optionChip,
                        { borderColor: colors.border },
                        formData.guestSource === opt.value && [styles.optionChipActive, { backgroundColor: colors.primary + '20', borderColor: colors.primary }]
                      ]}
                      onPress={() => setFormData({ ...formData, guestSource: opt.value })}
                    >
                      <Text style={{ color: formData.guestSource === opt.value ? colors.primary : colors.text }}>{opt.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </View>

            <View style={styles.formRow}>
              <View style={styles.formField}>
                <Text style={[styles.label, { color: colors.text }]}>Phương thức thanh toán</Text>
                <View style={styles.optionRow}>
                  {paymentMethodOptions.map(opt => (
                    <TouchableOpacity
                      key={opt.value}
                      style={[
                        styles.optionChip,
                        { borderColor: colors.border },
                        formData.paymentMethod === opt.value && [styles.optionChipActive, { backgroundColor: colors.primary + '20', borderColor: colors.primary }]
                      ]}
                      onPress={() => setFormData({ ...formData, paymentMethod: opt.value })}
                    >
                      <Text style={{ color: formData.paymentMethod === opt.value ? colors.primary : colors.text }}>{opt.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
              <View style={styles.formField}>
                <Text style={[styles.label, { color: colors.text }]}>Địa chỉ</Text>
                <TextInput
                  style={[styles.input, { color: colors.text, borderColor: colors.border }]}
                  value={formData.customerAddress}
                  onChangeText={(text) => setFormData({...formData, customerAddress: text})}
                  placeholder="Nhập địa chỉ"
                />
              </View>
            </View>

            <View style={styles.formRow}>
              <View style={styles.formField}>
                <Text style={[styles.label, { color: colors.text }]}>Ghi chú</Text>
                <TextInput
                  style={[styles.textArea, { color: colors.text, borderColor: colors.border }]}
                  value={formData.notes}
                  onChangeText={(text) => setFormData({...formData, notes: text})}
                  placeholder="Nhập ghi chú"
                  multiline
                  numberOfLines={3}
                />
              </View>
            </View>
          </View>
        ) : (
          <View style={[styles.detailGrid, { backgroundColor: colors.card }]}>
            <View style={styles.gridRow}>
              <View style={styles.gridCol}>
                <View style={styles.detailRow}>
                  <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Mã đặt phòng:</Text>
                  <Text style={[styles.detailValue, { color: colors.text }]}>{invoice.bookingId || 'N/A'}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Phòng:</Text>
                  <Text style={[styles.detailValue, { color: colors.text }]}>{invoice.roomNumber || 'N/A'}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Ngày đến:</Text>
                  <Text style={[styles.detailValue, { color: colors.text }]}>{formatDate(formData.checkInTime)}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Ngày đi:</Text>
                  <Text style={[styles.detailValue, { color: colors.text }]}>{formatDate(formData.checkOutTime)}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Thời gian lưu trú:</Text>
                  <Text style={[styles.detailValue, { color: colors.text }]}>{getDurationText()}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>SĐT khách hàng:</Text>
                  <Text style={[styles.detailValue, { color: colors.text }]}>{formData.customerPhone || 'N/A'}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Mã số thuế:</Text>
                  <Text style={[styles.detailValue, { color: colors.text }]}>{formData.taxCode || 'Không có'}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Địa chỉ:</Text>
                  <Text style={[styles.detailValue, { color: colors.text }]}>{formData.customerAddress || 'Không có'}</Text>
                </View>
              </View>
              <View style={styles.gridCol}>
                <View style={styles.detailRow}>
                  <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Khách hàng:</Text>
                  <Text style={[styles.detailValue, { color: colors.text }]}>{formData.customerName || 'Khách lẻ'}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Nhân viên:</Text>
                  <Text style={[styles.detailValue, { color: colors.text }]}>{invoice.staffName || 'N/A'}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Phương thức thanh toán:</Text>
                  <View style={[styles.chip, { borderColor: colors.success }]}>
                    <Text style={[styles.chipText, { color: colors.success }]}>{getPaymentMethodLabel(formData.paymentMethod)}</Text>
                  </View>
                </View>
                <View style={styles.detailRow}>
                  <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>CCCD/CMND:</Text>
                  <Text style={[styles.detailValue, { color: colors.text }]}>{formData.customerIdNumber || 'Không có'}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Nguồn khách:</Text>
                  <View style={[styles.chip, { borderColor: colors.primary }]}>
                    <Text style={[styles.chipText, { color: colors.primary }]}>
                      {getPaymentMethodLabel(undefined) && (formData.guestSource === 'walkin' ? 'Khách lẻ' :
                       formData.guestSource === 'booking' ? 'Booking' :
                       formData.guestSource === 'agoda' ? 'Agoda' :
                       formData.guestSource === 'traveloka' ? 'Traveloka' :
                       formData.guestSource === 'expedia' ? 'Expedia' :
                       formData.guestSource === 'trip' ? 'Trip.com' :
                       formData.guestSource === 'g2j' ? 'G2J' :
                       formData.guestSource === 'fanpage' ? 'Fanpage' :
                       formData.guestSource === 'zalo' ? 'Zalo' : 'Khác')}
                    </Text>
                  </View>
                </View>
                <View style={styles.detailRow}>
                  <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Loại phòng:</Text>
                  <Text style={[styles.detailValue, { color: colors.text }]}>{invoice.roomType || 'N/A'}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Ngày đơn:</Text>
                  <Text style={[styles.detailValue, { color: colors.text }]}>{formatDate(invoice.date)}</Text>
                </View>
              </View>
            </View>
            {formData.notes ? (
              <View style={[styles.detailRow, { marginTop: 8 }]}>
                <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Ghi chú:</Text>
                <Text style={[styles.detailValue, { color: colors.text }]}>{formData.notes}</Text>
              </View>
            ) : null}
          </View>
        )}
      </View>

      {/* Products/Services Section */}
      <View style={[styles.section, { backgroundColor: colors.card }]}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Sản phẩm/Dịch vụ</Text>
        
        {isEditMode && (
          <TouchableOpacity style={[styles.addButton, { backgroundColor: colors.primary }]} onPress={addProduct}>
            <Ionicons name="add" size={20} color="white" />
            <Text style={styles.addButtonText}>Thêm sản phẩm/dịch vụ</Text>
          </TouchableOpacity>
        )}

        <View style={styles.tableContainer}>
          <View style={[styles.tableHeader, { backgroundColor: colors.border + '30' }]}>
            <Text style={[styles.tableHeaderText, { color: colors.text, flex: 3 }]}>Tên hàng</Text>
            <Text style={[styles.tableHeaderText, { color: colors.text, flex: 1, textAlign: 'center' }]}>SL</Text>
            <Text style={[styles.tableHeaderText, { color: colors.text, flex: 2, textAlign: 'right' }]}>Đơn giá</Text>
            <Text style={[styles.tableHeaderText, { color: colors.text, flex: 2, textAlign: 'right' }]}>Thành tiền</Text>
            {isEditMode && <Text style={[styles.tableHeaderText, { color: colors.text, flex: 1 }]}></Text>}
          </View>

          {editableProducts.map((product, index) => (
            <View key={index} style={[styles.tableRow, { borderBottomColor: colors.border }]}>
              {isEditMode ? (
                <>
                  <View style={[styles.tableCell, { flex: 3 }]}>
                    <TextInput
                      style={[styles.tableInput, { color: colors.text, borderColor: colors.border }]}
                      value={product.name}
                      onChangeText={(text) => {
                        const updated = [...editableProducts];
                        updated[index].name = text;
                        setEditableProducts(updated);
                      }}
                    />
                  </View>
                  <View style={[styles.tableCell, { flex: 1 }]}>
                    <TextInput
                      style={[styles.tableInput, { color: colors.text, borderColor: colors.border, textAlign: 'center' }]}
                      value={product.quantity.toString()}
                      onChangeText={(text) => {
                        const updated = [...editableProducts];
                        updated[index].quantity = parseInt(text) || 0;
                        updated[index].totalPrice = updated[index].quantity * updated[index].price;
                        setEditableProducts(updated);
                      }}
                      keyboardType="numeric"
                    />
                  </View>
                  <View style={[styles.tableCell, { flex: 2 }]}>
                    <TextInput
                      style={[styles.tableInput, { color: colors.text, borderColor: colors.border, textAlign: 'right' }]}
                      value={product.price.toString()}
                      onChangeText={(text) => {
                        const updated = [...editableProducts];
                        updated[index].price = parseInt(text) || 0;
                        updated[index].totalPrice = updated[index].quantity * updated[index].price;
                        setEditableProducts(updated);
                      }}
                      keyboardType="numeric"
                    />
                  </View>
                  <View style={[styles.tableCell, { flex: 2 }]}>
                    <Text style={[styles.tableText, { color: colors.text, textAlign: 'right' }]}>
                      {formatCurrency(product.totalPrice)}
                    </Text>
                  </View>
                  <View style={[styles.tableCell, { flex: 1 }]}>
                    <TouchableOpacity onPress={() => removeProduct(index)}>
                      <Ionicons name="trash" size={20} color={colors.danger} />
                    </TouchableOpacity>
                  </View>
                </>
              ) : (
                <>
                  <View style={[styles.tableCell, { flex: 3 }]}>
                    <Text style={[styles.tableText, { color: colors.text }]}>{product.name}</Text>
                  </View>
                  <View style={[styles.tableCell, { flex: 1 }]}>
                    <Text style={[styles.tableText, { color: colors.text, textAlign: 'center' }]}>x{product.quantity}</Text>
                  </View>
                  <View style={[styles.tableCell, { flex: 2 }]}>
                    <Text style={[styles.tableText, { color: colors.text, textAlign: 'right' }]}>{formatCurrency(product.price)}</Text>
                  </View>
                  <View style={[styles.tableCell, { flex: 2 }]}>
                    <Text style={[styles.tableText, { color: colors.text, textAlign: 'right' }]}>{formatCurrency(product.totalPrice)}</Text>
                  </View>
                </>
              )}
            </View>
          ))}
        </View>
      </View>

      {/* Payment Summary */}
      <View style={[styles.section, { backgroundColor: colors.card }]}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Tổng hợp thanh toán</Text>
        
        <View style={styles.summaryContainer}>
          <View style={styles.summaryRow}>
            <Text style={[styles.summaryLabel, { color: colors.text }]}>Tiền phòng:</Text>
            <Text style={[styles.summaryValue, { color: colors.text }]}>{formatCurrency(subtotal)}</Text>
          </View>
          
          {serviceTotal > 0 && (
            <View style={styles.summaryRow}>
              <Text style={[styles.summaryLabel, { color: colors.text }]}>Tiền dịch vụ:</Text>
              <Text style={[styles.summaryValue, { color: colors.text }]}>{formatCurrency(serviceTotal)}</Text>
            </View>
          )}
          
          {invoice?.additionalCharges && invoice.additionalCharges > 0 && (
            <View style={styles.summaryRow}>
              <Text style={[styles.summaryLabel, { color: colors.text }]}>Phụ thu:</Text>
              <Text style={[styles.summaryValue, { color: colors.text }]}>{formatCurrency(invoice.additionalCharges)}</Text>
            </View>
          )}
          
          <View style={[styles.summaryRow, styles.totalRow, { borderTopColor: colors.border }]}>
            <Text style={[styles.summaryLabel, { color: colors.text, fontWeight: 'bold' }]}>Tổng cộng:</Text>
            <Text style={[styles.summaryValue, { color: colors.text, fontWeight: 'bold' }]}>{formatCurrency(totalAmount)}</Text>
          </View>
          
          {invoice?.discount && invoice.discount > 0 && (
            <View style={styles.summaryRow}>
              <Text style={[styles.summaryLabel, { color: colors.text }]}>Giảm giá:</Text>
              <Text style={[styles.summaryValue, { color: colors.danger }]}>-{formatCurrency(invoice.discount)}</Text>
            </View>
          )}
          
          {invoice?.advancePayment && invoice.advancePayment > 0 && (
            <View style={styles.summaryRow}>
              <Text style={[styles.summaryLabel, { color: colors.text }]}>Đặt trước:</Text>
              <Text style={[styles.summaryValue, { color: colors.text }]}>-{formatCurrency(invoice.advancePayment)}</Text>
            </View>
          )}
          
          <View style={[styles.summaryRow, styles.finalTotalRow, { borderTopColor: colors.primary }]}>
            <Text style={[styles.summaryLabel, { color: colors.text, fontWeight: 'bold', fontSize: 16 }]}>
              {finalTotalAmount >= 0 ? 'Còn phải trả:' : 'Khách được hoàn:'}
            </Text>
            <Text style={[styles.summaryValue, { 
              color: finalTotalAmount >= 0 ? colors.danger : colors.success, 
              fontWeight: 'bold', 
              fontSize: 16 
            }]}>
              {formatCurrency(Math.abs(finalTotalAmount))}
            </Text>
          </View>
        </View>
      </View>

      {/* Action Buttons */}
      {isEditMode && (
        <View style={[styles.section, { backgroundColor: colors.card }]}>
          <TouchableOpacity 
            style={[styles.saveButton, { backgroundColor: colors.primary }]} 
            onPress={handleSave}
            disabled={updateMutation.isPending}
          >
            <Ionicons name="save" size={20} color="white" />
            <Text style={styles.saveButtonText}>
              {updateMutation.isPending ? 'Đang lưu...' : 'Lưu thay đổi'}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Thank You */}
      <View style={[styles.thankYouSection, { backgroundColor: colors.card }]}>
        <Text style={[styles.thankYouText, { color: colors.text }]}>Cảm ơn quý khách đã sử dụng dịch vụ!</Text>
        <Text style={[styles.thankYouText, { color: colors.text }]}>Chúc quý khách một ngày tốt lành!</Text>
        <Text style={[styles.printDate, { color: colors.text + '80' }]}>
          Ngày in: {new Date().toLocaleDateString('vi-VN')} {new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    marginRight: 16,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  invoiceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
    margin: 16,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  businessInfo: {
    flex: 1,
  },
  businessName: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  businessAddress: {
    fontSize: 14,
    marginBottom: 2,
  },
  businessPhone: {
    fontSize: 14,
  },
  invoiceInfo: {
    flex: 1,
    alignItems: 'flex-end',
  },
  invoiceNumber: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  invoiceDate: {
    fontSize: 14,
    marginBottom: 8,
  },
  chip: {
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  chipText: {
    fontSize: 12,
    fontWeight: '600',
  },
  invoiceTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    marginVertical: 16,
  },
  section: {
    margin: 16,
    padding: 16,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  formContainer: {
    gap: 12,
  },
  formRow: {
    flexDirection: 'row',
    gap: 12,
  },
  formField: {
    flex: 1,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 4,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 8,
    fontSize: 14,
  },
  dateInput: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 8,
    fontSize: 14,
  },
  pickerContainer: {
    borderWidth: 1,
    borderRadius: 8,
    overflow: 'hidden',
  },
  optionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  optionChip: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderWidth: 1,
    borderRadius: 16,
  },
  optionChipActive: {
    borderWidth: 1,
  },
  textArea: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 8,
    fontSize: 14,
    height: 80,
    textAlignVertical: 'top',
  },
  readOnlyValue: {
    fontSize: 14,
    paddingVertical: 8,
  },
  detailGrid: {
    marginTop: 0,
    borderRadius: 12,
    padding: 16,
  },
  gridRow: {
    flexDirection: 'row',
  },
  gridCol: {
    flex: 1,
    paddingRight: 12,
  },
  detailRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  detailLabel: {
    fontSize: 14,
    width: 130,
  },
  detailValue: {
    fontSize: 14,
    flex: 1,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  addButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 8,
  },
  tableContainer: {
    borderWidth: 1,
    borderRadius: 8,
    overflow: 'hidden',
  },
  tableHeader: {
    flexDirection: 'row',
    padding: 12,
    borderBottomWidth: 1,
  },
  tableHeaderText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
  },
  tableCell: {
    padding: 12,
    justifyContent: 'center',
  },
  tableText: {
    fontSize: 14,
  },
  tableInput: {
    borderWidth: 1,
    borderRadius: 4,
    padding: 4,
    fontSize: 14,
  },
  summaryContainer: {
    gap: 8,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  totalRow: {
    borderTopWidth: 1,
    paddingTop: 8,
    marginTop: 4,
  },
  finalTotalRow: {
    borderTopWidth: 2,
    paddingTop: 8,
    marginTop: 4,
  },
  summaryLabel: {
    fontSize: 14,
  },
  summaryValue: {
    fontSize: 14,
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 8,
  },
  saveButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  thankYouSection: {
    margin: 16,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  thankYouText: {
    fontSize: 14,
    fontStyle: 'italic',
    marginBottom: 4,
  },
  printDate: {
    fontSize: 12,
    marginTop: 8,
  },
});
