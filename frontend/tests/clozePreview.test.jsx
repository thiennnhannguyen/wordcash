/*
 * Xem trước câu Mức 4 trên trang duyệt (/dev/content): dựng đúng như người học thấy (câu có chỗ trống + 4 lựa chọn), liệt kê
 * câu khi thay từng đáp án nhiễu, và báo "lùi về Mức 3" khi chưa đủ điều kiện (khớp cloze_ready ở backend).
 */

import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import ClozePreview, { clozeProblems } from '../src/dev/ContentReview/ClozePreview'

const SENTENCE = 'My brother is a little boy. He is six and goes to school with his toys.'

describe('ClozePreview', () => {
  it('dựng câu hỏi Mức 4 với 4 lựa chọn như người học thấy', () => {
    render(<ClozePreview headword="boy" sentence={SENTENCE} distractors={['chair', 'river', 'window']} />)
    expect(screen.getByText('Mức 4 · Điền vào câu')).toBeInTheDocument()
    const options = screen.getByRole('radiogroup', { name: 'Các đáp án' })
    for (const word of ['boy', 'chair', 'river', 'window']) expect(options).toHaveTextContent(word)
    expect(screen.getByText(/thay từng đáp án nhiễu vào/i)).toBeInTheDocument()
    const swapped = screen.getAllByText('chair').map((el) => el.closest('li')).filter(Boolean)
    expect(swapped[0]).toHaveTextContent('My brother is a little chair. He is six')
  })

  it('chưa đủ điều kiện thì báo người học sẽ gặp Mức 3', () => {
    render(<ClozePreview headword="boy" sentence="That person is very kind to me." distractors={['girl', 'man']} />)
    expect(screen.getByRole('status')).toHaveTextContent('người học sẽ gặp Mức 3')
    expect(screen.queryByRole('radiogroup')).not.toBeInTheDocument()
  })

  it('kiểm tra giống cloze_ready ở backend', () => {
    expect(clozeProblems('boy', SENTENCE, ['chair', 'river', 'window'])).toEqual([])
    expect(clozeProblems('boy', '', ['a', 'b', 'c'])).toEqual(['Chưa có câu điền từ.'])
    expect(clozeProblems('boy', 'A boy and a boy play here.', ['a', 'b', 'c'])[0]).toMatch(/đúng 1 lần/)
    expect(clozeProblems('boy', 'The boyfriend is here today now.', ['a', 'b', 'c'])[0]).toMatch(/đang có 0/)  // nguyên từ
    expect(clozeProblems('boy', SENTENCE, ['chair', 'Chair', 'window'])).toContain('Đáp án nhiễu bị trùng nhau.')
    expect(clozeProblems('boy', SENTENCE, ['chair', 'boy', 'window'])).toContain('Đáp án nhiễu trùng đáp án đúng.')
  })
})
