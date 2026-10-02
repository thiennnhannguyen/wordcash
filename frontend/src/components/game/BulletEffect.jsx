/*
 * Hiệu ứng đạn bay và nổ (Canvas/PixiJS).
 *
 * Hiện dựng bằng DOM + Framer Motion (đủ nhẹ để chạy 60fps, không dùng blur): viên đạn năng lượng hình chữ cái
 * bay từ `from` tới `to` (toạ độ màn hình) trong 250ms kiểu ease-in, kéo theo vệt tốc độ; `crit` thì đạn to gấp đôi,
 * đuôi lửa vàng. `frozen` dừng đạn giữa đường bay (xem thử thiết kế). `Sparks` là tia lửa bắn ra ở điểm trúng. Chỉ để trang trí; sát thương do server tính.
 */

import { motion } from 'framer-motion'
import cx from '../../utils/cx'

export const BULLET_MS = 250

export function Bullet({ from, to, letter, color = 'primary', crit = false, frozen = false, onImpact }) {
  const dx = to.x - from.x
  const dy = to.y - from.y
  const angle = (Math.atan2(dy, dx) * 180) / Math.PI
  const size = crit ? 96 : 52
  const tail = crit
    ? 'linear-gradient(270deg, var(--color-gold), var(--color-orange) 45%, transparent)'
    : `linear-gradient(270deg, var(--color-${color}), transparent)`

  return (
    <motion.div
      className="pointer-events-none fixed left-0 top-0 z-40"
      initial={frozen ? false : { x: from.x, y: from.y }}
      animate={frozen ? { x: from.x + dx * 0.55, y: from.y + dy * 0.55 } : { x: to.x, y: to.y }}
      transition={{ duration: BULLET_MS / 1000, ease: 'easeIn' }}
      onAnimationComplete={onImpact}
      aria-hidden="true"
    >
      {/* Vệt tốc độ phía sau đạn */}
      <span
        className="absolute left-0 top-0 origin-left rounded-pill"
        style={{ width: crit ? 220 : 150, height: crit ? 34 : 16, transform: `rotate(${angle + 180}deg) translateY(-50%)`, background: tail }}
      />
      {[-1, 1].map((k) => (
        <span
          key={k}
          className="absolute left-0 top-0 h-1 origin-left rounded-pill bg-white/80"
          style={{ width: crit ? 150 : 100, transform: `rotate(${angle + 180}deg) translateY(${k * (crit ? 26 : 16)}px)` }}
        />
      ))}
      <span
        className={cx('absolute grid -translate-x-1/2 -translate-y-1/2 place-items-center rounded-pill border-thick border-line font-display font-bold text-white')}
        style={{
          width: size,
          height: size,
          fontSize: crit ? 52 : 30,
          background: crit ? 'var(--color-gold)' : `var(--color-${color})`,
          color: crit ? 'var(--color-ink)' : 'var(--color-white)',
          boxShadow: `0 0 0 4px color-mix(in srgb, var(--color-${crit ? 'gold' : color}) 40%, transparent), 0 0 24px 6px color-mix(in srgb, var(--color-${crit ? 'gold' : color}) 55%, transparent)`,
        }}
      >
        {letter}
      </span>
    </motion.div>
  )
}

const SPARK_ANGLES = [0, 40, 80, 130, 170, 215, 260, 310]

export function Sparks({ at, color = 'danger', big = false }) {
  const dist = big ? 110 : 70
  return (
    <div className="pointer-events-none fixed left-0 top-0 z-40" style={{ transform: `translate(${at.x}px, ${at.y}px)` }} aria-hidden="true">
      {SPARK_ANGLES.map((a) => {
        const rad = (a * Math.PI) / 180
        return (
          <motion.span
            key={a}
            className="absolute -ml-1.5 -mt-3 h-6 w-3 rounded-pill border-2 border-line"
            style={{ background: `var(--color-${color})`, rotate: a + 90 }}
            initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
            animate={{ x: Math.cos(rad) * dist, y: Math.sin(rad) * dist, opacity: 0, scale: 0.4 }}
            transition={{ duration: 0.45, ease: 'easeOut' }}
          />
        )
      })}
    </div>
  )
}
