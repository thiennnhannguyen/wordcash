/*
 * Cửa Ải Hôm Nay: 2–5 câu bắt buộc mỗi ngày.
 *
 * Luồng: màn mở đầu → từng câu hỏi (phản hồi trượt từ đáy lên) → màn kết quả. Không có nút bỏ qua,
 * không có đồng hồ đếm ngược. Mọi đúng/sai, mức trừ từ thuộc và streak do server quyết định (hiện là dailyCheckMock).
 *
 * Dev: `?streak=13` để thử mốc 7 ngày; `?preview=perfect|milestone|mistake` mở thẳng màn kết quả.
 */

import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { AnimatePresence } from 'framer-motion'
import { Fire, LockKeyOpen } from '@phosphor-icons/react'
import Button from '../../components/ui/Button'
import Icon from '../../components/ui/Icon'
import { Wordmark } from '../../components/layout/NavBar'
import cx from '../../utils/cx'
import { fetchDailyCheck, finishDailyCheck, PREVIEW_RESULTS, submitAnswer } from './dailyCheckMock'
import DailyCheckResult from './DailyCheckResult'
import FeedbackSheet from '../../components/academy/FeedbackSheet'
import GateIllustration from './GateIllustration'
import QuestionCard from './QuestionCard'

function ProgressDots({ total, results, current }) {
  return (
    <ol className="flex items-center gap-2.5" aria-label={`Câu ${current + 1} trên ${total}`}>
      {Array.from({ length: total }, (_, i) => {
        const r = results[i]
        return (
          <li
            key={i}
            aria-label={r ? (r.correct ? `Câu ${i + 1}: đúng` : `Câu ${i + 1}: sai`) : `Câu ${i + 1}`}
            className={cx(
              'size-5 rounded-pill border-thick border-line transition-colors md:size-6',
              r ? (r.correct ? 'bg-accent' : 'bg-danger') : i === current ? 'bg-primary' : 'bg-surface',
            )}
          />
        )
      })}
    </ol>
  )
}

function Intro({ data, onStart }) {
  const count = data.questions.length

  return (
    <div className="flex min-h-dvh flex-col bg-gold">
      <header className="px-4 pt-5 md:px-8 md:pt-8">
        <Wordmark className="text-xl" />
      </header>
      <main className="mx-auto flex w-full max-w-xl flex-1 flex-col items-center justify-center gap-6 px-4 pb-36 pt-6 text-center md:pb-12">
        <div className="w-full max-w-[280px] md:max-w-[340px]">
          <GateIllustration />
        </div>
        <div className="flex flex-col gap-2">
          <h1 className="font-display text-[40px] font-bold uppercase leading-none tracking-wide md:text-[56px]">Cửa Ải Hôm Nay</h1>
          <p className="text-lg font-semibold">{count} từ đang chờ bạn trả bài</p>
        </div>
        <div className="flex flex-col items-center gap-2">
          <span className="inline-flex h-16 items-center gap-3 rounded-pill border-thick border-line bg-surface pl-2 pr-6 shadow-hard">
            <span className="grid size-12 place-items-center rounded-pill border-thick border-line bg-orange">
              <Icon icon={Fire} size={28} color="ink" />
            </span>
            <span className="font-num text-[28px] uppercase">{data.streak} ngày</span>
          </span>
          <p className="font-medium">Đúng hết để lên {data.streak + 1} ngày</p>
        </div>
        <div className="fixed inset-x-0 bottom-0 z-30 border-t-thick border-line bg-gold px-4 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-4 md:static md:w-auto md:border-0 md:p-0">
          <Button size="lg" icon={LockKeyOpen} fullWidth className="md:w-auto md:min-w-80" onClick={onStart}>
            Mở cửa ải
          </Button>
        </div>
      </main>
    </div>
  )
}

export default function DailyCheck() {
  const [params] = useSearchParams()
  const preview = params.get('preview')
  const streakParam = Number(params.get('streak')) || undefined

  const [data, setData] = useState(null)
  const [phase, setPhase] = useState('intro') // intro | question | result
  const [index, setIndex] = useState(0)
  const [answer, setAnswer] = useState('')
  const [feedback, setFeedback] = useState(null)
  const [results, setResults] = useState([])
  const [pending, setPending] = useState(false)
  const [finalResult, setFinalResult] = useState(null)

  useEffect(() => {
    fetchDailyCheck({ streak: streakParam }).then(setData)
  }, [streakParam])

  if (preview && PREVIEW_RESULTS[preview]) return <DailyCheckResult result={PREVIEW_RESULTS[preview]} />
  if (!data) return <div className="min-h-dvh bg-gold" aria-busy="true" />
  if (phase === 'intro') return <Intro data={data} onStart={() => setPhase('question')} />
  if (phase === 'result' && finalResult) return <DailyCheckResult result={finalResult} />

  const question = data.questions[index]
  const total = data.questions.length

  const check = async () => {
    if (!answer.trim() || pending || feedback) return
    setPending(true)
    const res = await submitAnswer(question.id, answer)
    setPending(false)
    setResults((r) => [...r, res])
    setFeedback(res)
  }

  const next = async () => {
    setFeedback(null)
    setAnswer('')
    if (index + 1 < total) {
      setIndex((i) => i + 1)
      return
    }
    const summary = await finishDailyCheck({ streak: data.streak, results })
    setFinalResult(summary)
    setPhase('result')
    window.scrollTo({ top: 0 })
  }

  return (
    <div className="flex min-h-dvh flex-col bg-bg">
      <header className="mx-auto flex w-full max-w-3xl items-center justify-between gap-4 px-4 pt-5 md:px-8 md:pt-8">
        <span className="font-display text-sm font-bold uppercase tracking-wide">
          Cửa Ải · Câu {index + 1}/{total}
        </span>
        <ProgressDots total={total} results={results} current={index} />
      </header>

      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-4 pb-36 pt-5 md:px-8 md:pb-40 md:pt-10">
        <QuestionCard
          key={question.id}
          question={question}
          answer={answer}
          onAnswer={setAnswer}
          onSubmit={check}
          locked={!!feedback || pending}
        />
      </main>

      {!feedback && (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t-thick border-line bg-surface px-4 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-4 md:px-8">
          <div className="mx-auto flex max-w-3xl justify-end">
            <Button size="lg" fullWidth className="md:w-auto md:min-w-64" disabled={!answer.trim() || pending} onClick={check}>
              {pending ? 'Đang chấm…' : 'Kiểm tra'}
            </Button>
          </div>
        </div>
      )}

      <AnimatePresence>{feedback && <FeedbackSheet key={index} result={feedback} onContinue={next} />}</AnimatePresence>
    </div>
  )
}
