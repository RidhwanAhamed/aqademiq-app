import type { CapacitorConfig } from '@capacitor/cli';

// Set CAPACITOR_DEV_MODE=true for development with live reload
// For production builds, leave it unset to use local dist/ files
const isDevelopment = process.env.CAPACITOR_DEV_MODE === 'true';

const config: CapacitorConfig = {
  appId: 'app.lovable.48f8950b43ad4931ad31927b47b786b3',
  appName: 'aqademiq-app',
  webDir: 'dist',
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
