/*
 * Sảnh Đấu Trường: tìm trận, tạo/vào phòng bằng mã.
 *
 * Giống sảnh chờ game mobile đối kháng: nền sân đấu 3 lớp tràn màn hình (không nằm trong khung PageShell,
 * nhưng vẫn có thanh điều hướng), linh vật của người chơi đứng "idle" trên bệ tròn phát sáng tím.
 * HUD trên cùng (người chơi + rank, chuỗi thắng, thắng/thua tuần, cài đặt). Nút "TÌM TRẬN" cam cực lớn ở giữa
 * dưới, hai bên là "PHÒNG RIÊNG" và "LUYỆN VỚI BOT" (sắp ra mắt). Cột trái: trận gần đây, thành tích.
 * Cột phải: bảng xếp hạng tuần, bạn bè online. Mobile: hai tab trượt lên từ đáy thay cho hai cột.
 * Mọi số liệu do server trả (hiện lấy từ arenaMock.js). Linh vật chỉ để trang trí, không có chỉ số.
 *
 * Dev: `?room=create|created|join` (mở hộp thoại Phòng riêng), `?sheet=recent|board` (mở tab trượt trên mobile).
 */

import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import {
  ChartBar,
  ClockCounterClockwise,
  Crown,
  Fire,
  GearSix,
  Key,
  Lightning,
  Medal,
  Robot,
  Sword,
  Target,
  Timer,
  UsersThree,
  XCircle,
} from '@phosphor-icons/react'
import Button, { IconButton } from '../../components/ui/Button'
import Icon, { IconBadge } from '../../components/ui/Icon'
import RankBadge from '../../components/ui/RankBadge'
import Sticker from '../../components/ui/Sticker'
import MascotBlob from '../../components/collection/MascotBlob'
import NavBar from '../../components/layout/NavBar'
import { useToastStore } from '../../store/toastStore'
import cx from '../../utils/cx'
import { RANK_BY_KEY } from '../../utils/constants'
import { formatDecimal, formatTimeAgo } from '../../utils/format'
import { ArenaForeground, ArenaScene } from './ArenaScene'
import PrivateRoomModal from './PrivateRoomModal'
import { FRIENDS, LOBBY, PLAYER, RECENT_MATCHES, STATS, WEEKLY_BOARD } from './arenaMock'
import useSocket from '../../hooks/useSocket'

const MEDALS = { 1: 'gold', 2: 'rank-bac', 3: 'rank-dong' }

function Avatar({ name, color, size = 'md', online = false }) {
  const dark = color === 'primary'
  return (
    <span className="relative shrink-0">
      <span
        className={cx(
          'grid place-items-center rounded-pill border-thick border-line font-display font-bold uppercase',
          size === 'sm' ? 'size-9 text-sm' : 'size-11 text-base',
          dark ? 'text-white' : 'text-ink',
        )}
        style={{ background: `var(--color-${color})` }}
        aria-hidden="true"
      >
        {name.charAt(0)}
      </span>
      {online && <span className="absolute -bottom-0.5 -right-0.5 size-3.5 rounded-pill border-2 border-line bg-accent" aria-label="Đang online" />}
    </span>
  )
}

function ArenaCard({ title, icon, iconBg, className, children }) {
  return (
    <section className={cx('flex flex-col gap-3 rounded-card border-thick border-line bg-surface p-4 shadow-hard', className)}>
      <div className="flex items-center gap-2.5">
        <IconBadge icon={icon} bg={iconBg} size="sm" shape="square" shadow={false} />
        <h2 className="font-display text-base font-bold uppercase tracking-wider">{title}</h2>
      </div>
      {children}
    </section>
  )
}

// ---------- HUD ----------

function PlayerChip() {
  return (
    <div className="flex items-center gap-2.5 rounded-pill border-thick border-line bg-surface py-1 pl-1 pr-4 shadow-hard">
      <span className="grid size-11 place-items-center overflow-hidden rounded-pill border-thick border-line bg-raised">
        <MascotBlob color={PLAYER.mascot.color} shape={PLAYER.mascot.shape} size={52} shadow={false} className="translate-y-1.5" />
      </span>
      <div className="leading-tight">
        <div className="font-heading text-lg font-extrabold">{PLAYER.name}</div>
        <div className="flex items-center gap-1.5">
          <RankBadge rank={PLAYER.rank} size="sm" showName={false} className="[&>div]:size-5 [&>div]:rounded-[6px] [&>div]:border-2 [&>div]:shadow-none [&_svg]:size-3" />
          <span className="font-display text-xs font-bold uppercase tracking-wider">{RANK_BY_KEY[PLAYER.rank].name}</span>
        </div>
      </div>
    </div>
  )
}

