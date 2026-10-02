/*
 * Các mảnh nhỏ trên bản đồ hành trình:
 * - `Traveler`: linh vật nhà du hành (đội mũ, đeo ba lô, cầm bản đồ), đứng thở nhẹ; `walking` lắc lư khi đi bộ.
 * - `StageRibbon`: băng rôn tên chặng treo trên hai cọc gỗ (thay thanh chặng cũ).
 * - `VisitedStamp`: con dấu tròn "ĐÃ ĐẾN" dập nghiêng cạnh địa danh đã chinh phục; `PlantedFlag`: cờ tím cắm trên nóc.
 * - `Signpost`: biển chỉ đường bằng gỗ dạng mũi tên ghi tên bài.
 * - `SpeechBubble`, `Compass` (la bàn trang trí), `WorldMiniMap` (thế giới thu nhỏ, đường bay qua các vùng đất).
 */

import MascotBlob from '../../../components/collection/MascotBlob'
import Icon from '../../../components/ui/Icon'
import cx from '../../../utils/cx'

const INK = 'var(--color-ink)'
const c = (token) => `var(--color-${token})`

export function SpeechBubble({ children, className }) {
  return (
    <span
      className={cx(
        'relative inline-block whitespace-nowrap rounded-[14px] border-thick border-line bg-surface px-3 py-1 font-display text-sm font-bold uppercase shadow-hard-sm',
        className,
      )}
    >
      {children}
      <span aria-hidden="true" className="absolute -bottom-[9px] left-1/2 size-4 -translate-x-1/2 rotate-45 border-b-thick border-r-thick border-line bg-surface" />
    </span>
  )
}

export function Traveler({ mascot, size = 84, walking = false, facing = 1 }) {
  return (
    <div className={cx('relative', walking ? 'anim-walk' : 'anim-breathe')} style={{ width: size, height: size, transform: facing < 0 ? 'scaleX(-1)' : undefined }}>
      {/* Ba lô phía sau */}
      <svg viewBox="0 0 120 120" width={size} height={size} className="absolute inset-0" overflow="visible" aria-hidden="true">
        <rect x="78" y="40" width="30" height="56" rx="10" fill={c('orange')} stroke={INK} strokeWidth="4" />
        <rect x="84" y="62" width="20" height="18" rx="5" fill={c('gold')} stroke={INK} strokeWidth="3" />
        <path d="M80 50 H106" stroke={INK} strokeWidth="3" />
      </svg>
      <MascotBlob color={mascot.color} shape={mascot.shape} traits={{ ...mascot.traits, top: undefined }} size={size} className="relative" />
      <svg viewBox="0 0 120 120" width={size} height={size} className="absolute inset-0" overflow="visible" aria-hidden="true">
        {/* Quai ba lô */}
        <path d="M84 30 Q94 62 86 96" fill="none" stroke={INK} strokeWidth="8" strokeLinecap="round" />
        <path d="M84 30 Q94 62 86 96" fill="none" stroke={c('orange')} strokeWidth="4" strokeLinecap="round" />
        {/* Mũ thám hiểm */}
        <path d="M38 20 Q38 -2 60 -2 Q82 -2 82 20 Z" fill={c('map-stone-deep')} stroke={INK} strokeWidth="4" strokeLinejoin="round" />
        <path d="M39 14 H81" stroke={c('danger')} strokeWidth="5" />
        <ellipse cx="60" cy="20" rx="42" ry="8" fill={c('map-stone-deep')} stroke={INK} strokeWidth="4" />
        {/* Bản đồ cầm trên tay */}
        <g transform="rotate(-8 24 88)">
          <path d="M2 74 L22 70 L40 74 L40 102 L22 98 L2 102 Z" fill={c('white')} stroke={INK} strokeWidth="3.5" strokeLinejoin="round" />
          <path d="M22 70 V98" stroke={INK} strokeWidth="2" />
          <path d="M8 94 Q16 82 26 88 T36 80" fill="none" stroke={c('danger')} strokeWidth="2.5" strokeDasharray="3 3" />
          <path d="M33 77 l4 4 M37 77 l-4 4" stroke={c('danger')} strokeWidth="2.5" strokeLinecap="round" />
        </g>
        <circle cx="6" cy="90" r="7" fill={c(mascot.color)} stroke={INK} strokeWidth="3.5" />
        <circle cx="42" cy="88" r="7" fill={c(mascot.color)} stroke={INK} strokeWidth="3.5" />
      </svg>
    </div>
  )
}

