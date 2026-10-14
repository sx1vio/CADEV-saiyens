import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';
import { fileURLToPath, URL } from 'node:url';
import { defineConfig, loadEnv } from 'vite';
import { API_READ_CACHE, API_READ_PATTERN } from './src/offline/api-cache.ts';

// Configuration du front DevHub Africa : PWA hors ligne d'abord (CDC §6.5, O1).
export default defineConfig(({ command, mode }) => {
  // ADR-0016 §4 : le serveur simulé est un outil de développement, jamais livré en production.
  if (
    command === 'build' &&
    mode === 'production' &&
    loadEnv(mode, process.cwd()).VITE_API_MODE === 'local'
  ) {
    throw new Error('VITE_API_MODE=local est interdit dans un build de production (ADR-0016).');
  }
  return {
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
          background_color: '#F7F8FA',
          theme_color: '#0E1730',
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
          // Les navigations vers ce que sert l'API (connexion OAuth et son retour, images Open Graph,
          // badges : infra/Caddyfile) vont au serveur, jamais vers le shell en cache (BUG-028).
          navigateFallbackDenylist: [/^\/api\//, /^\/og\//, /^\/badge\//, /^\/readyz$/],
          runtimeCaching: [
            {
              // Actualités et vidéos lisibles hors ligne ; jamais la connexion ni le profil (/api/v1/auth, /api/v1/me)
              urlPattern: ({ url }) =>
                url.pathname.startsWith('/api/v1/news') ||
                url.pathname.startsWith('/api/v1/videos'),
              handler: 'StaleWhileRevalidate',
              options: {
                cacheName: 'api-news',
                expiration: { maxEntries: 60, maxAgeSeconds: 60 * 60 * 24 * 3 },
              },
            },
            {
              // O1 : questions, salles, Passport… déjà ouverts restent lisibles sans réseau.
              // Réseau d'abord (contenu frais en ligne), cache au bout de 4 s ou hors ligne.
              urlPattern: API_READ_PATTERN,
              handler: 'NetworkFirst',
              method: 'GET',
              options: {
                cacheName: API_READ_CACHE,
                networkTimeoutSeconds: 4,
                expiration: { maxEntries: 300, maxAgeSeconds: 60 * 60 * 24 * 7 },
                cacheableResponse: { statuses: [200] },
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
      // Lu par scripts/check-budget.mjs (budget de l'accueil, 03-frontend.md).
      manifest: true,
    },
    // En développement, l'API (apps/api, NestJS) tourne sur le port 3000 et est servie sous /api.
    // DEVHUB_API_PROXY vise une autre API locale (sessions parallèles, tests e2e) ; vite preview
    // reprend ce proxy.
    server: {
      proxy: {
        '/api': {
          target: process.env.DEVHUB_API_PROXY ?? 'http://127.0.0.1:3000',
          changeOrigin: false,
        },
      },
    },
  };
});
