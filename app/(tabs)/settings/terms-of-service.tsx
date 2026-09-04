import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '@/contexts/ThemeContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { TERMS_DOCS } from './terms-of-service.content';

export default function TermsOfServiceScreen() {
  const { colors } = useTheme();
  const { language } = useLanguage();
  const router = useRouter();
  const doc = TERMS_DOCS[language === 'vi' ? 'vi' : 'en'];
  const updated = '04/09/2026';

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.sectionCard, borderBottomColor: colors.divider }]}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <ArrowLeft size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>
          {language === 'vi' ? 'Điều khoản sử dụng' : 'Terms of Service'}
        </Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={[styles.contractPaper, { backgroundColor: colors.sectionCard }]}>
          <Text style={[styles.title, { color: colors.text }]}>{doc.title}</Text>
          {!!doc.subtitle && (
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>{doc.subtitle}</Text>
          )}
          <Text style={[styles.meta, { color: colors.textSecondary }]}>
            {doc.lastUpdatedLabel}: {updated}
          </Text>

          {doc.sections.map((section, si) => (
            <View key={`s-${si}`} style={styles.contentSection}>
              {!!section.title && (
                <Text style={[styles.sectionTitle, { color: colors.text }]}>{section.title}</Text>
              )}
              {section.blocks.map((b, bi) => (
                <View key={`b-${si}-${bi}`}>
                  {!!b.h3 && (
                    <Text style={[styles.subsectionTitle, { color: colors.text }]}>{b.h3}</Text>
                  )}
                  {(b.p || []).map((para, pi) => (
                    <Text key={`p-${si}-${bi}-${pi}`} style={[styles.text, { color: colors.text }]}>
                      {para}
                    </Text>
                  ))}
                  {!!b.strongP && (
                    <Text style={[styles.text, { color: colors.text }]}>
                      <Text style={styles.bold}>{b.strongP}</Text>
                    </Text>
                  )}
                  {(b.ul || []).map((item, ui) => (
                    <Text key={`u-${si}-${bi}-${ui}`} style={[styles.listItem, { color: colors.text }]}>
                      • {item}
                    </Text>
                  ))}
                </View>
              ))}
            </View>
          ))}

          <Text style={[styles.text, { color: colors.text }]}>
            {language === 'vi' ? 'Xem bản đầy đủ: ' : 'Full version: '}
            <Text style={styles.link} onPress={() => Linking.openURL('https://phhotel.vn/terms-of-service')}>
              phhotel.vn/terms-of-service
            </Text>
          </Text>
          <Text style={[styles.text, { color: colors.text }]}>
            {language === 'vi' ? 'Email hỗ trợ: ' : 'Support: '}
            <Text style={styles.link} onPress={() => Linking.openURL('mailto:hotro@phhotel.vn')}>
              hotro@phhotel.vn
            </Text>
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backButton: { padding: 8, marginRight: 8 },
  headerTitle: { fontSize: 18, fontWeight: '600' },
  content: { flex: 1 },
  contractPaper: { margin: 16, borderRadius: 12, padding: 20 },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
    lineHeight: 28,
  },
  subtitle: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 8,
    fontStyle: 'italic',
    lineHeight: 20,
  },
  meta: { fontSize: 13, textAlign: 'center', marginBottom: 20 },
  contentSection: { marginBottom: 20 },
  sectionTitle: { fontSize: 17, fontWeight: '600', marginBottom: 10 },
  subsectionTitle: { fontSize: 15, fontWeight: '600', marginTop: 8, marginBottom: 6 },
  text: { fontSize: 14, lineHeight: 22, marginBottom: 8, textAlign: 'justify' },
  listItem: { fontSize: 14, lineHeight: 22, marginBottom: 6, paddingLeft: 4 },
  bold: { fontWeight: '600' },
  link: { color: '#0ea5e9', textDecorationLine: 'underline' },
});
