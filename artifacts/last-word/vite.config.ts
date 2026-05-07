import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';

export default defineConfig({
  // No base path needed — Capacitor loads files from the device, not a server
  base: './',

  plugins: [
    react(),
    tailwindcss(),
  ],

  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },

  build: {
    // Capacitor reads from "dist" by default (matches webDir in capacitor.config.ts)
    outDir: 'dist',
    emptyOutDir: true,
  },
});
