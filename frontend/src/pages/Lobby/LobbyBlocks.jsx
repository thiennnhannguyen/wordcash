/*
 * Các khối ở cột trái của Sảnh, dưới hai card lớn:
 * - WordOfDay: "Từ của ngày" (nền vàng nhạt, phát âm, nghĩa, ví dụ tô highlight, linh vật Tò He mách mẹo nhớ).
 * - DailyGoals: "Mục tiêu hôm nay" — checklist 3 dòng, chỉ hiển thị, không có phần thưởng.
 * - MyCourses: "Khóa học của tôi" — xem trước tính năng tự tạo bộ từ (/courses), cuộn ngang; người mới thấy card trống.
 * - JourneyStrip: "Hành trình" — 6 vùng đất A1 → C2 nối bằng đường bay nét đứt, máy bay ở vùng hiện tại; bấm mở Học Viện.
 * Mọi nội dung lấy từ data/mockLobby.js. Hai nút ở "Từ của ngày" chưa có API nên chỉ báo toast.
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
  Code,
  FilmSlate,
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
import { useToastStore } from '../../store/toastStore'
import cx from '../../utils/cx'
import { speak } from '../../utils/speech'
import RegionIcon from './RegionIcon'

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

export function WordOfDay({ word, className }) {
  const [state, setState] = useState(null) // null | 'added' | 'known'
  const toast = (title, message) => useToastStore.getState().push({ variant: 'success', title, message })
  const mascot = word.tipMascot

  return (
    <section aria-labelledby="lobby-word" className={cx(BLOCK, 'relative flex flex-col bg-gold-soft', className)}>
      <BlockTitle id="lobby-word" icon={BookmarkSimple} bg="gold" aside={<LevelTag level={word.level} size="sm" />}>
        Từ của ngày
      </BlockTitle>

      <div className="flex items-center gap-3">
        <p lang="en" className="min-w-0 break-words font-heading text-[36px] font-black leading-none tracking-tight md:text-[40px]">
          {word.word}
        </p>
        <IconButton icon={SpeakerHigh} label={`Nghe phát âm ${word.word}`} size="sm" onClick={() => speak(word.word)} className="bg-sky" />
      </div>
      <p className="mt-1.5 text-muted">
        <span lang="en">{word.ipa}</span> · <span className="italic">{word.pos}</span>
      </p>
      <p className="mt-1.5 font-semibold leading-snug">{word.meaning}</p>
      <p lang="en" className="mt-3 rounded-[14px] border-2 border-line/30 bg-surface/70 px-3 py-2 text-[15px] leading-snug">
        <Highlighted text={word.example} word={word.highlight} />
      </p>

      <div className="mt-3 flex flex-wrap gap-2">
        <Button
          size="sm"
          icon={state === 'added' ? Check : Plus}
          disabled={state !== null}
          onClick={() => {
            setState('added')
            toast('Đã thêm vào khóa học', `"${word.word}" sẽ xuất hiện trong lượt ôn của bạn.`)
          }}
        >
          {state === 'added' ? 'Đã thêm' : 'Thêm vào khóa học của tôi'}
        </Button>
        <Button
          size="sm"
          variant="secondary"
          icon={state === 'known' ? Check : undefined}
          disabled={state !== null}
          onClick={() => {
            setState('known')
            toast('Đã ghi nhận', `Bạn đã biết "${word.word}".`)
          }}
        >
          {state === 'known' ? 'Đã đánh dấu' : 'Đã biết'}
        </Button>
      </div>

      {/* Tò He mách mẹo nhớ ở góc dưới */}
      <div className="mt-auto flex items-end gap-2 pt-3">
        <div className="relative min-w-0 flex-1 rounded-[16px] border-thick border-line bg-surface px-3 py-2 text-[13px] leading-snug shadow-hard-sm">
          <span className="mb-0.5 flex items-center gap-1 font-display font-bold uppercase">
            <Icon icon={Lightbulb} size={14} color="gold" />
            Mẹo nhớ
          </span>
          {word.tip}
          <span aria-hidden="true" className="absolute -right-[9px] bottom-4 size-4 rotate-45 border-r-thick border-t-thick border-line bg-surface" />
        </div>
        <div className="anim-breathe -mb-1 shrink-0" title={mascot.name}>
          <MascotBlob color={mascot.color} shape={mascot.shape} traits={mascot.traits} size={52} blink />
        </div>
      </div>
    </section>
  )
}

/* ---------- Mục tiêu hôm nay ---------- */

export function DailyGoals({ goals, mascot, className }) {
  const done = goals.filter((g) => g.current >= g.target).length
  const next = goals.find((g) => g.current < g.target)

  return (
    <section aria-labelledby="lobby-goals" className={cx(BLOCK, 'flex flex-col bg-surface', className)}>
      <BlockTitle
        id="lobby-goals"
        icon={Target}
        bg="danger"
        aside={
          <span className="whitespace-nowrap rounded-pill border-2 border-line bg-raised px-2.5 py-0.5 font-num text-sm">
            {done}/{goals.length} xong
          </span>
        }
      >
        Mục tiêu hôm nay
      </BlockTitle>
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
    </section>
  )
}

