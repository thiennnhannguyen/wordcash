/*
 * Các phần nhỏ của màn Quay thẻ: thanh trên (quay lại, số mảnh, bảng tỉ lệ, bỏ qua hiệu ứng), tab chọn loại lượt,
 * thanh pity "Đảm bảo Sử Thi", dòng tiến độ tới lượt kế tiếp và nền tia sáng tỏa chậm.
 * Không có chỗ nào mời mua lượt.
 */

import { forwardRef } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { ArrowLeft, FastForward, Info, PuzzlePiece } from '@phosphor-icons/react'
import { IconButton } from '../../../components/ui/Button'
import Icon from '../../../components/ui/Icon'
import cx from '../../../utils/cx'
import { GACHA } from '../../../utils/constants'

// Tia sáng tỏa chậm từ giữa màn; `color` là tên token, `fast` dùng cho lúc gợi ý Huyền Thoại
export function Rays({ color = 'gold', opacity = 0.35, duration = 80, className }) {
  const reduceMotion = useReducedMotion()
  return (
    <motion.svg
      viewBox="-100 -100 200 200"
      className={cx('pointer-events-none absolute left-1/2 top-1/2 size-[180vmax] -translate-x-1/2 -translate-y-1/2', className)}
      animate={reduceMotion ? undefined : { rotate: 360 }}
      transition={{ duration, repeat: Infinity, ease: 'linear' }}
      aria-hidden="true"
    >
      {Array.from({ length: 16 }, (_, i) => (
        <path key={i} d="M0 0 L-7 -100 L7 -100 Z" transform={`rotate(${i * 22.5})`} fill={`var(--color-${color})`} opacity={opacity} />
      ))}
    </motion.svg>
  )
}

export const ShardCounter = forwardRef(function ShardCounter({ shards, bump }, ref) {
  return (
    <motion.span
      ref={ref}
      key={bump}
      initial={bump ? { scale: 1.35 } : false}
      animate={{ scale: 1 }}
      transition={{ type: 'spring', stiffness: 500, damping: 14 }}
      className="inline-flex h-11 items-center gap-1.5 rounded-pill border-thick border-line bg-surface pl-1.5 pr-3.5 shadow-hard-sm"
      aria-label={`${shards} mảnh`}
    >
      <span className="grid size-8 place-items-center rounded-pill border-2 border-line bg-gold">
        <Icon icon={PuzzlePiece} size={18} color="ink" />
      </span>
      <span className="font-num text-lg leading-none">{shards}</span>
    </motion.span>
  )
})

export function SpinHud({ onBack, onOdds, onSkip, showSkip, shardRef, shards, bump }) {
  return (
    <header className="relative z-40 flex items-center justify-between gap-3 px-4 pt-[calc(0.75rem+env(safe-area-inset-top))] md:px-8 md:pt-6">
      <div className="flex items-center gap-3">
        <IconButton icon={ArrowLeft} label="Về Bộ Sưu Tập" size="sm" onClick={onBack} />
        <h1 className="font-display text-lg font-bold uppercase tracking-wider max-sm:hidden md:text-xl">Mở thẻ</h1>
      </div>
      <div className="flex items-center gap-2 md:gap-3">
        {showSkip ? (
          <button
            type="button"
            onClick={onSkip}
            className="inline-flex h-11 items-center gap-1.5 rounded-pill border-2 border-line bg-surface px-3 font-display text-[13px] font-bold uppercase tracking-wide shadow-hard-sm"
          >
            <Icon icon={FastForward} size={16} /> Bỏ qua hiệu ứng
          </button>
        ) : (
          <IconButton icon={Info} label="Bảng tỉ lệ công khai" size="sm" onClick={onOdds} />
        )}
        <ShardCounter ref={shardRef} shards={shards} bump={bump} />
      </div>
    </header>
  )
}

export function TypeTabs({ type, spins, onChange }) {
  const tabs = [
    { key: 'normal', label: 'Lượt thường' },
    { key: 'special', label: 'Lượt đặc biệt' },
  ]
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="flex rounded-pill border-thick border-line bg-surface p-1 shadow-hard-sm" role="tablist" aria-label="Loại lượt quay">
        {tabs.map((t) => {
          const active = type === t.key
          const empty = spins[t.key] === 0
          return (
            <button
              key={t.key}
              type="button"
              role="tab"
              aria-selected={active}
              disabled={empty}
              onClick={() => onChange(t.key)}
              className={cx(
                'inline-flex h-11 items-center gap-1.5 whitespace-nowrap rounded-pill px-3.5 font-display text-sm font-bold uppercase tracking-wide transition-colors md:px-5',
                active ? (t.key === 'special' ? 'bg-gold text-ink ring-2 ring-line' : 'bg-primary text-white ring-2 ring-line') : 'text-ink hover:bg-raised',
                empty && 'cursor-not-allowed opacity-45 hover:bg-transparent',
              )}
            >
              {t.label} <span className="font-num">({spins[t.key]})</span>
            </button>
          )
        })}
      </div>
      <p className={cx('h-7 rounded-pill border-2 border-line bg-gold px-3 font-display text-[13px] font-bold uppercase leading-6 tracking-wide transition-opacity', type === 'special' ? 'opacity-100' : 'opacity-0')} aria-hidden={type !== 'special'}>
        Tỉ lệ ra thẻ hiếm cao hơn
      </p>
    </div>
  )
}

export function PityBar({ pity }) {
  const ratio = Math.min(pity / GACHA.pityEpic, 1)
  const near = ratio >= 0.8
  return (
    <div className="flex w-full max-w-sm flex-col gap-1.5">
      <div className="flex items-baseline justify-between gap-3 font-display text-sm font-bold uppercase tracking-wide">
        <span>Đảm bảo Sử Thi</span>
        <span className={cx('font-num text-base', near && 'text-primary')}>
          {pity}/{GACHA.pityEpic} lượt
        </span>
      </div>
      <div
        className={cx('h-5 overflow-hidden rounded-pill border-thick border-line bg-surface', near ? 'shadow-glow-epic anim-glow' : 'shadow-hard-sm')}
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={GACHA.pityEpic}
        aria-valuenow={pity}
        aria-label="Số lượt liên tiếp chưa ra Sử Thi"
      >
        <div className={cx('h-full border-r-thick border-line transition-[width] duration-500', near ? 'bg-primary' : 'bg-gold')} style={{ width: `${ratio * 100}%` }} />
      </div>
      {near && <p className="text-caption font-medium text-muted">Sắp chắc chắn ra Sử Thi!</p>}
    </div>
  )
}

export function NextSpinLine({ nextSpin, className }) {
  const left = nextSpin.target - nextSpin.current
  return (
    <div className={cx('flex items-center justify-center gap-2.5 text-caption font-medium text-muted', className)}>
      <span>
        Lượt tiếp theo: còn <span className="font-num text-ink">{left}</span> từ nữa (<span className="font-num">{nextSpin.current}/{nextSpin.target}</span>)
      </span>
      <span className="h-2 w-16 overflow-hidden rounded-pill border-2 border-line bg-surface" aria-hidden="true">
        <span className="block h-full bg-accent" style={{ width: `${(nextSpin.current / nextSpin.target) * 100}%` }} />
      </span>
    </div>
  )
}
