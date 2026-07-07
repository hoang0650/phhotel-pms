import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import {
  DollarSign,
  ShoppingCart,
  TrendingUp,
  Landmark,
  Settings,
  BarChart3,
  Percent,
  CalendarRange,
  BedDouble,
  Briefcase,
  Receipt,
  Wallet,
  Wrench,
  Megaphone,
  Package,
  Zap,
} from 'lucide-react-native';
import {
  differenceInCalendarDays,
  endOfMonth,
  endOfWeek,
  endOfYear,
  format,
  startOfMonth,
  startOfWeek,
  startOfYear,
} from 'date-fns';
import { useHotel } from '@/contexts/HotelContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { usePermission } from '@/contexts/PermissionContext';
import { apiClient } from '@/services/api/client';
import { API_ENDPOINTS } from '@/services/api/config';
import { AccessGuard } from '@/components/AccessGuard';

type PeriodType = 'day' | 'week' | 'month' | 'year';

type FinancialConfig = {
  depreciationRate?: number;
  loanPercentage?: number;
  interestRate?: number;
  taxRate?: number;
  wacc?: number;
  projectionYears?: number;
};

type FinancialSummaryData = {
  totalRevenue: number;
  totalCosts: number;
  profit: number;
  initialInvestment: number;
  monthlyProfit: number;
  paybackPeriod: number;
  paybackPeriodDays: number;
  depreciation?: number;
  interest?: number;
  profitBeforeTax?: number;
  tax?: number;
  profitAfterTax?: number;
  npv?: number;
  irr?: number;
  breakdown: {
    revenue: {
      roomRevenue?: number;
      roomRevenueDaily?: number;
      roomRevenueMonthly?: number;
      roomRevenueYearly?: number;
      serviceRevenue?: number;
      cafeRevenue?: number;
      otherServiceRevenue?: number;
      receiptRevenue?: number;
      otherRevenue?: number;
    };
    costs: {
      expenses?: number;
      receiptExpenses?: number;
      salary?: number;
      marketing?: number;
      maintenance?: number;
      training?: number;
      serviceCost?: number;
      utilities?: number;
      supplies?: number;
      other?: number;
    };
  };
  period?: {
    startDate?: string;
    endDate?: string;
  };
  financialConfig?: FinancialConfig;
};

type FinancialSummaryResponse = {
  message: string;
  data: FinancialSummaryData;
};

const getRangeForPeriod = (period: PeriodType) => {
  const today = new Date();
  switch (period) {
    case 'day':
      return { startDate: today, endDate: today };
    case 'week':
      return { startDate: startOfWeek(today, { weekStartsOn: 1 }), endDate: endOfWeek(today, { weekStartsOn: 1 }) };
    case 'month':
      return { startDate: startOfMonth(today), endDate: endOfMonth(today) };
    case 'year':
      return { startDate: startOfYear(today), endDate: endOfYear(today) };
    default:
      return { startDate: today, endDate: today };
  }
};

const getConfigValue = (value: number | undefined, fallback: number) =>
  Number.isFinite(Number(value)) ? Number(value) : fallback;

const calculateNpv = (discountRate: number, cashFlows: number[]) => {
  let total = 0;
  for (let t = 0; t < cashFlows.length; t += 1) {
    total += cashFlows[t] / Math.pow(1 + discountRate, t);
  }
  return total;
};

const calculateIrr = (cashFlows: number[]) => {
  const hasPositive = cashFlows.some((value) => value > 0);
  const hasNegative = cashFlows.some((value) => value < 0);
  if (!hasPositive || !hasNegative) return Number.NaN;

  const npvAt = (rate: number) => calculateNpv(rate, cashFlows);

  let low = -0.9999;
  let high = 10;
  let npvLow = npvAt(low);
  let npvHigh = npvAt(high);

  let expand = 0;
  while (npvLow * npvHigh > 0 && expand < 20) {
    high *= 2;
    npvHigh = npvAt(high);
    expand += 1;
  }

  if (npvLow * npvHigh > 0) return Number.NaN;

  for (let i = 0; i < 120; i += 1) {
    const mid = (low + high) / 2;
    const npvMid = npvAt(mid);
    if (Math.abs(npvMid) < 1e-7) {
      return mid;
    }

    if (npvLow * npvMid <= 0) {
      high = mid;
      npvHigh = npvMid;
    } else {
      low = mid;
      npvLow = npvMid;
    }
  }

  return (low + high) / 2;
};

