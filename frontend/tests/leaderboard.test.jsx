/*
 * Bảng xếp hạng (pages/Leaderboard): đang tải, lỗi (Thử lại, không có con số), trống (gợi ý vào Học Viện), hạng của tôi khi
 * ngoài top hoặc đã tắt hiện trên bảng, tab Đấu Trường / Bạn bè "Sắp ra mắt", đồng hồ đếm từ số giây server trả.
 */

import { fireEvent, screen } from '@testing-library/react'
import { beforeEach, describe, expect, test, vi } from 'vitest'
import Leaderboard, { toRows } from '../src/pages/Leaderboard/Leaderboard'
import * as profileApi from '../src/services/profileApi'
import { fail, pending, renderPage, visibleText } from './helpers'

vi.mock('../src/services/profileApi', () => ({ getLeaderboard: vi.fn(), getPublicStats: vi.fn(), getMyProfile: vi.fn(), getPublicProfile: vi.fn(), updateMe: vi.fn(), getDailyWord: vi.fn() }))
vi.mock('../src/services/collectionApi', async (orig) => ({ ...(await orig()), fetchCatalog: vi.fn(() => Promise.resolve([])) }))

const board = (entries, myEntry, extra = {}) => ({ board: 'weekly', week_start: '2026-10-04T17:00:00Z', week_end: '2026-10-11T17:00:00Z', seconds_left: 90061, entries, my_entry: myEntry, ...extra })
const row = (rank, username, score) => ({ rank, display_name: username.toUpperCase(), username, avatar_mascot_id: null, tier: 'dong', score })

beforeEach(() => vi.clearAllMocks())

describe('Bảng xếp hạng', () => {
  test('đang tải: khối chờ, không có con số', () => {
    profileApi.getLeaderboard.mockImplementation(pending)
    const { container } = renderPage(<Leaderboard />, { path: '/leaderboard' })
    expect(screen.getByRole('status', { name: 'Đang tải bảng xếp hạng' })).toBeInTheDocument()
    expect(visibleText(container)).not.toMatch(/\d/)
  })

  test('API lỗi: thông báo + Thử lại, không hiện con số nào', async () => {
    profileApi.getLeaderboard.mockImplementation(fail)
    const { container } = renderPage(<Leaderboard />, { path: '/leaderboard' })
    expect(await screen.findByText('Chưa tải được bảng xếp hạng')).toBeInTheDocument()
    expect(visibleText(container)).not.toMatch(/\d|undefined|NaN/)
    profileApi.getLeaderboard.mockResolvedValue(board([], { rank: null, score: 0, hidden: false }))
    fireEvent.click(screen.getByRole('button', { name: 'Thử lại' }))
    expect(await screen.findByText('Tuần này chưa ai lên bảng')).toBeInTheDocument()
  })

  test('trống: gợi ý vào Học Viện; đồng hồ từ seconds_left của server', async () => {
    profileApi.getLeaderboard.mockResolvedValue(board([], { rank: null, score: 0, hidden: false }))
    renderPage(<Leaderboard />, { path: '/leaderboard' })
    expect(await screen.findByText('Tuần này chưa ai lên bảng')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Vào Học Viện/ })).toBeInTheDocument()
    expect(screen.getByRole('timer')).toHaveTextContent(/1 ngày 01:01:0[01]/) // 90061 giây
    expect(screen.getByText('Bạn chưa có từ mới thuộc trong tuần này')).toBeInTheDocument()
  })

  test('ngoài top và đã ẩn: vẫn thấy hạng của mình', async () => {
    profileApi.getLeaderboard.mockResolvedValue(board([row(1, 'an', 30), row(1, 'binh', 30), row(3, 'cuong', 12)], { rank: 9, score: 4, hidden: true }))
    renderPage(<Leaderboard />, { path: '/leaderboard' })
    expect(await screen.findByText('#9')).toBeInTheDocument()
    expect(screen.getByText(/Bạn đang ẩn khỏi bảng xếp hạng/)).toBeInTheDocument()
    expect(screen.getAllByText('AN').length).toBeGreaterThan(0)
  })

  test('tab Đấu Trường, Bạn bè: "Sắp ra mắt", không gọi API', async () => {
    renderPage(<Leaderboard />, { path: '/leaderboard', route: '/leaderboard?board=friends' })
    expect(await screen.findByText('Bảng bạn bè sắp ra mắt')).toBeInTheDocument()
    expect(profileApi.getLeaderboard).not.toHaveBeenCalled()
  })
})

test('toRows: đánh dấu dòng của mình theo username, giữ hạng bằng điểm', () => {
  const rows = toRows([row(1, 'an', 30), row(1, 'tester', 30)], 'tester', {})
  expect(rows.map((r) => [r.place, r.isMe])).toEqual([[1, false], [1, true]])
})
