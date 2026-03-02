# Migration to Flutter: End-to-End R&D Analysis

## 1. Executive Summary
This document outlines the strategy for converting the **Aqademiq** web application (React + Supabase) into a native mobile application using **Flutter**. 
**Verdict:** High feasibility. The current backend (Supabase) is fully compatible with Flutter, meaning no backend rewrite is required. The primary effort will be rewriting the frontend UI and porting the TypeScript logic to Dart.

## 2. Tech Stack Recommendations

| Component | Web (Current) | Flutter (Proposed) | Package Recommendation |
| :--- | :--- | :--- | :--- |
| **Framework** | React | Flutter | `flutter_sdk` |
| **Backend** | Supabase JS | Supabase Flutter | `supabase_flutter` |
| **State Mgmt** | Hooks / Context | Riverpod | `flutter_riverpod` |
| **Routing** | React Router | GoRouter | `go_router` |
| **Charts** | Recharts | FL Chart | `fl_chart` |
| **PDF Gen** | html2canvas | Native PDF | `pdf` + `printing` |
| **Icons** | Lucide React | Lucide / Material | `lucide_icons` |
| **Audio** | HTML5 Audio | Audio Players | `audioplayers` |
| **Local Storage** | LocalStorage | Shared Preferences | `shared_preferences` |

---

## 3. Backend & Data (Seamless Reuse)
**Good News:** You do **NOT** need to change your database.
*   **Supabase Reuse**: The tables (`study_sessions`, `assignments`, etc.) and Row Level Security (RLS) policies work exactly the same for Flutter.
*   **Auth**: 
    *   **Google Sign-In**: Requires creating SHA-1 fingerprints in Supabase Authentication settings for Android/iOS.
    *   **Magic Links**: Requires Deep Linking configuration (Universal Links on iOS, App Links on Android).

## 4. Project Structure (Feature-First)
Recommended folder structure for scalability:

```text
lib/
├── main.dart              # Entry point
├── core/                  # Shared utilities
│   ├── constants/         # Colors, Strings
│   ├── theme/             # AppTheme (Dark/Light)
│   └── utils/             # Date formatters, Validators
├── features/              # Feature modules
│   ├── auth/              # Login, Sign Up
│   ├── dashboard/         # Home screen
│   ├── analytics/         # Charts & Graphs
│   ├── study_timer/       # Stopwatch logic
│   └── report/            # PDF Generation logic
└── services/              # Data layer
    ├── supabase_service.dart
    └── local_storage.dart
```

---

## 5. Logic Porting Strategy

### A. Metric Calculations
The logic currently in `METRIC_CALCULATIONS_REFERENCE.md` (Strain, Recovery, Focus) must be ported from TypeScript to Dart helper classes.
*   **Action**: Create a `MetricCalculator` class in Dart that takes raw session data and returns the `WeeklyReport` object.

### B. PDF Generation (The Hardest Part)
*   **Web**: We took a screenshot of the DOM.
*   **Flutter**: We must **draw** the PDF using code.
*   **Migration**:
    1.  Create a `PdfDocument` object.
    2.  Use `pdf` package widgets (`pw.Column`, `pw.Text`, `pw.Chart`) to layout the report essentially "by hand".
    3.  **Advantage**: The PDF will be selectable text and vector graphics (high quality), not just a big image.

### C. Background Timer
*   **Challenge**: The app might be killed by the OS if left in background.
*   **Solution**: "Passive Timing".
    1.  When you start a timer, save `start_time` to local storage/DB.
    2.  When the app opens again, calculate `now - start_time` to resume the timer visually.
    3.  This avoids battery-draining background services.

---

## 6. Store Deployment Checklist

### **Google Play Store (Android)**
1.  **Developer Account**: $25 one-time fee.
2.  **Signing Key**: Generate a keystore file (`keytool`) to sign the app bundle (`.aab`).
3.  **Assets**: High-res icon (512x512), Feature Graphic (1024x500), Screenshots.
4.  **Policy**: Privacy Policy URL (hosted on your website) is mandatory.

### **Apple App Store (iOS)**
1.  **Developer Account**: $99/year fee.
2.  **Hardware**: **Must have a Mac** to run Xcode for the final build/upload.
3.  **Signing**: Create Distribution Certificate and Provisioning Profile via Xcode.
4.  **Review**: Strict adherence to Human Interface Guidelines. (e.g., Use Apple Sign-In if you use Google Sign-In).

---

## 7. Recommended R&D Steps
1.  **Initialize**: `flutter create aqademiq_mobile`.
2.  **Connect**: Add `supabase_flutter` and authenticate a user.
3.  **Port Metrics**: Write the Dart functions to calculate Strain/Recovery from real DB data.
4.  **UI Prototype**: Build the "Dashboard" and "Analytics" screens using `fl_chart`.
## 8. End-to-End Problem & Solution Matrix

This section anticipates every major hurdle you will face during the migration and provides the industry-standard solution.

### **Phase 1: Frontend & UI Migration**

