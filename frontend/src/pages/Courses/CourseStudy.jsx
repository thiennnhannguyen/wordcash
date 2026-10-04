/*
 * Màn học của "Khóa học của tôi" /courses/:id/study?mode=learn|review|quick|hard|test (toàn màn hình, ngoài PageShell).
 *
 * Bước thẻ học và câu hỏi dùng chung với Học Viện (components/academy/SessionSteps.jsx: WordCard, QuestionView, FeedbackSheet).
 * Thanh trên ghi tên khóa học và chế độ. Câu hỏi nhận từ server KHÔNG kèm đáp án; mỗi câu nộp lên server chấm rồi mới
 * hiện tấm phản hồi. Chế độ Kiểm tra không hiện đúng/sai từng câu, chỉ hiện điểm và đáp án khi nộp hết.
 * Màn kết thúc có thống kê và nút "Ôn lại từ sai" (phiên ôn nhanh chỉ gồm các từ sai, truyền qua location.state).
 */

import { useEffect, useState } from 'react'
import { useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { motion, useReducedMotion } from 'framer-motion'
import confetti from 'canvas-confetti'
import { ArrowLeft, ArrowsClockwise, CheckCircle, Crown, SpeakerHigh, Target, XCircle } from '@phosphor-icons/react'
import Button from '../../components/ui/Button'
import Icon, { IconBadge } from '../../components/ui/Icon'
import ProgressBar from '../../components/ui/ProgressBar'
import Sticker from '../../components/ui/Sticker'
import { CardsStep, QuestionsStep, play } from '../../components/academy/SessionSteps'
import MascotBlob from '../../components/collection/MascotBlob'
import * as coursesApi from '../../services/coursesApi'
import cx from '../../utils/cx'
import { courseIcon } from '../../utils/courseIcons'
import { MODES } from './courseUi'

function StudyTopBar({ course, mode, value, max, onExit }) {
  const modeLabel = MODES.find((m) => m.key === mode)?.label
  return (
    <header className="mx-auto flex w-full max-w-3xl flex-col gap-3 px-4 pt-4 md:px-8 md:pt-6">
      <div className="flex items-center gap-3">
        <button type="button" onClick={onExit} aria-label="Thoát phiên học" className="-ml-2 grid size-11 shrink-0 place-items-center rounded-pill text-muted hover:bg-raised hover:text-ink">
          <Icon icon={XCircle} size={30} />
        </button>
        <span className="flex min-w-0 items-center gap-2 rounded-pill border-2 border-line px-2 py-1 pr-3 text-ink" style={{ background: `var(--color-${course.color})` }}>
          <IconBadge icon={courseIcon(course.icon)} bg="surface" size="sm" shape="circle" shadow={false} className="!size-7" />
          <span className={cx('truncate font-display text-[13px] font-bold uppercase', course.color === 'primary' && 'text-white')}>{course.title}</span>
        </span>
        <span className="hud-label ml-auto shrink-0 text-muted">{modeLabel}</span>
      </div>
      {max > 0 && (
        <div className="flex items-center gap-3">
          <ProgressBar value={value} max={max} size="md" className="flex-1" />
          <span className="font-num shrink-0 text-base">
            {value}/{max}
          </span>
        </div>
      )}
    </header>
  )
}

function tokenColors(names) {
  const style = getComputedStyle(document.documentElement)
  return names.map((n) => style.getPropertyValue(`--color-${n}`).trim()).filter(Boolean)
}

function DoneScreen({ session, summary, onRetryWrong, onBack, onAgain }) {
  const reduceMotion = useReducedMotion()
  const great = summary.score >= 80
  const isTest = session.mode === 'test'

  useEffect(() => {
    if (reduceMotion || !great) return undefined
    const t = setTimeout(() => confetti({ particleCount: 80, spread: 75, origin: { y: 0.35 }, colors: tokenColors(['primary', 'accent', 'gold', 'sky']) }), 250)
    return () => clearTimeout(t)
  }, [reduceMotion, great])

  return (
    <div className={cx('min-h-dvh', great ? 'bg-accent' : 'bg-bg')}>
      <main className="mx-auto flex w-full max-w-2xl flex-col items-center gap-6 px-4 pb-12 pt-10 text-center">
        <div className="relative">
          <motion.div animate={reduceMotion || !great ? undefined : { y: [0, -24, 0] }} transition={{ duration: 0.9, repeat: Infinity, repeatDelay: 0.8 }}>
            <MascotBlob color={great ? 'primary' : 'sky'} shape="round" size={120} />
          </motion.div>
          <Sticker bg={great ? 'gold' : 'surface'} tilt={-8} className="absolute -left-16 top-2">
            {great ? 'Đỉnh!' : 'Cố lên!'}
          </Sticker>
        </div>
        <div className="flex flex-col gap-2">
          <span className="hud-label text-ink/70">
            {session.course.title} · {MODES.find((m) => m.key === session.mode)?.label}
          </span>
          <h1 className="text-[36px] leading-[1.05] md:text-[48px]">{isTest ? `Điểm: ${summary.score}/100` : `Đúng ${summary.correct}/${summary.total} câu`}</h1>
        </div>

        <div className="grid w-full grid-cols-3 gap-3">
          {[
            { icon: Target, bg: 'sky', value: `${summary.score}%`, label: 'Chính xác' },
            { icon: CheckCircle, bg: 'accent', value: summary.correct, label: 'Câu đúng' },
            { icon: Crown, bg: 'gold', value: summary.mastered_now, label: 'Từ vừa thuộc' },
          ].map((s) => (
            <div key={s.label} className="flex flex-col items-center gap-2 rounded-card border-thick border-line bg-surface p-3 shadow-hard md:flex-row md:text-left">
              <IconBadge icon={s.icon} bg={s.bg} size="md" shape="square" shadow={false} />
              <div className="leading-tight">
                <div className="font-num text-2xl">{s.value}</div>
                <div className="text-[13px] text-muted">{s.label}</div>
              </div>
            </div>
          ))}
        </div>

        {summary.wrong.length > 0 && (
          <section className="flex w-full flex-col gap-3 rounded-panel border-thick border-danger bg-surface p-4 text-left shadow-hard md:p-5">
            <h2 className="text-h3">{summary.wrong.length} từ cần ôn lại</h2>
            <ul className="flex flex-col divide-y-2 divide-line/10">
              {summary.wrong.map((w) => (
                <li key={w.id} className="flex items-center gap-3 py-2.5">
                  <button type="button" onClick={() => play(w.headword, w.audio_url)} aria-label={`Nghe phát âm ${w.headword}`} className="grid size-11 shrink-0 place-items-center rounded-pill border-thick border-line bg-sky">
                    <Icon icon={SpeakerHigh} size={20} color="ink" />
                  </button>
                  <div className="min-w-0 flex-1">
                    <div className="font-display text-lg font-bold">{w.headword}</div>
                    <div className="text-caption">{w.meaning_vi}</div>
                  </div>
                  {w.your_answer && (
                    <s className="max-w-[40%] truncate text-caption font-semibold text-danger-deep decoration-2" title={`Bạn trả lời: ${w.your_answer}`}>
                      {w.your_answer}
                    </s>
                  )}
                </li>
              ))}
            </ul>
          </section>
        )}

        <div className="flex w-full flex-col gap-3 md:flex-row md:justify-center">
          {summary.wrong.length > 0 && (
            <Button size="lg" variant="danger" icon={ArrowsClockwise} onClick={onRetryWrong}>
              Ôn lại từ sai
            </Button>
          )}
          {summary.wrong.length === 0 && (
            <Button size="lg" icon={ArrowsClockwise} onClick={onAgain}>
              Học tiếp
            </Button>
          )}
          <Button size="lg" variant="secondary" icon={ArrowLeft} onClick={onBack}>
            Về khóa học
          </Button>
        </div>
      </main>
    </div>
  )
}

export default function CourseStudy() {
  const { id } = useParams()
  const [params] = useSearchParams()
  const location = useLocation()
  const navigate = useNavigate()
  const mode = params.get('mode') ?? 'learn'
  const entryIds = location.state?.entryIds ?? null
  const [session, setSession] = useState(null)
  const [error, setError] = useState(null)
  const [step, setStep] = useState('loading')
  const [summary, setSummary] = useState(null)

  useEffect(() => {
    let alive = true
    setStep('loading')
    setSummary(null)
    coursesApi
      .startSession(id, { mode, ...(entryIds ? { entry_ids: entryIds } : {}) })
      .then((s) => {
        if (!alive) return
        setSession(s)
        setStep(s.cards.length ? 'cards' : 'questions')
      })
      .catch((err) => alive && setError(err))
    return () => {
      alive = false
    }
    // location.key: bấm "Ôn lại từ sai" mở phiên mới cùng đường dẫn
  }, [id, mode, location.key]) // eslint-disable-line react-hooks/exhaustive-deps

  const back = () => navigate(`/courses/${id}`)

  if (error) {
    const reason = error.details?.reason
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-5 bg-bg px-4 text-center">
        <MascotBlob color="sky" shape="round" size={110} />
        <h1 className="text-h2">{error.code === 'NOTHING_TO_STUDY' ? (reason === 'daily_limit' ? 'Hôm nay đủ từ mới rồi!' : 'Chưa có từ cho chế độ này') : 'Chưa bắt đầu được'}</h1>
        <p className="max-w-md text-muted">
          {error.code === 'NOTHING_TO_STUDY'
            ? reason === 'daily_limit'
              ? 'Bạn đã học đủ số từ mới cho hôm nay. Ôn lại các từ đã học để nhớ lâu hơn nhé.'
              : 'Thử chế độ khác hoặc thêm từ vào khóa học.'
            : error.message}
        </p>
        <Button icon={ArrowLeft} onClick={back}>
          Về khóa học
        </Button>
      </div>
    )
  }
  if (step === 'loading' || !session) return <div className="min-h-dvh bg-bg" aria-busy="true" />
  const top = (value, max) => <StudyTopBar course={session.course} mode={session.mode} value={value} max={max} onExit={back} />
  if (step === 'cards') return <CardsStep session={session} top={top} onFinish={() => setStep('questions')} />
  if (step === 'questions')
    return (
      <QuestionsStep
        session={session}
        top={top}
        submit={coursesApi.submitAnswers}
        onDone={(res) => {
          setSummary(res.summary)
          setStep('done')
        }}
      />
    )
  return (
    <DoneScreen
      session={session}
      summary={summary}
      onBack={back}
      onAgain={() => navigate(`/courses/${id}/study?mode=quick`, { replace: true })}
      onRetryWrong={() => navigate(`/courses/${id}/study?mode=quick`, { replace: true, state: { entryIds: summary.wrong.map((w) => w.id) } })}
    />
  )
}