const RIBBON_FILL = { done: 'accent', current: 'gold', locked: 'neutral' }

export function StageRibbon({ stage, status, width, mobile }) {
  const done = stage.lessons.filter((l) => l.status === 'done').length
  const fill = c(RIBBON_FILL[status])
  const h = mobile ? 52 : 58
  const tail = 18
  return (
    <div className="flex flex-col items-center" style={{ width }}>
      <div className="relative w-full" style={{ height: h }}>
        <svg viewBox={`0 0 ${width} ${h}`} width={width} height={h} className="absolute inset-0" overflow="visible" aria-hidden="true">
          {/* Đuôi ruy băng gập ra sau */}
          <path d={`M4 ${h * 0.3} H${tail + 10} V${h + 6} H4 L${tail * 0.7} ${h * 0.65 + 3} Z`} fill={fill} stroke={INK} strokeWidth="2.4" strokeLinejoin="round" />
          <path d={`M${width - 4} ${h * 0.3} H${width - tail - 10} V${h + 6} H${width - 4} L${width - tail * 0.7} ${h * 0.65 + 3} Z`} fill={fill} stroke={INK} strokeWidth="2.4" strokeLinejoin="round" />
          <path d={`M${tail} ${h} L${tail + 10} ${h + 6} V${h - 2} Z M${width - tail} ${h} L${width - tail - 10} ${h + 6} V${h - 2} Z`} fill={INK} />
          <path d={`M${tail + 4} 4 Q${width / 2} -4 ${width - tail - 4} 4 V${h} Q${width / 2} ${h - 8} ${tail + 4} ${h} Z`} fill={INK} transform="translate(3 3)" />
          <path d={`M${tail} 0 Q${width / 2} -8 ${width - tail} 0 V${h - 4} Q${width / 2} ${h - 12} ${tail} ${h - 4} Z`} fill={fill} stroke={INK} strokeWidth="2.4" strokeLinejoin="round" />
        </svg>
        <div className={cx('relative flex h-full items-center justify-center gap-2 pb-2 text-ink', mobile ? 'px-4' : 'px-6')}>
          <span className={cx('grid shrink-0 place-items-center rounded-pill border-2 border-line bg-surface', mobile ? 'size-7' : 'size-8')}>
            <Icon icon={stage.icon} size={17} />
          </span>
          <span className="min-w-0 leading-none">
            <span className="block whitespace-nowrap font-display text-[13px] font-bold uppercase tracking-wide">
              Chặng {stage.number} · {done}/{stage.lessons.length}
            </span>
            <span className={cx('block truncate font-heading font-extrabold uppercase leading-tight', mobile ? 'text-[13px]' : 'text-[15px]')}>{stage.title}</span>
          </span>
        </div>
      </div>
      <div className="flex justify-between" style={{ width: width - 70 }} aria-hidden="true">
        <span className="h-4 w-2 border-x-2 border-b-2 border-line bg-map-wood" />
        <span className="h-4 w-2 border-x-2 border-b-2 border-line bg-map-wood" />
      </div>
    </div>
  )
}

