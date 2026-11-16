import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      // En desarrollo, la API se sirve desde Express (Fase 1+)
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
  preview: {
    port: 5173,
  },
  // Rutas relativas: imprescindible para cargar desde file:// (Electron .exe)
  base: './',
  build: {
    outDir: 'dist',
  },
});
