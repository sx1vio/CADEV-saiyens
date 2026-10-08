import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';
import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vite';

// Configuration du front DevHub Africa : PWA hors ligne d'abord (CDC §6.5, O1).
export default defineConfig({
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: false,
      includeAssets: ['favicon.svg'],
      manifest: {
        name: 'DevHub Africa',
        short_name: 'DevHub',
        description:
          "La plateforme des développeurs basée sur la preuve : aider, construire, prouver. Hors ligne d'abord.",
        lang: 'fr',
        start_url: '/',
        display: 'standalone',
        background_color: '#FFFFFF',
        theme_color: '#000000',
        icons: [
          { src: '/pwa-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/pwa-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/pwa-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // Shell précaché ; navigation SPA servie depuis le cache hors ligne.
        globPatterns: ['**/*.{js,css,html,svg,woff2}', 'pwa-*.png', 'assets/**/*.webp'],
        navigateFallback: '/index.html',
        runtimeCaching: [
          {
            // Actualités et vidéos lisibles hors ligne ; jamais la connexion ni le profil (/api/v1/auth, /api/v1/me)
            urlPattern: ({ url }) =>
              url.pathname.startsWith('/api/v1/news') || url.pathname.startsWith('/api/v1/videos'),
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'api-news',
              expiration: { maxEntries: 60, maxAgeSeconds: 60 * 60 * 24 * 3 },
            },
          },
          {
            urlPattern: ({ url }) =>
              url.pathname === '/api/v1/img' || url.hostname === 'i.ytimg.com',
            handler: 'CacheFirst',
            options: {
              cacheName: 'video-thumbs',
              expiration: { maxEntries: 150, maxAgeSeconds: 60 * 60 * 24 * 7 },
            },
          },
          {
            // Avatars et bannières : mis en cache à la première vue, jamais préchargés (économie de data)
            urlPattern: ({ url }) =>
              url.pathname.startsWith('/avatars/') || url.pathname.startsWith('/covers/'),
            handler: 'CacheFirst',
            options: {
              cacheName: 'media',
              expiration: { maxEntries: 120, maxAgeSeconds: 60 * 60 * 24 * 30 },
            },
          },
          {
            urlPattern: ({ url }) => url.hostname === 'avatars.githubusercontent.com',
            handler: 'CacheFirst',
            options: {
              cacheName: 'avatars',
              expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 * 30 },
            },
          },
        ],
      },
    }),
  ],
  build: {
    target: 'es2022',
  },
  // En développement, l'API (apps/api, NestJS) tourne sur le port 3000 et est servie sous /api
  server: {
    proxy: { '/api': { target: 'http://127.0.0.1:3000', changeOrigin: false } },
  },
});
