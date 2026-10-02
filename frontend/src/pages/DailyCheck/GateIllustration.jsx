/*
 * Minh họa cổng thành kiểu game. `open` = false: cánh cổng đóng, có ổ khóa; true: cánh cổng mở ra, bên trong sáng.
 */

import { motion } from 'framer-motion'
import cx from '../../utils/cx'

const INK = 'var(--color-ink)'

function Tower({ x }) {
  return (
    <g stroke={INK} strokeWidth="4" strokeLinejoin="round">
      {[0, 20, 40].map((dx) => (
        <rect key={dx} x={x + dx} y="30" width="16" height="18" rx="3" fill="var(--color-raised)" />
      ))}
      <rect x={x - 2} y="46" width="60" height="146" rx="6" fill="var(--color-surface)" />
      <rect x={x + 20} y="80" width="16" height="26" rx="8" fill={INK} />
    </g>
  )
}

export default function GateIllustration({ open = false, className }) {
  const doorTransition = { duration: 0.9, ease: [0.3, 1.4, 0.5, 1], delay: 0.25 }

  return (
    <svg viewBox="0 0 260 210" className={cx('h-auto w-full', className)} role="img" aria-label={open ? 'Cổng thành đã mở' : 'Cổng thành đang đóng, có ổ khóa'}>
      <ellipse cx="130" cy="200" rx="118" ry="8" fill={INK} opacity="0.15" />

      {/* Cờ trên hai tháp */}
      <g stroke={INK} strokeWidth="3.5" strokeLinejoin="round">
        <line x1="38" y1="30" x2="38" y2="4" />
        <path d="M38 5 L60 12 L38 19 Z" fill="var(--color-danger)" />
        <line x1="222" y1="30" x2="222" y2="4" />
        <path d="M222 5 L244 12 L222 19 Z" fill="var(--color-primary)" />
      </g>

      {/* Tường giữa */}
      <g stroke={INK} strokeWidth="4" strokeLinejoin="round">
        {[70, 92, 114, 136, 158, 180].map((x) => (
          <rect key={x} x={x} y="58" width="14" height="16" rx="3" fill="var(--color-raised)" />
        ))}
        <rect x="64" y="72" width="132" height="120" rx="4" fill="var(--color-surface)" />
      </g>

      <Tower x={12} />
      <Tower x={190} />

      {/* Khung vòm */}
      <path d="M92 192 V124 A38 38 0 0 1 168 124 V192 Z" fill={open ? 'var(--color-gold)' : INK} stroke={INK} strokeWidth="4" />
      {open && (
        <g opacity="0.9" stroke="var(--color-white)" strokeWidth="5" strokeLinecap="round">
          <line x1="130" y1="104" x2="130" y2="92" />
          <line x1="112" y1="112" x2="104" y2="102" />
          <line x1="148" y1="112" x2="156" y2="102" />
        </g>
      )}

      {/* Hai cánh cổng, thu về bản lề hai bên (Framer dùng fill-box: originX 0 = mép trái, 1 = mép phải) */}
      <motion.g
        initial={false}
        animate={{ scaleX: open ? 0.18 : 1 }}
        transition={doorTransition}
        style={{ originX: 0 }}
      >
        <path d="M94 190 V124 A36 36 0 0 1 130 88 V190 Z" fill="var(--color-orange)" stroke={INK} strokeWidth="4" strokeLinejoin="round" />
        <g stroke={INK} strokeWidth="3" opacity="0.5">
          <line x1="106" y1="104" x2="106" y2="190" />
          <line x1="118" y1="94" x2="118" y2="190" />
        </g>
      </motion.g>
      <motion.g
        initial={false}
        animate={{ scaleX: open ? 0.18 : 1 }}
        transition={doorTransition}
        style={{ originX: 1 }}
      >
        <path d="M166 190 V124 A36 36 0 0 0 130 88 V190 Z" fill="var(--color-orange)" stroke={INK} strokeWidth="4" strokeLinejoin="round" />
        <g stroke={INK} strokeWidth="3" opacity="0.5">
          <line x1="142" y1="94" x2="142" y2="190" />
          <line x1="154" y1="104" x2="154" y2="190" />
        </g>
      </motion.g>

      {/* Ổ khóa khi cổng đóng */}
      {!open && (
        <g stroke={INK} strokeWidth="4" strokeLinejoin="round">
          <path d="M120 142 V132 A10 10 0 0 1 140 132 V142" fill="none" />
          <rect x="112" y="140" width="36" height="30" rx="7" fill="var(--color-gold)" />
          <circle cx="130" cy="153" r="3.5" fill={INK} stroke="none" />
          <line x1="130" y1="155" x2="130" y2="162" strokeWidth="3.5" strokeLinecap="round" />
        </g>
      )}
    </svg>
  )
}
