/*
 * Trạng thái Cửa Ải Hôm Nay của phiên đang mở (server quyết định ngày theo múi giờ người dùng).
 *
 * `status`: unknown (chưa hỏi server) → pending (phải làm trước khi vào app) | done (đã làm / được miễn).
 * - `load()`: hỏi GET /daily-check/today một lần (gọi nhiều lần vẫn chỉ chạy một request). Lỗi mạng thì coi như done để
 *   không khóa người dùng ngoài app; server vẫn chặn route học bằng DAILY_CHECK_REQUIRED.
 * - `markPending()`: services/api.js gọi khi bất kỳ API nào trả DAILY_CHECK_REQUIRED (vd. qua nửa đêm khi đang mở app).
 * - Chế độ mock (VITE_USE_MOCK=true) không chặn.
 */

import { create } from 'zustand'

const USE_MOCK = import.meta.env.VITE_USE_MOCK === 'true'

let loading = null

export const useDailyCheckStore = create((set, get) => ({
  status: USE_MOCK ? 'done' : 'unknown',

  load: () => {
    if (get().status !== 'unknown') return Promise.resolve()
    // Import khi cần: services/api.js cũng import store này (tránh vòng import lúc nạp module)
    loading ??= import('../services/academyApi')
      .then(({ getDailyCheckToday }) => getDailyCheckToday())
      .then((today) => set({ status: today.status === 'pending' ? 'pending' : 'done' }))
      .catch(() => set({ status: 'done' }))
      .finally(() => {
        loading = null
      })
    return loading
  },
  markPending: () => set({ status: 'pending' }),
  markDone: () => set({ status: 'done' }),
  reset: () => set({ status: USE_MOCK ? 'done' : 'unknown' }),
}))
