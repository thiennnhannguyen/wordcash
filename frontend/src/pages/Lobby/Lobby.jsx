/*
 * Sảnh chính: vào Học Viện, Đấu Trường, Bộ Sưu Tập; hiện rank, streak, lượt quay.
 *
 * Màn người dùng thấy mỗi ngày sau khi làm xong Cửa Ải Hôm Nay; mục tiêu là cho biết ngay "hôm nay làm gì tiếp".
 * Bố cục desktop: lưới 12 cột. Hàng trên: cột trái 8 (chào hỏi → 2 card lớn → Từ của ngày + Mục tiêu hôm nay),
 * cột phải 4 (widget) — hai cột kết thúc gần bằng nhau. Hàng dưới trải hết 12 cột: Khóa học của tôi (7) + Hành trình (5)
 * (đặt cả hai trong cột trái làm cột trái dài hơn cột phải ~800px). Mobile xếp dọc: chào hỏi → Học Viện → Đấu Trường → Mục tiêu → Từ của ngày → Khóa học →
 * Hành trình → widget. Các khối hiện lần lượt (cách nhau 60ms); nền có họa tiết chấm và hình vẽ tay rất nhạt.
 *
 * Mọi số liệu lấy từ server (pages/Lobby/useLobbyData.js); mỗi khối tự có trạng thái đang tải / lỗi + Thử lại / trống.
 * Đấu Trường chưa có backend: card hiện "Sắp mở". Sticker và họa tiết chỉ là trang trí.
 * Xem các biến thể bằng tài khoản dev (backend/seeds/seed_dev_accounts.py): dev_normal, dev_shaky, dev_new.
 */

import { motion } from 'framer-motion'
import { Check, CheckCircle, Star, WarningCircle } from '@phosphor-icons/react'
import Icon from '../../components/ui/Icon'
import Sticker from '../../components/ui/Sticker'
import MascotBlob from '../../components/collection/MascotBlob'
import StatusBar from '../../components/layout/StatusBar'
import { ErrorState, Skeleton } from '../../components/ui/DataState'
import cx from '../../utils/cx'
import useServerData from '../../hooks/useServerData'
import * as coursesApi from '../../services/coursesApi'
import { getRoadmap } from '../../services/academyApi'
import { getDailyWord, getLeaderboard } from '../../services/profileApi'
import { useAuthStore } from '../../store/authStore'
import { useMascot } from '../../store/mascotStore'
import useLobbyStats from './useLobbyData'
import { AcademyCard, ArenaCard } from './LobbyCards'
import { DailyGoals, JourneyStrip, MyCourses, WordOfDay } from './LobbyBlocks'
import { MascotWidget, NextRankWidget, NextSpinWidget, TopWeekWidget } from './LobbyWidgets'

/** Hiện lần lượt khi tải trang: khối thứ `i` trễ i × 60ms. Giảm chuyển động thì chỉ mờ dần (MotionConfig ở App). */
function Appear({ i, className, children }) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: i * 0.06, duration: 0.35, ease: 'easeOut' }}
    >
      {children}
    </motion.div>
  )
}

/** Họa tiết nền rất nhạt: lưới chấm tròn + chữ cái, ngôi sao, đường xoắn, mũi tên cong, dấu nháy vẽ tay. */
function Backdrop() {
  const doodle = { fill: 'none', stroke: 'currentColor', strokeWidth: 2.5, strokeLinecap: 'round', strokeLinejoin: 'round' }
  const letter = { fill: 'currentColor', fontFamily: 'Chakra Petch, sans-serif', fontWeight: 700 }
  return (
    <svg aria-hidden="true" className="pointer-events-none fixed inset-0 z-0 size-full text-ink opacity-[0.07]">
      <defs>
        <pattern id="lobby-dots" width="22" height="22" patternUnits="userSpaceOnUse">
          <circle cx="3" cy="3" r="1.6" fill="currentColor" />
        </pattern>
        <pattern id="lobby-doodles" width="420" height="340" patternUnits="userSpaceOnUse">
          <text x="34" y="70" fontSize="44" transform="rotate(-12 34 70)" {...letter}>A</text>
          <text x="300" y="120" fontSize="40" transform="rotate(10 300 120)" {...letter}>B</text>
          <text x="160" y="300" fontSize="42" transform="rotate(-6 160 300)" {...letter}>Z</text>
          <path d="M210 40 l7 15 16 2 -12 11 3 16 -14 -8 -14 8 3 -16 -12 -11 16 -2 Z" {...doodle} />
          <path d="M70 200 c0 -8 12 -8 12 0 c0 14 -24 14 -24 0 c0 -22 36 -22 36 0 c0 30 -48 30 -48 0" {...doodle} />
          <path d="M290 230 q40 -40 80 -6" {...doodle} />
          <path d="M362 214 l9 11 -14 3" {...doodle} />
          <path d="M360 300 q-6 -14 4 -22 M378 300 q-6 -14 4 -22" {...doodle} strokeWidth="4" />
          <path d="M120 120 q10 -12 20 0 t20 0 t20 0" {...doodle} />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#lobby-dots)" />
      <rect width="100%" height="100%" fill="url(#lobby-doodles)" />
    </svg>
  )
}

