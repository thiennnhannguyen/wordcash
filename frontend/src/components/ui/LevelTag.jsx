/*
 * Nhãn cấp độ CEFR (A1–C2), màu đi từ nhạt đến đậm.
 */

import cx from '../../utils/cx'

// Cấp đậm dùng chữ trắng, cấp nhạt dùng chữ mực để đủ tương phản
const DARK_LEVELS = new Set(['C1', 'C2'])

const SIZES = {
  sm: 'h-7 min-w-10 px-2 text-xs',
  md: 'h-9 min-w-12 px-3 text-sm',
  lg: 'h-12 min-w-16 px-4 text-lg',
}

export default function LevelTag({ level, size = 'md', className }) {
  const key = level.toUpperCase()

  return (
    <span
      className={cx(
        'inline-flex items-center justify-center rounded-xl border-thick border-line font-display font-bold tracking-wider shadow-hard-sm',
        DARK_LEVELS.has(key) ? 'text-white' : 'text-ink',
        SIZES[size],
        className,
      )}
      style={{ background: `var(--color-level-${key.toLowerCase()})` }}
    >
      {key}
    </span>
  )
}
