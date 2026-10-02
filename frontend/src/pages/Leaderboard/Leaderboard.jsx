/*
 * Bảng xếp hạng.
 *
 * Phần đầu: tiêu đề, đồng hồ đếm ngược mùa tuần, tab nội dung (HỌC TẬP: từ thuộc mới trong tuần · ĐẤU TRƯỜNG: trận thắng
 * trong tuần · TỔNG: tổng từ đã thuộc) và tab phạm vi (Bạn bè / Toàn quốc). Bục vinh quang top 3.
 * Danh sách từ hạng 4: hạng, thay đổi so với hôm qua, avatar linh vật, tên, rank, số liệu, nút "Thách đấu" (chỉ tab Đấu Trường).
 * Top 10 nằm trong "VÙNG THƯỞNG" viền vàng (thưởng chỉ gồm huy hiệu, khung avatar, lượt quay; không có lợi thế trong trận).
 * Dòng của mình tô xanh chanh, kèm câu động viên "Thêm … để vượt …", và dính ở đáy màn hình khi không nằm trong vùng đang xem.
 * Tab Bạn bè khi chưa có bạn: linh vật cầm ống nhòm và nút "MỜI BẠN". Dữ liệu do server trả (leaderboardMock.js).
 *
 * Dev: `?board=learn|arena|total`, `?scope=friends|national`, `?friends=empty`.
 */

import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { CaretDown, CaretUp, Gift, LinkSimple, Medal, Sword, Timer } from '@phosphor-icons/react'
import Button, { IconButton } from '../../components/ui/Button'
import Icon, { IconBadge } from '../../components/ui/Icon'
import RankEmblem from '../../components/ui/RankEmblem'
import MascotBlob from '../../components/collection/MascotBlob'
import useCountdown from '../../hooks/useCountdown'
import { useToastStore } from '../../store/toastStore'
import cx from '../../utils/cx'
import { formatNumber } from '../../utils/format'
import Podium from './Podium'
import { UNITS, WEEKLY_REWARDS, copyInviteLink, fetchLeaderboard } from './leaderboardMock'

const BOARDS = [
  { key: 'learn', label: 'Học tập' },
  { key: 'arena', label: 'Đấu trường' },
  { key: 'total', label: 'Tổng' },
]
const SCOPES = [
  { key: 'friends', label: 'Bạn bè' },
  { key: 'national', label: 'Toàn quốc' },
]

