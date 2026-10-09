/*
 * Tab "Báo lỗi" (/dev/content): người không phải admin thấy thông báo cần admin (API trả 403); admin thấy nhóm theo mục
 * kèm nội dung người học đã thấy; "Mở mục" gửi đúng cấp / chủ đề / content_key / các trường cần xem; "Đã sửa xong" đóng
 * cả nhóm (PATCH theo mục).
 */

import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import ReportsPanel, { locate } from '../src/dev/ContentReview/ReportsPanel'

const api = { fetchReports: vi.fn(), setEntryReportStatus: vi.fn(), setReportStatus: vi.fn() }
vi.mock('../src/services/contentReportApi', async (orig) => ({
  ...(await orig()),
  fetchReports: (...a) => api.fetchReports(...a),
  setEntryReportStatus: (...a) => api.setEntryReportStatus(...a),
  setReportStatus: (...a) => api.setReportStatus(...a),
}))

const GROUP = {
  entry_id: 7, content_key: 'a1.family.boy.noun', headword: 'boy', cefr: 'A1', current_version: 2, count: 2,
  kinds: { confusing_answer: 2 }, fields: ['cloze_en', 'cloze_distractors'], last_at: '2026-10-10T03:00:00Z',
  reports: [{
    id: 'r1', kind: 'confusing_answer', note: 'girl cũng đúng', context: 'question', source: 'unit_learn', content_version: 1,
    status: 'open', created_at: '2026-10-10T03:00:00Z', resolved_at: null,
    snapshot: { type: 'fill_blank', level: 4, sentence: 'That ______ is very kind.', options: ['boy', 'girl', 'man', 'country'], correct_answer: 'boy' },
  }],
}

beforeEach(() => Object.values(api).forEach((f) => f.mockReset()))

describe('ReportsPanel', () => {
  it('không phải admin thì báo cần tài khoản admin', async () => {
    api.fetchReports.mockRejectedValue({ code: 'FORBIDDEN', status: 403, message: 'x' })
    render(<ReportsPanel onOpen={() => {}} />)
    expect(await screen.findByRole('alert')).toHaveTextContent('chỉ dành cho tài khoản admin')
  })

  it('hiện nhóm, câu người học đã thấy, mở mục và đóng cả nhóm', async () => {
    api.fetchReports.mockResolvedValue({ status: 'open', groups: [GROUP] })
    api.setEntryReportStatus.mockResolvedValue({ updated: 2 })
    const onOpen = vi.fn()
    render(<ReportsPanel onOpen={onOpen} />)
    expect(await screen.findByText('2 báo cáo')).toBeInTheDocument()
    expect(screen.getByText('That ______ is very kind.')).toBeInTheDocument()
    expect(screen.getByText('“girl cũng đúng”')).toBeInTheDocument()
    expect(screen.getByText(/đã sửa sau báo cáo/)).toBeInTheDocument()  // v2 > v1
    expect(screen.getByText('Câu điền từ')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /Mở mục/ }))
    expect(onOpen).toHaveBeenCalledWith({ level: 'A1', topic: 'family', key: 'a1.family.boy.noun', fields: ['cloze_en', 'cloze_distractors'], entryId: 7 })
    fireEvent.click(screen.getByRole('button', { name: /Đã sửa xong/ }))
    await waitFor(() => expect(api.setEntryReportStatus).toHaveBeenCalledWith(7, 'resolved'))
    await waitFor(() => expect(api.fetchReports).toHaveBeenCalledTimes(2))  // tải lại sau khi đổi
  })

  it('locate đọc cấp + chủ đề từ content_key', () => {
    expect(locate('b1.travel.airport.noun')).toEqual({ level: 'B1', topic: 'travel' })
    expect(locate(null)).toBeNull()
  })
})
