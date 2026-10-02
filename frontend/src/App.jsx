/*
 * Khung ứng dụng: thanh điều hướng, chặn vào sảnh nếu chưa làm Cửa Ải Hôm Nay.
 *
 * Thanh điều hướng nằm trong layout của routes.jsx (landing không có).
 * TODO: chặn bằng Cửa Ải Hôm Nay khi có API daily check.
 */

import { MotionConfig } from 'framer-motion'
import { Toaster } from './components/ui/Toast'
import AppRoutes from './routes'

export default function App() {
  return (
    // Tôn trọng cài đặt giảm chuyển động của hệ điều hành cho mọi animation Framer Motion
    <MotionConfig reducedMotion="user">
      <AppRoutes />
      <Toaster />
    </MotionConfig>
  )
}
