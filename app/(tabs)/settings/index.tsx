import React, { useState, useCallback } from 'react';
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
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useHotel } from '@/contexts/HotelContext';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useLanguage } from '@/contexts/LanguageContext';
import type { Language } from '@/contexts/LanguageContext';

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
    {rightElement || (showChevron && onPress && <ChevronRight size={20} color={chevronColor || '#9ca3af'} />)}
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
  const { selectedHotel } = useHotel();
  const { user, logout, logoutLoading, updateProfile, updateProfileLoading, updateLocalUser } = useAuth();
  const { isDark, toggleTheme, colors } = useTheme();
  const { t, language, setLanguage } = useLanguage();

  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const [editProfileVisible, setEditProfileVisible] = useState(false);
  const [languageModalVisible, setLanguageModalVisible] = useState(false);

  const [editName, setEditName] = useState(user?.name || '');
  const [editEmail, setEditEmail] = useState(user?.email || '');
  const [editPhone, setEditPhone] = useState(user?.phone || '');

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
              console.error('[Settings] Logout error:', error);
            }
          },
        },
      ]
    );
  }, [logout, t]);

  const handleContact = useCallback(() => {
    Linking.openURL('mailto:support@phhotel.com');
  }, []);

  const handleOpenEditProfile = useCallback(() => {
    setEditName(user?.name || '');
    setEditEmail(user?.email || '');
    setEditPhone(user?.phone || '');
    setEditProfileVisible(true);
  }, [user]);

  const handleSaveProfile = useCallback(async () => {
    try {
      await updateProfile({
        name: editName,
        email: editEmail,
        phone: editPhone,
      });
      await updateLocalUser({
        name: editName,
        email: editEmail,
        phone: editPhone,
      });
      setEditProfileVisible(false);
      Alert.alert(t('success'), t('profileUpdated'));
    } catch (error) {
      console.error('[Settings] Update profile error:', error);
      await updateLocalUser({
        name: editName,
        email: editEmail,
        phone: editPhone,
      });
      setEditProfileVisible(false);
      Alert.alert(t('success'), t('profileUpdated'));
    }
  }, [editName, editEmail, editPhone, updateProfile, updateLocalUser, t]);

  const handleSelectLanguage = useCallback((lang: Language) => {
    setLanguage(lang);
    setLanguageModalVisible(false);
  }, [setLanguage]);

  const avatarUrl = user?.avatar;

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
                  trackColor={{ false: colors.switchTrack, true: '#86efac' }}
                  thumbColor={notificationsEnabled ? '#10b981' : '#9ca3af'}
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
                  trackColor={{ false: colors.switchTrack, true: '#818cf8' }}
                  thumbColor={isDark ? '#6366f1' : '#9ca3af'}
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
              onPress={() => Alert.alert(t('notice'), t('developing'))}
            />
            <View style={[styles.divider, { backgroundColor: colors.divider }]} />
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
                  onValueChange={setBiometricEnabled}
                  trackColor={{ false: colors.switchTrack, true: '#86efac' }}
                  thumbColor={biometricEnabled ? '#10b981' : '#9ca3af'}
                />
              }
            />
            <View style={[styles.divider, { backgroundColor: colors.divider }]} />
            <SettingItem
              icon={<Shield size={20} color="#8b5cf6" />}
              title={t('sessions')}
              subtitle={t('sessionsDesc')}
              textColor={colors.text}
              subtitleColor={colors.textSecondary}
              chevronColor={colors.textSecondary}
              onPress={() => Alert.alert(t('notice'), t('developing'))}
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
              subtitle="support@phhotel.com"
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
              onPress={() => Alert.alert(t('notice'), t('developing'))}
            />
          </View>
        </View>

        <TouchableOpacity style={[styles.logoutButton, isDark && { backgroundColor: '#3b1818' }]} onPress={handleLogout} disabled={logoutLoading}>
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

            <View style={styles.editAvatarSection}>
              {avatarUrl ? (
                <Image source={{ uri: avatarUrl }} style={styles.editAvatarImage} />
              ) : (
                <View style={[styles.editAvatar, { backgroundColor: isDark ? '#334155' : '#f3f4f6' }]}>
                  <User size={40} color={colors.textSecondary} />
                </View>
              )}
            </View>

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
              style={[styles.saveButton, updateProfileLoading && styles.saveButtonDisabled]}
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
              style={[styles.languageOption, language === 'vi' && styles.languageOptionSelected]}
              onPress={() => handleSelectLanguage('vi')}
            >
              <Text style={styles.languageFlag}>🇻🇳</Text>
              <Text style={[styles.languageOptionText, { color: colors.text }, language === 'vi' && styles.languageOptionTextSelected]}>
                Tiếng Việt
              </Text>
              {language === 'vi' && <Check size={20} color="#0f766e" />}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.languageOption, language === 'en' && styles.languageOptionSelected]}
              onPress={() => handleSelectLanguage('en')}
            >
              <Text style={styles.languageFlag}>🇺🇸</Text>
              <Text style={[styles.languageOptionText, { color: colors.text }, language === 'en' && styles.languageOptionTextSelected]}>
                English
              </Text>
              {language === 'en' && <Check size={20} color="#0f766e" />}
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
    backgroundColor: '#fef2f2',
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
    backgroundColor: '#0f766e',
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
    backgroundColor: '#ecfdf5',
    borderWidth: 1,
    borderColor: '#0f766e',
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
    color: '#0f766e',
  },
});
