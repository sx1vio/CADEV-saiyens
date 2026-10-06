import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'

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
        description: "La plateforme des développeurs basée sur la preuve : aider, construire, prouver. Hors ligne d'abord.",
        lang: 'fr',
        start_url: '/',
        display: 'standalone',
        background_color: '#0B0D1C',
        theme_color: '#0B0D1C',
        icons: [
          { src: '/pwa-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/pwa-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/pwa-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // Shell précaché ; navigation SPA servie depuis le cache hors ligne.
        globPatterns: ['**/*.{js,css,html,svg,webp,woff2,png}'],
        navigateFallback: '/index.html',
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.pathname.startsWith('/api/'),
            handler: 'StaleWhileRevalidate',
            options: { cacheName: 'api', expiration: { maxEntries: 100 } },
          },
          {
            urlPattern: ({ url }) => url.hostname === 'avatars.githubusercontent.com',
            handler: 'CacheFirst',
            options: { cacheName: 'avatars', expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 * 30 } },
          },
        ],
      },
    }),
  ],
  build: {
    target: 'es2022',
  },
})
