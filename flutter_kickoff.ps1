# Flutter Kickoff Script for Aqademiq
# ------------------------------------------------------------------------------------------------
# MISSION CONTROL: AQADEMIQ MIGRATION
# This script automates the setup of the Native Flutter App foundation.
# ------------------------------------------------------------------------------------------------

Clear-Host
Write-Host "
================================================================================
       🚀 AQADEMIQ FLUTTER MIGRATION: KICKOFF SEQUENCE
================================================================================
" -ForegroundColor Cyan

Write-Host "
STEP-BY-STEP PROCESS AGENDA:
1. [SYSTEM CHECK] Verify Flutter SDK installation.
2. [SCAFFOLDING]  Create the 'aqademiq_app' clean codebase.
3. [TOOLKIT]      Install Riverpod, Supabase, Animations, and UI libraries.
4. [ARCHITECTURE] internal folder structure (Clean Architecture).
5. [MIGRATION]    Auto-copy images and icons from the React web project.
6. [CONFIGURATION] Setup App Theme (Colors) and Supabase Config.
7. [BOOTSTRAP]     Rewrite main.dart to be Riverpod-ready.
" -ForegroundColor Gray

# ------------------------------------------------------------------------------------------------
# STEP 1: VERIFY FLUTTER INSTALLATION
# Meaning: Before we build the house, we need to check if we have the hammers and drills (Flutter SDK).
# ------------------------------------------------------------------------------------------------
Write-Host "STEP 1: Checking System Tools..." -NoNewline
if (-not (Get-Command "flutter" -ErrorAction SilentlyContinue)) {
    Write-Host " [FAILED]" -ForegroundColor Red
    Write-Host "❌ Error: Flutter SDK is not found in your PATH." -ForegroundColor Red
    Write-Host "Please install Flutter from https://flutter.dev/docs/get-started/install/windows" -ForegroundColor Yellow
    exit 1
}
Write-Host " [OK] Flutter SDK found." -ForegroundColor Green

# ------------------------------------------------------------------------------------------------
# STEP 2: CREATE THE PROJECT
# Meaning: This command builds the empty shell of the Android and iOS apps.
# ------------------------------------------------------------------------------------------------
$projectName = "aqademiq_app"
Write-Host "STEP 2: Initializing Project '$projectName'..." -ForegroundColor Cyan

if (Test-Path $projectName) {
    Write-Host "   ⚠️  Project folder exists. Skipping creation to preserve data." -ForegroundColor Yellow
} else {
    # --org sets the generic bundle ID. We use 'com.aqademiq' for the App Store.
    flutter create $projectName --org com.aqademiq --platforms android,ios
    if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
    Write-Host "   ✅ Project created successfully." -ForegroundColor Green
}

# Enter the project directory
Set-Location $projectName

# ------------------------------------------------------------------------------------------------
# STEP 3: INSTALL LIBRARIES (DEPENDENCIES)
# Meaning: We are downloading pre-written code packages so we don't have to reinvent the wheel.
# ------------------------------------------------------------------------------------------------
Write-Host "STEP 3: Installing Dependencies (This may take a minute)..." -ForegroundColor Cyan

# Core Architecture
Write-Host "   - Installing Riverpod & Router..." -ForegroundColor Gray
flutter pub add flutter_riverpod go_router get_it shared_preferences

# Backend
Write-Host "   - Installing Supabase Client..." -ForegroundColor Gray
flutter pub add supabase_flutter http dio

# UI & Animation
Write-Host "   - Installing UI Kit (Animations, Fonts, Charts)..." -ForegroundColor Gray
flutter pub add flutter_animate google_fonts flutter_svg fl_chart table_calendar lottie

# Utilities
Write-Host "   - Installing Utils (Markdown, URL Launcher)..." -ForegroundColor Gray
flutter pub add flutter_markdown url_launcher transparent_image intl uuid

# Native Features
Write-Host "   - Installing Native Plugs (Notifications, Haptics)..." -ForegroundColor Gray
flutter pub add flutter_local_notifications workmanager haptic_feedback

# Developer Tools
Write-Host "   - Installing Code Generators..." -ForegroundColor Gray
flutter pub add --dev build_runner freezed freezed_annotation json_serializable json_annotation flutter_lints

Write-Host "   ✅ All dependencies installed." -ForegroundColor Green

# ------------------------------------------------------------------------------------------------
# STEP 4: SETUP FOLDER STRUCTURE (CLEAN ARCHITECTURE)
# Meaning: Organizing code into specific folders for Auth, Dashboard, Chat, etc.
# ------------------------------------------------------------------------------------------------
Write-Host "STEP 4: Building Clean Architecture Folders..." -ForegroundColor Cyan

$directories = @(
    "assets/images",                           # Stores .png and .jpg files
    "assets/icons",                            # Stores .svg icons
    "lib/core/config",                         # Global settings (URL, Keys)
    "lib/core/theme",                          # App Colors and Fonts
    "lib/features/auth/data",                  # Code that talks to Supabase Auth
    "lib/features/auth/presentation/screens",  # The actual Login/Signup UI screens
    "lib/features/dashboard/presentation/screens", # The Home Screen
    "lib/features/ada_chat/presentation",     # The AI Chat Screen
    "lib/shared/widgets/buttons",              # Reusable "Premium" Buttons
    "lib/shared/widgets/cards"                 # Reusable "Glass" Cards
)

