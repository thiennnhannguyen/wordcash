/*
 * Ô nhập liệu.
 *
 * `status`: "error" (viền hồng + thông báo lỗi, ô rung nhẹ) hoặc "success" (nền xanh chanh nhạt).
 * `trailing`: phần tử đặt cuối ô (vd. nút ẩn/hiện mật khẩu). `children`: nội dung phụ dưới ô (vd. thanh độ mạnh).
 * Khi focus viền chuyển tím kèm vòng sáng tím. `state="focus"` ép hiển thị focus, chỉ dùng cho trang Design System.
 */

import { useId } from 'react'
import { CheckCircle, WarningCircle } from '@phosphor-icons/react'
import Icon from './Icon'
import cx from '../../utils/cx'

const STATUS_FRAMES = {
  error: 'border-danger bg-danger/10',
  success: 'border-line bg-accent/35',
}

export default function Input({ label, hint, status, icon, trailing, state, className, id, children, ...props }) {
  const autoId = useId()
  const inputId = id ?? autoId
  const hintId = hint ? `${inputId}-hint` : undefined
  const forcedFocus = state === 'focus'

  return (
    <div className={cx('flex flex-col gap-2', className)}>
      {label && (
        <label htmlFor={inputId} className="hud-label">
          {label}
        </label>
      )}
      <div
        className={cx(
          'flex h-14 items-center gap-3 rounded-btn border-thick px-4 shadow-hard transition-[border-color,box-shadow] duration-150',
          status === 'error' && 'anim-shake',
          'focus-within:border-primary focus-within:bg-surface focus-within:shadow-focus',
          forcedFocus ? 'border-primary bg-surface shadow-focus' : (STATUS_FRAMES[status] ?? 'border-line bg-surface'),
        )}
      >
        {icon && <Icon icon={icon} size={22} color="muted" />}
        <input
          id={inputId}
          aria-invalid={status === 'error' || undefined}
          aria-describedby={hintId}
          className="h-full min-w-0 flex-1 bg-transparent text-body font-medium text-ink outline-none placeholder:text-muted/70 focus-visible:outline-none"
          {...props}
        />
        {status === 'success' && <Icon icon={CheckCircle} size={24} color="accent-deep" />}
        {status === 'error' && <Icon icon={WarningCircle} size={24} color="danger-deep" />}
        {trailing}
      </div>
      {children}
      {hint && (
        <p
          id={hintId}
          className={cx(
            'text-caption font-medium',
            status === 'error' ? 'text-danger-deep' : status === 'success' ? 'text-accent-deep' : 'text-muted',
          )}
        >
          {hint}
        </p>
      )}
    </div>
  )
}
