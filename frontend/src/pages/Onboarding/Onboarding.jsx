/*
 * Onboarding sau khi đăng ký: 4 bước, mỗi bước chiếm cả màn hình.
 * (1) mục tiêu học · (2) thời lượng mỗi ngày · (3) điểm xuất phát · (4) chọn linh vật đồng hành.
 * Mobile: card xếp dọc, nút chính dính ở đáy màn hình.
 *
 * Bước cuối gửi PATCH /users/me/onboarding {goal, daily_minutes, starter_mascot_id, start_mode} rồi đi theo `next_step`.
 */

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowLeft, ArrowRight, Briefcase, ChatsCircle, CheckFat, Compass, Exam, Plant, Rocket } from '@phosphor-icons/react'
import Button from '../../components/ui/Button'
import Icon, { IconBadge } from '../../components/ui/Icon'
import Sticker from '../../components/ui/Sticker'
import MascotBlob from '../../components/collection/MascotBlob'
import { Wordmark } from '../../components/layout/NavBar'
import { useMascotCatalog } from '../../store/mascotStore'
import { useAuthStore } from '../../store/authStore'
import { useToastStore } from '../../store/toastStore'
import { messageFor } from '../../utils/errorMessages'
import cx from '../../utils/cx'

const GOALS = [
  { value: 'general', label: 'Giao tiếp hằng ngày', text: 'Nói chuyện, xem phim, đi du lịch tự tin hơn.', icon: ChatsCircle, bg: 'sky' },
  { value: 'ielts', label: 'Thi IELTS', text: 'Từ vựng học thuật theo band điểm.', icon: Exam, bg: 'primary' },
  { value: 'toeic', label: 'Thi TOEIC', text: 'Từ vựng công sở, kinh doanh.', icon: Briefcase, bg: 'orange' },
]

// Số từ mới mỗi ngày nằm trong giới hạn 10–20 của luật học tập
const PACES = [
  { value: 5, label: '5 phút', mood: 'Nhẹ nhàng', words: 10 },
  { value: 10, label: '10 phút', mood: 'Đều đặn', words: 12 },
  { value: 15, label: '15 phút', mood: 'Nghiêm túc', words: 15 },
  { value: 20, label: '20 phút', mood: 'Chiến binh', words: 20 },
]

const STARTS = [
  { value: 'a1', label: 'Bắt đầu từ A1', text: 'Mình mới học lại từ đầu.', icon: Plant, bg: 'accent' },
  {
    value: 'placement',
    label: 'Làm bài xếp lớp',
    text: '40 câu, khoảng 10 phút, mở thẳng tới cấp phù hợp.',
    icon: Compass,
    bg: 'gold',
    recommended: true,
  },
]

// Linh vật khởi đầu = các linh vật `is_starter` trong danh mục GET /mascots (#001–#003); id gửi lên server (starter_mascot_id),
// server cấp sở hữu ngay (source=starter) nên album hiện 1/100.

const STEPS = [
  { key: 'goal', title: 'Bạn học để làm gì?', subtitle: 'Chọn một mục tiêu. Bạn có thể đổi sau trong Hồ Sơ.' },
  { key: 'pace', title: 'Mỗi ngày bạn học bao lâu?', subtitle: 'Học đều quan trọng hơn học nhiều.' },
  { key: 'start', title: 'Trình độ của bạn?', subtitle: 'Phần đã mở sẽ không bao giờ bị khóa lại.' },
  { key: 'mascot', title: 'Chọn bạn đồng hành', subtitle: 'Linh vật đi cùng bạn vào mọi trận. Chỉ để trang trí, không tăng sức mạnh.' },
]

function StepProgress({ step }) {
  return (
    <div
      className="grid flex-1 grid-cols-4 gap-2"
      role="progressbar"
      aria-valuemin={1}
      aria-valuemax={STEPS.length}
      aria-valuenow={step + 1}
      aria-label={`Bước ${step + 1} trên ${STEPS.length}`}
    >
      {STEPS.map((s, i) => (
        <span key={s.key} className={cx('h-4 rounded-pill border-thick border-line', i <= step ? 'bg-accent' : 'bg-surface')} />
      ))}
    </div>
  )
}

