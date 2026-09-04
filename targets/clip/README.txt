# App Clip target — PHHotel PMS

Parent: app.rork.phhotel-pms-interface
Clip:   app.rork.phhotel-pms-interface.clip
Team:   XZUV4HFW8S
URL:    https://phhotel.vn/clip

AASA (hotelapp):
  /.well-known/apple-app-site-association
  appclips.apps = ["XZUV4HFW8S.app.rork.phhotel-pms-interface.clip"]

Build:
  npx expo prebuild -p ios
  eas build --platform ios --profile production