function WeekRow({ days }) {
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2" aria-label="Tuần này">
      <span className="hud-label">Tuần này</span>
      <ol className="flex gap-1.5">
        {days.map((d) => {
          const studied = d.studied
          return (
            <li key={d.label} className="flex flex-col items-center gap-0.5">
              <span
                className={cx(
                  'grid size-8 place-items-center rounded-pill border-2',
                  studied ? 'border-line bg-accent' : d.state === 'future' ? 'border-line/25 bg-neutral/40' : 'border-line/50 bg-surface',
                  d.state === 'today' && 'anim-ring-pulse border-[3px] border-primary',
                )}
                aria-label={`${d.label}: ${studied ? 'đã học' : d.state === 'today' ? 'hôm nay, chưa học' : d.state === 'future' ? 'chưa tới' : 'chưa học'}`}
              >
                {studied && <Icon icon={Check} size={16} color="ink" />}
              </span>
              <span className={cx('text-[13px] leading-none', d.state === 'today' ? 'font-bold text-primary' : 'text-muted')}>{d.label}</span>
            </li>
          )
        })}
      </ol>
    </div>
  )
}

function Greeting({ name, mascot, core }) {
  const data = core.data
  return (
    <header className="flex flex-col gap-4">
      <div className="flex items-center gap-4">
        <div className="anim-breathe shrink-0" title={mascot.name ? `${mascot.name} đang chờ bạn` : undefined}>
          <MascotBlob color={mascot.color} shape={mascot.shape} traits={mascot.traits} size={72} blink />
        </div>
        <h1 className="text-[30px] leading-[1.08] md:text-[38px]">
          Chào {name}! <br />
          Hôm nay học gì nào?
        </h1>
      </div>
      {core.status === 'loading' && (
        <div className="flex flex-wrap items-center gap-3" role="status" aria-label="Đang tải">
          <Skeleton className="h-9 w-56" rounded="rounded-pill" />
          <Skeleton className="h-9 w-72" rounded="rounded-pill" />
        </div>
      )}
      {core.status === 'error' && (
        <ErrorState compact title="Chưa tải được số liệu hôm nay" onRetry={core.reload} className="items-start text-left" />
      )}
      {data && (
        <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
          {data.dailyCheck ? (
            <p
              className={cx(
                'inline-flex items-center gap-2 rounded-pill border-thick border-line px-3.5 py-1.5 text-caption font-semibold shadow-hard-sm',
                data.dailyCheck.correct === data.dailyCheck.total ? 'bg-accent' : 'bg-gold',
              )}
            >
              <Icon icon={CheckCircle} size={18} color="ink" />
              Cửa Ải hôm nay: {data.dailyCheck.correct}/{data.dailyCheck.total} đúng
              {data.dailyCheck.streakGained && ' · Streak +1'}
            </p>
          ) : (
            data.firstDay && (
              <p className="inline-flex items-center gap-2 rounded-pill border-thick border-line bg-surface px-3.5 py-1.5 text-caption font-semibold shadow-hard-sm">
                <Icon icon={Star} size={18} color="gold" />
                Ngày đầu tiên của bạn ở WORDCLASH
              </p>
            )
          )}
          <WeekRow days={data.week} />
        </div>
      )}
      {data?.shaky && (
        <p className="anim-alert inline-flex items-center gap-2 self-start rounded-pill border-thick border-danger bg-surface px-3.5 py-1.5 text-caption font-semibold">
          <Icon icon={WarningCircle} size={18} color="danger-deep" />
          Rank lung lay · còn {data.shaky.daysLeft} ngày · Ôn {data.shaky.wordsToReview} từ để giữ rank
        </p>
      )}
    </header>
  )
}

