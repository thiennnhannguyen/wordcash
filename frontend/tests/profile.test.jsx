/*
 * Hồ Sơ (pages/Profile): đang tải, lỗi (Thử lại, không có con số), không tìm thấy người chơi, hồ sơ người khác chỉ có phần công
 * khai (không có khối riêng tư; Thách đấu, Kết bạn "Sắp ra mắt"), hồ sơ người mới (khối trống có gợi ý, không có số giả).
 */

import { screen } from '@testing-library/react'
import { beforeEach, describe, expect, test, vi } from 'vitest'
import Profile, { toProfile } from '../src/pages/Profile/Profile'
import * as profileApi from '../src/services/profileApi'
import { fail, pending, renderPage, visibleText } from './helpers'
import profileNew from './fixtures/profileNew.json'
import profilePublic from './fixtures/profilePublic.json'

vi.mock('../src/services/profileApi', () => ({ getMyProfile: vi.fn(), getPublicProfile: vi.fn(), updateMe: vi.fn(), getPublicStats: vi.fn(), getDailyWord: vi.fn(), getLeaderboard: vi.fn() }))
vi.mock('../src/services/collectionApi', async (orig) => ({ ...(await orig()), fetchCatalog: vi.fn(() => Promise.resolve([])), fetchCollection: vi.fn(() => new Promise(() => {})) }))

beforeEach(() => {
  vi.clearAllMocks()
  // Bố cục desktop (useMediaQuery '(min-width: 768px)'): mọi khối hiện cùng lúc, không chia tab
  window.matchMedia = (query) => ({ matches: query.includes('min-width'), media: query, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} })
  profileApi.getPublicStats.mockResolvedValue({ mascots_total: 100, rules: { ranks: [{ key: 'tan_binh', min: 0 }, { key: 'dong', min: 100 }] } })
})

const renderMe = () => renderPage(<Profile />, { path: '/profile' })
const renderOther = (name) => renderPage(<Profile />, { path: '/profile/:handle', route: `/profile/${name}` })

describe('Hồ Sơ', () => {
  test('đang tải: khối chờ, không có con số', () => {
    profileApi.getMyProfile.mockImplementation(pending)
    const { container } = renderMe()
    expect(screen.getByRole('status', { name: 'Đang tải hồ sơ' })).toBeInTheDocument()
    expect(visibleText(container)).not.toMatch(/\d/)
  })

  test('API lỗi: thông báo + Thử lại, không hiện con số nào', async () => {
    profileApi.getMyProfile.mockImplementation(fail)
    const { container } = renderMe()
    expect(await screen.findByText('Chưa tải được hồ sơ')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Thử lại' })).toBeInTheDocument()
    expect(visibleText(container)).not.toMatch(/\d|undefined|NaN/)
  })

  test('username không tồn tại: "Không tìm thấy người chơi"', async () => {
    profileApi.getPublicProfile.mockRejectedValue({ code: 'USER_NOT_FOUND', message: 'Không tìm thấy người chơi.', status: 404 })
    renderOther('khong-co')
    expect(await screen.findByText('Không tìm thấy người chơi')).toBeInTheDocument()
  })

  test('hồ sơ người khác: chỉ phần công khai, nút xã hội "Sắp ra mắt"', async () => {
    profileApi.getPublicProfile.mockResolvedValue(profilePublic)
    renderOther('other')
    expect(await screen.findByText('Bạn Khác')).toBeInTheDocument()
    expect(profileApi.getPublicProfile).toHaveBeenCalledWith('other')
    for (const priv of ['Từ hay quên nhất', 'Độ ghi nhớ', 'Hoạt động', 'Khóa học của tôi', 'Tiến độ theo cấp', 'Chỉnh sửa hồ sơ', 'Tải thẻ chứng nhận']) {
      expect(screen.queryByText(priv)).not.toBeInTheDocument()
    }
    expect(screen.getByRole('button', { name: /Thách đấu/ })).toBeDisabled()
    expect(screen.getByRole('button', { name: /Kết bạn/ })).toBeDisabled()
    expect(screen.queryByText(/Tham gia/)).not.toBeInTheDocument() // ngày tham gia không thuộc phần công khai
  })

  test('hồ sơ người mới: khối trống có gợi ý, Đấu Trường và huy hiệu "Sắp ra mắt"', async () => {
    profileApi.getMyProfile.mockResolvedValue(profileNew)
    renderMe()
    expect(await screen.findByText('Chưa có từ nào bị quên')).toBeInTheDocument()
    expect(screen.getByText('Chưa có câu Cửa Ải nào')).toBeInTheDocument()
    expect(screen.getByText('Thống kê Đấu Trường')).toBeInTheDocument()
    expect(screen.getByText('Tủ huy hiệu')).toBeInTheDocument()
    expect(screen.getAllByText('Sắp ra mắt').length).toBeGreaterThanOrEqual(2)
    expect(screen.queryByText(/Minh Thư|1\.248|nhan\.wordclash/)).not.toBeInTheDocument()
  })
})

test('toProfile: hồ sơ người khác không mang theo trường riêng tư', () => {
  const p = toProfile({ ...profilePublic, email: 'x@y.z', most_forgotten: [{}] }, false)
  expect(Object.keys(p)).not.toContain('hardest')
  expect(Object.keys(p)).not.toContain('accuracy')
  expect(JSON.stringify(p)).not.toContain('x@y.z')
})
