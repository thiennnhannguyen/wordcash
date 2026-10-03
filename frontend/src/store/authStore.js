/*
 * Lưu trạng thái người dùng.
 *
 * Access token chỉ giữ trong bộ nhớ (không localStorage/sessionStorage, xem docs/auth.md); refresh token nằm trong
 * cookie httpOnly do server đặt. TODO: đăng nhập/đăng ký gọi API thật, tự refresh khi hết hạn (navigator.locks).
 */

import { create } from 'zustand'

export const useAuthStore = create((set) => ({
  accessToken: null,
  user: null,
  setSession: ({ accessToken, user }) => set({ accessToken, user }),
  clear: () => set({ accessToken: null, user: null }),
}))
