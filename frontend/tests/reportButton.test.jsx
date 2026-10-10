/*
 * Nút "Báo lỗi": mở hộp chọn loại lỗi, gửi đúng tham chiếu (không gửi đáp án người học), toast cảm ơn, không đóng tấm phản hồi;
 * thẻ học không có loại "Đáp án gây nhầm"; tấm phản hồi chỉ có nút khi được truyền `report` (từ tự tạo thì không).
 */

import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import ReportButton, { THANKS } from '../src/components/academy/ReportButton'
import FeedbackSheet from '../src/components/academy/FeedbackSheet'
import { useToastStore } from '../src/store/toastStore'

const reportContent = vi.fn()
vi.mock('../src/services/contentReportApi', async (orig) => ({ ...(await orig()), reportContent: (body) => reportContent(body) }))

const QUESTION = { question: { kind: 'study', session_id: 's-1', question_id: 'q3' } }

beforeEach(() => {
  reportContent.mockReset()
  useToastStore.setState({ toasts: [] })
})

describe('ReportButton', () => {
  it('gửi loại lỗi + ghi chú kèm tham chiếu câu hỏi rồi cảm ơn', async () => {
    reportContent.mockResolvedValue({ created: true })
    render(<ReportButton target={QUESTION} word="boy" />)
    fireEvent.click(screen.getByRole('button', { name: /Báo lỗi/ }))
    expect(screen.getByText('Báo lỗi từ "boy"')).toBeInTheDocument()
    const send = screen.getByRole('button', { name: 'Gửi báo lỗi' })
    expect(send).toBeDisabled()  // chưa chọn loại
    fireEvent.click(screen.getByLabelText(/Đáp án gây nhầm/))
    fireEvent.change(screen.getByLabelText(/Ghi chú/), { target: { value: '  girl cũng đúng ' } })
    fireEvent.click(send)
    await waitFor(() => expect(reportContent).toHaveBeenCalledTimes(1))
    expect(reportContent).toHaveBeenCalledWith({ ...QUESTION, kind: 'confusing_answer', note: 'girl cũng đúng' })
    await waitFor(() => expect(useToastStore.getState().toasts[0]?.title).toBe(THANKS))
    expect(THANKS).toBe('Cảm ơn bạn! Mình sẽ kiểm tra từ này.')
  })

  it('thẻ học không có loại "Đáp án gây nhầm"', () => {
    render(<ReportButton target={{ entry_id: 5, source: 'unit_learn' }} />)
    fireEvent.click(screen.getByRole('button', { name: /Báo lỗi/ }))
    expect(screen.queryByLabelText(/Đáp án gây nhầm/)).not.toBeInTheDocument()
    expect(screen.getByLabelText(/Nghĩa sai/)).toBeInTheDocument()
  })

  it('lỗi giới hạn hiện toast lỗi', async () => {
    reportContent.mockRejectedValue({ code: 'CONTENT_REPORT_LIMIT', message: 'Hôm nay bạn đã gửi đủ số báo lỗi cho phép.' })
    render(<ReportButton target={QUESTION} />)
    fireEvent.click(screen.getByRole('button', { name: /Báo lỗi/ }))
    fireEvent.click(screen.getByLabelText(/Lỗi khác/))
    fireEvent.click(screen.getByRole('button', { name: 'Gửi báo lỗi' }))
    await waitFor(() => expect(useToastStore.getState().toasts[0]?.variant).toBe('error'))
  })
})

describe('FeedbackSheet', () => {
  const result = { correct: false, correctAnswer: 'boy', ipa: '/bɔɪ/', example: 'He is a boy.' }

  it('có nút Báo lỗi khi truyền report, gửi xong vẫn giữ tấm phản hồi', async () => {
    reportContent.mockResolvedValue({ created: false })  // đã báo hôm nay: vẫn cảm ơn
    const onContinue = vi.fn()
    render(<FeedbackSheet result={result} onContinue={onContinue} report={QUESTION} />)
    fireEvent.click(screen.getByRole('button', { name: /Báo lỗi/ }))
    fireEvent.click(screen.getByLabelText(/Nghĩa sai/))
    fireEvent.click(screen.getByRole('button', { name: 'Gửi báo lỗi' }))
    await waitFor(() => expect(useToastStore.getState().toasts[0]?.title).toBe(THANKS))
    expect(onContinue).not.toHaveBeenCalled()
    expect(screen.getByRole('button', { name: 'Đã nhớ' })).toBeInTheDocument()
  })

  it('không truyền report (từ tự tạo) thì không có nút', () => {
    render(<FeedbackSheet result={result} onContinue={() => {}} />)
    expect(screen.queryByRole('button', { name: /Báo lỗi/ })).not.toBeInTheDocument()
  })
})
