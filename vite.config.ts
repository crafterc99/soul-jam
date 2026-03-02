import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig({
  base: '/soul-jam/',
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  server: {
    port: 8080,
  },
  build: {
    target: 'ES2020',
  },
});
