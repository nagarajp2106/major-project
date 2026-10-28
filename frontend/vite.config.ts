import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
        secure: false,
        configure: (proxy) => {
          proxy.on('error', (err: any) => {
            if (err.code === 'ECONNREFUSED') {
              // Expected transient state during backend startup; suppress noisy terminal spam
              return;
            }
            console.error('[vite proxy error]', err.message);
          });
        },
      },
      '/ws': {
        target: 'ws://127.0.0.1:8000',
        ws: true,
        configure: (proxy) => {
          proxy.on('error', (err: any) => {
            if (err.code === 'ECONNREFUSED') return;
            console.error('[vite ws proxy error]', err.message);
          });
        },
      },
    },
  },
})
