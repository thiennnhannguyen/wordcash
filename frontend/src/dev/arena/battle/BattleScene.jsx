/*
 * Sân "Thành Phố Kẹo" của màn đấu (nền, chỉ để trang trí).
 *
 * Bầu trời kem pha hồng nhạt, mây phẳng trôi chậm (hai lớp tốc độ khác nhau tạo parallax), hai dãy tòa nhà
 * màu kẹo viền đen (dãy xa nhạt hơn), đường chân trời và sàn đấu. Chỉ dùng màu token, không blur.
 */

import cx from '../../../utils/cx'

const INK = 'var(--color-ink)'
const c = (n) => `var(--color-${n})`
const mix = (n, p, base = 'surface') => `color-mix(in srgb, var(--color-${n}) ${p}%, var(--color-${base}))`

const CANDY = ['sky', 'danger', 'gold', 'accent', 'orange', 'primary']

function Cloud({ x, y, s = 1 }) {
  return (
    <path
      transform={`translate(${x} ${y}) scale(${s})`}
      d="M0 44 a30 30 0 0 1 34 -32 a40 40 0 0 1 74 4 a28 28 0 0 1 34 28 z"
      fill={c('surface')}
      stroke={INK}
      strokeWidth="4"
      strokeLinejoin="round"
    />
  )
}

// Một tòa nhà: thân chữ nhật, cửa sổ, mái (vòm kẹo mút / tam giác / phẳng)
function Building({ x, w, h, base, color, roof, far, domeColor }) {
  const top = base - h
  const fill = far ? mix(color, 45) : mix(color, 80)
  const windows = []
  for (let wy = top + 22; wy < base - 30; wy += 34) {
    for (let wx = x + 14; wx < x + w - 24; wx += 30) windows.push(<rect key={`${wx}-${wy}`} x={wx} y={wy} width="14" height="18" rx="4" fill={far ? mix('white', 70, 'raised') : c('surface')} stroke={INK} strokeWidth="2.5" />)
  }
  return (
    <g>
      {roof === 'dome' && <circle cx={x + w / 2} cy={top} r={w / 3} fill={mix(domeColor, far ? 40 : 75)} stroke={INK} strokeWidth="4" />}
      {roof === 'dome' && <line x1={x + w / 2} y1={top - w / 3} x2={x + w / 2} y2={top - w / 3 - 26} stroke={INK} strokeWidth="4" strokeLinecap="round" />}
      {roof === 'tri' && <path d={`M${x - 6} ${top} L${x + w / 2} ${top - w * 0.45} L${x + w + 6} ${top} Z`} fill={far ? mix('danger', 40) : mix('danger', 75)} stroke={INK} strokeWidth="4" strokeLinejoin="round" />}
      <rect x={x} y={top} width={w} height={h} rx="10" fill={fill} stroke={INK} strokeWidth="4" />
      {windows}
    </g>
  )
}

const FAR = [
  [20, 120, 250, 'sky', 'dome'], [150, 100, 200, 'gold', 'flat'], [262, 140, 300, 'accent', 'tri'], [420, 110, 230, 'danger', 'dome'],
  [545, 130, 280, 'primary', 'flat'], [690, 120, 330, 'orange', 'dome'], [825, 110, 240, 'sky', 'tri'], [950, 150, 290, 'gold', 'flat'],
  [1115, 110, 220, 'danger', 'dome'], [1240, 120, 310, 'accent', 'tri'], [1370, 110, 240, 'primary', 'flat'],
]
const NEAR = [
  [-30, 150, 170, 'orange', 'tri'], [140, 120, 130, 'primary', 'flat'], [1180, 130, 150, 'sky', 'dome'], [1320, 150, 190, 'danger', 'flat'],
]

export default function BattleScene({ className }) {
  return (
    <svg viewBox="0 0 1440 900" preserveAspectRatio="xMidYMax slice" className={cx('pointer-events-none size-full', className)} aria-hidden="true">
      {/* Bầu trời kem pha hồng */}
      <rect width="1440" height="900" fill={mix('danger', 12, 'bg')} />
      <circle cx="1160" cy="120" r="56" fill={c('gold')} stroke={INK} strokeWidth="4" />

      {/* Mây: lớp xa trôi chậm, lớp gần trôi nhanh hơn */}
      <g className="anim-drift" style={{ animationDuration: '26s' }}>
        <Cloud x={160} y={70} s={0.8} />
        <Cloud x={900} y={40} s={0.7} />
      </g>
      <g className="anim-drift" style={{ animationDuration: '14s', animationDelay: '-5s' }}>
        <Cloud x={520} y={130} s={1.1} />
        <Cloud x={1250} y={190} s={0.9} />
      </g>

      {/* Tòa nhà */}
      {FAR.map(([x, w, h, color, roof], i) => (
        <Building key={`f${x}`} x={x} w={w} h={h} base={620} color={color} roof={roof} far domeColor={CANDY[(i + 2) % CANDY.length]} />
      ))}
      {NEAR.map(([x, w, h, color, roof], i) => (
        <Building key={`n${x}`} x={x} w={w} h={h} base={640} color={color} roof={roof} domeColor={CANDY[(i + 4) % CANDY.length]} />
      ))}

      {/* Chân trời và sàn đấu */}
      <rect x="-10" y="620" width="1460" height="290" fill={mix('orange', 30, 'bg')} stroke={INK} strokeWidth="5" />
      <path d="M170 690 L1270 690 L1440 900 L0 900 Z" fill={mix('gold', 35)} stroke={INK} strokeWidth="5" strokeLinejoin="round" />
      <path d="M170 690 L1270 690 L1290 712 L150 712 Z" fill={mix('danger', 55)} stroke={INK} strokeWidth="4" strokeLinejoin="round" />
      <line x1="720" y1="712" x2="720" y2="900" stroke={INK} strokeWidth="4" strokeDasharray="16 14" />
      {/* Vạch hai phe */}
      <path d="M390 712 L300 900" stroke={c('primary')} strokeWidth="8" opacity="0.5" />
      <path d="M1050 712 L1140 900" stroke={c('orange')} strokeWidth="8" opacity="0.6" />
    </svg>
  )
}
