import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// Application d'administration : sa propre origine (port 5299 en local, sous-domaine en production).
// Rien ne la relie à l'application publique ; l'API ne lui répond que sur cette origine (ADMIN_URL).
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5299,
    strictPort: true,
    proxy: {
      '/api': {
        target: process.env.DEVHUB_API_PROXY ?? 'http://127.0.0.1:3000',
        changeOrigin: false,
      },
    },
  },
  preview: { port: 5299, strictPort: true },
  build: { target: 'es2022', sourcemap: false },
});
