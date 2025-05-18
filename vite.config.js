import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:5001',
        changeOrigin: true,
        secure: false,
      },
    },
  },
  // Deployment additions (new)
  base: '/', // For sub-path deployments
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    sourcemap: false // Disable in production
  },
  preview: {
    port: 3000,
    strictPort: true
  }
});