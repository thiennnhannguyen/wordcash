/*
 * Hộp thẻ (gói bài) cho màn Quay thẻ.
 *
 * `variant`: "normal" (tím điện), "special" (vàng, lượt đặc biệt), "locked" (xám có ổ khóa, hết lượt).
 * `mode`: "idle" (lơ lửng, thỉnh thoảng giật nhẹ như muốn bật ra) · "charge" (rung mạnh dần 800ms, vết nứt phát sáng hiện dần)
 * · "burst" (hộp bật tung thành mảnh vụn kèm chớp sáng). Khi người dùng bật giảm chuyển động, hộp đứng yên.
 */

import { motion, useReducedMotion } from 'framer-motion'
import { LockSimple } from '@phosphor-icons/react'
import Icon from '../ui/Icon'
import Sticker from '../ui/Sticker'
import { Wordmark } from '../layout/NavBar'
import cx from '../../utils/cx'

const CHARGE_MS = 800

const BODY = {
  normal: 'var(--color-primary)',
  special: 'var(--color-gold)',
  locked: 'var(--color-neutral)',
}

// Vết nứt: đường gấp khúc trên mặt hộp (hệ tọa độ 0–100)
const CRACKS = [
  'M50 8 L44 22 L54 30 L46 44',
  'M8 52 L22 48 L28 58 L40 54',
  'M92 40 L78 46 L82 58 L68 62',
  'M30 92 L36 80 L28 72 L38 64',
  'M72 94 L66 82 L74 74 L64 66',
]

// Mảnh vụn khi hộp bật tung: hướng bay và màu
const SHARDS = Array.from({ length: 10 }, (_, i) => {
  const angle = (i / 10) * Math.PI * 2 + 0.3
  return { x: Math.cos(angle) * 260, y: Math.sin(angle) * 220 - 40, r: (i % 2 ? 1 : -1) * (120 + i * 25), size: 26 + (i % 3) * 14 }
})

function Face({ variant }) {
  const locked = variant === 'locked'
  const special = variant === 'special'
  return (
    <div
      className="relative flex size-full flex-col items-center justify-center overflow-hidden rounded-[26px] border-thick border-line shadow-hard-lg @container"
      style={{
        background: locked
          ? `repeating-linear-gradient(45deg, color-mix(in srgb, var(--color-white) 25%, transparent) 0 10px, transparent 10px 22px), ${BODY.locked}`
          : `repeating-linear-gradient(45deg, color-mix(in srgb, var(--color-white) 16%, transparent) 0 12px, transparent 12px 26px), ${BODY[variant]}`,
      }}
    >
      {/* Dải xé ở nắp hộp */}
      <span className="absolute inset-x-0 top-[15%] border-t-[3px] border-dashed border-line/40" aria-hidden="true" />
      {/* Vệt bóng */}
      {!locked && <span className="absolute -left-6 top-0 h-full w-10 -skew-x-12 bg-white/25" aria-hidden="true" />}

      {locked ? (
        <span className="grid size-20 place-items-center rounded-pill border-thick border-line bg-surface shadow-hard @[220px]:size-24">
          <Icon icon={LockSimple} size={44} color="muted" />
        </span>
      ) : (
        <>
          <span
            className={cx(
              'grid size-20 place-items-center rounded-pill border-thick border-line font-heading text-[48px] font-black italic leading-none shadow-hard @[220px]:size-28 @[220px]:text-[64px]',
              special ? 'bg-primary text-white' : 'bg-gold text-ink',
            )}
          >
            W
          </span>
          <span className="mt-4 -rotate-6 rounded-pill border-thick border-line bg-surface px-4 py-1 shadow-hard-sm">
            <Wordmark className="text-lg @[220px]:text-2xl" />
          </span>
        </>
      )}
      {special && (
        <Sticker bg="danger" tilt={8} size="sm" className="absolute right-3 top-[20%]">
          Đặc biệt
        </Sticker>
      )}
    </div>
  )
}

export default function CardPack({ variant = 'normal', mode = 'idle', className }) {
  const reduceMotion = useReducedMotion()
  const still = reduceMotion || variant === 'locked'

  const motionProps =
    mode === 'charge' && !reduceMotion
      ? {
          animate: {
            x: [0, -2, 2, -4, 4, -6, 6, -9, 9, -12, 12, -14, 0],
            rotate: [0, -1, 1, -2, 2, -3, 3, -4, 4, -5, 5, -6, 0],
            scale: [1, 1, 1.01, 1.02, 1.03, 1.04, 1.05, 1.06, 1.07, 1.08, 1.09, 1.1, 1.1],
          },
          transition: { duration: CHARGE_MS / 1000, ease: 'linear' },
        }
      : mode === 'burst'
        ? { animate: { scale: 1.25, opacity: 0 }, transition: { duration: 0.18, ease: 'easeOut' } }
        : still
          ? { animate: { y: 0, rotate: 0, x: 0, scale: 1 } }
          : {
              animate: { y: [0, -12, 0], rotate: [0, 0, 0, -3, 3, -2, 0] },
              transition: { y: { duration: 3, repeat: Infinity, ease: 'easeInOut' }, rotate: { duration: 2.6, repeat: Infinity, times: [0, 0.6, 0.7, 0.76, 0.82, 0.88, 1] } },
            }

  return (
    <div className={cx('relative aspect-[3/4]', className)}>
      {/* Bóng dưới hộp */}
      {mode !== 'burst' && <span className="absolute -bottom-8 left-1/2 h-4 w-3/4 -translate-x-1/2 rounded-[50%] bg-ink/15" aria-hidden="true" />}

      <motion.div className="size-full" {...motionProps}>
        <Face variant={variant} />
        {mode === 'charge' && (
          <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="pointer-events-none absolute inset-0 size-full [filter:drop-shadow(0_0_4px_var(--color-gold))]" aria-hidden="true">
            {CRACKS.map((d, i) =>
              [
                { color: 'var(--color-gold)', width: 3.2 },
                { color: 'var(--color-white)', width: 1.4 },
              ].map((layer) => (
                <motion.path
                  key={`${d}-${layer.width}`}
                  d={d}
                  fill="none"
                  stroke={layer.color}
                  strokeWidth={layer.width}
                  strokeLinejoin="round"
                  strokeLinecap="round"
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ delay: reduceMotion ? 0 : (i * CHARGE_MS) / 6000, duration: 0.25 }}
                />
              )),
            )}
          </svg>
        )}
      </motion.div>

      {mode === 'burst' && !reduceMotion && (
        <div className="pointer-events-none absolute inset-0" aria-hidden="true">
          <motion.span
            className="absolute left-1/2 top-1/2 size-40 -translate-x-1/2 -translate-y-1/2 rounded-pill bg-white"
            initial={{ scale: 0.2, opacity: 1 }}
            animate={{ scale: 4, opacity: 0 }}
            transition={{ duration: 0.45, ease: 'easeOut' }}
          />
          {SHARDS.map((s, i) => (
            <motion.span
              key={i}
              className="absolute left-1/2 top-1/2 rounded-[8px] border-thick border-line"
              style={{ width: s.size, height: s.size * 0.8, background: BODY[variant], marginLeft: -s.size / 2, marginTop: -s.size / 2 }}
              initial={{ x: 0, y: 0, rotate: 0, opacity: 1 }}
              animate={{ x: s.x, y: s.y, rotate: s.r, opacity: 0 }}
              transition={{ duration: 0.6, ease: 'easeOut' }}
            />
          ))}
        </div>
      )}
    </div>
  )
}
