/*
 * Phiên luyện không mở khóa gì, dùng dữ liệu thật:
 * - `kind="practice"`: /academy/practice?topic=<id>&level=<mã cấp> — luyện chặng (yếu), ≥ 10 câu, lộ đáp án từng câu.
 *   Trả lời hết là hoàn thành; server cho biết đã đủ điều kiện đánh lại Boss chưa (`outcome.boss_retry`).
 * - `kind="review"`: /academy/review/session — ôn mọi từ đến hạn (từ hệ thống + từ tự tạo của mình).
 * Sai chỉ đặt lại lịch ôn (luật ghi nhớ thống nhất), không làm mất "đã thuộc". Giao diện câu hỏi: components/academy/SessionSteps.jsx.
 */

import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowLeft, Barbell, BookOpenText, CheckCircle, Sword, Target } from '@phosphor-icons/react'
import Button from '../../components/ui/Button'
import { IconBadge } from '../../components/ui/Icon'
import MascotBlob from '../../components/collection/MascotBlob'
import RewardsLayer from '../../components/academy/RewardsLayer'
import { QuestionsStep } from '../../components/academy/SessionSteps'
import { startPractice, startReview, submitAnswers } from '../../services/academyApi'
import { AcademyError } from './AcademyLesson'
import LessonTopBar from './LessonTopBar'

function Done({ kind, res, level, onBack }) {
  const navigate = useNavigate()
  const retry = res.outcome?.boss_retry
  const weakLeft = retry?.weak_topics?.filter((w) => !w.practiced) ?? []
  return (
    <div className="min-h-dvh bg-bg">
      <main className="mx-auto flex w-full max-w-xl flex-col items-center gap-6 px-4 pb-12 pt-12 text-center">
        <MascotBlob color={res.summary.score >= 80 ? 'accent' : 'sky'} shape="round" size={120} />
        <div className="flex flex-col gap-2">
          <span className="hud-label">{kind === 'practice' ? 'Luyện chặng' : 'Ôn tập'} · Hoàn thành</span>
          <h1 className="text-[34px] leading-tight md:text-[44px]">
            Đúng {res.summary.correct}/{res.summary.total} câu
          </h1>
        </div>
        <div className="grid w-full grid-cols-2 gap-3">
          {[
            { icon: Target, bg: 'sky', value: `${res.summary.score}%`, label: 'Chính xác' },
            { icon: CheckCircle, bg: 'accent', value: res.summary.mastered_now, label: 'Từ vừa thuộc' },
          ].map((s) => (
            <div key={s.label} className="flex items-center gap-3 rounded-card border-thick border-line bg-surface p-3 text-left shadow-hard">
              <IconBadge icon={s.icon} bg={s.bg} size="md" shape="square" shadow={false} />
              <div className="leading-tight">
                <div className="font-num text-2xl">{s.value}</div>
                <div className="text-[13px] text-muted">{s.label}</div>
              </div>
            </div>
          ))}
        </div>
        {retry && (
          <section className="w-full rounded-panel border-thick border-line bg-surface p-4 text-left shadow-hard" aria-live="polite">
            <h2 className="text-h3">{retry.allowed ? 'Sẵn sàng đánh lại Boss!' : 'Còn chặng yếu cần luyện'}</h2>
            <p className="mt-1 text-caption text-muted">
              {retry.allowed
                ? 'Bạn đã luyện đủ các chặng yếu, có thể vào Trận Boss ngay.'
                : `Luyện thêm: ${weakLeft.map((w) => w.title).join(', ')} — hoặc chờ hết thời gian hồi sức của Boss.`}
            </p>
          </section>
        )}
        <div className="flex w-full flex-col gap-3 md:flex-row md:justify-center">
          {retry?.allowed && (
            <Button size="lg" icon={Sword} onClick={() => navigate(`/academy/boss?level=${level}`)}>
              Đánh lại Boss
            </Button>
          )}
          {retry && !retry.allowed && weakLeft[0] && (
            <Button size="lg" icon={Barbell} onClick={() => navigate(`/academy/practice?topic=${weakLeft[0].id}&level=${level}`, { replace: true })}>
              Luyện {weakLeft[0].title}
            </Button>
          )}
          <Button size="lg" variant="secondary" icon={kind === 'review' ? BookOpenText : ArrowLeft} onClick={onBack}>
            {kind === 'review' ? 'Về trang Ôn tập' : 'Về bản đồ'}
          </Button>
        </div>
      </main>
    </div>
  )
}

export default function AcademyStudy({ kind }) {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const topicId = params.get('topic')
  const level = params.get('level') ?? ''
  const [session, setSession] = useState(null)
  const [error, setError] = useState(null)
  const [done, setDone] = useState(null)
  const [rewards, setRewards] = useState(null)

  useEffect(() => {
    setSession(null)
    setDone(null)
    const start = kind === 'practice' ? startPractice(topicId) : startReview()
    start.then(setSession).catch(setError)
  }, [kind, topicId])

  const back = () => navigate(kind === 'review' ? '/academy/review' : `/academy?level=${level}`)
  if (error) {
    if (error.code === 'NOTHING_TO_STUDY')
      return <AcademyError error={{ ...error, message: kind === 'review' ? 'Chưa có từ nào đến hạn ôn. Quay lại sau nhé!' : error.message }} onBack={back} />
    return <AcademyError error={error} onBack={back} />
  }
  if (done) return <Done kind={kind} res={done} level={level} onBack={back} />
  if (!session) return <div className="min-h-dvh bg-bg" aria-busy="true" />

  return (
    <>
      <QuestionsStep
        session={session}
        top={(value, max) => <LessonTopBar value={value} max={max} label={kind === 'practice' ? 'Luyện chặng yếu' : 'Ôn tập'} onExit={back} />}
        submit={submitAnswers}
        note={kind === 'practice' ? 'Ghi nhớ đáp án đúng nhé, Boss sẽ hỏi lại!' : undefined}
        onAnswered={(res) => (res.rewards?.spins?.length || res.rewards?.rank) && setRewards(res.rewards)}
        onDone={setDone}
      />
      <RewardsLayer rewards={rewards} />
    </>
  )
}
