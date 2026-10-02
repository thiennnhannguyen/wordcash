/*
 * Các khung hình của cảnh chuyển cấp "Bay sang vùng đất mới" (B1 Anh → B2 Mỹ & Canada).
 * - `LochScene`: quái vật Loch Ness vẫy khăn chào, băng "B1 · ĐÃ CHINH PHỤC", con dấu hộ chiếu lớn dập xuống kèm rung.
 * - `AirportScene`: nhà du hành kéo vali chạy vào sân bay, lên máy bay tím; máy bay cất cánh.
 * - `FlightScene`: bản đồ thế giới phẳng màu kem, đường bay nét đứt vẽ dần từ Anh sang Mỹ, máy bay nhỏ để lại vệt mây.
 * - `ArrivalScene`: máy bay hạ cánh, sương tan để lộ Tượng Nữ thần Tự do và đường chân trời New York, chữ chào mừng đập xuống.
 * Mọi hình minh họa phẳng, viền mực, màu lấy từ tokens.css. Không vẽ logo, thương hiệu.
 */

import { useEffect, useState } from 'react'
import { animate, motion } from 'framer-motion'
import { CheckFat } from '@phosphor-icons/react'
import Icon from '../../components/ui/Icon'
import useMediaQuery from '../../hooks/useMediaQuery'
import cx from '../../utils/cx'
import { Plane } from '../Academy/map/BossScene'
import { CONTINENTS, Traveler } from '../Academy/map/MapPieces'
import { Cloud } from '../Academy/map/Props'

const INK = 'var(--color-ink)'
const c = (t) => `var(--color-${t})`
const L = { stroke: INK, strokeWidth: 3, strokeLinejoin: 'round', strokeLinecap: 'round' }
export const STROKE = '[-webkit-text-stroke:var(--stroke)_var(--color-ink)] [paint-order:stroke_fill]'

/** Dải ruy băng vàng có đuôi gập. */
export function Ribbon({ children, fill = 'gold', className }) {
  return (
    <div className={cx('relative inline-flex items-center', className)}>
      <span aria-hidden="true" className="absolute -left-5 top-3 h-full w-10 border-thick border-line" style={{ background: c(fill), clipPath: 'polygon(0 0, 100% 0, 100% 100%, 0 100%, 35% 50%)' }} />
      <span aria-hidden="true" className="absolute -right-5 top-3 h-full w-10 border-thick border-line" style={{ background: c(fill), clipPath: 'polygon(0 0, 100% 0, 65% 50%, 100% 100%, 0 100%)' }} />
      <span className="relative whitespace-nowrap rounded-[6px] border-thick border-line px-5 py-2 font-display text-lg font-bold uppercase tracking-wide text-ink shadow-hard md:px-8 md:text-2xl" style={{ background: c(fill) }}>
        {children}
      </span>
    </div>
  )
}

// Nền bầu trời và núi đồi chung cho các cảnh ngoài trời
function Sky({ children, className }) {
  return <div className={cx('absolute inset-0 overflow-hidden bg-map-water', className)}>{children}</div>
}

// ---------------- (1) Hồ Loch Ness ----------------