const normalizeFinancialSummary = (
  rawSummary: FinancialSummaryData,
  initialInvestment: number,
  startDate: Date,
  endDate: Date
): FinancialSummaryData => {
  const revenue = {
    roomRevenue: Number(rawSummary?.breakdown?.revenue?.roomRevenue || 0),
    roomRevenueDaily: Number(rawSummary?.breakdown?.revenue?.roomRevenueDaily || 0),
    roomRevenueMonthly: Number(rawSummary?.breakdown?.revenue?.roomRevenueMonthly || 0),
    roomRevenueYearly: Number(rawSummary?.breakdown?.revenue?.roomRevenueYearly || 0),
    serviceRevenue: Number(rawSummary?.breakdown?.revenue?.serviceRevenue || 0),
    cafeRevenue: Number(rawSummary?.breakdown?.revenue?.cafeRevenue || 0),
    otherServiceRevenue: Number(rawSummary?.breakdown?.revenue?.otherServiceRevenue || 0),
    receiptRevenue: Number(rawSummary?.breakdown?.revenue?.receiptRevenue || 0),
    otherRevenue: Number(rawSummary?.breakdown?.revenue?.otherRevenue || 0),
  };

  const costs = {
    expenses: Number(rawSummary?.breakdown?.costs?.expenses || 0),
    receiptExpenses: Number(
      rawSummary?.breakdown?.costs?.receiptExpenses ?? rawSummary?.breakdown?.costs?.expenses ?? 0
    ),
    salary: Number(rawSummary?.breakdown?.costs?.salary || 0),
    marketing: Number(rawSummary?.breakdown?.costs?.marketing || 0),
    maintenance: Number(rawSummary?.breakdown?.costs?.maintenance || 0),
    training: Number(rawSummary?.breakdown?.costs?.training || 0),
    serviceCost: Number(rawSummary?.breakdown?.costs?.serviceCost || 0),
    utilities: Number(rawSummary?.breakdown?.costs?.utilities || 0),
    supplies: Number(rawSummary?.breakdown?.costs?.supplies || 0),
    other: Number(rawSummary?.breakdown?.costs?.other || 0),
  };

  const calculatedServiceRevenue = revenue.cafeRevenue + revenue.otherServiceRevenue;
  if (Math.abs(revenue.serviceRevenue - calculatedServiceRevenue) > 0.01) {
    revenue.serviceRevenue = calculatedServiceRevenue;
  }

  const totalRevenue =
    revenue.roomRevenue +
    revenue.serviceRevenue +
    revenue.receiptRevenue +
    revenue.otherRevenue;
  const totalCosts = Number(rawSummary?.totalCosts ?? costs.expenses ?? 0);
  const profit = totalRevenue - totalCosts;

  const normalizedSummary: FinancialSummaryData = {
    ...rawSummary,
    totalRevenue,
    totalCosts,
    profit,
    initialInvestment: Number(initialInvestment || 0),
    breakdown: {
      revenue,
      costs,
    },
  };

  const config = normalizedSummary.financialConfig || {};
  const depreciationRate = getConfigValue(config.depreciationRate, 10) / 100;
  const loanPercentage = getConfigValue(config.loanPercentage, 70) / 100;
  const interestRate = getConfigValue(config.interestRate, 8) / 100;
  const taxRate = getConfigValue(config.taxRate, 20) / 100;
  const wacc = getConfigValue(config.wacc, 9) / 100;
  const projectionYears = Math.max(1, getConfigValue(config.projectionYears, 10));

  const days = Math.max(1, differenceInCalendarDays(endDate, startDate) + 1);
  const daysPerYear = 365.2425;
  const yearFraction = Math.max(1 / daysPerYear, days / daysPerYear);
  const annualizedOperatingProfit = profit / yearFraction;
  const loanAmount = normalizedSummary.initialInvestment * Math.min(Math.max(loanPercentage, 0), 1);
  const depreciationAnnual = normalizedSummary.initialInvestment * Math.min(Math.max(depreciationRate, 0), 1);
  const interestAnnual = loanAmount * Math.min(Math.max(interestRate, 0), 10);
  const profitBeforeTaxAnnual = annualizedOperatingProfit - depreciationAnnual - interestAnnual;
  const taxAnnual = profitBeforeTaxAnnual > 0 ? profitBeforeTaxAnnual * Math.min(Math.max(taxRate, 0), 1) : 0;
  const profitAfterTaxAnnual = profitBeforeTaxAnnual - taxAnnual;
  const freeCashFlowAnnual = profitAfterTaxAnnual + depreciationAnnual;

  normalizedSummary.depreciation = depreciationAnnual;
  normalizedSummary.interest = interestAnnual;
  normalizedSummary.profitBeforeTax = profitBeforeTaxAnnual;
  normalizedSummary.tax = taxAnnual;
  normalizedSummary.profitAfterTax = profitAfterTaxAnnual;
  normalizedSummary.monthlyProfit = profitAfterTaxAnnual / 12;

  if (normalizedSummary.initialInvestment > 0 && freeCashFlowAnnual > 0) {
    const paybackYears = normalizedSummary.initialInvestment / freeCashFlowAnnual;
    normalizedSummary.paybackPeriod = paybackYears * 12;
    normalizedSummary.paybackPeriodDays = paybackYears * daysPerYear;
  } else {
    normalizedSummary.paybackPeriod = 0;
    normalizedSummary.paybackPeriodDays = 0;
  }

  if (normalizedSummary.initialInvestment > 0 && Number.isFinite(wacc) && wacc > -0.99 && projectionYears > 0) {
    const cashFlows: number[] = [-normalizedSummary.initialInvestment];
    for (let i = 1; i <= projectionYears; i += 1) {
      cashFlows.push(freeCashFlowAnnual);
    }
    const npvValue = calculateNpv(wacc, cashFlows);
    normalizedSummary.npv = Number.isFinite(npvValue) ? npvValue / 1_000_000 : undefined;

    const irrValue = calculateIrr(cashFlows);
    normalizedSummary.irr = Number.isFinite(irrValue) ? irrValue * 100 : undefined;
  } else {
    normalizedSummary.npv = undefined;
    normalizedSummary.irr = undefined;
  }

  return normalizedSummary;
};

