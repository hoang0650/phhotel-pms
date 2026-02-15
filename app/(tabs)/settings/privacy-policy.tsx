import React, { useContext } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { LanguageContext } from '../../../contexts/LanguageContext';
import { ThemeContext } from '../../../contexts/ThemeContext';

export default function PrivacyPolicyScreen() {
  const router = useRouter();
  const { t } = useContext(LanguageContext);
  const { theme } = useContext(ThemeContext);

  const styles = createStyles(theme);

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>{t('privacyPolicyTitle')}</Text>
        <Text style={styles.lastUpdated}>{t('lastUpdated')}: 19/12/2025</Text>

        {/* 1. GIỚI THIỆU */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>1. {t('introduction')}</Text>
          
          <Text style={styles.subsectionTitle}>1.1</Text>
          <Text style={styles.text}>
            {t('privacyIntro11')}
          </Text>

          <Text style={styles.subsectionTitle}>1.2</Text>
          <Text style={styles.text}>
            {t('privacyIntro12')}
          </Text>
        </View>

        {/* 2. PHHOTEL THU THẬP NHỮNG THÔNG TIN GÌ? */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>2. {t('whatInfoWeCollect')}</Text>
          
          <Text style={styles.subsectionTitle}>2.1</Text>
          <Text style={styles.text}>
            {t('privacyCollect21')}
          </Text>

          <Text style={styles.subsectionTitle}>2.2</Text>
          <Text style={styles.text}>
            {t('privacyCollect22')}
          </Text>

          <Text style={styles.subsectionTitle}>2.3</Text>
          <Text style={styles.text}>
            {t('privacyCollect23')}
          </Text>

          <Text style={styles.subsectionTitle}>2.4</Text>
          <Text style={styles.text}>
            {t('privacyCollect24')}
          </Text>

          <Text style={styles.subsectionTitle}>2.5</Text>
          <Text style={styles.text}>
            {t('privacyCollect25')}
          </Text>
        </View>

        {/* 3. CÀI ĐẶT TÀI KHOẢN */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>3. {t('accountSettings')}</Text>
          <Text style={styles.text}>
            {t('privacyAccountSettings')}
          </Text>
        </View>

        {/* 4. TRUY CẬP TRANG WEB */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>4. {t('websiteAccess')}</Text>
          <Text style={styles.text}>
            {t('privacyWebsiteAccess')}
          </Text>
        </View>

        {/* 5. COOKIES */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>5. {t('cookies')}</Text>
          
          <Text style={styles.subsectionTitle}>5.1</Text>
          <Text style={styles.text}>
            {t('privacyCookies51')}
          </Text>

          <Text style={styles.subsectionTitle}>5.2</Text>
          <Text style={styles.text}>
            {t('privacyCookies52')}
          </Text>
        </View>

        {/* 6. CỘNG ĐỒNG & HỖ TRỢ */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>6. {t('communitySupport')}</Text>
          <Text style={styles.text}>
            {t('privacyCommunitySupport')}
          </Text>
        </View>

        {/* 7. KHẢO SÁT NGƯỜI DÙNG */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>7. {t('userSurveys')}</Text>
          <Text style={styles.text}>
            {t('privacyUserSurveys')}
          </Text>
        </View>

        {/* 8. CHÚNG TÔI SỬ DỤNG THÔNG TIN BẠN CUNG CẤP NHƯ THẾ NÀO? */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>8. {t('howWeUseInfo')}</Text>
          
          <Text style={styles.subsectionTitle}>8.1</Text>
          <Text style={styles.text}>
            {t('privacyUse81')}
          </Text>

          <Text style={styles.subsectionTitle}>8.2</Text>
          <Text style={styles.text}>
            {t('privacyUse82')}
          </Text>

          <Text style={styles.subsectionTitle}>8.3</Text>
          <Text style={styles.text}>
            {t('privacyUse83')}
          </Text>

          <Text style={styles.subsectionTitle}>8.4</Text>
          <Text style={styles.text}>
            {t('privacyUse84')}
          </Text>

          <Text style={styles.subsectionTitle}>8.5</Text>
          <Text style={styles.text}>
            {t('privacyUse85')}
          </Text>

          <Text style={styles.subsectionTitle}>8.6</Text>
          <Text style={styles.text}>
            {t('privacyUse86')}
          </Text>

          <Text style={styles.subsectionTitle}>8.7</Text>
          <Text style={styles.text}>
            {t('privacyUse87')}
          </Text>

          <Text style={styles.subsectionTitle}>8.8</Text>
          <Text style={styles.text}>
            {t('privacyUse88')}
          </Text>

          <Text style={styles.subsectionTitle}>8.9</Text>
          <Text style={styles.text}>
            {t('privacyUse89')}
          </Text>

          <Text style={styles.subsectionTitle}>8.10</Text>
          <Text style={styles.text}>
            {t('privacyUse810')}
          </Text>

          <Text style={styles.subsectionTitle}>8.11</Text>
          <Text style={styles.text}>
            {t('privacyUse811')}
          </Text>

          <Text style={styles.subsectionTitle}>8.12</Text>
          <Text style={styles.text}>
            {t('privacyUse812')}
          </Text>

          <Text style={styles.subsectionTitle}>8.13</Text>
          <Text style={styles.text}>
            {t('privacyUse813')}
          </Text>

          <Text style={styles.subsectionTitle}>8.14</Text>
          <Text style={styles.text}>
            {t('privacyUse814')}
          </Text>

          <Text style={styles.subsectionTitle}>8.15</Text>
          <Text style={styles.text}>
            {t('privacyUse815')}
          </Text>

          <Text style={styles.subsectionTitle}>8.16</Text>
          <Text style={styles.text}>
            {t('privacyUse816')}
          </Text>

          <Text style={styles.subsectionTitle}>8.17</Text>
          <Text style={styles.text}>
            {t('privacyUse817')}
          </Text>

          <Text style={styles.subsectionTitle}>8.18</Text>
          <Text style={styles.text}>
            {t('privacyUse818')}
          </Text>

          <Text style={styles.subsectionTitle}>8.19</Text>
          <Text style={styles.text}>
            {t('privacyUse819')}
          </Text>

          <Text style={styles.subsectionTitle}>8.20</Text>
          <Text style={styles.text}>
            {t('privacyUse820')}
          </Text>
        </View>

        {/* 9. CHIA SẺ THÔNG TIN CÁ NHÂN */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>9. {t('sharingPersonalInfo')}</Text>
          <Text style={styles.text}>
            {t('privacySharingInfo')}
          </Text>
        </View>

        {/* 10. BẢO MẬT THÔNG TIN */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>10. {t('informationSecurity')}</Text>
          <Text style={styles.text}>
            {t('privacyInformationSecurity')}
          </Text>
        </View>

        {/* 11. QUYỀN CỦA BẠN */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>11. {t('yourRights')}</Text>
          <Text style={styles.text}>
            {t('privacyYourRights')}
          </Text>
        </View>

        {/* 12. THAY ĐỔI CHÍNH SÁCH */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>12. {t('policyChanges')}</Text>
          <Text style={styles.text}>
            {t('privacyPolicyChanges')}
          </Text>
        </View>

        {/* 13. LIÊN HỆ */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>13. {t('contact')}</Text>
          <Text style={styles.text}>
            {t('privacyContact')}
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}

const createStyles = (theme: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.backgroundColor,
  },
  content: {
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: theme.textColor,
    marginBottom: 10,
  },
  lastUpdated: {
    fontSize: 14,
    color: theme.subTextColor,
    marginBottom: 20,
  },
  section: {
    backgroundColor: theme.cardBackground,
    padding: 20,
    borderRadius: 12,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: theme.primaryColor,
    marginBottom: 15,
  },
  subsectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.textColor,
    marginTop: 15,
    marginBottom: 10,
  },
  text: {
    fontSize: 14,
    lineHeight: 22,
    color: theme.textColor,
    textAlign: 'justify',
    marginBottom: 10,
  },
});