/*
 * Dải xem trước linh vật trong 4 trạng thái chuyển động ở Đấu Trường: đứng thở, bắn, trúng đòn, ăn mừng.
 * Mỗi ô phát lặp một đoạn ngắn; khi người dùng bật giảm chuyển động thì chỉ hiện tư thế đứng yên.
 * Chỉ để trang trí, linh vật không có chỉ số.
 */

import { motion, useReducedMotion } from 'framer-motion'
import { Sparkle, StarFour } from '@phosphor-icons/react'
import MascotBlob from './MascotBlob'
import Icon from '../ui/Icon'
import cx from '../../utils/cx'

const LOOP = { repeat: Infinity, repeatDelay: 0.5 }

function Pose({ kind, mascot, still }) {
  const blob = <MascotBlob color={mascot.color} shape={mascot.shape} traits={mascot.traits} size={96} className="size-16 md:size-24" />
  if (still) return blob

  if (kind === 'idle') return <div className="anim-idle">{blob}</div>

  if (kind === 'shoot')
    return (
      <div className="relative">
        <motion.div animate={{ x: [0, -8, 3, 0], scaleX: [1, 0.9, 1.05, 1] }} transition={{ duration: 0.4, times: [0, 0.2, 0.5, 1], ...LOOP, repeatDelay: 0.9 }}>
          {blob}
        </motion.div>
        <motion.span
          className="absolute left-full top-1/3 grid size-6 place-items-center rounded-pill border-2 border-line bg-gold font-display text-[13px] font-bold leading-none"
          animate={{ x: [-18, 40], opacity: [0, 1, 1, 0] }}
          transition={{ duration: 0.5, times: [0, 0.15, 0.8, 1], ...LOOP, repeatDelay: 0.8 }}
          aria-hidden="true"
        >
          A
        </motion.span>
      </div>
    )

  if (kind === 'hit')
    return (
      <div className="relative">
        <motion.div
          animate={{ x: [0, -14, -10, 0], rotate: [0, -8, 0, 0], filter: ['brightness(1)', 'brightness(0) invert(1)', 'brightness(1)', 'brightness(1)'] }}
          transition={{ duration: 0.55, times: [0, 0.18, 0.5, 1], ...LOOP, repeatDelay: 0.8 }}
          style={{ originY: 1 }}
        >
          {blob}
        </motion.div>
        <motion.span
          className="absolute -right-1 top-0"
          animate={{ scale: [0, 1.2, 0], rotate: [0, 30, 45] }}
          transition={{ duration: 0.45, ...LOOP, repeatDelay: 0.9 }}
          aria-hidden="true"
        >
          <Icon icon={StarFour} size={22} color="danger" />
        </motion.span>
      </div>
    )

  return (
    <div className="relative">
      <motion.div animate={{ y: [0, -16, 0, -6, 0], rotate: [0, -8, 0, 6, 0] }} transition={{ duration: 1, ease: 'easeOut', ...LOOP, repeatDelay: 0.3 }} style={{ originY: 1 }}>
        {blob}
      </motion.div>
      {[
        { x: '-20%', y: '0%', d: 0 },
        { x: '90%', y: '10%', d: 0.3 },
      ].map((s) => (
        <motion.span
          key={s.x}
          className="absolute"
          style={{ left: s.x, top: s.y }}
          animate={{ scale: [0, 1, 0], opacity: [0, 1, 0] }}
          transition={{ duration: 0.9, delay: s.d, repeat: Infinity, repeatDelay: 0.4 }}
          aria-hidden="true"
        >
          <Icon icon={Sparkle} size={18} color="gold" />
        </motion.span>
      ))}
    </div>
  )
}

const POSES = [
  { kind: 'idle', label: 'Đứng thở' },
  { kind: 'shoot', label: 'Bắn' },
  { kind: 'hit', label: 'Trúng đòn' },
  { kind: 'win', label: 'Ăn mừng' },
]

export default function MascotPoses({ mascot, className }) {
  const reduceMotion = useReducedMotion()
  return (
    <ul className={cx('grid grid-cols-4 gap-2 md:gap-3', className)} aria-label="Xem trước chuyển động trong Đấu Trường">
      {POSES.map((p) => (
        <li key={p.kind} className="flex flex-col items-center gap-1.5">
          <div className="grid aspect-square w-full place-items-center overflow-hidden rounded-[16px] border-2 border-line bg-raised">
            <Pose kind={p.kind} mascot={mascot} still={reduceMotion} />
          </div>
          <span className="font-display text-[13px] font-bold uppercase leading-tight text-muted">{p.label}</span>
        </li>
      ))}
    </ul>
  )
}
