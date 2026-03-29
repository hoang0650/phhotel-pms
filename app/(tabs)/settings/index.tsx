import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  Linking,
  Modal,
  Pressable,
  TextInput,
  ActivityIndicator,
  Image,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';
import {
  Bell,
  Moon,
  Globe,
  Lock,
  HelpCircle,
  FileText,
  LogOut,
  ChevronRight,
  User,
  Building2,
  CreditCard,
  Shield,
  Smartphone,
  Mail,
  MessageSquare,
  X,
  Camera,
  Check,
  Sun,
} from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useHotel } from '@/contexts/HotelContext';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useLanguage } from '@/contexts/LanguageContext';
import type { Language } from '@/contexts/LanguageContext';
import { API_CONFIG, authApi } from '@/services/api';

interface SettingItemProps {
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
  onPress?: () => void;
  rightElement?: React.ReactNode;
  showChevron?: boolean;
  textColor?: string;
  subtitleColor?: string;
  chevronColor?: string;
  bgColor?: string;
}

const SettingItem = ({ icon, title, subtitle, onPress, rightElement, showChevron = true, textColor, subtitleColor, chevronColor, bgColor }: SettingItemProps) => (
  <TouchableOpacity style={[styles.settingItem, bgColor ? { backgroundColor: bgColor } : undefined]} onPress={onPress} disabled={!onPress && !rightElement}>
    <View style={styles.settingIcon}>{icon}</View>
    <View style={styles.settingContent}>
      <Text style={[styles.settingTitle, textColor ? { color: textColor } : undefined]}>{title}</Text>
      {subtitle && <Text style={[styles.settingSubtitle, subtitleColor ? { color: subtitleColor } : undefined]}>{subtitle}</Text>}
    </View>
    {rightElement || (showChevron && onPress && <ChevronRight size={20} color={chevronColor || '#6b7280'} />)}
  </TouchableOpacity>
);

