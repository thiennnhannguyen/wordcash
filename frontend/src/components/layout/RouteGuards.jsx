/*
 * Bảo vệ route theo phiên đăng nhập (authStore).
 *
 * - RequireAuth: chưa đăng nhập → /login (nhớ trang định vào trong `state.from` để quay lại sau khi đăng nhập).
 *   Đã đăng nhập nhưng chưa xong onboarding → /onboarding (trừ khi route cho phép, `allowOnboarding`).
 * - Cửa Ải Hôm Nay (store/dailyCheckStore.js): sau đăng nhập và onboarding, nếu Cửa Ải hôm nay còn `pending` thì MỌI trang
 *   trong app chuyển sang /daily-check trước (giữ trang định vào trong `state.from`). Nhận DAILY_CHECK_REQUIRED từ bất kỳ API
 *   nào (services/api.js) cũng chuyển như vậy.
 * - GuestOnly (/login, /register): đã đăng nhập → Sảnh (hoặc onboarding nếu chưa xong).
 * - Trong lúc khôi phục phiên (bootstrap gọi /auth/refresh) hiện màn chờ có linh vật, tránh nháy trang đăng nhập.
 */

import { useEffect } from 'react'
import { Navigate, Outlet, useLocation } from 'react-router-dom'
import MascotBlob from '../collection/MascotBlob'
import { FALLBACK_MASCOT } from '../../store/mascotStore'
import { useAuthStore } from '../../store/authStore'
import { useDailyCheckStore } from '../../store/dailyCheckStore'
import { Wordmark } from './NavBar'

export function BootSplash() {
  const mascot = FALLBACK_MASCOT // màn chờ trước khi đăng nhập: chưa gọi được API danh mục
  return (
    <div className="grid min-h-dvh place-items-center bg-bg px-4" role="status" aria-live="polite">
      <div className="flex flex-col items-center gap-5 text-center">
        <div className="anim-breathe">
          <MascotBlob color={mascot.color} shape={mascot.shape} traits={mascot.traits} size={112} blink />
        </div>
        <Wordmark className="text-3xl" />
        <p className="font-display text-sm font-bold uppercase tracking-wider text-muted">Đang mở lại phiên của bạn…</p>
      </div>
    </div>
  )
}

const isPending = (status) => status === 'idle' || status === 'loading'

export function RequireAuth({ allowOnboarding = false }) {
  const status = useAuthStore((s) => s.status)
  const user = useAuthStore((s) => s.user)
  const daily = useDailyCheckStore((s) => s.status)
  const location = useLocation()
  const ready = status === 'authenticated' && (allowOnboarding || user?.onboarding_completed)

  useEffect(() => {
    if (ready && !allowOnboarding) useDailyCheckStore.getState().load()
  }, [ready, allowOnboarding])

  if (isPending(status)) return <BootSplash />
  if (status !== 'authenticated') return <Navigate to="/login" replace state={{ from: { pathname: location.pathname, search: location.search } }} />
  if (!allowOnboarding && !user?.onboarding_completed) return <Navigate to="/onboarding" replace />
  if (!allowOnboarding && daily === 'unknown') return <BootSplash />
  if (!allowOnboarding && daily === 'pending' && location.pathname !== '/daily-check') {
    return <Navigate to="/daily-check" replace state={{ from: { pathname: location.pathname, search: location.search } }} />
  }
  return <Outlet />
}

export function GuestOnly() {
  const status = useAuthStore((s) => s.status)
  const user = useAuthStore((s) => s.user)
  if (isPending(status)) return <BootSplash />
  if (status === 'authenticated') return <Navigate to={user?.onboarding_completed ? '/lobby' : '/onboarding'} replace />
  return <Outlet />
}
