/*
 * Tạo kết nối Socket.IO.
 *
 * Một kết nối dùng chung, CHỈ mở khi vào Đấu Trường (hooks/useSocket.js), đóng khi rời đi.
 * Gửi access token qua `auth: { token }` (docs/auth.md, mục Socket.IO). Server từ chối khi token sai/hết hạn:
 * `connect_error` có `err.message` là TOKEN_EXPIRED hoặc TOKEN_INVALID. TOKEN_EXPIRED → làm mới phiên (services/api.js)
 * rồi kết nối lại ĐÚNG MỘT lần; vẫn lỗi thì dừng và báo trạng thái `error`.
 */

import { io } from 'socket.io-client'
import { refreshSession } from './api'
import { useAuthStore } from '../store/authStore'

let socket = null
let users = 0

export function connectSocket({ onStatus } = {}) {
  users += 1
  if (socket) return socket
  let retried = false
  const report = (status, detail) => onStatus?.(status, detail)

  socket = io({
    path: '/socket.io',
    transports: ['websocket'],
    autoConnect: false,
    // Hàm: mỗi lần (kết nối lại) đều lấy token mới nhất trong bộ nhớ
    auth: (cb) => cb({ token: useAuthStore.getState().accessToken }),
  })

  socket.on('connect', () => {
    retried = false
    report('connected')
  })
  socket.on('disconnect', (reason) => report('disconnected', reason))
  socket.on('connect_error', async (err) => {
    if (err.message === 'TOKEN_EXPIRED' && !retried) {
      retried = true
      try {
        const data = await refreshSession(useAuthStore.getState().accessToken)
        useAuthStore.getState().setSession(data)
        socket?.connect()
        return
      } catch {
        useAuthStore.getState().expire()
      }
    }
    report('error', err.message)
  })

  report('connecting')
  socket.connect()
  return socket
}

export function disconnectSocket() {
  users = Math.max(users - 1, 0)
  if (users === 0 && socket) {
    socket.removeAllListeners()
    socket.disconnect()
    socket = null
  }
}

export function getSocket() {
  return socket
}
