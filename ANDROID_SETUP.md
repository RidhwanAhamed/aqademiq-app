# Android Setup Guide for Aqademiq

## Prerequisites

- Android Studio (latest stable version)
- Java Development Kit (JDK) 17+
- Android SDK (API 34 recommended)
- Google Play Developer Account ($25 one-time)

## Initial Setup

### 1. Add Android Platform

```bash
npx cap add android
```

### 2. Open in Android Studio

```bash
npx cap open android
```

### 3. Sync Gradle

Android Studio should prompt to sync - click "Sync Now"

## AndroidManifest.xml Configuration

Update `android/app/src/main/AndroidManifest.xml`:

```xml
<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android">

    <!-- Permissions -->
    <uses-permission android:name="android.permission.INTERNET" />
    <uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
    
    <!-- Camera for document scanning -->
    <uses-permission android:name="android.permission.CAMERA" />
    <uses-feature android:name="android.hardware.camera" android:required="false" />
    
    <!-- Storage for file access -->
    <uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" 
        android:maxSdkVersion="32" />
    <uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE" 
        android:maxSdkVersion="29" />
    <uses-permission android:name="android.permission.READ_MEDIA_IMAGES" />
    
    <!-- Microphone for voice commands -->
    <uses-permission android:name="android.permission.RECORD_AUDIO" />
    
    <!-- Calendar integration -->
    <uses-permission android:name="android.permission.READ_CALENDAR" />
    <uses-permission android:name="android.permission.WRITE_CALENDAR" />
    
    <!-- Notifications -->
    <uses-permission android:name="android.permission.POST_NOTIFICATIONS" />
    <uses-permission android:name="android.permission.RECEIVE_BOOT_COMPLETED" />
    <uses-permission android:name="android.permission.VIBRATE" />
    <uses-permission android:name="android.permission.SCHEDULE_EXACT_ALARM" />
    
    <!-- Foreground service for timer -->
    <uses-permission android:name="android.permission.FOREGROUND_SERVICE" />

    <application
        android:allowBackup="true"
        android:icon="@mipmap/ic_launcher"
        android:label="@string/app_name"
        android:roundIcon="@mipmap/ic_launcher_round"
        android:supportsRtl="true"
        android:theme="@style/AppTheme"
        android:usesCleartextTraffic="true">

        <activity
            android:name=".MainActivity"
            android:configChanges="orientation|keyboardHidden|keyboard|screenSize|locale|smallestScreenSize|screenLayout|uiMode"
            android:exported="true"
            android:launchMode="singleTask"
            android:theme="@style/AppTheme.NoActionBarLaunch">

            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>

            <!-- Deep linking -->
            <intent-filter android:autoVerify="true">
                <action android:name="android.intent.action.VIEW" />
                <category android:name="android.intent.category.DEFAULT" />
                <category android:name="android.intent.category.BROWSABLE" />
                <data android:scheme="https" android:host="aqademiq.app" />
            </intent-filter>

        </activity>

        <!-- Boot receiver for scheduled notifications -->
        <receiver android:name="com.capacitorjs.plugins.localnotifications.LocalNotificationReceiver"
            android:exported="false" />
        
    </application>

</manifest>
```

## build.gradle Configuration

### App-level build.gradle

Update `android/app/build.gradle`:

```gradle
android {
    namespace "com.aqademiq.app"
    compileSdk 34

    defaultConfig {
        applicationId "com.aqademiq.app"
        minSdk 22
        targetSdk 34
        versionCode 1
        versionName "1.0.0"
        testInstrumentationRunner "androidx.test.runner.AndroidJUnitRunner"
    }

    signingConfigs {
        release {
            // Option 1: Environment variables (CI/CD)
            if (System.getenv("KEYSTORE_PATH")) {
                storeFile file(System.getenv("KEYSTORE_PATH"))
                storePassword System.getenv("KEYSTORE_PASSWORD")
                keyAlias System.getenv("KEY_ALIAS")
                keyPassword System.getenv("KEY_PASSWORD")
            }
            // Option 2: Local keystore file
            // storeFile file('../aqademiq-release.keystore')
            // storePassword 'your-store-password'
            // keyAlias 'aqademiq'
            // keyPassword 'your-key-password'
        }
    }

    buildTypes {
        release {
            minifyEnabled true
            shrinkResources true
            proguardFiles getDefaultProguardFile('proguard-android-optimize.txt'), 'proguard-rules.pro'
            signingConfig signingConfigs.release
        }
        debug {
            debuggable true
        }
    }

    compileOptions {
        sourceCompatibility JavaVersion.VERSION_17
        targetCompatibility JavaVersion.VERSION_17
    }
}
```

## Generate Release Keystore

**⚠️ IMPORTANT: Keep this keystore safe! You need the same key for all future app updates.**

```bash
# Generate keystore
keytool -genkey -v \
  -keystore aqademiq-release.keystore \
  -alias aqademiq \
  -keyalg RSA \
  -keysize 2048 \
  -validity 10000

# You'll be prompted for:
# - Keystore password
# - Key password
# - Name, Organization, Location info

# Store the keystore file securely (NOT in git!)
# Back it up to a secure location
```

