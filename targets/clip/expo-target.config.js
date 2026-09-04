/** @type {import('@bacons/apple-targets/app.plugin').ConfigFunction} */
module.exports = (config) => ({
  type: 'clip',
  name: 'PHHotel Clip',
  icon: '../../assets/images/phgroup_logo_circle.png',
  exportJs: true,
  deploymentTarget: '16.0',
  bundleIdentifier: '.clip',
  entitlements: {
    'com.apple.developer.associated-domains': ['appclips:phhotel.vn'],
  },
});