export function VisitedStamp({ date, size = 78, tilt = -14 }) {
  // `date` đã định dạng dd.mm (formatDayMonth)
  return (
    <div
      className="grid place-items-center rounded-pill border-[3px] border-primary text-primary mix-blend-multiply"
      style={{ width: size, height: size, transform: `rotate(${tilt}deg)`, background: 'color-mix(in srgb, var(--color-primary) 8%, transparent)' }}
    >
      <div className="grid size-[calc(100%-8px)] place-items-center rounded-pill border-2 border-dashed border-primary text-center leading-none">
        <span>
          <span className="block font-display text-[13px] font-bold uppercase">Đã đến</span>
          {date && <span className="font-num mt-0.5 block text-[13px]">{date}</span>}
        </span>
      </div>
    </div>
  )
}

export function PlantedFlag({ height = 34 }) {
  return (
    <svg viewBox="0 0 30 40" width={(height * 30) / 40} height={height} overflow="visible" aria-hidden="true">
      <path d="M3 40 V2" stroke={INK} strokeWidth="3" strokeLinecap="round" />
      <path className="anim-flag" d="M4 3 H26 L20 10 L26 17 H4 Z" fill={c('primary')} stroke={INK} strokeWidth="2.2" strokeLinejoin="round" />
      <circle cx="3" cy="2" r="2.5" fill={c('gold')} stroke={INK} strokeWidth="1.4" />
    </svg>
  )
}

export function Signpost({ text, dir, dim }) {
  // `dir` = 1: biển nằm bên phải trạm, mũi tên chỉ sang trái (về phía trạm)
  return (
    <div className={cx('flex flex-col items-center', dim && 'opacity-70')} aria-hidden="true">
      <div className={cx('relative flex items-center', dir > 0 ? 'flex-row' : 'flex-row-reverse')}>
        <span
          className="size-[26px] shrink-0 border-thick border-line bg-map-wood-light"
          style={{ transform: `rotate(45deg) translate(${dir > 0 ? '9px, -9px' : '-9px, 9px'})`, clipPath: dir > 0 ? 'polygon(0 0, 0 100%, 100% 100%)' : 'polygon(0 0, 100% 0, 100% 100%)' }}
        />
        <span className="relative max-w-[176px] rounded-[8px] border-thick border-line bg-map-wood-light px-2.5 py-1 text-[13px] font-semibold leading-snug text-ink shadow-hard-sm">
          {text}
        </span>
      </div>
      <span className="h-5 w-2 border-x-2 border-b-2 border-line bg-map-wood" />
    </div>
  )
}

export function Compass({ size = 92 }) {
  const letter = (x, y, t) => (
    <text x={x} y={y} textAnchor="middle" dominantBaseline="central" fontFamily="Chakra Petch, sans-serif" fontWeight="700" fontSize="15" fill={INK}>
      {t}
    </text>
  )
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} aria-hidden="true">
      <circle cx="53" cy="53" r="46" fill={INK} />
      <circle cx="50" cy="50" r="46" fill={c('surface')} stroke={INK} strokeWidth="3" />
      <circle cx="50" cy="50" r="33" fill="none" stroke={INK} strokeWidth="1.5" strokeDasharray="3 4" />
      <path d="M50 22 L56 50 L50 78 L44 50 Z" fill={c('raised')} stroke={INK} strokeWidth="2" strokeLinejoin="round" transform="rotate(45 50 50)" />
      <path d="M50 20 L57 50 H43 Z" fill={c('danger')} stroke={INK} strokeWidth="2" strokeLinejoin="round" />
      <path d="M50 80 L57 50 H43 Z" fill={c('surface')} stroke={INK} strokeWidth="2" strokeLinejoin="round" />
      <circle cx="50" cy="50" r="4" fill={c('gold')} stroke={INK} strokeWidth="2" />
      {letter(50, 11, 'B')}
      {letter(89, 50, 'Đ')}
      {letter(50, 89, 'N')}
      {letter(11, 50, 'T')}
    </svg>
  )
}

