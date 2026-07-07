import React from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { usePermission } from '@/contexts/PermissionContext';
import type { PricingAddon, PricingFeature } from '@/services/api/pricing';

interface AccessGuardProps {
  children: React.ReactNode;
  features?: PricingFeature[];
  addon?: PricingAddon;
  requireAllFeatures?: boolean;
  titleVi?: string;
  titleEn?: string;
  descriptionVi?: string;
  descriptionEn?: string;
}

export function AccessGuard({
  children,
  features = [],
  addon,
  requireAllFeatures = false,
  titleVi,
  titleEn,
  descriptionVi,
  descriptionEn,
}: AccessGuardProps) {
  const { colors } = useTheme();
  const { language } = useLanguage();
  const { isReady, hasFeatureAccess, hasAddonAccess } = usePermission();

  const isVi = language === 'vi';
  const hasFeatureGate =
    features.length === 0
      ? true
      : requireAllFeatures
        ? features.every((feature) => hasFeatureAccess(feature))
        : features.some((feature) => hasFeatureAccess(feature));
  const hasAddonGate = addon ? hasAddonAccess(addon) : true;
  const canAccess = hasFeatureGate && hasAddonGate;

  if (!isReady) {
    return (
      <View style={[styles.centerState, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.tint} />
        <Text style={[styles.description, { color: colors.textSecondary }]}>
          {isVi ? 'Đang kiểm tra quyền truy cập...' : 'Checking access permissions...'}
        </Text>
      </View>
    );
  }

  if (!canAccess) {
    return (
      <View style={[styles.centerState, { backgroundColor: colors.background }]}>
        <Text style={[styles.title, { color: colors.text }]}>
          {isVi
            ? (titleVi || 'Bạn không có quyền truy cập màn hình này')
            : (titleEn || 'You do not have access to this screen')}
        </Text>
        <Text style={[styles.description, { color: colors.textSecondary }]}>
          {isVi
            ? (descriptionVi || 'Gói hiện tại hoặc quyền người dùng chưa cho phép sử dụng chức năng này.')
            : (descriptionEn || 'The current package or delegated user permissions do not allow this feature.')}
        </Text>
      </View>
    );
  }

  return <>{children}</>;
}

const styles = StyleSheet.create({
  centerState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
  },
  description: {
    marginTop: 10,
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
});
