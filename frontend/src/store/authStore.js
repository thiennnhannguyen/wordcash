/*
 * Lưu trạng thái người dùng.
 *
 * `user` và `accessToken` CHỈ nằm trong bộ nhớ (Zustand), tuyệt đối không ghi localStorage/sessionStorage (docs/auth.md).
 * Refresh token nằm trong cookie httpOnly do server đặt; JavaScript không đọc được.
 *
 * `status`: idle (chưa kiểm tra) → loading (đang khôi phục phiên) → authenticated | anonymous.
 * - bootstrap(): gọi /auth/refresh khi tải trang để khôi phục phiên từ cookie (gọi nhiều lần vẫn chỉ chạy một lần).
 * - login, register, logout, logoutAll, refreshUser, completeOnboarding.
 * - expire(): phiên hết hạn/bị thu hồi → xóa phiên, route guard đưa về /login kèm thông báo.
 */

import { create } from 'zustand'
import { broadcastLogout, broadcastSession, refreshSession, request } from '../services/api'
import { useDailyCheckStore } from './dailyCheckStore'

let bootstrapping = null

export const useAuthStore = create((set, get) => ({
  status: 'idle',
  user: null,
  accessToken: null,
  expired: false, // phiên vừa bị hết hạn (hiện thông báo ở trang đăng nhập)

  setSession: ({ access_token: accessToken, user }) => set({ accessToken, user: user ?? get().user, status: 'authenticated', expired: false }),

  clear: () => set({ accessToken: null, user: null, status: 'anonymous' }),

  // Cập nhật user sau khi server trả bản mới (vd. PATCH /users/me đổi avatar, linh vật Đấu Trường)
  setUser: (user) => set({ user }),

  expire: () => {
    if (get().status === 'authenticated') set({ accessToken: null, user: null, status: 'anonymous', expired: true })
  },

  bootstrap: () => {
    if (get().status !== 'idle') return bootstrapping ?? Promise.resolve()
    set({ status: 'loading' })
    bootstrapping = refreshSession()
      .then((data) => get().setSession(data))
      .catch(() => set({ status: 'anonymous', accessToken: null, user: null }))
    return bootstrapping
  },

  login: async ({ identifier, password }) => {
    const data = await request({ method: 'post', url: '/auth/login', data: { identifier, password } })
    get().setSession(data)
    broadcastSession(data)
    return data.user
  },

  register: async (payload) => {
    const data = await request({ method: 'post', url: '/auth/register', data: payload })
    get().setSession(data)
    broadcastSession(data)
    return data.user
  },

  logout: async () => {
    try {
      await request({ method: 'post', url: '/auth/logout' })
    } finally {
      broadcastLogout()
      useDailyCheckStore.getState().reset()
      set({ accessToken: null, user: null, status: 'anonymous', expired: false })
    }
  },

  logoutAll: async () => {
    try {
      await request({ method: 'post', url: '/auth/logout-all' })
    } finally {
      broadcastLogout()
      useDailyCheckStore.getState().reset()
      set({ accessToken: null, user: null, status: 'anonymous', expired: false })
    }
  },

  refreshUser: async () => {
    const user = await request({ url: '/users/me' })
    set({ user })
    return user
  },

  /** PATCH /users/me/onboarding → trả `next_step` (roadmap_a1 | placement_test). */
  completeOnboarding: async (payload) => {
    const data = await request({ method: 'patch', url: '/users/me/onboarding', data: payload })
    set({ user: data.user })
    return data.next_step
  },
}))

// Chỉ khi chạy dev/e2e: cho kiểm thử đầu-cuối thao tác phiên (vd. ép access token hết hạn). Không có trong bản build production.
if (import.meta.env.DEV && typeof window !== 'undefined') window.__wcAuthStore = useAuthStore
