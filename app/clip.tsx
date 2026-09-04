import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  ScrollView,
  Linking,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BedDouble, CalendarDays, FileText, BarChart3 } from 'lucide-react-native';
import * as WebBrowser from 'expo-web-browser';
import Colors from '@/constants/colors';
import { useLanguage } from '@/contexts/LanguageContext';

const APP_STORE_URL = 'https://apps.apple.com/app/id6778220852';
const CLIP_WEB_URL = 'https://phhotel.vn/clip';
const YOUTUBE_URL = 'https://youtu.be/8YDrnZSQ2Xc';
const APP_SCHEME = 'rork-app://';

export default function ClipPromoScreen() {
  const insets = useSafeAreaInsets();
  const { language } = useLanguage();
  const isVi = language !== 'en';

  const copy = useMemo(
    () =>
      isVi
        ? {
            brand: 'PHHotel PMS',
            headline: 'Quản lý khách sạn trên điện thoại',
            subtitle:
              'Phòng, đặt phòng, hóa đơn và báo cáo — sẵn sàng cho lễ tân và chủ khách sạn.',
            features: [
              { icon: BedDouble, title: 'Sơ đồ phòng realtime' },
              { icon: CalendarDays, title: 'Lịch đặt phòng & OTA' },
              { icon: FileText, title: 'Hóa đơn & thanh toán' },
              { icon: BarChart3, title: 'Báo cáo doanh thu' },
            ],
            openApp: 'Mở / Tải PHHotel PMS',
            website: 'Xem phhotel.vn/clip',
            watchVideo: 'Xem video giới thiệu',
            footnote: 'App Clip quảng cáo · Cài app đầy đủ để đăng nhập và vận hành',
          }
        : {
            brand: 'PHHotel PMS',
            headline: 'Hotel management on your phone',
            subtitle:
              'Rooms, bookings, invoices, and reports — built for front desk and hotel owners.',
            features: [
              { icon: BedDouble, title: 'Live room board' },
              { icon: CalendarDays, title: 'Bookings & OTA calendar' },
              { icon: FileText, title: 'Invoices & payments' },
              { icon: BarChart3, title: 'Revenue reports' },
            ],
            openApp: 'Open / Get PHHotel PMS',
            website: 'Visit phhotel.vn/clip',
            watchVideo: 'Watch intro video',
            footnote: 'Promotional App Clip · Install the full app to sign in and operate',
          },
    [isVi]
  );

  const openFullApp = async () => {
    try {
      const canOpen = await Linking.canOpenURL(APP_SCHEME);
      if (canOpen) {
        await Linking.openURL(APP_SCHEME);
        return;
      }
    } catch {
      // fall through to store
    }
    if (Platform.OS === 'ios') {
      await Linking.openURL(APP_STORE_URL);
    } else {
      await WebBrowser.openBrowserAsync(CLIP_WEB_URL);
    }
  };

  const openWebsite = () => WebBrowser.openBrowserAsync(CLIP_WEB_URL);
  const openVideo = () => WebBrowser.openBrowserAsync(YOUTUBE_URL);

  return (
    <View style={[styles.root, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <LinearGradient colors={['#0f766e', '#134e4a', '#0b1f1e']} style={StyleSheet.absoluteFill} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Image
          source={require('../assets/images/phgroup_logo_circle.png')}
          style={styles.logo}
          accessibilityLabel="PHHotel"
        />
        <Text style={styles.brand}>{copy.brand}</Text>
        <Text style={styles.headline}>{copy.headline}</Text>
        <Text style={styles.subtitle}>{copy.subtitle}</Text>

        <View style={styles.featureList}>
          {copy.features.map((f) => {
            const Icon = f.icon;
            return (
              <View key={f.title} style={styles.featureRow}>
                <View style={styles.featureIcon}>
                  <Icon color="#fff" size={20} />
                </View>
                <Text style={styles.featureText}>{f.title}</Text>
              </View>
            );
          })}
        </View>

        <TouchableOpacity style={styles.primaryBtn} onPress={openFullApp} activeOpacity={0.9}>
          <Text style={styles.primaryBtnText}>{copy.openApp}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.secondaryBtn} onPress={openVideo} activeOpacity={0.9}>
          <Text style={styles.secondaryBtnText}>{copy.watchVideo}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.secondaryBtn} onPress={openWebsite} activeOpacity={0.9}>
          <Text style={styles.secondaryBtnText}>{copy.website}</Text>
        </TouchableOpacity>

        <Text style={styles.footnote}>{copy.footnote}</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.light.tint,
  },
  content: {
    paddingHorizontal: 24,
    paddingTop: 32,
    paddingBottom: 40,
    alignItems: 'center',
  },
  logo: {
    width: 88,
    height: 88,
    borderRadius: 44,
    marginBottom: 16,
  },
  brand: {
    color: '#99f6e4',
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  headline: {
    color: '#fff',
    fontSize: 28,
    fontWeight: '800',
    textAlign: 'center',
    lineHeight: 34,
    marginBottom: 12,
  },
  subtitle: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 28,
  },
  featureList: {
    width: '100%',
    gap: 12,
    marginBottom: 28,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 14,
  },
  featureIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(20,184,166,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  featureText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
  primaryBtn: {
    width: '100%',
    backgroundColor: '#fff',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 12,
  },
  primaryBtnText: {
    color: Colors.light.tint,
    fontSize: 16,
    fontWeight: '700',
  },
  secondaryBtn: {
    width: '100%',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.35)',
    marginBottom: 20,
  },
  secondaryBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  footnote: {
    color: 'rgba(255,255,255,0.55)',
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
  },
});
