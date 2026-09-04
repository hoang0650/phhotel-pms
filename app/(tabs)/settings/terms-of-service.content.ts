export type LegalBlock = {
  h3?: string;
  p?: string[];
  ul?: string[];
  strongP?: string;
};

export type LegalSection = {
  title: string;
  blocks: LegalBlock[];
};

export type LegalDoc = {
  title: string;
  subtitle?: string;
  lastUpdatedLabel: string;
  sections: LegalSection[];
};

export const TERMS_DOCS: Record<'vi' | 'en', LegalDoc> = {
  vi: {
    title: 'Thoả thuận sử dụng Dịch vụ Phần mềm PHHotel',
    lastUpdatedLabel: 'Cập nhật lần cuối',
    subtitle:
      'Công ty TNHH Giải Pháp Công Nghệ PHGROUP — PHHotel PMS (web, app, App Clip).',
    sections: [
      {
        title: '',
        blocks: [
          {
            p: [
              'Đây là thỏa thuận giữa Khách hàng và Công ty TNHH Giải Pháp Công Nghệ PHGROUP (“PHHotel”) khi sử dụng PHHotel PMS trên ứng dụng di động, web và App Clip.',
              'Bằng việc đăng nhập hoặc tiếp tục sử dụng, bạn đồng ý với các điều khoản này. Bản đầy đủ cũng được đăng tại https://phhotel.vn/terms-of-service',
              'Hỗ trợ: support@phhotel.vn — https://phhotel.vn',
            ],
          },
        ],
      },
      {
        title: 'Điều 1: Định nghĩa',
        blocks: [
          {
            p: [
              'Phần mềm PHHotel là hệ thống quản lý khách sạn (phòng, đặt phòng, hóa đơn, báo cáo và các tính năng hỗ trợ trong PMS). Dịch vụ là quyền sử dụng Phần mềm theo gói đã đăng ký. Khách hàng là cơ sở lưu trú/tổ chức vận hành; Người dùng là tài khoản được Khách hàng cấp quyền.',
            ],
          },
        ],
      },
      {
        title: 'Điều 2: Tài khoản và bảo mật',
        blocks: [
          {
            p: [
              'Bạn phải bảo mật mật khẩu, thiết bị và sinh trắc học trên máy. Mọi thao tác từ tài khoản của bạn thuộc trách nhiệm của Khách hàng. Báo ngay support@phhotel.vn nếu nghi ngờ truy cập trái phép.',
            ],
          },
        ],
      },
      {
        title: 'Điều 3: Phí và thanh toán',
        blocks: [
          {
            p: [
              'Phí thuê bao/module được công bố trên https://phhotel.vn hoặc hợp đồng riêng. Phí đối tác (thanh toán, e-invoice, SMS, AI, kho ứng dụng) không nằm trong phí PHHotel trừ khi ghi rõ.',
            ],
          },
        ],
      },
      {
        title: 'Điều 4: Sử dụng hợp pháp',
        blocks: [
          {
            p: ['Bạn cam kết:'],
            ul: [
              'Chỉ dùng cho vận hành cơ sở lưu trú hợp pháp;',
              'Không lừa đảo, rửa tiền, cờ bạc trái phép hay hành vi vi phạm pháp luật;',
              'Không tấn công, phá hoại hoặc sao chép trái phép Phần mềm;',
              'Có cơ sở pháp lý khi đưa dữ liệu cá nhân khách/nhân viên vào hệ thống (Nghị định 13/2023/NĐ-CP).',
            ],
          },
        ],
      },
      {
        title: 'Điều 5: Tạm dừng và chấm dứt',
        blocks: [
          {
            p: [
              'PHHotel có thể tạm dừng/chấm dứt khi quá hạn thanh toán, vi phạm Thỏa thuận, theo yêu cầu cơ quan nhà nước, hoặc bảo trì/an ninh. Nên xuất dữ liệu trước khi hủy dịch vụ.',
            ],
          },
        ],
      },
      {
        title: 'Điều 6: AI và bên thứ ba',
        blocks: [
          {
            p: [
              'Tính năng AI trong PHHotel PMS (nếu có trong gói) và tích hợp Google/Apple/thanh toán là tiện ích bổ sung của sản phẩm PHHotel. Kết quả AI chỉ mang tính hỗ trợ — hãy kiểm tra trước khi áp dụng. Điều khoản đối tác vẫn áp dụng khi bạn bật dịch vụ của họ.',
            ],
          },
        ],
      },
      {
        title: 'Điều 7: Giới hạn trách nhiệm',
        blocks: [
          {
            p: [
              'Dịch vụ cung cấp theo tình trạng hiện có. Trong phạm vi pháp luật cho phép, PHHotel không chịu thiệt hại gián tiếp; tổng bồi thường (nếu có) không vượt quá phí đã trả trong 03 tháng liền kề trước sự kiện, trừ trường hợp pháp luật không cho giới hạn.',
            ],
          },
        ],
      },
      {
        title: 'Điều 8: Sở hữu trí tuệ và dữ liệu',
        blocks: [
          {
            p: [
              'PHHotel/PHGROUP sở hữu phần mềm và thương hiệu. Dữ liệu vận hành do bạn nhập thuộc quyền kiểm soát của Khách hàng; PHHotel xử lý để cung cấp dịch vụ theo Chính sách bảo mật https://phhotel.vn/privacy-policy',
            ],
          },
        ],
      },
      {
        title: 'Điều 9: Luật áp dụng',
        blocks: [
          {
            p: [
              'Thỏa thuận điều chỉnh theo pháp luật Việt Nam. Tranh chấp ưu tiên thương lượng; không đạt thì đưa ra Tòa án nhân dân có thẩm quyền. Điều khoản có thể được cập nhật trên website/ứng dụng; tiếp tục sử dụng nghĩa là chấp thuận bản mới.',
            ],
          },
        ],
      },
    ],
  },
  en: {
    title: 'PHHotel Software Services Agreement',
    lastUpdatedLabel: 'Last updated',
    subtitle:
      'PHGROUP Technology Solutions Co., Ltd. — PHHotel PMS (web, app, App Clip).',
    sections: [
      {
        title: '',
        blocks: [
          {
            p: [
              'This agreement is between the Customer and PHGROUP Technology Solutions Co., Ltd. (“PHHotel”) for PHHotel PMS on mobile, web, and App Clip.',
              'By signing in or continuing to use the app, you accept these terms. The full version is at https://phhotel.vn/terms-of-service',
              'Support: support@phhotel.vn — https://phhotel.vn',
            ],
          },
        ],
      },
      {
        title: 'Article 1: Definitions',
        blocks: [
          {
            p: [
              'PHHotel Software is the hotel PMS (rooms, bookings, invoices, reports, AI…). The Service is the right to use it under your plan. Customer means the lodging business; Users are accounts the Customer authorizes.',
            ],
          },
        ],
      },
      {
        title: 'Article 2: Accounts',
        blocks: [
          {
            p: [
              'Keep passwords and devices secure. Activity under your account is the Customer’s responsibility. Report suspected unauthorized access to support@phhotel.vn.',
            ],
          },
        ],
      },
      {
        title: 'Article 3: Fees',
        blocks: [
          {
            p: [
              'Subscription/module fees are published at https://phhotel.vn or in a separate contract. Third-party fees (payments, e-invoice, SMS, AI, app stores) are excluded unless stated.',
            ],
          },
        ],
      },
      {
        title: 'Article 4: Acceptable use',
        blocks: [
          {
            p: ['You agree to:'],
            ul: [
              'Use the Service only for lawful hospitality operations;',
              'Not commit fraud, money laundering, illegal gambling, or other crimes;',
              'Not attack, disrupt, or pirate the Software;',
              'Have a legal basis for personal data you upload (Vietnam Decree 13/2023/ND-CP).',
            ],
          },
        ],
      },
      {
        title: 'Article 5: Suspension',
        blocks: [
          {
            p: [
              'PHHotel may suspend or terminate for non-payment, breach, legal orders, or security/maintenance. Export data before cancellation when possible.',
            ],
          },
        ],
      },
      {
        title: 'Article 6: AI and third parties',
        blocks: [
          {
            p: [
              'In-PMS AI features (if included in your plan) and Google/Apple/payment integrations are optional PHHotel product features. AI output is assistive — verify before use. Third-party terms apply when you enable their services.',
            ],
          },
        ],
      },
      {
        title: 'Article 7: Liability',
        blocks: [
          {
            p: [
              'The Service is provided as available. To the extent permitted by law, PHHotel is not liable for indirect damages; aggregate liability is capped at fees paid in the prior three (3) months, except where limitation is prohibited.',
            ],
          },
        ],
      },
      {
        title: 'Article 8: IP and data',
        blocks: [
          {
            p: [
              'PHHotel/PHGROUP owns the Software and brands. Operational data you enter remains under the Customer’s control; PHHotel processes it to provide the Service under https://phhotel.vn/privacy-policy',
            ],
          },
        ],
      },
      {
        title: 'Article 9: Governing law',
        blocks: [
          {
            p: [
              'Vietnam law applies. Disputes go to competent Vietnamese courts after negotiation. Updated terms may be published on the website/app; continued use means acceptance.',
            ],
          },
        ],
      },
    ],
  },
};
