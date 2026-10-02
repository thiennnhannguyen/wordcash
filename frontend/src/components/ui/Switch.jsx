/*
 * Công tắc bật/tắt: input checkbox thật với role="switch", vẽ lại dạng rãnh viền mực và núm tròn.
 * Bật thì rãnh xanh chanh, núm trượt sang phải.
 */

import { useId } from 'react'
import cx from '../../utils/cx'

export default function Switch({ checked, onChange, className, children, ...props }) {
  const id = useId()

  return (
    <label htmlFor={id} className={cx('inline-flex min-h-11 cursor-pointer select-none items-center gap-2.5', className)}>
      <input id={id} type="checkbox" role="switch" checked={checked} onChange={(e) => onChange?.(e.target.checked)} className="peer sr-only" {...props} />
      <span
        aria-hidden="true"
        className={cx(
          'relative h-8 w-14 shrink-0 rounded-pill border-thick border-line shadow-hard-sm transition-colors',
          'peer-focus-visible:outline-3 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-primary',
          checked ? 'bg-accent' : 'bg-neutral',
        )}
      >
        <span
          className={cx(
            'absolute top-1/2 size-[22px] -translate-y-1/2 rounded-pill border-thick border-line bg-surface transition-[left] duration-200',
            checked ? 'left-[26px]' : 'left-[2px]',
          )}
        />
      </span>
      <span className="whitespace-nowrap font-display text-sm font-bold uppercase tracking-wide text-ink">{children}</span>
    </label>
  )
}
