/*
 * Chế độ "Trong ngữ cảnh": đọc đoạn văn ngắn, các mục từ của bài được gạch chân màu; bấm vào từ để xem nghĩa.
 * Bên dưới là 3 câu hỏi hiểu bài, nộp một lần; server chấm (hiện là lessonMock).
 */

import { Fragment, useEffect, useState } from 'react'
import { CheckFat, SpeakerHigh, XCircle } from '@phosphor-icons/react'
import Button from '../../components/ui/Button'
import Icon from '../../components/ui/Icon'
import { AnswerOption } from '../../components/game/AnswerOptions'
import cx from '../../utils/cx'
import { speak } from '../../utils/speech'
import { CONTEXT_PASSAGE, CONTEXT_QUESTIONS, ENTRY_BY_WORD, finishLesson, submitContextAnswers } from './lessonMock'
import LessonTopBar from './LessonTopBar'

const UNDERLINE_COLORS = ['var(--color-primary)', 'var(--color-orange)', 'var(--color-sky)', 'var(--color-danger)']

// "[[chữ hiện|mục từ]]" → token
function parsePassage(text) {
  const tokens = []
  const pattern = /\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g
  let last = 0
  let match
  while ((match = pattern.exec(text))) {
    if (match.index > last) tokens.push({ text: text.slice(last, match.index) })
    tokens.push({ text: match[1], word: match[2] ?? match[1] })
    last = pattern.lastIndex
  }
  if (last < text.length) tokens.push({ text: text.slice(last) })
  return tokens
}

function GlossWord({ token, colorIndex, open, onToggle }) {
  const entry = ENTRY_BY_WORD[token.word]
  return (
    <span className="relative inline-block">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className={cx('rounded-[6px] px-0.5 font-semibold underline decoration-[3px] underline-offset-4 transition-colors', open && 'bg-raised')}
        style={{ textDecorationColor: UNDERLINE_COLORS[colorIndex % UNDERLINE_COLORS.length] }}
      >
        {token.text}
      </button>
      {open && entry && (
        <span
          role="tooltip"
          className="absolute left-1/2 top-full z-20 mt-2 flex w-56 -translate-x-1/2 flex-col gap-1 rounded-[16px] border-thick border-line bg-surface p-3 text-left text-base shadow-hard"
        >
          <span className="flex items-center justify-between gap-2">
            <span className="font-display text-lg font-bold">{entry.word}</span>
            <button
              type="button"
              onClick={() => speak(entry.word)}
              aria-label={`Nghe phát âm ${entry.word}`}
              className="grid size-9 place-items-center rounded-pill border-2 border-line bg-sky"
            >
              <Icon icon={SpeakerHigh} size={18} color="ink" />
            </button>
          </span>
          <span className="text-caption text-muted">
            {entry.ipa} · {entry.pos}
          </span>
          <span className="font-bold">{entry.meaning}</span>
        </span>
      )}
    </span>
  )
}

export default function LessonContext({ onDone, onExit }) {
  const tokens = parsePassage(CONTEXT_PASSAGE)
  const [openIndex, setOpenIndex] = useState(null)
  const [answers, setAnswers] = useState({})
  const [graded, setGraded] = useState(null)
  const [pending, setPending] = useState(false)

  // Bấm ra ngoài hoặc Esc để đóng popover nghĩa
  useEffect(() => {
    if (openIndex == null) return undefined
    const close = (event) => {
      if (event.type === 'keydown' && event.key !== 'Escape') return
      if (event.type === 'pointerdown' && event.target.closest('[aria-expanded], [role="tooltip"]')) return
      setOpenIndex(null)
    }
    window.addEventListener('pointerdown', close)
    window.addEventListener('keydown', close)
    return () => {
      window.removeEventListener('pointerdown', close)
      window.removeEventListener('keydown', close)
    }
  }, [openIndex])

  const answeredCount = Object.keys(answers).length
  const allAnswered = answeredCount === CONTEXT_QUESTIONS.length

  const submit = async () => {
    setPending(true)
    setGraded(await submitContextAnswers(answers))
    setPending(false)
  }

  const finish = async () => {
    const results = Object.values(graded)
    onDone(await finishLesson({ results, maxCombo: 0 }))
  }

  let glossCount = 0

  return (
    <div className="flex min-h-dvh flex-col bg-bg">
      <LessonTopBar value={graded ? CONTEXT_QUESTIONS.length : answeredCount} max={CONTEXT_QUESTIONS.length} label="Trong ngữ cảnh" onExit={onExit} />

      <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 pb-36 pt-5 md:px-8 md:pb-40 md:pt-8">
        <article className="rounded-panel border-thick border-line bg-surface p-5 shadow-hard-lg md:p-8">
          <span className="hud-label">Đọc đoạn văn · bấm vào từ gạch chân để xem nghĩa</span>
          <h1 className="mb-4 mt-1 text-[26px] md:text-[32px]">Minh's first interview</h1>
          <p className="text-lg leading-[1.9] md:text-xl">
            {tokens.map((token, i) =>
              token.word ? (
                <GlossWord
                  key={i}
                  token={token}
                  colorIndex={glossCount++}
                  open={openIndex === i}
                  onToggle={() => setOpenIndex(openIndex === i ? null : i)}
                />
              ) : (
                <Fragment key={i}>{token.text}</Fragment>
              ),
            )}
          </p>
        </article>

        <section aria-label="Câu hỏi hiểu bài" className="flex flex-col gap-5">
          {CONTEXT_QUESTIONS.map((q, qi) => {
            const result = graded?.[q.id]
            return (
              <div key={q.id} className="flex flex-col gap-3 rounded-card border-thick border-line bg-surface p-5 shadow-hard">
                <h2 className="flex items-start gap-2 text-xl">
                  <span className="font-num text-primary">{qi + 1}.</span>
                  {q.question}
                </h2>
                <div role="radiogroup" aria-label={q.question} className="grid gap-2.5 sm:grid-cols-2">
                  {q.options.map((option, i) => {
                    let state = answers[q.id] === option ? 'selected' : 'idle'
                    if (result) {
                      if (option === result.correctAnswer) state = 'correct'
                      else if (answers[q.id] === option) state = 'wrong'
                      else state = 'idle'
                    }
                    return (
                      <AnswerOption
                        key={option}
                        index={i}
                        label={option}
                        size="sm"
                        state={state}
                        disabled={!!graded}
                        onClick={() => setAnswers((a) => ({ ...a, [q.id]: option }))}
                      />
                    )
                  })}
                </div>
                {result && (
                  <p className={cx('flex items-center gap-2 font-semibold', result.correct ? 'text-accent-deep' : 'text-danger-deep')}>
                    <Icon icon={result.correct ? CheckFat : XCircle} size={20} />
                    {result.correct ? 'Chính xác' : 'Chưa đúng, đáp án đã được đánh dấu xanh.'}
                  </p>
                )}
              </div>
            )
          })}
        </section>
      </main>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t-thick border-line bg-surface px-4 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-4 md:px-8">
        <div className="mx-auto flex max-w-3xl justify-end">
          {graded ? (
            <Button size="lg" fullWidth className="md:w-auto md:min-w-64" onClick={finish}>
              Hoàn thành
            </Button>
          ) : (
            <Button size="lg" fullWidth className="md:w-auto md:min-w-64" disabled={!allAnswered || pending} onClick={submit}>
              {pending ? 'Đang chấm…' : `Nộp bài (${answeredCount}/${CONTEXT_QUESTIONS.length})`}
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
