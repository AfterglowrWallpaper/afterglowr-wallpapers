import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [
    {
      name: 'spa-fallback',
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          // 不要攔截 /api 開頭的請求，交給底下的 proxy 處理
          if (req.url.startsWith('/api')) {
            return next();
          }
          if (req.url.includes('.')) {
            return next();
          }
          req.url = '/index.html';
          next();
        });
      }
    }
  ],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true
      }
    }
  }
});
