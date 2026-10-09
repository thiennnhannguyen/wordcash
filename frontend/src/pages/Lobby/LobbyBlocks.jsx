/*
 * Các khối ở cột trái của Sảnh, dưới hai card lớn. Mọi khối nhận trạng thái tải từ server ({status, data, reload}) và hiện đủ
 * 3 trạng thái: đang tải (skeleton) / lỗi (Thử lại) / trống (linh vật + gợi ý).
 * - WordOfDay: "Từ của ngày" (GET /words/daily): phát âm, nghĩa, ví dụ tô highlight, trạng thái học của bạn với từ, mẹo nhớ
 *   (chỉ khi mục từ có `mnemonic_vi`). "+ Thêm vào khóa học" liên kết thẳng mục từ kho; "Ẩn hôm nay" chỉ ẩn khối trong phiên
 *   trình duyệt (sessionStorage), không ghi tiến độ học.
 * - DailyGoals: "Mục tiêu hôm nay" (GET /me/stats): từ mới hôm nay / mục tiêu; ôn từ đến hạn (chỉ khi có). Chỉ hiển thị.
 * - MyCourses: "Khóa học của tôi" (GET /courses), cuộn ngang; chưa có khóa nào thì thấy card trống.
 * - JourneyStrip: "Hành trình" (GET /academy/roadmap): 6 vùng đất A1 → C2, cấp chưa có nội dung hiện "Sắp mở"; Hộ chiếu
 *   x/y địa danh do server đếm.
 */

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  AirplaneTilt,
  ArrowRight,
  BookmarkSimple,
  Check,
  CheckCircle,
  Circle,
  EyeSlash,
  Lightbulb,
  Plus,
  SpeakerHigh,
  Stamp,
  Target,
} from '@phosphor-icons/react'
import Button, { IconButton } from '../../components/ui/Button'
import Icon, { IconBadge } from '../../components/ui/Icon'
import LevelTag from '../../components/ui/LevelTag'
import ProgressRing from '../../components/ui/ProgressRing'
import MascotBlob from '../../components/collection/MascotBlob'
import { EmptyState, ErrorState, Skeleton, SkeletonLines } from '../../components/ui/DataState'
import cx from '../../utils/cx'
import { journeyRegions } from '../../utils/regions'
import { speak } from '../../utils/speech'
import RegionIcon from './RegionIcon'
import AddToCoursePopover from '../../components/courses/AddToCoursePopover'
import { courseIcon } from '../../utils/courseIcons'

const BLOCK = 'rounded-panel border-thick border-line p-5 shadow-hard lift md:p-6'

function BlockTitle({ id, icon, bg = 'surface', children, aside, nowrap = false }) {
  return (
    <div className="mb-4 flex items-center justify-between gap-3">
      <div className="flex min-w-0 items-center gap-2.5">
        <IconBadge icon={icon} bg={bg} size="sm" shape="square" />
        <h2 id={id} className={cx('font-display text-lg font-bold uppercase leading-tight tracking-wide', nowrap && 'whitespace-nowrap')}>
          {children}
        </h2>
      </div>
      {aside}
    </div>
  )
}

/* ---------- Từ của ngày ---------- */

function Highlighted({ text, word }) {
  const i = text.toLowerCase().indexOf(word.toLowerCase())
  if (i < 0) return text
  return (
    <>
      {text.slice(0, i)}
      <mark className="rounded-[6px] bg-accent px-1 font-semibold text-ink [box-decoration-break:clone]">{text.slice(i, i + word.length)}</mark>
      {text.slice(i + word.length)}
    </>
  )
}

const WORD_STATUS = {
  new: { label: 'Chưa học', bg: 'bg-surface' },
  learning: { label: 'Đang học', bg: 'bg-sky' },
  mastered: { label: 'Đã thuộc', bg: 'bg-accent' },
}

// "Ẩn hôm nay": chỉ nhớ trong phiên trình duyệt (sessionStorage, có thể không dùng được → chỉ ẩn tới khi tải lại trang)
const hideKey = (day) => `wc-hide-word:${day}`
function readHidden(day) {
  try {
    return window.sessionStorage.getItem(hideKey(day)) === '1'
  } catch {
    return false
  }
}
function writeHidden(day, hidden) {
  try {
    if (hidden) window.sessionStorage.setItem(hideKey(day), '1')
    else window.sessionStorage.removeItem(hideKey(day))
  } catch {
    // Trình duyệt chặn bộ nhớ phiên: vẫn ẩn trong lần xem này
  }
}

