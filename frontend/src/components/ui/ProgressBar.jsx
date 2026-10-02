/*
 * Thanh tiến độ.
 *
 * Mặc định xanh chanh (tiến độ học tập); có thêm tím, vàng, hồng, xanh trời.
 */

import cx from '../../utils/cx'
import { formatNumber } from '../../utils/format'

const FILLS = {
  accent: 'bg-accent',
  primary: 'bg-primary',
  gold: 'bg-gold',
  danger: 'bg-danger',
  sky: 'bg-sky',
}

const HEIGHTS = { sm: 'h-4', md: 'h-5', lg: 'h-7' }

export default function ProgressBar({
  value,
  max = 100,
  tone = 'accent',
  size = 'md',
  label,
  showValue = false,
  className,
}) {
  const percent = max > 0 ? Math.min(100, Math.max(0, (value / max) * 100)) : 0

  return (
    <div className={cx('w-full', className)}>
      {(label || showValue) && (
        <div className="mb-2 flex items-baseline justify-between gap-3">
          {label && <span className="hud-label">{label}</span>}
          {showValue && (
            <span className="font-num text-base text-ink">
              {formatNumber(value)}
              <span className="text-muted">/{formatNumber(max)}</span>
            </span>
          )}
        </div>
      )}
      <div
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={max}
        aria-valuenow={value}
        aria-label={label}
        className={cx('overflow-hidden rounded-pill border-thick border-line bg-surface', HEIGHTS[size])}
      >
        <div
          className={cx(
            'h-full rounded-pill transition-[width] duration-500 ease-out',
            percent > 0 && percent < 100 && 'border-r-thick border-line',
            FILLS[tone],
          )}
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  )
}