foreach ($dir in $directories) {
    if (-not (Test-Path $dir)) {
        New-Item -ItemType Directory -Force -Path $dir | Out-Null
    }
}
Write-Host "   ✅ Folder structure created." -ForegroundColor Green

# ------------------------------------------------------------------------------------------------
# STEP 5: MIGRATE ASSETS
# Meaning: Copying images from the React project to the Flutter project.
# ------------------------------------------------------------------------------------------------
Write-Host "STEP 5: Migrating Assets from Web Project..." -ForegroundColor Cyan
$reactPublicPath = "../public"

if (Test-Path $reactPublicPath) {
    Copy-Item -Path "$reactPublicPath/*.png" -Destination "assets/images" -ErrorAction SilentlyContinue
    Copy-Item -Path "$reactPublicPath/*.jpg" -Destination "assets/images" -ErrorAction SilentlyContinue
    Copy-Item -Path "$reactPublicPath/*.svg" -Destination "assets/icons" -ErrorAction SilentlyContinue
    Copy-Item -Path "$reactPublicPath/*.ico" -Destination "assets/icons" -ErrorAction SilentlyContinue
    Write-Host "   ✅ Assets migrated successfully." -ForegroundColor Green
} else {
    Write-Host "   ⚠️  Could not find public/ folder. Skipping." -ForegroundColor Yellow
}

# ------------------------------------------------------------------------------------------------
# STEP 6: CONFIGURE PUBSPEC.YAML
# Meaning: Registering the new asset folders so Flutter can read them.
# ------------------------------------------------------------------------------------------------
Write-Host "STEP 6: Configuring Project Settings..." -ForegroundColor Cyan
$pubspec = Get-Content "pubspec.yaml"
if (-not ($pubspec -match "  - assets/images/")) {
    $pubspec = $pubspec -replace "#   - images/a_dot_burr.jpg", "  - assets/images/`n  - assets/icons/"
    $pubspec = $pubspec -replace "#   - images/a_dot_ham.jpg", ""
    $pubspec | Set-Content "pubspec.yaml"
    Write-Host "   ✅ pubspec.yaml updated with asset paths." -ForegroundColor Green
}

# ------------------------------------------------------------------------------------------------
# STEP 7: CREATE BOOTSTRAP FILES
# Meaning: Creating the main entry point and configuration files.
# ------------------------------------------------------------------------------------------------
Write-Host "STEP 7: Writing Initial Code..." -ForegroundColor Cyan

# AppTheme.dart
$themeContent = @"
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

class AppTheme {
  static final lightTheme = ThemeData(
    useMaterial3: true,
    brightness: Brightness.light,
    colorScheme: ColorScheme.fromSeed(
      seedColor: const Color(0xFF6366F1), // Indigo Primary
      brightness: Brightness.light,
    ),
    textTheme: GoogleFonts.interTextTheme(),
  );

  static final darkTheme = ThemeData(
    useMaterial3: true,
    brightness: Brightness.dark,
    colorScheme: ColorScheme.fromSeed(
      seedColor: const Color(0xFF6366F1), // Indigo Primary
      brightness: Brightness.dark,
    ),
    textTheme: GoogleFonts.interTextTheme(ThemeData.dark().textTheme),
  );
}
"@
Set-Content -Path "lib/core/theme/app_theme.dart" -Value $themeContent

# SupabaseConfig.dart
$supabaseContent = @"
class SupabaseConfig {
  // TODO: PASTE YOUR SUPABASE KEYS HERE
  static const String url = 'YOUR_SUPABASE_URL';
  static const String anonKey = 'YOUR_SUPABASE_ANON_KEY';
}
"@
Set-Content -Path "lib/core/config/supabase_config.dart" -Value $supabaseContent

# Main.dart (The App Entry Point)
# We overwrite the default "Counter App" with a proper Riverpod + Supabase setup.
$mainContent = @"
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'core/config/supabase_config.dart';
import 'core/theme/app_theme.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  
  // Initialize Supabase
  // await Supabase.initialize(
  //   url: SupabaseConfig.url,
  //   anonKey: SupabaseConfig.anonKey,
  // );

  runApp(const ProviderScope(child: AqademiqApp()));
}

class AqademiqApp extends ConsumerWidget {
  const AqademiqApp({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return MaterialApp(
      title: 'Aqademiq',
      theme: AppTheme.lightTheme,
      darkTheme: AppTheme.darkTheme,
      themeMode: ThemeMode.system, // Auto-detect system mode
      home: const Scaffold(
        body: Center(
          child: Text('Aqademiq Flutter Ready 🚀'),
        ),
      ),
    );
  }
}
"@
Set-Content -Path "lib/main.dart" -Value $mainContent
Write-Host "   ✅ main.dart bootstrapped with Riverpod & Theme." -ForegroundColor Green

# ------------------------------------------------------------------------------------------------
# COMPLETED
# ------------------------------------------------------------------------------------------------
Write-Host "
================================================================================
       ✨ KICKOFF SEQUENCE COMPLETE
================================================================================

YOUR IMMEDIATE ACTION ITEMS:

1. [CD] Go to the folder:
   cd $projectName

2. [CONNECT] Add your Credentials:
   Open 'lib/core/config/supabase_config.dart' and paste your Supabase URL & Key.

3. [RUN] Start the App:
   flutter run

Welcome to the future of Aqademiq mobile! 🚀
" -ForegroundColor Green