const roleLabels: Record<string, string> = {
  superadmin: 'Super Admin',
  admin: 'Admin',
  business: 'Business',
  manager: 'Manager',
  receptionist: 'Receptionist',
  staff: 'Staff',
};

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { selectedHotel } = useHotel();
  const { user, token, logout, logoutLoading, updateProfile, updateProfileLoading, updateLocalUser } = useAuth();
  const { isDark, toggleTheme, colors } = useTheme();
  const { t, language, setLanguage } = useLanguage();

  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [biometricEnabled, setBiometricEnabled] = useState(!!user?.preferences?.biometricEnabled);
  const [editProfileVisible, setEditProfileVisible] = useState(false);
  const [languageModalVisible, setLanguageModalVisible] = useState(false);
  const [changePasswordVisible, setChangePasswordVisible] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [biometricPassword, setBiometricPassword] = useState('');
  const [changePasswordLoading, setChangePasswordLoading] = useState(false);
  const [biometricModalVisible, setBiometricModalVisible] = useState(false);
  const [biometricMode, setBiometricMode] = useState<'enable' | 'disable'>('enable');
  const [biometricInput, setBiometricInput] = useState('');
  const [biometricConfirm, setBiometricConfirm] = useState('');
  const [biometricSaving, setBiometricSaving] = useState(false);

  const [editName, setEditName] = useState(user?.name || '');
  const [editEmail, setEditEmail] = useState(user?.email || '');
  const [editPhone, setEditPhone] = useState(user?.phone || '');
  const [editAvatarValue, setEditAvatarValue] = useState<string | undefined>(user?.avatar);
  const [editAvatarId, setEditAvatarId] = useState<string | null>(null);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const isMobile = Platform.OS === 'ios' || Platform.OS === 'android';
  const supportEmail = 'support@phhotel.vn';
  const BIOMETRIC_PASSWORD_KEY = 'biometric_password';
  const BIOMETRIC_CREDENTIALS_KEY = 'biometric_credentials';

  const getImageUrl = useCallback((value?: string | null) => {
    if (!value) return undefined;
    if (value.startsWith('http://') || value.startsWith('https://')) return value;
    if (value.startsWith('/files/')) return `${API_CONFIG.BASE_URL}${value}`;
    return `${API_CONFIG.BASE_URL}/files/${value}`;
  }, []);

  const getImageId = useCallback((value?: string | null) => {
    if (!value) return null;
    if (value.includes('/files/')) {
      const part = value.split('/files/')[1];
      return part ? part.split('?')[0] : null;
    }
    return value;
  }, []);

  useEffect(() => {
    setBiometricEnabled(!!user?.preferences?.biometricEnabled);
  }, [user?.preferences?.biometricEnabled]);

  const readStoredBiometricPassword = useCallback(async () => {
    return SecureStore.getItemAsync(BIOMETRIC_PASSWORD_KEY);
  }, []);

  const readStoredBiometricCredentials = useCallback(async () => {
    const raw = await SecureStore.getItemAsync(BIOMETRIC_CREDENTIALS_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as { email: string; password: string };
    } catch {
      return null;
    }
  }, []);

  const saveBiometricCredentials = useCallback(async (emailValue: string, passwordValue: string) => {
    await SecureStore.setItemAsync(
      BIOMETRIC_CREDENTIALS_KEY,
      JSON.stringify({ email: emailValue, password: passwordValue })
    );
  }, []);

  const clearBiometricCredentials = useCallback(async () => {
    await Promise.all([
      SecureStore.deleteItemAsync(BIOMETRIC_CREDENTIALS_KEY),
      SecureStore.deleteItemAsync(BIOMETRIC_PASSWORD_KEY),
    ]);
  }, []);

  const handleToggleBiometric = useCallback((next: boolean) => {
    if (!isMobile) {
      Alert.alert(t('notice'), t('developing'));
      return;
    }
    setBiometricMode(next ? 'enable' : 'disable');
    setBiometricInput('');
    setBiometricConfirm('');
    setBiometricModalVisible(true);
  }, [isMobile, t]);

  const handleConfirmBiometric = useCallback(async () => {
    if (!user?.email) {
      Alert.alert(t('notice'), t('developing'));
      return;
    }
    if (!biometricInput || biometricInput.length < 6) {
      Alert.alert(t('notice'), language === 'vi' ? 'Mật khẩu phải có ít nhất 6 ký tự' : 'Password must be at least 6 characters');
      return;
    }
    if (biometricMode === 'enable' && biometricInput !== biometricConfirm) {
      Alert.alert(t('notice'), language === 'vi' ? 'Xác nhận mật khẩu không khớp' : 'Password confirmation does not match');
      return;
    }
    setBiometricSaving(true);
    try {
      if (biometricMode === 'enable') {
        await authApi.login({ email: user.email, password: biometricInput });
        const hasHardware = await LocalAuthentication.hasHardwareAsync();
        if (!hasHardware) {
          Alert.alert(t('notice'), language === 'vi' ? 'Thiết bị chưa hỗ trợ sinh trắc học' : 'Biometric hardware not available');
          setBiometricSaving(false);
          return;
        }
        const isEnrolled = await LocalAuthentication.isEnrolledAsync();
        if (!isEnrolled) {
          Alert.alert(t('notice'), language === 'vi' ? 'Vui lòng cài đặt vân tay hoặc Face ID trước' : 'Please enroll biometric on your device');
          setBiometricSaving(false);
          return;
        }
        const result = await LocalAuthentication.authenticateAsync({
          promptMessage: language === 'vi' ? 'Xác thực sinh trắc học' : 'Authenticate',
          cancelLabel: language === 'vi' ? 'Hủy' : 'Cancel',
        });
        if (!result.success) {
          setBiometricSaving(false);
          return;
        }
        await SecureStore.setItemAsync(BIOMETRIC_PASSWORD_KEY, biometricInput);
        await saveBiometricCredentials(user.email, biometricInput);
        const response = await authApi.updatePreferences({ biometricEnabled: true });
        if (response?.preferences) {
          updateLocalUser({ preferences: { ...user?.preferences, ...response.preferences } });
        } else {
          updateLocalUser({ preferences: { ...user?.preferences, biometricEnabled: true } });
        }
        setBiometricEnabled(true);
        setBiometricModalVisible(false);
      } else {
        const storedPassword = await readStoredBiometricPassword();
        if (!storedPassword) {
          Alert.alert(t('notice'), language === 'vi' ? 'Chưa có mật khẩu sinh trắc học' : 'Biometric password not found');
          setBiometricSaving(false);
          return;
        }
        if (storedPassword !== biometricInput) {
          Alert.alert(t('notice'), language === 'vi' ? 'Mật khẩu sinh trắc học không đúng' : 'Biometric password is incorrect');
          setBiometricSaving(false);
          return;
        }
        await clearBiometricCredentials();
        const response = await authApi.updatePreferences({ biometricEnabled: false });
        if (response?.preferences) {
          updateLocalUser({ preferences: { ...user?.preferences, ...response.preferences } });
        } else {
          updateLocalUser({ preferences: { ...user?.preferences, biometricEnabled: false } });
        }
        setBiometricEnabled(false);
        setBiometricModalVisible(false);
      }
    } catch (error) {
      Alert.alert(t('notice'), language === 'vi' ? 'Không thể cập nhật sinh trắc học' : 'Unable to update biometric');
    } finally {
      setBiometricSaving(false);
    }
  }, [
    biometricConfirm,
    biometricInput,
    biometricMode,
    clearBiometricCredentials,
    language,
    readStoredBiometricPassword,
    saveBiometricCredentials,
    t,
    updateLocalUser,
    user?.email,
    user?.preferences,
  ]);

  const handleLogout = useCallback(() => {
    Alert.alert(
      t('logout'),
      t('logoutConfirm'),
      [
        { text: t('cancel'), style: 'cancel' },
        {
          text: t('logout'),
          style: 'destructive',
          onPress: async () => {
            try {
              await logout();
              console.log('[Settings] Logout successful');
            } catch (error) {
              console.warn('[Settings] Logout error:', error);
            }
          },
        },
      ]
    );
  }, [logout, t]);

  const handleOpenUrl = useCallback(async (url: string) => {
    const canOpen = await Linking.canOpenURL(url);
    if (!canOpen) {
      Alert.alert(t('notice'), t('developing'));
      return;
    }
    Linking.openURL(url);
  }, [t]);

  const handleContact = useCallback(() => {
    handleOpenUrl(`mailto:${supportEmail}`);
  }, [handleOpenUrl, supportEmail]);

  const handleOpenChangePassword = useCallback(() => {
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setBiometricPassword('');
    setChangePasswordVisible(true);
  }, []);

  const handleSubmitChangePassword = useCallback(async () => {
    if (!user?.id) {
      Alert.alert(t('notice'), t('developing'));
      return;
    }
    if (!currentPassword) {
      Alert.alert(t('notice'), language === 'vi' ? 'Vui lòng nhập mật khẩu hiện tại' : 'Please enter current password');
      return;
    }
    if (!newPassword || newPassword.length < 6) {
      Alert.alert(t('notice'), language === 'vi' ? 'Mật khẩu mới phải có ít nhất 6 ký tự' : 'New password must be at least 6 characters');
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert(t('notice'), language === 'vi' ? 'Xác nhận mật khẩu không khớp' : 'Password confirmation does not match');
      return;
    }
    if (biometricEnabled) {
      const storedPassword = await readStoredBiometricPassword();
      if (!storedPassword) {
        Alert.alert(t('notice'), language === 'vi' ? 'Chưa có mật khẩu sinh trắc học' : 'Biometric password not found');
        return;
      }
      if (biometricPassword !== storedPassword) {
        Alert.alert(t('notice'), language === 'vi' ? 'Mật khẩu sinh trắc học không đúng' : 'Biometric password is incorrect');
        return;
      }
    }
    setChangePasswordLoading(true);
    try {
      await authApi.changePassword(user.id, currentPassword, newPassword);
      if (biometricEnabled) {
        await SecureStore.setItemAsync(BIOMETRIC_PASSWORD_KEY, newPassword);
        const storedCredentials = await readStoredBiometricCredentials();
        if (storedCredentials?.email) {
          await saveBiometricCredentials(storedCredentials.email, newPassword);
        }
      }
      setChangePasswordVisible(false);
      Alert.alert(t('notice'), language === 'vi' ? 'Đổi mật khẩu thành công' : 'Password updated');
    } catch (error) {
      Alert.alert(t('notice'), language === 'vi' ? 'Không thể đổi mật khẩu' : 'Unable to change password');
    } finally {
      setChangePasswordLoading(false);
    }
  }, [
    biometricEnabled,
    biometricPassword,
    confirmPassword,
    currentPassword,
    language,
    newPassword,
    readStoredBiometricPassword,
    readStoredBiometricCredentials,
    saveBiometricCredentials,
    t,
    user?.id,
  ]);

  const handleOpenEditProfile = useCallback(() => {
    setEditName(user?.name || '');
    setEditEmail(user?.email || '');
    setEditPhone(user?.phone || '');
    setEditAvatarValue(user?.avatar);
    setEditAvatarId(getImageId(user?.avatar));
    setEditProfileVisible(true);
  }, [getImageId, user]);

  const handlePickAvatar = useCallback(async () => {
    if (avatarUploading) return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.8,
    });

    if (result.canceled || !result.assets?.[0]) return;
    const asset = result.assets[0];
    if (!token) return;

    try {
      setAvatarUploading(true);
      const formData = new FormData();
      formData.append('image', {
        uri: asset.uri,
        name: asset.fileName || 'avatar.jpg',
        type: asset.mimeType || 'image/jpeg',
      } as any);

      const response = await fetch(`${API_CONFIG.BASE_URL}/files/upload`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Upload failed');
      }

      const data = await response.json();
      const imageId = data.imageId || null;
      const imageUrl = data.imageUrl || (imageId ? `/files/${imageId}` : undefined);
      if (imageUrl) {
        setEditAvatarValue(imageUrl);
      }
      if (imageId) {
        setEditAvatarId(imageId);
      }
    } catch (error) {
      console.warn('[Settings] Upload avatar error:', error);
      Alert.alert(language === 'vi' ? 'Lỗi' : 'Error', language === 'vi' ? 'Không thể tải ảnh lên' : 'Failed to upload image');
    } finally {
      setAvatarUploading(false);
    }
  }, [avatarUploading, language, token]);

  const handleSaveProfile = useCallback(async () => {
    try {
      await updateProfile({
        fullName: editName,
        phone: editPhone,
        avatar: editAvatarValue,
        avatarId: editAvatarId,
      });
      await updateLocalUser({
        name: editName,
        email: editEmail,
        phone: editPhone,
        avatar: editAvatarId ? `/files/${editAvatarId}` : editAvatarValue,
      });
      setEditProfileVisible(false);
      Alert.alert(t('success'), t('profileUpdated'));
    } catch (error) {
      console.warn('[Settings] Update profile error:', error);
      await updateLocalUser({
        name: editName,
        email: editEmail,
        phone: editPhone,
        avatar: editAvatarId ? `/files/${editAvatarId}` : editAvatarValue,
      });
      setEditProfileVisible(false);
      Alert.alert(t('success'), t('profileUpdated'));
    }
  }, [editName, editEmail, editPhone, editAvatarId, editAvatarValue, updateProfile, updateLocalUser, t]);

  const handleSelectLanguage = useCallback((lang: Language) => {
    setLanguage(lang);
    setLanguageModalVisible(false);
  }, [setLanguage]);

  const avatarUrl = getImageUrl(user?.avatar);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <LinearGradient
        colors={isDark ? ['#0f766e', '#14b8a6'] : ['#14b8a6', '#0d9488']}
        style={[styles.header, { paddingTop: insets.top + 12 }]}
      >
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>{t('settings')}</Text>
        </View>

        <View style={styles.profileCard}>
          <TouchableOpacity style={styles.profileAvatarContainer} onPress={handleOpenEditProfile}>
            {avatarUrl ? (
              <Image source={{ uri: avatarUrl }} style={styles.profileAvatarImage} />
            ) : (
              <View style={styles.profileAvatar}>
                <User size={32} color="#4b5563" />
              </View>
            )}
            <View style={styles.cameraOverlay}>
              <Camera size={12} color="#fff" />
            </View>
          </TouchableOpacity>
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>{user?.name || 'User'}</Text>
            <Text style={styles.profileEmail}>{user?.email || ''}</Text>
            <View style={styles.roleBadge}>
              <Text style={styles.roleText}>{roleLabels[user?.role || 'staff'] || user?.role}</Text>
            </View>
          </View>
          <TouchableOpacity style={styles.editProfileBtn} onPress={handleOpenEditProfile}>
            <Text style={styles.editProfileText}>{t('editProfile')}</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 }}
      >
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>{t('hotel')}</Text>
          <View style={[styles.sectionCard, { backgroundColor: colors.sectionCard }]}>
            <SettingItem
              icon={<Building2 size={20} color="#6366f1" />}
              title={t('hotelInfo')}
              subtitle={selectedHotel?.name || t('noHotelSelected')}
              textColor={colors.text}
              subtitleColor={colors.textSecondary}
              chevronColor={colors.textSecondary}
              onPress={() => Alert.alert(t('notice'), t('developing'))}
            />
            <View style={[styles.divider, { backgroundColor: colors.divider }]} />
            <SettingItem
              icon={<CreditCard size={20} color="#10b981" />}
              title={t('paymentBilling')}
              textColor={colors.text}
              chevronColor={colors.textSecondary}
              onPress={() => Alert.alert(t('notice'), t('developing'))}
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>{t('notifications')}</Text>
          <View style={[styles.sectionCard, { backgroundColor: colors.sectionCard }]}>
            <SettingItem
              icon={<Bell size={20} color="#f59e0b" />}
              title={t('pushNotifications')}
              subtitle={t('pushDesc')}
              textColor={colors.text}
              subtitleColor={colors.textSecondary}
              showChevron={false}
              rightElement={
                <Switch
                  value={notificationsEnabled}
                  onValueChange={setNotificationsEnabled}
                  trackColor={{ false: colors.switchTrack, true: isDark ? '#065f46' : '#86efac' }}
                  thumbColor={notificationsEnabled ? colors.tint : colors.textSecondary}
                />
              }
            />
            <View style={[styles.divider, { backgroundColor: colors.divider }]} />
            <SettingItem
              icon={<Mail size={20} color="#3b82f6" />}
              title={t('emailNotifications')}
              subtitle={t('emailDesc')}
              textColor={colors.text}
              subtitleColor={colors.textSecondary}
              chevronColor={colors.textSecondary}
              onPress={() => Alert.alert(t('notice'), t('developing'))}
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>{t('appearance')}</Text>
          <View style={[styles.sectionCard, { backgroundColor: colors.sectionCard }]}>
            <SettingItem
              icon={isDark ? <Moon size={20} color="#8b5cf6" /> : <Sun size={20} color="#f59e0b" />}
              title={t('darkMode')}
              subtitle={t('darkModeDesc')}
              textColor={colors.text}
              subtitleColor={colors.textSecondary}
              showChevron={false}
              rightElement={
                <Switch
                  value={isDark}
                  onValueChange={toggleTheme}
                  trackColor={{ false: colors.switchTrack, true: isDark ? '#4338ca' : '#818cf8' }}
                  thumbColor={isDark ? '#6366f1' : colors.textSecondary}
                />
              }
            />
            <View style={[styles.divider, { backgroundColor: colors.divider }]} />
            <SettingItem
              icon={<Globe size={20} color="#0ea5e9" />}
              title={t('language')}
              subtitle={language === 'vi' ? t('vietnamese') : t('english')}
              textColor={colors.text}
              subtitleColor={colors.textSecondary}
              chevronColor={colors.textSecondary}
              onPress={() => setLanguageModalVisible(true)}
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>{t('security')}</Text>
          <View style={[styles.sectionCard, { backgroundColor: colors.sectionCard }]}>
            <SettingItem
              icon={<Lock size={20} color="#ef4444" />}
              title={t('changePassword')}
              textColor={colors.text}
              chevronColor={colors.textSecondary}
              onPress={handleOpenChangePassword}
            />
            <View style={[styles.divider, { backgroundColor: colors.divider }]} />
            {isMobile && (
              <>
                <SettingItem
                  icon={<Smartphone size={20} color="#10b981" />}
                  title={t('biometric')}
                  subtitle={t('biometricDesc')}
                  textColor={colors.text}
                  subtitleColor={colors.textSecondary}
                  showChevron={false}
                  rightElement={
                    <Switch
                      value={biometricEnabled}
                      onValueChange={handleToggleBiometric}
                      trackColor={{ false: colors.switchTrack, true: isDark ? '#065f46' : '#86efac' }}
                      thumbColor={biometricEnabled ? colors.tint : colors.textSecondary}
                    />
                  }
                />
                <View style={[styles.divider, { backgroundColor: colors.divider }]} />
              </>
            )}
            <SettingItem
              icon={<Shield size={20} color="#8b5cf6" />}
              title={t('privacyPolicy')}
              textColor={colors.text}
              chevronColor={colors.textSecondary}
              onPress={() => router.push('/settings/privacy-policy')}
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>{t('support')}</Text>
          <View style={[styles.sectionCard, { backgroundColor: colors.sectionCard }]}>
            <SettingItem
              icon={<HelpCircle size={20} color="#0ea5e9" />}
              title={t('helpCenter')}
              textColor={colors.text}
              chevronColor={colors.textSecondary}
              onPress={() => Alert.alert(t('notice'), t('developing'))}
            />
            <View style={[styles.divider, { backgroundColor: colors.divider }]} />
            <SettingItem
              icon={<MessageSquare size={20} color="#10b981" />}
              title={t('contactSupport')}
              subtitle={supportEmail}
              textColor={colors.text}
              subtitleColor={colors.textSecondary}
              chevronColor={colors.textSecondary}
              onPress={handleContact}
            />
            <View style={[styles.divider, { backgroundColor: colors.divider }]} />
            <SettingItem
              icon={<FileText size={20} color="#6366f1" />}
              title={t('terms')}
              textColor={colors.text}
              chevronColor={colors.textSecondary}
              onPress={() => router.push('/settings/terms-of-service')}
            />
          </View>
        </View>

        <TouchableOpacity style={[styles.logoutButton, { backgroundColor: isDark ? '#3b1818' : '#fef2f2', borderWidth: 1, borderColor: isDark ? '#7f1d1d' : '#fecaca' }]} onPress={handleLogout} disabled={logoutLoading}>
          {logoutLoading ? (
            <ActivityIndicator size="small" color="#ef4444" />
          ) : (
            <LogOut size={20} color="#ef4444" />
          )}
          <Text style={styles.logoutText}>{t('logout')}</Text>
        </TouchableOpacity>

        <View style={styles.versionContainer}>
          <Text style={[styles.versionText, { color: colors.textSecondary }]}>PHHotel PMS v1.0.0</Text>
          <Text style={[styles.copyrightText, { color: colors.textSecondary }]}>© 2025 PHGroup. All rights reserved.</Text>
        </View>
      </ScrollView>

      <Modal
        visible={editProfileVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setEditProfileVisible(false)}
      >
        <View style={[styles.modalOverlay, { backgroundColor: colors.overlay }]}>
          <View style={[styles.editProfileModal, { backgroundColor: colors.cardBackground }]}>
            <View style={styles.editProfileHeader}>
              <Text style={[styles.editProfileTitle, { color: colors.text }]}>{t('editProfile')}</Text>
              <TouchableOpacity onPress={() => setEditProfileVisible(false)}>
                <X size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <TouchableOpacity style={styles.editAvatarSection} onPress={handlePickAvatar} disabled={avatarUploading}>
              {getImageUrl(editAvatarValue) ? (
                <Image source={{ uri: getImageUrl(editAvatarValue) }} style={styles.editAvatarImage} />
              ) : (
                <View style={[styles.editAvatar, { backgroundColor: isDark ? '#334155' : '#f3f4f6' }]}>
                  <User size={40} color={colors.textSecondary} />
                </View>
              )}
              {avatarUploading && <ActivityIndicator size="small" color={colors.tint} style={{ marginTop: 10 }} />}
            </TouchableOpacity>

            <View style={styles.editForm}>
              <View style={styles.editField}>
                <Text style={[styles.editLabel, { color: colors.textSecondary }]}>{t('name')}</Text>
                <TextInput
                  style={[styles.editInput, { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder, color: colors.text }]}
                  value={editName}
                  onChangeText={setEditName}
                  placeholder={t('name')}
                  placeholderTextColor={colors.textSecondary}
                />
              </View>
              <View style={styles.editField}>
                <Text style={[styles.editLabel, { color: colors.textSecondary }]}>{t('email')}</Text>
                <TextInput
                  style={[styles.editInput, { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder, color: colors.text }]}
                  value={editEmail}
                  onChangeText={setEditEmail}
                  placeholder={t('email')}
                  placeholderTextColor={colors.textSecondary}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>
              <View style={styles.editField}>
                <Text style={[styles.editLabel, { color: colors.textSecondary }]}>{t('phone')}</Text>
                <TextInput
                  style={[styles.editInput, { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder, color: colors.text }]}
                  value={editPhone}
                  onChangeText={setEditPhone}
                  placeholder={t('phone')}
                  placeholderTextColor={colors.textSecondary}
                  keyboardType="phone-pad"
                />
              </View>
              <View style={styles.editField}>
                <Text style={[styles.editLabel, { color: colors.textSecondary }]}>{t('role')}</Text>
                <View style={[styles.roleDisplay, { backgroundColor: isDark ? '#334155' : '#f3f4f6' }]}>
                  <Text style={[styles.roleDisplayText, { color: colors.text }]}>
                    {roleLabels[user?.role || 'staff'] || user?.role}
                  </Text>
                </View>
              </View>
            </View>

            <TouchableOpacity
              style={[styles.saveButton, { backgroundColor: colors.tint }, updateProfileLoading && styles.saveButtonDisabled]}
              onPress={handleSaveProfile}
              disabled={updateProfileLoading}
            >
              {updateProfileLoading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.saveButtonText}>{t('save')}</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal
        visible={changePasswordVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setChangePasswordVisible(false)}
      >
        <View style={[styles.modalOverlay, { backgroundColor: colors.overlay }]}>
          <View style={[styles.changePasswordModal, { backgroundColor: colors.cardBackground }]}>
            <View style={styles.changePasswordHeader}>
              <Text style={[styles.changePasswordTitle, { color: colors.text }]}>{t('changePassword')}</Text>
              <TouchableOpacity onPress={() => setChangePasswordVisible(false)} disabled={changePasswordLoading}>
                <X size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <View style={styles.changePasswordFields}>
              <View style={styles.changePasswordField}>
                <Text style={[styles.changePasswordLabel, { color: colors.textSecondary }]}>
                  {language === 'vi' ? 'Mật khẩu hiện tại' : 'Current password'}
                </Text>
                <TextInput
                  style={[styles.changePasswordInput, { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder, color: colors.text }]}
                  value={currentPassword}
                  onChangeText={setCurrentPassword}
                  placeholder={language === 'vi' ? 'Nhập mật khẩu hiện tại' : 'Enter current password'}
                  placeholderTextColor={colors.textSecondary}
                  secureTextEntry
                />
              </View>
              <View style={styles.changePasswordField}>
                <Text style={[styles.changePasswordLabel, { color: colors.textSecondary }]}>
                  {language === 'vi' ? 'Mật khẩu mới' : 'New password'}
                </Text>
                <TextInput
                  style={[styles.changePasswordInput, { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder, color: colors.text }]}
                  value={newPassword}
                  onChangeText={setNewPassword}
                  placeholder={language === 'vi' ? 'Nhập mật khẩu mới' : 'Enter new password'}
                  placeholderTextColor={colors.textSecondary}
                  secureTextEntry
                />
              </View>
              <View style={styles.changePasswordField}>
                <Text style={[styles.changePasswordLabel, { color: colors.textSecondary }]}>
                  {language === 'vi' ? 'Xác nhận mật khẩu mới' : 'Confirm new password'}
                </Text>
                <TextInput
                  style={[styles.changePasswordInput, { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder, color: colors.text }]}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  placeholder={language === 'vi' ? 'Nhập lại mật khẩu mới' : 'Re-enter new password'}
                  placeholderTextColor={colors.textSecondary}
                  secureTextEntry
                />
              </View>
              {biometricEnabled && (
                <View style={styles.changePasswordField}>
                  <Text style={[styles.changePasswordLabel, { color: colors.textSecondary }]}>
                    {language === 'vi' ? 'Mật khẩu sinh trắc học' : 'Biometric password'}
                  </Text>
                  <TextInput
                    style={[styles.changePasswordInput, { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder, color: colors.text }]}
                    value={biometricPassword}
                    onChangeText={setBiometricPassword}
                    placeholder={language === 'vi' ? 'Nhập mật khẩu sinh trắc học' : 'Enter biometric password'}
                    placeholderTextColor={colors.textSecondary}
                    secureTextEntry
                  />
                </View>
              )}
            </View>

            <TouchableOpacity
              style={[styles.changePasswordButton, { backgroundColor: colors.tint }, changePasswordLoading && styles.changePasswordButtonDisabled]}
              onPress={handleSubmitChangePassword}
              disabled={changePasswordLoading}
            >
              {changePasswordLoading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.changePasswordButtonText}>{t('save')}</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal
        visible={biometricModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setBiometricModalVisible(false)}
      >
        <Pressable
          style={[styles.modalOverlay, { backgroundColor: colors.overlay }]}
          onPress={() => setBiometricModalVisible(false)}
        >
          <View style={[styles.biometricModal, { backgroundColor: colors.cardBackground }]}>
            <Text style={[styles.biometricTitle, { color: colors.text }]}>
              {biometricMode === 'enable'
                ? language === 'vi' ? 'Bật sinh trắc học' : 'Enable biometric'
                : language === 'vi' ? 'Tắt sinh trắc học' : 'Disable biometric'}
            </Text>
            <Text style={[styles.biometricSubtitle, { color: colors.textSecondary }]}>
              {biometricMode === 'enable'
                ? language === 'vi' ? 'Nhập mật khẩu tài khoản để bật' : 'Enter account password to enable'
                : language === 'vi' ? 'Nhập mật khẩu sinh trắc học để tắt' : 'Enter biometric password to disable'}
            </Text>

            <View style={styles.biometricFields}>
              <TextInput
                style={[styles.biometricInput, { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder, color: colors.text }]}
                value={biometricInput}
                onChangeText={setBiometricInput}
                placeholder={language === 'vi' ? 'Mật khẩu' : 'Password'}
                placeholderTextColor={colors.textSecondary}
                secureTextEntry
              />
              {biometricMode === 'enable' && (
                <TextInput
                  style={[styles.biometricInput, { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder, color: colors.text }]}
                  value={biometricConfirm}
                  onChangeText={setBiometricConfirm}
                  placeholder={language === 'vi' ? 'Xác nhận mật khẩu' : 'Confirm password'}
                  placeholderTextColor={colors.textSecondary}
                  secureTextEntry
                />
              )}
            </View>

            <View style={styles.biometricActions}>
              <TouchableOpacity
                style={[styles.biometricActionSecondary, { borderColor: colors.border }]}
                onPress={() => setBiometricModalVisible(false)}
                disabled={biometricSaving}
              >
                <Text style={[styles.biometricActionSecondaryText, { color: colors.text }]}>{t('cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.biometricActionPrimary, { backgroundColor: colors.tint }, biometricSaving && styles.biometricActionPrimaryDisabled]}
                onPress={handleConfirmBiometric}
                disabled={biometricSaving}
              >
                {biometricSaving ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.biometricActionPrimaryText}>{t('save')}</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </Pressable>
      </Modal>

      <Modal
        visible={languageModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setLanguageModalVisible(false)}
      >
        <Pressable
          style={[styles.modalOverlay, { backgroundColor: colors.overlay }]}
          onPress={() => setLanguageModalVisible(false)}
        >
          <View style={[styles.languageModal, { backgroundColor: colors.cardBackground }]}>
            <Text style={[styles.languageModalTitle, { color: colors.text }]}>{t('selectLanguage')}</Text>

            <TouchableOpacity
              style={[styles.languageOption, language === 'vi' && [styles.languageOptionSelected, { backgroundColor: isDark ? 'rgba(15,118,110,0.15)' : '#ecfdf5', borderColor: colors.tint }]]}
              onPress={() => handleSelectLanguage('vi')}
            >
              <Text style={styles.languageFlag}>🇻🇳</Text>
              <Text style={[styles.languageOptionText, { color: colors.text }, language === 'vi' && { fontWeight: '600' as const, color: colors.tint }]}>
                Tiếng Việt
              </Text>
              {language === 'vi' && <Check size={20} color={colors.tint} />}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.languageOption, language === 'en' && [styles.languageOptionSelected, { backgroundColor: isDark ? 'rgba(15,118,110,0.15)' : '#ecfdf5', borderColor: colors.tint }]]}
              onPress={() => handleSelectLanguage('en')}
            >
              <Text style={styles.languageFlag}>🇺🇸</Text>
              <Text style={[styles.languageOptionText, { color: colors.text }, language === 'en' && { fontWeight: '600' as const, color: colors.tint }]}>
                English
              </Text>
              {language === 'en' && <Check size={20} color={colors.tint} />}
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  headerContent: {
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700' as const,
    color: '#fff',
  },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 16,
    padding: 16,
  },
  profileAvatarContainer: {
    position: 'relative',
    marginRight: 14,
  },
  profileAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileAvatarImage: {
    width: 56,
    height: 56,
    borderRadius: 28,
  },
  cameraOverlay: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#0f766e',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: '#fff',
  },
  profileEmail: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 2,
  },
  roleBadge: {
    backgroundColor: 'rgba(255,255,255,0.25)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  roleText: {
    fontSize: 11,
    fontWeight: '600' as const,
    color: '#fff',
  },
  editProfileBtn: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 8,
  },
  editProfileText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '500' as const,
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 20,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600' as const,
    marginBottom: 10,
    marginLeft: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sectionCard: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  settingIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: 'rgba(99,102,241,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  settingContent: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 15,
    fontWeight: '500' as const,
  },
  settingSubtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  divider: {
    height: 1,
    marginLeft: 70,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    padding: 16,
    gap: 10,
    marginBottom: 20,
  },
  logoutText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#ef4444',
  },
  versionContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  versionText: {
    fontSize: 13,
  },
  copyrightText: {
    fontSize: 12,
    marginTop: 4,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  editProfileModal: {
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    maxHeight: '85%',
  },
  editProfileHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  editProfileTitle: {
    fontSize: 20,
    fontWeight: '700' as const,
  },
  editAvatarSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  editAvatarImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  editAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  editForm: {
    gap: 16,
  },
  editField: {
    gap: 6,
  },
  editLabel: {
    fontSize: 13,
    fontWeight: '500' as const,
  },
  editInput: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
  },
  roleDisplay: {
    borderRadius: 12,
    padding: 14,
  },
  roleDisplayText: {
    fontSize: 15,
  },
  saveButton: {
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 24,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600' as const,
  },
  changePasswordModal: {
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 420,
  },
  changePasswordHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 18,
  },
  changePasswordTitle: {
    fontSize: 20,
    fontWeight: '700' as const,
  },
  changePasswordFields: {
    gap: 14,
  },
  changePasswordField: {
    gap: 6,
  },
  changePasswordLabel: {
    fontSize: 13,
    fontWeight: '500' as const,
  },
  changePasswordInput: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
  },
  changePasswordButton: {
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 22,
  },
  changePasswordButtonDisabled: {
    opacity: 0.6,
  },
  changePasswordButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600' as const,
  },
  biometricModal: {
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 360,
  },
  biometricTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    textAlign: 'center',
  },
  biometricSubtitle: {
    fontSize: 13,
    textAlign: 'center',
    marginTop: 6,
  },
  biometricFields: {
    gap: 12,
    marginTop: 18,
  },
  biometricInput: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
  },
  biometricActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
  biometricActionSecondary: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    alignItems: 'center',
  },
  biometricActionSecondaryText: {
    fontSize: 15,
    fontWeight: '600' as const,
  },
  biometricActionPrimary: {
    flex: 1,
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
  },
  biometricActionPrimaryDisabled: {
    opacity: 0.6,
  },
  biometricActionPrimaryText: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: '#fff',
  },
  languageModal: {
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 340,
  },
  languageModalTitle: {
    fontSize: 20,
    fontWeight: '700' as const,
    textAlign: 'center',
    marginBottom: 20,
  },
  languageOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    gap: 12,
  },
  languageOptionSelected: {
    borderWidth: 1,
  },
  languageFlag: {
    fontSize: 24,
  },
  languageOptionText: {
    fontSize: 16,
    flex: 1,
  },
  languageOptionTextSelected: {
    fontWeight: '600' as const,
  },
});
