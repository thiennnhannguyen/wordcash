/*
 * Học một bài Học Viện bằng dữ liệu thật: /academy/lesson?unit=<id>.
 *
 * POST /academy/units/{id}/learn-sessions → thẻ học các từ mới (giới hạn từ mới mỗi ngày) → luyện đủ các mức, nộp từng câu
 * lên server chấm → màn hoàn thành (LessonDone) có nút "Làm kiểm tra cuối bài". Hết từ mới thì server trả phiên luyện lại cả bài.
 * Giao diện dùng chung với Khóa học của tôi (components/academy/SessionSteps.jsx). Bản mock (VITE_USE_MOCK=true) là Lesson.jsx.
 */

import { useState } from 'react'
import useStartOnce from '../../hooks/useStartOnce'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { MapTrifold } from '@phosphor-icons/react'
import Button from '../../components/ui/Button'
import Modal from '../../components/ui/Modal'
import MascotBlob from '../../components/collection/MascotBlob'
import RewardsLayer from '../../components/academy/RewardsLayer'
import { CardsStep, QuestionsStep } from '../../components/academy/SessionSteps'
import { getUnit, startLearn, submitAnswers } from '../../services/academyApi'
import { useToastStore } from '../../store/toastStore'
import LessonDone from './LessonDone'
import LessonTopBar from './LessonTopBar'

const REASON_TEXT = {
  daily_limit: 'Hôm nay bạn đã học đủ từ mới. Phiên này luyện lại các từ của bài.',
  all_learned: 'Bạn đã học hết từ mới của bài. Phiên này luyện lại để nhớ chắc hơn.',
}

export function AcademyError({ error, onBack }) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-5 bg-bg px-4 text-center">
      <MascotBlob color="sky" shape="round" size={110} />
      <h1 className="text-h2">{error.code === 'UNIT_LOCKED' || error.code === 'TOPIC_LOCKED' ? 'Phần này chưa mở' : 'Chưa bắt đầu được'}</h1>
      <p className="max-w-md text-muted">{error.message}</p>
      <Button icon={MapTrifold} onClick={onBack}>
        Về bản đồ
      </Button>
    </div>
  )
}

export default function AcademyLesson() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const unitId = params.get('unit')
  const [unit, setUnit] = useState(null)
  const [session, setSession] = useState(null)
  const [step, setStep] = useState('loading')
  const [error, setError] = useState(null)
  const [summary, setSummary] = useState(null)
  const [rewards, setRewards] = useState(null)
  const [exitOpen, setExitOpen] = useState(false)
  const [streak, setStreak] = useState({ now: 0, max: 0 })

  useStartOnce(() => {
    if (!unitId) {
      navigate('/academy', { replace: true })
      return
    }
    Promise.all([getUnit(unitId), startLearn(unitId)])
      .then(([u, s]) => {
        setUnit(u)
        setSession(s)
        if (s.reason) useToastStore.getState().push({ variant: 'info', title: 'Luyện lại cả bài', message: REASON_TEXT[s.reason] })
        setStep(s.cards.length ? 'cards' : 'questions')
      })
      .catch(setError)
  }, [unitId])

  const back = () => navigate(`/academy?level=${unit?.level.code ?? ''}`)
  if (error) return <AcademyError error={error} onBack={() => navigate('/academy')} />
  if (step === 'loading' || !session) return <div className="min-h-dvh bg-bg" aria-busy="true" />

  const lesson = { id: unit.id, level: unit.level.code, topic: unit.topic.title, number: unit.position }
  const top = (label) => (value, max) => <LessonTopBar value={value} max={max} label={label} combo={step === 'questions' ? streak.now : 0} onExit={() => setExitOpen(true)} />

  let screen
  if (step === 'cards') screen = <CardsStep session={session} top={top('Thẻ học')} onFinish={() => setStep('questions')} />
  else if (step === 'questions')
    screen = (
      <>
        <QuestionsStep
          session={session}
          top={top(`Bài ${unit.position}: ${unit.title}`)}
          submit={submitAnswers}
          onAnswered={(res) => {
            const ok = res.results[0]?.correct
            setStreak((c) => ({ now: ok ? c.now + 1 : 0, max: Math.max(c.max, ok ? c.now + 1 : 0) }))
            if (res.rewards?.spins?.length || res.rewards?.rank) setRewards(res.rewards)
          }}
          onDone={(res) => {
            setSummary({ learned: session.cards.length, accuracy: res.summary.score, maxCombo: Math.max(streak.max, 0) })
            setStep('done')
            window.scrollTo({ top: 0 })
          }}
        />
      </>
    )
  else screen = <LessonDone summary={summary} lesson={lesson} />

  return (
    <>
      {screen}
      <RewardsLayer rewards={rewards} />
      <Modal
        open={exitOpen}
        onClose={() => setExitOpen(false)}
        title="Thoát bài học?"
        footer={
          <>
            <Button variant="secondary" onClick={back}>
              Thoát
            </Button>
            <Button onClick={() => setExitOpen(false)}>Học tiếp</Button>
          </>
        }
      >
        Những câu đã trả lời vẫn được lưu vào tiến độ. Phần còn lại bạn học tiếp lần sau nhé.
      </Modal>
    </>
  )
}