| Potential Problem | Why it happens | The Solution |
| :--- | :--- | :--- |
| **"It feels like a website"** | Using standard Material widgets without custom styling. | **Custom Design System**: Don't use default `AppBar` or `Card`. Build a `AqademiqCard` widget that mimics your web glasp-morphism using `BackdropFilter` and `LinearGradient`. |
| **Responsive Layouts** | Mobile screens vary wildly (iPhone SE vs Pro Max). | **`flutter_screenutil`**: Use this package to scale UI elements proportionally. Avoid hardcoded pixels (e.g., `height: 50`); use relative values or `Flex`. |
| **Touch vs Hover** | Mobile has no "hover" state for charts or buttons. | **On-Tap Tooltips**: deeply integrate `fl_chart` touch callbacks. For buttons, rely on `InkWell` ripple effects to give feedback instead of hover states. |
| **Font Rendering** | Web fonts might look different on mobile. | **Google Fonts Package**: Use `google_fonts` in Flutter to ensure the exact same typography (Inter/Roboto) loads correctly on all devices. |

### **Phase 2: Logic & Backend Conversion**

| Potential Problem | Why it happens | The Solution |
| :--- | :--- | :--- |
| **"Works on my machine"** | Timezones! Web uses browser time; App uses device time. | **UTC Everywhere**: Store all DB timestamps in UTC. In Dart, strictly use `.toLocal()` only when displaying text to the user. |
| **Offline Crashes** | Mobile users lose internet in subways/elevators. | **Cached Network Image & Persistence**: Use `cached_network_image` for assets. For data, use `hive` or `shared_preferences` to cache the last known report so the app doesn't show a white screen offline. |
| **Complex Calculations** | JS `Math` vs Dart `Math` might have tiny precision diffs. | **Unit Tests**: Write simple Dart tests for your `Strain` formula. Input the same numbers as the web and assert the output is identical. |
| **Deep Linking** | Clicking a login link in email opens the browser, not the app. | **App Links / Universal Links**: You must configure `apple-app-site-association` (iOS) and `assetlinks.json` (Android) on your Supabase hosting to tell the OS "This URL belongs to Aqademiq app". |

### **Phase 3: Native Features (The Tricky Stuff)**

| Potential Problem | Why it happens | The Solution |
| :--- | :--- | :--- |
| **PDF Generation** | HTML DOM snapshotting doesn't exist in Flutter. | **Programmatic PDF**: Use the `pdf` package. You have to write code like `pdf.addPage(pw.Column(children: [...]))`. It's tedious but produces vector-perfect, professional PDFs. |
| **Background Timer** | OS kills background apps to save battery. | **Passive Timing**: Don't run a timer in the background. Save `start_timestamp` to DB. When app reopens, `elapsed = now - start_timestamp`. It's bulletproof and battery-friendly. |
| **Push Notifications** | Web toasts don't work when app is closed. | **Firebase Cloud Messaging (FCM)**: You must set up a Firebase project, link it to Supabase, and get user permission on iOS. It's the only reliable way to send "Study Reminder" notifications. |

### **Phase 4: App Store Strategy**

| Potential Problem | Why it happens | The Solution |
| :--- | :--- | :--- |
| **Apple Rejection (4.2)** | App has "Minimum Functionality" (just a website wrapper). | **Native Feel**: Ensure you have at least one native-only feature, like **Haptic Feedback** (vibration on button press) or **Offline Mode**. This proves it's a "real" app. |
| **Apple Rejection (Sign In)** | You offer Google Sign-In but not Apple Sign-In. | **Must Include Apple Auth**: If you offer ANY social login on iOS, Apple mandates you also offer "Sign in with Apple". Supabase supports this out of the box. |
| **Android Permissions** | Asking for Notification/Storage permission too early. | **Just-in-Time Permission**: Don't ask for permissions on startup. Ask ONLY when the user clicks "Download Report" or "Set Reminder". |
| **Review Times** | Apple takes 24-48h. Google takes 1-3 days. | **TestFlight / Internal Testing**: Don't wait for live store approval to test. Use TestFlight (iOS) and Internal Track (Android) to send beta versions to your phone instantly. |

---

## 9. The "Everything Else" Checklist

This section covers the non-technical, logistical, and legal requirements for publishing a real app.

### **A. Costs (One-Time & Recurring)**

| Item | Cost | Frequency | Note |
| :--- | :--- | :--- | :--- |
| **Google Play Developer Account** | $25 | One-time | Grants ability to publish unlimited Android apps. |
| **Apple Developer Program** | $99 | Yearly | Required for iOS App Store. Must be renewed to keep app live. |
| **Database (Supabase)** | $0 - $25/mo | Monthly | Free tier is generous, but Pro is needed for backups/bigger usage. |
| **Domain Name** | ~$12/year | Yearly | Required for Deep Links and support email (e.g., support@aqademiq.com). |
| **Mac Hardware** | ~$1000+ | One-time | **Mandatory** for building the final iOS app. Cloud Mac services exist (~$25/mo) if you don't own one. |

