/*
 * Hiển thị câu hỏi theo 4 mức.
 *
 * (1) chọn nghĩa · (2) nghe chọn từ · (3) gõ từ từ nghĩa · (4) điền vào câu. Cùng một khung card.
 * Câu chọn đáp án có phím tắt 1–4; câu gõ từ có ô trống theo số chữ cái và nút "Gợi ý 1 chữ"
 * (chỉ hiện khi truyền `onHint`; bài kiểm tra không có gợi ý).
 * Component chỉ thu câu trả lời; đáp án, gợi ý và âm thanh đều lấy từ server qua callback.
 */

import { useEffect, useRef } from 'react'
import { Lightbulb, SpeakerHigh, SpeakerSimpleLow } from '@phosphor-icons/react'
import Button from '../ui/Button'
import Icon from '../ui/Icon'
import { AnswerOption } from '../game/AnswerOptions'
import cx from '../../utils/cx'

const LEVEL_TITLES = {
  1: 'Chọn nghĩa',
  2: 'Nghe chọn từ',
  3: 'Gõ từ',
  4: 'Điền vào câu',
}

function Options({ options, answer, locked, onAnswer }) {
  // Phím tắt 1–4
  useEffect(() => {
    if (locked) return undefined
    const onKey = (event) => {
      if (event.target instanceof HTMLInputElement) return
      const n = Number(event.key)
      if (n >= 1 && n <= options.length) onAnswer(options[n - 1])
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [options, locked, onAnswer])

  return (
    <div role="radiogroup" aria-label="Các đáp án" className="grid gap-3 sm:grid-cols-2">
      {options.map((option, i) => (
        <AnswerOption
          key={option}
          index={i}
          keyLabel={String(i + 1)}
          label={option}
          state={answer === option ? 'selected' : 'idle'}
          disabled={locked}
          onClick={() => onAnswer(option)}
        />
      ))}
    </div>
  )
}

function LetterBoxes({ count, value, revealed }) {
  const letters = value.replace(/\s/g, '').split('')
  return (
    <div className="flex flex-wrap justify-center gap-1.5 md:gap-2" aria-hidden="true">
      {Array.from({ length: count }, (_, i) => (
        <span
          key={i}
          className={cx(
            'grid h-12 w-9 place-items-center rounded-[10px] border-thick font-display text-xl font-bold uppercase md:h-14 md:w-11',
            i < revealed ? 'border-line bg-gold' : letters[i] ? 'border-line bg-raised' : 'border-line/30 bg-surface',
          )}
        >
          {letters[i] ?? ''}
        </span>
      ))}
    </div>
  )
}

function TypeQuestion({ question, answer, onAnswer, onSubmit, locked, hint, onHint, hintPending }) {
  const inputRef = useRef(null)

  useEffect(() => {
    const input = inputRef.current
    input?.focus({ preventScroll: true })
    input?.scrollIntoView({ block: 'center' })
  }, [question.id])

  return (
    <form
      className="flex flex-col gap-5"
      onSubmit={(event) => {
        event.preventDefault()
        if (answer.trim() && !locked) onSubmit()
      }}
    >
      <div className="flex flex-col items-center gap-1 text-center">
        <span className="hud-label">Nghĩa</span>
        <p className="font-heading text-[34px] font-black leading-tight tracking-tight md:text-[44px]">{question.prompt}</p>
      </div>
      <LetterBoxes count={question.letterCount} value={answer} revealed={hint.length} />
      <label htmlFor={`q-${question.id}`} className="sr-only">
        Gõ từ tiếng Anh
      </label>
      <input
        ref={inputRef}
        id={`q-${question.id}`}
        value={answer}
        maxLength={question.letterCount + 4}
        onChange={(e) => onAnswer(e.target.value.startsWith(hint) ? e.target.value : hint + e.target.value.slice(hint.length))}
        onFocus={(e) => setTimeout(() => e.target.scrollIntoView({ block: 'center', behavior: 'smooth' }), 300)}
        disabled={locked}
        autoComplete="off"
        autoCapitalize="none"
        autoCorrect="off"
        spellCheck={false}
        enterKeyHint="done"
        placeholder="Gõ từ ở đây"
        className="h-16 w-full rounded-card border-thick border-line bg-bg px-5 text-center font-display text-2xl font-bold tracking-wide shadow-hard outline-none placeholder:text-lg placeholder:font-medium placeholder:tracking-normal placeholder:text-muted/60 focus:border-primary focus:bg-surface focus:shadow-focus disabled:opacity-70"
      />
      {onHint && (
      <Button
        variant="ghost"
        size="sm"
        icon={Lightbulb}
        className="self-center"
        disabled={locked || hintPending || hint.length >= question.letterCount - 1}
        onClick={onHint}
      >
        Gợi ý 1 chữ
      </Button>
      )}
    </form>
  )
}

export default function QuestionView({ question, answer, onAnswer, onSubmit, locked, hint = '', onHint, hintPending, onPlayAudio, shadowClass = 'shadow-hard-lg' }) {
  return (
    <div className={cx('flex flex-1 flex-col gap-6 rounded-panel border-thick border-line bg-surface p-5 md:flex-none md:gap-8 md:p-8', shadowClass)}>
      <span className="self-start rounded-pill border-2 border-line bg-raised px-3 font-display text-xs font-bold uppercase leading-7">
        Mức {question.level} · {LEVEL_TITLES[question.level]}
      </span>

      {question.level === 1 && (
        <>
          <div className="flex flex-col items-center gap-1 text-center">
            <span className="hud-label">Từ này nghĩa là gì?</span>
            <p className="font-display text-[48px] font-bold uppercase leading-none tracking-wide md:text-[64px]">{question.word}</p>
          </div>
          <Options options={question.options} answer={answer} locked={locked} onAnswer={onAnswer} />
        </>
      )}

      {question.level === 2 && (
        <>
          <div className="flex flex-col items-center gap-4">
            <span className="hud-label">Nghe và chọn từ đúng</span>
            <button
              type="button"
              onClick={() => onPlayAudio({ slow: false })}
              aria-label="Nghe lại"
              className="pressable grid size-32 place-items-center rounded-pill border-thick border-line bg-sky shadow-hard-lg hover:-translate-y-0.5 md:size-40"
            >
              <Icon icon={SpeakerHigh} size={64} color="ink" />
            </button>
            <Button variant="secondary" size="sm" icon={SpeakerSimpleLow} onClick={() => onPlayAudio({ slow: true })}>
              Nghe chậm
            </Button>
          </div>
          <Options options={question.options} answer={answer} locked={locked} onAnswer={onAnswer} />
        </>
      )}

      {question.level === 3 && (
        <TypeQuestion
          question={question}
          answer={answer}
          onAnswer={onAnswer}
          onSubmit={onSubmit}
          locked={locked}
          hint={hint}
          onHint={onHint}
          hintPending={hintPending}
        />
      )}

      {question.level === 4 && (
        <>
          <div className="flex flex-col gap-2">
            <span className="hud-label">Điền vào chỗ trống</span>
            <p className="font-heading text-[26px] font-extrabold leading-snug tracking-tight md:text-[34px]">
              {question.sentence.split('______')[0]}
              <span
                className={cx(
                  'mx-1 inline-block min-w-24 rounded-[12px] border-b-4 px-2 text-center',
                  answer ? 'border-primary bg-raised text-primary' : 'border-ink/40 text-transparent',
                )}
              >
                {answer || '____'}
              </span>
              {question.sentence.split('______')[1]}
            </p>
          </div>
          <Options options={question.options} answer={answer} locked={locked} onAnswer={onAnswer} />
        </>
      )}
    </div>
  )
}
