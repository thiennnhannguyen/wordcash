/*
 * Trận Boss cuối cấp (qua 85%).
 *
 * Khoảng 50 câu trộn đủ 4 mức. Nền tím sẫm, giữ màu kẹo neon. Phía trên là quái vật Boss (placeholder)
 * cùng thanh máu có vạch 85%: phải đánh tụt máu qua vạch này mới thắng. Góc trái là linh vật người chơi
 * và nhãn "Câu 23/50". Đúng: tia sáng bắn lên Boss, Boss rung và mất máu. Sai: màn hình rung nhẹ, viền hồng.
 * Đúng/sai, máu Boss, điểm, phần thưởng và thời gian chờ thử lại đều do server trả về.
 *
 * Dữ liệu thật qua services/academyApi.js (`?level=A1`). Thua: điểm, chặng yếu kèm nút LUYỆN CHẶNG YẾU từng chặng, đồng hồ đếm
 * ngược tới lúc được đánh lại (theo `retry_in_seconds` của server). Đang trong thời gian chờ mà vào trận: màn chờ tương tự.
 * Thắng: con dấu Boss, +1 lượt đặc biệt (lần đầu), nút bay tới /travel.
 * Dev: `?level=B1`, `?q=22` (bản mock: vào thẳng câu 23), `?preview=win|lose`.
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import useStartOnce from '../../hooks/useStartOnce'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import confetti from 'canvas-confetti'
import { ArrowRight, Barbell, Clock, Gift, MapTrifold, ShareNetwork, XCircle } from '@phosphor-icons/react'
import Button from '../../components/ui/Button'
import Icon, { IconBadge } from '../../components/ui/Icon'
import Modal from '../../components/ui/Modal'
import Sticker from '../../components/ui/Sticker'
import MascotBlob from '../../components/collection/MascotBlob'
import QuestionView from '../../components/academy/QuestionView'
import TestActionBar from '../../components/academy/TestActionBar'
import RewardsLayer from '../../components/academy/RewardsLayer'
import useCountdown from '../../hooks/useCountdown'
import { finishBoss, startBoss } from '../../services/academyApi'
import { useToastStore } from '../../store/toastStore'
import cx from '../../utils/cx'
import { AcademyError } from './AcademyLesson'
import { PREVIEW_BOSS } from './testMock'
import useTestRun from './useTestRun'

function tokenColors(names) {
  const style = getComputedStyle(document.documentElement)
  return names.map((n) => style.getPropertyValue(`--color-${n}`).trim()).filter(Boolean)
}

const NEON_SHADOW = 'shadow-[6px_6px_0_0_var(--color-primary)]'

/** Thanh máu Boss rộng, có vạch thắng. Máu do server trả về sau mỗi câu. */
function BossHpBar({ hp, passPercent, name }) {
  const winLine = 100 - passPercent
  const cleared = hp <= winLine

  return (
    <div className="w-full">
      <div className="mb-2 flex items-center justify-between gap-3">
        <span className="font-display text-sm font-bold uppercase tracking-wider text-white">{name}</span>
        <span className="font-num text-xl text-white">
          {Math.round(hp)}
          <span className="text-white/60">% máu</span>
        </span>
      </div>
      <div className="relative">
        <div
          role="meter"
          aria-label={`Máu ${name}, cần hạ xuống dưới ${winLine}%`}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(hp)}
          className="relative h-8 overflow-hidden rounded-pill border-thick border-white bg-night-raised"
        >
          {/* Vùng thắng: phần máu còn lại khi đã đạt ngưỡng */}
          <span className="absolute inset-y-0 left-0 bg-accent/25" style={{ width: `${winLine}%` }} />
          <span className="absolute inset-y-0 left-0 bg-white/30 transition-[width] delay-200 duration-700 ease-out" style={{ width: `${hp}%` }} />
          <span
            className={cx('absolute inset-y-0 left-0 transition-[width,background-color] duration-300 ease-out', hp > 0 && hp < 100 && 'border-r-thick border-line', cleared ? 'bg-accent' : 'bg-danger')}
            style={{ width: `${hp}%` }}
          />
        </div>
        <span className="pointer-events-none absolute -bottom-2 -top-2 w-1 -translate-x-1/2 rounded-pill bg-accent" style={{ left: `${winLine}%` }} />
        <span
          className="pointer-events-none absolute -bottom-9 -translate-x-1/2 whitespace-nowrap rounded-pill border-2 border-line bg-accent px-2 font-num text-xs leading-5 text-ink"
          style={{ left: `${winLine}%` }}
        >
          {passPercent}%
        </span>
      </div>
      <p className="mt-9 text-center text-caption text-white/70 max-md:hidden">Đánh tụt máu Boss qua vạch {passPercent}% để lên cấp</p>
    </div>
  )
}

