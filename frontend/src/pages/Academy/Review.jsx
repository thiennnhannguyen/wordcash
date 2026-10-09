/*
 * Ôn các từ đến hạn.
 *
 * Trang tổng quan ôn tập theo lặp lại ngắt quãng: số từ đến hạn và nút bắt đầu ôn, 4 thẻ thống kê theo
 * trạng thái, biểu đồ lịch ôn 7 ngày tới, phần "Ôn gấp" (từ vừa quên ở Cửa Ải) và danh sách từ có tìm
 * kiếm, lọc theo cấp/trạng thái. Mọi con số và ngày ôn tiếp do server tính (GET /review/due qua services/academyApi.js).
 * Đang tải: khối chờ; lỗi: thông báo + Thử lại; chưa có từ nào: linh vật + gợi ý vào Học Viện.
 * Mobile: thẻ thống kê lưới 2x2, danh sách dạng card gọn, nút chính dính ở đáy màn hình (trên thanh tab).
 */

import { createContext, useContext, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowsClockwise, BookOpenText, CalendarBlank, CheckCircle, Lightning, MagnifyingGlass, Plant, Siren, XCircle } from '@phosphor-icons/react'
import Button from '../../components/ui/Button'
import { IconBadge } from '../../components/ui/Icon'
import Input from '../../components/ui/Input'
import LevelTag from '../../components/ui/LevelTag'
import Select from '../../components/ui/Select'
import Sticker from '../../components/ui/Sticker'
import MascotBlob from '../../components/collection/MascotBlob'
import cx from '../../utils/cx'
import { formatDueIn, formatNumber } from '../../utils/format'
import { getReviewDue } from '../../services/academyApi'
import useServerData from '../../hooks/useServerData'
import { EmptyState, ErrorState, Skeleton } from '../../components/ui/DataState'

/** Dữ liệu trang từ server: {summary, urgent, words}. */
const ReviewData = createContext(null)

const DAY_MS = 86400000

function fromServer(due) {
  const toWord = (w) => ({
    word: w.headword,
    meaning: w.meaning_vi,
    level: w.cefr ?? '—',
    status: w.status,
    dueInDays: w.due_at ? Math.max(0, Math.ceil((new Date(w.due_at).getTime() - Date.now()) / DAY_MS)) : null,
    forgotAt: w.status === 'forgotten' ? 'Cửa Ải' : 'Quá hạn',
  })
  return {
    summary: {
      due: due.due_count,
      counts: due.status_counts,
      forecast: [due.due_count, ...due.schedule.slice(0, 6).map((d) => d.count)],
    },
    urgent: due.urgent.map(toWord),
    words: due.words.map(toWord),
  }
}

const STATUSES = {
  learning: { label: 'Đang học', color: 'sky', icon: ArrowsClockwise },
  mastered: { label: 'Đã thuộc', color: 'accent', icon: CheckCircle },
  forgotten: { label: 'Đã quên', color: 'danger', icon: XCircle },
  new: { label: 'Chưa học', color: 'neutral', icon: Plant },
}

const LEVEL_OPTIONS = [{ value: 'all', label: 'Tất cả cấp' }, ...['A1', 'A2', 'B1', 'B2', 'C1', 'C2'].map((l) => ({ value: l, label: `Cấp ${l}` }))]

const WEEKDAYS = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7']

function dayLabel(offset) {
  if (offset === 0) return 'Nay'
  if (offset === 1) return 'Mai'
  const d = new Date()
  d.setDate(d.getDate() + offset)
  return WEEKDAYS[d.getDay()]
}

function StartButton({ className }) {
  const { summary } = useContext(ReviewData)
  const navigate = useNavigate()
  return (
    <Button size="lg" icon={Lightning} className={className} disabled={summary.due === 0} onClick={() => navigate('/academy/review/session')}>
      {summary.due > 0 ? 'Bắt đầu ôn' : 'Chưa có từ đến hạn'}
    </Button>
  )
}

