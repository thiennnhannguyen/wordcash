/*
 * Phần đầu màn kết quả trận (40% chiều cao desktop, 30% mobile).
 *
 * THẮNG: nền tím điện, tia sáng xoay chậm phía sau, chữ "CHIẾN THẮNG!" vàng viền đen, dải băng ghi câu K.O.,
 * linh vật nhảy ăn mừng trên bục số 1 kèm pháo giấy.
 * THUA: nền cam nhạt pha xám, chữ "THẤT BẠI" hồng, linh vật ngồi bệt với đám mây mưa nhỏ trên đầu
 * (dễ thương, không bi kịch) và dòng động viên. Không dùng blur.
 */

import { useEffect } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import confetti from 'canvas-confetti'
import MascotBlob from '../../../components/collection/MascotBlob'
import cx from '../../../utils/cx'

const STROKE = '[-webkit-text-stroke:var(--stroke)_var(--color-ink)] [paint-order:stroke_fill]'

function tokenColors(names) {
  const style = getComputedStyle(document.documentElement)
  return names.map((n) => style.getPropertyValue(`--color-${n}`).trim()).filter(Boolean)
}

// Tia sáng: 12 tam giác trắng mờ xoay quanh tâm
function Rays() {
  const reduceMotion = useReducedMotion()
  return (
    <motion.svg
      viewBox="-100 -100 200 200"
      className="pointer-events-none absolute left-1/2 top-1/2 size-[160vmax] -translate-x-1/2 -translate-y-1/2"
      animate={reduceMotion ? undefined : { rotate: 360 }}
      transition={{ duration: 60, repeat: Infinity, ease: 'linear' }}
      aria-hidden="true"
    >
      {Array.from({ length: 12 }, (_, i) => (
        <path key={i} d="M0 0 L-9 -100 L9 -100 Z" transform={`rotate(${i * 30})`} fill="var(--color-white)" opacity="0.1" />
      ))}
    </motion.svg>
  )
}

function Ribbon({ children }) {
  return (
    <div className="relative mx-auto flex w-fit items-center">
      <span className="absolute -left-6 top-2 h-full w-10 bg-[color-mix(in_srgb,var(--color-danger)_70%,var(--color-ink))] [clip-path:polygon(0_0,100%_0,100%_100%,0_100%,30%_50%)]" aria-hidden="true" />
      <span className="absolute -right-6 top-2 h-full w-10 bg-[color-mix(in_srgb,var(--color-danger)_70%,var(--color-ink))] [clip-path:polygon(0_0,100%_0,70%_50%,100%_100%,0_100%)]" aria-hidden="true" />
      <span className="relative border-thick border-line bg-danger px-4 py-1 font-display text-xs font-bold uppercase tracking-wider text-ink shadow-hard-sm md:px-6 md:text-base">{children}</span>
    </div>
  )
}

function Podium({ mascot }) {
  const reduceMotion = useReducedMotion()
  return (
    <div className="flex flex-col items-center">
      <motion.div
        animate={reduceMotion ? undefined : { y: [0, -34, 0, -12, 0], rotate: [0, -6, 0, 5, 0], scaleY: [1, 1.05, 0.92, 1.02, 1] }}
        transition={{ duration: 1.2, repeat: Infinity, repeatDelay: 0.4, ease: 'easeOut' }}
        style={{ originY: 1 }}
      >
        <MascotBlob color={mascot.color} shape={mascot.shape} size={150} shadow={false} className="size-20 md:size-[130px]" />
      </motion.div>
      <div className="-mt-1 grid h-10 w-28 place-items-center rounded-t-[14px] border-thick border-line bg-gold font-num text-2xl shadow-hard md:h-14 md:w-40 md:text-3xl">1</div>
    </div>
  )
}

