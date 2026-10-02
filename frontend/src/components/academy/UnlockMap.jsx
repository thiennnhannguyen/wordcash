/*
 * Minh họa mở khóa trên màn kết quả bài kiểm tra: trạm vừa qua (xanh chanh) nối đường tới trạm tiếp theo.
 * Ổ khóa của trạm tiếp theo vỡ đôi bay ra, trạm chuyển sang tím điện và phát sáng.
 * Việc mở khóa do server quyết định; đây chỉ là hình minh họa kết quả server trả về.
 */

import { useEffect, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { CheckFat, LockSimple, Play, Sparkle } from '@phosphor-icons/react'
import Icon from '../ui/Icon'
import cx from '../../utils/cx'

const HALVES = [
  { clip: 'inset(0 50% 0 0)', x: -46, rotate: -35 },
  { clip: 'inset(0 0 0 50%)', x: 46, rotate: 35 },
]

function Station({ children, label, className }) {
  return (
    <div className="flex flex-col items-center gap-2">
      <span className={cx('relative grid size-20 place-items-center rounded-pill border-thick md:size-24', className)}>{children}</span>
      <span className="font-display text-sm font-bold uppercase">{label}</span>
    </div>
  )
}

export default function UnlockMap({ fromLabel, toLabel }) {
  const reduceMotion = useReducedMotion()
  const [broken, setBroken] = useState(!!reduceMotion)

  useEffect(() => {
    if (reduceMotion) return undefined
    const t = setTimeout(() => setBroken(true), 900)
    return () => clearTimeout(t)
  }, [reduceMotion])

  return (
    <div className="relative flex items-start justify-center gap-2 rounded-panel border-thick border-line bg-raised px-4 pb-5 pt-8 shadow-hard md:gap-4 md:px-10" role="img" aria-label={`${fromLabel} đã xong, ${toLabel} vừa được mở khóa`}>
      <Station label={fromLabel} className="border-line bg-accent shadow-hard">
        <Icon icon={CheckFat} size={36} />
      </Station>

      {/* Đường nối, phần đã mở tô dần sang tím */}
      <div className="relative mt-10 h-2 w-16 overflow-hidden rounded-pill border-2 border-line bg-surface md:mt-12 md:w-32">
        <motion.span
          className="absolute inset-y-0 left-0 bg-primary"
          initial={{ width: '0%' }}
          animate={{ width: broken ? '100%' : '0%' }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
        />
      </div>

      <div className="relative">
        <Station label={toLabel} className={cx('transition-colors duration-300', broken ? 'anim-beacon border-line bg-primary' : 'border-line/40 bg-surface')}>
          <AnimatePresence>
            {broken && (
              <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 420, damping: 14 }}>
                <Icon icon={Play} size={36} color="white" />
              </motion.span>
            )}
          </AnimatePresence>
          {/* Ổ khóa: nguyên vẹn rồi vỡ làm đôi */}
          {!broken ? (
            <span className="anim-wobble absolute grid size-14 place-items-center rounded-[16px] border-thick border-line bg-gold shadow-hard-sm">
              <Icon icon={LockSimple} size={30} />
            </span>
          ) : (
            !reduceMotion &&
            HALVES.map((h) => (
              <motion.span
                key={h.clip}
                className="pointer-events-none absolute grid size-14 place-items-center rounded-[16px] border-thick border-line bg-gold"
                style={{ clipPath: h.clip }}
                initial={{ x: 0, y: 0, rotate: 0, opacity: 1 }}
                animate={{ x: h.x, y: [0, -34, 40], rotate: h.rotate, opacity: [1, 1, 0] }}
                transition={{ duration: 0.8, ease: 'easeOut' }}
              >
                <Icon icon={LockSimple} size={30} />
              </motion.span>
            ))
          )}
        </Station>
        {broken &&
          [
            'left-[-14px] top-[-10px]',
            'right-[-16px] top-2',
            'right-[-4px] top-[64px]',
          ].map((pos, i) => (
            <span key={pos} className={cx('anim-sparkle absolute', pos)} style={{ animationDelay: `${i * 0.35}s` }}>
              <Icon icon={Sparkle} size={22} color="gold" />
            </span>
          ))}
      </div>
    </div>
  )
}
