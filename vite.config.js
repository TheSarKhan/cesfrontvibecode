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
        target: 'http://207.180.241.251',
        changeOrigin: true,
        ws: true,
      },
      '/api': {
        target: 'http://207.180.241.251',
        changeOrigin: true,
      },
    },
  },
})
