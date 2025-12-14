import type { CapacitorConfig } from '@capacitor/cli';

// Set CAPACITOR_DEV_MODE=true for development with live reload
// For production builds, leave it unset to use local dist/ files
const isDevelopment = process.env.CAPACITOR_DEV_MODE === 'true';

const config: CapacitorConfig = {
  appId: 'com.aqademiq.app',
  appName: 'Aqademiq',
  webDir: 'dist',
  
  // Plugin configurations for native features
  plugins: {
    SplashScreen: {
      launchShowDuration: 2500,
      launchAutoHide: true,
      launchFadeOutDuration: 400,
      backgroundColor: "#0A0A0A",
      showSpinner: false,
      androidSplashResourceName: "splash",
      iosSplashResourceName: "Splash",
      splashFullScreen: true,
      splashImmersive: true,
      androidScaleType: "CENTER_CROP"
    },
    StatusBar: {
      style: "dark",
      backgroundColor: "#0A0A0A"
    },
    Keyboard: {
      resize: "native",
      resizeOnFullScreen: true,
      style: "DARK"
    },
    PushNotifications: {
      presentationOptions: ["badge", "sound", "alert"]
    },
    LocalNotifications: {
      smallIcon: "ic_stat_notification",
      iconColor: "#8B5CF6",
      sound: "default"
    }
  },
  
  // Only use remote URL in development mode
  // Production builds will load from local dist/ folder (bundled in APK/IPA)
  ...(isDevelopment ? {
    server: {
      url: 'https://48f8950b-43ad-4931-ad31-927b47b786b3.lovableproject.com?forceHideBadge=true',
      cleartext: true
    }
  } : {
    // Production settings - no server URL, loads from local files
    server: {
      androidScheme: 'https'
    }
  })
};

export default config;
