import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Alert } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useTheme } from '@/hooks/useTheme';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import invoiceApi from '@/services/api/invoice';
import { Invoice, InvoiceProduct, Service as InvoiceService } from '@/types/invoice';
import { Ionicons } from '@expo/vector-icons';
import { useHotel } from '@/contexts/HotelContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { AccessGuard } from '@/components/AccessGuard';

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
  const { language } = useLanguage();
  const { invoiceId } = useLocalSearchParams<{ invoiceId: string }>();
  const queryClient = useQueryClient();
  const { selectedHotel } = useHotel();
  const isVi = language === 'vi';
  const text = React.useMemo(() => ({
    success: isVi ? 'Thành công' : 'Success',
    error: isVi ? 'Lỗi' : 'Error',
    updateSuccess: isVi ? 'Cập nhật hóa đơn thành công' : 'Invoice updated successfully',
    updateFailed: isVi ? 'Không thể cập nhật hóa đơn:' : 'Unable to update invoice:',
    walkInGuest: isVi ? 'Khách lẻ' : 'Walk-in guest',
    other: isVi ? 'Khác' : 'Other',
    cash: isVi ? 'Tiền mặt' : 'Cash',
    bankTransfer: isVi ? 'Chuyển khoản' : 'Bank transfer',
    card: isVi ? 'Thẻ' : 'Card',
    hourly: isVi ? 'Theo giờ' : 'Hourly',
    paid: isVi ? 'Đã thanh toán' : 'Paid',
    pending: isVi ? 'Chưa thanh toán' : 'Pending',
    partial: isVi ? 'Thanh toán một phần' : 'Partially paid',
    cancelled: isVi ? 'Đã hủy' : 'Cancelled',
    includedInRoomCharge: isVi ? 'Đã tính vào tiền phòng' : 'Included in room charge',
    noAddress: isVi ? 'Chưa có địa chỉ' : 'No address',
    newProduct: isVi ? 'Sản phẩm mới' : 'New item',
    customerNameRequired: isVi ? 'Vui lòng nhập tên khách hàng' : 'Please enter customer name',
    loading: isVi ? 'Đang tải...' : 'Loading...',
    notFound: isVi ? 'Không tìm thấy hóa đơn' : 'Invoice not found',
    editInvoice: isVi ? 'Chỉnh sửa hóa đơn' : 'Edit invoice',
    invoiceDetail: isVi ? 'Chi tiết hóa đơn' : 'Invoice details',
    hotel: isVi ? 'Khách sạn' : 'Hotel',
    noPhone: isVi ? 'Chưa có số điện thoại' : 'No phone number',
    numberPrefix: isVi ? 'Số' : 'No',
    phonePrefix: isVi ? 'ĐT' : 'Tel',
    invoiceTitle: isVi ? 'HOÁ ĐƠN THANH TOÁN' : 'PAYMENT INVOICE',
    customerInfo: isVi ? 'Thông tin khách hàng' : 'Customer information',
    bookingCode: isVi ? 'Mã đặt phòng' : 'Booking code',
    customerName: isVi ? 'Tên khách hàng *' : 'Customer name *',
    enterCustomerName: isVi ? 'Nhập tên khách hàng' : 'Enter customer name',
    room: isVi ? 'Phòng' : 'Room',
    staff: isVi ? 'Nhân viên' : 'Staff',
    noInfo: isVi ? 'Không có thông tin' : 'No information',
    checkIn: isVi ? 'Ngày đến' : 'Check-in',
    checkOut: isVi ? 'Ngày đi' : 'Check-out',
    customerPhone: isVi ? 'SĐT khách hàng' : 'Customer phone',
    enterPhone: isVi ? 'Nhập số điện thoại' : 'Enter phone number',
    idNumber: isVi ? 'CCCD/CMND' : 'ID number',
    enterIdNumber: isVi ? 'Nhập CCCD/CMND' : 'Enter ID number',
    taxCode: isVi ? 'Mã số thuế' : 'Tax code',
    enterTaxCode: isVi ? 'Nhập mã số thuế' : 'Enter tax code',
    guestSource: isVi ? 'Nguồn khách' : 'Guest source',
    paymentMethod: isVi ? 'Phương thức thanh toán' : 'Payment method',
    address: isVi ? 'Địa chỉ' : 'Address',
    enterAddress: isVi ? 'Nhập địa chỉ' : 'Enter address',
    notes: isVi ? 'Ghi chú' : 'Notes',
    enterNotes: isVi ? 'Nhập ghi chú' : 'Enter notes',
    stayDuration: isVi ? 'Thời gian lưu trú:' : 'Length of stay:',
    customer: isVi ? 'Khách hàng:' : 'Customer:',
    roomType: isVi ? 'Loại phòng:' : 'Room type:',
    orderDate: isVi ? 'Ngày đơn:' : 'Order date:',
    productsServices: isVi ? 'Sản phẩm/Dịch vụ' : 'Products/Services',
    addProductService: isVi ? 'Thêm sản phẩm/dịch vụ' : 'Add product/service',
    itemName: isVi ? 'Tên hàng' : 'Item',
    quantityShort: isVi ? 'SL' : 'Qty',
    unitPrice: isVi ? 'Đơn giá' : 'Unit price',
    amount: isVi ? 'Thành tiền' : 'Amount',
    paymentSummary: isVi ? 'Tổng hợp thanh toán' : 'Payment summary',
    roomAmount: isVi ? 'Tiền phòng:' : 'Room charge:',
    serviceAmount: isVi ? 'Tiền dịch vụ:' : 'Service charge:',
    surcharge: isVi ? 'Phụ thu:' : 'Surcharge:',
    total: isVi ? 'Tổng cộng:' : 'Total:',
    discount: isVi ? 'Giảm giá:' : 'Discount:',
    advancePayment: isVi ? 'Đặt trước:' : 'Advance payment:',
    amountDue: isVi ? 'Còn phải trả:' : 'Amount due:',
    refundAmount: isVi ? 'Khách được hoàn:' : 'Refund amount:',
    saving: isVi ? 'Đang lưu...' : 'Saving...',
    saveChanges: isVi ? 'Lưu thay đổi' : 'Save changes',
    thankYou1: isVi ? 'Cảm ơn quý khách đã sử dụng dịch vụ!' : 'Thank you for using our service!',
    thankYou2: isVi ? 'Chúc quý khách một ngày tốt lành!' : 'Have a wonderful day!',
    printDate: isVi ? 'Ngày in:' : 'Printed on:',
    noTaxCode: isVi ? 'Không có' : 'Not available',
  }), [isVi]);
  
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
    { label: text.walkInGuest, value: 'walkin' },
    { label: isVi ? 'Booking' : 'Booking', value: 'booking' },
    { label: 'Agoda', value: 'agoda' },
    { label: 'Traveloka', value: 'traveloka' },
    { label: 'Expedia', value: 'expedia' },
    { label: 'Trip.com', value: 'trip' },
    { label: 'G2J', value: 'g2j' },
    { label: 'Fanpage', value: 'fanpage' },
    { label: 'Zalo', value: 'zalo' },
    { label: text.other, value: 'other' },
  ];
  const paymentMethodOptions = [
    { label: text.cash, value: 'cash' },
    { label: text.bankTransfer, value: 'bank_transfer' },
    { label: text.card, value: 'card' },
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
      Alert.alert(text.success, text.updateSuccess);
      setIsEditMode(false);
    },
    onError: (error) => {
      Alert.alert(text.error, `${text.updateFailed} ${error.message}`);
    },
  }, [invoiceId, queryClient, text.error, text.success, text.updateFailed, text.updateSuccess]);

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
      setCheckInInput((invoice.checkInTime ? new Date(invoice.checkInTime) : new Date()).toLocaleDateString(isVi ? 'vi-VN' : 'en-US'));
      setCheckOutInput((invoice.checkOutTime ? new Date(invoice.checkOutTime) : new Date()).toLocaleDateString(isVi ? 'vi-VN' : 'en-US'));

      // Initialize editable products
      const products: EditableProduct[] = [];
      
      // Add room charge if no products
      if ((!invoice.products || invoice.products.length === 0) && invoice.roomAmount) {
        products.push({
          name: isVi ? `Tiền phòng ${invoice.roomNumber || ''}` : `Room charge ${invoice.roomNumber || ''}`,
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
  }, [invoice, isVi]);

  // Helper function to check if service is in products
  const isServiceInProducts = (service: InvoiceService, products?: InvoiceProduct[]): boolean => {
    if (!products || !service.name) return false;
    return products.some(p => p.name === service.name);
  };

  // Format currency
  const formatCurrency = (amount: number): string => {
    if (isVi) return amount.toLocaleString('vi-VN') + ' ₫';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'VND',
      maximumFractionDigits: 0,
    }).format(amount);
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
      return d.toLocaleDateString(isVi ? 'vi-VN' : 'en-US', {
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
    if (days > 0) parts.push(`${days} ${isVi ? 'ngày' : days === 1 ? 'day' : 'days'}`);
    if (hours > 0) parts.push(`${hours} ${isVi ? 'giờ' : hours === 1 ? 'hour' : 'hours'}`);
    if (minutes > 0 || (days === 0 && hours === 0)) parts.push(`${minutes} ${isVi ? 'phút' : minutes === 1 ? 'minute' : 'minutes'}`);
    return parts.length ? parts.join(' ') : `0 ${isVi ? 'phút' : 'minutes'}`;
  };

  const getPaymentStatusLabel = (status?: string) => {
    if (!status) return text.paid;
    const map: Record<string, string> = {
      paid: text.paid,
      pending: text.pending,
      partial: text.partial,
      cancelled: text.cancelled,
      included_in_room_charge: text.includedInRoomCharge,
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
    if (!method) return text.cash;
    const map: Record<string, string> = {
      cash: text.cash,
      card: isVi ? 'Thẻ tín dụng' : 'Credit card',
      bank_transfer: text.bankTransfer,
      transfer: text.bankTransfer,
      banking: text.bankTransfer,
      qr: 'QR Code',
      visa: isVi ? 'Thẻ VISA' : 'VISA card',
      momo: isVi ? 'Ví MoMo' : 'MoMo wallet',
      zalopay: 'ZaloPay',
      vnpay: 'VNPay',
    };
    return map[method.toLowerCase()] || method;
  };

  const formatBusinessAddress = (address: any): string => {
    if (!address) return text.noAddress;
    if (typeof address === 'string') return address;
    if (typeof address === 'object') {
      const { street, city, state, country, postalCode } = address as Record<string, string>;
      const parts = [street, city, state, country, postalCode].filter(Boolean);
      return parts.length ? parts.join(', ') : text.noAddress;
    }
    return text.noAddress;
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
      name: text.newProduct,
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
      Alert.alert(text.error, text.customerNameRequired);
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
        <Text style={{ color: colors.text }}>{text.loading}</Text>
      </View>
    );
  }

  if (!invoice) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Text style={{ color: colors.text }}>{text.notFound}</Text>
      </View>
    );
  }

  return (
    <AccessGuard features={['room_management']}>
      <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.card }]}>
        <View style={styles.headerLeft}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>
            {isEditMode ? text.editInvoice : text.invoiceDetail}
          </Text>
        </View>
        <TouchableOpacity onPress={() => setIsEditMode(!isEditMode)}>
          <Ionicons name={isEditMode ? "eye" : "pencil"} size={24} color={colors.primary} />
        </TouchableOpacity>
      </View>

      <View style={[styles.invoiceHeader, { backgroundColor: colors.card }]}>
        <View style={styles.businessInfo}>
          <Text style={[styles.businessName, { color: colors.text }]}>
            {invoice.businessName || selectedHotel?.name || text.hotel}
          </Text>
          <Text style={[styles.businessAddress, { color: colors.text }]}>
            {formatBusinessAddress(invoice.business_address || selectedHotel?.address)}
          </Text>
          <Text style={[styles.businessPhone, { color: colors.text }]}>
            {text.phonePrefix}: {invoice.phoneNumber || selectedHotel?.phone || text.noPhone}
          </Text>
        </View>
        <View style={styles.invoiceInfo}>
          <Text style={[styles.invoiceNumber, { color: colors.primary }]}>
            {text.numberPrefix}: {invoice.invoiceNumber || invoice.bookingId || 'N/A'}
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
      <Text style={[styles.invoiceTitle, { color: colors.text }]}>{text.invoiceTitle}</Text>

      {/* Customer Info */}
      <View style={[styles.section, { backgroundColor: colors.card }]}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>{text.customerInfo}</Text>
        
        {isEditMode ? (
          <View style={styles.formContainer}>
            <View style={styles.formRow}>
              <View style={styles.formField}>
                <Text style={[styles.label, { color: colors.text }]}>{text.bookingCode}</Text>
                <Text style={[styles.readOnlyValue, { color: colors.text }]}>
                  {invoice.bookingId || 'N/A'}
                </Text>
              </View>
              <View style={styles.formField}>
                <Text style={[styles.label, { color: colors.text }]}>{text.customerName}</Text>
                <TextInput
                  style={[styles.input, { color: colors.text, borderColor: colors.border }]}
                  value={formData.customerName}
                  onChangeText={(text) => setFormData({...formData, customerName: text})}
                  placeholder={text.enterCustomerName}
                />
              </View>
            </View>

            <View style={styles.formRow}>
              <View style={styles.formField}>
                <Text style={[styles.label, { color: colors.text }]}>{text.room}</Text>
                <Text style={[styles.readOnlyValue, { color: colors.text }]}>
                  {invoice.roomNumber || 'N/A'}
                </Text>
              </View>
              <View style={styles.formField}>
                <Text style={[styles.label, { color: colors.text }]}>{text.staff}</Text>
                <Text style={[styles.readOnlyValue, { color: colors.text }]}>
                  {invoice.staffName || text.noInfo}
                </Text>
              </View>
            </View>

            <View style={styles.formRow}>
              <View style={styles.formField}>
                <Text style={[styles.label, { color: colors.text }]}>{text.checkIn}</Text>
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
                <Text style={[styles.label, { color: colors.text }]}>{text.checkOut}</Text>
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
                <Text style={[styles.label, { color: colors.text }]}>{text.customerPhone}</Text>
                <TextInput
                  style={[styles.input, { color: colors.text, borderColor: colors.border }]}
                  value={formData.customerPhone}
                  onChangeText={(text) => setFormData({...formData, customerPhone: text})}
                  placeholder={text.enterPhone}
                  keyboardType="phone-pad"
                />
              </View>
              <View style={styles.formField}>
                <Text style={[styles.label, { color: colors.text }]}>{text.idNumber}</Text>
                <TextInput
                  style={[styles.input, { color: colors.text, borderColor: colors.border }]}
                  value={formData.customerIdNumber}
                  onChangeText={(text) => setFormData({...formData, customerIdNumber: text})}
                  placeholder={text.enterIdNumber}
                />
              </View>
            </View>

            <View style={styles.formRow}>
              <View style={styles.formField}>
                <Text style={[styles.label, { color: colors.text }]}>{text.taxCode}</Text>
                <TextInput
                  style={[styles.input, { color: colors.text, borderColor: colors.border }]}
                  value={formData.taxCode}
                  onChangeText={(text) => setFormData({...formData, taxCode: text})}
                  placeholder={text.enterTaxCode}
                />
              </View>
              <View style={styles.formField}>
                <Text style={[styles.label, { color: colors.text }]}>{text.guestSource}</Text>
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
                <Text style={[styles.label, { color: colors.text }]}>{text.paymentMethod}</Text>
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
                <Text style={[styles.label, { color: colors.text }]}>{text.address}</Text>
                <TextInput
                  style={[styles.input, { color: colors.text, borderColor: colors.border }]}
                  value={formData.customerAddress}
                  onChangeText={(text) => setFormData({...formData, customerAddress: text})}
                  placeholder={text.enterAddress}
                />
              </View>
            </View>

            <View style={styles.formRow}>
              <View style={styles.formField}>
                <Text style={[styles.label, { color: colors.text }]}>{text.notes}</Text>
                <TextInput
                  style={[styles.textArea, { color: colors.text, borderColor: colors.border }]}
                  value={formData.notes}
                  onChangeText={(text) => setFormData({...formData, notes: text})}
                  placeholder={text.enterNotes}
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
                  <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>{text.bookingCode}:</Text>
                  <Text style={[styles.detailValue, { color: colors.text }]}>{invoice.bookingId || 'N/A'}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>{text.room}:</Text>
                  <Text style={[styles.detailValue, { color: colors.text }]}>{invoice.roomNumber || 'N/A'}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>{text.checkIn}:</Text>
                  <Text style={[styles.detailValue, { color: colors.text }]}>{formatDate(formData.checkInTime)}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>{text.checkOut}:</Text>
                  <Text style={[styles.detailValue, { color: colors.text }]}>{formatDate(formData.checkOutTime)}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>{text.stayDuration}</Text>
                  <Text style={[styles.detailValue, { color: colors.text }]}>{getDurationText()}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>{text.customerPhone}:</Text>
                  <Text style={[styles.detailValue, { color: colors.text }]}>{formData.customerPhone || 'N/A'}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>{text.taxCode}:</Text>
                  <Text style={[styles.detailValue, { color: colors.text }]}>{formData.taxCode || text.noTaxCode}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>{text.address}:</Text>
                  <Text style={[styles.detailValue, { color: colors.text }]}>{formData.customerAddress || text.noTaxCode}</Text>
                </View>
              </View>
              <View style={styles.gridCol}>
                <View style={styles.detailRow}>
                  <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>{text.customer}:</Text>
                  <Text style={[styles.detailValue, { color: colors.text }]}>{formData.customerName || text.walkInGuest}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>{text.staff}:</Text>
                  <Text style={[styles.detailValue, { color: colors.text }]}>{invoice.staffName || 'N/A'}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>{text.paymentMethod}:</Text>
                  <View style={[styles.chip, { borderColor: colors.success }]}>
                    <Text style={[styles.chipText, { color: colors.success }]}>{getPaymentMethodLabel(formData.paymentMethod)}</Text>
                  </View>
                </View>
                <View style={styles.detailRow}>
                  <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>{text.idNumber}:</Text>
                  <Text style={[styles.detailValue, { color: colors.text }]}>{formData.customerIdNumber || text.noTaxCode}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>{text.guestSource}:</Text>
                  <View style={[styles.chip, { borderColor: colors.primary }]}>
                    <Text style={[styles.chipText, { color: colors.primary }]}>
                      {getPaymentMethodLabel(undefined) && (formData.guestSource === 'walkin' ? text.walkInGuest :
                       formData.guestSource === 'booking' ? (isVi ? 'Booking' : 'Booking') :
                       formData.guestSource === 'agoda' ? 'Agoda' :
                       formData.guestSource === 'traveloka' ? 'Traveloka' :
                       formData.guestSource === 'expedia' ? 'Expedia' :
                       formData.guestSource === 'trip' ? 'Trip.com' :
                       formData.guestSource === 'g2j' ? 'G2J' :
                       formData.guestSource === 'fanpage' ? 'Fanpage' :
                       formData.guestSource === 'zalo' ? 'Zalo' : text.other)}
                    </Text>
                  </View>
                </View>
                <View style={styles.detailRow}>
                  <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>{text.roomType}:</Text>
                  <Text style={[styles.detailValue, { color: colors.text }]}>{invoice.roomType || 'N/A'}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>{text.orderDate}:</Text>
                  <Text style={[styles.detailValue, { color: colors.text }]}>{formatDate(invoice.date)}</Text>
                </View>
              </View>
            </View>
            {formData.notes ? (
              <View style={[styles.detailRow, { marginTop: 8 }]}>
                <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>{text.notes}:</Text>
                <Text style={[styles.detailValue, { color: colors.text }]}>{formData.notes}</Text>
              </View>
            ) : null}
          </View>
        )}
      </View>

      {/* Products/Services Section */}
      <View style={[styles.section, { backgroundColor: colors.card }]}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>{text.productsServices}</Text>
        
        {isEditMode && (
          <TouchableOpacity style={[styles.addButton, { backgroundColor: colors.primary }]} onPress={addProduct}>
            <Ionicons name="add" size={20} color="white" />
            <Text style={styles.addButtonText}>{text.addProductService}</Text>
          </TouchableOpacity>
        )}

        <View style={styles.tableContainer}>
          <View style={[styles.tableHeader, { backgroundColor: colors.border + '30' }]}>
            <Text style={[styles.tableHeaderText, { color: colors.text, flex: 3 }]}>{text.itemName}</Text>
            <Text style={[styles.tableHeaderText, { color: colors.text, flex: 1, textAlign: 'center' }]}>{text.quantityShort}</Text>
            <Text style={[styles.tableHeaderText, { color: colors.text, flex: 2, textAlign: 'right' }]}>{text.unitPrice}</Text>
            <Text style={[styles.tableHeaderText, { color: colors.text, flex: 2, textAlign: 'right' }]}>{text.amount}</Text>
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
        <Text style={[styles.sectionTitle, { color: colors.text }]}>{text.paymentSummary}</Text>
        
        <View style={styles.summaryContainer}>
          <View style={styles.summaryRow}>
            <Text style={[styles.summaryLabel, { color: colors.text }]}>{text.roomAmount}</Text>
            <Text style={[styles.summaryValue, { color: colors.text }]}>{formatCurrency(subtotal)}</Text>
          </View>
          
          {serviceTotal > 0 && (
            <View style={styles.summaryRow}>
              <Text style={[styles.summaryLabel, { color: colors.text }]}>{text.serviceAmount}</Text>
              <Text style={[styles.summaryValue, { color: colors.text }]}>{formatCurrency(serviceTotal)}</Text>
            </View>
          )}
          
          {invoice?.additionalCharges && invoice.additionalCharges > 0 && (
            <View style={styles.summaryRow}>
              <Text style={[styles.summaryLabel, { color: colors.text }]}>{text.surcharge}</Text>
              <Text style={[styles.summaryValue, { color: colors.text }]}>{formatCurrency(invoice.additionalCharges)}</Text>
            </View>
          )}
          
          <View style={[styles.summaryRow, styles.totalRow, { borderTopColor: colors.border }]}>
            <Text style={[styles.summaryLabel, { color: colors.text, fontWeight: 'bold' }]}>{text.total}</Text>
            <Text style={[styles.summaryValue, { color: colors.text, fontWeight: 'bold' }]}>{formatCurrency(totalAmount)}</Text>
          </View>
          
          {invoice?.discount && invoice.discount > 0 && (
            <View style={styles.summaryRow}>
              <Text style={[styles.summaryLabel, { color: colors.text }]}>{text.discount}</Text>
              <Text style={[styles.summaryValue, { color: colors.danger }]}>-{formatCurrency(invoice.discount)}</Text>
            </View>
          )}
          
          {invoice?.advancePayment && invoice.advancePayment > 0 && (
            <View style={styles.summaryRow}>
              <Text style={[styles.summaryLabel, { color: colors.text }]}>{text.advancePayment}</Text>
              <Text style={[styles.summaryValue, { color: colors.text }]}>-{formatCurrency(invoice.advancePayment)}</Text>
            </View>
          )}
          
          <View style={[styles.summaryRow, styles.finalTotalRow, { borderTopColor: colors.primary }]}>
            <Text style={[styles.summaryLabel, { color: colors.text, fontWeight: 'bold', fontSize: 16 }]}>
              {finalTotalAmount >= 0 ? text.amountDue : text.refundAmount}
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
              {updateMutation.isPending ? text.saving : text.saveChanges}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Thank You */}
      <View style={[styles.thankYouSection, { backgroundColor: colors.card }]}>
        <Text style={[styles.thankYouText, { color: colors.text }]}>{text.thankYou1}</Text>
        <Text style={[styles.thankYouText, { color: colors.text }]}>{text.thankYou2}</Text>
        <Text style={[styles.printDate, { color: colors.text + '80' }]}>
          {text.printDate} {new Date().toLocaleDateString(isVi ? 'vi-VN' : 'en-US')} {new Date().toLocaleTimeString(isVi ? 'vi-VN' : 'en-US', { hour: '2-digit', minute: '2-digit' })}
        </Text>
      </View>
      </ScrollView>
    </AccessGuard>
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
