/*
 * Tiện ích cho test component: dựng trang trong MemoryRouter với người dùng đã đăng nhập (authStore), làm mới các store
 * dùng chung, kiểm tra "không có con số nào" trong phần hiển thị (bỏ qua phần trang trí aria-hidden).
 */

import { render } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { useAuthStore } from '../src/store/authStore'
import { useMascotStore } from '../src/store/mascotStore'
import { useRulesStore } from '../src/store/rulesStore'
import { useRatesStore } from '../src/store/ratesStore'
import user from './fixtures/user.json'

export function renderPage(element, { path = '/', route = path } = {}) {
  useAuthStore.setState({ user, accessToken: 'test-token', status: 'authenticated' })
  useMascotStore.getState().reset()
  useRulesStore.setState({ status: 'idle', stats: null })
  useRatesStore.getState().reset()
  return render(
    <MemoryRouter initialEntries={[route]}>
      <Routes>
        <Route path={path} element={element} />
      </Routes>
    </MemoryRouter>,
  )
}

/** Chữ hiển thị thật (bỏ phần trang trí aria-hidden như sticker "Combo x3", hình minh họa). */
export function visibleText(container) {
  const clone = container.cloneNode(true)
  clone.querySelectorAll('[aria-hidden="true"]').forEach((el) => el.remove())
  return clone.textContent
}

/** Promise không bao giờ xong: giữ trạng thái "đang tải". */
export const pending = () => new Promise(() => {})

export const fail = () => Promise.reject({ code: 'NETWORK_ERROR', message: 'Không kết nối được máy chủ.', details: null, status: 0 })