function OptionCard({ selected, onSelect, icon, bg, label, text, badge, className }) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onSelect}
      className={cx(
        'pressable relative flex w-full items-center gap-4 rounded-card border-thick border-line p-5 text-left shadow-hard hover:-translate-y-0.5 hover:shadow-hard-lg',
        'md:flex-col md:items-start md:gap-5 md:p-6',
        selected ? 'bg-accent' : 'bg-surface',
        className,
      )}
    >
      {badge}
      <IconBadge icon={icon} bg={selected ? 'surface' : bg} size="lg" shape="square" />
      <span className="flex min-w-0 flex-1 flex-col gap-1">
        <span className="font-heading text-xl font-extrabold leading-tight md:text-2xl">{label}</span>
        <span className="text-caption font-medium text-ink/75">{text}</span>
      </span>
      <span
        aria-hidden="true"
        className={cx(
          'grid size-8 shrink-0 place-items-center rounded-pill border-thick border-line md:absolute md:right-4 md:top-4',
          selected ? 'bg-ink' : 'bg-surface',
        )}
      >
        {selected && <Icon icon={CheckFat} size={18} color="accent" />}
      </span>
    </button>
  )
}

function GoalStep({ value, onChange }) {
  return (
    <div role="radiogroup" aria-label="Mục tiêu học" className="grid gap-4 md:grid-cols-3 md:gap-6">
      {GOALS.map((g) => (
        <OptionCard key={g.value} {...g} selected={value === g.value} onSelect={() => onChange(g.value)} />
      ))}
    </div>
  )
}

function PaceStep({ value, onChange }) {
  return (
    <div role="radiogroup" aria-label="Thời lượng học mỗi ngày" className="grid gap-3 sm:grid-cols-2 md:grid-cols-4 md:gap-4">
      {PACES.map((p) => {
        const selected = value === p.value
        return (
          <button
            key={p.value}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(p.value)}
            className={cx(
              'pressable flex min-h-16 items-center justify-between gap-3 rounded-pill border-thick border-line px-6 py-3 text-left shadow-hard',
              'hover:-translate-y-0.5 hover:shadow-hard-lg md:flex-col md:justify-center md:rounded-[40px] md:py-6 md:text-center',
              selected ? 'bg-accent' : 'bg-surface',
            )}
          >
            <span className="flex flex-col md:items-center">
              <span className="font-num text-2xl uppercase">{p.label}</span>
              <span className="font-display text-sm font-bold uppercase tracking-wide">{p.mood}</span>
            </span>
            <span className="text-caption font-semibold text-ink/75">≈ {p.words} từ mới/ngày</span>
          </button>
        )
      })}
    </div>
  )
}

function StartStep({ value, onChange }) {
  return (
    <div role="radiogroup" aria-label="Điểm xuất phát" className="grid gap-5 md:grid-cols-2 md:gap-6">
      {STARTS.map((s) => (
        <OptionCard
          key={s.value}
          {...s}
          selected={value === s.value}
          onSelect={() => onChange(s.value)}
          className="md:min-h-56"
          badge={
            s.recommended && (
              <Sticker bg="primary" tilt={4} size="sm" className="absolute -top-4 right-12 md:right-16">
                Khuyên dùng
              </Sticker>
            )
          }
        />
      ))}
    </div>
  )
}

function MascotStep({ value, onChange }) {
  const { mascots, ready } = useMascotCatalog()
  const starters = mascots.filter((m) => m.isStarter || (!('isStarter' in m) && m.id <= 3)).map((m) => ({ ...m, value: m.id }))
  if (!ready)
    return (
      <div className="grid grid-cols-3 gap-3 md:gap-6" aria-busy="true" aria-label="Đang tải linh vật">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-56 animate-pulse rounded-card bg-raised md:h-72" />
        ))}
      </div>
    )
  return (
    <div role="radiogroup" aria-label="Linh vật đồng hành" className="grid grid-cols-3 gap-3 md:gap-6">
      {starters.map((m) => {
        const selected = value === m.value
        return (
          <button
            key={m.value}
            type="button"
            role="radio"
            aria-checked={selected}
            aria-label={m.name}
            onClick={() => onChange(m.value)}
            className={cx(
              'pressable flex flex-col items-center gap-3 rounded-card border-thick border-line px-2 pb-4 pt-6 shadow-hard md:pb-6 md:pt-10',
              selected ? 'bg-raised shadow-hard-lg' : 'bg-surface hover:-translate-y-0.5',
            )}
          >
            <motion.span
              key={selected ? `${m.value}-on` : m.value}
              animate={selected ? { y: [0, -28, 0, -10, 0], scale: [1, 1.06, 0.97, 1.02, 1] } : { y: 0 }}
              transition={{ duration: 0.7, ease: 'easeOut' }}
              className="inline-flex"
            >
              <MascotBlob color={m.color} shape={m.shape} traits={m.traits} size={140} className="h-auto w-[84px] md:w-[140px]" />
            </motion.span>
            <span
              className={cx(
                'flex h-9 items-center rounded-pill border-thick px-3 font-display text-sm font-bold uppercase transition-opacity md:text-base',
                selected ? 'border-line bg-accent opacity-100' : 'border-transparent opacity-0',
              )}
            >
              {m.name}
            </span>
          </button>
        )
      })}
    </div>
  )
}

