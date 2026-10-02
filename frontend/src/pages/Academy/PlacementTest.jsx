/*
 * Kiểm tra xếp lớp đầu vào.
 *
 * Ba màn: giới thiệu (linh vật cầm kính lúp, 3 ý chính, nút Bắt đầu) → câu hỏi (khung như luyện tập, thêm nút
 * "Tôi chưa biết từ này", thanh tiến độ và thanh độ khó A1–C2 dịch chuyển) → kết quả (thang 6 cấp, mũi tên
 * rơi xuống cấp ước tính). Server chọn câu kế tiếp, chấm và ước tính trình độ; client không hiện đúng/sai.
 * Mở khóa tới cấp ước tính, nhưng từ ở các cấp bỏ qua không tự tính là đã thuộc.
 *
 * Dev: `?step=intro|test|result`, `&q=12` (vào câu 13).
 */

import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { motion, useReducedMotion } from 'framer-motion'
import confetti from 'canvas-confetti'
import { ArrowDown, ArrowRight, HandPalm, Info, Plant, Play, Timer, TrendUp, XCircle } from '@phosphor-icons/react'
import Button from '../../components/ui/Button'
import Icon, { IconBadge } from '../../components/ui/Icon'
import Modal from '../../components/ui/Modal'
import ProgressBar from '../../components/ui/ProgressBar'
import Sticker from '../../components/ui/Sticker'
import MascotBlob from '../../components/collection/MascotBlob'
import QuestionView from '../../components/academy/QuestionView'
import cx from '../../utils/cx'
import { LEVELS, LEVEL_NAMES } from '../../utils/constants'
import { PLACEMENT_TOTAL, PREVIEW_RESULT, finishPlacement, playPlacementAudio, startPlacement, submitPlacementAnswer } from './placementMock'

const DARK_LEVELS = new Set(['C1', 'C2'])

function tokenColors(names) {
  const style = getComputedStyle(document.documentElement)
  return names.map((n) => style.getPropertyValue(`--color-${n}`).trim()).filter(Boolean)
}

/** Linh vật cầm kính lúp (placeholder, vẽ bằng khối). */
function MascotDetective() {
  const reduceMotion = useReducedMotion()
  return (
    <div className="relative mx-auto w-fit">
      <MascotBlob color="primary" shape="round" size={220} className="size-40 md:size-[220px]" />
      <motion.svg
        viewBox="0 0 100 100"
        className="absolute -right-8 bottom-4 size-24 md:-right-10 md:size-32"
        aria-hidden="true"
        animate={reduceMotion ? undefined : { rotate: [-6, 8, -6], x: [0, -6, 0] }}
        transition={{ duration: 2.6, repeat: Infinity, ease: 'easeInOut' }}
      >
        <rect x="10" y="62" width="14" height="40" rx="7" transform="rotate(-45 17 82)" fill="var(--color-orange)" stroke="var(--color-ink)" strokeWidth="5" />
        <circle cx="58" cy="42" r="30" fill="var(--color-surface)" stroke="var(--color-ink)" strokeWidth="6" />
        <circle cx="58" cy="42" r="23" fill="var(--color-sky)" opacity="0.45" />
        <path d="M44 32 Q50 24 60 24" fill="none" stroke="var(--color-white)" strokeWidth="5" strokeLinecap="round" />
      </motion.svg>
      <Sticker bg="gold" tilt={-8} size="md" wiggle className="absolute -left-6 top-2">
        A1…C2?
      </Sticker>
    </div>
  )
}

const POINTS = [
  { icon: Timer, bg: 'sky', text: `${PLACEMENT_TOTAL} câu · ~10 phút` },
  { icon: TrendUp, bg: 'accent', text: 'Câu hỏi khó dần theo câu trả lời của bạn' },
  { icon: HandPalm, bg: 'gold', text: 'Không biết thì bấm “Tôi chưa biết từ này”, đừng đoán' },
]

