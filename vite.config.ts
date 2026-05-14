import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
	    const env = loadEnv(mode, '.', '');
	    return {
	      server: {
	        port: 3000,
	        // Bind IPv6 any-address so both localhost (::1) and 127.0.0.1 work on Windows
	        host: '::',
	      },
	      plugins: [react()],
	      define: {
	        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
	        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
	      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});
