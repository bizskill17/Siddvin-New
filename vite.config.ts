import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

const APPS_SCRIPT_EXEC_URL = 'https://script.google.com/macros/s/AKfycby0NHNUflCQ0YhpLMK9byMFKEuOQnxkKFs3HyKJB2HCxO1QT-ZKqz7U13lsgKsBhdG6Yg/exec';

const appsScriptDevProxy = () => ({
  name: 'apps-script-dev-proxy',
  configureServer(server: any) {
    server.middlewares.use('/gas', async (req: any, res: any) => {
      try {
        const parsed = new URL(req.url || '/', 'http://localhost');
        const targetUrl = `${APPS_SCRIPT_EXEC_URL}${parsed.search || ''}`;
        const method = String(req.method || 'GET').toUpperCase();

        let body = '';
        if (method !== 'GET' && method !== 'HEAD') {
          await new Promise<void>((resolve, reject) => {
            req.on('data', (chunk: Buffer) => { body += chunk.toString(); });
            req.on('end', () => resolve());
            req.on('error', reject);
          });
        }

        const upstream = await fetch(targetUrl, {
          method,
          headers: method === 'GET' || method === 'HEAD'
            ? undefined
            : { 'Content-Type': req.headers['content-type'] || 'text/plain;charset=utf-8' },
          body: method === 'GET' || method === 'HEAD' ? undefined : body,
          redirect: 'follow',
        });

        const text = await upstream.text();
        res.statusCode = upstream.status;
        res.setHeader('Content-Type', upstream.headers.get('content-type') || 'application/json; charset=utf-8');
        res.end(text);
      } catch (error: any) {
        res.statusCode = 500;
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.end(JSON.stringify({ ok: false, error: String(error?.message || error) }));
      }
    });
  },
});

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      server: {
        port: 3000,
        // Bind IPv6 any-address so both localhost (::1) and 127.0.0.1 work on Windows
        host: '::',
      },
      plugins: [react(), appsScriptDevProxy()],
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
