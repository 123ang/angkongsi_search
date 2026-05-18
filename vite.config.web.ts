import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { viteSingleFile } from 'vite-plugin-singlefile';
import path from 'node:path';

export default defineConfig({
  root: 'src/renderer',
  base: './',
  plugins: [react(), viteSingleFile({ removeViteModuleLoader: true })],
  define: {
    __BROWSER_BUILD__: 'true'
  },
  build: {
    outDir: '../../dist/web',
    emptyOutDir: true,
    assetsInlineLimit: 100 * 1024 * 1024,
    cssCodeSplit: false,
    rollupOptions: {
      output: {
        inlineDynamicImports: true,
        manualChunks: undefined
      }
    }
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src/renderer/src')
    }
  }
});
