import React from 'react';
import { View, Text, ScrollView, StyleSheet, Linking } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';

export default function PrivacyPolicyScreen() {
  const { colors } = useTheme();

  const styles = createStyles(colors);

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Chính sách bảo mật</Text>
        <Text style={styles.lastUpdated}>Cập nhật lần cuối: 19 tháng 12 năm 2025</Text>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>1. GIỚI THIỆU</Text>
          <Text style={styles.subsectionTitle}>1.1</Text>
          <Text style={styles.text}>
            Website{' '}
            <Text style={styles.link} onPress={() => Linking.openURL('https://phhotel.vn/')}>https://phhotel.vn/</Text> được điều hành bởi Công ty TNHH Giải Pháp Công Nghệ PHGROUP, các chi nhánh trực thuộc và các tổ chức liên quan (được gọi riêng là "PHHotel", và gọi chung là "Chúng tôi", "của Chúng Tôi" trong văn bản này). PHHotel cam kết tôn trọng quyền riêng tư và những vấn đề cá nhân của tất cả Người Dùng trên trang PHHotel ("Trang web") (Chúng tôi gọi chung Trang web và các dịch vụ Chúng tôi cung cấp được mô tả trên Trang web là "Dịch Vụ"). Chúng tôi nhận thức được tầm quan trọng của các dữ liệu cá nhân mà bạn đã giao phó cho Chúng tôi và tin rằng trách nhiệm của Chúng tôi là quản lý đúng cách, bảo vệ và xử lý dữ liệu cá nhân của bạn. Chính Sách Bảo Mật này (gọi tắt là "Chính Sách Bảo Mật" hay "Chính Sách") được tạo ra nhằm cung cấp các thông tin tổng quát về việc Chúng tôi sẽ thu thập, sử dụng, tiết lộ hoặc xử lý các dữ liệu cá nhân mà bạn đã cung cấp cho Chúng tôi như thế nào, cho dù ở hiện tại hay trong tương lai; cũng như cách mà Chúng tôi sẽ hỗ trợ bạn trước khi đưa ra bất cứ quyết định nào liên quan đến việc cung cấp dữ liệu cá nhân của bạn cho Chúng tôi. Xin vui lòng đọc Chính Sách Bảo Mật một cách cẩn thận. Nếu bạn có bất kỳ câu hỏi liên quan đến các thông tin này hoặc thực tiễn bảo mật của Chúng Tôi, xin vui lòng xem phần "Thắc mắc? Liên hệ với Chúng Tôi" ở phần cuối của Chính Sách Bảo Mật này.
          </Text>
          <Text style={styles.subsectionTitle}>1.2</Text>
          <Text style={styles.text}>
            Bằng cách sử dụng Dịch Vụ, đăng ký tài khoản với Chúng Tôi, ghé thăm Trang web của Chúng Tôi, hoặc truy cập vào Dịch Vụ, bạn đã thừa nhận và đồng ý các yêu cầu, và/hoặc các Chính Sách, thực tiễn áp dụng nêu trong Chính Sách Bảo Mật này, và bạn đồng ý với Chúng Tôi về việc thu thập, sử dụng, tiết lộ và/hoặc xử lý dữ liệu cá nhân của bạn theo cách được mô tả trong tài liệu này.{` `}
            <Text style={styles.bold}>NẾU BẠN KHÔNG ĐỒNG Ý VỚI CHÍNH SÁCH BẢO MẬT NÀY, VUI LÒNG KHÔNG SỬ DỤNG DỊCH VỤ CỦA CHÚNG TÔI HOẶC TRUY CẬP WEBSITE CỦA CHÚNG TÔI.</Text> Nếu Chúng Tôi thay đổi Chính Sách Bảo Mật, Chúng Tôi sẽ cập nhật thay đổi hoặc sửa đổi đó trên Trang web của Chúng Tôi. Chúng Tôi bảo lưu quyền sửa đổi Chính Sách Bảo Mật này vào bất cứ lúc nào.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>2. PHHOTEL THU THẬP NHỮNG THÔNG TIN GÌ?</Text>
          <Text style={styles.subsectionTitle}>2.1</Text>
          <Text style={styles.text}>
            "Dữ liệu cá nhân" được định nghĩa là dữ liệu, dù đúng hay sai, về một cá nhân – người mà có thể được xác định danh tính từ dữ liệu đó, hoặc từ dữ liệu và các thông tin khác mà một tổ chức có quyền hoặc có thể truy cập. Ví dụ thường gặp của dữ liệu cá nhân có thể bao gồm: Họ tên, số CMND và thông tin liên lạc.
          </Text>
          <Text style={styles.subsectionTitle}>2.2</Text>
          <Text style={styles.text}>Chúng Tôi sẽ/có thể sẽ thu thập thông tin cá nhân về bạn:</Text>
          <Text style={styles.listItem}><Text style={styles.bold}>(a)</Text> Khi bạn đăng ký và/hoặc sử dụng dịch vụ hoặc Trang web của Chúng Tôi, hoặc mở một tài khoản với Chúng Tôi;</Text>
          <Text style={styles.listItem}><Text style={styles.bold}>(b)</Text> Khi bạn gửi bất kỳ biểu mẫu nào, bao gồm nhưng không giới hạn đơn đăng ký hoặc các mẫu đơn khác liên quan đến bất kỳ sản phẩm và dịch vụ của Chúng Tôi, cho dù trực tuyến hoặc bằng một hình thức chuyển phát khác;</Text>
          <Text style={styles.listItem}><Text style={styles.bold}>(c)</Text> Khi bạn đồng ý bất kỳ thỏa thuận nào hoặc cung cấp cho Chúng Tôi tài liệu hoặc thông tin liên quan đến tương tác giữa bạn với Chúng Tôi, hoặc khi bạn sử dụng các sản phẩm và dịch vụ của Chúng Tôi;</Text>
          <Text style={styles.listItem}><Text style={styles.bold}>(d)</Text> Khi bạn tương tác với Chúng Tôi, chẳng hạn như thông qua các cuộc gọi điện thoại (có thể được ghi âm lại), thư từ, fax, gặp trực tiếp, thông qua phương tiện truyền thông trên nền tảng mạng xã hội và thư điện tử;</Text>
          <Text style={styles.listItem}><Text style={styles.bold}>(e)</Text> Khi bạn sử dụng dịch vụ điện tử của Chúng Tôi, hoặc tương tác với Chúng Tôi qua ứng dụng, hoặc sử dụng các dịch vụ trên Trang web của Chúng Tôi. Điều này bao gồm thông qua các tập tin Cookie mà Chúng Tôi có thể triển khai khi bạn tương tác với các ứng dụng, Trang web hoặc Phần mềm của Chúng Tôi;</Text>
          <Text style={styles.listItem}><Text style={styles.bold}>(f)</Text> Khi bạn thực hiện các giao dịch thông qua dịch vụ của Chúng Tôi;</Text>
          <Text style={styles.listItem}><Text style={styles.bold}>(g)</Text> Khi bạn cung cấp cho Chúng Tôi thông tin phản hồi hoặc khiếu nại;</Text>
          <Text style={styles.listItem}><Text style={styles.bold}>(h)</Text> Khi bạn gửi dữ liệu cá nhân của bạn cho Chúng Tôi vì bất cứ lý do nào;</Text>
          <Text style={styles.text}>
            Trên đây chỉ là một số trường hợp phổ biến mà Chúng Tôi thu thập dữ liệu cá nhân của bạn, không phản ánh hết toàn bộ các trường hợp mà Chúng Tôi sẽ thu thập dữ liệu cá nhân của bạn.
          </Text>
          <Text style={styles.subsectionTitle}>2.3</Text>
          <Text style={styles.text}>
            Khi bạn truy cập, sử dụng hoặc tương tác với ứng dụng di động, Trang web hoặc Phần mềm của Chúng Tôi, Chúng Tôi có thể thu thập một số thông tin nhất định bằng phương tiện tự động hoặc thụ động bằng cách sử dụng một loạt các công nghệ, loại có thể tải về điện thoại của bạn và có thể thiết lập/sửa đổi cài đặt trên thiết bị của bạn. Thông tin Chúng Tôi thu thập có thể bao gồm các địa chỉ giao thức Internet (IP), hệ điều hành của thiết bị máy tính/điện thoại di động và loại trình duyệt, loại thiết bị di động, đặc điểm của thiết bị di động đó, mã định danh thiết bị duy nhất (UDID) hoặc mã định danh thiết bị di động (MEID) cho thiết bị của bạn, địa chỉ của một Trang web giới thiệu (nếu có), lịch sử truy cập vào Trang web, Phần mềm và các ứng dụng di động của Chúng Tôi. Chúng Tôi có thể thu thập, sử dụng, tiết lộ và/hoặc xử lý thông tin này cho các Mục Đích (được định nghĩa dưới đây).
          </Text>
          <Text style={styles.subsectionTitle}>2.4</Text>
          <Text style={styles.text}>
            Ứng dụng di động của Chúng Tôi có thể thu thập thông tin chính xác về vị trí của thiết bị di động của bạn bằng cách sử dụng các công nghệ như GPS, Wi-Fi, v.v.. Đối với hầu hết các thiết bị di động, bạn có thể rút lại sự cho phép lấy thông tin vị trí của bạn thông qua mục cài đặt điện thoại. Nếu bạn có thắc mắc về cách để vô hiệu hóa các dịch vụ xác định vị trí trên thiết bị di động của bạn, xin vui lòng liên hệ với nhà cung cấp dịch vụ điện thoại di động hoặc các nhà sản xuất thiết bị.
          </Text>
          <Text style={styles.subsectionTitle}>2.5</Text>
          <Text style={styles.text}>Dữ liệu cá nhân được thu thập bao gồm, nhưng không giới hạn:</Text>
          <Text style={styles.listItem}>• Họ tên</Text>
          <Text style={styles.listItem}>• Địa chỉ email</Text>
          <Text style={styles.listItem}>• Số điện thoại</Text>
          <Text style={styles.listItem}>• Địa chỉ nơi làm việc</Text>
          <Text style={styles.listItem}>• Chức vụ</Text>
          <Text style={styles.listItem}>• Địa điểm nơi làm việc</Text>
          <Text style={styles.listItem}>• Bất kỳ thông tin nào khác về Người Dùng khi Người Dùng đăng nhập và sử dụng dịch vụ hoặc Trang web của Chúng Tôi, thời điểm Người Dùng sử dụng các dịch vụ hoặc Trang web của Chúng Tôi, cũng như các thông tin liên quan đến cách Người Dùng sử dụng dịch vụ hoặc Trang web của Chúng Tôi</Text>
          <Text style={styles.listItem}>• Số liệu tổng hợp về lịch sử thao tác của Người Dùng</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>3. CÀI ĐẶT TÀI KHOẢN</Text>
          <Text style={styles.text}>
            Một số chức năng nhất định của Dịch Vụ yêu cầu bạn sẽ phải tạo một tài khoản Người Dùng và gửi dữ liệu cá nhân. Khi bạn đăng ký và tạo một tài khoản mới, Chúng Tôi yêu cầu bạn cung cấp cho Chúng Tôi những thông tin như họ tên, địa chỉ email, và tên Khách sạn nơi bạn làm việc. Chúng Tôi cũng yêu cầu một số thông tin cá nhân như số điện thoại, địa chỉ email, địa chỉ khách sạn, số CMND…. Sau khi kích hoạt tài khoản, bạn sẽ chọn một tên Người Dùng và mật khẩu. Tên Người Dùng và mật khẩu của bạn sẽ được sử dụng để bạn có thể truy cập một cách an toàn và duy trì tài khoản của bạn.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>4. TRUY CẬP TRANG WEB</Text>
          <Text style={styles.text}>
            Như với hầu hết các Trang web, thiết bị của bạn có thể sẽ gửi đến Trang web của Chúng Tôi một số thông tin cá nhân mà bạn dùng để đăng nhập. Thông tin này thường bao gồm nhưng không giới hạn: địa chỉ IP của máy tính, hệ điều hành, tên trình duyệt/tên phiên bản, các Trang web tham khảo, trang yêu cầu, ngày/giờ, và đôi khi là một "Cookie" (có thể được vô hiệu hóa bằng cách sử dụng tùy chọn trình duyệt của bạn) để giúp các Trang web nhớ lần truy cập cuối cùng của bạn. Nếu bạn đã đăng nhập, thông tin này được kết hợp với tài khoản cá nhân của bạn. Các thông tin này cũng được đưa vào thống kê nặc danh để cho phép Chúng Tôi nắm được thói quen truy cập của Người Dùng.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>5. COOKIES</Text>
          <Text style={styles.subsectionTitle}>5.1</Text>
          <Text style={styles.text}>
            Chúng Tôi có thể sử dụng "Cookies" hoặc các tính năng khác để cho phép Chúng Tôi hoặc các bên thứ ba thu thập hoặc chia sẻ những thông tin qua đó giúp Chúng Tôi cải thiện Trang web và các Dịch Vụ Chúng Tôi cung cấp, hoặc giúp Chúng Tôi cung cấp dịch vụ và tính năng mới. "Cookies" là những định danh Chúng Tôi chuyển đến máy tính hoặc thiết bị di động của bạn cho phép Chúng Tôi nhận ra máy tính hoặc thiết bị của bạn và cho Chúng Tôi biết làm thế nào và khi nào các Dịch Vụ hoặc Trang web của Chúng Tôi được sử dụng hay truy cập, bởi bao nhiêu người và theo dõi các thao tác được thực hiện trên Trang web của Chúng Tôi. Chúng Tôi có thể liên kết các thông tin cookie đến các dữ liệu cá nhân. Cookies cũng thu thập thông tin liên quan đến những gì các bạn đã cho vào giỏ hàng và các trang bạn đã xem. Ngoài ra, Cookies còn được sử dụng để cung cấp những nội dung liên quan đến sở thích của bạn và theo dõi việc sử dụng Trang web.
          </Text>
          <Text style={styles.subsectionTitle}>5.2</Text>
          <Text style={styles.text}>
            Bạn có thể từ chối việc sử dụng các Cookie bằng cách chọn các thiết lập thích hợp trên trình duyệt. Tuy nhiên, xin vui lòng lưu ý rằng nếu bạn làm điều này bạn có thể không có khả năng sử dụng các chức năng đầy đủ của Trang web hoặc Dịch Vụ của Chúng Tôi.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>6. CỘNG ĐỒNG & HỖ TRỢ</Text>
          <Text style={styles.text}>
            Chúng Tôi cung cấp dịch vụ hỗ trợ khách hàng qua email, tin nhắn SMS và các hình thức tương tác khác. Để hỗ trợ khách hàng, Chúng Tôi sẽ yêu cầu khách hàng cung cấp địa chỉ email và số điện thoại di động. Ngoài ra, Chúng Tôi không yêu cầu bất kỳ dữ liệu cá nhân nào khác thì mới cung cấp dịch vụ hỗ trợ khách hàng. Chúng Tôi chỉ sử dụng thông tin nhận được khi khách hàng yêu cầu hỗ trợ, trong đó bao gồm địa chỉ email để hỗ trợ khách hàng và Chúng Tôi sẽ không chuyển hoặc chia sẻ thông tin này với bất kỳ bên thứ ba nào khác.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>7. KHẢO SÁT NGƯỜI DÙNG</Text>
          <Text style={styles.text}>
            Vào 1 thời điểm nào đó, Chúng Tôi sẽ yêu cầu thông tin từ phía Người Dùng thông qua việc khảo sát. Việc tham gia vào các cuộc khảo sát là hoàn toàn tự nguyện, do đó bạn có thể lựa chọn cung cấp thông tin của bạn cho Chúng Tôi hay không. Thông tin yêu cầu có thể bao gồm thông tin liên lạc (như địa chỉ email của bạn), và các thông tin cá nhân. Thông tin khảo sát sẽ được sử dụng cho Mục Đích khảo sát và cải thiện việc sử dụng Dịch Vụ và sẽ không được chuyển giao cho bên thứ ba.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>8. CHÚNG TÔI SỬ DỤNG THÔNG TIN BẠN CUNG CẤP NHƯ THẾ NÀO?</Text>
          <Text style={styles.subsectionTitle}>8.1</Text>
          <Text style={styles.text}>
            Chúng Tôi có thể thu thập, sử dụng, tiết lộ và/hoặc xử lý dữ liệu cá nhân của bạn cho một hoặc nhiều hơn các Mục Đích sau đây:
          </Text>
          <Text style={styles.listItem}><Text style={styles.bold}>(a)</Text> Để xem xét và/hoặc xử lý yêu cầu/giao dịch của bạn với Chúng Tôi;</Text>
          <Text style={styles.listItem}><Text style={styles.bold}>(b)</Text> Để quản lý, vận hành, cung cấp và/hoặc quản trị việc sử dụng và/hoặc truy cập vào Dịch Vụ, Phần mềm hay Trang web của Chúng Tôi, cũng như tài khoản Người Dùng của bạn và mối quan hệ với Chúng Tôi;</Text>
          <Text style={styles.listItem}><Text style={styles.bold}>(c)</Text> Để quản lý, vận hành và cung cấp cho bạn cũng như tạo điều kiện cho việc cung cấp các Dịch Vụ của Chúng Tôi, bao gồm ghi nhớ yêu cầu của bạn;</Text>
          <Text style={styles.listItem}><Text style={styles.bold}>(d)</Text> Cải thiện trải nghiệm của bạn khi sử dụng Dịch Vụ bằng cách cung cấp một phương pháp nhanh hơn để bạn có thể truy cập vào tài khoản và gửi thông tin cho Chúng Tôi, cho phép Chúng Tôi liên lạc với bạn nếu cần thiết;</Text>
          <Text style={styles.listItem}><Text style={styles.bold}>(e)</Text> Để tiếp nhận, xử lý, thương lượng hoặc hoàn thành một giao dịch và/hoặc để đáp ứng yêu cầu của bạn về sản phẩm và dịch vụ nhất định và thông báo cho bạn về những vấn đề dịch vụ và các hoạt động bất thường của tài khoản;</Text>
          <Text style={styles.listItem}><Text style={styles.bold}>(f)</Text> Để thực thi Điều khoản Dịch vụ của Chúng Tôi hoặc bất kỳ thỏa thuận cấp phép Người Dùng cuối nào được áp dụng;</Text>
          <Text style={styles.listItem}><Text style={styles.bold}>(g)</Text> Để bảo vệ an toàn cá nhân, các quyền, tài sản hoặc sự an toàn của người khác;</Text>
          <Text style={styles.listItem}><Text style={styles.bold}>(h)</Text> Để xác định hoặc thẩm tra;</Text>
          <Text style={styles.listItem}><Text style={styles.bold}>(i)</Text> Để duy trì và quản trị bất kỳ bản cập nhật phần mềm và/hoặc các bản cập nhật khác có thể hỗ trợ được yêu cầu theo thời gian để đảm bảo Dịch Vụ của Chúng Tôi vận hành trơn tru;</Text>
          <Text style={styles.listItem}><Text style={styles.bold}>(j)</Text> Xử lý hoặc tiến hành dịch vụ chăm sóc khách hàng, cung cấp các hướng dẫn cho bạn, tiếp nhận hoặc phản hồi bất cứ yêu cầu nào được đưa ra bởi (hoặc có ý định được đưa ra bởi) bạn;</Text>
          <Text style={styles.listItem}><Text style={styles.bold}>(k)</Text> Để liên hệ với bạn qua điện thoại, tin nhắn và/hoặc fax, thư điện tử và/hoặc thư bưu chính, hoặc các phương tiện khác để duy trì mối liên hệ của bạn với Dịch Vụ của Chúng Tôi. Bạn hiểu và thừa nhận rằng khi Chúng Tôi liên hệ với bạn qua thư từ bưu chính, một số thông tin cá nhân của bạn như họ tên, địa chỉ nhận sẽ được tiết lộ trên bao bì thư;</Text>
          <Text style={styles.listItem}><Text style={styles.bold}>(l)</Text> Để tiến hành nghiên cứu, phân tích và phát triển Dịch Vụ (bao gồm phân tích dữ liệu, làm khảo sát, xây dựng và/hoặc phát triển sản phẩm và dịch vụ), để phân tích hành vi Người Dùng nhằm Mục Đích cải thiện Dịch Vụ hoặc sản phẩm của Chúng Tôi và/hoặc để cải thiện trải nghiệm của Người Dùng;</Text>
          <Text style={styles.listItem}><Text style={styles.bold}>(m)</Text> Dành cho Mục Đích tiếp thị, Chúng Tôi sẽ gửi thông tin cho bạn theo các phương tiện liên lạc khác nhau như thư bưu chính, thư điện tử, dịch vụ dựa trên vị trí, thông tin khuyến mại và các tài liệu liên quan đến các sản phẩm và/hoặc dịch vụ (bao gồm cả các sản phẩm và/hoặc dịch vụ của các bên thứ ba mà PHHotel cộng tác hay làm việc với) mà PHHotel (và/hoặc các chi nhánh trực thuộc hoặc tổ chức liên quan) đang bán, tiếp thị hay quảng bá, cho dù sản phẩm hay dịch vụ đó đang tồn tại hoặc sẽ được tạo ra trong tương lai. Chúng Tôi sẽ không gửi tiếp thị hoặc các thông tin khuyến mại cho bạn qua cuộc gọi, tin nhắn SMS/MMS hoặc fax, trừ khi điều đó không vi phạm các qui định pháp luật hoặc trước đó Chúng Tôi đã nhận được sự đồng ý một cách rõ ràng từ phía bạn;</Text>
          <Text style={styles.listItem}><Text style={styles.bold}>(n)</Text> Để sử dụng vào các vụ việc tố tụng hoặc để tuân thủ hoặc đáp ứng qui định pháp luật hoặc thực hiện theo yêu cầu của chính quyền hoặc quy định của bất kỳ cơ quan thẩm quyền có liên quan, trong đó có bao gồm việc công bố thông tin theo yêu cầu của pháp luật mà PHHotel hoặc chi nhánh, công ty có liên quan với PHHotel cam kết ràng buộc;</Text>
          <Text style={styles.listItem}><Text style={styles.bold}>(o)</Text> Để thu thập số liệu thống kê và nghiên cứu báo cáo nội bộ theo luật định và/hoặc yêu cầu lưu giữ hồ sơ;</Text>
          <Text style={styles.listItem}><Text style={styles.bold}>(p)</Text> Để kiểm toán Dịch Vụ hoặc hoạt động kinh doanh của PHHotel;</Text>
          <Text style={styles.listItem}><Text style={styles.bold}>(q)</Text> Để ngăn ngừa hoặc điều tra mọi gian lận, hoạt động trái pháp luật, thiếu sót hay hành vi sai trái, cho dù có liên quan đến việc bạn sử dụng Dịch Vụ của Chúng Tôi hoặc bất kỳ vấn đề nào khác phát sinh từ mối liên hệ của bạn với Chúng Tôi, dù có hoặc không có bất kỳ nghi ngờ nào về các hành vi nói trên;</Text>
          <Text style={styles.listItem}><Text style={styles.bold}>(r)</Text> Để lưu trữ, sao lưu, khôi phục (dù là để khắc phục vấn đề hoặc không) dữ liệu cá nhân của bạn, cho dù trong hay ngoài Việt Nam;</Text>
          <Text style={styles.listItem}><Text style={styles.bold}>(s)</Text> Để xử lý hoặc để thuận tiện cho các giao dịch mà PHHotel là một bên tham gia hoặc có liên quan đến chi nhánh trực thuộc hoặc tổ chức có liên quan với tư cách là bên tham gia hoặc liên quan đến PHHotel và/hoặc một hoặc nhiều chi nhánh/tổ chức liên quan của PHHotel với tư cách là các bên tham gia và có thể sẽ có thêm một bên tham gia là một tổ chức thứ ba.</Text>
          <Text style={styles.listItem}><Text style={styles.bold}>(t)</Text> Bất kỳ Mục Đích nào khác mà Chúng Tôi thông báo cho bạn tại thời điểm yêu cầu có sự đồng thuận của bạn.</Text>
          <Text style={styles.text}>(gọi chung là "Mục Đích");</Text>
          <Text style={styles.subsectionTitle}>8.2</Text>
          <Text style={styles.text}>
            Một số Mục Đích thu thập, sử dụng, tiết lộ hoặc xử lý dữ liệu cá nhân còn tuỳ thuộc vào hoàn cảnh tại thời điểm thu thập, nên sẽ không xuất hiện trong danh sách trên. Tuy nhiên, Chúng Tôi sẽ thông báo cho bạn về những Mục Đích đó tại thời điểm hỏi xin sự đồng ý của bạn, trừ khi việc xử lý dữ liệu cá nhân mà không cần sự đồng ý của chủ sở hữu theo quy định pháp luật.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>9. PHHOTEL BẢO VỆ THÔNG TIN NGƯỜI DÙNG NHƯ THẾ NÀO?</Text>
          <Text style={styles.text}>
            Chúng Tôi thực hiện một loạt các biện pháp an ninh để đảm bảo sự an toàn của dữ liệu cá nhân của bạn trên hệ thống của Chúng Tôi. Dữ liệu Người Dùng được lưu trữ đằng sau mạng lưới bảo đảm và chỉ có thể truy cập bởi một số nhân viên có quyền truy cập đặc biệt tới hệ thống. Chúng Tôi sẽ giữ lại dữ liệu cá nhân theo quy định pháp luật hiện hành. Tuy nhiên, Chúng Tôi sẽ phá hủy hoặc ẩn danh hóa dữ liệu cá nhân của bạn ngay khi phát sinh điều kiện hợp lý để giả định rằng (i) Mục Đích mà dữ liệu cá nhân được thu thập không còn là Mục Đích ban đầu; và (ii) việc lưu giữ là không còn cần thiết cho bất kỳ Mục Đích pháp lý, kinh doanh. Nếu bạn ngừng sử dụng các Phần mềm hoặc Trang web, hoặc cho phép bạn sử dụng các Trang web và/hoặc các Dịch Vụ bị chấm dứt, Chúng Tôi có thể tiếp tục lưu trữ, sử dụng và/hoặc tiết lộ dữ liệu cá nhân của bạn phù hợp với Chính Sách Bảo Mật và nghĩa vụ của Chúng Tôi theo quy định. Tùy thuộc vào luật áp dụng, Chúng Tôi có thể xử lý dữ liệu cá nhân của bạn một cách an toàn mà không cần báo trước cho bạn.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>10. PHHOTEL CÓ TIẾT LỘ THÔNG TIN CÁ NHÂN CỦA BẠN RA BÊN NGOÀI KHÔNG?</Text>
          <Text style={styles.subsectionTitle}>10.1</Text>
          <Text style={styles.text}>
            Trong hoạt động kinh doanh của Chúng Tôi, Chúng Tôi sẽ/có thể cần phải tiết lộ dữ liệu cá nhân của bạn cho bên thứ ba là các bên cung cấp dịch vụ cho Chúng Tôi. Chúng Tôi, đại lý và/hoặc các chi nhánh của Chúng Tôi hoặc các công ty liên quan, và/hoặc các bên thứ ba khác, cho dù các Trang web bên đó đặt tại đâu, cho một hoặc nhiều hơn các Mục Đích nêu trên. Các nhà cung cấp dịch vụ, đại lý và/hoặc các chi nhánh hoặc công ty liên quan và/hoặc các bên thứ ba khác đó sẽ được thay mặt Chúng Tôi hoặc bằng cách khác, xử lý dữ liệu cá nhân của bạn cho một hoặc nhiều hơn các Mục Đích nêu trên. Các bên thứ ba đó bao gồm:
          </Text>
          <Text style={styles.listItem}><Text style={styles.bold}>(a)</Text> Các công ty con của Chúng Tôi, các chi nhánh và các công ty liên quan;</Text>
          <Text style={styles.listItem}><Text style={styles.bold}>(b)</Text> Nhà thầu, đại lý, nhà cung cấp dịch vụ và các bên thứ ba khác mà Chúng Tôi sử dụng để hỗ trợ hoạt động kinh doanh của Chúng Tôi, bao gồm nhưng không giới hạn những đơn vị cung cấp dịch vụ quản trị hoặc các dịch vụ khác như các công ty bưu chính, các công ty viễn thông, các công ty công nghệ thông tin và các trung tâm dữ liệu;</Text>
          <Text style={styles.listItem}><Text style={styles.bold}>(c)</Text> Một người mua hoặc người thừa kế khác trong trường hợp sáp nhập, thoái vốn, tái cơ cấu, tổ chức lại, giải thể hoặc bán hoặc chuyển nhượng một phần hoặc toàn bộ tài sản PHHotel, cho dù là một hoạt động liên tục hoặc là một phần của phá sản, thanh lý, thủ tục tương tự, trong đó dữ liệu cá nhân của bạn là một trong những tài sản được chuyển giao; hoặc để một đối tác trong một giao dịch tài sản doanh nghiệp mà PHHotel hoặc chi nhánh của nó hoặc các công ty có liên quan tham gia;</Text>
          <Text style={styles.listItem}><Text style={styles.bold}>(d)</Text> Bên thứ ba mà Chúng Tôi tiết lộ thông tin dành cho một hoặc nhiều hơn các Mục Đích và các bên thứ ba đó sẽ lần lượt được thu thập và xử lý dữ liệu cá nhân của bạn cho một hoặc nhiều hơn các Mục Đích trên.</Text>
          <Text style={styles.subsectionTitle}>10.2</Text>
          <Text style={styles.text}>
            Ngoài các nội dung trên, việc chia sẻ thông tin này có thể là do yêu cầu về việc chia sẻ thông tin mang tính thống kê và nhân khẩu học về Người Dùng của Chúng Tôi và việc sử dụng Dịch Vụ của họ với các nhà cung cấp dịch vụ quảng cáo và lập trình. Điều này sẽ không bao gồm bất cứ điều gì mà có thể được sử dụng để nhận dạng bạn một cách đặc biệt hoặc để phát hiện các thông tin cá nhân về bạn.
          </Text>
          <Text style={styles.subsectionTitle}>10.3</Text>
          <Text style={styles.text}>
            Để tránh sự nghi ngờ, trong trường hợp pháp luật bảo vệ dữ liệu cá nhân hoặc các điều luật khác cho phép một tổ chức như Chúng Tôi thu thập, sử dụng hoặc tiết lộ dữ liệu cá nhân của bạn mà không cần sự đồng ý của bạn, thì sự cho phép đó vẫn tiếp tục được áp dụng.
          </Text>
          <Text style={styles.subsectionTitle}>10.4</Text>
          <Text style={styles.text}>
            Chính Sách Bảo Mật này không phải là một lời hứa rằng dữ liệu cá nhân của bạn sẽ không bao giờ được tiết lộ, ngoại trừ như được mô tả trong Chính Sách Bảo Mật này. Ví dụ, các bên thứ ba bất hợp pháp có thể chặn truy cập dữ liệu cá nhân chuyển đến hoặc được chứa trên Trang web, công nghệ có thể không hoạt động hoặc hoạt động không như dự kiến, hoặc một người nào đó có thể truy cập, lạm dụng hoặc sử dụng thông tin sai cách mà không phải do lỗi của Chúng Tôi. Chúng Tôi sẽ luôn triển khai các biện pháp an ninh hợp lý để bảo vệ dữ liệu cá nhân của bạn theo quy định pháp luật hiện hành; tuy nhiên có thể sẽ không đảm bảo an toàn tuyệt đối khỏi việc tiết lộ trái phép phát sinh từ hành động hacking mang tính phá hoại và tinh vi bởi các đối tượng bất mãn chứ không phải do lỗi của Chúng Tôi.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>11. THÔNG TIN THU THẬP CỦA BÊN THỨ BA</Text>
          <Text style={styles.subsectionTitle}>11.1</Text>
          <Text style={styles.text}>
            Trang web của Chúng Tôi sử dụng Google Analytics, một dịch vụ phân tích web được cung cấp bởi Google, Inc. ("Google"). Google Analytics sử dụng Cookie, các file văn bản được đặt trên máy tính của bạn, để giúp các Trang web phân tích cách Người Dùng sử dụng các Trang web. Các thông tin được tạo ra bởi Cookie về việc sử dụng của bạn trên Trang web (bao gồm địa chỉ IP của bạn) sẽ được truyền đến và lưu trữ bởi Google trên máy chủ tại Hoa Kỳ. Google sẽ sử dụng thông tin này cho mục đích đánh giá việc bạn sử dụng các Trang web, soạn thảo các báo cáo về hoạt động website để điều hành Trang web và các dịch vụ khác liên quan đến hoạt động Trang web và sử dụng Internet. Google cũng có thể chuyển thông tin này cho bên thứ ba mà cần phải thông qua theo luật pháp, hoặc các bên thứ ba xử lý thông tin thay cho Google. Google sẽ không kết hợp địa chỉ IP của bạn với bất kỳ dữ liệu khác được tổ chức bởi Google.
          </Text>
          <Text style={styles.subsectionTitle}>11.2</Text>
          <Text style={styles.text}>
            Chúng Tôi, cùng với bên thứ ba, sẽ luôn cung cấp các ứng dụng có thể tải về được thông qua Dịch Vụ của Chúng Tôi. Những ứng dụng này có thể sẽ cho phép bên thứ ba xem được thông tin danh tính của bạn, bao gồm tên, ID Người Dùng, địa chỉ IP máy tính của bạn hoặc những thông tin khác như Cookies mà bạn đã từng cài đặt hoặc cho phép một bên thứ ba cài đặt vào ứng dụng/trang web của bạn. Sản phẩm/dịch vụ do bên thứ ba cung cấp không thuộc sở hữu và quyền quản lý của PHHotel. Chúng Tôi khuyến khích bạn đọc kỹ điều khoản và các Chính Sách khác được cung cấp bởi các bên thứ ba trên Trang web và các phương tiện truyền thông khác của họ.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>12. KHUYẾN CÁO VỀ AN NINH VÀ WEBSITE BÊN THỨ BA</Text>
          <Text style={styles.subsectionTitle}>12.1</Text>
          <Text style={styles.text}>
            <Text style={styles.bold}>CHÚNG TÔI KHÔNG BẢO ĐẢM AN NINH CÁ NHÂN VÀ/HOẶC THÔNG TIN KHÁC MÀ BẠN CUNG CẤP</Text> cho Website bên thứ ba. Chúng Tôi thực hiện một loạt các biện pháp an ninh để duy trì sự an toàn của dữ liệu cá nhân của bạn dưới sự sở hữu của Chúng Tôi hoặc dưới sự kiểm soát của Chúng Tôi. Dữ liệu cá nhân của bạn được lưu trữ đằng sau mạng lưới bảo đảm và chỉ có thể truy cập bởi một số người giới hạn có quyền truy cập đặc biệt tới hệ thống và đã được yêu cầu giữ bí mật cho dữ liệu cá nhân này. Khi bạn truy cập vào dữ liệu cá nhân của bạn, Chúng Tôi cung cấp việc sử dụng qua một máy chủ an toàn. Tất cả dữ liệu cá nhân hoặc thông tin mà bạn cung cấp được mã hóa vào cơ sở dữ liệu của Chúng Tôi để được chỉ truy cập như đã nêu ở trên.
          </Text>
          <Text style={styles.subsectionTitle}>12.2</Text>
          <Text style={styles.text}>
            Chúng Tôi sẽ nỗ lực để cung cấp cho bạn sản phẩm với giá trị gia tăng, chúng ta có thể chọn các trang web bên thứ ba khác nhau để liên kết đến, và nền tảng bên trong các trang web. Chúng Tôi cũng có thể tham gia hợp tác xây dựng thương hiệu và các mối quan hệ khác để cung cấp cho thương mại điện tử và các dịch vụ khác và các tính năng mà Chúng Tôi tạo nên. Những trang web liên kết có Chính Sách Bảo Mật cũng như thỏa thuận an ninh riêng biệt và độc lập. Thậm chí nếu người thứ ba là bên liên kết với Chúng Tôi, Chúng Tôi không có quyền kiểm soát các trang web liên kết đó, trong đó có sự riêng tư và thu thập dữ liệu riêng biệt độc lập. Dữ liệu được thu thập bởi các đối tác đồng thương hiệu của Chúng Tôi hoặc những trang web của bên thứ ba (thậm chí nếu được cung cấp trên hoặc thông qua Trang web của Chúng Tôi) có thể không được nhận bởi Chúng Tôi.
          </Text>
          <Text style={styles.subsectionTitle}>12.3</Text>
          <Text style={styles.text}>
            Do đó Chúng Tôi không có trách nhiệm đối với các nội dung, biện pháp an ninh và các hoạt động của các trang web liên kết. Các trang web liên kết chỉ phục vụ cho sự thuận tiện của bạn và do đó khi truy cập chúng, bạn phải chịu một số rủi ro nhất định. Tuy nhiên, Chúng Tôi tìm cách để bảo vệ sự nguyên bản của Trang web của Chúng Tôi và các liên kết đặt trên đó nên Chúng Tôi hoan nghênh bất kỳ thông tin phản hồi về các Trang web liên quan (kể cả trong trường hợp một liên kết nào đó không hoạt động).
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>13. TRUY CẬP TRANG WEB CỦA CHÚNG TÔI TỪ NƯỚC NGOÀI?</Text>
          <Text style={styles.text}>
            Nếu bạn đang truy cập Trang web của Chúng Tôi hoặc liên hệ với Chúng Tôi từ nước ngoài, hãy lưu ý rằng dữ liệu cá nhân của bạn và/hoặc thông tin có thể được chuyển giao, lưu trữ, xử lý tại Singapore, nơi các máy chủ của Chúng Tôi, vị trí và cơ sở dữ liệu trung tâm của Chúng Tôi được điều hành. Luật bảo vệ dữ liệu và các luật khác của Singapore và các nước khác có thể không giống như luật của Việt Nam. Bằng cách sử dụng Trang web của Chúng Tôi hoặc mua sản phẩm hoặc dịch vụ của Chúng Tôi, bạn thừa nhận rằng dữ liệu cá nhân của bạn và/hoặc thông tin có thể được chuyển giao cho các cơ sở của Chúng Tôi và các bên thứ ba mà Chúng Tôi chia sẻ nó như mô tả trong Chính Sách Bảo Mật này.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>14. LÀM THẾ NÀO ĐỂ KHÔNG THAM GIA, BỎ, YÊU CẦU TRUY CẬP, HOẶC THAY ĐỔI THÔNG TIN BẠN ĐÃ CUNG CẤP CHO CHÚNG TÔI?</Text>
          <Text style={styles.subsectionTitle}>14.1 Từ chối nhận và Hủy Đồng ý</Text>
          <Text style={styles.subsubsectionTitle}>14.1.1</Text>
          <Text style={styles.text}>
            Để sửa đổi đăng ký nhận tin qua thư điện tử của bạn, xin vui lòng cho Chúng Tôi biết bằng cách gửi thư điện tử tới bộ phận Chăm sóc khách hàng của Chúng Tôi tại địa chỉ được liệt kê dưới đây. Hãy lưu ý rằng bạn vẫn sẽ nhận được thư điện tử thông báo liên quan đến bản thân ứng dụng.
          </Text>
          <Text style={styles.subsubsectionTitle}>14.1.2</Text>
          <Text style={styles.text}>
            Bạn có thể rút lại sự đồng ý của bạn đối với việc thu thập, sử dụng và/hoặc tiết lộ dữ liệu cá nhân của bạn dưới sự sở hữu hoặc kiểm soát của Chúng Tôi bằng cách gửi thư điện tử tới bộ phận Chăm sóc khách hàng của Chúng Tôi tại địa chỉ email được liệt kê trong Mục 15.
          </Text>
          <Text style={styles.subsubsectionTitle}>14.1.3</Text>
          <Text style={styles.text}>
            Một khi Chúng Tôi đã có hướng dẫn rõ ràng về việc hủy đồng ý của bạn và xác minh danh tính của bạn, Chúng Tôi sẽ xử lý yêu cầu của bạn cho việc hủy đồng ý đó, và sau đó sẽ không thu thập, sử dụng và/hoặc tiết lộ dữ liệu cá nhân của bạn theo cách thức nêu trong yêu cầu của bạn. Nếu Chúng Tôi không thể xác minh danh tính của bạn hoặc hiểu được các chỉ dẫn của bạn, Chúng Tôi sẽ liên hệ với bạn để làm rõ yêu cầu của bạn.
          </Text>
          <Text style={styles.subsubsectionTitle}>14.1.4</Text>
          <Text style={styles.text}>
            Tuy nhiên, thu hồi chấp thuận của bạn có thể dẫn đến hậu quả pháp lý nhất định phát sinh từ việc hủy thỏa thuận. Về vấn đề này, tùy thuộc vào mức độ thu hồi của bạn về sự đồng ý cho Chúng Tôi xử lý dữ liệu cá nhân của bạn, nó có thể có nghĩa rằng Chúng Tôi sẽ không thể tiếp tục cung cấp các Dịch Vụ cho bạn, Chúng Tôi có thể cần phải chấm dứt mối quan hệ hiện tại với bạn và/hoặc hợp đồng bạn có với Chúng Tôi và Chúng Tôi sẽ thông báo cho bạn.
          </Text>
          <Text style={styles.subsectionTitle}>14.2 Yêu cầu truy cập và/hoặc chỉnh sửa dữ liệu cá nhân</Text>
          <Text style={styles.subsubsectionTitle}>14.2.1</Text>
          <Text style={styles.text}>
            Nếu bạn đã đăng ký một tài khoản với Chúng Tôi, bạn có thể trực tiếp truy cập và/hoặc sửa dữ liệu cá nhân của bạn hiện đang dưới sự sở hữu hoặc kiểm soát của Chúng Tôi thông qua các trang Cài đặt tài khoản trên Phần mềm. Nếu bạn chưa đăng ký tài khoản với Chúng Tôi, bạn có thể yêu cầu để truy cập và/hoặc sửa dữ liệu cá nhân của bạn hiện đang dưới sự sở hữu hoặc kiểm soát của Chúng Tôi bằng cách gửi văn bản yêu cầu cho Chúng Tôi. Chúng Tôi cần có đủ thông tin từ bạn để xác định danh tính của bạn cũng như bản chất của yêu cầu của bạn để có thể xử lí yêu cầu của bạn. Do đó, hãy gửi yêu cầu bằng văn bản bằng cách gửi email tới cán bộ quản lý dữ liệu của Chúng Tôi tại địa chỉ email được liệt kê bên dưới trong Mục 15.
          </Text>
          <Text style={styles.subsubsectionTitle}>14.2.2</Text>
          <Text style={styles.text}>
            Đối với yêu cầu truy cập vào dữ liệu cá nhân, một khi Chúng Tôi có đầy đủ thông tin từ bạn để xử lý yêu cầu đó, Chúng Tôi sẽ cung cấp cho bạn các dữ liệu cá nhân có liên quan trong vòng 30 ngày. Trường hợp Chúng Tôi không thể đáp ứng cho bạn trong vòng 30 ngày, Chúng Tôi sẽ thông báo cho bạn về thời gian sớm nhất có thể trong phạm vi mà Chúng Tôi có thể cung cấp cho bạn các thông tin yêu cầu. Lưu ý rằng Chúng Tôi có thể miễn trừ một số loại dữ liệu cá nhân khỏi việc yêu cầu truy cập của bạn.
          </Text>
          <Text style={styles.subsubsectionTitle}>14.2.3</Text>
          <Text style={styles.text}>Đối với yêu cầu chỉnh sửa dữ liệu cá nhân, một khi Chúng Tôi có đầy đủ thông tin từ bạn để xử lý, Chúng Tôi sẽ:</Text>
          <Text style={styles.listItem}><Text style={styles.bold}>(a)</Text> Chỉnh sửa dữ liệu cá nhân của bạn trong vòng 30 ngày. Trường hợp Chúng Tôi không thể làm như vậy trong vòng 30 ngày, Chúng Tôi sẽ thông báo cho bạn về thời gian sớm nhất mà Chúng Tôi có thể thực hiện.</Text>
          <Text style={styles.listItem}><Text style={styles.bold}>(b)</Text> Chúng Tôi sẽ gửi các dữ liệu cá nhân đã chỉnh sửa tới mọi tổ chức khác mà Chúng Tôi đã tiết lộ các dữ liệu cá nhân này trong vòng 1 năm trước ngày điều chỉnh được thực hiện, trừ khi các tổ chức khác không cần những dữ liệu cá nhân đó cho bất kỳ Mục Đích pháp lý, kinh doanh nào.</Text>
          <Text style={styles.subsubsectionTitle}>14.2.4</Text>
          <Text style={styles.text}>
            Không kể đến điều (b) ở trên, nếu bạn yêu cầu, Chúng Tôi có thể gửi các dữ liệu cá nhân đã chỉnh sửa chỉ cho các tổ chức cụ thể mà Chúng Tôi đã tiết lộ các dữ liệu cá nhân này trong vòng 1 năm trước ngày điều chỉnh được thực hiện.
          </Text>
          <Text style={styles.subsubsectionTitle}>14.2.5</Text>
          <Text style={styles.text}>
            Chúng Tôi bảo lưu quyền từ chối chỉnh sửa dữ liệu cá nhân của bạn dựa theo với các quy định đã nêu trong các luật liên quan, luật yêu cầu và/hoặc cho phép một tổ chức từ chối chỉnh sửa dữ liệu cá nhân trong một số trường hợp quy định.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>15. CÂU HỎI, THẮC MẮC HOẶC KHIẾU NẠI? LIÊN HỆ VỚI CHÚNG TÔI</Text>
          <Text style={styles.subsectionTitle}>15.1</Text>
          <Text style={styles.text}>
            Nếu bạn có bất kỳ câu hỏi hoặc quan tâm về việc bảo mật của Chúng Tôi hoặc các giao dịch của bạn với các Dịch Vụ, xin vui lòng liên hệ PHHotel tại email{' '}
            <Text style={styles.link} onPress={() => Linking.openURL('mailto:support@phhotel.vn')}>support@phhotel.vn</Text>
          </Text>
          <Text style={styles.subsectionTitle}>15.2</Text>
          <Text style={styles.text}>
            Nếu bạn có bất kỳ khiếu nại liên quan đến cách Chúng Tôi đang xử lý dữ liệu cá nhân của bạn hoặc về cách thức Chúng Tôi đang thực thi luật, Chúng Tôi hoan nghênh bạn liên hệ với Chúng Tôi qua email{' '}
            <Text style={styles.link} onPress={() => Linking.openURL('mailto:support@phhotel.vn')}>support@phhotel.vn</Text> hoặc hotline{' '}
            <Text style={styles.link} onPress={() => Linking.openURL('tel:19006159')}>1900 6159</Text>
          </Text>
          <Text style={styles.subsectionTitle}>15.3</Text>
          <Text style={styles.text}>
            Nếu bạn gửi yêu cầu khiếu nại thông qua thư hay email, vui lòng ghi thông tin vụ khiếu nại về việc áp dụng luật liên quan đến an toàn thông tin cá nhân ở mục tiêu đề thư. Việc này sẽ giúp Chúng Tôi xử lý yêu cầu của bạn nhanh chóng bằng cách chuyển yêu cầu đó sang bộ phận chịu trách nhiệm trong công ty Chúng Tôi để tiếp tục xử lý. Ví dụ, bạn có thể thêm vào mục tiêu đề email/thư nội dung "Khiếu nại áp dụng luật". Chúng Tôi sẽ cố gắng để xử lí các phàn nàn hoặc khiếu nại của bạn trong thời gian sớm nhất có thể.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>16. LUẬT ĐIỀU CHỈNH</Text>
          <Text style={styles.text}>
            Chính Sách Bảo Mật này được điều chỉnh bởi pháp luật của nước Cộng hòa Xã hội chủ nghĩa Việt Nam.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>17. CÁC ĐIỀU KHOẢN VÀ ĐIỀU KIỆN</Text>
          <Text style={styles.text}>
            Xin vui lòng đọc Điều khoản Dịch vụ về việc sử dụng, từ bỏ và giới hạn trách nhiệm khi sử dụng các Trang web, Dịch Vụ và các chính sách liên quan khác.
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}

const createStyles = (colors: {
  background: string;
  text: string;
  textSecondary: string;
  sectionCard: string;
  tint: string;
}) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 10,
  },
  lastUpdated: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 20,
  },
  section: {
    backgroundColor: colors.sectionCard,
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
    color: colors.tint,
    marginBottom: 15,
  },
  subsectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginTop: 15,
    marginBottom: 10,
  },
  subsubsectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginTop: 10,
    marginBottom: 6,
  },
  text: {
    fontSize: 14,
    lineHeight: 22,
    color: colors.text,
    textAlign: 'justify',
    marginBottom: 10,
  },
  listItem: {
    fontSize: 14,
    lineHeight: 22,
    color: colors.text,
    textAlign: 'justify',
    marginBottom: 6,
    marginLeft: 12,
  },
  bold: {
    fontWeight: '700',
    color: colors.text,
  },
  link: {
    color: colors.tint,
    textDecorationLine: 'underline',
  },
});
