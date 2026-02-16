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
import { ArrowLeft, ExternalLink } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '@/contexts/ThemeContext';
import { useLanguage } from '@/contexts/LanguageContext';

export default function TermsOfServiceScreen() {
  const { colors } = useTheme();
  const { t, language } = useLanguage();
  const router = useRouter();

  const handleGoBack = () => {
    router.back();
  };

  const openPrivacyPolicy = () => {
    Linking.openURL('/settings/privacy-policy');
  };

  const openSupportEmail = () => {
    Linking.openURL('mailto:hotro@phhotel.vn');
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.sectionCard, borderBottomColor: colors.divider }]}>
        <TouchableOpacity style={styles.backButton} onPress={handleGoBack}>
          <ArrowLeft size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>
          {language === 'vi' ? 'Điều khoản sử dụng' : 'Terms of Service'}
        </Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={[styles.section, { backgroundColor: colors.sectionCard }]}>
          <Text style={[styles.title, { color: colors.text }]}>
            THỎA THUẬN CHẤP THUẬN BẢO VỆ VÀ XỬ LÝ DỮ LIỆU CÁ NHÂN
          </Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            (Theo Nghị định số 13/2023/NĐ-CP của chính phủ về Bảo vệ Dữ liệu cá nhân, có hiệu lực từ ngày 01/07/2023)
          </Text>

          {/* Phần mở đầu */}
          <View style={styles.contentSection}>
            <Text style={[styles.text, { color: colors.text }]}>
              Thỏa thuận này được lập và ký vào ngày …/…/… bởi:
            </Text>
            <Text style={[styles.text, { color: colors.text }]}>
              <Text style={styles.bold}>Họ tên:</Text>
            </Text>
            <Text style={[styles.text, { color: colors.text }]}>
              <Text style={styles.bold}>CMND/CCCD/Hộ chiếu số:</Text> …………………… <Text style={styles.bold}>ngày cấp</Text>……………………<Text style={styles.bold}>nơi cấp</Text>………..
            </Text>
            <Text style={[styles.text, { color: colors.text }]}>
              <Text style={styles.bold}>Địa chỉ thường trú:</Text> ………………………………………………………………………………
            </Text>
            <Text style={[styles.text, { color: colors.text }]}>
              <Text style={styles.bold}>Số điện thoại:</Text> …………………………………………………………………………………….
            </Text>
            <Text style={[styles.text, { color: colors.text }]}>
              (sau đây gọi là "Bên Cung Cấp")
            </Text>
            <Text style={[styles.text, { color: colors.text }]}>
              Bên Cung Cấp tự nguyện đồng ý tuân thủ các quy định về bảo vệ Dữ liệu cá nhân với các điều khoản sau đây:
            </Text>
          </View>

          {/* Điều 1: Định nghĩa */}
          <View style={styles.contentSection}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Điều 1: Định nghĩa</Text>
            <Text style={[styles.text, { color: colors.text }]}>
              <Text style={styles.bold}>"Hợp đồng"</Text> là thuật ngữ gọi chung cho các hợp đồng giữa Bên Cung Cấp và PHHotel và/hoặc các biên bản, thỏa thuận, phụ lục, tài liệu liên quan tới các Hợp đồng đó. Đó có thể là hợp đồng lao động, hợp đồng thử việc, hợp đồng khác, v.v.
            </Text>
            
            <Text style={[styles.text, { color: colors.text }]}>
              <Text style={styles.bold}>"Dữ liệu cá nhân"</Text> là thông tin dưới dạng ký hiệu, chữ viết, chữ số, hình ảnh, âm thanh hoặc dạng tương tự trên môi trường điện tử gắn liền với một con người cụ thể hoặc giúp xác định một con người cụ thể. Dữ liệu cá nhân được đề cập trong bản Thỏa thuận này là Dữ liệu cá nhân của bất kỳ chủ thể dữ liệu nào mà PHHotel có được từ Bên Cung Cấp, nó có thể là Dữ liệu cá nhân của chính Bên Cung Cấp, hoặc Dữ liệu cá nhân của các chủ thể khác mà Bên Cung Cấp đã thu thập một cách hợp pháp và được phép chuyển giao, cung cấp cho PHHotel để PHHotel thực hiện các công việc được nêu trong (các) Hợp đồng giữa PHHotel và Bên Cung Cấp.
            </Text>
            
            <Text style={[styles.text, { color: colors.text }]}>
              <Text style={styles.bold}>"Luật bảo vệ dữ liệu"</Text> có nghĩa là tất cả các luật và quy định về bảo vệ Dữ liệu cá nhân hoặc quyền riêng tư áp dụng cho hoạt động xử lý Dữ liệu cá nhân tại Việt Nam, trong đó bao gồm nhưng không giới hạn ở Luật An ninh quốc gia 2004, Luật An ninh mạng 2018; Nghị định Số 13/2023/NĐ-CP về bảo vệ Dữ liệu cá nhân cùng các bản sửa đổi, bổ sung, thay thế các văn bản trên.
            </Text>
            
            <Text style={[styles.text, { color: colors.text }]}>
              <Text style={styles.bold}>"PHHotel"</Text> bao gồm nhân viên của PHHotel, các chi nhánh/công ty mẹ/công ty con và các công ty liên quan của PHHotel.
            </Text>
            
            <Text style={[styles.text, { color: colors.text }]}>
              <Text style={styles.bold}>"Hoạt động nhân sự"</Text> là các công việc, hoạt động về nhân sự mà PHHotel thực hiện đối với Bên Cung Cấp bao gồm nhưng không giới hạn việc tuyển dụng, ký kết và thực hiện Hợp đồng thử việc, ký kết và thực hiện Hợp đồng lao động, trả lương, thưởng, phụ cấp, phúc lợi, đào tạo, bổ nhiệm, điều chuyển, miễn nhiệm, khen thưởng, kỷ luật, đình chỉ, chấm dứt hợp đồng lao động và việc thực hiện các công việc, hoạt động khác về nhân sự.
            </Text>
            
            <Text style={[styles.text, { color: colors.text }]}>
              Các thuật ngữ "Dữ liệu cá nhân", "chủ thể dữ liệu", "xử lý Dữ liệu cá nhân", "bên kiểm soát" và "bên kiểm soát và xử lý" được sử dụng trong bản Thỏa thuận này có các ý nghĩa như được quy định tại Nghị định số 13/2023/NĐ-CP về bảo vệ Dữ liệu cá nhân và các bản sửa đổi, bổ sung kèm theo (nếu có).
            </Text>
          </View>

          {/* Điều 2: Nội dung chấp thuận */}
          <View style={styles.contentSection}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Điều 2. Nội dung chấp thuận</Text>
            
            <Text style={[styles.subsectionTitle, { color: colors.text }]}>1.</Text>
            <Text style={[styles.text, { color: colors.text }]}>
              Các bên thừa nhận và đồng ý như sau: (i) PHHotel là Bên kiểm soát Dữ liệu hoặc Bên xử lý Dữ liệu hoặc Bên kiểm soát và xử lý Dữ liệu, tùy từng trường hợp cụ thể; (ii) Bên Cung Cấp là chủ thể dữ liệu hoặc Bên kiểm soát Dữ liệu hoặc Bên kiểm soát và xử lý Dữ liệu, tùy từng trường hợp cụ thể; và (iii) mỗi bên sẽ tuân thủ các nghĩa vụ của mình theo Luật bảo vệ dữ liệu hiện hành liên quan đến việc xử lý Dữ liệu cá nhân.
            </Text>

            <Text style={[styles.subsectionTitle, { color: colors.text }]}>2.</Text>
            <Text style={[styles.text, { color: colors.text }]}>
              Bên Cung Cấp xác nhận và đồng ý rằng PHHotel được phép thu thập Dữ liệu cá nhân của Bên Cung Cấp (trực tiếp hoặc gián tiếp) từ các nguồn cung cấp dữ liệu khác nhau, bao gồm nhưng không giới hạn: (i) từ các thông tin mà Bên Cung Cấp cung cấp (bằng lời nói, văn bản) khi được tuyển dụng, ký kết Hợp đồng, trong quá trình làm việc tại PHHotel, hoặc theo các chương trình khảo sát mà Bên Cung Cấp tham gia; (ii) từ cơ quan nhà nước, các nhà cung cấp, bên cung cấp dịch vụ, đối tác của PHHotel và các bên thứ ba khác, bao gồm nhưng không giới hạn các bên tư vấn về dịch vụ nhân sự, ngân hàng, tổ chức tín dụng, tổ chức việc làm, người thân của Bên Cung Cấp, …..; (iii) từ nguồn thông tin công cộng có sẵn; (iv) thông qua các tập tin được tạo ra bởi trang mạng mà Bên Cung Cấp truy cập (cookie) hoặc các thiết bị/công cụ giám sát tương tự.
            </Text>
            <Text style={[styles.text, { color: colors.text }]}>
              Bên Cung Cấp có thể tham khảo để hiểu rõ hơn cách thu thập thông tin trên website của PHHotel tại <Text style={styles.link} onPress={() => Linking.openURL('https://phhotel.vn/terms-of-service')}>https://phhotel.vn/chinh-sach-bao-mat.html</Text>
            </Text>

            <Text style={[styles.subsectionTitle, { color: colors.text }]}>3.</Text>
            <Text style={[styles.text, { color: colors.text }]}>
              Bên Cung Cấp đồng ý PHHotel có quyền xử lý các Dữ liệu cá nhân của Bên Cung Cấp bao gồm các Dữ liệu cá nhân cơ bản và các Dữ liệu cá nhân nhạy cảm và các dữ liệu được cập nhật, sửa đổi, bổ sung tại từng thời điểm, trong đó:
            </Text>
            <Text style={[styles.text, { color: colors.text }]}>
              <Text style={styles.bold}>Dữ liệu cá nhân cơ bản</Text> bao gồm họ tên, ngày tháng năm sinh, giới tính, nơi sinh, địa chỉ thường trú, địa chỉ liên hệ, quốc tịch, hình ảnh, số điện thoại, email, chứng minh nhân dân/căn cước công dân/hộ chiếu/giấy tờ nhận diện khác, thông tin về mối quan hệ gia đình, tài khoản số, Dữ liệu cá nhân phản ánh hoạt động, lịch sử hoạt động trên không gian mạng, các thông tin, dữ liệu khác gắn liền với cá nhân hoặc giúp xác định một cá nhân cụ thể và các thông tin, dữ liệu khác theo quy định của pháp luật; và
            </Text>
            <Text style={[styles.text, { color: colors.text }]}>
              <Text style={styles.bold}>Dữ liệu cá nhân nhạy cảm</Text> bao gồm tình trạng sức khỏe và đời tư, chủng tộc, dân tộc, đặc điểm di truyền, thuộc tính vật lý, thông tin sinh trắc học (vân tay), tình trạng việc làm, dữ liệu về tội phạm, hành vi phạm tội, thông tin khách hàng của tổ chức tín dụng, chi nhánh ngân hàng nước ngoài, tổ chức cung ứng dịch vụ trung gian thanh toán, tổ chức được phép khác, gồm: thông tin về tài khoản, thông tin về tiền gửi, thông tin về tài sản gửi, thông tin về giao dịch, thông tin về tổ chức, cá nhân là bên bảo đảm tại tổ chức tín dụng, chi nhánh ngân hàng, tổ chức cung ứng dịch vụ trung gian thanh toán; dữ liệu về vị trí của cá nhân được xác định qua dịch vụ định vị, dữ liệu khác được pháp luật quy định là đặc thù và cần có biện pháp bảo mật cần thiết
            </Text>
          </View>

          {/* Điều 3: Quyền và nghĩa vụ của Bên Cung Cấp */}
          <View style={styles.contentSection}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Điều 3. Quyền và nghĩa vụ của Bên Cung Cấp về xử lý Dữ liệu cá nhân</Text>
            
            <Text style={[styles.subsectionTitle, { color: colors.text }]}>1.</Text>
            <Text style={[styles.text, { color: colors.text }]}>
              Bên Cung Cấp có quyền được biết, đồng ý, cung cấp, truy cập, chỉnh sửa, xóa Dữ liệu cá nhân, rút lại sự đồng ý về việc xử lý Dữ liệu cá nhân, yêu cầu hạn chế hoặc phản đối xử lý Dữ liệu cá nhân của mình, quyền khiếu nại, tố cáo, khởi kiện, quyền yêu cầu bồi thường thiệt hại và quyền tự bảo vệ, trừ trường hợp pháp luật có quy định khác. Việc rút lại sự đồng ý sẽ không ảnh hướng đến tính hợp pháp của việc xử lý dữ liệu đã được đồng ý trước khi rút lại sự đồng ý.
            </Text>

            <Text style={[styles.subsectionTitle, { color: colors.text }]}>2.</Text>
            <Text style={[styles.text, { color: colors.text }]}>
              Bên Cung Cấp có thể thực hiện các quyền trên của mình bằng cách gửi văn bản có chữ ký hợp pháp qua đường bưu điện đến địa chỉ trụ sở chính của PHHotel, hoặc gửi thư điện tử đến địa chỉ <Text style={styles.link} onPress={openSupportEmail}>support@phhotel.vn</Text>.
            </Text>
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={[styles.footerText, { color: colors.textSecondary }]}>
              Để biết thêm thông tin chi tiết, vui lòng tham khảo
            </Text>
            <TouchableOpacity style={styles.linkButton} onPress={openPrivacyPolicy}>
              <Text style={[styles.linkButtonText, { color: colors.primary }]}>
                {language === 'vi' ? 'Chính sách bảo mật' : 'Privacy Policy'}
              </Text>
              <ExternalLink size={16} color={colors.primary} />
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backButton: {
    padding: 8,
    marginRight: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  section: {
    margin: 16,
    borderRadius: 12,
    padding: 20,
  },
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
    marginBottom: 24,
    fontStyle: 'italic',
  },
  contentSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  subsectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
  },
  text: {
    fontSize: 14,
    lineHeight: 22,
    marginBottom: 8,
  },
  bold: {
    fontWeight: '600',
  },
  link: {
    color: '#0ea5e9',
    textDecorationLine: 'underline',
  },
  footer: {
    marginTop: 24,
    paddingTop: 24,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    alignItems: 'center',
  },
  footerText: {
    fontSize: 14,
    marginBottom: 12,
  },
  linkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  linkButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});