function NessieWave({ size }) {
  return (
    <svg viewBox="0 0 170 160" width={size} height={(size * 160) / 170} overflow="visible" aria-hidden="true">
      {/* Bướu lưng */}
      <path d="M104 150 Q118 118 132 150 Z" fill={c('nessie')} {...L} />
      <path d="M136 150 Q146 130 156 150 Z" fill={c('nessie')} {...L} />
      {/* Vây vẫy khăn tay */}
      <g className="anim-wave">
        <path d="M72 108 Q92 84 104 64 Q112 60 112 70 Q104 92 82 118 Z" fill={c('nessie')} {...L} />
        <path d="M104 64 L132 40 L150 62 Q140 70 128 62 Q118 74 112 70 Z" fill={c('white')} {...L} />
        <path d="M118 52 l8 8 M128 46 l8 8" stroke={c('danger')} strokeWidth="3" strokeLinecap="round" />
      </g>
      {/* Cổ và đầu */}
      <path d="M38 150 C32 110 40 70 60 54 C70 46 88 46 96 56 C104 66 96 80 84 80 C70 80 66 92 70 150 Z" fill={c('nessie')} {...L} />
      <path d="M50 144 C48 116 50 92 58 78" fill="none" stroke={c('white')} strokeWidth="5" strokeLinecap="round" opacity="0.45" />
      <circle cx="58" cy="52" r="5" fill={c('nessie')} {...L} />
      <circle cx="72" cy="47" r="5" fill={c('nessie')} {...L} />
      {/* Kính râm đẩy lên trán, mắt cười */}
      <path d="M58 58 H96" stroke={INK} strokeWidth="3" strokeLinecap="round" />
      <path d="M64 56 H78 Q78 50 71 50 Q64 50 64 56 Z M82 56 H96 Q96 50 89 50 Q82 50 82 56 Z" fill={INK} />
      <path d="M68 66 Q72 61 76 66 M84 66 Q88 61 92 66" fill="none" stroke={INK} strokeWidth="3" strokeLinecap="round" />
      <path d="M76 74 Q84 80 92 72" fill="none" stroke={INK} strokeWidth="3" strokeLinecap="round" />
      <ellipse cx="66" cy="74" rx="5" ry="3" fill={c('danger')} opacity="0.5" />
    </svg>
  )
}

function Mountains({ fill = ['map-heather', 'map-rock'] }) {
  return (
    <svg viewBox="0 0 1000 400" preserveAspectRatio="xMidYMax slice" className="absolute inset-x-0 bottom-0 h-[72%] w-full" aria-hidden="true">
      {[[-40, 300, 230], [180, 340, 150], [420, 300, 200], [640, 320, 130], [860, 300, 210]].map(([x, w, top], i) => (
        <g key={x}>
          <path d={`M${x} 300 L${x + w / 2} ${top} L${x + w} 300 Z`} fill={c(fill[i % 2])} {...L} />
          <path d={`M${x + w / 2} ${top} L${x + w / 2 + 34} ${top + 46} L${x + w / 2 + 6} ${top + 38} L${x + w / 2 - 10} ${top + 50} L${x + w / 2 - 34} ${top + 46} Z`} fill={c('white')} {...L} />
        </g>
      ))}
      <path d="M-10 300 H1010 V410 H-10 Z" fill={c('map-grass-deep')} {...L} />
      <path d="M60 330 Q500 270 940 330 Q980 400 500 410 Q20 400 60 330 Z" fill={c('map-water-deep')} {...L} />
      <path d="M180 350 h60 M640 360 h70 M420 380 h50" stroke={c('white')} strokeWidth="5" strokeLinecap="round" />
    </svg>
  )
}

export function LochScene({ fromCode, regionStamp, onImpact }) {
  const big = useMediaQuery('(min-width: 768px)')
  return (
    <Sky>
      <Cloud width={big ? 180 : 120} className="anim-drift absolute left-[6%] top-[10%]" />
      <Cloud width={big ? 140 : 100} className="anim-drift absolute right-[8%] top-[18%]" style={{ animationDelay: '-5s' }} />
      <Mountains />
      <motion.div
        className="absolute inset-0"
        animate={{ x: [0, -10, 9, -6, 4, 0], y: [0, 4, -3, 2, 0, 0] }}
        transition={{ delay: 0.62, duration: 0.4 }}
        onAnimationStart={onImpact}
      >
        <div className="absolute bottom-[4%] left-1/2 -translate-x-1/2">
          <NessieWave size={big ? 300 : 200} />
        </div>
        <motion.div
          className="absolute left-1/2 top-[13%] -translate-x-1/2 md:top-[11%]"
          initial={{ y: -40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 260, damping: 18 }}
        >
          <Ribbon>{fromCode} · Đã chinh phục</Ribbon>
        </motion.div>
        {/* Con dấu hộ chiếu lớn dập xuống giữa màn */}
        <motion.div
          className="absolute left-1/2 top-[40%] -translate-x-1/2 -translate-y-1/2"
          initial={{ scale: 2.6, rotate: -30, opacity: 0 }}
          animate={{ scale: 1, rotate: -12, opacity: 1 }}
          transition={{ delay: 0.45, type: 'spring', stiffness: 420, damping: 22 }}
        >
          <div
            className="grid size-[180px] place-items-center rounded-pill border-[6px] border-primary text-primary md:size-[240px]"
            style={{ background: 'color-mix(in srgb, var(--color-white) 70%, transparent)' }}
          >
            <div className="grid size-[calc(100%-14px)] place-items-center rounded-pill border-[3px] border-dashed border-primary text-center">
              <div className="flex flex-col items-center gap-1">
                <span className="font-display text-[13px] font-bold uppercase tracking-[0.2em] md:text-base">Hộ chiếu · {fromCode}</span>
                <span className="font-display text-[26px] font-bold uppercase leading-[0.95] md:text-[36px]">
                  {regionStamp.split(' ').map((w) => (
                    <span key={w} className="block">
                      {w}
                    </span>
                  ))}
                </span>
                <span className="grid size-10 place-items-center rounded-pill bg-primary md:size-12">
                  <Icon icon={CheckFat} size={big ? 28 : 22} color="white" />
                </span>
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </Sky>
  )
}

