/*
 * Bảng xếp hạng (GET /leaderboard).
 *
 * Tab "Học tập (tuần)": số từ hệ thống mới đạt "đã thuộc" trong tuần ISO hiện tại (giờ Việt Nam, từ thứ Hai 00:00), đồng hồ
 * đếm ngược tới hết tuần lấy từ `seconds_left` của server. Tab "Tổng": tổng số từ đã thuộc. Từ tự tạo không tính.
 * Tab "Đấu Trường" và "Bạn bè": "Sắp ra mắt" (chưa có Đấu Trường và hệ thống bạn bè).
 * Bục vinh quang top 3, danh sách từ hạng 4 (hạng, avatar linh vật, tên, rank, điểm). Dòng của mình tô xanh chanh kèm câu
 * động viên "Thêm … để vượt …" (tính từ người ngay trên trong danh sách) và dính ở đáy màn hình khi khuất; ngoài top thì
 * hiện ô "Hạng của bạn" từ `my_entry` (kể cả khi đã tắt hiện trên bảng ở Hồ sơ).
 * Mọi khối có trạng thái tải / lỗi + Thử lại / trống. Không có số liệu nào không lấy từ server.
 *
 * Dev: `?board=weekly|alltime|arena|friends`.
 */

import { useEffect, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { EyeSlash, GraduationCap, Hourglass, Sword, Timer, UsersThree } from '@phosphor-icons/react'
import Button from '../../components/ui/Button'
import Icon, { IconBadge } from '../../components/ui/Icon'
import RankEmblem from '../../components/ui/RankEmblem'
import MascotBlob from '../../components/collection/MascotBlob'
import { EmptyState, ErrorState, Skeleton } from '../../components/ui/DataState'
import useCountdown from '../../hooks/useCountdown'
import useServerData from '../../hooks/useServerData'
import { getLeaderboard } from '../../services/profileApi'
import { useAuthStore } from '../../store/authStore'
import { FALLBACK_MASCOT, useMascotCatalog } from '../../store/mascotStore'
import cx from '../../utils/cx'
import { formatNumber } from '../../utils/format'
import Podium from './Podium'

const BOARDS = [
  { key: 'weekly', label: 'Học tập (tuần)' },
  { key: 'alltime', label: 'Tổng' },
  { key: 'arena', label: 'Đấu Trường' },
  { key: 'friends', label: 'Bạn bè' },
]

export const UNITS = {
  weekly: { plus: true, short: 'từ', label: (v) => `+${v} từ tuần này`, gap: 'từ' },
  alltime: { short: 'từ', label: (v) => `${v} từ đã thuộc`, gap: 'từ' },
}

const SOON = {
  arena: { icon: Sword, bg: 'orange', title: 'Bảng Đấu Trường sắp ra mắt', text: 'Xếp hạng theo trận thắng sẽ có khi Đấu Trường mở.' },
  friends: { icon: UsersThree, bg: 'sky', title: 'Bảng bạn bè sắp ra mắt', text: 'Kết bạn và so tài vốn từ với bạn bè sẽ có trong bản sau.' },
}

/** Phản hồi GET /leaderboard → các dòng hiển thị. Hàm thuần (test ở tests/leaderboard.test.jsx). */
export function toRows(entries, username, byId) {
  return entries.map((e) => ({
    id: e.username,
    name: e.display_name,
    handle: e.username,
    mascot: byId[e.avatar_mascot_id] ?? FALLBACK_MASCOT,
    rank: e.tier,
    place: e.rank,
    value: e.score,
    isMe: e.username === username,
  }))
}

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

function Avatar({ mascot, className }) {
  return (
    <span className={cx('grid size-11 shrink-0 place-items-center overflow-hidden rounded-pill border-thick border-line bg-raised md:size-12', className)}>
      <MascotBlob color={mascot.color} shape={mascot.shape} traits={mascot.traits} size={48} shadow={false} className="mt-2 size-10 md:size-11" />
    </span>
  )
}

function Row({ row, unit, rowRef, floating = false }) {
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
          {unit.plus ? '+' : ''}
          {formatNumber(row.value)}
        </span>
        <span className="block font-display text-[13px] font-bold uppercase text-muted">{unit.short}</span>
      </span>
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

function MyEntry({ me, unit }) {
  return (
    <div className="flex flex-col gap-2">
      <p className="flex items-center gap-3 font-display text-sm font-bold uppercase tracking-wide text-muted" aria-hidden="true">
        <span className="h-0.5 flex-1 bg-line/20" /> Hạng của bạn <span className="h-0.5 flex-1 bg-line/20" />
      </p>
      <div className="flex items-center gap-3 rounded-card border-[3.5px] border-line bg-accent px-4 py-3 shadow-hard">
        <span className="font-num text-xl">{me.rank != null ? `#${formatNumber(me.rank)}` : '—'}</span>
        <span className="min-w-0 flex-1 font-heading font-extrabold">
          {me.rank != null ? 'Bạn' : unit.plus ? 'Bạn chưa có từ mới thuộc trong tuần này' : 'Bạn chưa thuộc từ nào'}
        </span>
        <span className="font-num text-lg">
          {unit.plus ? '+' : ''}
          {formatNumber(me.score)} {unit.short}
        </span>
      </div>
      {me.hidden && (
        <p className="flex items-center gap-2 text-caption text-muted">
          <Icon icon={EyeSlash} size={16} /> Bạn đang ẩn khỏi bảng xếp hạng (đổi trong Hồ sơ → Chỉnh sửa).
        </p>
      )}
    </div>
  )
}

function BoardSkeleton() {
  return (
    <div className="flex flex-col gap-3" role="status" aria-label="Đang tải bảng xếp hạng">
      <Skeleton className="h-64 w-full md:h-80" rounded="rounded-panel" />
      {[0, 1, 2, 3].map((k) => (
        <Skeleton key={k} className="h-16 w-full" rounded="rounded-card" />
      ))}
    </div>
  )
}

function SoonPanel({ kind }) {
  const s = SOON[kind]
  return (
    <div className="flex flex-col items-center gap-4 rounded-panel border-thick border-dashed border-line bg-surface px-6 py-12 text-center">
      <IconBadge icon={s.icon} bg={s.bg} size="lg" />
      <span className="inline-flex items-center gap-1 rounded-pill border-2 border-line bg-gold px-3 py-0.5 font-display text-[13px] font-bold uppercase">
        <Icon icon={Hourglass} size={14} /> Sắp ra mắt
      </span>
      <p className="font-heading text-xl font-extrabold md:text-2xl">{s.title}</p>
      <p className="max-w-sm font-medium text-muted">{s.text}</p>
    </div>
  )
}

function WeekTimer({ seconds }) {
  const [deadline] = useState(() => Date.now() + seconds * 1000)
  const t = useCountdown(deadline)
  return (
    <p className="inline-flex w-fit items-center gap-2 whitespace-nowrap rounded-pill border-thick border-line bg-danger px-3.5 font-display text-[13px] font-bold uppercase leading-10 tracking-wide shadow-hard-sm sm:text-sm" role="timer">
      <Icon icon={Timer} size={20} />
      <span>
        <span className="max-sm:hidden">Tuần này kết thúc sau </span>
        <span className="sm:hidden">Hết tuần sau </span>
        <span className="font-num">{t.days}</span> ngày{' '}
        <span className="font-num">
          {String(t.hours).padStart(2, '0')}:{String(t.minutes).padStart(2, '0')}:{String(t.seconds).padStart(2, '0')}
        </span>
      </span>
    </p>
  )
}

function BoardView({ board }) {
  const navigate = useNavigate()
  const username = useAuthStore((s) => s.user?.username)
  const { byId } = useMascotCatalog()
  const user = useAuthStore((s) => s.user)
  const state = useServerData(() => getLeaderboard(board, 50), [board])
  const unit = UNITS[board]
  const data = state.data
  const rows = data ? toRows(data.entries, username, byId) : []
  const meRow = rows.find((r) => r.isMe)
  const meIndex = rows.findIndex((r) => r.isMe)
  const above = meIndex > 0 ? rows.slice(0, meIndex).reverse().find((r) => r.value > meRow.value) : null

  const meRef = useRef(null)
  const [meVisible, setMeVisible] = useState(true)
  useEffect(() => {
    const el = meRef.current
    if (!el) return undefined
    const io = new IntersectionObserver(([entry]) => setMeVisible(entry.isIntersecting), { rootMargin: '0px 0px -90px 0px' })
    io.observe(el)
    return () => io.disconnect()
  }, [data])

  if (state.status === 'loading') return <BoardSkeleton />
  if (state.status === 'error') return <ErrorState title="Chưa tải được bảng xếp hạng" onRetry={state.reload} />

  const renderRow = (row) => (
    <div key={row.id} className="flex flex-col gap-2">
      {row.isMe && <Motivation me={meRow} above={above} unit={unit} />}
      <Row row={row} unit={unit} rowRef={row.isMe ? meRef : undefined} />
    </div>
  )

  return (
    <>
      {board === 'weekly' && data.seconds_left != null && <WeekTimer key={data.week_start} seconds={data.seconds_left} />}
      {rows.length === 0 ? (
        <EmptyState
          mascot={byId[user?.avatar_mascot_id]}
          title={board === 'weekly' ? 'Tuần này chưa ai lên bảng' : 'Chưa có ai trên bảng'}
          message="Thuộc từ mới trong Học Viện để là người đầu tiên."
          action={
            <Button icon={GraduationCap} onClick={() => navigate('/academy')}>
              Vào Học Viện
            </Button>
          }
        />
      ) : (
        <div className="flex min-w-0 flex-col gap-5">
          <Podium rows={rows} unit={unit} />
          {meRow && meRow.place <= 3 && <Motivation me={meRow} above={above} unit={unit} className="mx-auto" />}
          {rows.length > 3 && <ul className="flex flex-col gap-2.5">{rows.slice(3).map(renderRow)}</ul>}
        </div>
      )}
      {!meRow && <MyEntry me={data.my_entry} unit={unit} />}

      {/* Dòng của mình dính ở đáy khi không nằm trong vùng đang xem (mobile: ngay trên tab bar) */}
      <AnimatePresence>
        {meRow && meRow.place > 3 && !meVisible && (
          <motion.div
            className="fixed inset-x-0 bottom-[calc(76px+env(safe-area-inset-bottom))] z-30 md:bottom-4 md:left-64"
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 420, damping: 34 }}
          >
            <div className="mx-auto w-full max-w-6xl px-3 md:px-10">
              <div className="flex flex-col gap-2 rounded-t-[28px] bg-bg px-1 pb-2 pt-2 md:rounded-[28px] md:px-2">
                <Motivation me={meRow} above={above} unit={unit} className="max-md:text-[13px]" />
                <ul>
                  <Row row={meRow} unit={unit} floating />
                </ul>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}

export default function Leaderboard() {
  const [params, setParams] = useSearchParams()
  const board = BOARDS.some((b) => b.key === params.get('board')) ? params.get('board') : 'weekly'

  return (
    <div className="flex flex-col gap-5 pb-24 md:gap-7 md:pb-24">
      <header className="flex flex-col gap-4">
        <h1 className="font-heading text-[32px] font-black uppercase leading-none md:text-h1">Bảng xếp hạng</h1>
        <ChipTabs items={BOARDS} value={board} onChange={(key) => setParams(key === 'weekly' ? {} : { board: key }, { replace: true })} label="Nội dung xếp hạng" />
        <p className="text-caption font-medium text-muted">
          {board === 'weekly' && 'Xếp theo số từ mới thuộc trong tuần (từ thứ Hai 00:00, giờ Việt Nam). Từ tự tạo không tính.'}
          {board === 'alltime' && 'Xếp theo tổng số từ đã thuộc. Từ tự tạo không tính.'}
        </p>
      </header>
      {SOON[board] ? <SoonPanel kind={board} /> : <BoardView key={board} board={board} />}
    </div>
  )
}
