/*
 * Khung thẻ bo góc.
 *
 * - `highlight`: thẻ nổi bật (nền tím nhạt, bóng dày 6px), dùng cho mục đang học, gợi ý chính.
 * - `locked`: thẻ bị khóa, mờ đi, có huy hiệu ổ khóa và dòng điều kiện mở; không bấm được.
 * - `tone`: "correct" nền xanh chanh, "wrong" nền hồng.
 * - `interactive`: nổi lên khi rê chuột, lún xuống khi nhấn.
 */

import { LockSimple } from '@phosphor-icons/react'
import Icon from './Icon'
import cx from '../../utils/cx'

const SURFACES = {
  surface: 'bg-surface',
  raised: 'bg-raised',
  bg: 'bg-bg',
}

const TONES = {
  correct: 'bg-accent',
  wrong: 'bg-danger',
}

const PADDINGS = {
  none: '',
  sm: 'p-4',
  md: 'p-5 md:p-6',
  lg: 'p-6 md:p-8',
}

export default function Card({
  as: Tag = 'div',
  surface = 'surface',
  tone,
  highlight = false,
  locked = false,
  lockLabel = 'Đã khóa',
  padding = 'md',
  interactive = false,
  className,
  children,
  ...props
}) {
  return (
    <Tag
      aria-disabled={locked || undefined}
      className={cx(
        'relative rounded-card border-thick border-line',
        locked ? 'border-dashed bg-bg' : tone ? TONES[tone] : highlight ? 'bg-raised' : SURFACES[surface],
        !locked && (highlight ? 'shadow-hard-lg' : 'shadow-hard'),
        PADDINGS[padding],
        interactive && !locked && 'pressable cursor-pointer text-left hover:-translate-y-0.5 hover:shadow-hard-lg',
        // Làm mờ từng phần tử con (trừ phần ổ khóa) để giữ nguyên bố cục flex/grid của thẻ
        locked && 'pointer-events-none select-none [&>*:not([data-lock])]:opacity-40 [&>*:not([data-lock])]:grayscale',
        className,
      )}
      {...props}
    >
      {children}
      {locked && (
        <>
          <span
            data-lock
            aria-hidden="true"
            className="absolute -right-3 -top-3 grid size-11 place-items-center rounded-pill border-thick border-line bg-gold text-ink shadow-hard-sm"
          >
            <Icon icon={LockSimple} size={22} />
          </span>
          <div data-lock className="flex items-center gap-2 border-t-2 border-line/15 pt-3 text-muted">
            <Icon icon={LockSimple} size={18} />
            <span className="hud-label">{lockLabel}</span>
          </div>
        </>
      )}
    </Tag>
  )
}
