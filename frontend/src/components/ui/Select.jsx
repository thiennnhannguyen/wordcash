/*
 * Ô chọn: select gốc của trình duyệt (dễ dùng trên mobile), khoác kiểu giống Input.
 */

import { useId } from 'react'
import { CaretDown } from '@phosphor-icons/react'
import Icon from './Icon'
import cx from '../../utils/cx'

export default function Select({ label, hint, icon, options, className, id, ...props }) {
  const autoId = useId()
  const selectId = id ?? autoId
  const hintId = hint ? `${selectId}-hint` : undefined

  return (
    <div className={cx('flex flex-col gap-2', className)}>
      {label && (
        <label htmlFor={selectId} className="hud-label">
          {label}
        </label>
      )}
      <div className="relative flex h-14 items-center rounded-btn border-thick border-line bg-surface shadow-hard focus-within:border-primary focus-within:shadow-focus">
        {icon && <Icon icon={icon} size={22} color="muted" className="pointer-events-none absolute left-4" />}
        <select
          id={selectId}
          aria-describedby={hintId}
          className={cx(
            'h-full w-full cursor-pointer appearance-none rounded-btn bg-transparent pr-12 text-body font-medium text-ink outline-none',
            icon ? 'pl-12' : 'pl-4',
          )}
          {...props}
        >
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <Icon icon={CaretDown} size={20} color="ink" className="pointer-events-none absolute right-4" />
      </div>
      {hint && (
        <p id={hintId} className="text-caption font-medium text-muted">
          {hint}
        </p>
      )}
    </div>
  )
}
