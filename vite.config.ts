import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  server: {
    port: 3000,
    // Bind IPv6 any-address so both localhost (::1) and 127.0.0.1 work on Windows
    host: '::',
    // Forward API calls to the local PHP server started with `npm run api`.
    proxy: {
      '/api': 'http://localhost:8000',
    },
  },
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
});
