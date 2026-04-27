import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  base '/dijlovas/',
  
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: [
        'favicon-32.png',
        'apple-touch-icon.png',
      ],
      manifest: {
        name: 'Díjlovagló program tervező',
        short_name: 'Díjlovas',
        description: 'Díjlovas pályarajzoló és program tervező offline működéssel',
        theme_color: '#1f3a2c',
        background_color: '#faf6ec',
        display: 'standalone',
        orientation: 'portrait',
        scope: '/dijlovas/',
        start_url: '/dijlovas/',
        lang: 'hu',
        categories: ['sports', 'productivity', 'lifestyle'],
        icons: [
          {
            src: 'icon-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: 'icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: 'icon-192-maskable.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'maskable',
          },
          {
            src: 'icon-512-maskable.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        // Offline cache stratégia: minden statikus asset cache-első
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        // Google Fonts cache (Fraunces + IBM Plex Sans)
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-stylesheets',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365, // 1 év
              },
            },
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-webfonts',
              expiration: {
                maxEntries: 30,
                maxAgeSeconds: 60 * 60 * 24 * 365,
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
        ],
      },
      devOptions: {
        enabled: true, // dev módban is aktiválja a service worker-t
        type: 'module',
      },
    }),
  ],
  server: {
    host: true, // mobilról is elérhető a fejlesztői szerveren
    port: 5173,
  },
});
