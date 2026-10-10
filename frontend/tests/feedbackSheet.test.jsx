/*
 * Tấm phản hồi khi trả lời SAI: đáp án hiện đúng loại mà câu đã hỏi.
 * Mức 1 (nhìn từ, chọn nghĩa) → nghĩa tiếng Việt + từ tiếng Anh + phiên âm; Mức 2–4 → từ tiếng Anh + phiên âm, kèm nghĩa.
 * Kết quả chấm của server (correct_answer + entry) đi qua `studyFeedback` như ở SessionSteps.
 */

import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import FeedbackSheet from '../src/components/academy/FeedbackSheet'
import { feedbackAnswer, studyFeedback } from '../src/utils/feedback'

const ENTRY = { headword: 'boy', meaning_vi: 'cậu bé', ipa: '/bɔɪ/', example: 'The boy plays soccer.' }
// Đáp án server trả theo từng mức (question_builder: Mức 1 = meaning_vi, còn lại = headword)
const SERVER_ANSWER = { 1: 'cậu bé', 2: 'boy', 3: 'boy', 4: 'boy' }

function wrongAt(level) {
  return studyFeedback({ correct: false, correct_answer: SERVER_ANSWER[level], entry: ENTRY }, { level })
}

describe('FeedbackSheet: đáp án đúng loại câu hỏi', () => {
  it('Mức 1 hiện NGHĨA tiếng Việt, kèm từ tiếng Anh và phiên âm', () => {
    render(<FeedbackSheet result={wrongAt(1)} onContinue={() => {}} />)
    expect(screen.getByTestId('feedback-answer')).toHaveTextContent('cậu bé')
    const word = screen.getByTestId('feedback-word')
    expect(word).toHaveTextContent('boy')
    expect(word).toHaveTextContent('/bɔɪ/')
    expect(within(word).getByRole('button', { name: 'Nghe phát âm boy' })).toBeInTheDocument()
    expect(screen.queryByTestId('feedback-meaning')).toBeNull()
  })

  it.each([2, 3, 4])('Mức %i hiện TỪ tiếng Anh + phiên âm, kèm nghĩa', (level) => {
    render(<FeedbackSheet result={wrongAt(level)} onContinue={() => {}} />)
    expect(screen.getByTestId('feedback-answer')).toHaveTextContent(/^boy$/)
    expect(screen.getByText('/bɔɪ/')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Nghe phát âm boy' })).toBeInTheDocument()
    expect(screen.getByTestId('feedback-meaning')).toHaveTextContent('cậu bé')
    expect(screen.queryByTestId('feedback-word')).toBeNull()
  })

  it('đáp án luôn lấy từ server, không thay bằng headword', () => {
    expect(feedbackAnswer(wrongAt(1)).answer).toBe('cậu bé')
    expect(feedbackAnswer(wrongAt(4)).answer).toBe('boy')
  })

  it('trả lời đúng: hiện từ · nghĩa ở mọi mức', () => {
    for (const level of [1, 2, 3, 4]) {
      const { unmount } = render(
        <FeedbackSheet result={{ ...wrongAt(level), correct: true }} onContinue={() => {}} />,
      )
      expect(screen.getByText('Chuẩn luôn!')).toBeInTheDocument()
      expect(screen.getByText('boy')).toBeInTheDocument()
      unmount()
    }
  })
})