/* ---------- Khóa học của tôi ---------- */

const COURSE_ICONS = { code: Code, film: FilmSlate, plane: AirplaneTilt }

function CourseCard({ course, onOpen }) {
  const pct = Math.round((course.learned / course.words) * 100)
  return (
    <button
      type="button"
      onClick={onOpen}
      className="flex w-[168px] shrink-0 snap-start flex-col overflow-hidden rounded-[20px] border-thick border-line bg-surface text-left shadow-hard lift"
    >
      <div className="flex items-center justify-between gap-2 border-b-thick border-line px-3.5 py-3" style={{ background: `var(--color-${course.color})` }}>
        <IconBadge icon={COURSE_ICONS[course.icon] ?? Code} bg="surface" size="sm" shape="square" />
        <ProgressRing value={course.learned} max={course.words} size={48} stroke={7} tone="primary" label={`Đã học ${pct}%`}>
          <span className="font-num text-[13px]">{pct}%</span>
        </ProgressRing>
      </div>
      <div className="flex flex-1 flex-col gap-1 px-3.5 py-3">
        <span className="font-heading text-base font-extrabold leading-tight">{course.name}</span>
        <span className="text-[13px] text-muted">
          <span className="font-num text-ink">{course.words}</span> từ
        </span>
        <span className={cx('mt-auto pt-1 text-[13px] font-semibold', course.due > 0 ? 'text-danger-deep' : 'text-muted')}>
          {course.due > 0 ? `Đến hạn ôn: ${course.due}` : 'Chưa có từ đến hạn'}
        </span>
      </div>
    </button>
  )
}

export function MyCourses({ courses, emptyMascot, className }) {
  const navigate = useNavigate()
  const open = () => navigate('/courses')

  return (
    <section aria-labelledby="lobby-courses" className={cx(BLOCK, 'bg-surface', className)}>
      <BlockTitle
        id="lobby-courses"
        icon={BookmarkSimple}
        bg="sky"
        aside={
          courses.length > 0 && (
            <button type="button" onClick={open} className="inline-flex h-11 items-center gap-1 whitespace-nowrap font-display text-[13px] font-bold uppercase underline-offset-4 hover:underline">
              Xem tất cả <Icon icon={ArrowRight} size={16} />
            </button>
          )
        }
      >
        Khóa học của tôi
      </BlockTitle>

      {courses.length === 0 ? (
        <div className="flex flex-col items-center gap-4 rounded-[20px] border-thick border-dashed border-line bg-bg p-5 text-center sm:flex-row sm:text-left">
          <div className="anim-breathe shrink-0">
            <MascotBlob color={emptyMascot.color} shape={emptyMascot.shape} traits={emptyMascot.traits} size={84} blink />
          </div>
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <p className="font-heading text-xl font-extrabold leading-tight">Tự tạo bộ từ của riêng bạn</p>
            <p className="text-caption text-muted">
              Gom từ trong phim, bài hát hay công việc thành khóa học riêng; {emptyMascot.name} sẽ nhắc bạn ôn đúng lúc.
            </p>
          </div>
          <Button icon={Plus} size="sm" className="shrink-0" onClick={open}>
            Tạo khóa học
          </Button>
        </div>
      ) : (
        <div className="-mx-1 flex snap-x gap-4 overflow-x-auto px-1 pb-3 pt-1">
          {courses.map((course) => (
            <CourseCard key={course.id} course={course} onOpen={open} />
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

export function JourneyStrip({ journey, className }) {
  const navigate = useNavigate()
  const current = journey.regions.findIndex((r) => r.status === 'current')
  const here = journey.regions[current]

  return (
    <button
      type="button"
      onClick={() => navigate('/academy')}
      aria-label={`Hành trình: đang ở ${here.code} · ${here.short}. Hộ chiếu ${journey.passport.visited}/${journey.passport.total} địa danh. Mở Học Viện`}
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
            <span className="font-num">{journey.passport.visited}/{journey.passport.total}</span> địa danh
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
          style={{ width: `calc((100% - 44px) * ${current / (journey.regions.length - 1)})` }}
        />
        {journey.regions.map((r) => {
          const isCurrent = r.status === 'current'
          return (
            <li key={r.code} className="relative flex w-11 flex-col items-center gap-1.5" title={`${r.code} · ${r.short}: ${r.landmark}`}>
              {isCurrent && (
                <span aria-hidden="true" className="anim-bob absolute -top-7 flex -rotate-12 items-center">
                  <Icon icon={AirplaneTilt} size={26} color="primary" />
                </span>
              )}
              <span className="relative">
                <RegionIcon
                  icon={r.icon}
                  size={isCurrent ? 48 : 44}
                  locked={r.status === 'locked'}
                  className={cx(isCurrent && 'anim-ring-pulse border-primary', isCurrent ? '-mt-0.5' : '')}
                />
                {r.status === 'done' && (
                  <span className="absolute -bottom-1 -right-1 grid size-5 place-items-center rounded-pill border-2 border-line bg-accent">
                    <Icon icon={Check} size={12} />
                  </span>
                )}
              </span>
              <span className={cx('font-num text-sm', r.status === 'locked' && 'text-muted')}>{r.code}</span>
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