function StreakPill() {
  return (
    <div className="flex items-center gap-2 rounded-pill border-thick border-line bg-surface py-1 pl-1 pr-4 shadow-hard" aria-label={`Chuỗi thắng ${LOBBY.winStreak} trận`}>
      <IconBadge icon={Fire} bg="orange" size="sm" shadow={false} />
      <span className="font-display text-xs font-bold uppercase tracking-wider md:text-sm">Chuỗi thắng</span>
      <span className="font-num text-2xl leading-none text-orange [-webkit-text-stroke:1.5px_var(--color-ink)]">{LOBBY.winStreak}</span>
    </div>
  )
}

function WeekPill({ className }) {
  return (
    <div className={cx('flex h-11 items-center gap-2 rounded-pill border-thick border-line bg-surface px-4 shadow-hard', className)}>
      <span className="hud-label hidden text-ink/70 lg:inline">Tuần này</span>
      <span className="font-num text-base text-accent-deep">{LOBBY.week.wins} thắng</span>
      <span className="text-muted">·</span>
      <span className="font-num text-base text-danger-deep">{LOBBY.week.losses} thua</span>
    </div>
  )
}

function Hud({ onSettings }) {
  return (
    <header className="relative z-20 flex flex-wrap items-center gap-x-3 gap-y-2.5 px-4 pt-4 md:px-8 md:pt-6">
      <div className="order-1">
        <PlayerChip />
      </div>
      <div className="order-3 flex w-full justify-center gap-2 md:order-2 md:w-auto md:flex-1">
        <StreakPill />
        <WeekPill className="md:hidden" />
      </div>
      <div className="order-2 ml-auto flex items-center gap-3 md:order-3 md:ml-0">
        <WeekPill className="hidden md:flex" />
        <IconButton icon={GearSix} label="Cài đặt" onClick={onSettings} />
      </div>
    </header>
  )
}

// ---------- Sân khấu và nút ----------

function Stage() {
  return (
    <div className="relative flex flex-col items-center" aria-label={`Linh vật ${PLAYER.mascot.name}`} role="img">
      <Sticker bg="primary" tilt={-4} size="sm" className="relative z-20 mb-1">
        {PLAYER.mascot.name}
      </Sticker>
      <div className="anim-idle relative z-20">
        <MascotBlob color={PLAYER.mascot.color} shape={PLAYER.mascot.shape} size={220} shadow={false} className="size-40 md:size-[200px]" />
      </div>
      {/* Bóng elip dưới chân */}
      <span className="anim-idle-shadow relative z-10 -mt-7 h-6 w-28 rounded-[50%] bg-ink md:w-36" aria-hidden="true" />
      {/* Bệ tròn phát sáng tím */}
      <div className="anim-pedestal relative -mt-9 h-20 w-60 rounded-[50%] border-thick border-line md:h-24 md:w-80" style={{ background: 'color-mix(in srgb, var(--color-primary) 70%, var(--color-ink))' }} aria-hidden="true">
        <span className="absolute inset-x-0 top-0 h-14 rounded-[50%] border-b-thick border-line md:h-16" style={{ background: 'color-mix(in srgb, var(--color-primary) 65%, var(--color-surface))' }} />
      </div>
    </div>
  )
}

function FindMatchButton({ onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="pressable relative flex h-[88px] min-w-0 flex-1 items-center justify-center gap-2 overflow-hidden rounded-[26px] border-[3px] border-line bg-orange px-3 md:gap-3 md:px-6 shadow-[6px_6px_0_0_var(--color-line)] hover:-translate-y-0.5 md:w-[340px] md:flex-none"
    >
      <span className="anim-shine pointer-events-none absolute inset-y-0 left-0 w-1/4 bg-white/60" aria-hidden="true" />
      <Icon icon={Sword} size={36} className="relative shrink-0" />
      <span className="relative whitespace-nowrap font-display text-[28px] font-bold uppercase leading-none tracking-wide md:text-[44px]">Tìm trận</span>
    </button>
  )
}