function PlayerChip({ index, total }) {
  return (
    <div className="flex items-center gap-2 rounded-pill border-thick border-primary bg-night-raised py-1 pl-1 pr-4">
      <span className="grid size-11 place-items-center overflow-hidden rounded-pill border-2 border-white bg-sky">
        <MascotBlob color="sky" shape="round" size={48} className="translate-y-1" />
      </span>
      <div className="flex flex-col leading-tight">
        <span className="font-display text-[11px] font-bold uppercase tracking-wider text-white/60">Bạn</span>
        <span className="font-num text-base text-white">
          Câu {index + 1}/{total}
        </span>
      </div>
    </div>
  )
}

function BattleStep({ session, onFinish, onExit }) {
  const reduceMotion = useReducedMotion()
  const arenaRef = useRef(null)
  const bossRef = useRef(null)
  const cardRef = useRef(null)
  const [beam, setBeam] = useState(null)
  const [hit, setHit] = useState(null)
  const [miss, setMiss] = useState(0)

  // Hiệu ứng theo kết quả server trả về
  const onVerdict = useCallback(
    (res) => {
      if (!res.correct) {
        setMiss((m) => m + 1)
        return
      }
      const arena = arenaRef.current?.getBoundingClientRect()
      const boss = bossRef.current?.getBoundingClientRect()
      const card = cardRef.current?.getBoundingClientRect()
      if (arena && boss && card) {
        const top = boss.top + boss.height * 0.55 - arena.top
        setBeam({ key: Date.now(), top, height: card.top - arena.top - top })
      }
      setTimeout(() => setHit({ key: Date.now(), damage: res.damage }), reduceMotion ? 0 : 220)
    },
    [reduceMotion],
  )

  const run = useTestRun(session, { onVerdict, onFinish })
  const { question, verdict } = run
  if (!question) return <div className="min-h-dvh bg-night" aria-busy="true" />
  const hp = run.progress.bossHp ?? 100

  return (
    <div className="relative flex min-h-dvh flex-col overflow-x-clip bg-night text-white">
      <header className="mx-auto flex w-full max-w-5xl items-center gap-2 px-4 pt-3 md:gap-3 md:px-8 md:pt-5">
        <button
          type="button"
          onClick={onExit}
          aria-label="Rút lui khỏi Trận Boss"
          className="-ml-2 grid size-11 shrink-0 place-items-center rounded-pill text-white/70 transition-colors hover:bg-night-raised hover:text-white"
        >
          <Icon icon={XCircle} size={30} />
        </button>
        <PlayerChip index={run.index} total={session.total} />
        <span className="ml-auto flex items-center gap-2">
          <span className="hud-label hidden text-white/70 sm:inline">Trận Boss</span>
          <span
            className="grid h-9 min-w-12 place-items-center rounded-xl border-thick border-white px-2 font-display text-sm font-bold text-ink"
            style={{ background: `var(--color-level-${session.level.toLowerCase()})` }}
          >
            {session.level}
          </span>
        </span>
      </header>

      <div ref={arenaRef} className="relative mx-auto flex w-full max-w-3xl flex-1 flex-col px-4 pb-36 md:px-8 md:pb-40">
        <div key={miss} className={cx('flex flex-1 flex-col', miss > 0 && 'anim-shake')}>
          {/* Boss */}
          <div className="relative mx-auto mt-1 md:-mt-4">
            <span className="absolute inset-x-[8%] bottom-1 top-[18%] rounded-pill border-4 border-dashed border-danger/40" aria-hidden="true" />
            <div ref={bossRef} key={hit?.key ?? 'idle'} className={cx('relative', hit && 'anim-boss-hit')}>
              <motion.div animate={reduceMotion ? undefined : { y: [0, -6, 0] }} transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}>
                <MascotBlob color="danger" shape="round" size={220} monster className="size-28 md:size-44" />
              </motion.div>
            </div>
            <AnimatePresence>
              {hit && (
                <motion.span
                  key={hit.key}
                  className="absolute -right-10 top-2 md:-right-16 md:top-8"
                  initial={{ y: 10, opacity: 0, scale: 0.6 }}
                  animate={{ y: -18, opacity: [0, 1, 1, 0], scale: 1 }}
                  transition={{ duration: 1.1, times: [0, 0.15, 0.7, 1] }}
                >
                  <Sticker bg="accent" tilt={8} size="sm">
                    −{Math.round(hit.damage)}% máu
                  </Sticker>
                </motion.span>
              )}
            </AnimatePresence>
          </div>

          <div className="mb-10 mt-2 md:mb-8 md:mt-1">
            <BossHpBar hp={hp} passPercent={session.passPercent} name={session.bossName} />
          </div>

          <div ref={cardRef} className="flex flex-1 flex-col text-ink">
            <QuestionView
              key={question.id}
              question={question}
              answer={run.answer}
              onAnswer={run.setAnswer}
              onSubmit={run.submit}
              locked={!!verdict || run.pending}
              onPlayAudio={run.playAudio}
              shadowClass={NEON_SHADOW}
            />
          </div>
        </div>

        {/* Tia sáng từ card câu hỏi bắn lên Boss */}
        <AnimatePresence>
          {beam && !reduceMotion && (
            <motion.span
              key={beam.key}
              aria-hidden="true"
              className="pointer-events-none absolute left-1/2 z-20 w-5 -translate-x-1/2 rounded-pill border-thick border-line bg-accent shadow-[0_0_28px_8px_var(--color-accent)]"
              style={{ top: beam.top, height: beam.height, originY: 1 }}
              initial={{ scaleY: 0, opacity: 1 }}
              animate={{ scaleY: [0, 1, 1], opacity: [1, 1, 0] }}
              transition={{ duration: 0.6, times: [0, 0.4, 1], ease: 'easeOut' }}
              onAnimationComplete={() => setBeam(null)}
            />
          )}
        </AnimatePresence>
      </div>

      {/* Sai: viền hồng lóe quanh màn hình */}
      <AnimatePresence>
        {miss > 0 && verdict && !verdict.correct && (
          <motion.span
            key={miss}
            aria-hidden="true"
            className="pointer-events-none fixed inset-0 z-50 border-[6px] border-danger shadow-[inset_0_0_80px_color-mix(in_srgb,var(--color-danger)_45%,transparent)]"
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 1, 0] }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
          />
        )}
      </AnimatePresence>

      <TestActionBar
        dark
        verdict={verdict}
        canSubmit={!!run.answer.trim()}
        pending={run.pending}
        onSubmit={run.submit}
        onNext={run.next}
        hint="Phím 1–4 để chọn · Enter để ra đòn"
        correctText="Trúng đòn!"
        wrongText="Hụt rồi!"
      />
    </div>
  )
}

