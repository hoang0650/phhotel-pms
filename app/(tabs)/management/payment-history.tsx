import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Linking,
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
import { paymentsApi } from '@/services/api';
import type {
  BankHubBankAccount,
  HotelPaymentSettings,
  PaymentHistoryItem,
} from '@/services/api/payments';
import { useAuth } from '@/contexts/AuthContext';
import { useHotel } from '@/contexts/HotelContext';
import { useLanguage } from '@/contexts/LanguageContext';

const REFRESH_INTERVAL = 30000;

type PaymentTab = 'all' | 'sepay' | 'paypal' | 'crypto';
type NormalizedStatus = 'paid' | 'pending' | 'unpaid' | 'refunded' | 'cancelled';

type PaymentCardItem = PaymentHistoryItem & {
  key: string;
  methodKey: Exclude<PaymentTab, 'all'>;
  paymentMethodLabel: string;
  paymentMethodColor: string;
  paymentMethodIcon: keyof typeof Ionicons.glyphMap;
};

const DEFAULT_SETTINGS_FALLBACK: HotelPaymentSettings = {
  enablePayPalPayment: false,
  enableCryptoPayment: false,
  enableSePayPayment: true,
  enablePaymentSpeaker: false,
};

const STATUS_FILTERS: Array<{ key: 'all' | NormalizedStatus; label: string }> = [
  { key: 'all', label: 'Tất cả trạng thái' },
  { key: 'paid', label: 'Hoàn thành' },
  { key: 'pending', label: 'Đang xử lý' },
  { key: 'unpaid', label: 'Thất bại' },
  { key: 'refunded', label: 'Hoàn tiền' },
  { key: 'cancelled', label: 'Đã hủy' },
];

const getPaymentDate = (item: PaymentHistoryItem): string =>
  String(item.createdAt || item.created_at || item.completedAt || '');

const toNumber = (value: unknown): number => {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
};

const normalizeStatus = (status?: string): NormalizedStatus => {
  const raw = String(status || '').trim().toLowerCase();
  const map: Record<string, NormalizedStatus> = {
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
  return map[raw] || 'pending';
};

const getStatusLabel = (status: NormalizedStatus): string => {
  if (status === 'paid') return 'Hoàn thành';
  if (status === 'pending') return 'Đang xử lý';
  if (status === 'unpaid') return 'Thất bại';
  if (status === 'refunded') return 'Hoàn tiền';
  return 'Đã hủy';
};

const getStatusStyle = (status: NormalizedStatus) => {
  if (status === 'paid') return [styles.statusBadge, styles.statusPaidBadge, styles.statusPaidText] as const;
  if (status === 'pending') return [styles.statusBadge, styles.statusPendingBadge, styles.statusPendingText] as const;
  if (status === 'refunded') return [styles.statusBadge, styles.statusRefundedBadge, styles.statusRefundedText] as const;
  if (status === 'cancelled') return [styles.statusBadge, styles.statusCancelledBadge, styles.statusCancelledText] as const;
  return [styles.statusBadge, styles.statusUnpaidBadge, styles.statusUnpaidText] as const;
};

const formatCurrency = (amount: number, currency: string = 'VND') => {
  if (currency === 'USD') {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount || 0);
  }

  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount || 0);
};