// next_step của server → trang tiếp theo (docs/auth.md)
// Bài xếp lớp chưa có: chọn xếp lớp thì tạm vào A1 kèm thông báo "sắp ra mắt"
const NEXT_ROUTES = { roadmap_a1: '/travel?variant=start', placement_test: '/academy?level=A1&placement=soon' }

export default function Onboarding() {
  const navigate = useNavigate()
  const completeOnboarding = useAuthStore((s) => s.completeOnboarding)
  const [pending, setPending] = useState(false)
  const [step, setStep] = useState(0)
  const [answers, setAnswers] = useState({ goal: null, pace: null, start: null, mascot: null })

  const current = STEPS[step]
  const value = answers[current.key]
  const setValue = (v) => setAnswers((a) => ({ ...a, [current.key]: v }))
  const isLast = step === STEPS.length - 1

  const next = async () => {
    if (!isLast) {
      setStep((s) => s + 1)
      window.scrollTo({ top: 0 })
      return
    }
    // Lưu lựa chọn lên server (PATCH /users/me/onboarding) rồi đi theo next_step.
    // Bắt đầu từ A1: màn "Hành trình 10.000 từ bắt đầu từ đây", rồi vào bản đồ A1.
    setPending(true)
    try {
      const nextStep = await completeOnboarding({
        goal: answers.goal,
        daily_minutes: answers.pace,
        starter_mascot_id: answers.mascot,
        start_mode: answers.start,
      })
      navigate(NEXT_ROUTES[nextStep] ?? '/lobby', { replace: true })
    } catch (err) {
      useToastStore.getState().push({ variant: 'error', title: 'Chưa lưu được lựa chọn', message: messageFor(err) })
      setPending(false)
    }
  }

  const StepBody = { goal: GoalStep, pace: PaceStep, start: StartStep, mascot: MascotStep }[current.key]

  return (
    <div className="flex min-h-dvh flex-col bg-bg">
      <header className="mx-auto flex w-full max-w-5xl items-center gap-3 px-4 pt-5 md:gap-6 md:px-8 md:pt-8">
        {step > 0 ? (
          <Button variant="ghost" size="sm" icon={ArrowLeft} onClick={() => setStep((s) => s - 1)}>
            <span className="hidden sm:inline">Quay lại</span>
            <span className="sr-only sm:hidden">Quay lại</span>
          </Button>
        ) : (
          <Wordmark className="hidden text-xl sm:block" />
        )}
        <StepProgress step={step} />
        <span className="font-num w-10 text-right text-sm text-muted">
          {step + 1}/{STEPS.length}
        </span>
      </header>

      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col px-4 pb-32 pt-10 md:justify-center md:px-8 md:pb-16 md:pt-12">
        <motion.div
          key={current.key}
          initial={{ opacity: 0, x: 24 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
          className="flex flex-col gap-8 md:gap-12"
        >
          <div className="flex flex-col gap-2 md:items-center md:text-center">
            <span className="hud-label">Bước {step + 1}</span>
            <h1 className="text-[34px] leading-[1.05] md:text-[52px]">{current.title}</h1>
            <p className="max-w-xl text-muted md:text-lg">{current.subtitle}</p>
          </div>
          <StepBody value={value} onChange={setValue} />
        </motion.div>

        {/* Nút chính: dính đáy màn hình trên mobile, nằm dưới nội dung trên desktop */}
        <div className="fixed inset-x-0 bottom-0 z-30 border-t-thick border-line bg-bg px-4 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-4 md:static md:mt-12 md:flex md:justify-center md:border-0 md:bg-transparent md:p-0">
          <Button
            size="lg"
            fullWidth
            className="md:w-auto md:min-w-80"
            icon={isLast ? Rocket : undefined}
            iconRight={isLast ? undefined : ArrowRight}
            disabled={value == null || pending}
            onClick={next}
          >
            {isLast ? (pending ? 'Đang lưu…' : 'Bắt đầu hành trình') : 'Tiếp tục'}
          </Button>
        </div>
      </main>
    </div>
  )
}
