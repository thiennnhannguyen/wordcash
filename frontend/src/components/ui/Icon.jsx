/*
 * Bọc bộ icon Phosphor để thống nhất kích thước, màu.
 *
 * Luôn dùng kiểu "fill", tô màu phẳng. `color` là tên token trong tokens.css
 * (vd. "primary", "danger", "muted") hoặc "current" để ăn theo màu chữ.
 * Dùng: <Icon icon={Sword} color="primary" />
 * `IconBadge`: icon đặt trong ô tròn/vuông bo góc có viền đen, nền màu kẹo.
 */

import cx from '../../utils/cx'

// Nền đậm cần icon trắng; nền màu kẹo sáng dùng icon màu mực
const DARK_FILLS = new Set(['primary', 'line', 'ink', 'level-c1', 'level-c2'])

export default function Icon({ icon: Glyph, size = 24, color = 'current', label, className }) {
  const fill = color === 'current' ? 'currentColor' : `var(--color-${color})`

  return (
    <Glyph
      size={size}
      weight="fill"
      color={fill}
      className={className}
      aria-hidden={label ? undefined : true}
      aria-label={label}
      role={label ? 'img' : undefined}
    />
  )
}

const BADGE_SIZES = {
  sm: { box: 'size-9', icon: 18 },
  md: { box: 'size-12', icon: 24 },
  lg: { box: 'size-16', icon: 32 },
  xl: { box: 'size-24', icon: 48 },
}

export function IconBadge({ icon, bg = 'surface', shape = 'circle', size = 'md', shadow = true, label, className }) {
  const s = BADGE_SIZES[size]

  return (
    <span
      className={cx(
        'inline-grid shrink-0 place-items-center border-thick border-line',
        shape === 'circle' ? 'rounded-pill' : 'rounded-[14px]',
        shadow && 'shadow-hard-sm',
        s.box,
        className,
      )}
      style={{ background: `var(--color-${bg})` }}
    >
      <Icon icon={icon} size={s.icon} color={DARK_FILLS.has(bg) ? 'white' : 'ink'} label={label} />
    </span>
  )
}
