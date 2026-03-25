import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  define: {
    global: 'globalThis',
  },
  server: {
    port: 3000,
    proxy: {
      '/api/ws': {
        target: 'http://localhost:8083',
        changeOrigin: true,
        ws: true,
      },
      '/api': {
        target: 'http://localhost:8083',
        changeOrigin: true,
      },
    },
  },
})
