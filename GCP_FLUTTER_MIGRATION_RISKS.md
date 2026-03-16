# Master Migration Guide: Supabase to GCP & Web to Flutter

This document provides a brutally honest, stage-by-stage analysis of the risks, necessary changes, and preventative solutions for your complete platform overhaul.

> **⚠️ CRITICAL WARNING**: Moving from Supabase to GCP (Google Cloud Platform) while simultaneously rewriting for Flutter is a massive undertaking. You are effectively changing your **entire** stack (Database, Auth, Backend, AND Frontend).

---

## 🛑 STAGE 1: Backend Migration (Supabase → GCP)

**Objective**: Replacing the all-in-one Supabase wrapper with raw Google Cloud services.

### **1. Database (Loss of RLS)**
*   **The Issue (Risk)**: GCP Cloud SQL is just raw Postgres. It does NOT have Supabase's built-in Row Level Security (RLS) over HTTP layer.
*   **Necessary Change**: You must write a **Middleware API** (using Cloud Functions or Cloud Run) to handle every DB request. You cannot query the DB directly from Flutter anymore.
*   **The Prevention / Solution**: **Use Hasura or Write an API Layer**. Don't try to connect Flutter directly to Cloud SQL; it's insecure. Build a Go/Node.js server on Cloud Run to enforce security.

### **2. Authentication (Migration Hell)**
*   **The Issue (Risk)**: Moving password hashes from Supabase (GoTrue) to Firebase Auth/GCP Identity is difficult because encryption keys differ.
*   **Necessary Change**: Force all users to **reset passwords** or build a custom "hash migration" script.
*   **The Prevention / Solution**: **Firebase Auth Import**. Use the Firebase CLI to import users. If hashes don't match, implement a "lazy migration" (check Supabase on login, then move to Firebase).

### **3. Realtime Features**
*   **The Issue (Risk)**: Cloud SQL Postgres does not support real-time websocket subscriptions out of the box like Supabase.
*   **Necessary Change**: Switch to **Firestore** (NoSQL) for real-time parts OR implement a custom WebSocket server.
*   **The Prevention / Solution**: **Hybrid Architecture**. Use Firestore for "live" features (chat, notifications) and Cloud SQL for structured data (grades, sessions).

### **4. Data Storage**
*   **The Issue (Risk)**: Supabase Storage has RLS. Google Cloud Storage (GCS) uses IAM/Signed URLs.
*   **Necessary Change**: Rewrite all file upload logic to generate **Signed URLs** from a backend function.
*   **The Prevention / Solution**: **Cloud Functions Triggers**. Use functions to handle image resizing and permission checks before generating a download URL.

---

## 🏃 STAGE 2: Frontend Migration (React Web → Flutter App)

**Objective**: Converting the browser-based UI to a native mobile experience.

### **1. Charts & Interactions**
*   **The Issue (Risk)**: Your Recharts rely on "hover" to show data. Phones don't hover.
*   **Necessary Change**: Redesign interaction to **"Tap & Hold"**. Use `fl_chart` with specific touch callbacks.
*   **The Prevention / Solution**: **Prototyping**. Build one chart first to test interaction. Don't port all charts blindly; they might feel terrible on a small screen.

### **2. Responsiveness (Text Overflow)**
*   **The Issue (Risk)**: "Introduction to Advanced Physics" fits on a monitor but breaks the layout on an iPhone SE.
*   **Necessary Change**: Use `TextOverflow.ellipsis` and `Flexible` widgets everywhere.
*   **The Prevention / Solution**: **Pixel Overflow Warning**. Flutter shows a "Yellow/Black Tape" error if pixels overflow. Run the app on a small simulator continuously to catch this early.

### **3. Navigation & Back Button**
*   **The Issue (Risk)**: Android has a hardware back button; iOS doesn't. React Router doesn't handle this native behavior.
*   **Necessary Change**: Implement `WillPopScope` (Android) or `GoRouter` configuration to handle the "Back" gesture correctly.
*   **The Prevention / Solution**: **GoRouter**. Use a robust routing package that handles deep linking and the Android back button automatically.

### **4. State Management Complexity**
*   **The Issue (Risk)**: React Context is simple. Flutter's `InheritedWidget` is verbose and complex.
*   **Necessary Change**: Adopt **Riverpod** or **Bloc**. It separates UI from Logic much strictly than React.
*   **The Prevention / Solution**: **Strict Separation**. Don't put business logic (like calculating strain) inside your UI widgets. Put it into separate `Providers` or `Cubits`.

---

## 🚀 STAGE 3: App Submission & Deployment

**Objective**: Getting past the Apple/Google gatekeepers.