function Intro({ onStart, onExit }) {
  return (
    <div className="flex min-h-dvh flex-col bg-bg">
      <header className="mx-auto flex w-full max-w-5xl px-4 pt-4 md:px-8 md:pt-6">
        <button type="button" onClick={onExit} aria-label="Thoát" className="-ml-2 grid size-11 place-items-center rounded-pill text-muted hover:bg-raised hover:text-ink">
          <Icon icon={XCircle} size={30} />
        </button>
      </header>
      <main className="mx-auto grid w-full max-w-5xl flex-1 items-center gap-10 px-4 pb-36 pt-4 md:grid-cols-2 md:gap-16 md:px-8 md:pb-12">
        <MascotDetective />
        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-2">
            <span className="hud-label">Kiểm tra xếp lớp</span>
            <h1 className="text-[34px] leading-[1.05] md:text-h1">Tìm cấp độ phù hợp với bạn</h1>
          </div>
          <ul className="flex flex-col gap-3">
            {POINTS.map((p) => (
              <li key={p.text} className="flex items-center gap-4 rounded-card border-thick border-line bg-surface p-4 shadow-hard-sm">
                <IconBadge icon={p.icon} bg={p.bg} size="md" shape="square" shadow={false} />
                <span className="font-semibold">{p.text}</span>
              </li>
            ))}
          </ul>
          <div className="fixed inset-x-0 bottom-0 z-30 border-t-thick border-line bg-bg px-4 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-4 md:static md:border-0 md:bg-transparent md:p-0">
            <Button size="lg" icon={Play} fullWidth className="md:w-auto md:min-w-72" onClick={onStart}>
              Bắt đầu
            </Button>
          </div>
        </div>
      </main>
    </div>
  )
}

/** Thanh độ khó nhỏ: 6 ô màu cấp, con trỏ trượt theo độ khó server trả về (0 = A1, 5 = C2). */
function DifficultyMeter({ value }) {
  const left = ((value + 0.5) / LEVELS.length) * 100
  return (
    <div className="flex items-center gap-2" aria-label={`Độ khó hiện tại khoảng ${LEVELS[Math.round(value)]}`} role="img">
      <span className="hud-label shrink-0">Độ khó</span>
      <div className="relative flex-1 pt-1">
        <div className="grid h-4 grid-cols-6 overflow-hidden rounded-pill border-2 border-line">
          {LEVELS.map((l) => (
            <span key={l} style={{ background: `var(--color-level-${l.toLowerCase()})` }} />
          ))}
        </div>
        <motion.span
          className="absolute -top-0.5 -ml-2.5 block h-[22px] w-5 rounded-[6px] border-thick border-line bg-surface shadow-hard-sm"
          initial={false}
          animate={{ left: `${left}%` }}
          transition={{ type: 'spring', stiffness: 160, damping: 16 }}
        />
      </div>
      <span className="font-display text-xs font-bold text-muted">A1–C2</span>
    </div>
  )
}