function ChipTabs({ items, value, onChange, label, tone = 'primary' }) {
  return (
    <div className="-mx-4 overflow-x-auto px-4 py-1 md:mx-0 md:px-0 [&::-webkit-scrollbar]:hidden [scrollbar-width:none]">
      <div className="flex w-max gap-2 md:rounded-pill md:border-thick md:border-line md:bg-surface md:p-1 md:shadow-hard-sm" role="tablist" aria-label={label}>
        {items.map((t) => {
          const active = value === t.key
          return (
            <button
              key={t.key}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => onChange(t.key)}
              className={cx(
                'h-11 whitespace-nowrap rounded-pill px-4 font-display text-sm font-bold uppercase tracking-wide transition-colors md:border-0 md:px-5 md:shadow-none',
                'border-thick border-line shadow-hard-sm',
                active ? (tone === 'primary' ? 'bg-primary text-white md:ring-2 md:ring-line' : 'bg-ink text-white') : 'bg-surface text-ink hover:bg-raised',
              )}
            >
              {t.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}

function Change({ value }) {
  if (value > 0)
    return (
      <span className="inline-flex items-center font-num text-[13px] text-accent-deep" aria-label={`Tăng ${value} hạng`}>
        <Icon icon={CaretUp} size={14} color="accent-deep" />
        {value}
      </span>
    )
  if (value < 0)
    return (
      <span className="inline-flex items-center font-num text-[13px] text-danger-deep" aria-label={`Giảm ${-value} hạng`}>
        <Icon icon={CaretDown} size={14} color="danger-deep" />
        {-value}
      </span>
    )
  return (
    <span className="font-num text-[13px] text-muted" aria-label="Giữ hạng">
      –
    </span>
  )
}

function Avatar({ mascot, className }) {
  return (
    <span className={cx('grid size-11 shrink-0 place-items-center overflow-hidden rounded-pill border-thick border-line bg-raised md:size-12', className)}>
      <MascotBlob color={mascot.color} shape={mascot.shape} traits={mascot.traits} size={48} shadow={false} className="mt-2 size-10 md:size-11" />
    </span>
  )
}

function Row({ row, unit, board, onChallenge, rowRef, floating = false }) {
  return (
    <li
      ref={rowRef}
      className={cx(
        'flex items-center gap-2.5 rounded-card border-line px-3 py-2 md:gap-4 md:px-4',
        row.isMe ? 'border-[3.5px] bg-accent shadow-hard' : 'border-thick bg-surface shadow-hard-sm',
        floating && 'shadow-hard-lg',
      )}
      aria-current={row.isMe ? 'true' : undefined}
    >
      <span className="flex w-10 shrink-0 flex-col items-center md:w-12">
        <span className="font-num text-lg leading-tight md:text-xl">{formatNumber(row.place)}</span>
        <Change value={row.change} />
      </span>
      <Avatar mascot={row.mascot} />
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="flex items-center gap-1.5">
          <span className="truncate font-heading text-base font-extrabold md:text-lg">{row.isMe ? `Bạn · Hạng ${formatNumber(row.place)}` : row.name}</span>
          <RankEmblem rank={row.rank} className="size-5 shrink-0" />
        </span>
        <span className="truncate text-[13px] font-medium text-muted">@{row.handle}</span>
      </span>
      <span className="shrink-0 text-right">
        <span className="font-num text-lg leading-none md:text-xl">
          {board === 'learn' ? '+' : ''}
          {formatNumber(row.value)}
        </span>
        <span className="block font-display text-[13px] font-bold uppercase text-muted">{unit.short}</span>
      </span>
      {board === 'arena' && !row.isMe && (
        <>
          <IconButton icon={Sword} label={`Thách đấu ${row.name}`} size="sm" variant="orange" onClick={() => onChallenge(row)} className="md:hidden" />
          <Button size="sm" variant="orange" icon={Sword} onClick={() => onChallenge(row)} className="whitespace-nowrap max-md:hidden">
            Thách đấu
          </Button>
        </>
      )}
    </li>
  )
}

function Motivation({ me, above, unit, className }) {
  if (!me) return null
  const text = !above
    ? 'Bạn đang dẫn đầu! Giữ vững phong độ nhé.'
    : `Thêm ${formatNumber(above.value - me.value + 1)} ${unit.gap} nữa để vượt @${above.handle} (hạng ${formatNumber(above.place)})`
  return (
    <p className={cx('w-fit max-w-full rounded-[14px] border-2 border-line bg-surface px-3 py-0.5 font-display text-[13px] font-bold uppercase leading-6 tracking-wide shadow-hard-sm', className)}>
      {text}
    </p>
  )
}

function RewardCard({ className }) {
  return (
    <section className={cx('flex flex-col gap-3 rounded-panel border-thick border-line bg-surface p-5 shadow-hard', className)}>
      <div className="flex items-center gap-3">
        <IconBadge icon={Gift} bg="gold" size="sm" shape="square" shadow={false} />
        <h2 className="font-heading text-xl font-extrabold">Phần thưởng tuần</h2>
      </div>
      <ul className="flex flex-col gap-2">
        {WEEKLY_REWARDS.map((r) => (
          <li key={r.places} className="rounded-[14px] border-2 border-line bg-raised px-3 py-2">
            <p className="font-display text-sm font-bold uppercase tracking-wide">{r.places}</p>
            <p className="text-caption text-muted">{r.items.join(' · ')}</p>
          </li>
        ))}
      </ul>
      <p className="text-caption font-medium text-muted">Phần thưởng chỉ để trang trí và quay thẻ, không có lợi thế trong trận.</p>
    </section>
  )
}

// Linh vật cầm ống nhòm
function Binoculars() {
  return (
    <div className="relative">
      <MascotBlob color="sky" shape="round" size={140} className="size-32" />
      <svg viewBox="0 0 120 120" className="absolute inset-0 size-32" aria-hidden="true">
        <g stroke="var(--color-ink)" strokeWidth="4" strokeLinejoin="round">
          <rect x="54" y="52" width="12" height="10" rx="3" fill="var(--color-ink)" />
          <circle cx="44" cy="60" r="14" fill="var(--color-ink)" />
          <circle cx="76" cy="60" r="14" fill="var(--color-ink)" />
          <circle cx="44" cy="60" r="8" fill="var(--color-sky)" />
          <circle cx="76" cy="60" r="8" fill="var(--color-sky)" />
        </g>
        <circle cx="41" cy="57" r="2.5" fill="var(--color-white)" />
        <circle cx="73" cy="57" r="2.5" fill="var(--color-white)" />
        {/* Hai tay cầm ống nhòm */}
        <ellipse cx="30" cy="74" rx="8" ry="6" fill="var(--color-sky)" stroke="var(--color-ink)" strokeWidth="4" />
        <ellipse cx="90" cy="74" rx="8" ry="6" fill="var(--color-sky)" stroke="var(--color-ink)" strokeWidth="4" />
      </svg>
    </div>
  )
}

function EmptyFriends({ onInvite }) {
  return (
    <div className="flex flex-col items-center gap-4 rounded-panel border-thick border-dashed border-line bg-surface px-6 py-10 text-center md:py-14">
      <Binoculars />
      <p className="font-heading text-xl font-extrabold md:text-2xl">Chưa có bạn nào ở đây. Mời bạn bè vào đấu!</p>
      <p className="max-w-sm font-medium text-muted">Học cùng bạn bè vui hơn nhiều, lại còn có người để thách đấu mỗi tuần.</p>
      <Button size="lg" icon={LinkSimple} onClick={onInvite}>
        Mời bạn
      </Button>
    </div>
  )
}

export default function Leaderboard() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const pushToast = useToastStore((s) => s.push)
  const [board, setBoard] = useState(params.get('board') ?? 'learn')
  const [scope, setScope] = useState(params.get('scope') ?? 'national')
  const noFriends = params.get('friends') === 'empty'
  const data = useMemo(() => fetchLeaderboard(board, scope, { noFriends }), [board, scope, noFriends])
  const [endsAt] = useState(data.endsAt)
  const t = useCountdown(endsAt)
  const unit = UNITS[board]

  const meRef = useRef(null)
  const [meVisible, setMeVisible] = useState(true)
  useEffect(() => {
    const el = meRef.current
    if (!el) return undefined
    const io = new IntersectionObserver(([entry]) => setMeVisible(entry.isIntersecting), { rootMargin: '0px 0px -90px 0px' })
    io.observe(el)
    return () => io.disconnect()
  }, [data])

  const rest = data.rows.slice(3)
  // Vùng thưởng tuần chỉ áp dụng cho bảng toàn quốc
  const zone = scope === 'national' ? rest.filter((r) => r.place <= 10) : []
  const after = scope === 'national' ? rest.filter((r) => r.place > 10) : rest
  const listAll = [...data.rows, ...(data.neighbors ?? [])]
  const meIndex = listAll.findIndex((r) => r.isMe)
  const above = meIndex > 0 ? listAll[meIndex - 1] : null

  const challenge = (row) => {
    pushToast({ variant: 'info', title: `Đã gửi lời thách đấu tới ${row.name}`, message: 'Chờ bạn ấy vào phòng nhé.' })
    navigate('/arena/room/WX7K2?state=waiting')
  }
  const invite = async () => {
    try {
      const url = await copyInviteLink()
      pushToast({ variant: 'success', title: 'Đã sao chép link mời', message: url.replace('https://', '') })
    } catch {
      pushToast({ variant: 'error', title: 'Không sao chép được link' })
    }
  }

  const renderRow = (row) => (
    <div key={row.id} className="flex flex-col gap-2">
      {row.isMe && <Motivation me={data.me} above={above} unit={unit} />}
      <Row row={row} unit={unit} board={board} onChallenge={challenge} rowRef={row.isMe ? meRef : undefined} />
    </div>
  )

  return (
    <div className="flex flex-col gap-5 pb-24 md:gap-7 md:pb-24">
      {/* Phần đầu */}
      <header className="flex flex-col gap-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <h1 className="font-heading text-[32px] font-black uppercase leading-none md:text-h1">Bảng xếp hạng</h1>
          <p className="inline-flex w-fit items-center gap-2 whitespace-nowrap rounded-pill border-thick border-line bg-danger px-3.5 font-display text-[13px] font-bold uppercase leading-10 tracking-wide shadow-hard-sm sm:text-sm" role="timer">
            <Icon icon={Timer} size={20} />
            <span>
              <span className="max-sm:hidden">Mùa tuần này kết thúc sau </span>
              <span className="sm:hidden">Mùa tuần kết thúc sau </span>
              <span className="font-num">{t.days}</span> ngày{' '}
              <span className="font-num">
                {String(t.hours).padStart(2, '0')}:{String(t.minutes).padStart(2, '0')}:{String(t.seconds).padStart(2, '0')}
              </span>
            </span>
          </p>
        </div>
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <ChipTabs items={BOARDS} value={board} onChange={setBoard} label="Nội dung xếp hạng" />
          <ChipTabs items={SCOPES} value={scope} onChange={setScope} label="Phạm vi" tone="ink" />
        </div>
        <p className="text-caption font-medium text-muted">
          {board === 'learn' && 'Xếp theo số từ thuộc mới trong tuần.'}
          {board === 'arena' && 'Xếp theo số trận thắng trong tuần.'}
          {board === 'total' && 'Xếp theo tổng số từ đã thuộc.'}
        </p>
      </header>

      {data.empty ? (
        <EmptyFriends onInvite={invite} />
      ) : (
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_300px] xl:items-start">
          <div className="flex min-w-0 flex-col gap-5">
            <Podium rows={data.rows} unit={unit} />
            {data.me && data.me.place <= 3 && <Motivation me={data.me} above={above} unit={unit} className="mx-auto" />}

            {/* Vùng thưởng top 10 */}
            {zone.length > 0 && (
              <section className="flex flex-col gap-2.5 rounded-panel border-thick border-line bg-[color-mix(in_srgb,var(--color-gold)_22%,var(--color-bg))] p-2.5 md:p-3">
                <p className="flex items-center justify-center gap-2 rounded-[14px] border-thick border-line bg-gold px-3 py-1.5 text-center font-display text-sm font-bold uppercase tracking-wide shadow-hard-sm">
                  <Icon icon={Medal} size={18} /> Vùng thưởng · Top 10 nhận huy hiệu tuần
                </p>
                <ul className="flex flex-col gap-2.5">{zone.map(renderRow)}</ul>
              </section>
            )}

            {after.length > 0 && <ul className="flex flex-col gap-2.5">{after.map(renderRow)}</ul>}

            {data.neighbors && (
              <>
                <p className="flex items-center gap-3 font-display text-sm font-bold uppercase tracking-wide text-muted" aria-hidden="true">
                  <span className="h-0.5 flex-1 bg-line/20" /> Quanh hạng của bạn <span className="h-0.5 flex-1 bg-line/20" />
                </p>
                <ul className="flex flex-col gap-2.5">{data.neighbors.map(renderRow)}</ul>
              </>
            )}
          </div>
          <RewardCard className="xl:sticky xl:top-8" />
        </div>
      )}

      {/* Dòng của mình dính ở đáy khi không nằm trong vùng đang xem (mobile: ngay trên tab bar) */}
      <AnimatePresence>
        {!data.empty && data.me && !meVisible && (
          <motion.div
            className="fixed inset-x-0 bottom-[calc(76px+env(safe-area-inset-bottom))] z-30 md:bottom-4 md:left-64"
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 420, damping: 34 }}
          >
            <div className="mx-auto w-full max-w-6xl px-3 md:px-10">
              <div className="grid xl:grid-cols-[minmax(0,1fr)_300px] xl:gap-6">
                <div className="flex flex-col gap-2 rounded-t-[28px] bg-bg px-1 pb-2 pt-2 md:rounded-[28px] md:px-2">
                  <Motivation me={data.me} above={above} unit={unit} className="max-md:text-[13px]" />
                  <ul>
                    <Row row={data.me} unit={unit} board={board} onChallenge={challenge} floating />
                  </ul>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
