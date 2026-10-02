/*
 * Thanh máu tụt mượt.
 *
 * Màu đổi theo lượng máu: > 50% xanh chanh, 26–50% vàng, ≤ 25% hồng.
 * `color` ép một màu cố định (vd. "danger" cho máu đối thủ).
 * Phần máu vừa mất để lại một vệt tụt chậm phía sau để người chơi thấy rõ sát thương.
 */

import { Heart } from '@phosphor-icons/react'
import { IconBadge } from '../ui/Icon'
import cx from '../../utils/cx'

function hpColor(percent) {
  if (percent > 50) return 'accent'
  if (percent > 25) return 'gold'
  return 'danger'
}

export default function HealthBar({ value, max = 100, label, color: forcedColor, reverse = false, className }) {
  const percent = Math.min(100, Math.max(0, (value / max) * 100))
  const color = forcedColor ?? hpColor(percent)

  return (
    <div className={cx('w-full', className)}>
      <div className={cx('mb-2 flex items-center gap-2.5', reverse && 'flex-row-reverse')}>
        <IconBadge icon={Heart} bg={color} size="sm" shadow={false} />
        {label && <span className="hud-label">{label}</span>}
        <span className={cx('font-num text-xl text-ink', reverse ? 'mr-auto' : 'ml-auto')}>
          {value}
          <span className="text-muted">/{max}</span>
        </span>
      </div>
      <div
        role="meter"
        aria-label={label ?? 'Máu'}
        aria-valuemin={0}
        aria-valuemax={max}
        aria-valuenow={value}
        className="relative h-7 overflow-hidden rounded-pill border-thick border-line bg-surface"
      >
        <div
          className={cx('absolute inset-y-0 bg-ink/15 transition-[width] delay-200 duration-700 ease-out', reverse ? 'right-0' : 'left-0')}
          style={{ width: `${percent}%` }}
        />
        <div
          className={cx(
            'absolute inset-y-0 transition-[width,background-color] duration-300 ease-out',
            reverse ? 'right-0 border-l-thick' : 'left-0 border-r-thick',
            percent > 0 && percent < 100 ? 'border-line' : 'border-transparent',
          )}
          style={{ width: `${percent}%`, background: `var(--color-${color})` }}
        />
      </div>
    </div>
  )
}