// ---------------- (2) Sân bay ----------------

function Suitcase({ size = 56 }) {
  return (
    <svg viewBox="0 0 50 60" width={size} height={(size * 60) / 50} overflow="visible" aria-hidden="true">
      <path d="M18 18 V4 H32 V18" fill="none" stroke={INK} strokeWidth="4" strokeLinejoin="round" />
      <rect x="6" y="16" width="38" height="36" rx="7" fill={c('gold')} {...L} />
      <path d="M16 16 V52 M34 16 V52" stroke={INK} strokeWidth="2" opacity="0.5" />
      <rect x="10" y="24" width="10" height="8" rx="2" fill={c('danger')} {...L} strokeWidth="2" />
      <circle cx="14" cy="56" r="4" fill={INK} />
      <circle cx="36" cy="56" r="4" fill={INK} />
    </svg>
  )
}

export function AirportScene({ mascot }) {
  const big = useMediaQuery('(min-width: 768px)')
  const planeW = big ? 380 : 230
  return (
    <Sky>
      <Cloud width={big ? 160 : 110} className="anim-drift absolute left-[10%] top-[12%]" />
      <Cloud width={big ? 120 : 90} className="anim-drift absolute right-[14%] top-[24%]" style={{ animationDelay: '-6s' }} />
      {/* Mặt đất và đường băng */}
      <div className="absolute inset-x-0 bottom-0 h-[34%] border-t-thick border-line bg-map-grass-deep" />
      <div className="absolute inset-x-0 bottom-[12%] h-[12%] border-y-thick border-line bg-map-runway">
        <div className="absolute inset-x-0 top-1/2 h-1.5 -translate-y-1/2 bg-[repeating-linear-gradient(90deg,var(--color-white)_0_40px,transparent_40px_70px)]" />
      </div>
      {/* Tháp điều khiển */}
      <svg viewBox="0 0 60 160" className="absolute bottom-[30%] left-[6%] h-[30%]" aria-hidden="true">
        <rect x="20" y="50" width="20" height="108" fill={c('map-stone')} {...L} />
        <path d="M6 50 H54 L48 22 H12 Z" fill={c('sky')} {...L} />
        <path d="M8 18 H52" {...L} />
      </svg>
      {/* Máy bay: đứng chờ rồi cất cánh */}
      <motion.div
        className="absolute bottom-[19%] right-[6%] md:right-[12%]"
        initial={{ x: 0, y: 0, rotate: 0 }}
        animate={{ x: '70vw', y: '-60vh', rotate: -14 }}
        transition={{ delay: 1.0, duration: 0.65, ease: 'easeIn' }}
      >
        <Plane width={planeW} />
        {/* Cầu thang lên máy bay */}
        <motion.svg
          viewBox="0 0 40 50"
          className="absolute"
          style={{ left: planeW * 0.1, top: planeW * 0.29, width: planeW * 0.1 }}
          animate={{ opacity: 0 }}
          transition={{ delay: 0.95, duration: 0.1 }}
          aria-hidden="true"
        >
          <path d="M2 48 L26 4 H38 L14 48 Z" fill={c('map-wood-light')} {...L} />
          <path d="M10 36 h10 M16 26 h10 M22 16 h10" {...L} strokeWidth="2.5" />
        </motion.svg>
      </motion.div>
      {/* Nhà du hành kéo vali chạy vào, lên máy bay */}
      <motion.div
        className="absolute bottom-[19%] left-0 flex items-end"
        initial={{ x: '-30vw', opacity: 1, scale: 1 }}
        animate={{ x: big ? '55vw' : '40vw', opacity: [1, 1, 0], scale: [1, 1, 0.5] }}
        transition={{ x: { duration: 0.7, ease: 'easeOut' }, opacity: { times: [0, 0.75, 1], duration: 0.95 }, scale: { times: [0, 0.75, 1], duration: 0.95 } }}
      >
        <div className="-mr-3 mb-1">
          <Suitcase size={big ? 54 : 40} />
        </div>
        <Traveler mascot={mascot} size={big ? 110 : 80} walking facing={-1} />
      </motion.div>
    </Sky>
  )
}