function WordBody({ daily, mascot }) {
  const [hidden, setHidden] = useState(() => readHidden(daily.date))
  const entry = daily.entry
  const status = WORD_STATUS[daily.status] ?? WORD_STATUS.new
  const toggle = (value) => {
    writeHidden(daily.date, value)
    setHidden(value)
  }

  if (hidden) {
    return (
      <div className="flex flex-1 flex-col items-start gap-3">
        <p className="text-muted">Bạn đã ẩn Từ của ngày hôm nay.</p>
        <Button size="sm" variant="secondary" onClick={() => toggle(false)}>
          Hiện lại
        </Button>
      </div>
    )
  }
  return (
    <>
      <div className="flex items-center gap-3">
        <p lang="en" className="min-w-0 break-words font-heading text-[36px] font-black leading-none tracking-tight md:text-[40px]">
          {entry.headword}
        </p>
        <IconButton icon={SpeakerHigh} label={`Nghe phát âm ${entry.headword}`} size="sm" onClick={() => speak(entry.headword)} className="bg-sky" />
      </div>
      <p className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-muted">
        {entry.ipa && <span lang="en">{entry.ipa}</span>}
        {entry.pos && <span className="italic">{entry.pos}</span>}
        <span className={cx('rounded-pill border-2 border-line px-2 text-[13px] font-semibold text-ink', status.bg)}>{status.label}</span>
      </p>
      <p className="mt-1.5 font-semibold leading-snug">{entry.meaning_vi}</p>
      {entry.example && (
        <p lang="en" className="mt-3 rounded-[14px] border-2 border-line/30 bg-surface/70 px-3 py-2 text-[15px] leading-snug">
          <Highlighted text={entry.example} word={entry.headword} />
        </p>
      )}

      <div className="mt-3 flex flex-wrap gap-2">
        <AddToCoursePopover word={{ id: entry.id, headword: entry.headword, meaning_vi: entry.meaning_vi }} variant="primary" />
        <Button size="sm" variant="secondary" icon={EyeSlash} onClick={() => toggle(true)}>
          Ẩn hôm nay
        </Button>
      </div>

      {entry.mnemonic_vi && (
        <div className="mt-auto flex items-end gap-2 pt-3">
          <div className="relative min-w-0 flex-1 rounded-[16px] border-thick border-line bg-surface px-3 py-2 text-[13px] leading-snug shadow-hard-sm">
            <span className="mb-0.5 flex items-center gap-1 font-display font-bold uppercase">
              <Icon icon={Lightbulb} size={14} color="gold" />
              Mẹo nhớ
            </span>
            {entry.mnemonic_vi}
            <span aria-hidden="true" className="absolute -right-[9px] bottom-4 size-4 rotate-45 border-r-thick border-t-thick border-line bg-surface" />
          </div>
          <div className="anim-breathe -mb-1 shrink-0" aria-hidden="true">
            <MascotBlob color={mascot.color} shape={mascot.shape} traits={mascot.traits} size={52} blink />
          </div>
        </div>
      )}
    </>
  )
}

export function WordOfDay({ state, mascot, className }) {
  const daily = state.data
  return (
    <section aria-labelledby="lobby-word" aria-busy={state.status === 'loading'} className={cx(BLOCK, 'relative flex flex-col bg-gold-soft', className)}>
      <BlockTitle id="lobby-word" icon={BookmarkSimple} bg="gold" aside={daily?.entry?.cefr && <LevelTag level={daily.entry.cefr} size="sm" />}>
        Từ của ngày
      </BlockTitle>
      {state.status === 'loading' && (
        <div className="flex flex-col gap-3" role="status" aria-label="Đang tải">
          <Skeleton className="h-10 w-1/2" />
          <SkeletonLines lines={3} />
        </div>
      )}
      {state.status === 'error' && <ErrorState compact title="Chưa tải được Từ của ngày" onRetry={state.reload} />}
      {daily && !daily.entry && (
        <EmptyState compact mascot={mascot} title="Chưa có Từ của ngày" message="Kho từ của cấp bạn đang học đang được chuẩn bị. Học bài trong Học Viện trước nhé." />
      )}
      {daily?.entry && <WordBody key={daily.date} daily={daily} mascot={mascot} />}
    </section>
  )
}

