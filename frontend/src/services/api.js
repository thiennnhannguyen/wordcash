/*
 * Cấu hình gọi API REST (axios, gắn token).
 *
 * - Base `/api/v1` qua proxy của Vite (cùng origin nên cookie refresh httpOnly hoạt động), `withCredentials: true`.
 * - Request: gắn `Authorization: Bearer <accessToken>` lấy từ authStore (token chỉ nằm trong bộ nhớ).
 * - Response 401 TOKEN_EXPIRED: làm mới phiên ĐÚNG MỘT LẦN (mọi request lỗi cùng lúc chờ chung một Promise), rồi gửi lại.
 *   Giữa các tab: `navigator.locks` bảo đảm mỗi lúc chỉ một tab gọi /auth/refresh; tab vừa làm mới phát token mới qua
 *   BroadcastChannel để tab khác dùng luôn (không gọi refresh lần hai). Trình duyệt không có navigator.locks thì vẫn an toàn
 *   nhờ khoảng ân hạn REFRESH_REUSE_GRACE_SECONDS ở server (docs/auth.md).
 * - Làm mới thất bại, hoặc 401 SESSION_REVOKED / TOKEN_INVALID khi đang đăng nhập: xóa phiên; route guard chuyển về /login.
 * - 409 DAILY_CHECK_REQUIRED (chưa vượt Cửa Ải hôm nay) ở bất kỳ đâu: đánh dấu store Cửa Ải `pending`; route guard chuyển sang /daily-check.
 * Lỗi luôn được chuẩn hóa thành {code, message, details, status} (`toApiError`).
 */

import axios from 'axios'
import { useAuthStore } from '../store/authStore'
import { useDailyCheckStore } from '../store/dailyCheckStore'

const BASE_URL = '/api/v1'
const LOCK_NAME = 'wc-auth-refresh'
const FRESH_MS = 10_000 // token tab khác vừa nhận trong khoảng này thì dùng lại

const api = axios.create({ baseURL: BASE_URL, withCredentials: true, timeout: 15000 })
// Instance riêng cho /auth/refresh: không đi qua interceptor (tránh vòng lặp refresh)
const raw = axios.create({ baseURL: BASE_URL, withCredentials: true, timeout: 15000 })

export function toApiError(error) {
  if (error?.code && error?.message && 'status' in error && !error.isAxiosError) return error // đã chuẩn hóa
  const body = error?.response?.data?.error
  if (body) return { code: body.code, message: body.message, details: body.details ?? null, status: error.response.status }
  return { code: 'NETWORK_ERROR', message: 'Không kết nối được máy chủ, bạn thử lại sau nhé.', details: null, status: 0 }
}

/* ---------- Đồng bộ giữa các tab ---------- */

const channel = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('wc-auth') : null
let lastBroadcast = null // {access_token, user, at}

channel?.addEventListener('message', ({ data }) => {
  if (data?.type === 'refreshed') {
    lastBroadcast = { ...data, at: Date.now() }
    // Tab này đang đăng nhập thì nhận luôn token mới
    if (useAuthStore.getState().status === 'authenticated') useAuthStore.getState().setSession(data)
  } else if (data?.type === 'logout') {
    useAuthStore.getState().clear()
  }
})

export function broadcastLogout() {
  channel?.postMessage({ type: 'logout' })
}

export function broadcastSession(data) {
  channel?.postMessage({ type: 'refreshed', access_token: data.access_token, user: data.user })
}

/* ---------- Làm mới phiên ---------- */

let refreshing = null

async function callRefresh(failedToken) {
  // Trong lúc chờ khóa, tab khác có thể đã làm mới xong: dùng token đó thay vì gọi refresh lần nữa
  if (lastBroadcast && Date.now() - lastBroadcast.at < FRESH_MS && lastBroadcast.access_token !== failedToken) {
    return { access_token: lastBroadcast.access_token, user: lastBroadcast.user }
  }
  const { data } = await raw.post('/auth/refresh')
  broadcastSession(data)
  return data
}

/**
 * Làm mới phiên bằng cookie. Mọi lời gọi cùng lúc trong một tab dùng chung một Promise; giữa các tab dùng navigator.locks.
 * `failedToken`: access token vừa bị từ chối (để nhận ra token mới do tab khác gửi sang).
 */
export function refreshSession(failedToken = null) {
  refreshing ??= (async () => {
    try {
      if (typeof navigator !== 'undefined' && navigator.locks?.request) {
        return await navigator.locks.request(LOCK_NAME, () => callRefresh(failedToken))
      }
      return await callRefresh(failedToken)
    } catch (error) {
      throw toApiError(error)
    }
  })().finally(() => {
    refreshing = null
  })
  return refreshing
}

/* ---------- Interceptor ---------- */

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken
  if (token && !config.headers.Authorization) config.headers.Authorization = `Bearer ${token}`
  return config
})

api.interceptors.response.use(undefined, async (error) => {
  const { config, response } = error
  const code = response?.data?.error?.code
  const sentToken = config?.headers?.Authorization?.replace('Bearer ', '') ?? null

  if (response?.status === 401 && code === 'TOKEN_EXPIRED' && config && !config._retried) {
    config._retried = true
    const store = useAuthStore.getState()
    try {
      // Tab khác đã gửi token mới sang trong lúc request này đang bay: gửi lại luôn
      if (!(store.accessToken && store.accessToken !== sentToken)) {
        store.setSession(await refreshSession(sentToken))
      }
    } catch (refreshError) {
      useAuthStore.getState().expire()
      throw refreshError
    }
    config.headers.Authorization = `Bearer ${useAuthStore.getState().accessToken}`
    return api(config)
  }

  if (code === 'DAILY_CHECK_REQUIRED') useDailyCheckStore.getState().markPending()

  if (response?.status === 401 && sentToken && ['SESSION_REVOKED', 'TOKEN_INVALID', 'TOKEN_EXPIRED'].includes(code)) {
    useAuthStore.getState().expire()
  }
  throw error
})

/** Gọi API và ném lỗi đã chuẩn hóa {code, message, details, status}. */
export async function request(config) {
  try {
    const res = await api.request(config)
    return res.data
  } catch (error) {
    throw toApiError(error)
  }
}

export default api