/** Sticker trang trí bám mép các khối (chỉ trang trí, ẩn với trình đọc màn hình). */
function Deco({ className, children }) {
  return (
    <span aria-hidden="true" className={cx('pointer-events-none absolute z-20', className)}>
      {children}
    </span>
  )
}

function StatusBarSlot({ core, mascot }) {
  if (core.data) return <StatusBar stats={core.data.stats} mascot={{ ...mascot, bg: 'raised' }} />
  return (
    <div className="flex items-center gap-2.5 overflow-hidden py-2 md:justify-end md:gap-3" role="status" aria-label="Đang tải">
      {[112, 168, 120, 132].map((w) => (
        <Skeleton key={w} className="h-12 shrink-0" rounded="rounded-pill" style={{ width: w }} />
      ))}
    </div>
  )
}

export default function Lobby() {
  const user = useAuthStore((s) => s.user)
  const mascot = useMascot(user?.avatar_mascot_id)
  const core = useLobbyStats()
  const roadmap = useServerData(() => getRoadmap(), [])
  const word = useServerData(getDailyWord, [])
  const top = useServerData(() => getLeaderboard('weekly', 3), [])
  const courses = useServerData(() => coursesApi.listCourses().then((res) => res.items), [])

  return (
    <>
      <Backdrop />
      <div className="relative z-10 flex flex-col gap-6">
        <StatusBarSlot core={core} mascot={mascot} />

        <div className="grid gap-6 xl:grid-cols-12 xl:gap-8">
          {/* Cột trái (8/12) */}
          <div className="order-1 flex min-w-0 flex-col gap-6 xl:col-span-8">
            <Appear i={0} className="relative">
              <Greeting name={user?.display_name ?? ''} mascot={mascot} core={core} />
              <Deco className="right-2 top-3 max-md:hidden">
                <Sticker bg="gold" tilt={8} size="sm">
                  Combo x3
                </Sticker>
              </Deco>
            </Appear>

            <div className="grid gap-6 lg:grid-cols-2">
              <Appear i={1} className="flex">
                <AcademyCard core={core} />
              </Appear>
              <Appear i={2} className="relative flex">
                <ArenaCard mascot={mascot} />
                <Deco className="-right-3 -top-4 max-md:hidden">
                  <Sticker bg="danger" tilt={7} size="sm">
                    +15 DMG
                  </Sticker>
                </Deco>
              </Appear>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              {/* Mobile: Mục tiêu đứng trước Từ của ngày; từ md trở lên Từ của ngày ở bên trái */}
              <Appear i={4} className="relative flex md:order-2">
                <DailyGoals core={core} mascot={mascot} className="w-full" />
                <Deco className="-right-2 -top-4 max-md:hidden">
                  <span className="block -rotate-6 drop-shadow-[2px_2px_0_var(--color-line)]">
                    <Icon icon={Star} size={36} color="gold" />
                  </span>
                </Deco>
              </Appear>
              <Appear i={3} className="flex md:order-1">
                <WordOfDay state={word} mascot={mascot} className="w-full" />
              </Appear>
            </div>
          </div>

          {/* Cột phải (4/12): widget */}
          <aside aria-label="Tiện ích" className="order-3 grid gap-5 sm:grid-cols-2 xl:order-2 xl:col-span-4 xl:flex xl:flex-col">
            <Appear i={7}>
              <NextRankWidget core={core} />
            </Appear>
            <Appear i={8}>
              <NextSpinWidget core={core} />
            </Appear>
            <Appear i={9}>
              <MascotWidget mascot={mascot} />
            </Appear>
            {/* Widget cuối giãn hết phần còn lại để cột phải kết thúc ngang cột trái */}
            <Appear i={10} className="flex xl:flex-1">
              <TopWeekWidget state={top} mascot={mascot} className="w-full" />
            </Appear>
          </aside>

          {/* Hàng dưới, trải hết 12 cột */}
          <div className="order-2 grid min-w-0 gap-6 xl:order-3 xl:col-span-12 xl:grid-cols-12 xl:gap-8">
            <Appear i={5} className="relative flex min-w-0 xl:col-span-7">
              <MyCourses state={courses} mascot={mascot} className="w-full min-w-0" />
            </Appear>

            <Appear i={6} className="relative flex xl:col-span-5">
              <JourneyStrip state={roadmap} />
              <Deco className="-top-4 left-6">
                <Sticker bg="accent" tilt={-6} size="sm">
                  A1 → C2
                </Sticker>
              </Deco>
            </Appear>
          </div>
        </div>
      </div>
    </>
  )
}
