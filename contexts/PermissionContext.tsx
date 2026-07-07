import React, { useCallback, useEffect, useMemo, useState } from 'react';
import createContextHook from '@nkzw/create-context-hook';
import { useAuth } from '@/contexts/AuthContext';
import {
  pricingApi,
  type PackagePermission,
  type PricingAddon,
  type PricingFeature,
  type PricingPackage,
} from '@/services/api/pricing';

type UserRole = 'superadmin' | 'admin' | 'business' | 'hotel' | 'staff' | 'guest';

type UserWithPermissions = {
  id?: string;
  _id?: string;
  role?: string;
  features?: PricingFeature[];
  packagePermissions?: PackagePermission[];
} & Partial<Record<PricingAddon, boolean>>;

const roleAllowedFeaturesByRole: Partial<Record<UserRole, PricingFeature[]>> = {
  business: [
    'room_management',
    'hotel_management',
    'company_management',
    'shift_handover',
    'calendar',
    'bank_transfer_history',
    'staff_management',
    'service_management',
    'ota_management',
    'fanpage_messages',
    'zalo_messages',
    'telegram_messages',
    'revenue_chart',
    'financial_summary_report',
    'qr_payment',
    'visa_payment',
    'electric_management',
    'pricing_management',
  ],
  hotel: [
    'room_management',
    'hotel_management',
    'shift_handover',
    'calendar',
    'bank_transfer_history',
    'staff_management',
    'service_management',
    'ota_management',
    'fanpage_messages',
    'zalo_messages',
    'telegram_messages',
    'revenue_chart',
    'financial_summary_report',
    'qr_payment',
    'visa_payment',
    'electric_management',
    'pricing_management',
  ],
  staff: [
    'room_management',
    'shift_handover',
    'calendar',
    'bank_transfer_history',
    'service_management',
    'ota_management',
    'fanpage_messages',
    'zalo_messages',
    'telegram_messages',
    'revenue_chart',
    'financial_summary_report',
    'qr_payment',
    'visa_payment',
    'electric_management',
    'pricing_management',
  ],
};

const roleBlockedFeaturesByRole: Partial<Record<UserRole, PricingFeature[]>> = {
  business: ['user_management', 'email_admin', 'settings_management'],
  hotel: ['user_management', 'email_admin', 'settings_management', 'company_management'],
  staff: ['company_management', 'staff_management', 'user_management', 'email_admin', 'settings_management'],
};

const featurePermissionMap: Record<PricingFeature, PackagePermission[]> = {
  room_management: ['view', 'edit', 'manage'],
  hotel_management: ['view', 'edit', 'manage'],
  company_management: ['view', 'edit', 'manage'],
  staff_management: ['view', 'edit', 'manage'],
  service_management: ['view', 'edit', 'manage'],
  user_management: ['manage'],
  pricing_management: ['manage'],
  ota_management: ['view', 'edit', 'manage'],
  fanpage_messages: ['view', 'manage'],
  zalo_messages: ['view', 'manage'],
  telegram_messages: ['view', 'manage'],
  revenue_chart: ['view', 'manage'],
  financial_summary_report: ['view', 'manage'],
  shift_handover: ['view', 'edit', 'manage'],
  bank_transfer_history: ['view', 'manage'],
  calendar: ['view', 'edit', 'manage'],
  email_admin: ['view', 'edit', 'manage'],
  qr_payment: ['view', 'edit', 'manage'],
  visa_payment: ['view', 'edit', 'manage'],
  electric_management: ['view', 'edit', 'manage'],
  settings_management: ['view', 'edit', 'manage'],
};

const defaultPermissionsByRole = (role?: string): PackagePermission[] => {
  switch (role) {
    case 'superadmin':
    case 'admin':
      return ['view', 'edit', 'delete', 'manage'];
    case 'business':
    case 'hotel':
      return ['view', 'edit', 'manage'];
    case 'staff':
      return ['view'];
    default:
      return ['view'];
  }
};

const getUserId = (user: UserWithPermissions | null) => {
  return user?.id || user?._id || '';
};

