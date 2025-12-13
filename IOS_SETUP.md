# iOS Setup Guide for Aqademiq

## Prerequisites

- macOS (required for iOS development)
- Xcode 15+ from Mac App Store
- Apple Developer Account ($99/year)
- CocoaPods (`sudo gem install cocoapods`)

## Initial Setup

### 1. Add iOS Platform

```bash
npx cap add ios
```

### 2. Install CocoaPods Dependencies

```bash
cd ios/App
pod install
cd ../..
```

### 3. Open in Xcode

```bash
npx cap open ios
```

## Required Info.plist Entries

Add these entries to `ios/App/App/Info.plist`:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <!-- Existing entries... -->

    <!-- Camera Usage -->
    <key>NSCameraUsageDescription</key>
    <string>Aqademiq uses the camera to scan documents and timetables for automatic schedule import.</string>

    <!-- Photo Library Usage -->
    <key>NSPhotoLibraryUsageDescription</key>
    <string>Aqademiq accesses your photos to import timetables, documents, and course materials.</string>

    <!-- Microphone Usage -->
    <key>NSMicrophoneUsageDescription</key>
    <string>Aqademiq uses the microphone for voice commands with Ada AI assistant.</string>

    <!-- Calendar Usage -->
    <key>NSCalendarsUsageDescription</key>
    <string>Aqademiq syncs with your calendar to manage your academic schedule.</string>

    <!-- Face ID Usage (if applicable) -->
    <key>NSFaceIDUsageDescription</key>
    <string>Aqademiq uses Face ID for secure authentication.</string>

    <!-- Push Notifications -->
    <key>UIBackgroundModes</key>
    <array>
        <string>fetch</string>
        <string>remote-notification</string>
    </array>

</dict>
</plist>
```

## Signing Configuration

### Development

1. Open Xcode
2. Select the "App" target
3. Go to "Signing & Capabilities"
4. Check "Automatically manage signing"
5. Select your Team

### Production

1. Create App ID in Apple Developer Portal
   - Identifier: `com.aqademiq.app`
   - Enable Push Notifications capability

2. Create provisioning profiles:
   - Development profile for testing
   - Distribution profile for App Store

3. In Xcode:
   - Uncheck "Automatically manage signing"
   - Import your distribution profile
   - Select it for Release configuration

## App Icons

Place app icons in `ios/App/App/Assets.xcassets/AppIcon.appiconset/`:

| Size | Filename | Purpose |
|------|----------|---------|
| 20x20 | Icon-20.png | Notification (iPad) |
| 29x29 | Icon-29.png | Settings |
| 40x40 | Icon-40.png | Spotlight (iPad) |
| 58x58 | Icon-29@2x.png | Settings @2x |
| 60x60 | Icon-20@3x.png | Notification @3x |
| 76x76 | Icon-76.png | iPad |
| 80x80 | Icon-40@2x.png | Spotlight @2x |
| 87x87 | Icon-29@3x.png | Settings @3x |
| 120x120 | Icon-40@3x.png | Spotlight @3x |
| 120x120 | Icon-60@2x.png | iPhone |
| 152x152 | Icon-76@2x.png | iPad @2x |
| 167x167 | Icon-83.5@2x.png | iPad Pro |
| 180x180 | Icon-60@3x.png | iPhone @3x |
| 1024x1024 | Icon-1024.png | App Store |

## Splash Screens

Configure splash screen in `ios/App/App/Assets.xcassets/Splash.imageset/`:

1. Create a 2732x2732 splash image
2. Add to imageset with @1x, @2x, @3x versions
3. Or use storyboard-based splash (recommended)

### Storyboard Splash (Recommended)

Edit `ios/App/App/Base.lproj/LaunchScreen.storyboard`:
- Add your logo image
- Set background color to match app theme (#0A0A0A)
- Use Auto Layout for proper scaling

## Push Notifications Setup

### 1. Enable Push Notifications Capability

In Xcode:
- Select target → Signing & Capabilities
- Click "+ Capability"
- Add "Push Notifications"
- Add "Background Modes" and enable "Remote notifications"

### 2. Create APNs Key

1. Go to Apple Developer → Keys
2. Create new key with "Apple Push Notifications service (APNs)"
3. Download the .p8 file (save securely!)
4. Note the Key ID

### 3. Configure in Supabase

Add APNs configuration to your Supabase project for push notifications.

## Build and Archive

### Development Build

```bash
# Build web assets
npm run build

# Sync to iOS
npx cap sync ios

# Open Xcode
npx cap open ios

# Run on device/simulator
# Select target device in Xcode and click Run (⌘R)
```

### Production Build

1. In Xcode: Product → Archive
2. Wait for archive to complete
3. Click "Distribute App"
4. Select "App Store Connect"
5. Follow the prompts to upload

## TestFlight

1. After uploading, go to App Store Connect
2. Select your app → TestFlight
3. Wait for processing (can take 15-30 mins)
4. Add testers or submit for external testing

## App Store Submission

### Required Information

- App Name: Aqademiq
- Subtitle: Smart Academic Planner
- Category: Education
- Age Rating: 4+ (complete questionnaire)
- Privacy Policy URL: https://aqademiq.app/privacy
- Support URL: https://aqademiq.app

### Required Screenshots

Capture on these device sizes:
- iPhone 6.5" (iPhone 14 Pro Max): 1284 x 2778
- iPhone 5.5" (iPhone 8 Plus): 1242 x 2208
- iPad Pro 12.9": 2048 x 2732

### App Review Notes

Include test account credentials if login is required:
```
Email: reviewer@aqademiq.app
Password: ReviewerTest123!
```

## Troubleshooting

### CocoaPods Issues

```bash
# Clean and reinstall pods
cd ios/App
pod deintegrate
pod install
```

### Signing Issues

- Ensure Apple Developer account is active
- Revoke and recreate certificates if expired
- Re-download provisioning profiles

### Build Errors

```bash
# Clean build folder
# In Xcode: Product → Clean Build Folder (⇧⌘K)

# Reset iOS project
npx cap sync ios
```

## Resources

- [Capacitor iOS Documentation](https://capacitorjs.com/docs/ios)
- [Apple Developer Documentation](https://developer.apple.com/documentation/)
- [App Store Review Guidelines](https://developer.apple.com/app-store/review/guidelines/)
