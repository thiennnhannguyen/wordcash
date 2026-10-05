/*
 * Danh mục 100 linh vật dùng chung mọi màn (Album, Quay thẻ, Sảnh, menu tài khoản, Onboarding…).
 * Chế độ thường tải từ GET /api/v1/mascots một lần mỗi phiên (ETag ở services/collectionApi.js); VITE_USE_MOCK dùng
 * data/mascots.js. `mascotById(id)` đọc ngoài React; `useMascotCatalog()` tự tải khi cần và trả {mascots, byId, ready}.
 */

import { useEffect } from 'react'
import { create } from 'zustand'
import { fetchCatalog } from '../services/collectionApi'

export const useMascotStore = create((set, get) => ({
  mascots: [],
  byId: {},
  status: 'idle', // idle | loading | ready | error
  load: async ({ force = false } = {}) => {
    if (!force && (get().status === 'loading' || get().status === 'ready')) return
    set({ status: 'loading' })
    try {
      const mascots = await fetchCatalog()
      set({ mascots, byId: Object.fromEntries(mascots.map((m) => [m.id, m])), status: 'ready' })
    } catch {
      set({ status: 'error' })
    }
  },
  reset: () => set({ mascots: [], byId: {}, status: 'idle' }),
}))

// Hình tạm khi danh mục chưa tải xong hoặc người dùng chưa có avatar (khối tím tròn, không mang tên linh vật nào)
export const FALLBACK_MASCOT = { id: 0, number: 0, name: null, rarity: 'common', region: 'A1', status: 'available', color: 'primary', shape: 'round', traits: { top: 'leaf' } }

export function mascotById(id) {
  return useMascotStore.getState().byId[id] ?? null
}

/** Linh vật của một id (đọc trong React, tự cập nhật khi danh mục tải xong); không có thì FALLBACK_MASCOT. */
export function useMascot(id) {
  const { byId } = useMascotCatalog()
  return byId[id] ?? FALLBACK_MASCOT
}

export function useMascotCatalog() {
  const { mascots, byId, status, load } = useMascotStore()
  useEffect(() => {
    if (status === 'idle' || status === 'error') load()
  }, [status, load])
  return { mascots, byId, ready: status === 'ready', error: status === 'error', retry: () => load({ force: true }) }
}