function DarkActions({ children, note }) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-30 flex flex-col gap-3 border-t-thick border-primary bg-night-raised px-4 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-4 md:static md:items-center md:border-0 md:bg-transparent md:pb-12 md:pt-2">
      <div className="flex flex-col gap-3 md:flex-row md:justify-center">{children}</div>
      {note}
    </div>
  )
}

function WinResult({ result }) {
  const navigate = useNavigate()
  const reduceMotion = useReducedMotion()
  const pushToast = useToastStore((s) => s.push)

  // Pháo giấy toàn màn hình: bắn từ hai bên rồi giữa
  useEffect(() => {
    if (reduceMotion) return undefined
    const colors = tokenColors(['primary', 'accent', 'danger', 'gold', 'sky', 'orange'])
    const shots = [
      [150, () => confetti({ particleCount: 120, angle: 60, spread: 70, startVelocity: 60, origin: { x: 0, y: 0.7 }, colors })],
      [350, () => confetti({ particleCount: 120, angle: 120, spread: 70, startVelocity: 60, origin: { x: 1, y: 0.7 }, colors })],
      [800, () => confetti({ particleCount: 160, spread: 160, startVelocity: 45, origin: { x: 0.5, y: 0.3 }, colors, scalar: 1.2 })],
      [1600, () => confetti({ particleCount: 90, spread: 120, startVelocity: 35, origin: { x: 0.5, y: 0 }, colors })],
    ]
    const timers = shots.map(([ms, fire]) => setTimeout(fire, ms))
    return () => timers.forEach(clearTimeout)
  }, [reduceMotion])

  const share = async () => {
    const text = `Mình vừa hạ Boss ${result.level} trên WORDCLASH với ${result.score}% và mở khóa ${result.nextLevel}!`
    try {
      if (navigator.share) {
        await navigator.share({ title: 'WORDCLASH', text, url: window.location.origin })
        return
      }
      await navigator.clipboard.writeText(`${text} ${window.location.origin}`)
      pushToast({ variant: 'success', title: 'Đã chép nội dung chia sẻ', message: 'Dán vào nơi bạn muốn khoe nhé.' })
    } catch {
      // Người dùng đóng hộp chia sẻ: không cần báo gì
    }
  }

  return (
    <div className="flex min-h-dvh flex-col overflow-x-clip bg-night text-white">
      <main className="mx-auto flex w-full max-w-xl flex-1 flex-col items-center justify-center gap-6 px-4 pb-48 pt-10 text-center md:pb-8">
        <span className="hud-label text-white/70">Trận Boss {result.level} · Chiến thắng</span>

        <motion.div
          initial={{ scale: 0.2, rotate: -30, opacity: 0 }}
          animate={{ scale: 1, rotate: 0, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 200, damping: 12, delay: 0.1 }}
        >
          <div className="anim-sway flex flex-col items-center gap-3 rounded-[32px] border-thick border-line bg-gold px-10 py-7 text-ink shadow-[8px_8px_0_0_var(--color-primary)] md:px-14 md:py-9">
            <span
              className="grid size-28 place-items-center rounded-pill border-thick border-line font-display text-[52px] font-bold shadow-hard md:size-36 md:text-[68px]"
              style={{ background: `var(--color-level-${result.nextLevel.toLowerCase()})` }}
            >
              {result.nextLevel}
            </span>
            <span className="font-display text-[28px] font-bold uppercase leading-none tracking-wide md:text-[36px]">
              {result.nextLevel} · Đã mở khóa
            </span>
          </div>
        </motion.div>

        <div className="flex flex-col gap-1">
          <h1 className="text-[40px] leading-tight text-white md:text-[52px]">
            Đạt <span className="text-accent">{result.score}%</span>
          </h1>
          <p className="text-white/70">
            {result.correct}/{result.total} câu đúng · Cần {result.passPercent}%
          </p>
        </div>

        {result.stamps?.length > 0 && (
          <motion.div
            initial={{ scale: 2.2, rotate: -18, opacity: 0 }}
            animate={{ scale: 1, rotate: -6, opacity: 1 }}
            transition={{ delay: 0.6, type: 'spring', stiffness: 260, damping: 14 }}
            className="rounded-[14px] border-[3px] border-gold px-5 py-2 font-display text-xl font-bold uppercase text-gold"
            aria-label={`Đóng dấu hộ chiếu: ${result.stamps[0].landmark_name}`}
          >
            Đã chinh phục · {result.stamps[0].landmark_name}
          </motion.div>
        )}
        {result.reward && (
          <motion.div
            initial={{ y: 24, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.9 }}
            className="relative flex w-full items-center gap-4 rounded-card border-thick border-line bg-surface p-4 text-left text-ink shadow-[6px_6px_0_0_var(--color-accent)] md:p-5"
          >
            <IconBadge icon={Gift} bg="gold" size="lg" shape="square" />
            <div className="flex min-w-0 flex-col">
              <span className="font-heading text-xl font-black leading-tight md:text-2xl">+{result.reward.specialSpins} lượt quay đặc biệt</span>
              <span className="text-caption text-muted">Đã cộng vào Bộ Sưu Tập</span>
            </div>
            <Sticker bg="danger" tilt={6} size="sm" className="absolute -right-2 -top-4">
              Phần thưởng
            </Sticker>
          </motion.div>
        )}
      </main>

      <DarkActions>
        <Button size="lg" iconRight={ArrowRight} className="md:min-w-72" onClick={() => navigate(`/travel?from=${result.level}`)}>
          Bay tới {result.nextLevel}
        </Button>
        <Button size="lg" variant="secondary" icon={ShareNetwork} onClick={share}>
          Chia sẻ
        </Button>
      </DarkActions>
    </div>
  )
}

