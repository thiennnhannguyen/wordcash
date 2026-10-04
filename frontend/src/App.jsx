/*
 * Khung ứng dụng: khôi phục phiên đăng nhập khi tải trang, thanh điều hướng, chặn vào sảnh nếu chưa làm Cửa Ải Hôm Nay.
 *
 * Thanh điều hướng nằm trong layout của routes.jsx (landing không có).
 * TODO: chặn bằng Cửa Ải Hôm Nay khi có API daily check.
 */

import { useEffect } from 'react'
import { MotionConfig } from 'framer-motion'
import { Toaster } from './components/ui/Toast'
import { useAuthStore } from './store/authStore'
import AppRoutes from './routes'

export default function App() {
  // Khôi phục phiên từ cookie refresh khi tải trang (POST /auth/refresh); route guard chờ xong mới quyết định
  useEffect(() => {
    useAuthStore.getState().bootstrap()
  }, [])

  return (
    // Tôn trọng cài đặt giảm chuyển động của hệ điều hành cho mọi animation Framer Motion
    <MotionConfig reducedMotion="user">
      <AppRoutes />
      <Toaster />
    </MotionConfig>
  )
}
