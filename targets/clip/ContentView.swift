import SwiftUI
import UIKit

struct ContentView: View {
  private var isVi: Bool {
    Locale.current.language.languageCode?.identifier == "vi"
      || Locale.current.identifier.lowercased().hasPrefix("vi")
  }

  private var copy: Copy {
    isVi ? .vi : .en
  }

  var body: some View {
    ZStack {
      LinearGradient(
        colors: [
          Color(red: 0.03, green: 0.43, blue: 0.41),
          Color(red: 0.08, green: 0.66, blue: 0.61),
        ],
        startPoint: .topLeading,
        endPoint: .bottomTrailing
      )
      .ignoresSafeArea()

      ScrollView {
        VStack(spacing: 20) {
          Image("Logo")
            .resizable()
            .scaledToFit()
            .frame(width: 88, height: 88)
            .clipShape(RoundedRectangle(cornerRadius: 20, style: .continuous))
            .padding(.top, 36)

          Text(copy.brand)
            .font(.system(size: 28, weight: .bold))
            .foregroundStyle(.white)

          Text(copy.headline)
            .font(.system(size: 22, weight: .semibold))
            .foregroundStyle(.white)
            .multilineTextAlignment(.center)

          Text(copy.subtitle)
            .font(.system(size: 16))
            .foregroundStyle(.white.opacity(0.9))
            .multilineTextAlignment(.center)
            .padding(.horizontal, 24)

          VStack(alignment: .leading, spacing: 12) {
            ForEach(copy.features, id: \.self) { feature in
              HStack(spacing: 10) {
                Image(systemName: "checkmark.circle.fill")
                  .foregroundStyle(.white)
                Text(feature)
                  .foregroundStyle(.white)
                  .font(.system(size: 15, weight: .medium))
              }
            }
          }
          .frame(maxWidth: .infinity, alignment: .leading)
          .padding(.horizontal, 36)
          .padding(.top, 8)

          VStack(spacing: 12) {
            Button(action: openFullApp) {
              Text(copy.openApp)
                .font(.system(size: 17, weight: .semibold))
                .frame(maxWidth: .infinity)
                .padding(.vertical, 14)
                .background(Color.white)
                .foregroundStyle(Color(red: 0.03, green: 0.43, blue: 0.41))
                .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
            }

            Button(action: openWebsite) {
              Text(copy.website)
                .font(.system(size: 16, weight: .medium))
                .frame(maxWidth: .infinity)
                .padding(.vertical, 12)
                .background(Color.white.opacity(0.18))
                .foregroundStyle(.white)
                .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
            }

            Button(action: openVideo) {
              Text(copy.watchVideo)
                .font(.system(size: 16, weight: .medium))
                .foregroundStyle(.white.opacity(0.95))
            }
          }
          .padding(.horizontal, 28)
          .padding(.top, 12)

          Text(copy.footnote)
            .font(.system(size: 12))
            .foregroundStyle(.white.opacity(0.75))
            .multilineTextAlignment(.center)
            .padding(.horizontal, 28)
            .padding(.bottom, 40)
        }
      }
    }
  }

  private func openFullApp() {
    let scheme = URL(string: "rork-app://")!
    let store = URL(string: "https://apps.apple.com/app/id6778220852")!
    if UIApplication.shared.canOpenURL(scheme) {
      UIApplication.shared.open(scheme)
    } else {
      UIApplication.shared.open(store)
    }
  }

  private func openWebsite() {
    if let url = URL(string: "https://phhotel.vn/clip") {
      UIApplication.shared.open(url)
    }
  }

  private func openVideo() {
    if let url = URL(string: "https://youtu.be/8YDrnZSQ2Xc") {
      UIApplication.shared.open(url)
    }
  }
}

private struct Copy {
  let brand: String
  let headline: String
  let subtitle: String
  let features: [String]
  let openApp: String
  let website: String
  let watchVideo: String
  let footnote: String

  static let vi = Copy(
    brand: "PHHotel PMS",
    headline: "Quản lý khách sạn trên điện thoại",
    subtitle: "Phòng, đặt phòng, hóa đơn và báo cáo — sẵn sàng cho lễ tân và chủ khách sạn.",
    features: [
      "Sơ đồ phòng realtime",
      "Lịch đặt phòng & OTA",
      "Hóa đơn & thanh toán",
      "Báo cáo doanh thu",
    ],
    openApp: "Mở / Tải PHHotel PMS",
    website: "Xem phhotel.vn/clip",
    watchVideo: "Xem video giới thiệu",
    footnote: "App Clip quảng cáo · Cài app đầy đủ để đăng nhập và vận hành"
  )

  static let en = Copy(
    brand: "PHHotel PMS",
    headline: "Hotel management on your phone",
    subtitle: "Rooms, bookings, invoices, and reports — built for front desk and hotel owners.",
    features: [
      "Live room board",
      "Bookings & OTA calendar",
      "Invoices & payments",
      "Revenue reports",
    ],
    openApp: "Open / Get PHHotel PMS",
    website: "Visit phhotel.vn/clip",
    watchVideo: "Watch intro video",
    footnote: "Promotional App Clip · Install the full app to sign in and operate"
  )
}

#Preview {
  ContentView()
}
