import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

// 后端实际监听 :18080（交接文档里的 :8080 已过期，见 docs/设计方案.md §5.2）。
// 开发时由 dev server 代理 /v1，浏览器视作同源，不需要后端配 CORS。
const BACKEND = 'http://localhost:18080'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { '@': new URL('./src', import.meta.url).pathname },
  },
  server: {
    port: 5173,
    proxy: {
      '/v1': { target: BACKEND, changeOrigin: true },
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
  },
})