function RainCloud({ mascot }) {
  const reduceMotion = useReducedMotion()
  return (
    <div className="relative flex flex-col items-center">
      <motion.div
        className="relative z-10 mb-1"
        animate={reduceMotion ? undefined : { x: [-4, 4, -4] }}
        transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
        aria-hidden="true"
      >
        <svg viewBox="0 0 120 70" className="h-10 w-20 md:h-14 md:w-28">
          <path d="M14 54 a18 18 0 0 1 16 -26 a26 26 0 0 1 48 -4 a20 20 0 0 1 28 30 z" fill="var(--color-neutral)" stroke="var(--color-ink)" strokeWidth="4" strokeLinejoin="round" />
        </svg>
        {[20, 42, 64].map((x, i) => (
          <motion.span
            key={x}
            className="absolute top-full block h-3 w-1.5 rounded-pill bg-sky md:h-4"
            style={{ left: `${x}%` }}
            animate={reduceMotion ? undefined : { y: [0, 22], opacity: [1, 0] }}
            transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.25, ease: 'easeIn' }}
          />
        ))}
      </motion.div>
      {/* Ngồi bệt: dẹt xuống, nghiêng nhẹ */}
      <div style={{ transform: 'scaleY(0.82) rotate(-6deg)', transformOrigin: '50% 100%' }}>
        <MascotBlob color={mascot.color} shape={mascot.shape} size={150} className="size-20 md:size-[130px]" />
      </div>
    </div>
  )
}

export default function ResultHero({ result }) {
  const win = result.outcome === 'win'
  const reduceMotion = useReducedMotion()

  useEffect(() => {
    if (!win || reduceMotion) return undefined
    const colors = tokenColors(['gold', 'accent', 'danger', 'sky', 'orange', 'white'])
    const timers = [
      setTimeout(() => confetti({ particleCount: 110, spread: 100, startVelocity: 50, origin: { x: 0.5, y: 0.25 }, colors }), 300),
      setTimeout(() => confetti({ particleCount: 70, angle: 60, spread: 60, origin: { x: 0, y: 0.35 }, colors }), 700),
      setTimeout(() => confetti({ particleCount: 70, angle: 120, spread: 60, origin: { x: 1, y: 0.35 }, colors }), 900),
    ]
    return () => timers.forEach(clearTimeout)
  }, [win, reduceMotion])

  return (
    <section
      className={cx(
        'relative isolate flex h-[30dvh] min-h-[260px] items-center justify-center overflow-hidden border-b-thick border-line px-4 md:h-[40dvh] md:min-h-[340px]',
        win ? 'bg-primary' : 'bg-[color-mix(in_srgb,var(--color-orange)_35%,var(--color-neutral))]',
      )}
    >
      {win && <Rays />}
      <div className="relative flex w-full max-w-5xl items-center justify-center gap-4 md:gap-12">
        <div className="shrink-0">{win ? <Podium mascot={result.me.mascot} /> : <RainCloud mascot={result.me.mascot} />}</div>
        <div className="flex min-w-0 flex-col items-center gap-3 text-center md:gap-4">
          <motion.h1
            initial={{ scale: 2.2, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 420, damping: 14 }}
            className={cx('font-display font-bold uppercase italic leading-none', STROKE, 'text-[40px] md:text-[96px]', win ? 'text-gold' : 'text-danger')}
            style={{ '--stroke': '7px', textShadow: '6px 6px 0 var(--color-ink)' }}
          >
            {win ? 'Chiến thắng!' : 'Thất bại'}
          </motion.h1>
          {win ? (
            <Ribbon>
              Hạ gục {result.opp.name} ở câu {result.koRound}
            </Ribbon>
          ) : (
            <p className="rounded-card border-thick border-line bg-surface px-3 py-1.5 font-heading text-sm font-extrabold shadow-hard-sm md:rounded-pill md:px-4 md:text-xl">
              Suýt nữa thôi! Chỉ thiếu {result.missingHp} HP.
            </p>
          )}
        </div>
      </div>
    </section>
  )
}
