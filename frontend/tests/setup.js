/*
 * Thiết lập chung cho Vitest: matcher của jest-dom, dọn DOM và store sau mỗi test, các API trình duyệt jsdom chưa có
 * (matchMedia, IntersectionObserver, ResizeObserver, scrollTo).
 */

import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach, vi } from 'vitest'

afterEach(() => {
  cleanup()
  window.sessionStorage.clear()
})

window.matchMedia ??= (query) => ({ matches: false, media: query, onchange: null, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {}, dispatchEvent: () => false })
window.scrollTo = vi.fn()

class NoopObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords() {
    return []
  }
}
window.IntersectionObserver ??= NoopObserver
window.ResizeObserver ??= NoopObserver