function Hero() {
  const { summary } = useContext(ReviewData)
  return (
    <section className="relative flex flex-col gap-5 overflow-hidden rounded-panel border-thick border-line bg-sky p-6 shadow-hard-lg md:flex-row md:items-center md:justify-between md:p-10">
      <div className="flex flex-col gap-3">
        <span className="hud-label text-ink/70">Ôn tập hôm nay</span>
        <p className="flex flex-wrap items-baseline gap-x-4">
          <span className="font-num text-[88px] leading-none md:text-[112px]">{summary.due}</span>
          <span className="font-heading text-[28px] font-black leading-tight md:text-[36px]">từ đến hạn ôn</span>
        </p>
        <p className="max-w-md font-medium text-ink/80">Ôn đúng lúc sắp quên giúp nhớ lâu hơn nhiều so với học dồn một lần.</p>
        <div className="mt-2 hidden md:block">
          <StartButton />
        </div>
      </div>
      <div className="absolute -right-4 -top-2 md:relative md:right-auto md:top-auto md:mr-6">
        <MascotBlob color="gold" shape="round" size={170} className="size-24 md:size-[170px]" />
        <Sticker bg="danger" tilt={-6} size="sm" wiggle className="absolute -left-10 top-0 max-md:hidden">
          Sắp quên rồi!
        </Sticker>
      </div>
    </section>
  )
}

function StatCards() {
  const { summary } = useContext(ReviewData)
  return (
    <section aria-label="Số từ theo trạng thái" className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-5">
      {Object.entries(STATUSES).map(([key, s]) => (
        <div
          key={key}
          className="flex flex-col gap-3 rounded-card border-thick border-line p-4 shadow-hard md:p-5"
          style={{ background: `var(--color-${s.color})` }}
        >
          <IconBadge icon={s.icon} bg="surface" size="sm" shadow={false} />
          <div>
            <div className="font-num text-[32px] leading-none md:text-[40px]">{formatNumber(summary.counts[key])}</div>
            <div className="mt-1 font-display text-sm font-bold uppercase tracking-wide">{s.label}</div>
          </div>
        </div>
      ))}
    </section>
  )
}

function ForecastChart() {
  const { summary } = useContext(ReviewData)
  const max = Math.max(1, ...summary.forecast)
  return (
    <section className="flex flex-col gap-4 rounded-panel border-thick border-line bg-surface p-5 shadow-hard md:p-6">
      <div className="flex items-center gap-3">
        <IconBadge icon={CalendarBlank} bg="gold" size="sm" shape="square" shadow={false} />
        <h2 className="text-h3">Lịch ôn 7 ngày tới</h2>
      </div>
      <ol className="grid h-44 grid-cols-7 items-end gap-2" aria-label="Số từ đến hạn mỗi ngày">
        {summary.forecast.map((n, i) => (
          <li key={i} className="flex h-full flex-col items-center justify-end gap-1.5" aria-label={`${dayLabel(i)}: ${n} từ`}>
            <span className="font-num text-sm">{n}</span>
            <motion.span
              className={cx('w-full max-w-10 rounded-t-[10px] border-thick border-line', i === 0 ? 'bg-primary' : 'bg-sky')}
              initial={{ height: 0 }}
              whileInView={{ height: `${(n / max) * 100}%` }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.05, duration: 0.5, ease: 'easeOut' }}
              style={{ minHeight: 6 }}
            />
            <span className={cx('font-display text-xs font-bold uppercase', i === 0 ? 'text-primary' : 'text-muted')}>{dayLabel(i)}</span>
          </li>
        ))}
      </ol>
    </section>
  )
}

