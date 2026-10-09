/*
 * Tiêu đề cấp độ và tiến độ.
 *
 * - `LevelTabs`: hàng tab A1–C2 (màu nhạt dần sang đậm), cấp đã xong có dấu tích, cấp khóa có ổ khóa. Mobile cuộn ngang.
 *   `size="sm"` cho thanh nổi trên bản đồ.
 * - `BranchSwitch`: công tắc chọn nhánh Nền tảng / IELTS / TOEIC.
 * - `LevelSummary`: card tóm tắt cấp đang xem: lá cờ vùng đất, "B1 · VƯƠNG QUỐC ANH", dòng phụ và thanh từ đã thuộc.
 *   Trên bản đồ hành trình, card nổi như tờ giấy ghim (`Pin`).
 */

import { CheckFat, LockSimple } from '@phosphor-icons/react'
import Icon from '../ui/Icon'
import ProgressBar from '../ui/ProgressBar'
import Flag from './Flag'
import cx from '../../utils/cx'
import { formatNumber } from '../../utils/format'

const DARK_LEVELS = new Set(['C1', 'C2'])

export function LevelTabs({ levels, selected, onSelect, size = 'md' }) {
  const sm = size === 'sm'
  return (
    <div className="-mx-4 overflow-x-auto px-4 pb-2 pt-3 md:mx-0 md:overflow-visible md:px-0">
      <div role="tablist" aria-label="Cấp độ" className={cx('flex gap-2.5 md:flex-wrap', sm ? 'md:gap-2' : 'md:gap-3')}>
        {levels.map((level) => {
          const active = level.code === selected
          const locked = level.status === 'locked'
          return (
            <button
              key={level.code}
              type="button"
              role="tab"
              aria-selected={active}
              aria-label={`${level.code}${level.name ? ` · ${level.name}` : ' · sắp ra mắt'}${locked ? ' · đã khóa' : level.status === 'done' ? ' · đã xong' : ''}`}
              onClick={() => onSelect(level)}
              className={cx(
                'relative flex shrink-0 items-center justify-center gap-1.5 rounded-btn border-thick border-line font-num',
                sm ? 'h-12 min-w-16 px-3 text-lg' : 'h-14 min-w-18 px-4 text-xl',
                DARK_LEVELS.has(level.code) ? 'text-white' : 'text-ink',
                active ? '-translate-y-1 shadow-hard-lg outline-[3px] outline-offset-3 outline-ink outline' : 'shadow-hard-sm',
                locked && 'opacity-55',
              )}
              style={{ background: `var(--color-level-${level.code.toLowerCase()})` }}
            >
              {level.code}
              {locked && <Icon icon={LockSimple} size={18} />}
              {level.status === 'done' && (
                <span className="absolute -right-2 -top-2 grid size-6 place-items-center rounded-pill border-2 border-line bg-accent">
                  <Icon icon={CheckFat} size={13} color="ink" />
                </span>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}

export function BranchSwitch({ branches, value, onChange, className }) {
  return (
    <div
      role="radiogroup"
      aria-label="Nhánh học"
      className={cx('inline-flex rounded-pill border-thick border-line bg-surface p-1 shadow-hard-sm', className)}
    >
      {branches.map((b) => {
        const active = b.key === value
        return (
          <button
            key={b.key}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(b.key)}
            className={cx(
              'h-11 flex-1 whitespace-nowrap rounded-pill px-4 font-display text-sm font-bold uppercase tracking-wide transition-colors md:flex-none',
              active ? 'bg-ink text-white' : 'text-ink hover:bg-raised',
            )}
          >
            {b.label}
          </button>
        )
      })}
    </div>
  )
}

/** Đinh ghim trang trí ở mép trên card nổi trên bản đồ. */
export function Pin({ className, color = 'danger' }) {
  return (
    <span aria-hidden="true" className={cx('pointer-events-none absolute z-10 size-4 rounded-pill border-2 border-line shadow-hard-sm', className)} style={{ background: `var(--color-${color})` }}>
      <span className="absolute left-[3px] top-[2px] size-1.5 rounded-pill bg-white/70" />
    </span>
  )
}

export function LevelSummary({ level, region, summary, className }) {
  return (
    <div className={cx('relative flex flex-col gap-3 rounded-card border-thick border-line bg-surface p-4 shadow-hard lg:flex-row lg:items-center lg:gap-6', className)}>
      <Pin className="-top-2 left-1/2 -translate-x-1/2" />
      <div className="flex min-w-0 items-center gap-3">
        <span
          className={cx(
            'grid size-14 shrink-0 place-items-center rounded-[16px] border-thick border-line font-num text-2xl shadow-hard-sm',
            DARK_LEVELS.has(level.code) ? 'text-white' : 'text-ink',
          )}
          style={{ background: `var(--color-level-${level.code.toLowerCase()})` }}
        >
          {level.code}
        </span>
        <div className="min-w-0">
          <h1 className="flex items-center gap-2 text-[22px] uppercase leading-tight md:text-[26px]">
            <span className="truncate">
              {level.code} · {region.name}
            </span>
            <Flag code={region.flag} width={34} className="shrink-0" />
          </h1>
          <p className="font-num text-sm uppercase text-muted">
            {level.name} · {formatNumber(level.words)} từ · Chặng {summary.stageCurrent}/{summary.stageTotal}
          </p>
        </div>
      </div>
      <ProgressBar value={summary.mastered} max={Math.max(summary.total, 1)} label="Từ trong các bài đã qua" showValue className="min-w-0 flex-1" />
    </div>
  )
}
