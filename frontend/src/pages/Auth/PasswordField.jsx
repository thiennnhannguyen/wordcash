/*
 * Ô mật khẩu có nút con mắt ẩn/hiện. `showStrength` hiện thanh độ mạnh 4 nấc (hồng → vàng → xanh chanh).
 */

import { useState } from 'react'
import { Eye, EyeSlash, LockKey } from '@phosphor-icons/react'
import Icon from '../../components/ui/Icon'
import Input from '../../components/ui/Input'
import cx from '../../utils/cx'
import { passwordStrength, STRENGTH_LABELS } from '../../utils/password'

function strengthColor(score) {
  if (score <= 1) return 'danger'
  if (score === 2) return 'gold'
  return 'accent'
}

export default function PasswordField({ value, showStrength = false, ...props }) {
  const [visible, setVisible] = useState(false)
  const score = passwordStrength(value)
  const color = strengthColor(score)

  return (
    <Input
      type={visible ? 'text' : 'password'}
      icon={LockKey}
      value={value}
      trailing={
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
          aria-pressed={visible}
          className="-mr-2 grid size-11 shrink-0 place-items-center rounded-pill text-muted transition-colors hover:bg-raised hover:text-ink"
        >
          <Icon icon={visible ? EyeSlash : Eye} size={22} />
        </button>
      }
      {...props}
    >
      {showStrength && value && (
        <div className="flex items-center gap-3" aria-live="polite">
          <div className="grid flex-1 grid-cols-4 gap-1.5" aria-hidden="true">
            {[1, 2, 3, 4].map((step) => (
              <span
                key={step}
                className={cx('h-2.5 rounded-pill border-2 border-line', step > score && 'bg-surface')}
                style={step <= score ? { background: `var(--color-${color})` } : undefined}
              />
            ))}
          </div>
          <span className="w-20 text-right text-caption font-semibold">{STRENGTH_LABELS[score]}</span>
        </div>
      )}
    </Input>
  )
}