// Lục địa cách điệu trên lưới equirectangular 200×100
export const CONTINENTS = [
  'M8 14 L22 11 L47 10 L61 17 L69 22 L56 36 L46 41 L42 39 L34 32 L31 23 L17 18 Z',
  'M75 6 L89 8 L78 16 L69 11 Z',
  'M56 44 L67 44 L81 54 L78 62 L64 81 L58 75 L56 53 Z',
  'M94 30 L95 24 L97 18 L106 16 L117 11 L133 10 L156 7 L178 10 L199 13 L189 18 L178 22 L169 28 L168 36 L160 44 L156 49 L153 42 L144 46 L140 38 L132 36 L127 33 L123 43 L128 44 L122 58 L111 69 L107 53 L105 48 L96 47 L84 42 L84 38 L97 31 Z',
  'M163 62 L172 57 L179 56 L185 65 L181 72 L172 68 L164 69 Z',
  'M158 51 L166 52 L170 55 L160 55 Z',
]

const STOPS = [
  { code: 'vn', x: 159, y: 41, label: 'Việt Nam' },
  { code: 'uk', x: 99, y: 20, label: 'Anh' },
  { code: 'us', x: 46, y: 28, label: 'Mỹ' },
  { code: 'au', x: 174, y: 64, label: 'Úc' },
  { code: 'world', x: 100, y: 86, label: 'Thế giới' },
]

/** Thế giới thu nhỏ, chấm vị trí hiện tại và đường bay Việt Nam → Anh → Mỹ → Úc → Thế giới. */
export function WorldMiniMap({ current = 'uk', className }) {
  const at = STOPS.findIndex((s) => s.code === current)
  return (
    <svg viewBox="0 0 200 100" className={className} role="img" aria-label={`Hành trình: ${STOPS.map((s) => s.label).join(' → ')}. Bạn đang ở ${STOPS[at]?.label}.`}>
      <rect width="200" height="100" rx="8" fill={c('map-water')} />
      <path d="M0 33 H200 M0 66 H200 M50 0 V100 M100 0 V100 M150 0 V100" stroke={c('white')} strokeWidth="0.8" opacity="0.7" />
      {CONTINENTS.map((d) => (
        <path key={d} d={d} fill={c('map-grass-deep')} stroke={INK} strokeWidth="1.2" strokeLinejoin="round" />
      ))}
      {STOPS.slice(1).map((s, i) => {
        const a = STOPS[i]
        const mx = (a.x + s.x) / 2
        const my = Math.min(a.y, s.y) - 14
        const flown = i < at
        return (
          <path
            key={s.code}
            d={`M${a.x} ${a.y} Q${mx} ${my} ${s.x} ${s.y}`}
            fill="none"
            stroke={flown ? c('primary') : INK}
            strokeWidth={flown ? 2.4 : 1.4}
            strokeDasharray={flown ? undefined : '3 3'}
            opacity={flown ? 1 : 0.55}
          />
        )
      })}
      {STOPS.map((s, i) => (
        <g key={s.code}>
          {i === at && <circle cx={s.x} cy={s.y} r="7" fill="none" stroke={c('danger')} strokeWidth="2" className="anim-ping" style={{ transformOrigin: "center", transformBox: "fill-box" }} />}
          {s.code === 'world' ? (
            <path d={`M${s.x} ${s.y - 5} l1.6 3.4 3.6 .4 -2.7 2.4 .8 3.6 -3.3 -1.8 -3.3 1.8 .8 -3.6 -2.7 -2.4 3.6 -.4 Z`} fill={c('gold')} stroke={INK} strokeWidth="1" />
          ) : (
            <circle cx={s.x} cy={s.y} r={i === at ? 4.5 : 3.2} fill={i === at ? c('danger') : i < at ? c('primary') : c('surface')} stroke={INK} strokeWidth="1.4" />
          )}
        </g>
      ))}
    </svg>
  )
}