function SideAction({ icon, label, bg, soon, onClick }) {
  return (
    <div className="relative flex shrink-0 flex-col items-center gap-1.5">
      {soon && (
        <Sticker bg="gold" tilt={6} size="sm" className="absolute -top-5 right-0 z-10 !h-6 !px-2 !text-[11px] md:-right-4 md:-top-4">
          Sắp ra mắt
        </Sticker>
      )}
      <button
        type="button"
        onClick={onClick}
        aria-label={label}
        className={cx(
          'pressable flex size-16 flex-col items-center justify-center gap-1 rounded-pill border-thick border-line shadow-hard hover:-translate-y-0.5',
          'md:h-[88px] md:w-28 md:rounded-[22px]',
          bg === 'primary' ? 'text-white' : 'text-ink',
          soon && 'saturate-50',
        )}
        style={{ background: `var(--color-${bg})` }}
      >
        <Icon icon={icon} size={30} />
        <span className="hidden text-center font-display text-xs font-bold uppercase leading-tight tracking-wide md:block">{label}</span>
      </button>
      <span className="w-16 text-center font-display text-[11px] font-bold uppercase leading-tight md:hidden">{label}</span>
    </div>
  )
}

function Actions({ onFind, onRoom, onBot }) {
  return (
    <div className="flex w-full flex-col items-center gap-3">
      <span className="rounded-pill border-thick border-line bg-surface px-4 font-display text-sm font-bold uppercase leading-8 shadow-hard-sm">
        Đấu theo rank · Từ vựng {LOBBY.rankedPool}
      </span>
      <div className="flex w-full max-w-xl items-start gap-3 md:w-auto md:max-w-none md:items-end md:gap-5">
        <SideAction icon={Key} label="Phòng riêng" bg="primary" onClick={onRoom} />
        <div className="flex min-w-0 flex-1 md:flex-none">
          <FindMatchButton onClick={onFind} />
        </div>
        <SideAction icon={Robot} label="Luyện với bot" bg="sky" soon onClick={onBot} />
      </div>
    </div>
  )
}

// ---------- Các card thông tin ----------

function RecentMatches() {
  return (
    <ArenaCard title="Trận gần đây" icon={ClockCounterClockwise} iconBg="sky">
      <ul className="flex flex-col divide-y-2 divide-line/10">
        {RECENT_MATCHES.map((m) => (
          <li key={m.id} className="flex items-center gap-3 py-2">
            <Avatar name={m.opponent} color={m.color} size="sm" />
            <div className="min-w-0 flex-1 leading-tight">
              <div className="truncate font-semibold">{m.opponent}</div>
              <div className="text-xs text-muted">{formatTimeAgo(m.minutesAgo)}</div>
            </div>
            <span className="font-num text-sm text-muted">{m.hpLeft} HP</span>
            <span
              className={cx(
                'w-16 rounded-pill border-2 border-line text-center font-display text-xs font-bold uppercase leading-6',
                m.won ? 'bg-accent' : 'bg-danger',
              )}
            >
              {m.won ? 'Thắng' : 'Thua'}
            </span>
          </li>
        ))}
      </ul>
    </ArenaCard>
  )
}

function Achievements() {
  const items = [
    { icon: Target, bg: 'accent', value: `${STATS.accuracy}%`, label: 'Chính xác TB' },
    { icon: Timer, bg: 'sky', value: `${formatDecimal(STATS.avgSeconds)}s`, label: 'Tốc độ TB' },
    { icon: Lightning, bg: 'gold', value: STATS.bestCombo, label: 'Combo cao nhất' },
  ]
  return (
    <ArenaCard title="Thành tích" icon={ChartBar} iconBg="gold">
      <div className="grid grid-cols-3 gap-2">
        {items.map((it) => (
          <div key={it.label} className="flex flex-col items-center gap-1.5 rounded-[16px] border-2 border-line bg-raised px-1 py-3 text-center">
            <IconBadge icon={it.icon} bg={it.bg} size="sm" shadow={false} />
            <span className="font-num text-xl leading-none">{it.value}</span>
            <span className="text-[13px] font-medium leading-tight text-muted">{it.label}</span>
          </div>
        ))}
      </div>
    </ArenaCard>
  )
}

