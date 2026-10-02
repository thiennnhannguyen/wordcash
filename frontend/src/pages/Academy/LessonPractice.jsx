/*
 * Phần luyện tập của bài học: đủ 4 mức câu hỏi trong cùng một khung, phản hồi trượt từ đáy lên,
 * bộ đếm combo ở góc. Chấm điểm, gợi ý và âm thanh lấy từ server (hiện là lessonMock).
 */

import { useEffect, useState } from 'react'
import { AnimatePresence } from 'framer-motion'
import Button from '../../components/ui/Button'
import FeedbackSheet from '../../components/academy/FeedbackSheet'
import QuestionView from '../../components/academy/QuestionView'
import { fetchPractice, finishLesson, playQuestionAudio, requestHint, submitPracticeAnswer } from './lessonMock'
import LessonTopBar from './LessonTopBar'

export default function LessonPractice({ startAt = 0, onDone, onExit }) {
  const [questions, setQuestions] = useState(null)
  const [index, setIndex] = useState(startAt)
  const [answer, setAnswer] = useState('')
  const [hint, setHint] = useState('')
  const [hintPending, setHintPending] = useState(false)
  const [feedback, setFeedback] = useState(null)
  const [pending, setPending] = useState(false)
  const [results, setResults] = useState([])
  const [combo, setCombo] = useState(0)
  const [maxCombo, setMaxCombo] = useState(0)

  useEffect(() => {
    fetchPractice().then(setQuestions)
  }, [])

  const question = questions?.[index]

  // Câu nghe: tự phát âm khi vào câu
  useEffect(() => {
    if (question?.level === 2) playQuestionAudio(question.id)
  }, [question])

  if (!questions) return <div className="min-h-dvh bg-bg" aria-busy="true" />

  const check = async () => {
    if (!answer.trim() || pending || feedback) return
    setPending(true)
    const res = await submitPracticeAnswer(question.id, answer)
    setPending(false)
    setResults((r) => [...r, res])
    const nextCombo = res.correct ? combo + 1 : 0
    setCombo(nextCombo)
    setMaxCombo((m) => Math.max(m, nextCombo))
    setFeedback(res)
  }

  const next = async () => {
    setFeedback(null)
    setAnswer('')
    setHint('')
    if (index + 1 < questions.length) {
      setIndex((i) => i + 1)
      return
    }
    onDone(await finishLesson({ results, maxCombo }))
  }

  const askHint = async () => {
    setHintPending(true)
    const prefix = await requestHint(question.id, hint.length)
    setHintPending(false)
    setHint(prefix)
    setAnswer((a) => (a.startsWith(prefix) ? a : prefix))
  }

  return (
    <div className="flex min-h-dvh flex-col bg-bg">
      <LessonTopBar value={index + (feedback ? 1 : 0)} max={questions.length} label="Luyện tập" combo={combo} onExit={onExit} />

      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-4 pb-36 pt-5 md:px-8 md:pb-40 md:pt-8">
        <QuestionView
          key={question.id}
          question={question}
          answer={answer}
          onAnswer={setAnswer}
          onSubmit={check}
          locked={!!feedback || pending}
          hint={hint}
          onHint={askHint}
          hintPending={hintPending}
          onPlayAudio={(opts) => playQuestionAudio(question.id, opts)}
        />
      </main>

      {!feedback && (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t-thick border-line bg-surface px-4 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-4 md:px-8">
          <div className="mx-auto flex max-w-3xl items-center justify-between gap-4">
            <span className="hud-label hidden md:inline">Phím 1–4 để chọn · Enter để kiểm tra</span>
            <Button size="lg" fullWidth className="md:w-auto md:min-w-64" disabled={!answer.trim() || pending} onClick={check}>
              {pending ? 'Đang chấm…' : 'Kiểm tra'}
            </Button>
          </div>
        </div>
      )}

      <AnimatePresence>
        {feedback && <FeedbackSheet key={index} result={feedback} onContinue={next} note="Từ này sẽ quay lại trong phần ôn tập." />}
      </AnimatePresence>
    </div>
  )
}
