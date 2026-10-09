/*
 * Thống kê học tập trên Hồ sơ của tôi (GET /me/profile): tiến độ theo cấp (cấp có trong DB: đã thuộc / tổng mục dạy được),
 * lịch nhiệt hoạt động kiểu bảng đóng góp GitHub (12 tuần; mobile 8 tuần; số từ mới + số câu ôn mỗi ngày), độ ghi nhớ (tỉ lệ
 * đúng ở Cửa Ải 30 ngày, dạng vòng tròn), 5 từ hay quên nhất (lapse_count) kèm nút ôn, khóa học và từ tự tạo đã thuộc.
 * Đều là thống kê riêng, không có trên hồ sơ người khác. Chưa có dữ liệu thì khối hiện trạng thái trống có gợi ý.
 * `SoonCard`: khối "Sắp ra mắt" cho tính năng chưa có backend (Đấu Trường, huy hiệu).
 */

import { useNavigate } from 'react-router-dom'
import { ArrowsClockwise, BookmarkSimple, Brain, CalendarBlank, ChartBar, Hourglass, LockSimple, Siren } from '@phosphor-icons/react'
import Button from '../../components/ui/Button'
import Icon, { IconBadge } from '../../components/ui/Icon'
import LevelTag from '../../components/ui/LevelTag'
import ProgressRing from '../../components/ui/ProgressRing'
import { EmptyState } from '../../components/ui/DataState'
import cx from '../../utils/cx'
import { formatNumber } from '../../utils/format'

export function StatCard({ title, icon, iconBg = 'surface', className, children, aside }) {
  return (
    <section className={cx('flex flex-col gap-4 rounded-panel border-thick border-line bg-surface p-4 shadow-hard md:p-6', className)}>
      <div className="flex items-center gap-3">
        <IconBadge icon={icon} bg={iconBg} size="sm" shape="square" shadow={false} />
        <h2 className="min-w-0 flex-1 font-heading text-xl font-extrabold leading-tight">{title}</h2>
        {aside}
      </div>
      {children}
    </section>
  )
}

export function LevelProgress({ levels }) {
  return (
    <StatCard title="Tiến độ theo cấp" icon={ChartBar} iconBg="sky">
      <ul className="flex flex-col gap-3">
        {levels.map((l) => (
          <li key={l.code} className="flex items-center gap-3">
            <LevelTag level={l.code} size="sm" className="w-11 shrink-0" />
            <div className="h-4 min-w-0 flex-1 overflow-hidden rounded-pill border-2 border-line bg-raised">
              {l.unlocked && l.total > 0 && <div className="h-full border-r-2 border-line" style={{ width: `${(l.mastered / l.total) * 100}%`, background: `var(--color-level-${l.code.toLowerCase()})` }} />}
            </div>
            {l.unlocked ? (
              <span className="w-24 shrink-0 text-right font-num text-sm">
                {formatNumber(l.mastered)}
                <span className="text-muted">/{formatNumber(l.total)}</span>
              </span>
            ) : (
              <span className="inline-flex w-24 shrink-0 items-center justify-end gap-1 font-display text-[13px] font-bold uppercase text-muted">
                <Icon icon={LockSimple} size={14} color="muted" /> Chưa mở
              </span>
            )}
          </li>
        ))}
      </ul>
    </StatCard>
  )
}

const HEAT = [
  'var(--color-raised)',
  'color-mix(in srgb, var(--color-accent) 35%, var(--color-surface))',
  'color-mix(in srgb, var(--color-accent) 70%, var(--color-surface))',
  'var(--color-accent)',
  'color-mix(in srgb, var(--color-accent) 45%, var(--color-accent-deep))',
]

function heatLevel(words) {
  if (words === 0) return 0
  if (words < 7) return 1
  if (words < 14) return 2
  if (words < 21) return 3
  return 4
}

const DAY_LABELS = ['T2', '', 'T4', '', 'T6', '', 'CN']