### **1. Apple Review (Guideline 4.2)**
*   **The Issue (Risk)**: "Not a Real App". If it just looks like your website wrapper, Apple will reject it.
*   **Necessary Change**: Add **Native Features**: Haptics, Offline Support, Push Notifications.
*   **The Prevention / Solution**: **Offline-First Design**. Ensure the app opens and shows data (even if old) without internet. A spinner on a white screen = Rejection.

### **2. Google Auth Redirects**
*   **The Issue (Risk)**: On the web, you just whitelist a domain. On mobile, you need SHA-1 fingerprints.
*   **Necessary Change**: Generate `SHA-1` and `SHA-256` keys from your release keystore and add them to Firebase/GCP Console.
*   **The Prevention / Solution**: **Release vs Debug Keys**. You have different keys for "Development" and "Production". Add BOTH to the console or login will fail only for real users.

### **3. Privacy Policy & Data Safety**
*   **The Issue (Risk)**: Stores are strict about "Data Safety" forms and require specific disclosures.
*   **Necessary Change**: Update policy to explicitly mention "Mobile Device IDs" and "Crash Data".
*   **The Prevention / Solution**: **Generator Tools**. Use a privacy policy generator that specifically asks about "Mobile App" permissions (Camera, Location, Storage).

### **4. Screenshots & Assets**
*   **The Issue (Risk)**: Each store needs 4-5 specific sizes. If one is off by 1 pixel, upload fails.
*   **Necessary Change**: Design in Figma using **templates** for 6.5", 5.5", and iPad sizes.
*   **The Prevention / Solution**: **Fastlane**. Automate screenshots if possible, or careful manual export. Don't just resize one image; layout might need adjusting.

---

## 🌪️ STAGE 4: The "Everything That Can Go Wrong" Matrix

This section covers the edge cases that usually only appear after you launch.

### **A. Data Integrity & Sync Nightmares**

#### **1. User Edits on Two Devices**
*   **The Scenario**: User starts a timer on iPad, then edits the same session on Android. Supabase (Web) handles this via PG Listeners. GCP Functions do not.
*   **The Solution**: **Optimistic Locking**. Add a `version` column to every table. Client sends `version=5`. If DB has `version=6`, reject the update and ask user to refresh.

#### **2. Migration Data Loss**
*   **The Scenario**: Moving from `int8` (Supabase) to `int64` (GCP Spanner/SQL) might cause overflow or ID collision if not mapped perfectly.
*   **The Solution**: **Dual-Write Phase**. For 1 week, write to BOTH Supabase and GCP. Verify data parity before switching the read path.

#### **3. Orphaned Files**
*   **The Scenario**: User uploads an avatar but cancels the signup. The file sits in GCS forever, costing money.
*   **The Solution**: **Lifecycle Policies**. Configure GCS buckets to auto-delete temporary files after 24 hours if not linked to a user profile.

### **B. Authentication Edge Cases**

#### **1. Social Login Mismatch**
*   **The Scenario**: User signed up with Google on Web. Signs in with Apple on iOS. These create TWO different `user_id`s in Firebase/GCP.
*   **The Solution**: **Account Linking**. Detect email match. Prompt user: "You already have an account with Google. Link Apple ID?" (Requires complex UI logic).

#### **2. Token Expiry**
*   **The Scenario**: Web tokens act differently (cookies vs headers). Mobile tokens expire and need silent refresh.
*   **The Solution**: **Interceptor Logic**. Build a Dio/Http interceptor in Flutter that catches `401 Unauthorized`, calls the refresh endpoint, and retries the original request seamlessly.

#### **3. Deleted Accounts**
*   **The Scenario**: iOS user deletes account via Apple Settings (Standard), but your DB still has their data.
*   **The Solution**: **Server-to-Server Notifications**. Listen to Apple's "Consent Revoked" webhook to auto-trigger your comprehensive data wipe function.

### **C. Performance Bottlenecks**

#### **1. Cold Starts**
*   **The Scenario**: Cloud Functions (GCP) take 2-3s to wake up. User sees a spinner every time they open the app.
*   **The Solution**: **Min Instances**. Pay for `min_instances=1` so one server is always warm. Or rewrite critical paths in Go/Rust for millisecond startups.

#### **2. N+1 Query Problem**
*   **The Scenario**: Flutter lists often trigger 1 API call per item (e.g., getting course color for 50 assignments = 50 calls).
*   **The Solution**: **Batch APIs**. Create a specialized endpoint `getDataForDashboard` that returns Assignments + Courses + Colors in ONE JSON response.

#### **3. Image Loading**
*   **The Scenario**: 4K images uploaded on web will crash a low-end Android phone's memory.
*   **The Solution**: **Cloud Resizing**. Use an Extension (or Cloud Function) to auto-resize all uploads to `800x800` thumbnails for mobile display.

### **D. Operational & Financial Risks**

