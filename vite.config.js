import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'robots.txt', 'pwa-192.svg', 'pwa-512.svg'],
      manifest: {
        name: 'Daily Mind Manager',
        short_name: 'MindManager',
        start_url: '.',
        scope: '/',
        display: 'standalone',
        background_color: '#ffffff',
        theme_color: '#4f46e5',
        icons: [
          { src: '/pwa-192.svg', sizes: '192x192', type: 'image/svg+xml' },
          { src: '/pwa-512.svg', sizes: '512x512', type: 'image/svg+xml' }
        ]
      },
      workbox: {
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/(firestore|www.googleapis)\.com\//,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-cache',
              expiration: { maxEntries: 50, maxAgeSeconds: 24 * 60 * 60 }
            }
          },
          {
            urlPattern: /\/src\/.*\.(js|css)$/,
            handler: 'StaleWhileRevalidate',
            options: { cacheName: 'asset-cache' }
          }
        ]
      }
    })
  ],
  server: {
    port: 5173
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('firebase')) return 'vendor_firebase';
            if (id.includes('lucide-react')) return 'vendor_lucide';
            if (id.includes('react')) return 'vendor_react';
            return 'vendor_misc';
          }
        }
      }
    },
    chunkSizeWarningLimit: 700
  }
});

