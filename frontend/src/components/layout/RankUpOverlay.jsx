/*
 * Màn ăn mừng LÊN RANK (toàn màn hình), hiện ngay khi vừa thuộc từ đạt mốc (server gửi sự kiện lên rank).
 *
 * (a) Màn tối dần, huy hiệu rank cũ hiện giữa màn → (b) huy hiệu cũ rung, nứt rồi vỡ tung thành mảnh
 * → (c) huy hiệu mới xuất hiện từ luồng sáng, phóng to rồi nảy, tia sáng xoay quanh → (d) pháo giấy màu kẹo và chữ "LÊN RANK!"
 * → (e) "1.000 TỪ ĐÃ THUỘC", linh vật đại diện nhảy mừng bên cạnh → (f) card "+1 LƯỢT QUAY ĐẶC BIỆT" vàng phát sáng và các nút.
 * Biến thể Huyền Thoại: nền cầu vồng chuyển động, pháo hoa, huy hiệu viền cầu vồng.
 * Có nút "Bỏ qua"; khi người dùng bật giảm chuyển động thì hiện thẳng khung cuối.
 * `hold` ("a"…"f") dừng ở một khung để xem thử.
 */

import { useEffect, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import confetti from 'canvas-confetti'
import { Certificate, FastForward, Gift, House, SpinnerBall } from '@phosphor-icons/react'
import Button from '../ui/Button'
import Icon from '../ui/Icon'
import RankEmblem from '../ui/RankEmblem'
import MascotBlob from '../collection/MascotBlob'
import cx from '../../utils/cx'
import { RANK_BY_KEY } from '../../utils/constants'
import { formatNumber } from '../../utils/format'

// Mốc thời gian của từng khung (ms)
const STEPS = [
  { key: 'a', at: 300 }, // huy hiệu cũ
  { key: 'b', at: 1000 }, // rung, nứt, vỡ
  { key: 'c', at: 2100 }, // huy hiệu mới từ luồng sáng
  { key: 'd', at: 2800 }, // pháo giấy + LÊN RANK!
  { key: 'e', at: 3400 }, // số từ + linh vật
  { key: 'f', at: 4000 }, // phần thưởng + nút
]

const STROKE = '[-webkit-text-stroke:var(--stroke)_var(--color-ink)] [paint-order:stroke_fill]'

// Mảnh vỡ: mỗi mảnh là một nêm của huy hiệu cũ bay ra ngoài
const PIECES = Array.from({ length: 8 }, (_, i) => {
  const a0 = (i / 8) * 360
  const a1 = ((i + 1) / 8) * 360
  const pt = (deg) => `${50 + 75 * Math.cos((deg * Math.PI) / 180)}% ${50 + 75 * Math.sin((deg * Math.PI) / 180)}%`
  const mid = (((a0 + a1) / 2) * Math.PI) / 180
  return { clip: `polygon(50% 50%, ${pt(a0)}, ${pt(a1)})`, x: Math.cos(mid) * 320, y: Math.sin(mid) * 280, r: (i % 2 ? 1 : -1) * (90 + i * 20) }
})

function colors() {
  const style = getComputedStyle(document.documentElement)
  return ['gold', 'accent', 'danger', 'sky', 'primary', 'orange', 'white'].map((n) => style.getPropertyValue(`--color-${n}`).trim())
}

function Rays({ legend }) {
  const reduceMotion = useReducedMotion()
  return (
    <motion.svg
      viewBox="-100 -100 200 200"
      className="pointer-events-none absolute left-1/2 top-1/2 -z-10 size-[260%] -translate-x-1/2 -translate-y-1/2"
      initial={{ scale: 0.2, opacity: 0 }}
      animate={reduceMotion ? { scale: 1, opacity: 1 } : { scale: 1, opacity: 1, rotate: 360 }}
      transition={{ scale: { duration: 0.5 }, opacity: { duration: 0.5 }, rotate: { duration: 22, repeat: Infinity, ease: 'linear' } }}
      aria-hidden="true"
    >
      {Array.from({ length: 16 }, (_, i) => (
        <path key={i} d="M0 0 L-9 -100 L9 -100 Z" transform={`rotate(${i * 22.5})`} fill={legend ? 'var(--color-white)' : 'var(--color-gold)'} opacity={legend ? 0.35 : 0.3} />
      ))}
    </motion.svg>
  )
}

export default function RankUpOverlay({ from, to, words, mascot, onCertificate, onSpin, onLobby, hold }) {
  const reduceMotion = useReducedMotion()
  const legend = to === 'huyen_thoai'
  const [step, setStep] = useState(reduceMotion ? STEPS.length : 0)
  const reached = (key) => step > STEPS.findIndex((s) => s.key === key)
  const newRank = RANK_BY_KEY[to]

  // Chạy lần lượt các khung, dừng ở `hold` nếu có
  useEffect(() => {
    if (reduceMotion) return undefined
    const stop = hold ? STEPS.findIndex((s) => s.key === hold) + 1 : STEPS.length
    const timers = STEPS.slice(0, stop).map((s, i) => setTimeout(() => setStep(i + 1), s.at))
    return () => timers.forEach(clearTimeout)
  }, [hold, reduceMotion])

  // Pháo giấy (Huyền Thoại: pháo hoa nổ khắp màn trong 2,5 giây)
  const shouting = reached('d')
  useEffect(() => {
    if (!shouting || reduceMotion) return undefined
    const c = colors()
    confetti({ particleCount: 140, spread: 110, startVelocity: 55, origin: { y: 0.45 }, colors: c, zIndex: 80 })
    if (!legend) {
      const t = setTimeout(() => {
        confetti({ particleCount: 70, angle: 60, spread: 70, origin: { x: 0, y: 0.6 }, colors: c, zIndex: 80 })
        confetti({ particleCount: 70, angle: 120, spread: 70, origin: { x: 1, y: 0.6 }, colors: c, zIndex: 80 })
      }, 350)
      return () => clearTimeout(t)
    }
    const end = Date.now() + 2500
    const id = setInterval(() => {
      if (Date.now() > end) return clearInterval(id)
      confetti({ particleCount: 60, spread: 360, startVelocity: 28, ticks: 70, gravity: 0.6, origin: { x: 0.15 + Math.random() * 0.7, y: 0.15 + Math.random() * 0.4 }, colors: c, zIndex: 80, shapes: ['circle'] })
      return undefined
    }, 320)
    return () => clearInterval(id)
  }, [shouting, reduceMotion, legend])

  // Khung (b): rung 600ms rồi mới vỡ
  const [broken, setBroken] = useState(false)
  useEffect(() => {
    if (step < 2 || hold === 'b') return undefined
    const t = setTimeout(() => setBroken(true), 600)
    return () => clearTimeout(t)
  }, [step, hold])

  const skip = () => setStep(STEPS.length)
  const shaking = step === 2 && !broken && !reduceMotion
  const shattered = step >= 2 && (broken || step >= 3)

  return (
    <div className="fixed inset-0 z-[70] flex flex-col overflow-hidden text-white" role="dialog" aria-modal="true" aria-label={`Lên rank ${newRank.name}`}>
      {/* Nền tối dần; Huyền Thoại chuyển cầu vồng */}
      <motion.div className="absolute inset-0 bg-ink" initial={{ opacity: 0 }} animate={{ opacity: 0.94 }} transition={{ duration: 0.5 }} aria-hidden="true" />
      {legend && reached('c') && <motion.div className="anim-rainbow absolute inset-0" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.8 }} aria-hidden="true" />}

      {step < STEPS.length && (
        <button
          type="button"
          onClick={skip}
          className="absolute right-4 top-[calc(1rem+env(safe-area-inset-top))] z-20 inline-flex h-11 items-center gap-1.5 rounded-pill border-2 border-line bg-surface px-3.5 font-display text-[13px] font-bold uppercase tracking-wide text-ink shadow-hard-sm"
        >
          <Icon icon={FastForward} size={16} /> Bỏ qua
        </button>
      )}

      <div className="relative flex flex-1 flex-col items-center justify-center gap-5 px-4 pb-[calc(200px+env(safe-area-inset-bottom))] pt-16 md:gap-6 md:pb-10">
        {/* Chữ LÊN RANK! */}
        <div className="h-[64px] md:h-[110px]">
          <AnimatePresence>
            {shouting && (
              <motion.p
                className={cx('whitespace-nowrap font-display text-[64px] font-bold uppercase italic leading-none md:text-[120px]', STROKE, legend ? 'text-white' : 'text-gold')}
                style={{ '--stroke': '10px', textShadow: '8px 8px 0 var(--color-ink)' }}
                initial={reduceMotion ? false : { scale: 2.6, opacity: 0, rotate: -10 }}
                animate={{ scale: 1, opacity: 1, rotate: -5 }}
                transition={{ type: 'spring', stiffness: 380, damping: 12 }}
              >
                Lên rank!
              </motion.p>
            )}
          </AnimatePresence>
        </div>

        {/* Huy hiệu */}
        <div className="relative isolate grid size-44 place-items-center md:size-60">
          {/* Huy hiệu cũ: hiện → rung, nứt → vỡ */}
          {!shattered && reached('a') && (
            <motion.div
              className="absolute inset-0"
              initial={{ scale: 0.4, opacity: 0 }}
              animate={shaking ? { x: [0, -4, 4, -8, 8, -12, 12, -14, 0], rotate: [0, -2, 2, -4, 4, -6, 6, -8, 0], scale: 1, opacity: 1 } : { scale: 1, opacity: 1 }}
              transition={shaking ? { duration: 0.6, ease: 'linear', repeat: hold === 'b' ? Infinity : 0 } : { type: 'spring', stiffness: 300, damping: 18 }}
            >
              <RankEmblem rank={from} state={step >= 2 ? 'shaky' : 'done'} className="size-full" />
            </motion.div>
          )}
          {shattered && !reduceMotion && step < 5 && (
            <div className="pointer-events-none absolute inset-0" aria-hidden="true">
              {PIECES.map((p, i) => (
                <motion.div
                  key={i}
                  className="absolute inset-0"
                  style={{ clipPath: p.clip }}
                  initial={{ x: 0, y: 0, rotate: 0, opacity: 1 }}
                  animate={{ x: p.x, y: p.y, rotate: p.r, opacity: 0 }}
                  transition={{ duration: 0.7, ease: 'easeOut' }}
                >
                  <RankEmblem rank={from} state="done" className="size-full" />
                </motion.div>
              ))}
            </div>
          )}

          {/* Luồng sáng dọc */}
          {reached('c') && !reduceMotion && (
            <motion.span
              className="pointer-events-none absolute left-1/2 top-1/2 -z-10 h-[140vh] w-40 -translate-x-1/2 -translate-y-1/2 bg-[linear-gradient(90deg,transparent,color-mix(in_srgb,var(--color-white)_85%,transparent),transparent)]"
              initial={{ scaleY: 0, opacity: 1 }}
              animate={{ scaleY: [0, 1, 1], opacity: [1, 1, 0] }}
              transition={{ duration: 0.9, times: [0, 0.35, 1] }}
              aria-hidden="true"
            />
          )}

          {/* Huy hiệu mới */}
          {reached('c') && (
            <>
              <Rays legend={legend} />
              <motion.div
                className={cx('absolute inset-0 grid place-items-center', legend && 'rounded-pill p-3')}
                initial={reduceMotion ? false : { scale: 0, y: 60, opacity: 0 }}
                animate={{ scale: [0, 1.45, 0.9, 1.06, 1], y: 0, opacity: 1 }}
                transition={{ duration: 0.8, times: [0, 0.4, 0.62, 0.82, 1], delay: 0.2 }}
              >
                {legend && <span className="absolute inset-0 rounded-pill border-thick border-line bg-legend shadow-hard-lg" aria-hidden="true" />}
                <span className={cx('relative', legend ? 'size-[82%]' : 'size-full')}>
                  <RankEmblem rank={to} state="current" className="size-full" />
                </span>
              </motion.div>
            </>
          )}

          {/* Linh vật nhảy mừng bên cạnh */}
          {reached('e') && (
            <motion.div
              className="absolute -bottom-4 -right-16 md:-right-36"
              initial={reduceMotion ? false : { x: 60, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 260, damping: 18 }}
            >
              <motion.div
                animate={reduceMotion ? undefined : { y: [0, -30, 0, -12, 0], rotate: [0, -8, 0, 6, 0] }}
                transition={{ duration: 1.1, repeat: Infinity, repeatDelay: 0.3, ease: 'easeOut' }}
                style={{ originY: 1 }}
              >
                <MascotBlob color={mascot.color} shape={mascot.shape} traits={{ ...mascot.traits, eyes: 'happy' }} size={120} className="size-24 md:size-32" />
              </motion.div>
            </motion.div>
          )}
        </div>

        {/* Tên rank + số từ */}
        <div className="flex min-h-[92px] flex-col items-center gap-1 text-center md:min-h-[108px]">
          {reached('c') && (
            <motion.p
              className={cx('font-display text-[32px] font-bold uppercase leading-none tracking-wider md:text-[44px]', STROKE)}
              style={{ '--stroke': '6px', color: legend ? 'var(--color-white)' : newRank.color }}
              initial={reduceMotion ? false : { y: 10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.5 }}
            >
              {newRank.name}
            </motion.p>
          )}
          {reached('e') && (
            <motion.p
              className="mt-2 rounded-pill border-thick border-line bg-accent px-5 py-1 font-display text-xl font-bold uppercase text-ink shadow-hard md:text-2xl"
              initial={reduceMotion ? false : { scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 420, damping: 16 }}
            >
              <span className="font-num">{formatNumber(words)}</span> từ đã thuộc
            </motion.p>
          )}
        </div>

        {/* Phần thưởng */}
        <div className="min-h-[88px]">
          {reached('f') && (
            <motion.div
              className="anim-glow flex items-center gap-3 rounded-card border-thick border-line bg-gold px-5 py-3 text-ink shadow-glow-legendary"
              initial={reduceMotion ? false : { y: 40, scale: 0.6, opacity: 0, rotate: -6 }}
              animate={{ y: 0, scale: 1, opacity: 1, rotate: -2 }}
              transition={{ type: 'spring', stiffness: 380, damping: 14 }}
            >
              <span className="grid size-12 place-items-center rounded-pill border-thick border-line bg-surface">
                <Icon icon={Gift} size={28} color="ink" />
              </span>
              <span className="flex flex-col">
                <span className="font-num text-[28px] leading-none">+1</span>
                <span className="font-display text-sm font-bold uppercase tracking-wide">Lượt quay đặc biệt</span>
              </span>
            </motion.div>
          )}
        </div>

        {/* Nút: dính đáy trên mobile */}
        {reached('f') && (
          <motion.div
            className="fixed inset-x-0 bottom-0 z-10 flex flex-col gap-2 border-t-thick border-line bg-surface px-4 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-3 md:static md:flex-row md:items-center md:justify-center md:gap-3 md:border-0 md:bg-transparent md:p-0"
            initial={reduceMotion ? false : { y: 30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.35 }}
          >
            <Button size="lg" variant="gold" icon={Certificate} onClick={onCertificate} className="md:order-first md:px-8">
              Nhận thẻ chứng nhận
            </Button>
            <div className="grid grid-cols-2 gap-2 md:contents">
              <Button variant="primary" icon={SpinnerBall} onClick={onSpin} className="whitespace-nowrap px-3 md:h-16 md:px-6">
                Quay ngay
              </Button>
              <Button variant="secondary" icon={House} onClick={onLobby} className="whitespace-nowrap px-3 md:h-16 md:px-6">
                Về Sảnh
              </Button>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  )
}
