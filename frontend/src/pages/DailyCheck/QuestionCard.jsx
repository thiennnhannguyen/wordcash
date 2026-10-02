/*
 * Card câu hỏi của Cửa Ải. Hai kiểu:
 * - "type": nhìn nghĩa, gõ từ tiếng Anh; gợi ý số chữ cái bằng dấu gạch (chỉ lộ độ dài, không lộ đáp án).
 * - "choice": điền vào câu, chọn 1 trong 4 đáp án.
 * Không có đồng hồ đếm ngược. Component chỉ thu câu trả lời; đúng/sai do server chấm.
 */

import { useEffect, useRef } from 'react'
import { AnswerOption } from '../../components/game/AnswerOptions'
import cx from '../../utils/cx'

function LetterHint({ count, typed }) {
  return (
    <div className="flex flex-wrap justify-center gap-1.5" aria-label={`Từ gồm ${count} chữ cái`}>
      {Array.from({ length: count }, (_, i) => (
        <span
          key={i}
          aria-hidden="true"
          className={cx('h-1.5 w-5 rounded-pill transition-colors md:w-6', i < typed ? 'bg-primary' : 'bg-ink/25')}
        />
      ))}
    </div>
  )
}

function Sentence({ text, filled }) {
  const [before, after] = text.split('______')
  return (
    <p className="font-heading text-[26px] font-extrabold leading-snug tracking-tight md:text-[34px]">
      {before}
      <span
        className={cx(
          'mx-1 inline-block min-w-24 rounded-[12px] border-b-4 px-2 text-center',
          filled ? 'border-primary bg-raised text-primary' : 'border-ink/40 text-transparent',
        )}
      >
        {filled || '____'}
      </span>
      {after}
    </p>
  )
}

export default function QuestionCard({ question, answer, onAnswer, onSubmit, locked }) {
  const inputRef = useRef(null)

  // Tự focus ô nhập ở câu gõ từ; cuộn ô vào giữa để bàn phím mobile không che mất
  useEffect(() => {
    if (question.type !== 'type') return
    const input = inputRef.current
    input?.focus({ preventScroll: true })
    input?.scrollIntoView({ block: 'center' })
  }, [question])

  return (
    <div className="flex flex-1 flex-col gap-6 md:flex-none rounded-panel border-thick border-line bg-surface p-5 shadow-hard-lg md:gap-8 md:p-10">
      {question.type === 'type' ? (
        <>
          <div className="flex flex-col items-center gap-2 text-center">
            <span className="hud-label">Gõ từ tiếng Anh có nghĩa</span>
            <p className="font-heading text-[34px] font-black leading-tight tracking-tight md:text-[44px]">{question.prompt}</p>
          </div>
          <form
            className="flex flex-col gap-4"
            onSubmit={(event) => {
              event.preventDefault()
              if (answer.trim() && !locked) onSubmit()
            }}
          >
            <label htmlFor={`answer-${question.id}`} className="sr-only">
              Câu trả lời của bạn
            </label>
            <input
              ref={inputRef}
              id={`answer-${question.id}`}
              value={answer}
              onChange={(e) => onAnswer(e.target.value)}
              onFocus={(e) => setTimeout(() => e.target.scrollIntoView({ block: 'center', behavior: 'smooth' }), 300)}
              disabled={locked}
              autoComplete="off"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              enterKeyHint="done"
              placeholder="Gõ từ ở đây"
              className="h-18 w-full rounded-card border-thick border-line bg-bg px-5 text-center font-display text-[28px] font-bold tracking-wide text-ink shadow-hard outline-none placeholder:text-lg placeholder:font-medium placeholder:tracking-normal placeholder:text-muted/60 focus:border-primary focus:bg-surface focus:shadow-focus disabled:opacity-70 md:text-[32px]"
            />
            <LetterHint count={question.letterCount} typed={answer.replace(/\s/g, '').length} />
          </form>
        </>
      ) : (
        <>
          <div className="flex flex-col gap-3">
            <span className="hud-label">Điền vào chỗ trống</span>
            <Sentence text={question.sentence} filled={answer} />
          </div>
          <div role="radiogroup" aria-label="Các đáp án" className="grid gap-3 md:grid-cols-2">
            {question.options.map((option, i) => (
              <AnswerOption
                key={option}
                index={i}
                label={option}
                state={answer === option ? 'selected' : 'idle'}
                disabled={locked}
                onClick={() => onAnswer(option)}
              />
            ))}
          </div>
        </>
      )}
    </div>
  )
}