## App Icons

Place icons in `android/app/src/main/res/`:

| Folder | Size | Usage |
|--------|------|-------|
| mipmap-mdpi | 48x48 | Medium density |
| mipmap-hdpi | 72x72 | High density |
| mipmap-xhdpi | 96x96 | Extra high |
| mipmap-xxhdpi | 144x144 | Extra extra high |
| mipmap-xxxhdpi | 192x192 | Extra extra extra high |

Files needed in each folder:
- `ic_launcher.png` (square icon)
- `ic_launcher_round.png` (round icon)
- `ic_launcher_foreground.png` (adaptive icon foreground)

### Adaptive Icons

Create `android/app/src/main/res/mipmap-anydpi-v26/ic_launcher.xml`:

```xml
<?xml version="1.0" encoding="utf-8"?>
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
    <background android:drawable="@color/ic_launcher_background"/>
    <foreground android:drawable="@mipmap/ic_launcher_foreground"/>
</adaptive-icon>
```

Add background color in `android/app/src/main/res/values/colors.xml`:

```xml
<?xml version="1.0" encoding="utf-8"?>
<resources>
    <color name="ic_launcher_background">#0A0A0A</color>
</resources>
```

## Splash Screen

### Using Android 12+ Splash Screen API

Update `android/app/src/main/res/values/styles.xml`:

```xml
<?xml version="1.0" encoding="utf-8"?>
<resources>
    <style name="AppTheme" parent="Theme.AppCompat.DayNight.NoActionBar">
        <item name="colorPrimary">@color/colorPrimary</item>
        <item name="colorPrimaryDark">@color/colorPrimaryDark</item>
        <item name="colorAccent">@color/colorAccent</item>
        <item name="android:windowBackground">@color/splash_background</item>
    </style>

    <style name="AppTheme.NoActionBarLaunch" parent="Theme.SplashScreen">
        <item name="windowSplashScreenBackground">@color/splash_background</item>
        <item name="windowSplashScreenAnimatedIcon">@drawable/splash</item>
        <item name="postSplashScreenTheme">@style/AppTheme</item>
    </style>
</resources>
```

Add splash color in `colors.xml`:

```xml
<color name="splash_background">#0A0A0A</color>
```

## Build and Test

### Debug Build

```bash
# Build web assets
npm run build

# Sync to Android
npx cap sync android

# Run on connected device/emulator
npx cap run android
```

### Release Build

1. Open Android Studio:
   ```bash
   npx cap open android
   ```

2. Build → Generate Signed Bundle / APK

3. Select "Android App Bundle" (for Play Store)

4. Choose your keystore and enter passwords

5. Select "release" build variant

6. Click "Create"

Output location: `android/app/release/app-release.aab`

## Google Play Store Submission

### Required Assets

| Asset | Size | Format |
|-------|------|--------|
| App Icon | 512x512 | PNG |
| Feature Graphic | 1024x500 | PNG/JPEG |
| Phone Screenshots | Min 2 | 16:9 or 9:16 |
| Tablet Screenshots | Min 1 (if tablet support) | 16:9 or 9:16 |

### Store Listing

**Title** (30 chars max):
```
Aqademiq
```

**Short Description** (80 chars max):
```
Your AI-powered study companion for academic success
```

**Full Description** (4000 chars max):
[See BUILD_INSTRUCTIONS.md for full description]

### Content Rating

Complete the content rating questionnaire in Play Console:
- Violence: None
- Sexual Content: None
- Language: None
- Controlled Substance: None
- Expected Rating: Everyone (E)

### Data Safety

Complete the data safety form:

**Data collected:**
- Email address (Account management)
- Name (Account management, optional)
- Photos (App functionality - document scanning)
- Calendar events (App functionality - sync)

**Data sharing:**
- Third parties: Google (OAuth), OCR.Space (document processing)

**Security practices:**
- Data encrypted in transit: Yes
- Data can be deleted: Yes

### App Access

If app requires login, provide test credentials:
```
Email: playstore-reviewer@aqademiq.app
Password: PlayStoreReview123!
```

## Troubleshooting

### Gradle Sync Failed

```bash
# Clean and rebuild
cd android
./gradlew clean
./gradlew build
```

### Build Errors

```bash
# Reset Android project
rm -rf android
npx cap add android
npx cap sync android
```

### APK Too Large

Enable minification in release build:
```gradle
buildTypes {
    release {
        minifyEnabled true
        shrinkResources true
    }
}
```

### Crash on Launch

1. Check Logcat in Android Studio
2. Filter by package: `com.aqademiq.app`
3. Look for exceptions in red

## Resources

- [Capacitor Android Documentation](https://capacitorjs.com/docs/android)
- [Android Developer Documentation](https://developer.android.com/docs)
- [Play Console Help](https://support.google.com/googleplay/android-developer)
