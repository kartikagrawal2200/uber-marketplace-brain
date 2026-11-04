import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': process.env.BACKEND_URL || 'http://localhost:8000',
      '/ws': { target: (process.env.BACKEND_URL || 'http://localhost:8000').replace(/^http/, 'ws'), ws: true },
    },
  },
  resolve: {
    alias: {
      shared: path.resolve(__dirname, '../shared/src'),
    },
  },
})