// ---------------- (3) Đường bay trên bản đồ thế giới ----------------

const PASTEL = ['map-grass-deep', 'map-island-top', 'vn-salmon', 'map-field', 'map-heather', 'map-heather']
// Đường bay từ Anh sang Mỹ trên lưới 200×100 (cùng hệ tọa độ với mini-map)
const FROM = { x: 99, y: 20 }
const VIA = { x: 72, y: 2 }
const TO = { x: 46, y: 28 }
const quad = (t, a, b, d) => (1 - t) ** 2 * a + 2 * (1 - t) * t * b + t * t * d

export function FlightScene({ fromRegion, toRegion }) {
  const big = useMediaQuery('(min-width: 768px)')
  const [t, setT] = useState(0)
  useEffect(() => {
    const controls = animate(0, 1, { delay: 0.15, duration: 1.0, ease: 'easeInOut', onUpdate: setT })
    return () => controls.stop()
  }, [])
  const x = quad(t, FROM.x, VIA.x, TO.x)
  const y = quad(t, FROM.y, VIA.y, TO.y)
  const dx = 2 * (1 - t) * (VIA.x - FROM.x) + 2 * t * (TO.x - VIA.x)
  const dy = 2 * (1 - t) * (VIA.y - FROM.y) + 2 * t * (TO.y - VIA.y)
  const angle = (Math.atan2(dy, dx) * 180) / Math.PI
  const path = `M${FROM.x} ${FROM.y} Q${VIA.x} ${VIA.y} ${TO.x} ${TO.y}`
  const label = (p, text, dyl) => (
    <text x={p.x} y={p.y + dyl} textAnchor="middle" fontFamily="Chakra Petch, sans-serif" fontWeight="700" fontSize="4" fill={INK} stroke={c('white')} strokeWidth="1.2" paintOrder="stroke">
      {text}
    </text>
  )
  return (
    <div className="absolute inset-0 grid place-items-center overflow-hidden bg-bg">
      <svg viewBox={big ? '8 -6 150 76' : '28 -2 80 46'} className="h-full max-h-[86vh] w-full max-w-[1200px]" preserveAspectRatio="xMidYMid meet" aria-label={`Bay từ ${fromRegion.name} sang ${toRegion.name}`} role="img">
        <defs>
          <mask id="flight-drawn" maskUnits="userSpaceOnUse" x="0" y="-10" width="200" height="120">
            <motion.path d={path} fill="none" stroke="white" strokeWidth="3" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ delay: 0.15, duration: 1.0, ease: 'easeInOut' }} />
          </mask>
        </defs>
        <path d="M0 33 H200 M0 66 H200 M50 -10 V110 M100 -10 V110" stroke={c('map-field-deep')} strokeWidth="0.3" />
        {CONTINENTS.map((d, i) => (
          <path key={d} d={d} fill={c(PASTEL[i] ?? 'map-grass-deep')} stroke={INK} strokeWidth="0.6" strokeLinejoin="round" />
        ))}
        {/* Vệt mây trắng và nét đứt hiện dần theo máy bay */}
        <g mask="url(#flight-drawn)">
          <path d={path} fill="none" stroke={INK} strokeWidth="2.6" strokeLinecap="round" opacity="0.15" />
          <path d={path} fill="none" stroke={c('white')} strokeWidth="2" strokeLinecap="round" />
          <path d={path} fill="none" stroke={c('primary')} strokeWidth="0.7" strokeDasharray="1.6 1.4" strokeLinecap="round" />
        </g>
        <circle cx={FROM.x} cy={FROM.y} r="1.6" fill={c('primary')} stroke={INK} strokeWidth="0.5" />
        <circle cx={TO.x} cy={TO.y} r="1.6" fill={t > 0.95 ? c('danger') : c('surface')} stroke={INK} strokeWidth="0.5" />
        {label(FROM, fromRegion.short.toUpperCase(), -3)}
        {label(TO, toRegion.short.toUpperCase(), 5.5)}
        {/* Máy bay nhỏ nhìn từ trên xuống */}
        <g transform={`translate(${x} ${y}) rotate(${angle}) scale(0.32)`}>
          <path d="M10 0 L-6 -3 L-10 -14 L-14 -14 L-10 -3 L-14 -2 L-18 -7 L-20 -7 L-18 0 L-20 7 L-18 7 L-14 2 L-10 3 L-14 14 L-10 14 L-6 3 Z" fill={c('primary')} stroke={INK} strokeWidth="1.6" strokeLinejoin="round" />
        </g>
      </svg>
    </div>
  )
}