/* ---------- Mục tiêu hôm nay ---------- */

function GoalsBody({ goals, mascot }) {
  const done = goals.filter((g) => g.current >= g.target).length
  const next = goals.find((g) => g.current < g.target)

  return (
    <>
      <ul className="flex flex-col gap-3">
        {goals.map((g) => {
          const complete = g.current >= g.target
          const pct = Math.min(100, Math.round((g.current / g.target) * 100))
          return (
            <li
              key={g.key}
              className={cx('rounded-[16px] border-thick border-line px-3.5 py-3', complete ? 'bg-accent' : 'bg-bg')}
            >
              <div className="flex items-center gap-2.5">
                <Icon icon={complete ? CheckCircle : Circle} size={24} color={complete ? 'ink' : 'muted'} className="shrink-0" />
                <span className={cx('min-w-0 flex-1 font-semibold', complete && 'line-through decoration-2')}>{g.label}</span>
                <span className="font-num text-sm">
                  {g.current}/{g.target}
                </span>
              </div>
              <div
                className="ml-[34px] mt-2 h-2.5 overflow-hidden rounded-pill border-2 border-line bg-surface"
                role="progressbar"
                aria-label={g.label}
                aria-valuemin={0}
                aria-valuemax={g.target}
                aria-valuenow={g.current}
              >
                <div className={cx('h-full', complete ? 'bg-ink' : 'bg-primary')} style={{ width: `${pct}%` }} />
              </div>
            </li>
          )
        })}
      </ul>
      {/* Tóm tắt ở đáy: tổng số mục tiêu đã xong và việc gần xong nhất (chỉ hiển thị) */}
      <div className="mt-auto flex items-center gap-3 pt-5">
        <ProgressRing value={done} max={goals.length} size={64} stroke={9} tone="accent" label={`Đã xong ${done}/${goals.length} mục tiêu`}>
          <span className="font-num text-base">
            {done}/{goals.length}
          </span>
        </ProgressRing>
        <p className="min-w-0 flex-1 text-caption text-muted">
          {next ? (
            <>
              Tiếp theo: <span className="font-semibold text-ink">{next.label.toLowerCase()}</span>, còn{' '}
              <span className="font-num text-ink">{next.target - next.current}</span>.
            </>
          ) : (
            'Xong hết mục tiêu hôm nay. Tuyệt!'
          )}
        </p>
        {mascot && (
          <div className="anim-breathe shrink-0" aria-hidden="true">
            <MascotBlob color={mascot.color} shape={mascot.shape} traits={mascot.traits} size={52} blink />
          </div>
        )}
      </div>
    </>
  )
}

export function DailyGoals({ core, mascot, className }) {
  const goals = core.data?.goals
  const done = goals ? goals.filter((g) => g.current >= g.target).length : 0
  return (
    <section aria-labelledby="lobby-goals" aria-busy={core.status === 'loading'} className={cx(BLOCK, 'flex flex-col bg-surface', className)}>
      <BlockTitle
        id="lobby-goals"
        icon={Target}
        bg="danger"
        aside={
          goals && (
            <span className="whitespace-nowrap rounded-pill border-2 border-line bg-raised px-2.5 py-0.5 font-num text-sm">
              {done}/{goals.length} xong
            </span>
          )
        }
      >
        Mục tiêu hôm nay
      </BlockTitle>
      {core.status === 'loading' && (
        <div className="flex flex-col gap-3" role="status" aria-label="Đang tải">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      )}
      {core.status === 'error' && <ErrorState compact title="Chưa tải được mục tiêu" onRetry={core.reload} />}
      {goals && <GoalsBody goals={goals} mascot={mascot} />}
    </section>
  )
}

/* ---------- Khóa học của tôi ---------- */