export default function ReportScreen() {
  const insets = useSafeAreaInsets();
  const { selectedHotel, selectedHotelId } = useHotel();
  const { isDark, colors } = useTheme();
  const { language } = useLanguage();
  const { user } = useAuth();
  const { canAccessAnyFeature } = usePermission();
  const [period, setPeriod] = useState<PeriodType>('month');
  const isVi = language === 'vi';
  const canAccess = canAccessAnyFeature(['financial_summary_report', 'revenue_chart']);

  const text = useMemo(() => ({
    title: isVi ? 'Bao cao tai chinh' : 'Financial Summary',
    subtitle: isVi ? 'Tong hop doanh thu, chi phi va hieu qua dau tu' : 'Revenue, cost, and investment efficiency summary',
    today: isVi ? 'Hom nay' : 'Today',
    thisWeek: isVi ? 'Tuan nay' : 'This week',
    thisMonth: isVi ? 'Thang nay' : 'This month',
    thisYear: isVi ? 'Nam nay' : 'This year',
    selectedHotel: isVi ? 'Khach san da chon' : 'Selected hotel',
    noHotelSelected: isVi ? 'Chua chon khach san' : 'No hotel selected',
    noAccess: isVi ? 'Ban khong co quyen xem bao cao tai chinh tong hop' : 'You do not have access to this financial summary',
    noAccessDesc: isVi
      ? 'Tài khoản hiện tại chưa được gói đăng ký cấp quyền xem báo cáo tài chính tổng hợp.'
      : 'Your current subscription does not include access to the financial summary report.',
    chooseHotel: isVi ? 'Vui long chon khach san de xem bao cao' : 'Please select a hotel to view the report',
    totalRevenue: isVi ? 'Tong doanh thu' : 'Total revenue',
    totalCosts: isVi ? 'Tong chi phi' : 'Total costs',
    profit: isVi ? 'Loi nhuan' : 'Profit',
    initialInvestment: isVi ? 'Von dau tu ban dau' : 'Initial investment',
    financialConfig: isVi ? 'Cau hinh tai chinh' : 'Financial configuration',
    perYear: isVi ? 'moi nam' : 'per year',
    years: isVi ? 'nam' : 'years',
    depreciation: isVi ? 'Khau hao' : 'Depreciation',
    loanPercentage: isVi ? 'Ty le vay' : 'Loan percentage',
    interestRate: isVi ? 'Lai suat' : 'Interest rate',
    taxRate: isVi ? 'Thue suat' : 'Tax rate',
    wacc: 'WACC',
    projectionYears: isVi ? 'So nam du phong' : 'Projection years',
    detailedInfo: isVi ? 'Thong tin tai chinh chi tiet' : 'Detailed financial info',
    depreciationAmount: isVi ? 'Tien khau hao' : 'Depreciation amount',
    interestAmount: isVi ? 'Tien lai vay' : 'Interest amount',
    profitBeforeTax: isVi ? 'Loi nhuan truoc thue' : 'Profit before tax',
    taxAmount: isVi ? 'Tien thue' : 'Tax amount',
    profitAfterTax: isVi ? 'Loi nhuan sau thue' : 'Profit after tax',
    efficiency: isVi ? 'Danh gia hieu qua' : 'Efficiency evaluation',
    npv: 'NPV',
    irr: 'IRR',
    millionVnd: isVi ? 'trieu VND' : 'million VND',
    payback: isVi ? 'Thoi gian hoan von' : 'Payback period',
    avgMonthlyProfit: isVi ? 'Loi nhuan trung binh/thang' : 'Average monthly profit',
    paybackTime: isVi ? 'Thoi gian hoan von' : 'Payback time',
    months: isVi ? 'thang' : 'months',
    days: isVi ? 'ngay' : 'days',
    undetermined: isVi ? 'Khong xac dinh' : 'Undetermined',
    negativeProfitWarning: isVi ? 'Loi nhuan am, khong the tinh duoc thoi gian hoan von' : 'Negative profit, payback period cannot be determined',
    revenueBreakdown: isVi ? 'Chi tiet doanh thu' : 'Revenue breakdown',
    costBreakdown: isVi ? 'Chi tiet chi phi' : 'Cost breakdown',
    roomRevenue: isVi ? 'Doanh thu phong' : 'Room revenue',
    serviceRevenue: isVi ? 'Doanh thu dich vu' : 'Service revenue',
    cafeRevenue: isVi ? 'Doanh thu cafe' : 'Cafe revenue',
    otherServiceRevenue: isVi ? 'Doanh thu dich vu khac' : 'Other service revenue',
    receiptRevenue: isVi ? 'Phieu thu' : 'Receipt revenue',
    otherRevenue: isVi ? 'Doanh thu khac' : 'Other revenue',
    totalExpense: isVi ? 'Tong chi' : 'Total expense',
    receiptExpenses: isVi ? 'Tong chi tu phieu chi' : 'Receipt expenses',
    salaryCost: isVi ? 'Chi phi luong' : 'Salary cost',
    marketingCost: isVi ? 'Chi phi marketing' : 'Marketing cost',
    maintenanceCost: isVi ? 'Chi phi bao tri' : 'Maintenance cost',
    trainingCost: isVi ? 'Chi phi dao tao' : 'Training cost',
    serviceCost: isVi ? 'Chi phi dich vu' : 'Service cost',
    utilitiesCost: isVi ? 'Chi phi dien nuoc' : 'Utilities cost',
    suppliesCost: isVi ? 'Chi phi vat tu' : 'Supplies cost',
    otherCost: isVi ? 'Chi phi khac' : 'Other cost',
    loading: isVi ? 'Dang tai bao cao...' : 'Loading report...',
    noData: isVi ? 'Chua co du lieu bao cao' : 'No report data yet',
    range: isVi ? 'Khoang thoi gian' : 'Date range',
  }), [isVi]);

  const periodOptions = useMemo(() => ([
    { key: 'day' as const, label: text.today },
    { key: 'week' as const, label: text.thisWeek },
    { key: 'month' as const, label: text.thisMonth },
    { key: 'year' as const, label: text.thisYear },
  ]), [text]);

  const range = useMemo(() => getRangeForPeriod(period), [period]);
  const startDate = format(range.startDate, 'yyyy-MM-dd');
  const endDate = format(range.endDate, 'yyyy-MM-dd');

  const { data: financialSummary, isLoading, refetch } = useQuery({
    queryKey: ['financial-summary', selectedHotelId, startDate, endDate],
    queryFn: async () => {
      const query = new URLSearchParams({
        hotelId: selectedHotelId || '',
        startDate,
        endDate,
      });
      const response = await apiClient.get<FinancialSummaryResponse>(`${API_ENDPOINTS.FINANCIAL.SUMMARY}?${query.toString()}`);
      const rawSummary = response?.data;
      if (!rawSummary) {
        return null;
      }

      const selectedHotelInvestment = Number((selectedHotel as any)?.initialInvestment);
      const initialInvestment = Number.isFinite(selectedHotelInvestment)
        ? selectedHotelInvestment
        : Number(rawSummary.initialInvestment || 0);

      return normalizeFinancialSummary(rawSummary, initialInvestment, range.startDate, range.endDate);
    },
    enabled: canAccess && !!selectedHotelId,
  });

  const handleRefresh = async () => {
    await refetch();
  };

  const formatCurrency = (amount: number | undefined) => {
    const safeAmount = Number(amount || 0);
    return new Intl.NumberFormat(isVi ? 'vi-VN' : 'en-US', {
      style: 'currency',
      currency: 'VND',
      maximumFractionDigits: 0,
    }).format(safeAmount);
  };

  const formatNumber = (value: number | undefined) => {
    const safeValue = Number(value || 0);
    return new Intl.NumberFormat(isVi ? 'vi-VN' : 'en-US', {
      maximumFractionDigits: 1,
    }).format(safeValue);
  };

  const formatPercent = (value: number | undefined) => `${formatNumber(value)}%`;

  const summary = financialSummary || null;
  const config = summary?.financialConfig || {};
  const revenueBreakdown = summary?.breakdown?.revenue || {};
  const costBreakdown = summary?.breakdown?.costs || {};
  const rangeLabel = `${format(range.startDate, 'dd/MM/yyyy')} - ${format(range.endDate, 'dd/MM/yyyy')}`;

  if (!canAccess) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <LinearGradient
          colors={isDark ? ['#0f766e', '#14b8a6'] : ['#14b8a6', '#0d9488']}
          style={[styles.header, { paddingTop: insets.top + 12 }]}
        >
          <Text style={styles.headerTitle}>{text.title}</Text>
          <Text style={styles.headerSubtitle}>{text.subtitle}</Text>
        </LinearGradient>
        <View style={styles.centerState}>
          <Text style={[styles.centerTitle, { color: colors.text }]}>{text.noAccess}</Text>
          <Text style={[styles.centerSubtitle, { color: colors.textSecondary }]}>{text.noAccessDesc}</Text>
        </View>
      </View>
    );
  }

  if (!selectedHotelId) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <LinearGradient
          colors={isDark ? ['#0f766e', '#14b8a6'] : ['#14b8a6', '#0d9488']}
          style={[styles.header, { paddingTop: insets.top + 12 }]}
        >
          <Text style={styles.headerTitle}>{text.title}</Text>
          <Text style={styles.headerSubtitle}>{text.subtitle}</Text>
        </LinearGradient>
        <View style={styles.centerState}>
          <Text style={[styles.centerTitle, { color: colors.text }]}>{text.noHotelSelected}</Text>
          <Text style={[styles.centerSubtitle, { color: colors.textSecondary }]}>{text.chooseHotel}</Text>
        </View>
      </View>
    );
  }

  return (
    <AccessGuard features={['financial_summary_report', 'revenue_chart']}>
      <View style={[styles.container, { backgroundColor: colors.background }]}>
      <LinearGradient
        colors={isDark ? ['#0f766e', '#14b8a6'] : ['#14b8a6', '#0d9488']}
        style={[styles.header, { paddingTop: insets.top + 12 }]}
      >
        <Text style={styles.headerTitle}>{text.title}</Text>
        <Text style={styles.headerSubtitle}>{selectedHotel?.name || text.selectedHotel}</Text>
      </LinearGradient>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.contentContainer}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={handleRefresh} tintColor={colors.tint} />}
      >
        <View style={[styles.periodSelector, { backgroundColor: colors.cardBackground }]}>
          {periodOptions.map((option) => (
            <TouchableOpacity
              key={option.key}
              style={[
                styles.periodOption,
                period === option.key && [styles.periodOptionActive, { backgroundColor: colors.tint }],
              ]}
              onPress={() => setPeriod(option.key)}
            >
              <Text
                style={[
                  styles.periodOptionText,
                  { color: period === option.key ? '#FFFFFF' : colors.textSecondary },
                ]}
              >
                {option.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.rangeBadge}>
          <CalendarRange size={16} color="#1890ff" />
          <Text style={styles.rangeBadgeText}>{text.range}: {rangeLabel}</Text>
        </View>

        {isLoading && !summary ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.tint} />
            <Text style={[styles.loadingText, { color: colors.textSecondary }]}>{text.loading}</Text>
          </View>
        ) : !summary ? (
          <View style={[styles.emptyCard, { backgroundColor: colors.cardBackground }]}>
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>{text.noData}</Text>
          </View>
        ) : (
          <>
            <View style={styles.summaryGrid}>
              <View style={[styles.summaryCard, { backgroundColor: colors.cardBackground }]}>
                <View style={[styles.summaryIconBox, { backgroundColor: isDark ? '#133B35' : '#E6FFFB' }]}>
                  <DollarSign size={20} color="#14b8a6" />
                </View>
                <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>{text.totalRevenue}</Text>
                <Text style={[styles.summaryValue, { color: colors.text }]}>{formatCurrency(summary.totalRevenue)}</Text>
              </View>

              <View style={[styles.summaryCard, { backgroundColor: colors.cardBackground }]}>
                <View style={[styles.summaryIconBox, { backgroundColor: isDark ? '#3B1D1D' : '#FEF2F2' }]}>
                  <ShoppingCart size={20} color="#ef4444" />
                </View>
                <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>{text.totalCosts}</Text>
                <Text style={[styles.summaryValue, { color: colors.text }]}>{formatCurrency(summary.totalCosts)}</Text>
              </View>

              <View style={[styles.summaryCard, { backgroundColor: colors.cardBackground }]}>
                <View style={[styles.summaryIconBox, { backgroundColor: isDark ? '#1F3A25' : '#F0FDF4' }]}>
                  <TrendingUp size={20} color={summary.profit >= 0 ? '#22c55e' : '#ef4444'} />
                </View>
                <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>{text.profit}</Text>
                <Text style={[styles.summaryValue, summary.profit < 0 ? styles.negativeValue : styles.positiveValue]}>
                  {formatCurrency(summary.profit)}
                </Text>
              </View>

              <View style={[styles.summaryCard, { backgroundColor: colors.cardBackground }]}>
                <View style={[styles.summaryIconBox, { backgroundColor: isDark ? '#1E293B' : '#EFF6FF' }]}>
                  <Landmark size={20} color="#3b82f6" />
                </View>
                <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>{text.initialInvestment}</Text>
                <Text style={[styles.summaryValue, { color: colors.text }]}>{formatCurrency(summary.initialInvestment)}</Text>
              </View>
            </View>

            <View style={[styles.sectionCard, { backgroundColor: colors.cardBackground }]}>
              <View style={styles.sectionHeader}>
                <Settings size={18} color="#6366f1" />
                <Text style={[styles.sectionTitle, { color: colors.text }]}>{text.financialConfig}</Text>
              </View>
              <View style={styles.infoGrid}>
                <View style={styles.infoItem}>
                  <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>{text.depreciation}</Text>
                  <Text style={[styles.infoValue, { color: colors.text }]}>{formatPercent(getConfigValue(config.depreciationRate, 10))} {text.perYear}</Text>
                </View>
                <View style={styles.infoItem}>
                  <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>{text.loanPercentage}</Text>
                  <Text style={[styles.infoValue, { color: colors.text }]}>{formatPercent(getConfigValue(config.loanPercentage, 70))}</Text>
                </View>
                <View style={styles.infoItem}>
                  <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>{text.interestRate}</Text>
                  <Text style={[styles.infoValue, { color: colors.text }]}>{formatPercent(getConfigValue(config.interestRate, 8))} {text.perYear}</Text>
                </View>
                <View style={styles.infoItem}>
                  <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>{text.taxRate}</Text>
                  <Text style={[styles.infoValue, { color: colors.text }]}>{formatPercent(getConfigValue(config.taxRate, 20))}</Text>
                </View>
                <View style={styles.infoItem}>
                  <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>{text.wacc}</Text>
                  <Text style={[styles.infoValue, { color: colors.text }]}>{formatPercent(getConfigValue(config.wacc, 9))}</Text>
                </View>
                <View style={styles.infoItem}>
                  <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>{text.projectionYears}</Text>
                  <Text style={[styles.infoValue, { color: colors.text }]}>{formatNumber(getConfigValue(config.projectionYears, 10))} {text.years}</Text>
                </View>
              </View>
            </View>

            <View style={[styles.sectionCard, { backgroundColor: colors.cardBackground }]}>
              <View style={styles.sectionHeader}>
                <BarChart3 size={18} color="#14b8a6" />
                <Text style={[styles.sectionTitle, { color: colors.text }]}>{text.detailedInfo}</Text>
              </View>
              <View style={styles.infoGrid}>
                <View style={styles.infoItem}>
                  <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>{text.depreciationAmount}</Text>
                  <Text style={[styles.infoValue, { color: colors.text }]}>{formatCurrency(summary.depreciation)}</Text>
                </View>
                <View style={styles.infoItem}>
                  <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>{text.interestAmount}</Text>
                  <Text style={[styles.infoValue, { color: colors.text }]}>{formatCurrency(summary.interest)}</Text>
                </View>
                <View style={styles.infoItem}>
                  <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>{text.profitBeforeTax}</Text>
                  <Text style={[styles.infoValue, summary.profitBeforeTax && summary.profitBeforeTax < 0 ? styles.negativeValue : { color: colors.text }]}>
                    {formatCurrency(summary.profitBeforeTax)}
                  </Text>
                </View>
                <View style={styles.infoItem}>
                  <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>{text.taxAmount}</Text>
                  <Text style={[styles.infoValue, { color: colors.text }]}>{formatCurrency(summary.tax)}</Text>
                </View>
                <View style={styles.infoItem}>
                  <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>{text.profitAfterTax}</Text>
                  <Text style={[styles.infoValue, summary.profitAfterTax && summary.profitAfterTax < 0 ? styles.negativeValue : styles.positiveValue]}>
                    {formatCurrency(summary.profitAfterTax)}
                  </Text>
                </View>
              </View>
            </View>

            <View style={styles.dualRow}>
              <View style={[styles.sectionCard, styles.halfCard, { backgroundColor: colors.cardBackground }]}>
                <View style={styles.sectionHeader}>
                  <Percent size={18} color="#8b5cf6" />
                  <Text style={[styles.sectionTitle, { color: colors.text }]}>{text.efficiency}</Text>
                </View>
                <View style={styles.metricBox}>
                  <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>{text.npv}</Text>
                  <Text style={[styles.metricValue, summary.npv && summary.npv < 0 ? styles.negativeValue : styles.positiveValue]}>
                    {formatNumber(summary.npv)} {text.millionVnd}
                  </Text>
                </View>
                <View style={styles.metricBox}>
                  <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>{text.irr}</Text>
                  <Text style={[styles.metricValue, { color: colors.text }]}>{formatPercent(summary.irr)}</Text>
                </View>
              </View>

              <View style={[styles.sectionCard, styles.halfCard, { backgroundColor: colors.cardBackground }]}>
                <View style={styles.sectionHeader}>
                  <CalendarRange size={18} color="#f59e0b" />
                  <Text style={[styles.sectionTitle, { color: colors.text }]}>{text.payback}</Text>
                </View>
                <View style={styles.metricBox}>
                  <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>{text.avgMonthlyProfit}</Text>
                  <Text style={[styles.metricValue, { color: colors.text }]}>{formatCurrency(summary.monthlyProfit)}</Text>
                </View>
                <View style={styles.metricBox}>
                  <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>{text.paybackTime}</Text>
                  <Text style={[styles.metricValue, { color: colors.text }]}>
                    {summary.paybackPeriod > 0
                      ? `${formatNumber(summary.paybackPeriod)} ${text.months} (${formatNumber(summary.paybackPeriodDays)} ${text.days})`
                      : text.undetermined}
                  </Text>
                </View>
                {summary.monthlyProfit <= 0 ? (
                  <View style={styles.warningBox}>
                    <Text style={styles.warningText}>{text.negativeProfitWarning}</Text>
                  </View>
                ) : null}
              </View>
            </View>

            <View style={[styles.sectionCard, { backgroundColor: colors.cardBackground }]}>
              <View style={styles.sectionHeader}>
                <Receipt size={18} color="#14b8a6" />
                <Text style={[styles.sectionTitle, { color: colors.text }]}>{text.revenueBreakdown}</Text>
              </View>
              <View style={styles.infoGrid}>
                <View style={styles.breakdownItem}>
                  <BedDouble size={16} color="#14b8a6" />
                  <View style={styles.breakdownTextWrap}>
                    <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>{text.roomRevenue}</Text>
                    <Text style={[styles.infoValue, { color: colors.text }]}>{formatCurrency(revenueBreakdown.roomRevenue)}</Text>
                  </View>
                </View>
                <View style={styles.breakdownItem}>
                  <Briefcase size={16} color="#f59e0b" />
                  <View style={styles.breakdownTextWrap}>
                    <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>{text.serviceRevenue}</Text>
                    <Text style={[styles.infoValue, { color: colors.text }]}>{formatCurrency(revenueBreakdown.serviceRevenue)}</Text>
                  </View>
                </View>
                <View style={styles.breakdownItem}>
                  <Receipt size={16} color="#3b82f6" />
                  <View style={styles.breakdownTextWrap}>
                    <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>{text.receiptRevenue}</Text>
                    <Text style={[styles.infoValue, { color: colors.text }]}>{formatCurrency(revenueBreakdown.receiptRevenue)}</Text>
                  </View>
                </View>
                <View style={styles.breakdownItem}>
                  <Wallet size={16} color="#8b5cf6" />
                  <View style={styles.breakdownTextWrap}>
                    <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>{text.otherRevenue}</Text>
                    <Text style={[styles.infoValue, { color: colors.text }]}>{formatCurrency(revenueBreakdown.otherRevenue)}</Text>
                  </View>
                </View>
                <View style={styles.breakdownItem}>
                  <Briefcase size={16} color="#c084fc" />
                  <View style={styles.breakdownTextWrap}>
                    <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>{text.cafeRevenue}</Text>
                    <Text style={[styles.infoValue, { color: colors.text }]}>{formatCurrency(revenueBreakdown.cafeRevenue)}</Text>
                  </View>
                </View>
                <View style={styles.breakdownItem}>
                  <Briefcase size={16} color="#fb7185" />
                  <View style={styles.breakdownTextWrap}>
                    <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>{text.otherServiceRevenue}</Text>
                    <Text style={[styles.infoValue, { color: colors.text }]}>{formatCurrency(revenueBreakdown.otherServiceRevenue)}</Text>
                  </View>
                </View>
              </View>
            </View>

            <View style={[styles.sectionCard, { backgroundColor: colors.cardBackground }]}>
              <View style={styles.sectionHeader}>
                <ShoppingCart size={18} color="#ef4444" />
                <Text style={[styles.sectionTitle, { color: colors.text }]}>{text.costBreakdown}</Text>
              </View>
              <View style={styles.infoGrid}>
                <View style={styles.breakdownItem}>
                  <Receipt size={16} color="#ef4444" />
                  <View style={styles.breakdownTextWrap}>
                    <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>{text.totalExpense}</Text>
                    <Text style={[styles.infoValue, { color: colors.text }]}>{formatCurrency(costBreakdown.expenses)}</Text>
                  </View>
                </View>
                <View style={styles.breakdownItem}>
                  <Receipt size={16} color="#dc2626" />
                  <View style={styles.breakdownTextWrap}>
                    <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>{text.receiptExpenses}</Text>
                    <Text style={[styles.infoValue, { color: colors.text }]}>{formatCurrency(costBreakdown.receiptExpenses)}</Text>
                  </View>
                </View>
                <View style={styles.breakdownItem}>
                  <Wallet size={16} color="#0ea5e9" />
                  <View style={styles.breakdownTextWrap}>
                    <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>{text.salaryCost}</Text>
                    <Text style={[styles.infoValue, { color: colors.text }]}>{formatCurrency(costBreakdown.salary)}</Text>
                  </View>
                </View>
                <View style={styles.breakdownItem}>
                  <Megaphone size={16} color="#f59e0b" />
                  <View style={styles.breakdownTextWrap}>
                    <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>{text.marketingCost}</Text>
                    <Text style={[styles.infoValue, { color: colors.text }]}>{formatCurrency(costBreakdown.marketing)}</Text>
                  </View>
                </View>
                <View style={styles.breakdownItem}>
                  <Wrench size={16} color="#8b5cf6" />
                  <View style={styles.breakdownTextWrap}>
                    <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>{text.maintenanceCost}</Text>
                    <Text style={[styles.infoValue, { color: colors.text }]}>{formatCurrency(costBreakdown.maintenance)}</Text>
                  </View>
                </View>
                <View style={styles.breakdownItem}>
                  <Package size={16} color="#14b8a6" />
                  <View style={styles.breakdownTextWrap}>
                    <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>{text.suppliesCost}</Text>
                    <Text style={[styles.infoValue, { color: colors.text }]}>{formatCurrency(costBreakdown.supplies)}</Text>
                  </View>
                </View>
                <View style={styles.breakdownItem}>
                  <Zap size={16} color="#22c55e" />
                  <View style={styles.breakdownTextWrap}>
                    <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>{text.utilitiesCost}</Text>
                    <Text style={[styles.infoValue, { color: colors.text }]}>{formatCurrency(costBreakdown.utilities)}</Text>
                  </View>
                </View>
                <View style={styles.breakdownItem}>
                  <Briefcase size={16} color="#64748b" />
                  <View style={styles.breakdownTextWrap}>
                    <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>{text.serviceCost}</Text>
                    <Text style={[styles.infoValue, { color: colors.text }]}>{formatCurrency(costBreakdown.serviceCost)}</Text>
                  </View>
                </View>
                <View style={styles.breakdownItem}>
                  <BarChart3 size={16} color="#94a3b8" />
                  <View style={styles.breakdownTextWrap}>
                    <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>{text.trainingCost}</Text>
                    <Text style={[styles.infoValue, { color: colors.text }]}>{formatCurrency(costBreakdown.training)}</Text>
                  </View>
                </View>
                <View style={styles.breakdownItem}>
                  <ShoppingCart size={16} color="#64748b" />
                  <View style={styles.breakdownTextWrap}>
                    <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>{text.otherCost}</Text>
                    <Text style={[styles.infoValue, { color: colors.text }]}>{formatCurrency(costBreakdown.other)}</Text>
                  </View>
                </View>
              </View>
            </View>
          </>
        )}
      </ScrollView>
      </View>
    </AccessGuard>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700' as const,
    color: '#FFFFFF',
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 4,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 96,
    gap: 16,
  },
  periodSelector: {
    flexDirection: 'row',
    borderRadius: 14,
    padding: 4,
  },
  periodOption: {
    flex: 1,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  periodOptionActive: {},
  periodOptionText: {
    fontSize: 13,
    fontWeight: '600' as const,
  },
  rangeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    alignSelf: 'flex-start',
    backgroundColor: '#F0F8FF',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
  },
  rangeBadgeText: {
    fontSize: 12,
    color: '#1890ff',
    fontWeight: '500' as const,
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
  },
  emptyCard: {
    padding: 24,
    borderRadius: 16,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
  },
  centerState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  centerTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    textAlign: 'center',
  },
  centerSubtitle: {
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  summaryCard: {
    width: '48%',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  summaryIconBox: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  summaryLabel: {
    fontSize: 12,
  },
  summaryValue: {
    fontSize: 18,
    fontWeight: '700' as const,
    marginTop: 6,
  },
  positiveValue: {
    color: '#22c55e',
  },
  negativeValue: {
    color: '#ef4444',
  },
  sectionCard: {
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700' as const,
  },
  infoGrid: {
    gap: 12,
  },
  infoItem: {
    borderWidth: 1,
    borderColor: '#E9ECEF',
    borderRadius: 12,
    padding: 12,
    backgroundColor: '#F8FAFC',
  },
  infoLabel: {
    fontSize: 12,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '600' as const,
    marginTop: 4,
  },
  dualRow: {
    gap: 16,
  },
  halfCard: {
    width: '100%',
  },
  metricBox: {
    borderRadius: 12,
    padding: 12,
    backgroundColor: '#F8FAFC',
    marginBottom: 10,
  },
  metricLabel: {
    fontSize: 12,
  },
  metricValue: {
    fontSize: 16,
    fontWeight: '700' as const,
    marginTop: 4,
  },
  warningBox: {
    backgroundColor: '#FEF3C7',
    borderRadius: 12,
    padding: 12,
    marginTop: 4,
  },
  warningText: {
    color: '#92400E',
    fontSize: 12,
    fontWeight: '500' as const,
  },
  breakdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderColor: '#E9ECEF',
    borderRadius: 12,
    padding: 12,
    backgroundColor: '#F8FAFC',
  },
  breakdownTextWrap: {
    flex: 1,
  },
});
