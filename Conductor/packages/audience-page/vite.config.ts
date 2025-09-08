import { defineConfig } from 'vite';

export default defineConfig({
  base: '/audience-page/', // Set base path for serving from subdirectory
  root: '.',
  publicDir: 'public',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: './index.html'
      }
    }
  },
  server: {
    port: 3001,
    host: true
  }
});