function CourseCard({ course, onOpen }) {
  const pct = course.word_count ? Math.round((course.mastered_count / course.word_count) * 100) : 0
  return (
    <button
      type="button"
      onClick={onOpen}
      className="flex w-[168px] shrink-0 snap-start flex-col overflow-hidden rounded-[20px] border-thick border-line bg-surface text-left shadow-hard lift"
    >
      <div className="flex items-center justify-between gap-2 border-b-thick border-line px-3.5 py-3" style={{ background: `var(--color-${course.color})` }}>
        <IconBadge icon={courseIcon(course.icon)} bg="surface" size="sm" shape="square" />
        <ProgressRing value={course.mastered_count} max={Math.max(course.word_count, 1)} size={48} stroke={7} tone="primary" label={`Đã thuộc ${pct}%`}>
          <span className="font-num text-[13px]">{pct}%</span>
        </ProgressRing>
      </div>
      <div className="flex flex-1 flex-col gap-1 px-3.5 py-3">
        <span className="line-clamp-2 font-heading text-base font-extrabold leading-tight">{course.title}</span>
        <span className="text-[13px] text-muted">
          <span className="font-num text-ink">{course.word_count}</span> từ
        </span>
        <span className={cx('mt-auto pt-1 text-[13px] font-semibold', course.due_count > 0 ? 'text-danger-deep' : 'text-muted')}>
          {course.due_count > 0 ? `Đến hạn ôn: ${course.due_count}` : 'Chưa có từ đến hạn'}
        </span>
      </div>
    </button>
  )
}

export function MyCourses({ state, mascot, className }) {
  const navigate = useNavigate()
  const open = () => navigate('/courses')
  const courses = state.data

  return (
    <section aria-labelledby="lobby-courses" aria-busy={state.status === 'loading'} className={cx(BLOCK, 'bg-surface', className)}>
      <BlockTitle
        id="lobby-courses"
        icon={BookmarkSimple}
        bg="sky"
        aside={
          courses?.length > 0 && (
            <button type="button" onClick={open} className="inline-flex h-11 items-center gap-1 whitespace-nowrap font-display text-[13px] font-bold uppercase underline-offset-4 hover:underline">
              Xem tất cả <Icon icon={ArrowRight} size={16} />
            </button>
          )
        }
      >
        Khóa học của tôi
      </BlockTitle>

      {state.status === 'loading' && (
        <div className="flex gap-4 overflow-hidden" role="status" aria-label="Đang tải">
          {[0, 1, 2].map((k) => (
            <Skeleton key={k} className="h-[188px] w-[168px] shrink-0" rounded="rounded-[20px]" />
          ))}
        </div>
      )}
      {state.status === 'error' && <ErrorState compact title="Chưa tải được khóa học" onRetry={state.reload} />}
      {courses?.length === 0 && (
        <div className="flex flex-col items-center gap-4 rounded-[20px] border-thick border-dashed border-line bg-bg p-5 text-center sm:flex-row sm:text-left">
          <div className="anim-breathe shrink-0" aria-hidden="true">
            <MascotBlob color={mascot.color} shape={mascot.shape} traits={mascot.traits} size={84} blink />
          </div>
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <p className="font-heading text-xl font-extrabold leading-tight">Tự tạo bộ từ của riêng bạn</p>
            <p className="text-caption text-muted">Gom từ trong phim, bài hát hay công việc thành khóa học riêng; ôn đúng lúc để nhớ lâu.</p>
          </div>
          <Button icon={Plus} size="sm" className="shrink-0" onClick={open}>
            Tạo khóa học
          </Button>
        </div>
      )}
      {courses?.length > 0 && (
        <div className="-mx-1 flex snap-x gap-4 overflow-x-auto px-1 pb-3 pt-1">
          {courses.map((course) => (
            <CourseCard key={course.id} course={course} onOpen={() => navigate(`/courses/${course.id}`)} />
          ))}
          <button
            type="button"
            onClick={open}
            className="flex w-[160px] shrink-0 snap-start flex-col items-center justify-center gap-2 rounded-[20px] border-thick border-dashed border-line bg-bg p-4 font-display text-sm font-bold uppercase transition-colors hover:bg-raised"
          >
            <span className="grid size-11 place-items-center rounded-pill border-thick border-line bg-surface">
              <Icon icon={Plus} size={22} />
            </span>
            Tạo khóa học
          </button>
        </div>
      )}
    </section>
  )
}

