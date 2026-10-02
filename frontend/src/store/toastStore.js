/*
 * Hàng đợi thông báo (toast). Gọi `useToastStore.getState().push({...})` từ bất cứ đâu.
 */

import { create } from 'zustand'

const AUTO_DISMISS_MS = 3500
let nextId = 1

export const useToastStore = create((set, get) => ({
  toasts: [],

  push: ({ variant = 'info', title, message, duration = AUTO_DISMISS_MS }) => {
    const id = nextId++
    set((state) => ({ toasts: [...state.toasts, { id, variant, title, message }].slice(-4) }))
    if (duration > 0) setTimeout(() => get().dismiss(id), duration)
    return id
  },

  dismiss: (id) => set((state) => ({ toasts: state.toasts.filter((toast) => toast.id !== id) })),
}))
