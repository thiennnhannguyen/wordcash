/*
 * Thẻ trong chuỗi mở thẻ: bay lên úp mặt, gợi ý độ hiếm bằng ánh sáng lọt ra từ viền, chạm để lật 3D, rồi công bố.
 *
 * `stage`: "fly" (bay lên, nảy) · "hint" / "await" (úp mặt, viền sáng theo độ hiếm: trắng Thường, xanh trời Hiếm,
 * tím Sử Thi, vàng Huyền Thoại; "await" chờ chạm) · "flip" (lật 180 độ) · "reveal" (hiệu ứng công bố) · "result".
 * Công bố theo độ hiếm: nảy + "MỚI!" · vòng sáng xanh · quầng tím, sao bay, chữ "SỬ THI!" · chữ "HUYỀN THOẠI!!!",
 * ánh kim, linh vật nhảy ra vẫy tay rồi chui lại. Thẻ trùng: dấu "ĐÃ CÓ", thẻ vỡ thành mảnh ghép bay vào ô đếm mảnh.
 * `compact` (khi mở nhiều thẻ) chỉ giữ ánh sáng gợi ý và dấu "ĐÃ CÓ". Hiệu ứng nền toàn màn và pháo giấy do trang lo.
 */

import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { PuzzlePiece, Star } from '@phosphor-icons/react'
import CardBack from '../../../components/collection/CardBack'
import MascotBlob from '../../../components/collection/MascotBlob'
import MascotCard from '../../../components/collection/MascotCard'
import Icon from '../../../components/ui/Icon'
import Sticker from '../../../components/ui/Sticker'
import cx from '../../../utils/cx'
import MascotArt from '../MascotArt'

export const HINT_COLOR = { common: 'white', rare: 'sky', epic: 'primary', legendary: 'gold' }

const STROKE = '[-webkit-text-stroke:var(--stroke)_var(--color-ink)] [paint-order:stroke_fill]'

// Tia sáng viền mực xoay sau thẻ, màu theo độ hiếm (tia trắng vẫn thấy được trên nền kem)
function HintLight({ color, fast, small = false }) {
  const reduceMotion = useReducedMotion()
  return (
    <motion.svg
      viewBox="-100 -100 200 200"
      className={cx('pointer-events-none absolute left-1/2 top-1/2 -z-10 -translate-x-1/2 -translate-y-1/2', small ? 'size-[150%]' : 'size-[210%]')}
      initial={{ scale: 0.3, opacity: 0 }}
      animate={reduceMotion ? { scale: 1, opacity: 1 } : { scale: 1, opacity: 1, rotate: fast ? 540 : 60 }}
      transition={{ scale: { duration: 0.35 }, opacity: { duration: 0.35 }, rotate: { duration: fast ? 1.5 : 4, ease: fast ? 'easeIn' : 'linear' } }}
      aria-hidden="true"
    >
      {Array.from({ length: 12 }, (_, i) => (
        <path key={i} d="M0 0 L-8 -96 L8 -96 Z" transform={`rotate(${i * 30})`} fill={`var(--color-${color})`} stroke="var(--color-ink)" strokeWidth="1.5" strokeLinejoin="round" />
      ))}
    </motion.svg>
  )
}

function Ring() {
  return (
    <motion.span
      className="pointer-events-none absolute left-1/2 top-1/2 -z-10 aspect-square w-[150%] -translate-x-1/2 -translate-y-1/2 rounded-pill border-[6px] border-sky"
      initial={{ scale: 0.5, opacity: 1 }}
      animate={{ scale: 1.6, opacity: 0 }}
      transition={{ duration: 0.9, ease: 'easeOut' }}
      aria-hidden="true"
    />
  )
}

function StarBurst() {
  return (
    <div className="pointer-events-none absolute left-1/2 top-1/2 z-20" aria-hidden="true">
      {Array.from({ length: 14 }, (_, i) => {
        const a = (i / 14) * Math.PI * 2
        const d = 190 + (i % 3) * 50
        return (
          <motion.span
            key={i}
            className="absolute -ml-3 -mt-3"
            initial={{ x: 0, y: 0, scale: 0.4, opacity: 1, rotate: 0 }}
            animate={{ x: Math.cos(a) * d, y: Math.sin(a) * d, scale: 1.1, opacity: 0, rotate: 200 }}
            transition={{ duration: 1.1, ease: 'easeOut', delay: (i % 4) * 0.05 }}
          >
            <Icon icon={Star} size={24 + (i % 3) * 6} color={i % 2 ? 'gold' : 'white'} />
          </motion.span>
        )
      })}
    </div>
  )
}

export function BigShout({ text, color, size = 'lg' }) {
  return (
    <motion.p
      className={cx(
        'pointer-events-none absolute left-1/2 z-30 -translate-x-1/2 whitespace-nowrap font-display font-bold uppercase italic leading-none',
        STROKE,
        size === 'xl' ? '-top-24 text-[44px] md:-top-32 md:text-[88px]' : '-top-20 text-[44px] md:-top-24 md:text-[64px]',
      )}
      style={{ '--stroke': size === 'xl' ? '9px' : '7px', color: `var(--color-${color})`, textShadow: '5px 5px 0 var(--color-ink)' }}
      initial={{ scale: 2.4, opacity: 0, rotate: -8 }}
      animate={{ scale: 1, opacity: 1, rotate: -6 }}
      transition={{ type: 'spring', stiffness: 420, damping: 13, delay: 0.1 }}
    >
      {text}
    </motion.p>
  )
}