export const [PermissionProvider, usePermission] = createContextHook(() => {
  const { user, isAuthenticated, isInitialized } = useAuth();
  const currentUser = (user || null) as UserWithPermissions | null;
  const [currentPackage, setCurrentPackage] = useState<PricingPackage | null>(null);
  const [permissions, setPermissions] = useState<PackagePermission[]>([]);
  const [isReady, setIsReady] = useState(false);
  const [billingType, setBillingType] = useState<'monthly' | 'yearly' | null>(null);
  const [expiryDate, setExpiryDate] = useState<string | null>(null);

  const refreshPermissions = useCallback(async () => {
    if (!isInitialized) return;

    if (!isAuthenticated || !currentUser) {
      setCurrentPackage(null);
      setPermissions([]);
      setBillingType(null);
      setExpiryDate(null);
      setIsReady(true);
      return;
    }

    const role = (currentUser.role || 'guest') as UserRole;
    if (role === 'superadmin' || role === 'admin') {
      setCurrentPackage(null);
      setPermissions(['view', 'edit', 'delete', 'manage']);
      setBillingType(null);
      setExpiryDate(null);
      setIsReady(true);
      return;
    }

    const userId = getUserId(currentUser);
    if (!userId) {
      setCurrentPackage(null);
      setPermissions(defaultPermissionsByRole(role));
      setBillingType(null);
      setExpiryDate(null);
      setIsReady(true);
      return;
    }

    setIsReady(false);
    try {
      const response = await pricingApi.getCurrentUserPackage(userId);
      const pkg = response?.success === false ? null : (response?.data || null);
      const packagePermissions = Array.isArray(pkg?.permissions) ? pkg.permissions : [];
      const delegatedPermissions = Array.isArray(currentUser.packagePermissions) ? currentUser.packagePermissions : [];
      const effectivePermissions =
        packagePermissions.length > 0
          ? delegatedPermissions.length > 0
            ? packagePermissions.filter((permission) => delegatedPermissions.includes(permission))
            : packagePermissions
          : defaultPermissionsByRole(role);

      setCurrentPackage(pkg);
      setPermissions(effectivePermissions.length > 0 ? effectivePermissions : defaultPermissionsByRole(role));
      setBillingType(response?.billingType || null);
      setExpiryDate(response?.expiryDate || null);
    } catch {
      setCurrentPackage(null);
      setPermissions(defaultPermissionsByRole(role));
      setBillingType(null);
      setExpiryDate(null);
    } finally {
      setIsReady(true);
    }
  }, [currentUser, isAuthenticated, isInitialized]);

  useEffect(() => {
    refreshPermissions();
  }, [refreshPermissions]);

  const hasPermission = useCallback(
    (permission: PackagePermission) => {
      const role = currentUser?.role;
      if (role === 'superadmin' || role === 'admin') {
        return true;
      }
      return permissions.includes(permission);
    },
    [currentUser?.role, permissions]
  );

  const hasFeatureAccess = useCallback(
    (feature: PricingFeature) => {
      const role = (currentUser?.role || 'guest') as UserRole;

      if (role === 'superadmin' || role === 'admin') {
        return true;
      }

      if (role === 'guest') {
        return feature === 'pricing_management';
      }

      const blockedForRole = roleBlockedFeaturesByRole[role] || [];
      if (blockedForRole.includes(feature)) {
        return false;
      }

      const allowedForRole = roleAllowedFeaturesByRole[role] || [];
      if (!allowedForRole.includes(feature)) {
        return false;
      }

      const packageFeatures = Array.isArray(currentPackage?.features) ? currentPackage.features : [];
      if (feature !== 'pricing_management' && packageFeatures.length > 0 && !packageFeatures.includes(feature)) {
        return false;
      }

      const delegatedFeatures = Array.isArray(currentUser?.features) ? currentUser.features : [];
      if (feature !== 'pricing_management' && delegatedFeatures.length > 0 && !delegatedFeatures.includes(feature)) {
        return false;
      }

      if (permissions.includes('manage')) {
        return true;
      }

      const requiredPermissions = featurePermissionMap[feature] || ['view'];
      return requiredPermissions.some((permission) => permissions.includes(permission));
    },
    [currentPackage?.features, currentUser?.features, currentUser?.role, permissions]
  );

  const canAccessAnyFeature = useCallback(
    (features: PricingFeature[]) => {
      return features.some((feature) => hasFeatureAccess(feature));
    },
    [hasFeatureAccess]
  );

  const hasAddonAccess = useCallback(
    (addon: PricingAddon) => {
      const role = currentUser?.role;
      if (role === 'superadmin' || role === 'admin') {
        return true;
      }

      const packageValue = currentPackage?.[addon];
      if (typeof packageValue === 'boolean' && !packageValue) {
        return false;
      }

      const delegatedValue = currentUser?.[addon];
      if (typeof delegatedValue === 'boolean') {
        return delegatedValue;
      }

      return packageValue === true;
    },
    [currentPackage, currentUser]
  );

  const accessibleFeatures = useMemo(() => {
    const allFeatures = Object.keys(featurePermissionMap) as PricingFeature[];
    return allFeatures.filter((feature) => hasFeatureAccess(feature));
  }, [hasFeatureAccess]);

  return {
    isReady,
    currentPackage,
    permissions,
    billingType,
    expiryDate,
    accessibleFeatures,
    refreshPermissions,
    hasPermission,
    hasFeatureAccess,
    canAccessAnyFeature,
    hasAddonAccess,
  };
});

export type PermissionContextValue = ReturnType<typeof usePermission>;
