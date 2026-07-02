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

export default function TermsOfServiceScreen() {
  const { colors } = useTheme();
  const { language } = useLanguage();
  const router = useRouter();

  const handleGoBack = () => {
    router.back();
  };

  const openSupportEmail = () => {
    Linking.openURL('mailto:hotro@phhotel.vn');
  };

  const openTermsUrl = () => {
    Linking.openURL('https://phhotel.vn/terms-of-service');
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
        <View style={[styles.contractPaper, { backgroundColor: colors.sectionCard }]}>
          <Text style={[styles.title, { color: colors.text }]}>
            THỎA THUẬN CHẤP THUẬN BẢO VỆ VÀ XỬ LÝ DỮ LIỆU CÁ NHÂN
          </Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            (Theo Nghị định số 13/2023/NĐ-CP của chính phủ về Bảo vệ Dữ liệu cá nhân, có hiệu lực từ ngày 01/07/2023)
          </Text>

          {/* Phần mở đầu */}
          <View style={[styles.contentSection, styles.introSection]}>
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
              Bên Cung Cấp có thể tham khảo để hiểu rõ hơn cách thu thập thông tin trên website của PHHotel tại <Text style={styles.link} onPress={() => Linking.openURL('https://phhotel.vn/terms-of-service')}>https://phhotel.vn/terms-of-service</Text>
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

            <Text style={[styles.subsectionTitle, { color: colors.text }]}>4.</Text>
            <Text style={[styles.text, { color: colors.text }]}>
              Bên Cung Cấp đồng ý và xác nhận rằng các Dữ liệu cá nhân của Bên Cung Cấp được xử lý cho một hoặc nhiều hơn các Mục Đích sau:
            </Text>
            <Text style={[styles.listItem, { color: colors.text }]}>- Xác thực, định danh Bên Cung Cấp, đánh giá và thẩm định để giao kết Hợp đồng;</Text>
            <Text style={[styles.listItem, { color: colors.text }]}>- Để phục vụ cho việc cung cấp, vận hành, xử lý và quản lý của PHHotel đối với hoạt động nhân sự liên quan đến Bên Cung Cấp, và để phục vụ các mục đích khác mà PHHotel xác định phù hợp tại từng thời điểm;</Text>
            <Text style={[styles.listItem, { color: colors.text }]}>- Thực hiện và tuân thủ Hợp đồng ký kết với Bên Cung Cấp và thực hiện các hoạt động nhân sự tới Bên Cung Cấp;</Text>
            <Text style={[styles.listItem, { color: colors.text }]}>- Để phục vụ công tác kiểm tra của Ngân hàng Nhà nước, tổ chức giáo dục, doanh nghiệp hoặc cơ quan có liên quan khác (nếu cần);</Text>
            <Text style={[styles.listItem, { color: colors.text }]}>- Để đánh giá và/hoặc xử lý yêu cầu/đề nghị của Bên Cung Cấp đối với bất kỳ hoạt động nhân sự nào;</Text>
            <Text style={[styles.listItem, { color: colors.text }]}>- Để cung cấp/gửi thông tin, tài liệu liên quan đến hoạt động nhân sự, phục vụ công việc quy định tại Hợp đồng cho Bên Cung Cấp;</Text>
            <Text style={[styles.listItem, { color: colors.text }]}>- Để nhập và kiểm tra tính đầy đủ và chính xác của các dữ liệu Bên Cung Cấp được nhập vào hệ thống;</Text>
            <Text style={[styles.listItem, { color: colors.text }]}>- Khảo sát và thăm dò sự hài lòng để cải thiện chất lượng các hoạt động nhân sự;</Text>
            <Text style={[styles.listItem, { color: colors.text }]}>- Tiếp nhận và liên hệ để trả lời các thắc mắc, xử lý các yêu cầu, khiếu nại;</Text>
            <Text style={[styles.listItem, { color: colors.text }]}>- Thực hiện kiểm soát, bảo vệ quyền của PHHotel, quản lý rủi ro, ngăn ngừa và điều tra mọi gian lận, hoạt động trái phép, thiếu sót hay hành vi sai trái, giải quyết tranh chấp, thực hiện các hoạt động tố tụng;</Text>
            <Text style={[styles.listItem, { color: colors.text }]}>- Bảo đảm an ninh công cộng và an toàn lao động, bảo vệ an toàn cá nhân, các quyền, tài sản hoặc sự an toàn của người khác;</Text>
            <Text style={[styles.listItem, { color: colors.text }]}>- Để thực hiện các quy định liên quan đến bảo vệ an toàn hệ thống của PHHotel và bảo vệ dữ liệu cá nhân Bên Cung Cấp;</Text>
            <Text style={[styles.listItem, { color: colors.text }]}>- Thu thập số liệu thống kê và nghiên cứu báo cáo nội bộ theo luật định và/hoặc yêu cầu lưu giữ hồ sơ;</Text>
            <Text style={[styles.listItem, { color: colors.text }]}>- Phục vụ hoạt động kiểm toán, quản lý rủi ro và tuân thủ của PHHotel;</Text>
            <Text style={[styles.listItem, { color: colors.text }]}>- Để đáp ứng hoặc tuân thủ các chính sách nội bộ của PHHotel và các nghĩa vụ pháp luật hoặc theo yêu cầu của cơ quan Nhà nước có thẩm quyền;</Text>
            <Text style={[styles.listItem, { color: colors.text }]}>- Thực hiện các mục đích khác có liên quan đến hoạt động kinh doanh, vận hành, quản lý và tuân thủ của PHHotel phù hợp với quy định của pháp luật từng thời kỳ.</Text>
            <Text style={[styles.text, { color: colors.text }]}>
              Một số Mục Đích thu thập, sử dụng, tiết lộ hoặc xử lý dữ liệu cá nhân còn tùy thuộc vào hoàn cảnh tại thời điểm thu thập, nên sẽ không xuất hiện trong danh sách trên. Tuy nhiên, PHHotel sẽ thông báo cho Bên Cung Cấp về những Mục Đích đó tại thời điểm cần sự đồng ý của Bên Cung Cấp, trừ khi việc xử lý dữ liệu cá nhân mà không cần sự đồng ý của chủ thể dữ liệu theo quy định pháp luật.
            </Text>

            <Text style={[styles.subsectionTitle, { color: colors.text }]}>5.</Text>
            <Text style={[styles.text, { color: colors.text }]}>
              Để thực hiện các mục đích xử lý dữ liệu cá nhân theo quy định tại khoản 3 Điều này, Bên Cung Cấp chấp thuận, cho phép đại diện và ủy quyền cho PHHotel được cung cấp dữ liệu cá nhân của Bên Cung Cấp cho bất kỳ hoặc đồng thời các chủ thể sau và các chủ thể này được quyền xử lý dữ liệu cá nhân của Bên Cung Cấp mà không cần thêm bất kỳ sự đồng ý, xác nhận nào khác của Bên Cung Cấp: (i) PHHotel; (ii) các công ty và/hoặc các tổ chức, cá nhân là các bên cung cấp dịch vụ, đại lý, đối tác, nhà thầu, liên kết với PHHotel và/hoặc các cố vấn, tư vấn chuyên nghiệp của PHHotel; (iii) các cơ quan có thẩm quyền ở Việt Nam, tổ chức hay người yêu cầu cung cấp thông tin theo quy định pháp luật Việt Nam; (iv) Bên nhận chuyển nhượng trong trường hợp sáp nhập, thoái vốn, tái cơ cấu, tổ chức lại, giải thể hoặc bán hoặc chuyển nhượng một phần hoặc toàn bộ tài sản PHHotel; (v) các bên liên quan khác mà PHHotel thấy là cần thiết để phục vụ hoạt động nhân sự, đáp ứng sản phẩm/dịch vụ, bảo vệ quyền và lợi ích hợp pháp của PHHotel, của Bên Cung Cấp theo Hợp đồng hoặc PHHotel đánh giá là có cơ sở pháp lý để cung cấp dữ liệu cá nhân của Bên Cung Cấp.
            </Text>

            <Text style={[styles.subsectionTitle, { color: colors.text }]}>6.</Text>
            <Text style={[styles.text, { color: colors.text }]}>
              Bên Cung Cấp đồng ý rằng Dữ liệu cá nhân của Bên Cung Cấp được xử lý bằng bất kỳ phương thức nào theo chính sách của PHHotel trong từng thời kỳ tùy thuộc vào từng Mục Đích, bao gồm nhưng không giới hạn, thu thập, ghi, phân tích, xác nhận, lưu trữ, chỉnh sửa, kết hợp, truy cập, truy xuất, thu hồi, mã hóa, giải mã, sao chép, chia sẻ, truyền đưa, cung cấp, chuyển giao, sử dụng không gian mạng, thiết bị, phương tiện điện tử hoặc các hình thức khác để chuyển Dữ liệu cá nhân trong nước và/hoặc ra nước ngoài, xóa, hủy và các hành động khác có liên quan.
            </Text>

            <Text style={[styles.subsectionTitle, { color: colors.text }]}>7.</Text>
            <Text style={[styles.text, { color: colors.text }]}>
              Bên Cung Cấp đồng ý rằng Dữ liệu cá nhân có thể được chuyển giao, lưu trữ, xử lý tại nơi các máy chủ của PHHotel, vị trí và cơ sở dữ liệu trung tâm của PHHotel được điều hành hoặc sẽ được truyền đến Hoa Kỳ nơi Google đặt máy chủ.
            </Text>

            <Text style={[styles.subsectionTitle, { color: colors.text }]}>8.</Text>
            <Text style={[styles.text, { color: colors.text }]}>
              Bên Cung Cấp hiểu và đồng ý rằng việc Bên Cung Cấp thực hiện các quyền quy định tại Điều 3 bản Chấp Thuận này có thể dẫn đến hệ quả các nghĩa vụ mà Bên Cung Cấp phải đáp ứng theo các Hợp đồng giữa Bên Cung Cấp và PHHotel không còn phù hợp/ảnh hưởng đến quyền lợi của PHHotel theo đánh giá của PHHotel, Bên Cung Cấp đồng ý việc PHHotel được chủ động lựa chọn thực hiện một trong các cách thức sau mà Bên Cung Cấp không có bất kỳ phản đối nào: (i) Ngừng thực hiện/Chấm dứt hiệu lực của các Hợp đồng giữa Bên Cung Cấp và PHHotel mà không chịu bất kỳ trách nhiệm nào; (ii) Đồng ý thực hiện theo yêu cầu của Bên Cung Cấp; (iii) Yêu cầu Bên Cung Cấp rút lại các yêu cầu này.
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
              Bên Cung Cấp có thể thực hiện các quyền trên của mình bằng cách gửi văn bản có chữ ký hợp pháp qua đường bưu điện đến địa chỉ trụ sở chính của PHHotel, hoặc gửi thư điện tử đến địa chỉ <Text style={styles.link} onPress={openSupportEmail}>hotro@phhotel.vn</Text>.
            </Text>

            <Text style={[styles.subsectionTitle, { color: colors.text }]}>3.</Text>
            <Text style={[styles.text, { color: colors.text }]}>
              Tự bảo vệ Dữ liệu cá nhân của mình; yêu cầu các tổ chức, cá nhân khác có liên quan bảo vệ Dữ liệu cá nhân của mình.
            </Text>

            <Text style={[styles.subsectionTitle, { color: colors.text }]}>4.</Text>
            <Text style={[styles.text, { color: colors.text }]}>
              Tôn trọng, bảo vệ dữ liệu cá nhân của người khác.
            </Text>

            <Text style={[styles.subsectionTitle, { color: colors.text }]}>5.</Text>
            <Text style={[styles.text, { color: colors.text }]}>
              Bên Cung Cấp có trách nhiệm cung cấp cho PHHotel Dữ liệu cá nhân hợp pháp, đầy đủ, chính xác và đã được cập nhật vào thời điểm cung cấp.
            </Text>

            <Text style={[styles.subsectionTitle, { color: colors.text }]}>6.</Text>
            <Text style={[styles.text, { color: colors.text }]}>
              Các hướng dẫn của Bên Cung Cấp về việc xử lý Dữ liệu cá nhân sẽ phù hợp với nội dung Hợp đồng và tuân theo tất cả các Luật về bảo vệ dữ liệu, bao gồm cả việc chỉ định PHHotel làm bên xử lý khác, đã được ủy quyền bởi bên kiểm soát có liên quan. Bên Cung Cấp chịu trách nhiệm về tính hợp pháp của Dữ liệu cá nhân và phương thức mà Bên Cung Cấp nhận được Dữ liệu cá nhân. PHHotel sẽ không bắt buộc phải tuân thủ hoặc tuân theo hướng dẫn của Bên Cung Cấp nếu những hướng dẫn đó vi phạm Luật bảo vệ dữ liệu.
            </Text>

            <Text style={[styles.subsectionTitle, { color: colors.text }]}>7.</Text>
            <Text style={[styles.text, { color: colors.text }]}>
              Bên Cung Cấp có các quyền và nghĩa vụ khác theo quy định của pháp luật.
            </Text>
          </View>

          <View style={styles.contentSection}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Điều 4. Cam kết khác về xử lý Dữ liệu cá nhân</Text>
            <Text style={[styles.text, { color: colors.text }]}>
              Trong quá trình xử lý Dữ liệu cá nhân, PHHotel và các bên liên quan cam kết sẽ áp dụng các biện pháp kỹ thuật, an ninh, bảo mật cần thiết và trong khả năng phù hợp để bảo vệ Dữ liệu cá nhân của Bên Cung Cấp theo quy định pháp luật Việt Nam; tuân thủ đầy đủ theo Thỏa thuận bảo vệ Dữ liệu cá nhân này và các Hợp đồng với Bên Cung Cấp. Tuy nhiên, Bên Cung Cấp hiểu và công nhận rằng không có hệ thống kỹ thuật hay biện pháp an ninh, bảo mật nào là an toàn tuyệt đối và giao dịch trực tuyến, không gian mạng cùng các hình thức xử lý Dữ liệu cá nhân luôn tiềm ẩn các nguy cơ phát sinh, bao gồm nhưng không giới hạn, việc dữ liệu bị rò rỉ, phát tán, lợi dụng, chiếm đoạt hoặc sử dụng sai cách. Bên Cung Cấp miễn trừ cho PHHotel mọi nghĩa vụ và trách nhiệm về các rủi ro có thể xảy ra trong quá trình xử lý dữ liệu cá nhân do các nguyên nhân khách quan ngoài tầm kiểm soát của PHHotel.
            </Text>
          </View>

          <View style={styles.contentSection}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Điều 5. Thời gian bắt đầu và kết thúc xử lý Dữ liệu cá nhân</Text>
            <Text style={[styles.text, { color: colors.text }]}>
              PHHotel bắt đầu thực hiện các hoạt động xử lý Dữ liệu cá nhân từ khi được cung cấp và/hoặc biết được cho đến khi (i) Hợp đồng với Bên Cung Cấp hết hiệu lực, hoặc (ii) Mục Đích xử lý Dữ liệu đã hoàn thành hoặc không còn cần thiết, hoặc (iii) nhận được yêu cầu kết thúc xử lý dữ liệu bằng văn bản của cơ quan nhà nước có thẩm quyền, hoặc (iv) Bên Cung Cấp có quyết định rút lại sự đồng ý sau khi Bên Cung Cấp đã hoàn tất các thủ tục theo quy định của pháp luật, và/hoặc (v) chính sách áp dụng tại từng thời điểm của PHHotel.
            </Text>
          </View>

          <View style={styles.contentSection}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Điều 6. Tuyên bố của Bên Cung Cấp</Text>

            <Text style={[styles.subsectionTitle, { color: colors.text }]}>1.</Text>
            <Text style={[styles.text, { color: colors.text }]}>
              Bên Cung Cấp tự nguyện đồng ý và hiểu rõ các nội dung quy định tại từng Điều khoản của bản Thỏa thuận này.
            </Text>

            <Text style={[styles.subsectionTitle, { color: colors.text }]}>2.</Text>
            <Text style={[styles.text, { color: colors.text }]}>
              Trường hợp Bên Cung Cấp không phải chủ thể dữ liệu, Bên Cung Cấp đảm bảo:
            </Text>
            <Text style={[styles.listItem, { color: colors.text }]}>- Bên Cung Cấp đã nhận được sự đồng ý rõ ràng của chủ thể dữ liệu đối với mọi hoạt động thu thập, sử dụng dữ liệu và cung cấp thông tin cho PHHotel;</Text>
            <Text style={[styles.listItem, { color: colors.text }]}>- Bên Cung Cấp đã thông báo và nhận được sự đồng ý rõ ràng của chủ thể dữ liệu về việc Dữ liệu cá nhân có thể được xử lý bên ngoài quốc gia ban đầu của họ;</Text>
            <Text style={[styles.listItem, { color: colors.text }]}>- Chủ thể dữ liệu đã biết rõ và đồng ý toàn bộ với hoạt động xử lý Dữ liệu cá nhân và nội dung quy định tại Điều 2 bản Thỏa thuận này trước khi đồng ý cho Bên Cung Cấp tiến hành thu thập Dữ liệu cá nhân;</Text>
            <Text style={[styles.listItem, { color: colors.text }]}>- Lưu trữ các bằng chứng chứng minh sự đồng ý của chủ thể dữ liệu và cung cấp bằng chứng này theo yêu cầu của PHHotel.</Text>

            <Text style={[styles.subsectionTitle, { color: colors.text }]}>3.</Text>
            <Text style={[styles.text, { color: colors.text }]}>
              Bên Cung Cấp đảm bảo và bồi thường cho PHHotel các thiệt hại do Bên Cung Cấp không thực hiện theo đúng quy định tại Điều này.
            </Text>
          </View>

          <View style={styles.contentSection}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Điều 7. Điều khoản chung</Text>

            <Text style={[styles.subsectionTitle, { color: colors.text }]}>1.</Text>
            <Text style={[styles.text, { color: colors.text }]}>
              Bản Thỏa thuận này là một phần không thể tách rời với Hợp đồng đã ký giữa Bên Cung Cấp và PHHotel.
            </Text>

            <Text style={[styles.subsectionTitle, { color: colors.text }]}>2.</Text>
            <Text style={[styles.text, { color: colors.text }]}>
              Trong trường hợp PHHotel có cung cấp các Dữ liệu cá nhân mà PHHotel thu thập/nắm giữ cho Bên Cung Cấp, thì Bên Cung Cấp cam kết sẽ tuân thủ mức độ bảo vệ Dữ liệu cá nhân không thấp hơn mức độ bảo vệ mà PHHotel đã cam kết tại văn bản này.
            </Text>

            <Text style={[styles.subsectionTitle, { color: colors.text }]}>3.</Text>
            <Text style={[styles.text, { color: colors.text }]}>
              Bên Cung Cấp đồng ý PHHotel có quyền điều chỉnh, sửa đổi, bổ sung, thay thế các nội dung của Thỏa thuận xử lý dữ liệu cá nhân và công bố hoặc thông báo theo hình thức công khai như sau: công bố, thông báo trên website <Text style={styles.link} onPress={openTermsUrl}>phhotel.vn</Text>; và/hoặc công bố, thông báo bằng văn bản hoặc email hoặc dưới bất cứ hình thức nào khác mà PHHotel cho là phù hợp. Bên Cung Cấp chịu trách nhiệm cập nhật các bản Thỏa thuận xử lý dữ liệu cá nhân từ các kênh công bố, kênh thông báo của PHHotel như quy định tại khoản này.
            </Text>
            <Text style={[styles.text, { color: colors.text }]}>
              Các bản Thỏa thuận xử lý dữ liệu cá nhân được điều chỉnh, sửa đổi, bổ sung, thay thế có hiệu lực vào thời điểm theo thông tin được công bố, thông báo khi PHHotel công bố, thông báo như quy định tại Khoản này. Trường hợp Bên Cung Cấp không đồng ý với những nội dung thay đổi, Bên Cung Cấp phải gửi văn bản thông báo đến PHHotel.
            </Text>

            <Text style={[styles.subsectionTitle, { color: colors.text }]}>4.</Text>
            <Text style={[styles.text, { color: colors.text }]}>
              Trong trường hợp có bất kỳ xung đột hoặc mâu thuẫn nào về bảo vệ và xử lý dữ liệu cá nhân giữa Thỏa thuận này với các Hợp đồng được giao kết/xác lập trước, vào ngày hoặc sau ngày Bên Cung Cấp chấp thuận Thỏa thuận này, bản Thỏa thuận này sẽ được ưu tiên áp dụng.
            </Text>

            <Text style={[styles.subsectionTitle, { color: colors.text }]}>5.</Text>
            <Text style={[styles.text, { color: colors.text }]}>
              Bên Cung Cấp hiểu rõ và đồng ý rằng bản Thỏa thuận này đồng thời là thông báo của PHHotel về việc xử lý Dữ liệu cá nhân của Bên Cung Cấp và PHHotel không cần gửi thêm bất kỳ thông báo nào khác cho Bên Cung Cấp liên quan đến việc xử lý thông tin này.
            </Text>

            <Text style={[styles.subsectionTitle, { color: colors.text }]}>6.</Text>
            <Text style={[styles.text, { color: colors.text }]}>
              Bản Thỏa thuận này sẽ có hiệu lực từ ngày ký cho đến khi bị chấm dứt theo Điều 5.
            </Text>

            <Text style={[styles.subsectionTitle, { color: colors.text }]}>7.</Text>
            <Text style={[styles.text, { color: colors.text }]}>
              Bản Thỏa thuận này được giải thích và điều chỉnh theo quy định pháp luật Việt Nam. Trường hợp có các tranh chấp phát sinh và/hoặc liên quan đến bản Thỏa thuận này thì các tranh chấp đó sẽ được giải quyết tại Tòa án nhân dân có thẩm quyền.
            </Text>
          </View>

          <View style={styles.signatureSection}>
            <View style={styles.signatureBox}>
              <Text style={[styles.signatureLabel, { color: colors.text }]}>BÊN CUNG CẤP</Text>
            </View>
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
  contractPaper: {
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
  introSection: {
    marginBottom: 32,
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
    textAlign: 'justify',
  },
  listItem: {
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
  signatureSection: {
    marginTop: 32,
    minHeight: 140,
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
  },
  signatureBox: {
    width: 220,
    alignItems: 'center',
  },
  signatureLabel: {
    fontSize: 20,
    fontWeight: '700',
  },
});
