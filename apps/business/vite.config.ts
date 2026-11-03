import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// Portail entreprise : sa propre origine (port 5399 en local, business.<domaine> en production).
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5399,
    strictPort: true,
    proxy: {
      '/api': {
        target: process.env.DEVHUB_API_PROXY ?? 'http://127.0.0.1:3000',
        changeOrigin: false,
      },
    },
  },
  preview: { port: 5399, strictPort: true },
  build: { target: 'es2022', sourcemap: false },
});
