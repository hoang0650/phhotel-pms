# Google OAuth — PHHotel PMS

| Biến môi trường | Platform | File nguồn | Trường trong file |
|-----------------|----------|--------------|-------------------|
| `EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID` | **Android** | `android-client.json` | `installed.client_id` |
| `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID` | **iOS** | `ios-client.plist` | `CLIENT_ID` |
| `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` | Web / Backend | OAuth client Web trên Google Cloud | Client ID |

**Package Android:** `app.rork.phhotel_pms_interface`  
**Bundle iOS:** `app.rork.phhotel-pms-interface`

File `.plist` **không phải** Android client ID — đó là client iOS.
