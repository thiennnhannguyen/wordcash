/*
 * Nút bấm có hiệu ứng nảy.
 *
 * Kiểu neo-brutalism sáng: viền mực 2.5px, bóng cứng lệch 4px; khi nhấn nút lún xuống
 * đúng bằng độ lệch bóng và mất bóng. Chữ Chakra Petch in hoa, đậm.
 * Mọi cỡ nút cao tối thiểu 44px để bấm bằng ngón tay.
 *
 * `state` ("hover" | "active") ép hiển thị một trạng thái, chỉ dùng cho trang Design System.
 */

import Icon from './Icon'
import cx from '../../utils/cx'

const VARIANTS = {
  primary: 'bg-primary text-white',
  secondary: 'bg-surface text-ink',
  danger: 'bg-danger text-ink',
  accent: 'bg-accent text-ink',
  gold: 'bg-gold text-ink',
  sky: 'bg-sky text-ink',
  orange: 'bg-orange text-ink',
}

const SIZES = {
  sm: 'h-11 px-4 text-sm gap-1.5',
  md: 'h-13 px-6 text-base gap-2',
  lg: 'h-16 px-8 text-lg gap-2.5',
}

const ROUND_SIZES = { sm: 'size-11', md: 'size-13', lg: 'size-16' }

const ICON_SIZES = { sm: 18, md: 22, lg: 26 }

function buttonClasses({ variant, size, round, fullWidth, className }) {
  const ghost = variant === 'ghost'

  return cx(
    'inline-flex shrink-0 select-none items-center justify-center',
    'font-display font-bold uppercase tracking-wider',
    'disabled:pointer-events-none disabled:opacity-40 disabled:shadow-none',
    ghost
      ? 'border-thick border-transparent bg-transparent text-ink transition-colors hover:bg-raised data-[state=hover]:bg-raised active:bg-raised'
      : cx(
          'pressable border-thick border-line shadow-hard',
          'hover:-translate-y-0.5 hover:shadow-hard-lg data-[state=hover]:-translate-y-0.5 data-[state=hover]:shadow-hard-lg',
          VARIANTS[variant],
        ),
    round ? cx('rounded-pill', ROUND_SIZES[size]) : cx('rounded-btn', SIZES[size]),
    fullWidth && 'w-full',
    className,
  )
}

export default function Button({
  variant = 'primary',
  size = 'md',
  icon,
  iconRight,
  fullWidth = false,
  state,
  type = 'button',
  className,
  children,
  ...props
}) {
  return (
    <button
      type={type}
      data-state={state}
      className={buttonClasses({ variant, size, fullWidth, className })}
      {...props}
    >
      {icon && <Icon icon={icon} size={ICON_SIZES[size]} className="shrink-0" />}
      {children}
      {iconRight && <Icon icon={iconRight} size={ICON_SIZES[size]} className="shrink-0" />}
    </button>
  )
}

/** Nút tròn chỉ có icon. Bắt buộc có `label` để trình đọc màn hình đọc được. */
export function IconButton({ icon, label, variant = 'secondary', size = 'md', state, type = 'button', className, ...props }) {
  return (
    <button
      type={type}
      aria-label={label}
      title={label}
      data-state={state}
      className={buttonClasses({ variant, size, round: true, className })}
      {...props}
    >
      <Icon icon={icon} size={ICON_SIZES[size] + 2} />
    </button>
  )
}