// Mảnh ghép bay từ thẻ vào ô đếm mảnh (tọa độ màn hình)
function ShardFlight({ from, to }) {
  return (
    <div className="pointer-events-none fixed inset-0 z-50" aria-hidden="true">
      {Array.from({ length: 8 }, (_, i) => {
        const a = (i / 8) * Math.PI * 2
        const spread = { x: Math.cos(a) * 90, y: Math.sin(a) * 110 }
        return (
          <motion.span
            key={i}
            className="absolute grid size-9 place-items-center rounded-[10px] border-2 border-line bg-gold shadow-hard-sm"
            style={{ left: from.x - 18, top: from.y - 18 }}
            initial={{ x: 0, y: 0, scale: 0.6, rotate: 0 }}
            animate={{ x: [0, spread.x, to.x - from.x], y: [0, spread.y, to.y - from.y], scale: [0.6, 1.1, 0.4], rotate: [0, 90, 200] }}
            transition={{ duration: 0.75, times: [0, 0.35, 1], ease: 'easeInOut', delay: i * 0.03 }}
          >
            <Icon icon={PuzzlePiece} size={18} color="ink" />
          </motion.span>
        )
      })}
    </div>
  )
}

export default function RevealCard({ mascot, result, stage, onFlip, onSelect, selected = false, compact = false, shardTarget, onShardsLanded, className, featured = false, cardRef: outerRef }) {
  const reduceMotion = useReducedMotion()
  const cardRef = useRef(null)
  const [dupeStep, setDupeStep] = useState(0) // 0 chưa, 1 dấu ĐÃ CÓ, 2 vỡ, 3 đã bay vào
  const [flight, setFlight] = useState(null)
  const [mascotOut, setMascotOut] = useState(false)
  const faceUp = stage === 'flip' || stage === 'reveal' || stage === 'result'
  const hint = stage === 'hint' || stage === 'await'
  const legendary = result.rarity === 'legendary'
  const revealing = stage === 'reveal' && !compact

  // Thẻ trùng: đóng dấu, vỡ ra, mảnh bay vào ô đếm
  useEffect(() => {
    if (!revealing || !result.duplicate) return undefined
    setDupeStep(1)
    const timers = [
      setTimeout(() => {
        const a = cardRef.current?.getBoundingClientRect()
        const b = shardTarget?.current?.getBoundingClientRect()
        if (a && b) setFlight({ from: { x: a.left + a.width / 2, y: a.top + a.height / 2 }, to: { x: b.left + b.width / 2, y: b.top + b.height / 2 } })
        setDupeStep(2)
      }, 750),
      setTimeout(() => {
        setDupeStep(3)
        onShardsLanded?.()
      }, 1550),
    ]
    return () => timers.forEach(clearTimeout)
  }, [revealing, result.duplicate, shardTarget, onShardsLanded])

  // Huyền Thoại: linh vật nhảy ra khỏi thẻ, vẫy tay, rồi chui lại
  useEffect(() => {
    if (!revealing || !legendary || result.duplicate || reduceMotion) return undefined
    const t1 = setTimeout(() => setMascotOut(true), 500)
    const t2 = setTimeout(() => setMascotOut(false), 2500)
    return () => {
      clearTimeout(t1)
      clearTimeout(t2)
    }
  }, [revealing, legendary, result.duplicate, reduceMotion])

  const shattered = revealing && result.duplicate && dupeStep >= 2
  const showStamp = result.duplicate && (stage === 'result' || (stage === 'reveal' && (compact || dupeStep === 1)))

  return (
    <div className={cx('relative isolate', className)}>
      {hint && <HintLight color={HINT_COLOR[result.rarity]} fast={legendary && stage === 'hint'} />}
      {revealing && !result.duplicate && result.rarity !== 'common' && result.rarity !== 'rare' && <HintLight color={HINT_COLOR[result.rarity]} />}
      {revealing && !result.duplicate && result.rarity === 'rare' && <Ring />}
      {revealing && !result.duplicate && result.rarity === 'epic' && <StarBurst />}
      {revealing && !result.duplicate && result.rarity === 'epic' && <BigShout text="Sử Thi!" color="primary" />}
      {revealing && !result.duplicate && legendary && <BigShout text="Huyền Thoại!!!" color="gold" size="xl" />}
      {featured && stage === 'result' && result.rarity !== 'common' && result.rarity !== 'rare' && !result.duplicate && <HintLight color={HINT_COLOR[result.rarity]} small />}

      <motion.div
        ref={cardRef}
        initial={stage === 'fly' && !reduceMotion ? { y: 220, scale: 0.3, rotate: -12, opacity: 0 } : false}
        animate={
          shattered
            ? { scale: 0.2, opacity: 0, rotate: 20 }
            : stage === 'await' && !reduceMotion
              ? { y: [0, -8, 0], scale: [1, 1.03, 1], rotate: 0, opacity: 1 }
              : revealing && !reduceMotion
                ? { y: 0, scale: [1, 1.14, 0.96, 1], rotate: 0, opacity: 1 }
                : { y: 0, scale: 1, rotate: 0, opacity: 1 }
        }
        transition={
          shattered
            ? { duration: 0.25 }
            : stage === 'await'
              ? { duration: 1.4, repeat: Infinity, ease: 'easeInOut' }
              : stage === 'fly'
                ? { type: 'spring', stiffness: 380, damping: 14, mass: 0.8 }
                : { duration: 0.5, ease: 'easeOut' }
        }
        style={{ perspective: 1000 }}
      >
        <motion.button
          type="button"
          disabled={stage !== 'await' && !onSelect}
          onClick={stage === 'await' ? onFlip : onSelect}
          aria-label={stage === 'await' ? 'Chạm để lật thẻ' : `${mascot.name}`}
          aria-pressed={onSelect ? selected : undefined}
          className={cx(
            'relative block w-full rounded-[22px] text-left',
            (stage === 'await' || onSelect) && 'cursor-pointer',
            selected && 'outline-4 outline-offset-4 outline-primary',
          )}
          initial={false}
          animate={{ rotateY: faceUp ? 0 : 180 }}
          transition={reduceMotion ? { duration: 0 } : { duration: 0.5, ease: [0.3, 0.7, 0.3, 1] }}
          style={{ transformStyle: 'preserve-3d' }}
        >
          <div ref={outerRef} className="[backface-visibility:hidden]">
            <MascotCard
              rarity={result.rarity}
              name={mascot.name}
              number={mascot.number}
              holo={legendary && faceUp}
              art={mascotOut ? <span /> : <MascotArt mascot={mascot} />}
            />
          </div>
          <CardBack asBack glow={hint ? HINT_COLOR[result.rarity] : undefined} />
        </motion.button>

        {/* Linh vật nhảy ra khỏi thẻ và vẫy tay */}
        <AnimatePresence>
          {mascotOut && (
            <motion.div
              className="pointer-events-none absolute inset-x-0 top-[10%] z-30 flex justify-center"
              initial={{ y: 30, scale: 0.6, opacity: 0 }}
              animate={{ y: [30, -150, -130, -130], scale: [0.6, 1.4, 1.3, 1.3], opacity: 1, rotate: [0, 0, -12, 12, -12, 12, 0] }}
              exit={{ y: 30, scale: 0.5, opacity: 0, transition: { duration: 0.35, ease: 'easeIn' } }}
              transition={{ duration: 1.8, times: [0, 0.3, 0.45, 1], rotate: { duration: 1.6, delay: 0.5 } }}
            >
              <MascotBlob color={mascot.color} shape={mascot.shape} traits={{ ...mascot.traits, eyes: 'happy' }} size={130} className="size-28 md:size-36" />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Nhãn MỚI! */}
      {!result.duplicate && (stage === 'reveal' || stage === 'result') && !compact && (
        <motion.span
          className="absolute -left-5 -top-5 z-30"
          initial={{ scale: 0, rotate: -30 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: 'spring', stiffness: 500, damping: 12, delay: 0.25 }}
        >
          <Sticker bg="danger" tilt={-10} size={featured ? 'lg' : 'md'}>
            Mới!
          </Sticker>
        </motion.span>
      )}

      {/* Dấu ĐÃ CÓ */}
      {showStamp && (
        <motion.span
          className="absolute left-1/2 top-[38%] z-30 -translate-x-1/2 whitespace-nowrap rounded-[12px] border-[3px] border-danger-deep bg-surface px-3 font-display text-xl font-bold uppercase leading-9 text-danger-deep shadow-hard md:text-2xl md:leading-10"
          initial={{ scale: 2.2, opacity: 0, rotate: -14 }}
          animate={{ scale: 1, opacity: 1, rotate: -14 }}
          transition={{ type: 'spring', stiffness: 520, damping: 18 }}
        >
          Đã có
        </motion.span>
      )}

      {/* +N MẢNH */}
      {result.duplicate && dupeStep === 3 && revealing && (
        <motion.p
          className={cx('absolute left-1/2 top-1/2 z-30 -translate-x-1/2 -translate-y-1/2 whitespace-nowrap font-display text-[44px] font-bold uppercase italic leading-none text-gold', STROKE)}
          style={{ '--stroke': '7px', textShadow: '4px 4px 0 var(--color-ink)' }}
          initial={{ scale: 0.3, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 460, damping: 14 }}
        >
          +{result.shards} mảnh
        </motion.p>
      )}
      {compact && result.duplicate && stage === 'result' && (
        <span className="absolute -right-2 -top-2 z-30 rounded-pill border-2 border-line bg-gold px-2 font-num text-[13px] leading-6 shadow-hard-sm">+{result.shards}</span>
      )}

      {flight && dupeStep === 2 && <ShardFlight from={flight.from} to={flight.to} />}
    </div>
  )
}
