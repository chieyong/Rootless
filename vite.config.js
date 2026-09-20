import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/*.png'],
      manifest: {
        name: 'Rootless - jazz harmony trainer',
        short_name: 'Rootless',
        description: 'Learn jazz changes and hear jazz voicings, away from the piano.',
        lang: 'en',
        theme_color: '#12141a',
        background_color: '#12141a',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        scope: '/',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,png,svg,woff2}'],
        // Tone.js is a large lazy chunk; let it into the precache.
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
        runtimeCaching: [
          {
            // The piano samples. Cached after the first load, so later
            // sessions play offline.
            urlPattern: /^https:\/\/tonejs\.github\.io\/audio\/salamander\/.*\.mp3$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'piano-samples',
              expiration: { maxEntries: 32, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
      devOptions: { enabled: false },
    }),
  ],
  test: {
    environment: 'node',
    include: ['src/**/*.test.js'],
  },
});
