# Aqademiq Mobile App Build Instructions

This guide covers building and deploying Aqademiq for iOS App Store and Google Play Store.

## Prerequisites

### For iOS Development
- macOS (required)
- Xcode 15+ installed from Mac App Store
- Apple Developer Account ($99/year)
- iOS 14.0+ target device or simulator

### For Android Development
- Android Studio (latest version)
- Java Development Kit (JDK) 17+
- Google Play Developer Account ($25 one-time)
- Android 5.1+ (API 22) target device or emulator

## Initial Setup

### 1. Clone and Install Dependencies

```bash
# Clone the repository
git clone <your-repo-url>
cd aqademiq

# Install dependencies
npm install
```

### 2. Add Native Platforms

```bash
# Add iOS platform (macOS only)
npx cap add ios

# Add Android platform
npx cap add android
```

### 3. Generate App Icons and Splash Screens

Use the capacitor-assets tool to generate all required sizes:

```bash
# Install capacitor-assets globally
npm install -g @capacitor/assets

# Create assets directory structure
mkdir -p resources
# Place your 1024x1024 icon.png and 2732x2732 splash.png in resources/

# Generate all platform assets
npx capacitor-assets generate
```

Alternatively, use online tools:
- [App Icon Generator](https://appicon.co/)
- [Ape Tools](https://apetools.webprofusion.com/)

## Development Builds

### Development with Live Reload

For rapid development with hot reload from Lovable:

```bash
# Set environment variable and run
CAPACITOR_DEV_MODE=true npx cap run android
# or for iOS
CAPACITOR_DEV_MODE=true npx cap run ios
```

This connects to the Lovable preview server for instant updates.

### Local Development Build

```bash
# Build the web app
npm run build

# Sync to native platforms
npx cap sync

# Open in IDE
npx cap open android  # Opens Android Studio
npx cap open ios      # Opens Xcode
```

## Production Builds

### Step 1: Build Web Assets

```bash
# Build production web assets
npm run build

# Sync to native platforms
npx cap sync
```

### Step 2: iOS Production Build

1. Open Xcode:
   ```bash
   npx cap open ios
   ```

2. In Xcode:
   - Select your Team in Signing & Capabilities
   - Set Bundle Identifier to `com.aqademiq.app`
   - Select "Any iOS Device (arm64)" as build target
   - Product → Archive
   - Distribute App → App Store Connect

3. Required Info.plist entries (add in Xcode):
   ```xml
   <key>NSCameraUsageDescription</key>
   <string>Aqademiq uses the camera to scan documents and timetables</string>
   <key>NSPhotoLibraryUsageDescription</key>
   <string>Aqademiq accesses photos to import timetables and documents</string>
   <key>NSMicrophoneUsageDescription</key>
   <string>Aqademiq uses the microphone for voice commands with Ada AI</string>
   <key>NSCalendarsUsageDescription</key>
   <string>Aqademiq syncs with your calendar for schedule management</string>
   ```

### Step 3: Android Production Build

1. Open Android Studio:
   ```bash
   npx cap open android
   ```

2. Generate Signing Key (first time only):
   ```bash
   keytool -genkey -v -keystore aqademiq-release.keystore \
     -alias aqademiq -keyalg RSA -keysize 2048 -validity 10000
   ```
   **⚠️ IMPORTANT: Keep this keystore file safe! You need the same key for all future updates.**

3. Configure signing in `android/app/build.gradle`:
   ```gradle
   android {
       signingConfigs {
           release {
               storeFile file('aqademiq-release.keystore')
               storePassword 'your-store-password'
               keyAlias 'aqademiq'
               keyPassword 'your-key-password'
           }
       }
       buildTypes {
           release {
               signingConfig signingConfigs.release
               minifyEnabled true
               proguardFiles getDefaultProguardFile('proguard-android-optimize.txt'), 'proguard-rules.pro'
           }
       }
   }
   ```

4. Build Release APK/Bundle:
   - Build → Generate Signed Bundle / APK
   - Select Android App Bundle (recommended for Play Store)
   - Use your release keystore
   - Build

## App Store Submission

### Apple App Store

1. **App Store Connect Setup:**
   - Create new app at [App Store Connect](https://appstoreconnect.apple.com/)
   - Bundle ID: `com.aqademiq.app`
   - Primary Language: English

2. **Required Assets:**
   - App Icon (1024x1024)
   - Screenshots for each device size:
     - 6.5" (1284x2778) - iPhone 14 Pro Max
     - 5.5" (1242x2208) - iPhone 8 Plus
     - 12.9" iPad Pro (2048x2732)
   - App Preview videos (optional)

3. **App Information:**
   - Name: Aqademiq
   - Subtitle: Smart Academic Planner
   - Category: Education
   - Privacy Policy URL: https://aqademiq.app/privacy
   - Support URL: https://aqademiq.app

4. **Keywords:**
   ```
   study,planner,academic,schedule,timetable,assignment,exam,college,university,student,AI,calendar
   ```

### Google Play Store

1. **Play Console Setup:**
   - Create new app at [Play Console](https://play.google.com/console)
   - Package name: `com.aqademiq.app`

2. **Required Assets:**
   - App Icon (512x512)
   - Feature Graphic (1024x500)
   - Screenshots (min 2, max 8):
     - Phone: 16:9 or 9:16 ratio
     - Tablet: 16:9 or 9:16 ratio

3. **Store Listing:**
   - Title: Aqademiq - Smart Academic Planner
   - Short description (80 chars): Your AI-powered study companion for academic success
   - Full description (4000 chars): [See below]

4. **Content Rating:**
   - Complete the questionnaire in Play Console
   - Expected rating: Everyone (E)

5. **Data Safety:**
   - Complete the data safety form
   - Declare data collection practices matching Privacy Policy

## Sample App Descriptions

### Short Description (80 chars)
```
Your AI-powered study companion for academic success
```

### Full Description
```
Aqademiq is the ultimate academic planning app designed to help students achieve their full potential.

🎓 SMART COURSE MANAGEMENT
• Organize courses by semester
• Track grades and GPA
• Set target grades and monitor progress

📅 INTELLIGENT SCHEDULING
• Import timetables via photo scan
• Google Calendar integration
• AI-powered schedule optimization

✅ ASSIGNMENT & EXAM TRACKING
• Never miss a deadline
• Priority-based task management
• Smart reminders and notifications

🤖 ADA AI ASSISTANT
• Natural language scheduling
• Study recommendations
• Document Q&A with your notes

⏱️ POMODORO TIMER
• Focus sessions with breaks
• Study streaks and achievements
• Session analytics

📊 ANALYTICS & INSIGHTS
• Study time tracking
• Performance trends
• Personalized recommendations

FEATURES:
• Offline support - works without internet
• Dark mode
• Cross-platform sync
• Privacy-focused design

Download Aqademiq today and transform your academic journey!
```

## Troubleshooting

### Common Issues

1. **Build fails with signing error (iOS)**
   - Ensure you're signed in to Xcode with your Apple ID
   - Check team selection in Signing & Capabilities

2. **App crashes on launch (Android)**
   - Check Logcat in Android Studio for errors
   - Ensure all permissions are properly declared

3. **Live reload not working**
   - Verify CAPACITOR_DEV_MODE is set
   - Check that Lovable preview is accessible
   - Ensure device/emulator is on same network

4. **Icons not showing**
   - Re-run `npx capacitor-assets generate`
   - Run `npx cap sync` after generating

### Getting Help

- Documentation: https://capacitorjs.com/docs
- Lovable Blog: https://lovable.dev/blog/native-mobile-apps
- Support: support@aqademiq.app

## Version Management

Update version numbers before each release:

1. **package.json**: Update `version` field
2. **iOS**: Update in Xcode under General → Version/Build
3. **Android**: Update in `android/app/build.gradle`:
   ```gradle
   versionCode 2  // Increment for each release
   versionName "1.1.0"
   ```

Always use semantic versioning: MAJOR.MINOR.PATCH