function UrgentBox() {
  const { urgent } = useContext(ReviewData)
  const navigate = useNavigate()
  if (urgent.length === 0) return null
  return (
    <section className="flex flex-col gap-4 rounded-panel border-thick border-danger bg-[color-mix(in_srgb,var(--color-danger)_10%,var(--color-surface))] p-5 shadow-hard md:p-6">
      <div className="flex items-center gap-3">
        <IconBadge icon={Siren} bg="danger" size="md" shape="square" />
        <div className="min-w-0 flex-1">
          <h2 className="text-h3 leading-tight">Ôn gấp · {urgent.length} từ</h2>
          <p className="text-caption text-muted">Vừa quên ở Cửa Ải Hôm Nay. Ôn lại trước để lấy lại từ đã thuộc.</p>
        </div>
      </div>
      <ul className="grid gap-2 sm:grid-cols-3">
        {urgent.map((w) => (
          <li key={w.word} className="flex flex-col gap-1 rounded-card border-2 border-danger bg-surface px-4 py-3">
            <div className="flex items-center justify-between gap-2">
              <span className="font-display text-lg font-bold">{w.word}</span>
              <LevelTag level={w.level} size="sm" />
            </div>
            <span className="text-caption font-medium">{w.meaning}</span>
            <span className="text-xs font-semibold text-danger-deep">{w.forgotAt}</span>
          </li>
        ))}
      </ul>
      <Button variant="danger" icon={Lightning} className="self-start max-sm:w-full" onClick={() => navigate('/academy/review/session?urgent=1')}>
        Ôn gấp {urgent.length} từ
      </Button>
    </section>
  )
}

function StatusDot({ status }) {
  const s = STATUSES[status]
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap text-caption font-semibold">
      <span className="size-3 shrink-0 rounded-pill border-2 border-line" style={{ background: `var(--color-${s.color})` }} aria-hidden="true" />
      {s.label}
    </span>
  )
}

function DueLabel({ days }) {
  return (
    <span className={cx('whitespace-nowrap font-display text-sm font-bold uppercase', days === 0 ? 'text-danger-deep' : 'text-muted')}>
      {formatDueIn(days)}
    </span>
  )
}

