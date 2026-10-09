import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig(({ mode }) => {
  // Biến môi trường của shell được ưu tiên hơn file .env.*
  const env = { ...loadEnv(mode, process.cwd(), ''), ...process.env }
  // Backend mà proxy trỏ tới (e2e chạy backend riêng ở cổng khác)
  const apiTarget = env.API_PROXY_TARGET || 'http://localhost:8000'

  return {
    plugins: [react(), tailwindcss()],
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
