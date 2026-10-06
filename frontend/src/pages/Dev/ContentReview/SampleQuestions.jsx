/*
 * Câu hỏi mẫu mức 1–4 sinh từ mục đang duyệt bằng question_builder ở backend (đáp án nhiễu lấy trong cùng chủ đề), để người
 * duyệt thấy đáp án nhiễu có hợp lý không. Đáp án đúng tô xanh chanh. Chỉ dùng ở trang dev.
 */

import { useEffect, useState } from 'react'
import { SpeakerHigh } from '@phosphor-icons/react'
import Icon from '../../../components/ui/Icon'
import { fetchSampleQuestions } from '../../../services/devContentApi'
import cx from '../../../utils/cx'

const TITLES = { 1: 'Mức 1 · Chọn nghĩa', 2: 'Mức 2 · Nghe chọn từ', 3: 'Mức 3 · Gõ từ', 4: 'Mức 4 · Điền vào câu' }

export default function SampleQuestions({ level, topic, entryKey, version }) {
  const [questions, setQuestions] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    let alive = true
    setQuestions(null)
    fetchSampleQuestions(level, topic, entryKey)
      .then((qs) => alive && setQuestions(qs))
      .catch((e) => alive && setError(e.message))
    return () => {
      alive = false
    }
  }, [level, topic, entryKey, version])

  if (error) return <p className="text-sm text-danger-deep">{error}</p>
  if (!questions) return <p className="text-sm text-muted">Đang dựng câu hỏi mẫu…</p>

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {questions.map((q) => (
        <div key={q.requested_level} className="rounded-card border-thick border-line bg-surface p-3 shadow-hard">
          <p className="font-display text-[13px] font-bold uppercase tracking-wider text-muted">{TITLES[q.requested_level]}</p>
          <p className="mt-1 text-[15px] font-semibold text-ink">
            {q.type === 'choose_meaning' && q.word}
            {q.type === 'listen' && (
              <span className="inline-flex items-center gap-1.5">
                <Icon icon={SpeakerHigh} size={18} color="primary" /> (âm thanh của từ)
              </span>
            )}
            {q.type === 'type_word' && `${q.prompt} · ${q.letter_count} chữ cái`}
            {q.type === 'fill_blank' && q.sentence}
          </p>
          {q.options ? (
            <ul className="mt-2 flex flex-wrap gap-1.5">
              {q.options.map((o) => (
                <li
                  key={o}
                  className={cx(
                    'rounded-full border-2 border-line px-2.5 py-0.5 text-[13px] font-medium',
                    o === q.answer ? 'bg-accent' : 'bg-bg',
                  )}
                >
                  {o}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-[13px] text-muted">
              Đáp án: <span className="rounded bg-accent px-1.5 font-semibold text-ink">{q.answer}</span>
            </p>
          )}
          {q.level !== q.requested_level && (
            <p className="mt-1 text-[13px] text-danger-deep">Không đủ điều kiện mức {q.requested_level}, lùi về mức {q.level}.</p>
          )}
        </div>
      ))}
    </div>
  )
}
