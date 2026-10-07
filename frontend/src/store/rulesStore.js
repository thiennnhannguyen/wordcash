/*
 * Luật game công khai và số liệu hệ thống từ GET /public/stats (một lần mỗi phiên; server cache 10 phút):
 * mốc rank, tỉ lệ quay, pity, mảnh khi trùng, giá đổi mảnh, số từ mỗi lượt quay, ngưỡng qua bài/Boss, Cửa Ải, số linh vật theo
 * độ hiếm, số mục từ theo cấp. Frontend KHÔNG giữ bản sao các con số này (utils/constants.js chỉ còn tên, màu, thứ tự).
 *
 * `useRules()` → {status: loading | ready | error, rules, stats, retry}. `rules` null khi chưa tải xong: nơi dùng hiện skeleton
 * hoặc ẩn con số, không bao giờ thay bằng số tự đặt.
 * Hàm tiện ích: `rankMin(rules, key)`, `percent(rate)`.
 */

import { useEffect } from 'react'
import { create } from 'zustand'
import { getPublicStats } from '../services/profileApi'

export const useRulesStore = create((set, get) => ({
  status: 'idle', // idle | loading | ready | error
  stats: null,
  load: async ({ force = false } = {}) => {
    if (!force && (get().status === 'loading' || get().status === 'ready')) return
    set({ status: 'loading' })
    try {
      set({ stats: await getPublicStats(), status: 'ready' })
    } catch {
      set({ status: 'error' })
    }
  },
}))

export function useRules() {
  const { status, stats, load } = useRulesStore()
  useEffect(() => {
    if (status === 'idle') load()
  }, [status, load])
  return { status: status === 'idle' ? 'loading' : status, stats, rules: stats?.rules ?? null, retry: () => load({ force: true }) }
}

/** Mốc số từ của một rank theo luật server (null khi chưa có luật). */
export function rankMin(rules, key) {
  return rules?.ranks.find((r) => r.key === key)?.min ?? null
}

/** 0.85 → 85; 0.025 → 2.5 (một chữ số thập phân). */
export function percent(rate) {
  return Math.round(rate * 1000) / 10
}
