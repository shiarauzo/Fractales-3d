import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  server: {
    open: true,
    port: 5173
  },
  build: {
    target: 'es2020',
    sourcemap: true
  }
});