/* ---------- Hành trình ---------- */

export function JourneyStrip({ state, className }) {
  const navigate = useNavigate()
  const road = state.data
  const regions = road ? journeyRegions(road) : null
  const current = regions ? Math.max(0, regions.findIndex((r) => r.status === 'current')) : 0
  const here = regions?.[current]

  if (!road) {
    return (
      <section aria-busy={state.status === 'loading'} className={cx(BLOCK, 'w-full bg-raised', className)}>
        <BlockTitle icon={AirplaneTilt} bg="primary" nowrap>
          Hành trình
        </BlockTitle>
        {state.status === 'error' ? (
          <ErrorState compact title="Chưa tải được hành trình" onRetry={state.reload} />
        ) : (
          <div className="flex justify-between pt-7" role="status" aria-label="Đang tải">
            {[0, 1, 2, 3, 4, 5].map((k) => (
              <Skeleton key={k} className="size-11" rounded="rounded-pill" />
            ))}
          </div>
        )}
      </section>
    )
  }

  return (
    <button
      type="button"
      onClick={() => navigate('/academy')}
      aria-label={`Hành trình: đang ở ${here.code} · ${here.short}. Hộ chiếu ${road.passport.visited}/${road.passport.total} địa danh. Mở Học Viện`}
      className={cx(BLOCK, 'block w-full bg-raised text-left', className)}
    >
      <BlockTitle
        icon={AirplaneTilt}
        bg="primary"
        nowrap
        aside={
          <span className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-pill border-2 border-line bg-surface px-2.5 py-1 text-[13px] font-semibold shadow-hard-sm">
            <Icon icon={Stamp} size={16} color="primary" />
            <span className="max-sm:hidden xl:hidden">Hộ chiếu:</span>
            <span className="font-num">{road.passport.visited}/{road.passport.total}</span> địa danh
          </span>
        }
      >
        Hành trình
      </BlockTitle>

      <ol className="relative flex items-start justify-between pt-7">
        {/* Đường bay nét đứt nối các vùng: đoạn đã bay đậm hơn */}
        <span aria-hidden="true" className="absolute left-[22px] right-[22px] top-[50px] border-t-[3px] border-dashed border-line/35" />
        <span
          aria-hidden="true"
          className="absolute left-[22px] top-[50px] border-t-[3px] border-dashed border-primary"
          style={{ width: `calc((100% - 44px) * ${current / (regions.length - 1)})` }}
        />
        {regions.map((r) => {
          const isCurrent = r.status === 'current'
          const dim = r.status === 'locked' || r.status === 'soon'
          return (
            <li key={r.code} className="relative flex w-11 flex-col items-center gap-1.5" title={`${r.code} · ${r.short}${r.status === 'soon' ? ' · Sắp mở' : ''}`}>
              {isCurrent && (
                <span aria-hidden="true" className="anim-bob absolute -top-7 flex -rotate-12 items-center">
                  <Icon icon={AirplaneTilt} size={26} color="primary" />
                </span>
              )}
              <span className="relative">
                <RegionIcon
                  icon={r.icon}
                  size={isCurrent ? 48 : 44}
                  locked={dim}
                  className={cx(isCurrent && 'anim-ring-pulse border-primary', isCurrent ? '-mt-0.5' : '')}
                />
                {r.status === 'done' && (
                  <span className="absolute -bottom-1 -right-1 grid size-5 place-items-center rounded-pill border-2 border-line bg-accent">
                    <Icon icon={Check} size={12} />
                  </span>
                )}
              </span>
              <span className={cx('font-num text-sm', dim && 'text-muted')}>{r.code}</span>
              {isCurrent && <span className="w-24 text-center text-[13px] font-semibold leading-tight text-primary">{r.short}</span>}
            </li>
          )
        })}
      </ol>
      <p className="mt-3 flex items-center justify-end gap-1 font-display text-[13px] font-bold uppercase">
        Mở Học Viện <Icon icon={ArrowRight} size={16} />
      </p>
    </button>
  )
}
