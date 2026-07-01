import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  Modal,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';

import invoiceApi from '@/services/api/invoice';
import { Invoice } from '@/types/invoice';
import { useTheme } from '@/hooks/useTheme';
import { useHotel } from '@/contexts/HotelContext';

// Component hiển thị một hóa đơn trong danh sách
const InvoiceCard = ({ item, onPress }: { item: Invoice; onPress: () => void }) => {
  const { colors } = useTheme();

  const formatCurrency = (amount: number | undefined) => {
    if (typeof amount !== 'number') return '0 ₫';
    return amount.toLocaleString('vi-VN') + ' ₫';
  };

  const formatDate = (date: string | undefined) => {
    if (!date) return '';
    try {
      return new Date(date).toLocaleDateString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch (error) {
      return '';
    }
  };

  const getStatusStyle = (status: Invoice['paymentStatus']) => {
    switch (status) {
      case 'paid':
        return { color: colors.success, text: 'Đã thanh toán' };
      case 'pending':
        return { color: colors.warning, text: 'Chưa thanh toán' };
      case 'partial':
        return { color: colors.primary, text: 'Thanh toán một phần' };
      case 'cancelled':
        return { color: colors.danger, text: 'Đã hủy' };
      case 'paid':
        return { color: colors.textSecondary, text: 'Đã tính vào tiền phòng' };
      default:
        return { color: colors.text, text: 'Không xác định' };
    }
  };

  const getPaymentMethodLabel = (method: string | undefined) => {
    if (!method) return 'Tiền mặt';
    const paymentMethods: { [key: string]: string } = {
      'cash': 'Tiền mặt',
      'card': 'Thẻ tín dụng',
      'bank_transfer': 'Chuyển khoản',
      'transfer': 'Chuyển khoản',
      'banking': 'Chuyển khoản',
      'qr': 'QR Code',
      'visa': 'Thẻ VISA',
      'momo': 'Ví MoMo',
      'zalopay': 'ZaloPay',
      'vnpay': 'VNPay'
    };
    return paymentMethods[method.toLowerCase()] || method;
  };

  const getRateTypeLabel = (rateType: string | undefined) => {
    if (!rateType) return 'Theo giờ';
    const rateTypes: { [key: string]: string } = {
      'hourly': 'Theo giờ',
      'daily': 'Ngày đêm',
      'nightly': 'Qua đêm',
      'weekly': 'Theo tuần',
      'monthly': 'Theo tháng'
    };
    return rateTypes[rateType.toLowerCase()] || rateType;
  };

  const statusStyle = getStatusStyle(item.paymentStatus);

  return (
    <TouchableOpacity style={[styles.invoiceCard, { backgroundColor: colors.card }]} onPress={onPress}>
      <View style={styles.invoiceHeader}>
        <Text style={[styles.invoiceNumber, { color: colors.primary }]}>{item.invoiceNumber}</Text>
        <Text style={[styles.invoiceDate, { color: colors.textSecondary }]}>{formatDate(item.date)}</Text>
      </View>

      {/* Thông tin khách hàng */}
      <View style={styles.customerInfo}>
        <View style={styles.infoRow}>
          <Ionicons name="person-outline" size={16} color={colors.textSecondary} />
          <Text style={[styles.customerName, { color: colors.text }]}>
            {item.customerName || item.guestInfo?.name || 'Khách lẻ'}
          </Text>
        </View>
        
        {item.roomNumber && (
          <View style={styles.infoRow}>
            <Ionicons name="key-outline" size={16} color={colors.textSecondary} />
            <Text style={[styles.roomInfo, { color: colors.text }]}>
              Phòng {item.roomNumber} {item.roomType && `(${item.roomType})`}
            </Text>
          </View>
        )}

        {item.checkInTime && item.checkOutTime && (
          <View style={styles.infoRow}>
            <Ionicons name="time-outline" size={16} color={colors.textSecondary} />
            <Text style={[styles.durationText, { color: colors.textSecondary }]}>
              {getRateTypeLabel(item.rateType)} • {formatDate(item.checkInTime)} - {formatDate(item.checkOutTime)}
            </Text>
          </View>
        )}
      </View>

      {/* Tổng tiền và trạng thái */}
      <View style={styles.invoiceDetails}>
        <View>
          <Text style={[styles.totalAmount, { color: colors.text }]}>
            {formatCurrency(item.totalAmount)}
          </Text>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={{ color: statusStyle.color, fontWeight: 'bold', fontSize: 14 }}>
            {statusStyle.text}
          </Text>
          {item.paymentMethod && (
            <Text style={[styles.paymentMethod, { color: colors.textSecondary, fontSize: 12 }]}>
              {getPaymentMethodLabel(item.paymentMethod)}
            </Text>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
};

// Component hiển thị chi tiết hóa đơn
const InvoiceDetailModal = ({ visible, invoice, onClose }: { 
  visible: boolean; 
  invoice: Invoice | null; 
  onClose: () => void; 
}) => {
  const { colors } = useTheme();
  const { selectedHotel } = useHotel();
  const { width } = useWindowDimensions();
  const isSmallScreen = width < 420;
  const labelWidth = isSmallScreen ? 110 : 130;

  const formatCurrency = (amount: number | undefined) => {
    if (typeof amount !== 'number') return '0 ₫';
    return amount.toLocaleString('vi-VN') + ' ₫';
  };

  const formatDate = (date: string | undefined) => {
    if (!date) return '';
    try {
      return new Date(date).toLocaleDateString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch (error) {
      return '';
    }
  };

  const getDurationText = (invoice: Invoice) => {
    if (invoice.checkInTime && invoice.checkOutTime) {
      const checkIn = new Date(invoice.checkInTime);
      const checkOut = new Date(invoice.checkOutTime);
      const durationMs = checkOut.getTime() - checkIn.getTime();
      const totalMinutes = Math.floor(durationMs / (1000 * 60));
      const days = Math.floor(totalMinutes / (24 * 60));
      const hours = Math.floor((totalMinutes % (24 * 60)) / 60);
      const minutes = totalMinutes % 60;

      const parts: string[] = [];
      if (days > 0) parts.push(`${days} ngày`);
      if (hours > 0) parts.push(`${hours} giờ`);
      if (minutes > 0 || (days === 0 && hours === 0)) parts.push(`${minutes} phút`);

      return parts.length > 0 ? parts.join(' ') : '0 phút';
    }
    return 'N/A';
  };

  const getRateTypeLabel = (rateType: string | undefined) => {
    if (!rateType) return 'Theo giờ';
    const rateTypes: { [key: string]: string } = {
      'hourly': 'Theo giờ',
      'daily': 'Ngày đêm',
      'nightly': 'Qua đêm',
      'weekly': 'Theo tuần',
      'monthly': 'Theo tháng'
    };
    return rateTypes[rateType.toLowerCase()] || rateType;
  };

  const getPaymentMethodLabel = (method: string | undefined) => {
    if (!method) return 'Tiền mặt';
    const paymentMethods: { [key: string]: string } = {
      'cash': 'Tiền mặt',
      'card': 'Thẻ tín dụng',
      'bank_transfer': 'Chuyển khoản',
      'transfer': 'Chuyển khoản',
      'banking': 'Chuyển khoản',
      'qr': 'QR Code',
      'visa': 'Thẻ VISA',
      'momo': 'Ví MoMo',
      'zalopay': 'ZaloPay',
      'vnpay': 'VNPay'
    };
    return paymentMethods[method.toLowerCase()] || method;
  };

  const getPaymentStatusLabel = (status: string | undefined) => {
    if (!status) return 'Đã thanh toán';
    const statusLabels: { [key: string]: string } = {
      'paid': 'Đã thanh toán',
      'pending': 'Chưa thanh toán',
      'partial': 'Thanh toán một phần',
      'cancelled': 'Đã hủy',
      'included_in_room_charge': 'Đã tính vào tiền phòng'
    };
    return statusLabels[status.toLowerCase()] || status;
  };

  const getPaymentStatusColor = (status: string | undefined) => {
    if (!status) return colors.success;
    const map: { [key: string]: string } = {
      'paid': colors.success,
      'pending': colors.warning,
      'partial': colors.primary,
      'cancelled': colors.danger,
      'included_in_room_charge': colors.textSecondary,
    };
    return map[status.toLowerCase()] || colors.textSecondary;
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

  const getGuestSourceLabel = (guestSource: string | undefined) => {
    if (!guestSource) return 'Khách lẻ';
    const sourceMap: { [key: string]: string } = {
      'walkin': 'Khách lẻ',
      'walk-in': 'Khách lẻ',
      'booking': 'Đặt phòng',
      'agoda': 'Agoda',
      'traveloka': 'Traveloka',
      'expedia': 'Expedia',
      'trip': 'Trip.com',
      'g2j': 'G2J',
      'fanpage': 'Fanpage',
      'zalo': 'Zalo',
      'other': 'Khác'
    };
    return sourceMap[guestSource] || guestSource;
  };

  if (!invoice) return null;

  // Tính toán các giá trị
  const products = invoice.products ?? [];
  const services = invoice.services ?? [];
  const subtotal = products.reduce((total, item) => {
    return total + (item.price || 0) * (item.quantity || 1);
  }, 0);

  const serviceTotal = services.reduce((total, item) => {
    return total + (item.price || 0) * (item.quantity || 1);
  }, 0);

  const additionalCharges = invoice.additionalCharges || 0;
  const discount = invoice.discount || 0;
  const advancePayment = invoice.advancePayment || 0;
  const totalAmount = subtotal + additionalCharges + serviceTotal;
  const finalTotalAmount = totalAmount - advancePayment - discount;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={[styles.modalContainer, { backgroundColor: 'rgba(0,0,0,0.5)' }]}>
        <View style={[styles.modalContent, { backgroundColor: colors.background, maxHeight: '90%' }]}>
          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Header */}
            <View style={[styles.modalHeader, { backgroundColor: colors.card }]}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>HÓA ĐƠN THANH TOÁN</Text>
              <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            {/* Header thông tin (trái: khách sạn, phải: số/ngày/trạng thái) */}
            <View style={[styles.headerInfoContainer, { backgroundColor: colors.card, margin: 16, borderRadius: 12, padding: 16, flexDirection: isSmallScreen ? 'column' : 'row', justifyContent: 'space-between', gap: 16 }]}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.businessName, { color: colors.text, fontWeight: 'bold', fontSize: 16 }]}>
                  {invoice.businessName || selectedHotel?.name || 'Khách sạn'}
                </Text>
                <Text style={[styles.businessAddress, { color: colors.textSecondary, fontSize: 14 }]}>
                  {formatBusinessAddress(invoice.business_address || selectedHotel?.address)}
                </Text>
                <Text style={[styles.businessPhone, { color: colors.textSecondary, fontSize: 14 }]}>
                  ĐT: {invoice.phoneNumber || selectedHotel?.phone || 'Chưa có số điện thoại'}
                </Text>
              </View>

              <View style={{ minWidth: isSmallScreen ? undefined : 200, alignItems: isSmallScreen ? 'flex-start' : 'flex-end', marginTop: isSmallScreen ? 12 : 0 }}>
                <Text style={[styles.invoiceNumberLarge, { color: colors.primary, fontWeight: 'bold', fontSize: 18 }]}>
                  Số: {invoice.invoiceNumber}
                </Text>
                <Text style={[styles.invoiceDateLarge, { color: colors.textSecondary, marginTop: 4 }]}>
                  {formatDate(invoice.date)}
                </Text>
                <View style={[styles.chip, { borderColor: getPaymentStatusColor(invoice.paymentStatus), marginTop: 8 }]}>
                  <Text style={[styles.chipText, { color: getPaymentStatusColor(invoice.paymentStatus) }]}>
                    {getPaymentStatusLabel(invoice.paymentStatus)}
                  </Text>
                </View>
              </View>
            </View>

            {/* Thông tin khách hàng */}
            <View style={[styles.detailGrid, { backgroundColor: colors.card, marginHorizontal: 16, borderRadius: 12, padding: 16 }]}>
              <View style={[styles.gridRow, isSmallScreen && { flexDirection: 'column' }]}>
                <View style={[styles.gridCol, isSmallScreen && { paddingRight: 0 }]}>
                  <View style={styles.detailRow}>
                    <Text style={[styles.detailLabel, { color: colors.textSecondary, width: labelWidth }]}>Mã đặt phòng:</Text>
                    <Text style={[styles.detailValue, { color: colors.text, flex: 1 }]}>N/A</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={[styles.detailLabel, { color: colors.textSecondary, width: labelWidth }]}>Phòng:</Text>
                    <Text style={[styles.detailValue, { color: colors.text, flex: 1 }]}>
                      {invoice.roomNumber} {invoice.roomType && `(${invoice.roomType})`}
                    </Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={[styles.detailLabel, { color: colors.textSecondary, width: labelWidth }]}>Ngày đến:</Text>
                    <Text style={[styles.detailValue, { color: colors.text, flex: 1 }]}>{formatDate(invoice.checkInTime)}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={[styles.detailLabel, { color: colors.textSecondary, width: labelWidth }]}>Ngày đi:</Text>
                    <Text style={[styles.detailValue, { color: colors.text, flex: 1 }]}>{formatDate(invoice.checkOutTime)}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={[styles.detailLabel, { color: colors.textSecondary, width: labelWidth }]}>Thời gian lưu trú:</Text>
                    <Text style={[styles.detailValue, { color: colors.text, flex: 1 }]}>{getDurationText(invoice)}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={[styles.detailLabel, { color: colors.textSecondary, width: labelWidth }]}>SĐT khách hàng:</Text>
                    <Text style={[styles.detailValue, { color: colors.text, flex: 1 }]}>{invoice.customerPhone || invoice.guestInfo?.phone || 'N/A'}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={[styles.detailLabel, { color: colors.textSecondary, width: labelWidth }]}>Mã số thuế:</Text>
                    <Text style={[styles.detailValue, { color: colors.text, flex: 1 }]}>{invoice.guestInfo?.tax_code || 'Không có'}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={[styles.detailLabel, { color: colors.textSecondary, width: labelWidth }]}>Địa chỉ:</Text>
                    <Text style={[styles.detailValue, { color: colors.text, flex: 1 }]}>{invoice.guestInfo?.address || 'N/A'}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={[styles.detailLabel, { color: colors.textSecondary, width: labelWidth }]}>Hình thức:</Text>
                    <Text style={[styles.detailValue, { color: colors.text, flex: 1 }]}>{getRateTypeLabel(invoice.rateType)}</Text>
                  </View>
                </View>
                <View style={[styles.gridCol, isSmallScreen && { paddingRight: 0, marginTop: 8 }]}>
                  <View style={styles.detailRow}>
                    <Text style={[styles.detailLabel, { color: colors.textSecondary, width: labelWidth }]}>Khách hàng:</Text>
                    <Text style={[styles.detailValue, { color: colors.text, flex: 1 }]}>
                      {invoice.customerName || invoice.guestInfo?.name || 'Khách lẻ'}
                    </Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={[styles.detailLabel, { color: colors.textSecondary, width: labelWidth }]}>Nhân viên:</Text>
                    <Text style={[styles.detailValue, { color: colors.text, flex: 1 }]}>{invoice.staffName || 'N/A'}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={[styles.detailLabel, { color: colors.textSecondary, width: labelWidth }]}>Phương thức thanh toán:</Text>
                    <View style={[styles.chip, { borderColor: colors.success }]}>
                      <Text style={[styles.chipText, { color: colors.success }]}>{getPaymentMethodLabel(invoice.paymentMethod)}</Text>
                    </View>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={[styles.detailLabel, { color: colors.textSecondary, width: labelWidth }]}>CCCD/CMND:</Text>
                    <Text style={[styles.detailValue, { color: colors.text, flex: 1 }]}>{invoice.guestInfo?.idNumber || 'N/A'}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={[styles.detailLabel, { color: colors.textSecondary, width: labelWidth }]}>Nguồn khách:</Text>
                    <View style={[styles.chip, { borderColor: colors.primary }]}>
                      <Text style={[styles.chipText, { color: colors.primary }]}>{getGuestSourceLabel(invoice.guestSource || invoice.guestInfo?.guestSource)}</Text>
                    </View>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={[styles.detailLabel, { color: colors.textSecondary, width: labelWidth }]}>Loại phòng:</Text>
                    <Text style={[styles.detailValue, { color: colors.text, flex: 1 }]}>{invoice.roomType || 'N/A'}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={[styles.detailLabel, { color: colors.textSecondary, width: labelWidth }]}>Ngày đơn:</Text>
                    <Text style={[styles.detailValue, { color: colors.text, flex: 1 }]}>{formatDate(invoice.date)}</Text>
                  </View>
                </View>
              </View>
            </View>

            {/* Chi tiết sản phẩm/dịch vụ */}
            {(products.length > 0 || services.length > 0) && (
              <View style={[styles.productsSection, { backgroundColor: colors.card, margin: 16, borderRadius: 12, padding: 16 }]}>
                <Text style={[styles.sectionTitle, { color: colors.text, fontWeight: 'bold', fontSize: 16, marginBottom: 12 }]}>
                  Chi tiết dịch vụ
                </Text>
                
                {/* Sản phẩm */}
                {products.length > 0 && (
                  <View style={styles.productTable}>
                    <View style={styles.tableHeader}>
                      <Text style={[styles.tableHeaderText, { color: colors.textSecondary, flex: 2 }]}>Tên hàng (Product)</Text>
                      <Text style={[styles.tableHeaderText, { color: colors.textSecondary, flex: 1, textAlign: 'center' }]}>Số lượng (Quantity)</Text>
                      <Text style={[styles.tableHeaderText, { color: colors.textSecondary, flex: 2, textAlign: 'right' }]}>Đơn giá (Unit)</Text>
                      <Text style={[styles.tableHeaderText, { color: colors.textSecondary, flex: 2, textAlign: 'right' }]}>Thành tiền (Price)</Text>
                    </View>
                    {products.map((product, index) => (
                      <View key={index} style={styles.tableRow}>
                        <Text style={[styles.tableCell, { color: colors.text, flex: 2 }]}>{product.name}</Text>
                        <Text style={[styles.tableCell, { color: colors.text, flex: 1, textAlign: 'center' }]}>
                          {product.quantity || 1}
                        </Text>
                        <Text style={[styles.tableCell, { color: colors.text, flex: 2, textAlign: 'right' }]}>
                          {formatCurrency(product.price)}
                        </Text>
                        <Text style={[styles.tableCell, { color: colors.text, flex: 2, textAlign: 'right', fontWeight: 'bold' }]}>
                          {formatCurrency((product.price || 0) * (product.quantity || 1))}
                        </Text>
                      </View>
                    ))}
                  </View>
                )}

                {/* Dịch vụ */}
                {services.length > 0 && (
                  <View style={[styles.serviceTable, products.length > 0 && { marginTop: 16 }]}>
                    <View style={styles.tableHeader}>
                      <Text style={[styles.tableHeaderText, { color: colors.textSecondary, flex: 2 }]}>Dịch vụ</Text>
                      <Text style={[styles.tableHeaderText, { color: colors.textSecondary, flex: 1, textAlign: 'center' }]}>Số lượng</Text>
                      <Text style={[styles.tableHeaderText, { color: colors.textSecondary, flex: 2, textAlign: 'right' }]}>Đơn giá</Text>
                      <Text style={[styles.tableHeaderText, { color: colors.textSecondary, flex: 2, textAlign: 'right' }]}>Thành tiền</Text>
                    </View>
                    {services.map((service, index) => (
                      <View key={index} style={styles.tableRow}>
                        <Text style={[styles.tableCell, { color: colors.text, flex: 2 }]}>{service.name}</Text>
                        <Text style={[styles.tableCell, { color: colors.text, flex: 1, textAlign: 'center' }]}>
                          {service.quantity || 1}
                        </Text>
                        <Text style={[styles.tableCell, { color: colors.text, flex: 2, textAlign: 'right' }]}>
                          {formatCurrency(service.price)}
                        </Text>
                        <Text style={[styles.tableCell, { color: colors.text, flex: 2, textAlign: 'right', fontWeight: 'bold' }]}>
                          {formatCurrency((service.price || 0) * (service.quantity || 1))}
                        </Text>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            )}

            {/* Tổng hợp thanh toán */}
            <View style={[styles.paymentSummary, { backgroundColor: colors.card, margin: 16, borderRadius: 12, padding: 16 }]}>
              <Text style={[styles.sectionTitle, { color: colors.text, fontWeight: 'bold', fontSize: 16, marginBottom: 12 }]}>
                Tổng hợp thanh toán
              </Text>
              
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

              {additionalCharges > 0 && (
                <View style={styles.summaryRow}>
                  <Text style={[styles.summaryLabel, { color: colors.text }]}>Phụ thu:</Text>
                  <Text style={[styles.summaryValue, { color: colors.text }]}>{formatCurrency(additionalCharges)}</Text>
                </View>
              )}

              <View style={[styles.summaryRow, styles.totalRow, { borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 8 }]}>
                <Text style={[styles.summaryLabel, { color: colors.text, fontWeight: 'bold' }]}>Tổng cộng:</Text>
                <Text style={[styles.summaryValue, { color: colors.text, fontWeight: 'bold' }]}>{formatCurrency(totalAmount)}</Text>
              </View>

              {discount > 0 && (
                <View style={styles.summaryRow}>
                  <Text style={[styles.summaryLabel, { color: colors.text }]}>Giảm giá:</Text>
                  <Text style={[styles.summaryValue, { color: colors.danger }]}>-{formatCurrency(discount)}</Text>
                </View>
              )}

              {advancePayment > 0 && (
                <View style={styles.summaryRow}>
                  <Text style={[styles.summaryLabel, { color: colors.text }]}>Đặt trước:</Text>
                  <Text style={[styles.summaryValue, { color: colors.text }]}>-{formatCurrency(advancePayment)}</Text>
                </View>
              )}

              <View style={[styles.summaryRow, styles.finalTotalRow, { borderTopWidth: 2, borderTopColor: colors.primary, paddingTop: 8, marginTop: 8 }]}>
                <Text style={[styles.summaryLabel, { color: colors.text, fontWeight: 'bold', fontSize: 16 }]}>Còn phải trả:</Text>
                <Text style={[styles.summaryValue, { color: finalTotalAmount >= 0 ? colors.danger : colors.success, fontWeight: 'bold', fontSize: 16 }]}>
                  {formatCurrency(Math.abs(finalTotalAmount))}
                </Text>
              </View>

              {finalTotalAmount < 0 && (
                <Text style={[styles.refundText, { color: colors.success, textAlign: 'right', fontSize: 12, marginTop: 4 }]}>
                  (Khách đã trả thừa)
                </Text>
              )}
            </View>

            {/* Ghi chú */}
            {invoice.notes && (
              <View style={[styles.notesSection, { backgroundColor: colors.card, marginHorizontal: 16, borderRadius: 12, padding: 16, marginBottom: 16 }]}>
                <Text style={[styles.sectionTitle, { color: colors.text, fontWeight: 'bold', fontSize: 16, marginBottom: 8 }]}>
                  Ghi chú
                </Text>
                <Text style={[styles.notesText, { color: colors.textSecondary }]}>{invoice.notes}</Text>
              </View>
            )}

            {/* Lời cảm ơn */}
            <View style={[styles.thankYouSection, { margin: 16, marginBottom: 8 }]}>
              <Text style={[styles.thankYouText, { color: colors.textSecondary, textAlign: 'center', fontStyle: 'italic' }]}>
                Cảm ơn quý khách và hẹn gặp lại!
              </Text>
              <Text style={[styles.invoiceDateText, { color: colors.textSecondary, textAlign: 'center', fontSize: 12, marginTop: 8 }]}>
                In lúc: {new Date().toLocaleString('vi-VN')}
              </Text>
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 16, marginBottom: 24 }}>
              <TouchableOpacity style={[styles.actionButtonPrimary, { backgroundColor: colors.primary }]} onPress={() => Alert.alert('In hóa đơn')}>
                <Ionicons name="print" size={18} color="#FFF" />
                <Text style={[styles.actionButtonText, { color: '#FFF' }]}>In hóa đơn</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.actionButton, { borderColor: colors.border }]} onPress={() => Alert.alert('Tải xuống PDF')}>
                <Ionicons name="download-outline" size={18} color={colors.text} />
                <Text style={[styles.actionButtonText, { color: colors.text }]}>Tải xuống PDF</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

export default function InvoiceManagementScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { selectedHotelId, isLoading: hotelContextLoading } = useHotel();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [modalVisible, setModalVisible] = useState(false);

  const { data: invoices = [], isLoading, isError, refetch } = useQuery({
    queryKey: ['invoices', selectedHotelId],
    queryFn: () => {
      // Chặn lại nếu hotelId rỗng để tránh gọi API lên server mà không có hotelId
      if (!selectedHotelId || selectedHotelId.trim() === '') {
        return [];
      }
      // Truyền hotelId dưới dạng query parameter
      return invoiceApi.getInvoices({ hotelId: selectedHotelId }).then(res => res.data || []);
    },
    // Chỉ bật query khi hotelId đã được khôi phục từ AsyncStorage
    enabled: !!selectedHotelId && selectedHotelId.trim() !== '' && !hotelContextLoading,
    retry: 1,
  });

  const handleCreateInvoice = () => {
    // Navigate to a new screen for creating invoices
    router.push('/management/invoice-editor');
  };

  // Debug log khi dữ liệu thay đổi
  useEffect(() => {
    console.log('[v0] Invoice screen loaded. selectedHotelId:', selectedHotelId, 'hotelContextLoading:', hotelContextLoading, 'invoices count:', invoices.length);
  }, [selectedHotelId, hotelContextLoading, invoices]);

  const handleViewInvoice = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setModalVisible(true);
  };

  const closeModal = () => {
    setModalVisible(false);
    setSelectedInvoice(null);
  };

  const filteredInvoices = invoices.filter((invoice: Invoice) =>
    invoice.invoiceNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
    invoice.customerName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    invoice.guestInfo?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    invoice.roomNumber?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="document-text-outline" size={64} color="#C7C7CC" />
      <Text style={styles.emptyText}>Không có hóa đơn nào</Text>
    </View>
  );

  if (isError) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={{ color: colors.danger }}>Lỗi khi tải dữ liệu.</Text>
        <TouchableOpacity onPress={() => refetch()} style={styles.createButton}>
            <Text style={styles.createButtonText}>Thử lại</Text>
        </TouchableOpacity>
      </View>
    )
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.card }]}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Quản Lý Hóa Đơn</Text>
      </View>

      <View style={[styles.searchContainer, { backgroundColor: colors.card }]}>
        <Ionicons name="search" size={20} color={colors.textSecondary} style={styles.searchIcon} />
        <TextInput
          style={[styles.searchInput, { color: colors.text }]}
          placeholder="Tìm hóa đơn, tên khách, phòng..."
          placeholderTextColor={colors.textSecondary}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {isLoading ? (
         <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 20 }}/>
      ) : (
        <FlatList
            data={filteredInvoices}
            renderItem={({ item }) => <InvoiceCard item={item} onPress={() => handleViewInvoice(item)} />}
            keyExtractor={(item, index) => item._id ? String(item._id) : `invoice-${index}`}
            contentContainerStyle={styles.invoiceList}
            ListEmptyComponent={renderEmpty}
            refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} />}
        />
      )}

      {/* Modal chi tiết hóa đơn */}
      <InvoiceDetailModal 
        visible={modalVisible}
        invoice={selectedInvoice}
        onClose={closeModal}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  createButtonText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 4,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: 16,
    paddingHorizontal: 12,
    borderRadius: 10,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    height: 40,
  },
  invoiceList: {
    paddingHorizontal: 16,
    paddingBottom: 16,
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
  // Styles for InvoiceCard
  invoiceCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  invoiceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  invoiceNumber: {
    fontSize: 16,
    fontWeight: '600',
  },
  invoiceDate: {
    fontSize: 13,
  },
  customerInfo: {
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  customerName: {
    fontSize: 15,
    marginLeft: 8,
    fontWeight: '500',
  },
  roomInfo: {
    fontSize: 14,
    marginLeft: 8,
  },
  durationText: {
    fontSize: 13,
    marginLeft: 8,
  },
  invoiceDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E5EA',
  },
  totalAmount: {
    fontSize: 17,
    fontWeight: 'bold',
  },
  remainingAmount: {
    fontSize: 13,
    fontWeight: '500',
    marginTop: 2,
  },
  paymentMethod: {
    marginTop: 2,
  },
  // Modal styles
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '95%',
    borderRadius: 12,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  closeButton: {
    padding: 4,
  },
  detailGrid: {
    marginBottom: 0,
  },
  headerInfoContainer: {
    marginBottom: 0,
  },
  gridRow: {
    flexDirection: 'row',
  },
  gridCol: {
    flex: 1,
    paddingRight: 12,
  },
  businessInfo: {
    marginBottom: 0,
  },
  businessName: {
    marginBottom: 4,
  },
  businessAddress: {
    marginBottom: 2,
  },
  businessPhone: {
    marginBottom: 0,
  },
  invoiceInfo: {
    marginBottom: 0,
  },
  invoiceHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  invoiceNumberLarge: {
    flex: 1,
  },
  invoiceDateLarge: {
    fontSize: 14,
  },
  paymentStatus: {
    marginBottom: 0,
  },
  customerDetailInfo: {
    marginBottom: 0,
  },
  sectionTitle: {
    marginBottom: 0,
  },
  detailRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  detailLabel: {
    fontSize: 14,
  },
  detailValue: {
    fontSize: 14,
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
  productsSection: {
    marginBottom: 0,
  },
  productTable: {
    marginBottom: 0,
  },
  serviceTable: {
    marginBottom: 0,
  },
  tableHeader: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
    paddingBottom: 8,
    marginBottom: 8,
  },
  tableHeaderText: {
    fontSize: 12,
    fontWeight: '600',
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 6,
  },
  tableCell: {
    fontSize: 14,
  },
  paymentSummary: {
    marginBottom: 0,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  summaryLabel: {
    fontSize: 14,
  },
  summaryValue: {
    fontSize: 14,
  },
  totalRow: {
    marginTop: 8,
  },
  finalTotalRow: {
    marginTop: 8,
  },
  refundText: {
    marginBottom: 0,
  },
  notesSection: {
    marginBottom: 0,
  },
  notesText: {
    fontSize: 14,
    lineHeight: 20,
  },
  thankYouSection: {
    marginBottom: 0,
  },
  thankYouText: {
    marginBottom: 0,
  },
  invoiceDateText: {
    marginBottom: 0,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    gap: 6,
  },
  actionButtonPrimary: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  actionButtonDanger: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    gap: 6,
  },
  actionButtonText: {
    fontSize: 12,
    fontWeight: '600',
  },
});