// ---------------- (4) Hạ cánh: New York ----------------

function Skyline() {
  // Tòa nhà xen màu đỏ đất và xanh trời; một tòa có chóp bậc thang
  const blocks = [
    [20, 90, 170, 'map-brick'],
    [110, 70, 230, 'sky'],
    [180, 60, 150, 'map-brick'],
    [400, 64, 150, 'sky'],
    [464, 80, 230, 'map-brick'],
    [560, 80, 200, 'sky'],
    [640, 64, 300, 'map-brick'],
    [704, 70, 180, 'sky'],
    [774, 90, 250, 'map-brick'],
    [864, 70, 160, 'sky'],
    [934, 80, 210, 'map-brick'],
  ]
  return (
    <g>
      {blocks.map(([x, w, h, col]) => (
        <g key={x}>
          <rect x={x} y={330 - h} width={w} height={h} fill={c(col)} {...L} />
          {Array.from({ length: Math.floor(h / 34) }, (_, r) => (
            <path key={r} d={`M${x + 12} ${330 - h + 20 + r * 34} h${w - 24}`} stroke={INK} strokeWidth="2" strokeDasharray="10 8" opacity="0.35" />
          ))}
        </g>
      ))}
      {/* Tòa chóp bậc thang */}
      <path d="M648 30 V-10 M638 30 h20 v-14 h-20 Z M630 30 h36 v30 h-36 Z" fill={c('map-brick')} {...L} />
    </g>
  )
}

function Liberty() {
  return (
    <g transform="translate(330 0)">
      {/* Đảo nhỏ và bệ */}
      <ellipse cx="0" cy="332" rx="120" ry="20" fill={c('map-grass-deep')} {...L} />
      <path d="M-60 330 L-50 250 H50 L60 330 Z" fill={c('map-stone')} {...L} />
      <rect x="-40" y="196" width="80" height="56" fill={c('map-stone-deep')} {...L} />
      <path d="M-20 206 h40 v14 h-40 Z" fill={c('map-stone')} {...L} strokeWidth="2" />
      {/* Áo choàng, thân */}
      <path d="M-28 196 Q-34 120 -14 92 H14 Q34 120 28 196 Z" fill={c('liberty')} {...L} />
      <path d="M-8 110 Q-14 150 -10 196 M8 104 Q14 150 10 196" fill="none" {...L} strokeWidth="2" opacity="0.5" />
      {/* Tay cầm bảng */}
      <path d="M-20 122 L-34 138 L-22 146" fill={c('liberty')} {...L} />
      <rect x="-44" y="120" width="18" height="26" rx="2" fill={c('liberty')} {...L} transform="rotate(-14 -35 133)" />
      {/* Tay giơ đuốc */}
      <path d="M12 98 L26 40 L36 42 L24 102 Z" fill={c('liberty')} {...L} />
      <path d="M24 42 h16 l-3 -10 h-10 Z" fill={c('liberty')} {...L} />
      <path d="M32 32 Q22 18 32 6 Q42 18 32 32 Z" fill={c('orange')} {...L} />
      <path d="M32 28 Q28 20 32 14 Q36 20 32 28 Z" fill={c('gold')} />
      {/* Đầu và vương miện */}
      <circle cx="0" cy="82" r="13" fill={c('liberty')} {...L} />
      {[-60, -30, 0, 30, 60].map((a) => (
        <path key={a} d="M-3 -12 L0 -26 L3 -12 Z" transform={`translate(0 82) rotate(${a})`} fill={c('liberty')} {...L} strokeWidth="2" />
      ))}
    </g>
  )
}