export function Heatmap({ activity, weeks = 12 }) {
  // Cột là tuần (bắt đầu thứ Hai), hàng là ngày; ô sau hôm nay để trống
  const last = new Date(`${activity[activity.length - 1].date}T12:00:00`)
  const todayIdx = (last.getDay() + 6) % 7
  const cells = weeks * 7
  const start = activity.length - (cells - (6 - todayIdx))
  const grid = Array.from({ length: cells }, (_, i) => activity[start + i] ?? null)
  const shown = grid.filter(Boolean)
  const total = shown.reduce((sum, d) => sum + d.words, 0)
  const activeDays = shown.filter((d) => d.words > 0).length

  const monthLabel = (col) => {
    const d = grid[col * 7]
    if (!d) return ''
    const month = Number(d.date.slice(5, 7))
    const prev = col > 0 && grid[(col - 1) * 7] ? Number(grid[(col - 1) * 7].date.slice(5, 7)) : null
    return col === 0 || month !== prev ? `Th${month}` : ''
  }

  return (
    <StatCard title="Hoạt động" icon={CalendarBlank} iconBg="accent">
      <div className="flex justify-center gap-1.5 [--cell:26px] md:[--cell:32px]">
        <div className="grid grid-rows-[16px_repeat(7,auto)] gap-1 pr-1" aria-hidden="true">
          <span />
          {DAY_LABELS.map((d, i) => (
            <span key={i} className="flex h-(--cell) items-center font-display text-[13px] font-bold text-muted">
              {d}
            </span>
          ))}
        </div>
        <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${weeks}, var(--cell))` }} role="img" aria-label={`${formatNumber(total)} từ trong ${weeks} tuần, ${activeDays} ngày có học`}>
          {Array.from({ length: weeks }, (_, col) => (
            <div key={col} className="grid grid-rows-[16px_repeat(7,auto)] gap-1">
              <span className="overflow-visible whitespace-nowrap font-display text-[13px] font-bold leading-4 text-muted">{monthLabel(col)}</span>
              {Array.from({ length: 7 }, (_, row) => {
                const d = grid[col * 7 + row]
                if (!d) return <span key={row} className="h-(--cell)" />
                const lv = heatLevel(d.words)
                return (
                  <span
                    key={row}
                    title={`${d.words} từ · ${d.date.slice(8, 10)}/${d.date.slice(5, 7)}`}
                    className={cx('h-(--cell) rounded-[6px] border-2', lv === 0 ? 'border-line/15' : 'border-line')}
                    style={{ background: HEAT[lv] }}
                  />
                )
              })}
            </div>
          ))}
        </div>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2 text-caption font-medium text-muted">
        <span>
          <span className="font-num text-ink">{formatNumber(total)}</span> từ · <span className="font-num text-ink">{activeDays}</span> ngày có học
        </span>
        <span className="flex items-center gap-1" aria-hidden="true">
          Ít
          {HEAT.map((c, i) => (
            <span key={i} className={cx('size-4 rounded-[4px] border-2', i === 0 ? 'border-line/15' : 'border-line')} style={{ background: c }} />
          ))}
          Nhiều
        </span>
      </div>
    </StatCard>
  )
}

export function Retention({ accuracy }) {
  if (accuracy.total === 0) {
    return (
      <StatCard title="Độ ghi nhớ" icon={Brain} iconBg="primary">
        <EmptyState compact title="Chưa có câu Cửa Ải nào" message={`Tỉ lệ đúng ở Cửa Ải Hôm Nay trong ${accuracy.days} ngày sẽ hiện ở đây khi bạn đã học vài từ.`} />
      </StatCard>
    )
  }
  const percent = Math.round(accuracy.rate * 100)
  return (
    <StatCard title="Độ ghi nhớ" icon={Brain} iconBg="primary">
      <div className="flex flex-1 flex-col items-center justify-center gap-3 py-1">
        <ProgressRing value={accuracy.correct} max={accuracy.total} size={150} stroke={20} tone="accent" label={`Tỉ lệ đúng ở Cửa Ải ${percent}%`}>
          <span className="font-num text-[40px] leading-none">{percent}%</span>
        </ProgressRing>
        <p className="text-center text-caption font-medium text-muted">
          Tỉ lệ đúng ở Cửa Ải Hôm Nay
          <br />
          <span className="font-num text-ink">
            {accuracy.correct}/{accuracy.total}
          </span>{' '}
          câu trong {accuracy.days} ngày
        </p>
      </div>
    </StatCard>
  )
}

export function HardestWords({ words }) {
  const navigate = useNavigate()
  return (
    <StatCard title="Từ hay quên nhất" icon={Siren} iconBg="danger">
      {words.length === 0 ? (
        <EmptyState compact title="Chưa có từ nào bị quên" message="Từ bạn trả lời sai nhiều lần sẽ hiện ở đây để ôn lại." />
      ) : (
        <>
          <ol className="flex flex-col gap-2">
            {words.map((w, i) => (
              <li key={w.id} className="flex items-center gap-3 rounded-[14px] border-2 border-line bg-surface px-3 py-2">
                <span className="w-4 font-num text-sm text-muted">{i + 1}</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-display text-lg font-bold leading-tight">{w.word}</span>
                  <span className="block truncate text-caption text-muted">{w.meaning}</span>
                </span>
                <span className="shrink-0 rounded-pill border-2 border-line bg-[color-mix(in_srgb,var(--color-danger)_25%,var(--color-surface))] px-2 font-display text-[13px] font-bold uppercase leading-6">
                  Quên {w.forgot}
                </span>
              </li>
            ))}
          </ol>
          <Button variant="danger" icon={ArrowsClockwise} onClick={() => navigate('/academy/review')}>
            Ôn tập
          </Button>
        </>
      )}
    </StatCard>
  )
}

export function CoursesStat({ courses, customMastered }) {
  const navigate = useNavigate()
  return (
    <StatCard title="Khóa học của tôi" icon={BookmarkSimple} iconBg="sky">
      <div className="flex flex-wrap gap-6">
        <p className="flex flex-col">
          <span className="font-num text-[36px] leading-none">{formatNumber(courses)}</span>
          <span className="font-display text-[13px] font-bold uppercase text-muted">Khóa đang học</span>
        </p>
        <p className="flex flex-col">
          <span className="font-num text-[36px] leading-none">{formatNumber(customMastered)}</span>
          <span className="font-display text-[13px] font-bold uppercase text-muted">Từ tự tạo đã thuộc</span>
        </p>
      </div>
      <p className="text-caption text-muted">Từ tự tạo không tính vào rank và lượt quay.</p>
      <Button size="sm" variant="secondary" onClick={() => navigate('/courses')}>
        {courses > 0 ? 'Mở khóa học' : 'Tạo khóa học'}
      </Button>
    </StatCard>
  )
}

/** Tính năng chưa có backend: khối giữ phong cách, nhãn "Sắp ra mắt", không có số liệu. */
export function SoonCard({ title, icon, iconBg, text }) {
  return (
    <StatCard
      title={title}
      icon={icon}
      iconBg={iconBg}
      aside={
        <span className="inline-flex items-center gap-1 rounded-pill border-2 border-line bg-gold px-2.5 py-0.5 font-display text-[13px] font-bold uppercase">
          <Icon icon={Hourglass} size={14} /> Sắp ra mắt
        </span>
      }
    >
      <p className="text-muted">{text}</p>
    </StatCard>
  )
}
