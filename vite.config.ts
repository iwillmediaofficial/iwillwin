import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          gsap: ['gsap'],
          supabase: ['@supabase/supabase-js'],
          confetti: ['canvas-confetti'],
        },
      },
    },
  },
  server: {
    port: 3000,
    host: true,
  },
});
