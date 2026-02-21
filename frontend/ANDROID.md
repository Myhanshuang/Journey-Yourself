# Journey Diary Android App

This project has been configured with Capacitor to run as an Android App.

## Prerequisites
- Android Studio (latest version recommended)
- Java JDK 17+
- Android SDK

## How to Build the APK

1. **Sync Changes**:
   If you modify the frontend code, always run:
   ```bash
   npm run build
   npx cap sync
   ```

2. **Open in Android Studio**:
   ```bash
   npx cap open android
   ```
   Or launch Android Studio manually and open the `frontend/android` directory.
   
   If `npx cap open android` fails to find Android Studio, you can set the path explicitly:
   ```bash
   CAPACITOR_ANDROID_STUDIO_PATH=/path/to/android-studio/bin/studio.sh npx cap open android
   ```
   (We have updated the `npm run android` script to use `/usr/bin/android-studio` for your convenience).

3. **Build APK**:
   - Go to `Build` > `Build Bundle(s) / APK(s)` > `Build APK(s)`.
   - The APK will be generated in `frontend/android/app/build/outputs/apk/debug/app-debug.apk`.

## Configuration
- **Server URL**: The login screen now has a "Server URL" field. Enter your backend address there (e.g., `http://192.168.1.100:8000` or `https://my-diary.com`).
- **HTTP Support**: The app is configured to allow cleartext traffic (HTTP) for local network testing.