export function ArrivalScene({ toCode, toRegion, quiet = false }) {
  const big = useMediaQuery('(min-width: 768px)')
  return (
    <Sky>
      {/* Mobile dọc: cắt khung quanh tượng và vài tòa nhà */}
      <svg
        viewBox={big ? '0 -40 1000 440' : '200 -40 420 440'}
        preserveAspectRatio={big ? 'xMidYMax slice' : 'xMinYMax slice'}
        className="absolute inset-x-0 bottom-0 h-[78%] w-full"
        aria-hidden="true"
      >
        <circle cx="860" cy="40" r="46" fill={c('gold')} {...L} />
        <Skyline />
        <path d="M-10 320 H1010 V410 H-10 Z" fill={c('sky')} {...L} />
        <path d="M120 360 h80 M600 372 h90 M820 352 h60" stroke={c('white')} strokeWidth="5" strokeLinecap="round" />
        <Liberty />
      </svg>
      {/* Máy bay hạ cánh lướt qua */}
      {!quiet && (
      <motion.div
        className="absolute right-0 top-[8%]"
        initial={{ x: '20vw', y: 0, rotate: 8, opacity: 1 }}
        animate={{ x: '-90vw', y: '30vh', rotate: 4, opacity: [1, 1, 0] }}
        transition={{ duration: 0.9, ease: 'easeOut' }}
      >
        <div style={{ transform: 'scaleX(-1)' }}>
          <Plane width={big ? 200 : 130} />
        </div>
      </motion.div>
      )}
      {/* Sương tan sang hai bên */}
      {!quiet && [-1, 1].map((side) => (
        <motion.div
          key={side}
          className={cx('absolute inset-y-0 flex w-[62%] flex-col justify-center gap-0', side < 0 ? 'left-0 items-end' : 'right-0 items-start')}
          initial={{ x: 0, opacity: 1 }}
          animate={{ x: `${side * 70}%`, opacity: 0 }}
          transition={{ delay: 0.25, duration: 0.9, ease: 'easeIn' }}
          aria-hidden="true"
        >
          <div className="absolute inset-0 bg-map-fog" />
          {[0, 1, 2, 3].map((i) => (
            <Cloud key={i} width={big ? 360 : 220} className={cx('relative -my-6', i % 2 && (side < 0 ? 'mr-24' : 'ml-24'))} />
          ))}
        </motion.div>
      ))}
      {/* Chữ chào mừng */}
      {!quiet && (
      <motion.div
        className="absolute inset-x-0 top-[9%] flex flex-col items-center gap-1 px-4 text-center md:top-[10%]"
        initial={{ scale: 2.4, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.75, type: 'spring', stiffness: 380, damping: 18 }}
      >
        <span className={cx('font-display text-[24px] font-bold uppercase italic text-white md:text-[40px]', STROKE)} style={{ '--stroke': '7px', textShadow: '4px 4px 0 var(--color-ink)' }}>
          Chào mừng đến với
        </span>
        <span className={cx('font-display text-[46px] font-bold uppercase italic leading-[0.95] text-gold md:text-[96px]', STROKE)} style={{ '--stroke': '10px', textShadow: '7px 7px 0 var(--color-ink)' }}>
          {toCode} · {toRegion.name}
        </span>
      </motion.div>
      )}
    </Sky>
  )
}
