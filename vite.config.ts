import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { VitePWA } from 'vite-plugin-pwa';

// VirtuLearn build config: keep frontend PWA-ready while awaiting Node/Express APIs.
export default defineConfig(({ command, mode }) => {
  const isDevMode = mode === 'development';
  const enableDevPWA = process.env.VITE_ENABLE_PWA_DEV === 'true';
  const workboxConfig: {
    globDirectory?: string;
    globPatterns: string[];
    runtimeCaching: any[];
    navigateFallback: string;
    navigateFallbackDenylist: RegExp[];
    navigateFallbackAllowlist: RegExp[];
  } = {
    globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2,json}'],
    runtimeCaching: [
      // Cache JavaScript and CSS chunks for offline access
      {
        urlPattern: /\.(?:js|css)$/,
        handler: 'StaleWhileRevalidate' as const,
        options: {
          cacheName: 'static-resources',
          expiration: {
            maxEntries: 100,
            maxAgeSeconds: 7 * 24 * 60 * 60, // 7 days
          },
          cacheableResponse: {
            statuses: [0, 200]
          }
        }
      },
      // Cache Supabase API responses
      {
        urlPattern: /^https:\/\/thmyddcvpopzjbvmhbur\.supabase\.co\/.*$/,
        handler: 'NetworkFirst' as const,
        options: {
          cacheName: 'supabase-api-cache',
          networkTimeoutSeconds: 10,
          expiration: {
            maxEntries: 50,
            maxAgeSeconds: 5 * 60,
          },
          cacheableResponse: {
            statuses: [0, 200]
          }
        }
      },
      // Cache Google Fonts
      {
        urlPattern: /^https:\/\/fonts\.(googleapis|gstatic)\.com\/.*$/,
        handler: 'CacheFirst' as const,
        options: {
          cacheName: 'google-fonts-cache',
          expiration: {
            maxEntries: 20,
            maxAgeSeconds: 60 * 60 * 24 * 365,
          },
          cacheableResponse: {
            statuses: [0, 200]
          }
        }
      },
      // Cache images
      {
        urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp|ico)$/,
        handler: 'CacheFirst' as const,
        options: {
          cacheName: 'images-cache',
          expiration: {
            maxEntries: 60,
            maxAgeSeconds: 30 * 24 * 60 * 60,
          },
          cacheableResponse: {
            statuses: [0, 200]
          }
        }
      }
    ],
    navigateFallback: '/index.html',
    navigateFallbackDenylist: [/^\/api/, /^\/supabase/, /^\/auth\/v1/],
    navigateFallbackAllowlist: [/^.*/]
  };

  if (enableDevPWA) {
    // During dev there are no compiled assets in dev-dist, so use /public to silence Workbox warnings.
    workboxConfig.globDirectory = 'public';
    workboxConfig.globPatterns = ['**/*.{html,ico,png,svg}'];
  }

  return {
    server: {
      host: "::",
      port: 8080,
    },
    plugins: [
      react(),
      isDevMode && componentTagger(),
      VitePWA({
         disable: command === 'serve' && !enableDevPWA,
       registerType: 'autoUpdate',
       includeAssets: ['favicon.ico', 'assets/*.png', 'lovable-uploads/*.png', 'offline.html'],
       manifest: {
        name: 'Aqademiq - Intelligent Academic Organizer',
        short_name: 'Aqademiq',
        description: 'AI-powered academic study hub with Ada assistant for smart schedule management and grade tracking',
        theme_color: '#8B5CF6',
        background_color: '#0A0A0A',
        display: 'standalone',
        start_url: '/',
        scope: '/',
        orientation: 'portrait-primary',
        categories: ['education', 'productivity', 'lifestyle'],
        icons: [
          {
            src: '/assets/aqademiq-icon.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any maskable'
          },
          {
            src: '/assets/aqademiq-icon.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ],
        shortcuts: [
          {
            name: 'Dashboard',
            short_name: 'Home',
            description: 'Open your academic dashboard',
            url: '/',
            icons: [{ src: '/assets/aqademiq-icon.png', sizes: '192x192' }]
          },
          {
            name: 'Ada Assistant',
            short_name: 'Ada',
            description: 'Chat with Ada AI assistant',
            url: '/ada',
            icons: [{ src: '/assets/aqademiq-icon.png', sizes: '192x192' }]
          },
          {
            name: 'Study Timer',
            short_name: 'Timer',
            description: 'Start a study session',
            url: '/timer',
            icons: [{ src: '/assets/aqademiq-icon.png', sizes: '192x192' }]
          },
          {
            name: 'Calendar',
            short_name: 'Calendar',
            description: 'View your schedule',
            url: '/calendar',
            icons: [{ src: '/assets/aqademiq-icon.png', sizes: '192x192' }]
          }
        ]
      },
      workbox: workboxConfig,
      devOptions: {
        enabled: enableDevPWA,
        type: 'module'
      }
      })
    ].filter(Boolean),
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
  };
});