#### **1. DDoS / Bill Shock**
*   **The Scenario**: A bug in your Flutter loop calls the API 1000 times/sec. GCP logs $5,000 bill overnight.
*   **The Solution**: **Quotas & Budgets**. Set a strict specialized API Gateway quota (e.g., 100 req/min/user). Set GCP Billing Alerts at $50.

#### **2. Vendor Lock-in**
*   **The Scenario**: You use Firebase proprietary features (Firestore, Functions) heavily. Moving away later becomes impossible.
*   **The Solution**: **Repository Pattern**. Architect your Flutter app so the "Data Source" is an interface. `AuthService` interface can be swapped from `FirebaseAuth` to `SupabaseAuth` without rewriting UI.

#### **3. Store Ban**
*   **The Scenario**: Google Play bans your developer account due to a misunderstood policy violation (common with young accounts).
*   **The Solution**: **Backup Account**. Have a contingency plan (e.g., "Company B") to publish if "Company A" gets flagged. Never violate policies intentionally.

---

## 🛡️ "Prevent Mistakes at Early Stage" Checklist

1.  **Don't Move DB Yet**: Keep Supabase for the Flutter app first. Only move to GCP *after* the app is live and stable. Changing both simultaneously is a recipe for disaster.
2.  **Mock the Data**: In Flutter, build the UI with "Fake Data" first. Don't connect the backend until the UI layout is 100% solid. This isolates UI bugs from API bugs.
3.  **Test on Real Device**: The simulator is fast. A real $100 Android phone is slow. Test on the cheap phone to feel the real performance.
4.  **Setup Crashlytics Day 1**: You need to know when the app crashes. Without it, you are flying blind.

---

## � STAGE 5: The Universal Risks (Human, Legal, & Vendor)

You asked for **every end**. This section covers the problems that aren't code, but can still kill your project.

### **A. The Human Factor (Team & Developer Risks)**

#### **1. The "Bus Factor"**
*   **The Scenario**: You (or your lead dev) write all the migration scripts. Then you get sick/busy/bored. No one else understands the 5,000 lines of migration code.
*   **The Prevention**: **Documentation & Scripts**. Don't run migration commands manually in terminal. Write them as reusable scripts (`npm run migrate:v1`) and document exactly how they work.

#### **2. Migration Fatigue (Burnout)**
*   **The Scenario**: You try to do Frontend (Flutter) and Backend (GCP) at the same time. Progress feels slow. You get demotivated and abandon the project halfway.
*   **The Prevention**: **Milestones with Wins**. Ship the Flutter app on Supabase FIRST. Get users using it. Celebrate the win. Then tackle GCP. Breaking it up saves your sanity.

### **B. Legal & Compliance Risks**

#### **1. GDPR / CCPA Violations**
*   **The Scenario**: A user in Europe asks to "Forget Me". You delete them from Firebase Auth but forget their rows in Cloud SQL. You are now liable for a fine.
*   **The Prevention**: **Central Deletion Logic**. Create one Cloud Function `deleteUserData(userId)` that triggers deletions across Auth, SQL, Firestore, and Storage simultaneously.

#### **2. Intellectual Property (IP) Theft**
*   **The Scenario**: You accidentally push your `service-account.json` or API Keys to a public GitHub repo. Bots scrape it in seconds and mine crypto on your bill.
*   **The Prevention**: **git-secrets**. Use pre-commit hooks that block commits containing keys. Use Google Secret Manager, never hardcode secrets in code.

### **C. Vendor & Platform Risks**

#### **1. Google/Apple Banhammer**
*   **The Scenario**: Your AI features generate something "inappropriate". Apple bans your developer account for violating "User Generated Content" policies.
*   **The Prevention**: **Content Moderation**. You MUST have a "Report Content" button and a backend blocklist if users can see each other's data (even study names).

#### **2. Deprecation of Libraries**
*   **The Scenario**: You pick a niche Flutter package for charts. The maintainer abandons it. 2 years later, it breaks on iOS 18.
*   **The Prevention**: **mainstream Packages Only**. Only use packages with 1,000+ likes on pub.dev (e.g., `fl_chart`, `provider`, `dio`). Avoid "cool new beta" libraries for core features.

---

## ✅ THE ULTIMATE SAFE PATH

If you follow nothing else, follow this **Phase 1 Strategy**:

1.  **Do NOT touch the Backend yet.** Keep Supabase.
2.  **Focus 100% on Flutter.** Rebuild the UI pixel-perfect.
3.  **Launch the App.** Get it on the store.
4.  **Wait 3 Months.** dynamic stability.
5.  **THEN Migrate to GCP.**

**Trying to jump off a cliff (Backend) and learn to fly (Frontend) at the same time is how projects die.**