function WeeklyBoard() {
  return (
    <ArenaCard title="Bảng xếp hạng tuần" icon={Crown} iconBg="gold">
      <ol className="flex flex-col gap-1.5">
        {WEEKLY_BOARD.map((p) => (
          <li
            key={p.place}
            className={cx(
              'flex items-center gap-3 rounded-[16px] border-2 px-2 py-1.5',
              p.me ? 'border-line bg-primary text-white shadow-hard-sm' : 'border-transparent',
            )}
          >
            {MEDALS[p.place] ? (
              <IconBadge icon={Medal} bg={MEDALS[p.place]} size="sm" shadow={false} label={`Hạng ${p.place}`} />
            ) : (
              <span className="grid size-9 place-items-center font-num text-lg">{p.place}</span>
            )}
            <Avatar name={p.name} color={p.color} size="sm" />
            <span className="min-w-0 flex-1 truncate font-semibold">
              {p.name}
              {p.me && <span className="sr-only"> (bạn)</span>}
            </span>
            <span className="font-num text-sm">{p.wins} thắng</span>
          </li>
        ))}
      </ol>
    </ArenaCard>
  )
}

function FriendsOnline({ onChallenge }) {
  return (
    <ArenaCard title="Bạn bè đang online" icon={UsersThree} iconBg="accent">
      <ul className="flex flex-col gap-2.5">
        {FRIENDS.map((f) => (
          <li key={f.id} className="flex items-center gap-3">
            <Avatar name={f.name} color={f.color} size="sm" online />
            <div className="min-w-0 flex-1 leading-tight">
              <div className="truncate font-semibold">{f.name}</div>
              <div className="truncate text-xs text-muted">{f.status}</div>
            </div>
            <Button size="sm" variant="orange" disabled={f.busy} className="h-11 px-3 text-xs" onClick={() => onChallenge(f)}>
              Thách đấu
            </Button>
          </li>
        ))}
      </ul>
    </ArenaCard>
  )
}

// ---------- Mobile: 2 tab trượt lên từ đáy ----------

const SHEET_TABS = [
  { key: 'recent', label: 'Trận gần đây', icon: ClockCounterClockwise },
  { key: 'board', label: 'Xếp hạng tuần', icon: Crown },
]