/** Đếm ngược tới lúc được đánh lại; `seconds` do server tính (không phụ thuộc giờ máy). */
function RetryCountdown({ seconds }) {
  const [deadline] = useState(() => (seconds != null ? Date.now() + seconds * 1000 : null))
  const left = useCountdown(deadline)
  if (!deadline) return null
  const pad = (n) => String(n).padStart(2, '0')
  const done = left.days + left.hours + left.minutes + left.seconds === 0
  return (
    <p className="flex items-center justify-center gap-2 text-caption font-medium text-white/80" role="timer">
      <Icon icon={Clock} size={18} color="gold" />
      {done ? (
        'Bạn có thể đánh lại ngay bây giờ'
      ) : (
        <>
          Đánh lại sau <span className="font-num text-base text-white">{pad(left.days * 24 + left.hours)}:{pad(left.minutes)}:{pad(left.seconds)}</span> · hoặc luyện xong các chặng yếu
        </>
      )}
    </p>
  )
}

function LoseResult({ result, cooldownOnly = false }) {
  const navigate = useNavigate()
  const reduceMotion = useReducedMotion()
  const seconds = result.retryInSeconds ?? (result.retryInHours != null ? result.retryInHours * 3600 : null)

  return (
    <div className="flex min-h-dvh flex-col overflow-x-clip bg-night text-white">
      <main className="mx-auto flex w-full max-w-xl flex-1 flex-col items-center justify-center gap-6 px-4 pb-56 pt-8 text-center md:pb-8">
        <motion.div animate={reduceMotion ? undefined : { y: [0, -8, 0] }} transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}>
          <MascotBlob color="danger" shape="round" size={150} monster className="size-28 md:size-[150px]" />
        </motion.div>
        <div className="flex flex-col gap-2">
          <span className="hud-label text-white/70">Trận Boss {result.level}</span>
          <h1 className="text-[32px] leading-tight text-white md:text-[44px]">{cooldownOnly ? 'Boss đang hồi sức' : 'Boss vẫn còn trụ!'}</h1>
          {!cooldownOnly && (
            <p className="font-display text-2xl font-bold uppercase md:text-3xl">
              Đạt <span className="text-danger">{result.score}%</span> <span className="text-white/50">·</span> Cần {result.passPercent}%
            </p>
          )}
        </div>

        <section className="flex w-full flex-col gap-4 rounded-panel border-thick border-line bg-surface p-5 text-left text-ink shadow-[6px_6px_0_0_var(--color-primary)] md:p-6">
          <div className="flex items-baseline justify-between gap-3">
            <h2 className="text-h3">Chặng làm yếu nhất</h2>
            {!cooldownOnly && <span className="hud-label whitespace-nowrap max-sm:hidden">% câu đúng</span>}
          </div>
          <ul className="flex flex-col gap-3.5">
            {result.weakStages.map((s, i) => (
              <li key={s.title} className={cx('grid items-center gap-3', s.id ? 'grid-cols-[92px_1fr_44px] md:grid-cols-[110px_1fr_44px_auto]' : 'grid-cols-[92px_1fr_44px]')}>
                <span className="truncate font-semibold">{s.title}</span>
                <span className={cx('relative h-5 overflow-hidden rounded-pill border-thick border-line bg-raised', s.percent == null && 'invisible')}>
                  <motion.span
                    className="absolute inset-y-0 left-0 border-r-thick border-line"
                    style={{ background: `var(--color-${s.color})` }}
                    initial={{ width: 0 }}
                    animate={{ width: `${s.percent}%` }}
                    transition={{ delay: 0.3 + i * 0.12, duration: 0.6, ease: 'easeOut' }}
                  />
                  <span className="absolute inset-y-0 w-[3px] bg-ink" style={{ left: `${result.passPercent}%` }} />
                </span>
                <span className="font-num text-right text-base">{s.percent != null ? `${s.percent}%` : '—'}</span>
                {s.id && (
                  <Button
                    size="sm"
                    variant={s.practiced ? 'secondary' : 'primary'}
                    icon={Barbell}
                    className="col-span-3 md:col-span-1"
                    onClick={() => navigate(`/academy/practice?topic=${s.id}&level=${result.level}`)}
                  >
                    {s.practiced ? 'Đã luyện' : 'Luyện chặng yếu'}
                  </Button>
                )}
              </li>
            ))}
          </ul>
          {!cooldownOnly && <p className="text-caption text-muted">Vạch đen là mức {result.passPercent}% cần đạt.</p>}
        </section>
      </main>

      <DarkActions note={<RetryCountdown seconds={seconds} />}>
        {result.weakStages[0]?.id ? (
          <Button size="lg" icon={Barbell} className="md:min-w-72" onClick={() => navigate(`/academy/practice?topic=${(result.weakStages.find((w) => !w.practiced) ?? result.weakStages[0]).id}&level=${result.level}`)}>
            Luyện chặng yếu
          </Button>
        ) : (
          <Button size="lg" icon={Barbell} className="md:min-w-72" onClick={() => navigate(`/academy?level=${result.level}`)}>
            Luyện chặng yếu
          </Button>
        )}
        <Button size="lg" variant="secondary" icon={MapTrifold} onClick={() => navigate('/academy')}>
          Về bản đồ
        </Button>
      </DarkActions>
    </div>
  )
}

