/*
 * Cấu hình gọi API REST (axios, gắn token).
 *
 * Base `/api/v1` (Vite proxy sang backend cổng 8000). Access token lấy từ authStore (bộ nhớ). Lỗi của server luôn có dạng
 * {error: {code, message, details}}; `toApiError` đổi mọi lỗi (kể cả mất mạng) về {code, message, details, status}.
 */

import axios from 'axios'
import { useAuthStore } from '../store/authStore'

const api = axios.create({ baseURL: '/api/v1', withCredentials: true, timeout: 15000 })

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

export function toApiError(error) {
  const body = error?.response?.data?.error
  if (body) return { code: body.code, message: body.message, details: body.details ?? null, status: error.response.status }
  return { code: 'NETWORK_ERROR', message: 'Không kết nối được máy chủ, bạn thử lại sau nhé.', details: null, status: 0 }
}

// Gọi API và ném lỗi đã chuẩn hóa
export async function request(config) {
  try {
    const res = await api.request(config)
    return res.data
  } catch (error) {
    throw toApiError(error)
  }
}

export default api
