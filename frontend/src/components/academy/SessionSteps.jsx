/*
 * Hai bước dùng chung của mọi phiên học có thẻ và câu hỏi (Khóa học của tôi, học bài Học Viện, luyện chặng, ôn tập):
 * - CardsStep: thẻ học từ mới (WordCard, vuốt ngang / phím mũi tên).
 * - QuestionsStep: câu hỏi 4 mức (QuestionView), nộp TỪNG câu lên server chấm (`submit(sessionId, answers)`), rồi hiện
 *   tấm phản hồi (FeedbackSheet). Chế độ test không hiện đúng/sai từng câu. Client không tự chấm.
 * `top(value, max)`: thanh trên của từng màn (tên khóa học / bài học, tiến độ).
 */

import { useCallback, useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowRight, SpeakerHigh } from '@phosphor-icons/react'
import Button from '../ui/Button'
import FeedbackSheet from './FeedbackSheet'
import QuestionView from './QuestionView'
import WordCard from './WordCard'
import { speak } from '../../utils/speech'

const SWIPE_THRESHOLD = 80

export function play(text, audioUrl, slow = false) {
  if (audioUrl) {
    const audio = new Audio(audioUrl)
    audio.playbackRate = slow ? 0.75 : 1
    audio.play().catch(() => {})
  } else if (text) speak(text, { rate: slow ? 0.6 : 0.9 })
}

export function toCardEntry(card) {
  return {
    word: card.headword,
    ipa: card.ipa,
    pos: card.pos,
    meaning: card.meaning_vi,
    definition: card.personal_note ? `Ghi chú của bạn: ${card.personal_note}` : null,
    example: card.example,
    collocations: card.collocations,
    family: card.word_family,
  }
}

export function CardsStep({ session, top, onFinish }) {
  const [index, setIndex] = useState(0)
  const [direction, setDirection] = useState(1)
  const cards = session.cards
  const card = cards[index]

  const go = useCallback(
    (delta) => {
      const target = index + delta
      if (target < 0) return
      if (target >= cards.length) {
        onFinish()
        return
      }
      setDirection(delta)
      setIndex(target)
      window.scrollTo({ top: 0 })
    },
    [index, cards.length, onFinish],
  )

  useEffect(() => {
    const onKey = (event) => {
      if (event.key === 'ArrowRight') go(1)
      if (event.key === 'ArrowLeft') go(-1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [go])

  return (
    <div className="flex min-h-dvh flex-col bg-bg">
      {top(index + 1, cards.length)}
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col overflow-x-clip px-4 pb-36 pt-5 md:px-8 md:pb-40 md:pt-8">
        <span className="hud-label mb-3 text-muted">Thẻ học · từ mới</span>
        <AnimatePresence mode="popLayout" initial={false} custom={direction}>
          <motion.div
            key={card.entry_id}
            initial={{ x: direction * 80, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: direction * -80, opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.6}
            onDragEnd={(_, info) => {
              if (info.offset.x < -SWIPE_THRESHOLD) go(1)
              else if (info.offset.x > SWIPE_THRESHOLD) go(-1)
            }}
            className="touch-pan-y"
          >
            <WordCard
              entry={toCardEntry(card)}
              level={card.cefr}
              tag={card.source === 'user' && <span className="rounded-pill border-2 border-line bg-gold px-2.5 font-display text-[13px] font-bold uppercase leading-6">Tự tạo</span>}
            />
          </motion.div>
        </AnimatePresence>
        <p className="mt-4 text-center text-caption text-muted md:hidden">Vuốt ngang để chuyển thẻ</p>
      </main>
      <div className="fixed inset-x-0 bottom-0 z-30 border-t-thick border-line bg-surface px-4 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-4 md:px-8">
        <div className="mx-auto flex max-w-3xl gap-3 md:justify-end">
          <Button variant="secondary" size="lg" icon={SpeakerHigh} className="shrink-0 px-5" onClick={() => play(card.headword, card.audio_url)}>
            <span className="hidden sm:inline">Nghe lại</span>
            <span className="sr-only sm:hidden">Nghe lại</span>
          </Button>
          <Button size="lg" iconRight={ArrowRight} className="flex-1 md:min-w-72 md:flex-none" onClick={() => go(1)}>
            {index === cards.length - 1 ? 'Vào luyện tập' : 'Đã hiểu, tiếp'}
          </Button>
        </div>
      </div>
    </div>
  )
}

export function QuestionsStep({ session, top, submit, onDone, onAnswered, note }) {
  const [index, setIndex] = useState(0)
  const [answer, setAnswer] = useState('')
  const [feedback, setFeedback] = useState(null)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState(null)
  const isTest = session.mode === 'test'
  const question = session.questions[index]

  useEffect(() => {
    if (question?.level === 2) play(null, question.audio_url)
  }, [question])

  const advance = (res) => {
    setFeedback(null)
    setAnswer('')
    if (res.finished) onDone(res)
    else setIndex((i) => i + 1)
  }

  const check = async () => {
    if (!answer.trim() || pending || feedback) return
    setPending(true)
    setError(null)
    try {
      const res = await submit(session.id, [{ question_id: question.id, answer }])
      onAnswered?.(res)
      const r = res.results[0]
      if (isTest) advance(res)
      else
        setFeedback({
          res,
          result: { correct: r.correct, correctAnswer: r.entry?.headword ?? r.correct_answer, meaning: r.entry?.meaning_vi, ipa: r.entry?.ipa, example: r.entry?.example },
        })
    } catch (err) {
      setError(err.message)
    } finally {
      setPending(false)
    }
  }

  return (
    <div className="flex min-h-dvh flex-col bg-bg">
      {top(index + (feedback ? 1 : 0), session.questions.length)}
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-4 pb-36 pt-5 md:px-8 md:pb-40 md:pt-8">
        <QuestionView
          key={question.id}
          question={question}
          answer={answer}
          onAnswer={setAnswer}
          onSubmit={check}
          locked={Boolean(feedback) || pending}
          onPlayAudio={({ slow }) => play(null, question.audio_url, slow)}
        />
        {error && (
          <p role="alert" className="mt-4 text-center font-semibold text-danger-deep">
            {error}
          </p>
        )}
      </main>
      {!feedback && (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t-thick border-line bg-surface px-4 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-4 md:px-8">
          <div className="mx-auto flex max-w-3xl items-center justify-between gap-4">
            <span className="hud-label hidden md:inline">{isTest ? 'Kiểm tra: kết quả hiện khi làm xong' : 'Phím 1–4 để chọn · Enter để kiểm tra'}</span>
            <Button size="lg" fullWidth className="md:w-auto md:min-w-64" disabled={!answer.trim() || pending} onClick={check}>
              {pending ? 'Đang chấm…' : isTest ? 'Trả lời' : 'Kiểm tra'}
            </Button>
          </div>
        </div>
      )}
      <AnimatePresence>
        {feedback && (
          <FeedbackSheet
            key={index}
            result={feedback.result}
            onContinue={() => advance(feedback.res)}
            note={feedback.res.results[0].became_mastered ? 'Bạn vừa thuộc từ này!' : (note ?? 'Từ này sẽ quay lại trong lượt ôn.')}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