const formatDate = (dateString?: string) => {
  if (!dateString) return 'N/A';
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return 'N/A';
  return date.toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const getDisplayAmount = (item: PaymentHistoryItem) => {
  const transferAmount = toNumber(item.paymentGatewayResponse?.transferAmount);
  const amount = toNumber(item.amount);
  const totalAmount = toNumber(item.totalAmount);
  return transferAmount || amount || totalAmount || 0;
};

const getAmountCurrency = (item: PaymentHistoryItem) =>
  String(item.currency || (item.paymentMethod === 'paypal' ? 'USD' : 'VND'));

const makePaymentItems = (
  source: PaymentHistoryItem[],
  methodKey: Exclude<PaymentTab, 'all'>
): PaymentCardItem[] =>
  source.map((item, index) => {
    if (methodKey === 'paypal') {
      return {
        ...item,
        key: String(item._id || item.id || item.paypalOrderId || `paypal-${index}`),
        methodKey,
        paymentMethodLabel: 'PayPal',
        paymentMethodColor: '#0070ba',
        paymentMethodIcon: 'logo-paypal',
      };
    }

    if (methodKey === 'crypto') {
      return {
        ...item,
        key: String(item._id || item.id || item.cryptoTransactionHash || `crypto-${index}`),
        methodKey,
        paymentMethodLabel: item.cryptoNetwork ? `Crypto USDT (${item.cryptoNetwork})` : 'Crypto USDT',
        paymentMethodColor: '#26a17b',
        paymentMethodIcon: 'logo-bitcoin',
      };
    }

    return {
      ...item,
      key: String(item._id || item.id || item.transactionId || `sepay-${index}`),
      methodKey,
      paymentMethodLabel: 'SePay',
      paymentMethodColor: '#667eea',
      paymentMethodIcon: 'card-outline',
    };
  });

export default function PaymentHistoryScreen() {
  const { selectedHotelId } = useHotel();
  const { user } = useAuth();
  const { language, t } = useLanguage();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | NormalizedStatus>('all');
  const [activeTab, setActiveTab] = useState<PaymentTab>('all');
  const [isOpeningBankHub, setIsOpeningBankHub] = useState(false);

  const userId = String(user?.id || '');

  const text = useMemo(() => ({
    title: t('paymentHistory'),
    subtitle: language === 'vi' ? 'Lịch sử thanh toán và giao dịch' : 'Payment and transaction history',
    refresh: language === 'vi' ? 'Làm mới' : 'Refresh',
    bankLink: language === 'vi' ? 'Liên kết ngân hàng' : 'Link bank',
    bankHubPending: language === 'vi' ? 'Chưa xác thực BankHub' : 'BankHub not verified',
    bankHubPendingDesc: language === 'vi'
      ? 'Cần liên kết tài khoản ngân hàng qua SePay BankHub để xem đầy đủ giao dịch ngân hàng.'
      : 'Link a bank account via SePay BankHub to view full bank transaction data.',
    bankHubVerified: language === 'vi' ? 'BankHub đã xác thực' : 'BankHub verified',
    bankHubVerifiedDesc: language === 'vi' ? 'Đã liên kết' : 'Linked',
    searchPlaceholder: language === 'vi'
      ? 'Tìm theo gói, mã giao dịch, network, phương thức...'
      : 'Search by package, transaction id, network, method...',
    noHotel: language === 'vi' ? 'Chưa chọn khách sạn để xem lịch sử thanh toán.' : 'Select a hotel to view payment history.',
    noPayments: language === 'vi' ? 'Chưa có lịch sử thanh toán' : 'No payment history yet',
    autoRefresh: language === 'vi' ? 'Tự động cập nhật mỗi 30 giây' : 'Auto refresh every 30 seconds',
    packageLabel: language === 'vi' ? 'Gói' : 'Package',
    amountLabel: language === 'vi' ? 'Số tiền' : 'Amount',
    dateLabel: language === 'vi' ? 'Ngày tạo' : 'Created at',
    completedAtLabel: language === 'vi' ? 'Ngày hoàn thành' : 'Completed at',
    transactionLabel: language === 'vi' ? 'Mã GD' : 'Transaction',
    orderLabel: language === 'vi' ? 'Order ID' : 'Order ID',
    hashLabel: language === 'vi' ? 'TX Hash' : 'TX Hash',
    networkLabel: language === 'vi' ? 'Network' : 'Network',
    receivedAmountLabel: language === 'vi' ? 'Số tiền nhận được' : 'Received amount',
    paymentSpeakerLabel: language === 'vi' ? 'Loa thông báo đang bật' : 'Payment speaker enabled',
    openBankHubFailed: language === 'vi' ? 'Không thể mở liên kết BankHub.' : 'Unable to open BankHub link.',
    bankHubUnavailable: language === 'vi' ? 'Không lấy được liên kết BankHub.' : 'Unable to load BankHub link.',
    allTab: language === 'vi' ? 'Tất cả' : 'All',
    sepayTab: 'SePay',
    paypalTab: 'PayPal',
    cryptoTab: language === 'vi' ? 'Crypto USDT' : 'Crypto USDT',
  }), [language, t]);

  const hotelSettingsQuery = useQuery({
    queryKey: ['hotelPaymentSettings', selectedHotelId],
    queryFn: () => (selectedHotelId
      ? paymentsApi.getHotelPaymentSettings(selectedHotelId)
      : Promise.resolve(DEFAULT_SETTINGS_FALLBACK)),
    enabled: !!selectedHotelId,
    staleTime: REFRESH_INTERVAL,
  });

  const paymentSettings = hotelSettingsQuery.data || DEFAULT_SETTINGS_FALLBACK;
  const enableSePayPayment = paymentSettings.enableSePayPayment !== false;
  const enablePayPalPayment = !!paymentSettings.enablePayPalPayment;
  const enableCryptoPayment = !!paymentSettings.enableCryptoPayment;

  const bankHubStatusQuery = useQuery({
    queryKey: ['bankHubStatus'],
    queryFn: () => paymentsApi.getBankHubStatus(),
    staleTime: REFRESH_INTERVAL,
    refetchInterval: REFRESH_INTERVAL,
  });

  const bankHubVerified = !!(bankHubStatusQuery.data?.configured && bankHubStatusQuery.data?.authenticated);

  const bankHubAccountsQuery = useQuery({
    queryKey: ['bankHubAccounts', bankHubStatusQuery.data?.company_xid],
    queryFn: () => paymentsApi.getBankHubBankAccounts(bankHubStatusQuery.data?.company_xid),
    enabled: bankHubVerified,
    staleTime: REFRESH_INTERVAL,
  });

  const sepayQuery = useQuery({
    queryKey: ['paymentHistory', 'sepay', userId],
    queryFn: () => (userId ? paymentsApi.getSePayPaymentHistory({ userId, limit: 100 }) : Promise.resolve([])),
    enabled: !!userId && enableSePayPayment,
    staleTime: REFRESH_INTERVAL,
    refetchInterval: REFRESH_INTERVAL,
  });

  const paypalQuery = useQuery({
    queryKey: ['paymentHistory', 'paypal', userId],
    queryFn: () => (userId ? paymentsApi.getPayPalPaymentHistory({ userId, limit: 100 }) : Promise.resolve([])),
    enabled: !!userId && enablePayPalPayment,
    staleTime: REFRESH_INTERVAL,
    refetchInterval: REFRESH_INTERVAL,
  });

  const cryptoQuery = useQuery({
    queryKey: ['paymentHistory', 'crypto', userId],
    queryFn: () => (userId ? paymentsApi.getCryptoPaymentHistory({ userId, limit: 100 }) : Promise.resolve([])),
    enabled: !!userId && enableCryptoPayment,
    staleTime: REFRESH_INTERVAL,
    refetchInterval: REFRESH_INTERVAL,
  });

  const sepayPayments = useMemo(() => makePaymentItems(sepayQuery.data || [], 'sepay'), [sepayQuery.data]);
  const paypalPayments = useMemo(() => makePaymentItems(paypalQuery.data || [], 'paypal'), [paypalQuery.data]);
  const cryptoPayments = useMemo(() => makePaymentItems(cryptoQuery.data || [], 'crypto'), [cryptoQuery.data]);

  const allPayments = useMemo(
    () =>
      [...sepayPayments, ...paypalPayments, ...cryptoPayments].sort(
        (a, b) => new Date(getPaymentDate(b)).getTime() - new Date(getPaymentDate(a)).getTime()
      ),
    [cryptoPayments, paypalPayments, sepayPayments]
  );

  const availableTabs = useMemo(() => {
    const tabs: Array<{ key: PaymentTab; label: string; count: number }> = [
      { key: 'all', label: text.allTab, count: allPayments.length },
    ];
    if (enableSePayPayment) {
      tabs.push({ key: 'sepay', label: text.sepayTab, count: sepayPayments.length });
    }
    if (enablePayPalPayment) {
      tabs.push({ key: 'paypal', label: text.paypalTab, count: paypalPayments.length });
    }
    if (enableCryptoPayment) {
      tabs.push({ key: 'crypto', label: text.cryptoTab, count: cryptoPayments.length });
    }
    return tabs;
  }, [
    allPayments.length,
    cryptoPayments.length,
    enableCryptoPayment,
    enablePayPalPayment,
    enableSePayPayment,
    paypalPayments.length,
    sepayPayments.length,
    text.allTab,
    text.cryptoTab,
    text.paypalTab,
    text.sepayTab,
  ]);

  useEffect(() => {
    if (!availableTabs.some((item) => item.key === activeTab)) {
      setActiveTab('all');
    }
  }, [activeTab, availableTabs]);

  const activeData = useMemo(() => {
    if (activeTab === 'sepay') return sepayPayments;
    if (activeTab === 'paypal') return paypalPayments;
    if (activeTab === 'crypto') return cryptoPayments;
    return allPayments;
  }, [activeTab, allPayments, cryptoPayments, paypalPayments, sepayPayments]);

  const filteredPayments = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();

    return activeData.filter((item) => {
      const normalized = normalizeStatus(item.status);
      if (statusFilter !== 'all' && normalized !== statusFilter) {
        return false;
      }

      if (!normalizedQuery) {
        return true;
      }

      const haystack = [
        item.paymentMethodLabel,
        item.packageId?.name,
        item.transactionId,
        item.paypalOrderId,
        item.cryptoTransactionHash,
        item.cryptoNetwork,
        item.status,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return haystack.includes(normalizedQuery);
    });
  }, [activeData, searchQuery, statusFilter]);

  const refreshAllData = useCallback(async () => {
    await Promise.all([
      hotelSettingsQuery.refetch(),
      bankHubStatusQuery.refetch(),
      bankHubAccountsQuery.refetch(),
      sepayQuery.refetch(),
      paypalQuery.refetch(),
      cryptoQuery.refetch(),
    ]);
  }, [
    bankHubAccountsQuery,
    bankHubStatusQuery,
    cryptoQuery,
    hotelSettingsQuery,
    paypalQuery,
    sepayQuery,
  ]);

  const openBankHubLink = useCallback(async () => {
    setIsOpeningBankHub(true);
    try {
      const result = await paymentsApi.createBankHubLinkToken();
      const url = String(result?.hosted_link_url || '').trim();
      if (!url) {
        Alert.alert(text.title, text.bankHubUnavailable);
        return;
      }
      await Linking.openURL(url);
    } catch (error) {
      Alert.alert(text.title, text.openBankHubFailed);
    } finally {
      setIsOpeningBankHub(false);
    }
  }, [text.bankHubUnavailable, text.openBankHubFailed, text.title]);

  const isLoading =
    hotelSettingsQuery.isLoading ||
    sepayQuery.isLoading ||
    (enablePayPalPayment && paypalQuery.isLoading) ||
    (enableCryptoPayment && cryptoQuery.isLoading);

  if (!selectedHotelId) {
    return (
      <View style={styles.emptyStateScreen}>
        <Ionicons name="business-outline" size={52} color="#8E8E93" />
        <Text style={styles.emptyTitle}>{text.noHotel}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerTopRow}>
          <View style={styles.headerTitleWrap}>
            <Text style={styles.headerTitle}>{text.title}</Text>
            <Text style={styles.headerSubtitle}>{text.subtitle}</Text>
          </View>
          <TouchableOpacity
            style={styles.refreshButton}
            onPress={refreshAllData}
            disabled={isLoading}
          >
            <Ionicons name="reload-outline" size={18} color="#007AFF" />
            <Text style={styles.refreshButtonText}>{text.refresh}</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.statText}>Tổng: {filteredPayments.length} giao dịch</Text>
      </View>

      <ScrollView style={styles.paymentList} contentContainerStyle={styles.paymentListContent}>
        <View style={styles.quickActionsRow}>
          <TouchableOpacity
            style={styles.secondaryActionButton}
            onPress={openBankHubLink}
            disabled={isOpeningBankHub}
          >
            {isOpeningBankHub ? (
              <ActivityIndicator size="small" color="#007AFF" />
            ) : (
              <Ionicons name="business-outline" size={18} color="#007AFF" />
            )}
            <Text style={styles.secondaryActionText}>{text.bankLink}</Text>
          </TouchableOpacity>
          {paymentSettings.enablePaymentSpeaker ? (
            <View style={styles.speakerBadge}>
              <Ionicons name="volume-high-outline" size={16} color="#0A7F3F" />
              <Text style={styles.speakerBadgeText}>{text.paymentSpeakerLabel}</Text>
            </View>
          ) : null}
        </View>

        {bankHubStatusQuery.data && !bankHubVerified ? (
          <View style={styles.warningCard}>
            <View style={styles.bannerHeader}>
              <Ionicons name="warning-outline" size={20} color="#B26A00" />
              <Text style={styles.warningTitle}>{text.bankHubPending}</Text>
            </View>
            <Text style={styles.warningDescription}>{text.bankHubPendingDesc}</Text>
            <TouchableOpacity style={styles.bannerButton} onPress={openBankHubLink}>
              <Text style={styles.bannerButtonText}>{text.bankLink}</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {bankHubVerified ? (
          <View style={styles.successCard}>
            <View style={styles.bannerHeader}>
              <Ionicons name="checkmark-circle-outline" size={20} color="#0A7F3F" />
              <Text style={styles.successTitle}>{text.bankHubVerified}</Text>
            </View>
            <Text style={styles.successDescription}>
              {text.bankHubVerifiedDesc} {bankHubAccountsQuery.data?.length || 0} tài khoản ngân hàng.
            </Text>
            <View style={styles.accountList}>
              {(bankHubAccountsQuery.data || []).slice(0, 3).map((account: BankHubBankAccount, index: number) => (
                <Text key={`${account.xid || account.account_number || index}`} style={styles.accountItem}>
                  {`${account.bank_brand_name || 'Bank'} - ${account.account_number || 'N/A'}`}
                </Text>
              ))}
            </View>
          </View>
        ) : null}

        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color="#8E8E93" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder={text.searchPlaceholder}
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor="#8E8E93"
          />
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabScroll}>
          <View style={styles.tabContainer}>
            {availableTabs.map((tab) => {
              const isActive = activeTab === tab.key;
              return (
                <TouchableOpacity
                  key={tab.key}
                  style={[styles.tabChip, isActive && styles.tabChipActive]}
                  onPress={() => setActiveTab(tab.key)}
                >
                  <Text style={[styles.tabChipText, isActive && styles.tabChipTextActive]}>
                    {`${tab.label} (${tab.count})`}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </ScrollView>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
          <View style={styles.statusFilterContainer}>
            {STATUS_FILTERS.map((item) => {
              const isActive = statusFilter === item.key;
              return (
                <TouchableOpacity
                  key={item.key}
                  style={[styles.statusFilterChip, isActive && styles.statusFilterChipActive]}
                  onPress={() => setStatusFilter(item.key)}
                >
                  <Text style={[styles.statusFilterText, isActive && styles.statusFilterTextActive]}>
                    {item.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </ScrollView>

        {activeTab === 'sepay' ? (
          <View style={styles.autoRefreshRow}>
            <Ionicons name="information-circle-outline" size={16} color="#667eea" />
            <Text style={styles.autoRefreshText}>{text.autoRefresh}</Text>
          </View>
        ) : null}

        {isLoading && filteredPayments.length === 0 ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#007AFF" />
            <Text style={styles.loadingText}>{t('loadingData')}</Text>
          </View>
        ) : null}

        {!isLoading && filteredPayments.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="wallet-outline" size={64} color="#C7C7CC" />
            <Text style={styles.emptyText}>{text.noPayments}</Text>
          </View>
        ) : null}

        {filteredPayments.map((item) => {
          const normalizedStatus = normalizeStatus(item.status);
          const [badgeStyle, badgeColorStyle, badgeTextStyle] = getStatusStyle(normalizedStatus);
          const amount = getDisplayAmount(item);
          const currency = getAmountCurrency(item);

          return (
            <View key={item.key} style={styles.paymentCard}>
              <View style={styles.paymentHeader}>
                <View style={styles.methodMeta}>
                  <View style={[styles.methodIconWrap, { backgroundColor: `${item.paymentMethodColor}18` }]}>
                    <Ionicons name={item.paymentMethodIcon} size={18} color={item.paymentMethodColor} />
                  </View>
                  <View style={styles.methodTextWrap}>
                    <Text style={styles.methodTitle}>{item.paymentMethodLabel}</Text>
                    <Text style={styles.packageName}>{item.packageId?.name || 'N/A'}</Text>
                  </View>
                </View>
                <View style={[badgeStyle, badgeColorStyle]}>
                  <Text style={[styles.statusText, badgeTextStyle]}>{getStatusLabel(normalizedStatus)}</Text>
                </View>
              </View>

              <View style={styles.paymentDetails}>
                <View style={styles.amountRow}>
                  <Text style={styles.amountLabel}>{text.packageLabel}:</Text>
                  <Text style={styles.amountValue}>{item.packageId?.name || 'N/A'}</Text>
                </View>
                <View style={styles.amountRow}>
                  <Text style={styles.amountLabel}>{text.amountLabel}:</Text>
                  <Text style={styles.amountValue}>{formatCurrency(amount, currency)}</Text>
                </View>
                <View style={styles.amountRow}>
                  <Text style={styles.amountLabel}>{text.dateLabel}:</Text>
                  <Text style={styles.amountValue}>{formatDate(getPaymentDate(item))}</Text>
                </View>
                {item.completedAt ? (
                  <View style={styles.amountRow}>
                    <Text style={styles.amountLabel}>{text.completedAtLabel}:</Text>
                    <Text style={styles.amountValue}>{formatDate(item.completedAt)}</Text>
                  </View>
                ) : null}
                {item.transactionId ? (
                  <View style={styles.metaBlock}>
                    <Text style={styles.metaLabel}>{text.transactionLabel}</Text>
                    <Text style={styles.metaCode}>{item.transactionId}</Text>
                  </View>
                ) : null}
                {item.paypalOrderId ? (
                  <View style={styles.metaBlock}>
                    <Text style={styles.metaLabel}>{text.orderLabel}</Text>
                    <Text style={styles.metaCode}>{item.paypalOrderId}</Text>
                  </View>
                ) : null}
                {item.cryptoTransactionHash ? (
                  <View style={styles.metaBlock}>
                    <Text style={styles.metaLabel}>{text.hashLabel}</Text>
                    <Text style={styles.metaCode}>{item.cryptoTransactionHash}</Text>
                  </View>
                ) : null}
                {item.cryptoNetwork ? (
                  <View style={styles.amountRow}>
                    <Text style={styles.amountLabel}>{text.networkLabel}:</Text>
                    <View style={styles.networkBadge}>
                      <Text style={styles.networkBadgeText}>{item.cryptoNetwork}</Text>
                    </View>
                  </View>
                ) : null}
                {toNumber(item.cryptoAmount) > 0 ? (
                  <View style={styles.amountRow}>
                    <Text style={styles.amountLabel}>USDT:</Text>
                    <Text style={[styles.amountValue, styles.cryptoValue]}>{`${toNumber(item.cryptoAmount)} USDT`}</Text>
                  </View>
                ) : null}
                {toNumber(item.paymentGatewayResponse?.transferAmount) > 0 ? (
                  <View style={styles.amountRow}>
                    <Text style={styles.amountLabel}>{text.receivedAmountLabel}:</Text>
                    <Text style={[styles.amountValue, styles.receivedAmountValue]}>
                      {formatCurrency(toNumber(item.paymentGatewayResponse?.transferAmount), 'VND')}
                    </Text>
                  </View>
                ) : null}
              </View>
            </View>
          );
        })}
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
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
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
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  headerTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  headerTitleWrap: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#8E8E93',
  },
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#F3F8FF',
  },
  refreshButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#007AFF',
  },
  statText: {
    fontSize: 14,
    color: '#8E8E93',
  },
  paymentListContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 32,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    marginBottom: 16,
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  quickActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 16,
  },
  secondaryActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#D8E8FF',
  },
  secondaryActionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#007AFF',
  },
  speakerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#EAF8F0',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  speakerBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#0A7F3F',
  },
  warningCard: {
    backgroundColor: '#FFF7E8',
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#FFE1A6',
  },
  successCard: {
    backgroundColor: '#EDF9F1',
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#C7EBD4',
  },
  bannerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  warningTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#8A5300',
  },
  successTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0A7F3F',
  },
  warningDescription: {
    fontSize: 14,
    lineHeight: 20,
    color: '#8A5300',
    marginBottom: 12,
  },
  successDescription: {
    fontSize: 14,
    lineHeight: 20,
    color: '#0A7F3F',
  },
  bannerButton: {
    alignSelf: 'flex-start',
    backgroundColor: '#007AFF',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginTop: 4,
  },
  bannerButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  accountList: {
    marginTop: 10,
    gap: 6,
  },
  accountItem: {
    fontSize: 13,
    color: '#14532D',
  },
  tabScroll: {
    marginBottom: 12,
  },
  tabContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  tabChip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  tabChipActive: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  tabChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#667085',
  },
  tabChipTextActive: {
    color: '#FFFFFF',
  },
  filterScroll: {
    marginBottom: 8,
  },
  statusFilterContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  statusFilterChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
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
  },
  autoRefreshRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
  },
  autoRefreshText: {
    fontSize: 13,
    color: '#667eea',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 56,
  },
  emptyText: {
    fontSize: 18,
    color: '#8E8E93',
    marginTop: 10,
  },
  emptyStateScreen: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
    backgroundColor: '#F2F2F7',
  },
  emptyTitle: {
    marginTop: 12,
    fontSize: 18,
    lineHeight: 25,
    color: '#8E8E93',
    textAlign: 'center',
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
    alignItems: 'flex-start',
    marginBottom: 12,
    gap: 12,
  },
  methodMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  methodIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  methodTextWrap: {
    flex: 1,
  },
  methodTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#101828',
  },
  packageName: {
    fontSize: 14,
    color: '#8E8E93',
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusPaidBadge: {
    backgroundColor: '#E8F5E8',
  },
  statusPendingBadge: {
    backgroundColor: '#E6F0FF',
  },
  statusUnpaidBadge: {
    backgroundColor: '#FFF3E0',
  },
  statusRefundedBadge: {
    backgroundColor: '#E6FFFB',
  },
  statusCancelledBadge: {
    backgroundColor: '#FFE6E6',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  statusPaidText: {
    color: '#34C759',
  },
  statusPendingText: {
    color: '#1677FF',
  },
  statusUnpaidText: {
    color: '#FF9500',
  },
  statusRefundedText: {
    color: '#08979C',
  },
  statusCancelledText: {
    color: '#D14343',
  },
  paymentDetails: {
    gap: 8,
  },
  amountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  amountLabel: {
    fontSize: 14,
    color: '#8E8E93',
    flex: 1,
  },
  amountValue: {
    fontSize: 14,
    color: '#000',
    fontWeight: '500',
    flex: 1,
    textAlign: 'right',
  },
  cryptoValue: {
    color: '#26a17b',
  },
  receivedAmountValue: {
    color: '#1890FF',
  },
  metaBlock: {
    marginTop: 2,
  },
  metaLabel: {
    fontSize: 12,
    color: '#8E8E93',
    marginBottom: 4,
  },
  metaCode: {
    fontSize: 12,
    color: '#344054',
    backgroundColor: '#F2F4F7',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  networkBadge: {
    backgroundColor: '#E6F0FF',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  networkBadgeText: {
    fontSize: 12,
    color: '#1677FF',
    fontWeight: '600',
  },
});
