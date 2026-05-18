import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig({
  root: 'src/renderer',
  base: './',
  plugins: [react()],
  define: {
    __BROWSER_BUILD__: 'false'
  },
  build: {
    outDir: '../../dist/renderer',
    emptyOutDir: true
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src/renderer/src')
    }
  }
});
