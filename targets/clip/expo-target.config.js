/** @type {import('@bacons/apple-targets/app.plugin').ConfigFunction} */
module.exports = (config) => ({
  type: 'clip',
  // Must match folder name `targets/clip` — Podfile looks up target by this name.
  name: 'clip',
  displayName: 'PHHotel Clip',
  icon: '../../assets/images/phgroup_logo_circle.png',
  images: {
    Logo: '../../assets/images/phgroup_logo_circle.png',
  },
  // Native SwiftUI only — RN/Hermes exceeds Apple's 15 MB App Clip limit.
  exportJs: false,
  deploymentTarget: '16.4',
  bundleIdentifier: '.clip',
  entitlements: {
    'com.apple.developer.associated-domains': ['appclips:phhotel.vn'],
  },
});
