/*
 * Linh vật trong trận (animation Lottie).
 *
 * Hiện dựng bằng MascotBlob + Framer Motion cho tới khi có linh vật vẽ tay / Lottie.
 * `pose` (đổi `poseKey` để phát lại): "idle" (thở nhẹ) · "recoil" (giật lùi khi bắn) · "hit" (nháy trắng, bị đẩy lùi)
 * · "stumble" (vấp nhẹ khi tự trúng đòn) · "scratch" (gãi đầu khi hòa lượt) · "ko" (ngã, sao quay trên đầu).
 * `facing`: "right" (phe người chơi) hoặc "left" (phe đối thủ); hướng đẩy lùi ngược với hướng nhìn.
 * `sticker`: chữ bật lên trên đầu (sticker biểu cảm). Linh vật chỉ để trang trí, không có chỉ số.
 */

import { AnimatePresence, motion } from 'framer-motion'
import { QuestionMark, Star } from '@phosphor-icons/react'
import MascotBlob from '../../../components/collection/MascotBlob'
import Icon from '../../../components/ui/Icon'
import cx from '../../../utils/cx'

function poseAnimation(pose, dir) {
  switch (pose) {
    case 'recoil':
      return { animate: { x: [0, -dir * 22, dir * 12, 0], scaleX: [1, 0.92, 1.06, 1] }, transition: { duration: 0.32, ease: 'easeOut' } }
    case 'hit':
      return {
        animate: { x: [0, -dir * 38, -dir * 30, 0], rotate: [0, -dir * 8, 0], filter: ['brightness(1)', 'brightness(0) invert(1)', 'brightness(1)', 'brightness(1)'] },
        transition: { duration: 0.5, times: [0, 0.18, 0.5, 1], ease: 'easeOut' },
      }
    case 'stumble':
      return { animate: { rotate: [0, -16, 10, -4, 0], y: [0, 8, 2, 0], x: [0, -dir * 10, 0] }, transition: { duration: 0.6, ease: 'easeOut' } }
    case 'scratch':
      return { animate: { rotate: [0, -6, 6, -6, 6, 0], y: [0, -4, 0, -4, 0] }, transition: { duration: 0.9, ease: 'easeInOut' } }
    case 'ko':
      return { animate: { rotate: -dir * 75, y: 12, x: -dir * 16 }, transition: { duration: 0.9, ease: [0.2, 0.8, 0.3, 1] } }
    default:
      return { animate: { x: 0, rotate: 0, y: 0, scaleX: 1, filter: 'brightness(1)' }, transition: { duration: 0.2 } }
  }
}

export default function MascotFighter({ mascot, facing = 'right', pose = 'idle', poseKey, sticker, className, sizeClass = 'size-[220px]', innerRef }) {
  const dir = facing === 'right' ? 1 : -1
  const { animate, transition } = poseAnimation(pose, dir)

  return (
    <div className={cx('relative', className)}>
      {/* Sticker biểu cảm trên đầu */}
      <AnimatePresence>
        {sticker && (
          <motion.span
            key={sticker.key}
            initial={{ y: 16, scale: 0.4, opacity: 0 }}
            animate={{ y: 0, scale: 1, opacity: 1 }}
            exit={{ y: -10, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 480, damping: 16 }}
            className="absolute -top-10 left-1/2 z-20 -translate-x-1/2 whitespace-nowrap rounded-[14px] border-thick border-line bg-surface px-3 py-1 font-display text-sm font-bold uppercase shadow-hard-sm md:-top-12 md:text-base"
          >
            {sticker.text}
            <span className="absolute -bottom-2 left-1/2 size-3 -translate-x-1/2 rotate-45 border-b-thick border-r-thick border-line bg-surface" aria-hidden="true" />
          </motion.span>
        )}
      </AnimatePresence>

      {/* Dấu hỏi khi gãi đầu, sao quay khi bị hạ */}
      {pose === 'scratch' && (
        <motion.span key={`q-${poseKey}`} initial={{ scale: 0, y: 10 }} animate={{ scale: 1, y: 0 }} className="absolute -top-4 right-2 z-10 grid size-10 place-items-center rounded-pill border-thick border-line bg-raised">
          <Icon icon={QuestionMark} size={22} />
        </motion.span>
      )}
      {pose === 'ko' && (
        <motion.span className="absolute -top-2 left-1/2 z-10 flex -translate-x-1/2 gap-1" animate={{ rotate: 360 }} transition={{ duration: 1.6, repeat: Infinity, ease: 'linear' }}>
          {[0, 1, 2].map((i) => (
            <Icon key={i} icon={Star} size={20} color="gold" />
          ))}
        </motion.span>
      )}

      <motion.div ref={innerRef} key={poseKey} initial={false} animate={animate} transition={transition} style={{ originY: 1 }}>
        <div className={cx(pose === 'idle' && 'anim-idle')}>
          <MascotBlob color={mascot.color} shape={mascot.shape} traits={mascot.traits} size={220} className={cx(sizeClass, facing === 'left' && '-scale-x-100')} />
        </div>
      </motion.div>
    </div>
  )
}
