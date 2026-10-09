/*
 * Sảnh (pages/Lobby): ba trạng thái của mọi khối lấy dữ liệu từ server.
 * - Đang tải: khối chờ, không có số.
 * - API lỗi: thông báo + nút Thử lại ở từng khối, KHÔNG hiện bất kỳ con số nào (trước đây Sảnh quay về số giả 1.248, streak 12…);
 *   bấm Thử lại thì gọi lại API.
 * - Người mới tinh: số 0 thật, khối trống có lời gợi ý (Từ của ngày, Top tuần này, Khóa học); không có Đấu Trường giả.
 */

import { fireEvent, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, test, vi } from 'vitest'
import Lobby from '../src/pages/Lobby/Lobby'
import { buildLobby } from '../src/pages/Lobby/useLobbyData'
import * as academyApi from '../src/services/academyApi'
import * as profileApi from '../src/services/profileApi'
import * as coursesApi from '../src/services/coursesApi'
import { fail, pending, renderPage, visibleText } from './helpers'
import meStatsNew from './fixtures/meStatsNew.json'
import roadmap from './fixtures/roadmap.json'

vi.mock('../src/services/academyApi', async (orig) => ({ ...(await orig()), getMeStats: vi.fn(), getUnit: vi.fn(), getRoadmap: vi.fn() }))
vi.mock('../src/services/profileApi', () => ({ getDailyWord: vi.fn(), getLeaderboard: vi.fn(), getPublicStats: vi.fn(), getMyProfile: vi.fn(), getPublicProfile: vi.fn(), updateMe: vi.fn() }))
vi.mock('../src/services/coursesApi', () => ({ listCourses: vi.fn() }))
vi.mock('../src/services/collectionApi', async (orig) => ({ ...(await orig()), fetchCatalog: vi.fn(() => Promise.resolve([])) }))

function mockAll(impl) {
  for (const fn of [academyApi.getMeStats, academyApi.getUnit, academyApi.getRoadmap, profileApi.getDailyWord, profileApi.getLeaderboard, profileApi.getPublicStats, coursesApi.listCourses]) {
    fn.mockImplementation(impl)
  }
}

beforeEach(() => vi.clearAllMocks())

describe('Sảnh', () => {
  test('đang tải: khối chờ, không có con số', () => {
    mockAll(pending)
    const { container } = renderPage(<Lobby />)
    expect(screen.getAllByRole('status', { name: 'Đang tải' }).length).toBeGreaterThan(3)
    expect(visibleText(container)).not.toMatch(/\d/)
    expect(visibleText(container)).not.toMatch(/undefined|NaN/)
  })

  test('API lỗi: mỗi khối báo lỗi + Thử lại, không hiện bất kỳ con số nào', async () => {
    mockAll(fail)
    const { container } = renderPage(<Lobby />)
    await screen.findByText('Chưa tải được số liệu hôm nay')
    for (const title of ['Chưa tải được bài đang học', 'Chưa tải được Từ của ngày', 'Chưa tải được mục tiêu', 'Chưa tải được rank', 'Chưa tải được lượt quay', 'Chưa tải được bảng xếp hạng', 'Chưa tải được khóa học', 'Chưa tải được hành trình']) {
      expect(await screen.findByText(title)).toBeInTheDocument()
    }
    const text = visibleText(container)
    expect(text).not.toMatch(/\d/)
    expect(text).not.toMatch(/undefined|NaN|1\.248|128 người|Chuỗi thắng|Minh Anh/)

    // Thử lại: gọi lại API, có dữ liệu thì hiện
    academyApi.getMeStats.mockResolvedValue(meStatsNew)
    academyApi.getUnit.mockResolvedValue({ words: [{ status: 'new' }, { status: 'new' }] })
    fireEvent.click(screen.getAllByRole('button', { name: 'Thử lại' })[0])
    await waitFor(() => expect(academyApi.getMeStats).toHaveBeenCalledTimes(2))
    expect(await screen.findByText(/Bài 1: Xin chào/)).toBeInTheDocument()
  })

  test('người mới tinh: số thật, khối trống có gợi ý; Đấu Trường "sắp mở"', async () => {
    academyApi.getMeStats.mockResolvedValue(meStatsNew)
    academyApi.getUnit.mockResolvedValue({ words: [{ status: 'new' }, { status: 'new' }] })
    academyApi.getRoadmap.mockResolvedValue(roadmap)
    profileApi.getDailyWord.mockResolvedValue({ date: '2026-10-08', level: null, entry: null, status: null })
    profileApi.getLeaderboard.mockResolvedValue({ board: 'weekly', entries: [], my_entry: { rank: null, score: 0, hidden: false }, seconds_left: 1000, week_start: null, week_end: null })
    profileApi.getPublicStats.mockResolvedValue({ rules: { spin_every_n_words: 50 } })
    coursesApi.listCourses.mockResolvedValue({ items: [] })
    const { container } = renderPage(<Lobby />)

    expect(await screen.findByText('Chưa có Từ của ngày')).toBeInTheDocument()
    expect(await screen.findByText('Tuần này chưa ai lên bảng')).toBeInTheDocument()
    expect(await screen.findByText('Tự tạo bộ từ của riêng bạn')).toBeInTheDocument()
    expect(await screen.findByText('0 từ đã thuộc')).toBeInTheDocument()
    expect(screen.getByText('Bắt đầu học')).toBeInTheDocument()
    // Không có mục tiêu ôn khi chưa có từ đến hạn, không có mục tiêu Đấu Trường
    expect(screen.queryByText(/từ đến hạn$/)).not.toBeInTheDocument()
    expect(screen.queryByText(/Chơi .*Đấu Trường/)).not.toBeInTheDocument()
    // Đấu Trường: nút vô hiệu, không có số người online / thắng thua
    expect(screen.getByRole('button', { name: /Tìm trận/ })).toBeDisabled()
    expect(visibleText(container)).not.toMatch(/online|Chuỗi thắng|thắng ·/)
  })
})

test('buildLobby: mục tiêu ôn chỉ có khi thật sự có từ đến hạn; rank cao nhất không có rank kế', () => {
  const none = buildLobby(meStatsNew, null)
  expect(none.goals.map((g) => g.key)).toEqual(['new'])
  expect(none.academy.progress).toBeNull() // không đọc được bài thì không đoán số từ
  const due = buildLobby({ ...meStatsNew, today: { ...meStatsNew.today, reviews_total: 8, reviews_done: 3 } }, null)
  expect(due.goals[1]).toMatchObject({ key: 'review', current: 3, target: 8 })
  const top = buildLobby({ ...meStatsNew, rank: { ...meStatsNew.rank, current: 'huyen_thoai', next: null, next_min: null } }, null)
  expect(top.nextRank).toEqual({ from: 'huyen_thoai', to: null })
})