function MobileSheet({ openTab, onOpen, onClose, onChallenge }) {
  return (
    <>
      {/* Thanh kéo nằm ngay trên tab bar */}
      <div className="fixed inset-x-0 bottom-[calc(74px+env(safe-area-inset-bottom))] z-30 rounded-t-panel border-x-thick border-t-thick border-line bg-surface px-3 pt-2 md:hidden">
        <span className="mx-auto mb-1.5 block h-1.5 w-12 rounded-pill bg-ink/20" aria-hidden="true" />
        <div className="grid grid-cols-2 gap-2 pb-2">
          {SHEET_TABS.map((t) => (
            <button key={t.key} type="button" onClick={() => onOpen(t.key)} className="flex h-11 items-center justify-center gap-2 rounded-pill font-display text-sm font-bold uppercase hover:bg-raised">
              <Icon icon={t.icon} size={20} />
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <AnimatePresence>
        {openTab && (
          <>
            <motion.div
              className="fixed inset-0 z-50 bg-ink/45 md:hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onClose}
            />
            <motion.section
              role="dialog"
              aria-modal="true"
              aria-label={SHEET_TABS.find((t) => t.key === openTab).label}
              className="fixed inset-x-0 bottom-0 z-50 flex max-h-[82dvh] flex-col rounded-t-panel border-t-thick border-line bg-bg md:hidden"
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', stiffness: 380, damping: 36 }}
              drag="y"
              dragConstraints={{ top: 0, bottom: 0 }}
              dragElastic={{ top: 0, bottom: 0.6 }}
              onDragEnd={(_, info) => info.offset.y > 110 && onClose()}
            >
              <div className="flex flex-col gap-2 px-4 pt-2">
                <span className="mx-auto block h-1.5 w-12 rounded-pill bg-ink/25" aria-hidden="true" />
                <div className="flex items-center gap-2">
                  <div role="tablist" className="grid flex-1 grid-cols-2 gap-1 rounded-pill border-thick border-line bg-raised p-1">
                    {SHEET_TABS.map((t) => (
                      <button
                        key={t.key}
                        type="button"
                        role="tab"
                        aria-selected={openTab === t.key}
                        onClick={() => onOpen(t.key)}
                        className={cx(
                          'h-11 rounded-pill font-display text-xs font-bold uppercase',
                          openTab === t.key ? 'border-2 border-line bg-primary text-white' : 'text-ink',
                        )}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>
                  <button type="button" onClick={onClose} aria-label="Đóng" className="grid size-11 place-items-center rounded-pill text-muted">
                    <Icon icon={XCircle} size={30} />
                  </button>
                </div>
              </div>
              <div className="flex flex-col gap-4 overflow-y-auto px-4 pb-[calc(1.5rem+env(safe-area-inset-bottom))] pt-4">
                {openTab === 'recent' ? (
                  <>
                    <RecentMatches />
                    <Achievements />
                  </>
                ) : (
                  <>
                    <WeeklyBoard />
                    <FriendsOnline onChallenge={onChallenge} />
                  </>
                )}
              </div>
            </motion.section>
          </>
        )}
      </AnimatePresence>
    </>
  )
}

// ---------- Trang ----------

export default function ArenaLobby() {
  // Kết nối Socket.IO chỉ mở khi vào Đấu Trường (xác thực bằng access token, tự làm mới khi hết hạn)
  useSocket()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const pushToast = useToastStore((s) => s.push)
  const roomParam = params.get('room')
  const [roomOpen, setRoomOpen] = useState(!!roomParam)
  const [sheet, setSheet] = useState(params.get('sheet'))

  const soon = (title) => pushToast({ variant: 'info', title, message: 'Tính năng này sắp ra mắt.' })
  const challenge = (friend) => pushToast({ variant: 'success', title: `Đã gửi lời thách đấu tới ${friend.name}`, message: 'Chờ bạn ấy chấp nhận nhé.' })

  return (
    <div className="min-h-dvh">
      <NavBar />
      <main className="md:pl-64">
        <div className="relative isolate flex min-h-dvh flex-col overflow-hidden pb-[calc(150px+env(safe-area-inset-bottom))] md:pb-0">
          <ArenaScene className="absolute inset-0 -z-10" />
          <Hud onSettings={() => soon('Cài đặt')} />

          <div className="relative z-20 grid flex-1 gap-6 px-4 pb-6 pt-4 md:px-8 md:pb-10 xl:grid-cols-[300px_minmax(0,1fr)_300px]">
            <aside aria-label="Lịch sử và thành tích" className="hidden flex-col gap-5 xl:flex">
              <RecentMatches />
              <Achievements />
            </aside>

            <section aria-label="Tìm trận" className="flex min-h-[460px] flex-col items-center justify-between gap-6 md:min-h-[620px] md:justify-end md:gap-10">
              <div className="flex flex-1 items-end md:flex-none">
                <Stage />
              </div>
              <Actions onFind={() => navigate('/arena/matchmaking')} onRoom={() => setRoomOpen(true)} onBot={() => soon('Luyện với bot')} />
            </section>

            <aside aria-label="Xếp hạng và bạn bè" className="hidden flex-col gap-5 xl:flex">
              <WeeklyBoard />
              <FriendsOnline onChallenge={challenge} />
            </aside>

            {/* Tablet: các card xếp dưới */}
            <div className="hidden gap-5 md:grid md:grid-cols-2 xl:hidden">
              <RecentMatches />
              <WeeklyBoard />
              <Achievements />
              <FriendsOnline onChallenge={challenge} />
            </div>
          </div>

          <ArenaForeground />
        </div>
      </main>

      <MobileSheet openTab={sheet} onOpen={setSheet} onClose={() => setSheet(null)} onChallenge={challenge} />

      <PrivateRoomModal
        open={roomOpen}
        onClose={() => setRoomOpen(false)}
        unlockedLevels={PLAYER.unlockedLevels}
        initialTab={roomParam === 'join' ? 'join' : 'create'}
        initialRoom={roomParam === 'created' ? { code: 'WX7K2', levels: PLAYER.unlockedLevels, questions: 20 } : null}
      />
    </div>
  )
}