function WordList() {
  const { words } = useContext(ReviewData)
  const [query, setQuery] = useState('')
  const [level, setLevel] = useState('all')
  const [status, setStatus] = useState('all')

  const items = useMemo(() => {
    const q = query.trim().toLowerCase()
    return words.filter(
      (w) =>
        (level === 'all' || w.level === level) &&
        (status === 'all' || w.status === status) &&
        (!q || w.word.toLowerCase().includes(q) || w.meaning.toLowerCase().includes(q)),
    )
  }, [words, query, level, status])

  const chips = [['all', { label: 'Tất cả' }], ...Object.entries(STATUSES)]

  return (
    <section className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <IconBadge icon={BookOpenText} bg="primary" size="sm" shape="square" shadow={false} />
        <h2 className="text-h3">Sổ từ của bạn</h2>
      </div>

      <div className="grid gap-3 md:grid-cols-[1fr_200px]">
        <Input icon={MagnifyingGlass} placeholder="Tìm từ hoặc nghĩa…" value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Tìm từ" type="search" />
        <Select options={LEVEL_OPTIONS} value={level} onChange={(e) => setLevel(e.target.value)} aria-label="Lọc theo cấp" />
      </div>

      <div role="radiogroup" aria-label="Lọc theo trạng thái" className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 md:mx-0 md:flex-wrap md:px-0">
        {chips.map(([key, s]) => {
          const active = status === key
          return (
            <button
              key={key}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => setStatus(key)}
              className={cx(
                'flex h-11 shrink-0 items-center gap-2 rounded-pill border-thick border-line px-4 font-display text-sm font-bold uppercase transition-colors',
                active ? 'bg-ink text-white' : 'bg-surface hover:bg-raised',
              )}
            >
              {s.color && <span className="size-3 rounded-pill border-2 border-line" style={{ background: `var(--color-${s.color})` }} aria-hidden="true" />}
              {s.label}
            </button>
          )
        })}
      </div>

      {items.length === 0 ? (
        <p className="rounded-card border-thick border-dashed border-line/40 p-8 text-center text-muted">Không có từ nào khớp bộ lọc.</p>
      ) : (
        <>
          {/* Desktop: dạng bảng */}
          <div className="hidden overflow-hidden rounded-panel border-thick border-line bg-surface shadow-hard md:block">
            <div className="hud-label grid grid-cols-[minmax(0,1.4fr)_minmax(0,1.3fr)_56px_110px_120px] gap-4 border-b-thick border-line bg-raised px-5 py-3">
              <span>Từ</span>
              <span>Nghĩa</span>
              <span>Cấp</span>
              <span>Trạng thái</span>
              <span className="text-right">Ôn tiếp</span>
            </div>
            <ul className="divide-y-2 divide-line/10">
              {items.map((w) => (
                <li key={w.word} className="grid grid-cols-[minmax(0,1.4fr)_minmax(0,1.3fr)_56px_110px_120px] items-center gap-4 px-5 py-3">
                  <span className="truncate font-display text-lg font-bold">{w.word}</span>
                  <span className="truncate font-medium">{w.meaning}</span>
                  <LevelTag level={w.level} size="sm" className="justify-self-start" />
                  <StatusDot status={w.status} />
                  <span className="text-right">
                    <DueLabel days={w.dueInDays} />
                  </span>
                </li>
              ))}
            </ul>
          </div>

          {/* Mobile: card gọn */}
          <ul className="flex flex-col gap-2.5 md:hidden">
            {items.map((w) => (
              <li key={w.word} className="flex flex-col gap-1.5 rounded-card border-thick border-line bg-surface px-4 py-3 shadow-hard-sm">
                <div className="flex items-center justify-between gap-3">
                  <span className="min-w-0 truncate font-display text-lg font-bold">{w.word}</span>
                  <LevelTag level={w.level} size="sm" />
                </div>
                <span className="text-caption font-medium">{w.meaning}</span>
                <div className="flex items-center justify-between gap-3">
                  <StatusDot status={w.status} />
                  <DueLabel days={w.dueInDays} />
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  )
}

export default function Review() {
  const navigate = useNavigate()
  const state = useServerData(() => getReviewDue().then(fromServer), [])
  if (state.status === 'loading') {
    return (
      <div className="flex flex-col gap-6" role="status" aria-label="Đang tải">
        <Skeleton className="h-56 w-full" rounded="rounded-panel" />
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {[0, 1, 2, 3].map((k) => (
            <Skeleton key={k} className="h-28" rounded="rounded-card" />
          ))}
        </div>
      </div>
    )
  }
  if (state.status === 'error') return <ErrorState title="Chưa tải được danh sách ôn tập" onRetry={state.reload} />
  const data = state.data
  if (data.words.length === 0 && data.summary.due === 0) {
    return (
      <EmptyState
        title="Chưa có từ nào để ôn"
        message="Học bài đầu tiên trong Học Viện, từ đã học sẽ hiện ở đây đúng lúc cần ôn."
        action={
          <Button icon={BookOpenText} onClick={() => navigate('/academy')}>
            Vào Học Viện
          </Button>
        }
      />
    )
  }
  return (
    <ReviewData.Provider value={data}>
    <div className="flex flex-col gap-6 pb-20 md:gap-8 md:pb-0">
      <Hero />
      <StatCards />
      <UrgentBox />
      <div className="grid gap-6 md:gap-8 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0">
          <WordList />
        </div>
        <aside className="order-first xl:order-none xl:sticky xl:top-8 xl:self-start">
          <ForecastChart />
        </aside>
      </div>

      {/* Mobile: nút chính dính đáy, nằm trên thanh tab */}
      <div className="fixed inset-x-0 bottom-[calc(74px+env(safe-area-inset-bottom))] z-30 border-t-thick border-line bg-bg px-4 py-3 md:hidden">
        <StartButton className="w-full" />
      </div>
    </div>
    </ReviewData.Provider>
  )
}
