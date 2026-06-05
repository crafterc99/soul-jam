import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig({
  base: './',
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  server: {
    port: 8080,
  },
  preview: {
    port: parseInt(process.env.PORT || '4173'),
    host: true,
    allowedHosts: ['soul-jam-web-production.up.railway.app'],
  },
  build: {
    target: 'ES2020',
  },
});