function TestStep({ startAt, onDone, onExit }) {
  const [data, setData] = useState(null)
  const [answer, setAnswer] = useState('')
  const [pending, setPending] = useState(false)

  useEffect(() => {
    startPlacement({ resumeAt: startAt }).then(setData)
  }, [startAt])

  const question = data?.question

  // Câu nghe: tự phát âm khi vào câu
  useEffect(() => {
    if (question?.level === 2) playPlacementAudio(question.id)
  }, [question])

  const send = async (value) => {
    if (pending) return
    setPending(true)
    const next = await submitPlacementAnswer(question.id, value)
    setPending(false)
    setAnswer('')
    if (!next.question) {
      onDone(await finishPlacement())
      return
    }
    setData(next)
    window.scrollTo({ top: 0 })
  }

  // Enter để gửi câu chọn đáp án
  useEffect(() => {
    const onKey = (event) => {
      if (event.key === 'Enter' && !(event.target instanceof HTMLInputElement) && !(event.target instanceof HTMLButtonElement) && answer.trim()) send(answer)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  if (!question) return <div className="min-h-dvh bg-bg" aria-busy="true" />

  return (
    <div className="flex min-h-dvh flex-col bg-bg">
      <header className="mx-auto flex w-full max-w-3xl flex-col gap-3 px-4 pt-4 md:px-8 md:pt-6">
        <div className="flex items-center gap-3">
          <button type="button" onClick={onExit} aria-label="Thoát bài xếp lớp" className="-ml-2 grid size-11 shrink-0 place-items-center rounded-pill text-muted hover:bg-raised hover:text-ink">
            <Icon icon={XCircle} size={30} />
          </button>
          <ProgressBar value={data.answered} max={data.total} size="md" tone="primary" className="flex-1" />
          <span className="font-num shrink-0 text-base">
            {data.answered + 1}/{data.total}
          </span>
        </div>
        <DifficultyMeter value={data.difficulty} />
      </header>

      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-4 pb-44 pt-5 md:px-8 md:pb-40 md:pt-6">
        <motion.div key={question.id} initial={{ x: 40, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ duration: 0.22 }} className="flex flex-1 flex-col">
          <QuestionView
            question={question}
            answer={answer}
            onAnswer={setAnswer}
            onSubmit={() => send(answer)}
            locked={pending}
            onPlayAudio={(opts) => playPlacementAudio(question.id, opts)}
          />
        </motion.div>
      </main>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t-thick border-line bg-surface px-4 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-3 md:px-8 md:pt-4">
        <div className="mx-auto flex max-w-3xl flex-col-reverse gap-2 md:flex-row md:items-center md:justify-between md:gap-4">
          <Button variant="secondary" size="md" icon={HandPalm} disabled={pending} onClick={() => send(null)} className="md:h-16">
            Tôi chưa biết từ này
          </Button>
          <Button size="lg" iconRight={ArrowRight} disabled={!answer.trim() || pending} className="md:min-w-56" onClick={() => send(answer)}>
            {pending ? 'Đang gửi…' : 'Trả lời'}
          </Button>
        </div>
      </div>
    </div>
  )
}

function LevelScale({ level }) {
  const reduceMotion = useReducedMotion()
  const index = LEVELS.indexOf(level)
  return (
    <div className="relative w-full pt-20 md:pt-24" role="img" aria-label={`Thang cấp độ A1 đến C2, bạn ở ${level}`}>
      {/* Mũi tên rơi xuống cấp ước tính */}
      <motion.div
        className="absolute top-0 flex -translate-x-1/2 flex-col items-center"
        style={{ left: `${((index + 0.5) / LEVELS.length) * 100}%` }}
        initial={reduceMotion ? false : { y: -160, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 260, damping: 11, delay: 0.5 }}
      >
        <span className="mb-1 whitespace-nowrap rounded-pill border-thick border-line bg-ink px-2.5 font-display text-xs font-bold uppercase leading-6 text-white">Bạn ở đây</span>
        <span className="grid size-11 place-items-center rounded-pill border-thick border-line bg-gold shadow-hard-sm md:size-12">
          <Icon icon={ArrowDown} size={26} />
        </span>
      </motion.div>
      <ol className="grid grid-cols-6 gap-1.5 md:gap-3">
        {LEVELS.map((l, i) => {
          const active = i === index
          return (
            <motion.li
              key={l}
              initial={false}
              animate={active && !reduceMotion ? { y: [0, 10, 0] } : undefined}
              transition={{ delay: 0.75, duration: 0.35 }}
              className={cx(
                'grid h-16 place-items-center rounded-[14px] border-thick border-line font-display text-lg font-bold md:h-24 md:rounded-card md:text-3xl',
                DARK_LEVELS.has(l) ? 'text-white' : 'text-ink',
                active ? 'shadow-hard-lg outline-[3px] outline-offset-3 outline-ink outline' : 'shadow-hard-sm',
                i > index && 'opacity-45',
              )}
              style={{ background: `var(--color-level-${l.toLowerCase()})` }}
            >
              {l}
            </motion.li>
          )
        })}
      </ol>
    </div>
  )
}

function Result({ result }) {
  const navigate = useNavigate()
  const reduceMotion = useReducedMotion()
  const skipped = result.skippedLevels

  useEffect(() => {
    if (reduceMotion) return undefined
    const t = setTimeout(() => {
      confetti({ particleCount: 70, spread: 70, startVelocity: 40, origin: { y: 0.3 }, colors: tokenColors(['primary', 'accent', 'gold', 'sky']) })
    }, 1000)
    return () => clearTimeout(t)
  }, [reduceMotion])

  return (
    <div className="flex min-h-dvh flex-col bg-bg">
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col items-center justify-center gap-8 px-4 pb-48 pt-8 text-center md:px-8 md:pb-10">
        <LevelScale level={result.level} />
        <div className="flex flex-col gap-2">
          <span className="hud-label">Kết quả xếp lớp</span>
          <h1 className="text-[32px] leading-tight md:text-[48px]">
            Trình độ ước tính:{' '}
            <span className="whitespace-nowrap text-primary">
              {result.level} – {LEVEL_NAMES[result.level]}
            </span>
          </h1>
        </div>
        <div className="flex w-full max-w-xl items-start gap-4 rounded-card border-thick border-line bg-raised p-5 text-left shadow-hard">
          <IconBadge icon={Info} bg="sky" size="md" shape="square" shadow={false} />
          <p className="font-medium">
            Đã mở khóa đến <strong className="font-extrabold">{result.unlockedUpTo}</strong>.
            {skipped.length > 0 && (
              <>
                {' '}
                Từ ở {skipped.length > 1 ? `${skipped[0]}–${skipped[skipped.length - 1]}` : skipped[0]} sẽ được hỏi dần trong lúc ôn, đúng mới được tính là
                đã thuộc.
              </>
            )}
          </p>
        </div>
      </main>
      <div className="fixed inset-x-0 bottom-0 z-30 flex flex-col gap-3 border-t-thick border-line bg-surface px-4 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-4 md:static md:flex-row md:justify-center md:border-0 md:bg-transparent md:pb-12 md:pt-0">
        <Button size="lg" iconRight={ArrowRight} className="md:min-w-72" onClick={() => navigate(`/academy?level=${result.unlockedUpTo}`)}>
          Vào lộ trình {result.unlockedUpTo}
        </Button>
        {result.level !== 'A1' && (
          <Button size="lg" variant="secondary" icon={Plant} onClick={() => navigate('/academy?level=A1')}>
            Học lại từ đầu A1
          </Button>
        )}
      </div>
    </div>
  )
}

export default function PlacementTest() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const initialStep = params.get('step') ?? 'intro'
  const [step, setStep] = useState(initialStep)
  const [result, setResult] = useState(initialStep === 'result' ? PREVIEW_RESULT : null)
  const [exitOpen, setExitOpen] = useState(false)

  let screen
  if (step === 'result' && result) screen = <Result result={result} />
  else if (step === 'test')
    screen = (
      <TestStep
        startAt={Number(params.get('q')) || 0}
        onExit={() => setExitOpen(true)}
        onDone={(res) => {
          setResult(res)
          setStep('result')
          window.scrollTo({ top: 0 })
        }}
      />
    )
  else screen = <Intro onStart={() => setStep('test')} onExit={() => setExitOpen(true)} />

  return (
    <>
      {screen}
      <Modal
        open={exitOpen}
        onClose={() => setExitOpen(false)}
        title="Bỏ qua bài xếp lớp?"
        footer={
          <>
            <Button variant="secondary" onClick={() => navigate('/academy?level=A1')}>
              Bắt đầu từ A1
            </Button>
            <Button onClick={() => setExitOpen(false)}>Làm tiếp</Button>
          </>
        }
      >
        Nếu thoát bây giờ, bạn sẽ bắt đầu học từ A1.
      </Modal>
    </>
  )
}
