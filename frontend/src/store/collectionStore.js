/*
 * Tóm tắt Bộ Sưu Tập cho thanh điều hướng: số lượt quay chưa dùng và số thẻ MỚI chưa xem (chấm đỏ ở mục Bộ Sưu Tập).
 * Cập nhật mỗi khi một màn tải lại bộ sưu tập (`setFrom`) hoặc khi PageShell mở (`refresh`). Số liệu do server trả.
 */

import { create } from 'zustand'
import { fetchCollection } from '../services/collectionApi'

const REFRESH_EVERY_MS = 30_000 // menu gắn lại mỗi lần chuyển trang: không gọi lại quá dày

export const useCollectionStore = create((set, get) => ({
  spins: 0,
  newCount: 0,
  fetchedAt: 0,
  setFrom: (collection) => set({ spins: collection.spins.normal + collection.spins.special, newCount: collection.newCount ?? 0, fetchedAt: Date.now() }),
  refresh: async ({ force = false } = {}) => {
    if (!force && Date.now() - get().fetchedAt < REFRESH_EVERY_MS) return
    set({ fetchedAt: Date.now() })
    try {
      const c = await fetchCollection()
      set({ spins: c.spins.normal + c.spins.special, newCount: c.newCount ?? 0 })
    } catch {
      // Không chặn điều hướng khi lỗi; giữ số cũ
    }
  },
  reset: () => set({ spins: 0, newCount: 0, fetchedAt: 0 }),
}))
