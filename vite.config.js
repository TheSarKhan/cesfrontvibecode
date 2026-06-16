import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // `.env` faylından dəyişənləri oxu (prefiks filtri olmadan)
  const env = loadEnv(mode, process.cwd(), '')

  const apiTarget = env.VITE_API_TARGET || 'http://localhost:8083'
  const port = Number(env.VITE_PORT) || 3000

  return {
    plugins: [react(), tailwindcss()],
    define: {
      global: 'globalThis',
    },
    server: {
      port,
      proxy: {
        '/api/ws': {
          target: apiTarget,
          changeOrigin: true,
          ws: true,
        },
        '/api': {
          target: apiTarget,
          changeOrigin: true,
        },
      },
    },
  }
})
