import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  Linking,
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
} from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Colors from '@/constants/colors';
import { useHotel } from '@/contexts/HotelContext';

interface SettingItemProps {
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
  onPress?: () => void;
  rightElement?: React.ReactNode;
  showChevron?: boolean;
}

const SettingItem = ({ icon, title, subtitle, onPress, rightElement, showChevron = true }: SettingItemProps) => (
  <TouchableOpacity style={styles.settingItem} onPress={onPress} disabled={!onPress && !rightElement}>
    <View style={styles.settingIcon}>{icon}</View>
    <View style={styles.settingContent}>
      <Text style={styles.settingTitle}>{title}</Text>
      {subtitle && <Text style={styles.settingSubtitle}>{subtitle}</Text>}
    </View>
    {rightElement || (showChevron && onPress && <ChevronRight size={20} color={Colors.light.textSecondary} />)}
  </TouchableOpacity>
);

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const { selectedHotel } = useHotel();
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [darkModeEnabled, setDarkModeEnabled] = useState(false);
  const [biometricEnabled, setBiometricEnabled] = useState(false);

  const handleLogout = () => {
    Alert.alert(
      'Đăng xuất',
      'Bạn có chắc chắn muốn đăng xuất?',
      [
        { text: 'Hủy', style: 'cancel' },
        { text: 'Đăng xuất', style: 'destructive', onPress: () => console.log('Logout') },
      ]
    );
  };

  const handleContact = () => {
    Linking.openURL('mailto:support@phhotel.com');
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#374151', '#4b5563']}
        style={[styles.header, { paddingTop: insets.top + 12 }]}
      >
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Cài đặt</Text>
        </View>

        <View style={styles.profileCard}>
          <View style={styles.profileAvatar}>
            <User size={32} color="#4b5563" />
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>Admin</Text>
            <Text style={styles.profileEmail}>admin@phhotel.com</Text>
          </View>
          <TouchableOpacity style={styles.editProfileBtn}>
            <Text style={styles.editProfileText}>Sửa</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 }}
      >
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Khách sạn</Text>
          <View style={styles.sectionCard}>
            <SettingItem
              icon={<Building2 size={20} color="#6366f1" />}
              title="Thông tin khách sạn"
              subtitle={selectedHotel?.name || 'Chưa chọn khách sạn'}
              onPress={() => Alert.alert('Thông báo', 'Tính năng đang phát triển')}
            />
            <View style={styles.divider} />
            <SettingItem
              icon={<CreditCard size={20} color="#10b981" />}
              title="Thanh toán & Hóa đơn"
              onPress={() => Alert.alert('Thông báo', 'Tính năng đang phát triển')}
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Thông báo</Text>
          <View style={styles.sectionCard}>
            <SettingItem
              icon={<Bell size={20} color="#f59e0b" />}
              title="Thông báo đẩy"
              subtitle="Nhận thông báo về đặt phòng mới"
              showChevron={false}
              rightElement={
                <Switch
                  value={notificationsEnabled}
                  onValueChange={setNotificationsEnabled}
                  trackColor={{ false: '#e5e7eb', true: '#86efac' }}
                  thumbColor={notificationsEnabled ? '#10b981' : '#9ca3af'}
                />
              }
            />
            <View style={styles.divider} />
            <SettingItem
              icon={<Mail size={20} color="#3b82f6" />}
              title="Email thông báo"
              subtitle="Báo cáo hàng ngày qua email"
              onPress={() => Alert.alert('Thông báo', 'Tính năng đang phát triển')}
            />
            <View style={styles.divider} />
            <SettingItem
              icon={<MessageSquare size={20} color="#8b5cf6" />}
              title="SMS thông báo"
              subtitle="Thông báo quan trọng qua SMS"
              onPress={() => Alert.alert('Thông báo', 'Tính năng đang phát triển')}
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Giao diện</Text>
          <View style={styles.sectionCard}>
            <SettingItem
              icon={<Moon size={20} color="#6366f1" />}
              title="Chế độ tối"
              subtitle="Giảm mỏi mắt vào ban đêm"
              showChevron={false}
              rightElement={
                <Switch
                  value={darkModeEnabled}
                  onValueChange={setDarkModeEnabled}
                  trackColor={{ false: '#e5e7eb', true: '#86efac' }}
                  thumbColor={darkModeEnabled ? '#10b981' : '#9ca3af'}
                />
              }
            />
            <View style={styles.divider} />
            <SettingItem
              icon={<Globe size={20} color="#0ea5e9" />}
              title="Ngôn ngữ"
              subtitle="Tiếng Việt"
              onPress={() => Alert.alert('Thông báo', 'Tính năng đang phát triển')}
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Bảo mật</Text>
          <View style={styles.sectionCard}>
            <SettingItem
              icon={<Lock size={20} color="#ef4444" />}
              title="Đổi mật khẩu"
              onPress={() => Alert.alert('Thông báo', 'Tính năng đang phát triển')}
            />
            <View style={styles.divider} />
            <SettingItem
              icon={<Smartphone size={20} color="#10b981" />}
              title="Xác thực sinh trắc học"
              subtitle="Đăng nhập bằng vân tay/Face ID"
              showChevron={false}
              rightElement={
                <Switch
                  value={biometricEnabled}
                  onValueChange={setBiometricEnabled}
                  trackColor={{ false: '#e5e7eb', true: '#86efac' }}
                  thumbColor={biometricEnabled ? '#10b981' : '#9ca3af'}
                />
              }
            />
            <View style={styles.divider} />
            <SettingItem
              icon={<Shield size={20} color="#8b5cf6" />}
              title="Phiên đăng nhập"
              subtitle="Quản lý các thiết bị đã đăng nhập"
              onPress={() => Alert.alert('Thông báo', 'Tính năng đang phát triển')}
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Hỗ trợ</Text>
          <View style={styles.sectionCard}>
            <SettingItem
              icon={<HelpCircle size={20} color="#0ea5e9" />}
              title="Trung tâm trợ giúp"
              onPress={() => Alert.alert('Thông báo', 'Tính năng đang phát triển')}
            />
            <View style={styles.divider} />
            <SettingItem
              icon={<MessageSquare size={20} color="#10b981" />}
              title="Liên hệ hỗ trợ"
              subtitle="support@phhotel.com"
              onPress={handleContact}
            />
            <View style={styles.divider} />
            <SettingItem
              icon={<FileText size={20} color="#6366f1" />}
              title="Điều khoản sử dụng"
              onPress={() => Alert.alert('Thông báo', 'Tính năng đang phát triển')}
            />
          </View>
        </View>

        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <LogOut size={20} color="#ef4444" />
          <Text style={styles.logoutText}>Đăng xuất</Text>
        </TouchableOpacity>

        <View style={styles.versionContainer}>
          <Text style={styles.versionText}>PHHotel PMS v1.0.0</Text>
          <Text style={styles.copyrightText}>© 2025 PHGroup. All rights reserved.</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.background,
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
  profileAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
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
    color: Colors.light.textSecondary,
    marginBottom: 10,
    marginLeft: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sectionCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
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
    backgroundColor: '#f3f4f6',
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
    color: Colors.light.text,
  },
  settingSubtitle: {
    fontSize: 13,
    color: Colors.light.textSecondary,
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: '#f3f4f6',
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
    color: Colors.light.textSecondary,
  },
  copyrightText: {
    fontSize: 12,
    color: Colors.light.textSecondary,
    marginTop: 4,
  },
});
