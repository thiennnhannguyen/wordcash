/*
 * Ô tích: input checkbox thật (giữ bàn phím và trình đọc màn hình), vẽ lại dạng ô vuông viền mực.
 */

import { useId } from 'react'
import { CheckFat } from '@phosphor-icons/react'
import Icon from './Icon'
import cx from '../../utils/cx'

export default function Checkbox({ checked, onChange, error, className, children, ...props }) {
  const id = useId()

  return (
    <label htmlFor={id} className={cx('flex min-h-11 cursor-pointer items-start gap-3', className)}>
      <input id={id} type="checkbox" checked={checked} onChange={onChange} className="peer sr-only" {...props} />
      <span
        aria-hidden="true"
        className={cx(
          'mt-0.5 grid size-7 shrink-0 place-items-center rounded-[9px] border-thick shadow-hard-sm transition-colors',
          'peer-focus-visible:outline-3 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-primary',
          checked ? 'border-line bg-accent' : error ? 'border-danger bg-danger/10' : 'border-line bg-surface',
        )}
      >
        {checked && <Icon icon={CheckFat} size={18} color="ink" />}
      </span>
      <span className="pt-0.5 text-caption font-medium leading-snug text-ink">{children}</span>
    </label>
  )
}
