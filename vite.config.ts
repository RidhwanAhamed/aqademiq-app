import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { VitePWA } from 'vite-plugin-pwa';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(),
    mode === 'development' && componentTagger(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'assets/*.png', 'lovable-uploads/*.png'],
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
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/thmyddcvpopzjbvmhbur\.supabase\.co\/.*$/,
            handler: 'NetworkFirst',
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
          {
            urlPattern: /^https:\/\/fonts\.(googleapis|gstatic)\.com\/.*$/,
            handler: 'CacheFirst',
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
          {
            urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp)$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'images-cache',
              expiration: {
                maxEntries: 60,
                maxAgeSeconds: 30 * 24 * 60 * 60,
              }
            }
          }
        ],
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/api/, /^\/auth/]
      },
      devOptions: {
        enabled: true,
        type: 'module'
      }
    })
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
