import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const apiTarget =
  process.env.VITE_API_PROXY_TARGET || 'https://fraud-backend.salmonforest-f64ff0e9.uaenorth.azurecontainerapps.io'

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 5173,
    proxy: {
      '/api': {
        target: apiTarget,
        changeOrigin: true,
        secure: false,
      },
      '/health': {
        target: apiTarget,
        changeOrigin: true,
        secure: false,
      },
    },
  },
})