/*
 * Luật vòng quay của người dùng hiện tại từ GET /collection/rates (services/collectionApi.js `toRates`): tỉ lệ lượt thường /
 * đặc biệt, pity (mốc + bộ đếm của mình), số con có thể ra theo độ hiếm (vùng đã mở), giá đổi mảnh, mảnh khi trùng, số lượt tối
 * đa của "Mở tất cả". Frontend KHÔNG giữ bản sao các con số này: chưa tải xong thì nơi dùng hiện khối chờ hoặc ẩn con số.
 *
 * `useGachaRates()` → {status: loading | ready | error, rates, retry}. Tải một lần mỗi phiên; `refresh()` sau khi quay / đổi
 * mảnh để bộ đếm pity và số con khớp server.
 */

import { useEffect } from 'react'
import { create } from 'zustand'
import { fetchRates } from '../services/collectionApi'

export const useRatesStore = create((set, get) => ({
  status: 'idle', // idle | loading | ready | error
  rates: null,
  load: async ({ force = false } = {}) => {
    if (!force && (get().status === 'loading' || get().status === 'ready')) return
    if (!get().rates) set({ status: 'loading' })
    try {
      set({ rates: await fetchRates(), status: 'ready' })
    } catch {
      set({ status: get().rates ? 'ready' : 'error' })
    }
  },
  refresh: () => get().load({ force: true }),
  reset: () => set({ status: 'idle', rates: null }),
}))

export function useGachaRates() {
  const { status, rates, load } = useRatesStore()
  useEffect(() => {
    if (status === 'idle') load()
  }, [status, load])
  return { status: status === 'idle' ? 'loading' : status, rates, retry: () => load({ force: true }) }
}