export default function BossBattle() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const level = (params.get('level') ?? 'B1').toUpperCase()
  const preview = PREVIEW_BOSS[params.get('preview')]
  const [session, setSession] = useState(null)
  const [result, setResult] = useState(preview ?? null)
  const [exitOpen, setExitOpen] = useState(false)
  const [error, setError] = useState(null)

  // Chỉ bắt đầu một lần khi vào trang (kể cả StrictMode)
  useStartOnce(() => {
    if (!preview) startBoss({ level, resumeAt: Number(params.get('q')) || 0 }).then(setSession).catch(setError)
  }, [level])

  const finish = async () => {
    setResult(await finishBoss({ level }))
    window.scrollTo({ top: 0 })
  }

  let screen
  if (error?.code === 'BOSS_COOLDOWN') {
    const cooldown = {
      level,
      passPercent: 85,
      retryInSeconds: error.details.retry_in_seconds,
      weakStages: error.details.weak_topics.map((w, i) => ({ id: w.id, title: w.title, practiced: w.practiced, percent: null, color: ['accent', 'danger'][i % 2] })),
    }
    screen = <LoseResult result={cooldown} cooldownOnly />
  } else if (error) screen = <AcademyError error={error} onBack={() => navigate('/academy')} />
  else if (result) screen = result.passed ? <WinResult result={result} /> : <LoseResult result={result} />
  else if (session) screen = <BattleStep session={session} onFinish={finish} onExit={() => setExitOpen(true)} />
  else screen = <div className="min-h-dvh bg-night" aria-busy="true" />

  return (
    <>
      {screen}
      {result?.rewards && <RewardsLayer rewards={{ ...result.rewards, spins: result.rewards.spins.filter((s) => s.reason !== 'boss') }} />}
      <Modal
        open={exitOpen}
        onClose={() => setExitOpen(false)}
        title="Rút lui khỏi Trận Boss?"
        footer={
          <>
            <Button variant="secondary" onClick={() => navigate('/academy')}>
              Rút lui
            </Button>
            <Button onClick={() => setExitOpen(false)}>Đánh tiếp</Button>
          </>
        }
      >
        Trận đang đánh sẽ không được lưu. Lần sau bạn sẽ bắt đầu lại từ câu đầu tiên.
      </Modal>
    </>
  )
}