---

### **B. Mandatory Legal & Privacy**

| Document | Why it's needed | Where to put it |
| :--- | :--- | :--- |
| **Privacy Policy** | Stores reject apps without a valid URL explaining data usage. | Host on your website (e.g., `aqademiq.com/privacy`). Must link in Store Listing and inside App Settings. |
| **Terms of Service** | Protects you from liability. | Host on website. Link in App Settings. |
| **Data Safety Form** | Google Play requirement. | You must manually declare: "I collect Name, Email, App Activity (Study Logs)". |
| **App Privacy Details** | Apple Store requirement. | You must declare data collection types (Contact Info, User Content, Identifiers). |
| **Account Deletion** | **Apple Mandate** (June 2022). | The app **MUST** have a button to "Delete Account" that fully wipes user data from Supabase. |

---

### **C. App Store Assets (Metadata)**

You cannot publish without these exact assets. Prepared them *before* you start coding.

#### **iOS App Store**
*   **Icon**: 1024x1024px (No transparency).
*   **Screenshots**: 
    *   6.5" Display (1284 x 2778px)
    *   5.5" Display (1242 x 2208px)
    *   12.9" iPad (2048 x 2732px) - Optional but recommended.
*   **Keywords**: 100 characters max (e.g., "study,tracker,focus,timer,student,planner").
*   **Support URL**: Link to a contact form or email.

#### **Google Play Store**
*   **Icon**: 512x512px (PNG).
*   **Feature Graphic**: 1024x500px (This is the banner at the top of the store listing).
*   **Screenshots**: Minimum 2, up to 8. Ratio 16:9 or 9:16.
*   **Short Description**: 80 chars (Hook the user).
*   **Full Description**: 4000 chars (SEO optimized).

---

## 10. Long-Term Maintenance (Life After Launch)

### **A. Updates & Versioning**
*   **Semantic Versioning**: Use `1.0.0` (Major.Minor.Patch).
*   **Force Update**: Build a mechanism (Remote Config) to force users to update if you make a breaking API change. Old app versions won't just "refresh" like a website.

### **B. Crash Reporting**
*   **Tool**: **Firebase Crashlytics**.
*   **Why**: If the app crashes on a specific Samsung phone, you will never know unless you have this. It sends you a stack trace of the error.

### **C. User Feedback**
*   **In-App Review API**: Ask for a rating *after* a user completes a study session (happy moment).
*   **Contact Support**: Add a button to email you directly. Bugs reported by users are better than 1-star reviews.

---

---

## 12. Beyond Code: Business & Operational Risks

You asked for **everything**. These are the problems that kill apps even if the code is perfect.

### **A. User Retention (The "Leaky Bucket")**
*   **Problem**: Users download the app, use it once for the novelty, and never return.
*   **Solution**: 
    1.  **Push Notifications**: 50% of retention comes from a timely "Time to study!" reminder.
    2.  **Streaks**: Add a "Day 5 Streak" fire icon. Psychology works.
    3.  **Onboarding**: If the first 30 seconds are confusing, they delete the app.

### **B. Marketing & Discovery**
*   **Problem**: You launch, but nobody downloads it because the App Store has 2 million apps.
*   **Solution**:
    1.  **ASO (App Store Optimization)**: Your screenshots must sell the *outcome* ("Get straight A's"), not the *features* ("Study timer").
    2.  **TikTok/Reels**: Shows users *using* the app. "How I raised my GPA using this app".

### **C. Support Overhead**
*   **Problem**: 100 users email you saying "I can't log in". You spend all day doing tech support instead of coding.
*   **Solution**:
    1.  **FAQ Page**: Host a simple Help Center.
    2.  **"Report Bug" Button**: Auto-attach logs so you don't have to ask "What device are you using?".

### **D. Legal Liability**
*   **Problem**: A user claims your app deleted their thesis paper data.
*   **Solution**: Your **Terms of Service** must have a "No Warranty" clause. "Software is provided as-is".

### **E. Platform Dependency**
*   **Problem**: Apple changes a rule (e.g., "All study apps must integrate with HealthKit") and removes your app until you fix it.
*   **Solution**: You are now a tenant on Apple's land. You must keep up with **WWDC updates** every June.

---

## 13. Final "Go / No-Go" Decision Matrix

| Criteria | Green Light ✅ | Red Flag 🚩 |
| :--- | :--- | :--- |
| **Budget** | Can afford ~$125 startup cost. | Zero budget. |
| **Hardware** | Have access to a Mac. | No Mac access (cannot publish to iOS). |
| **Time** | Willing to spend 2-3 months on rewrite. | Need app "next week". |
| **Skills** | Comfortable learning Dart/Flutter. | Rigidly stuck to React only. |

**Recommendation:**
If you have a Mac and the budget, **GO FOR IT**. The learning curve is steep but the result is a professional, store-ready product that adds immense value to your portfolio and user base.

