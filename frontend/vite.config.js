import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// Bản build production không được dùng dữ liệu giả: VITE_USE_MOCK=true thì dừng build ngay
function forbidMockInProduction(env) {
  return {
    name: 'wordclash-forbid-mock-in-production',
    apply: 'build',
    configResolved(config) {
      if (config.mode === 'production' && env.VITE_USE_MOCK === 'true') {
        throw new Error('VITE_USE_MOCK=true không được dùng cho bản build production. Bỏ biến này rồi build lại.')
      }
    },
  }
}

export default defineConfig(({ mode }) => {
  // Biến môi trường của shell được ưu tiên hơn file .env.* (để bật mock thủ công: VITE_USE_MOCK=true npm run dev)
  const env = { ...loadEnv(mode, process.cwd(), ''), ...process.env }
  // Backend mà proxy trỏ tới (e2e chạy backend riêng ở cổng khác)
  const apiTarget = env.API_PROXY_TARGET || 'http://localhost:8000'

  return {
    plugins: [react(), tailwindcss(), forbidMockInProduction(env)],
    server: {
      port: Number(env.VITE_PORT || 5173),
      strictPort: true,
      proxy: {
        // Cùng origin với frontend nên cookie refresh (httpOnly, SameSite=Lax) hoạt động
        '/api': { target: apiTarget, changeOrigin: false },
        '/socket.io': { target: apiTarget, ws: true },
      },
    },
  }
})
