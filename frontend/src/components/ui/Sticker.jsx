/*
 * Nhãn "sticker" trang trí nghiêng nhẹ 3–6 độ, vd. "COMBO x3", "+15 DMG".
 * Chỉ để trang trí, không mang thông tin bắt buộc. `wiggle` cho sticker lắc nhẹ.
 */

import Icon from './Icon'
import cx from '../../utils/cx'

const DARK_FILLS = new Set(['primary', 'line'])

const SIZES = {
  sm: 'h-8 px-3 text-sm gap-1.5',
  md: 'h-10 px-4 text-base gap-2',
  lg: 'h-12 px-5 text-xl gap-2',
}

export default function Sticker({ bg = 'gold', tilt = -4, size = 'md', icon, wiggle = false, className, children }) {
  const dark = DARK_FILLS.has(bg)

  return (
    <span
      className={cx(
        'inline-flex select-none items-center whitespace-nowrap rounded-[14px] border-thick border-line shadow-hard-sm',
        'font-display font-bold uppercase tracking-wide',
        dark ? 'text-white' : 'text-ink',
        SIZES[size],
        wiggle && 'anim-wiggle',
        className,
      )}
      style={{ background: `var(--color-${bg})`, '--tilt': `${tilt}deg`, transform: 'rotate(var(--tilt))' }}
    >
      {icon && <Icon icon={icon} size={size === 'lg' ? 22 : 18} />}
      {children}
    </span>
  )
}
