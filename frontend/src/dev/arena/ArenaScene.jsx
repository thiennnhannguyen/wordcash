/*
 * Nền sân đấu hoạt hình phẳng nhìn chéo từ trên xuống, gồm 3 lớp.
 *
 * `ArenaScene` (lớp xa + sân): bầu trời có mây trôi, khán đài đầy khán giả và cờ màu kẹo, bảng quảng cáo,
 * mặt sân hình elip chia đôi (nửa trái tím = phe người chơi, nửa phải cam = phe đối thủ).
 * `ArenaForeground` (tiền cảnh): bụi cây và cột cờ ở hai góc dưới, đè lên sân nhưng nằm dưới giao diện.
 * Chỉ để trang trí (aria-hidden); màu lấy từ token.
 */

import cx from '../../utils/cx'

const CANDY = ['primary', 'orange', 'danger', 'gold', 'sky', 'accent']
const INK = 'var(--color-ink)'
const c = (name) => `var(--color-${name})`
const mix = (name, percent, base = 'surface') => `color-mix(in srgb, var(--color-${name}) ${percent}%, var(--color-${base}))`

function Cloud({ x, y, s = 1 }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`} fill={c('surface')} stroke={INK} strokeWidth="4">
      <path d="M0 40 a28 28 0 0 1 30 -30 a36 36 0 0 1 66 6 a26 26 0 0 1 30 24 z" strokeLinejoin="round" />
    </g>
  )
}

// Khán giả: mỗi hàng ghế một dãy đầu tròn nhiều màu, lệch nhau giữa các hàng
function Crowd() {
  const heads = []
  for (let row = 0; row < 4; row++) {
    for (let i = 0; i < 44; i++) {
      const x = i * 34 + (row % 2 ? 17 : 0) - 10
      heads.push(
        <g key={`${row}-${i}`}>
          <circle cx={x} cy={214 + row * 58} r="13" fill={c(CANDY[(i * 7 + row * 3) % CANDY.length])} stroke={INK} strokeWidth="3" />
          <circle cx={x} cy={236 + row * 58} r="17" fill={c(CANDY[(i * 5 + row) % CANDY.length])} stroke={INK} strokeWidth="3" opacity="0.9" />
        </g>,
      )
    }
  }
  return <g>{heads}</g>
}

function Flags() {
  return (
    <g>
      {Array.from({ length: 10 }, (_, i) => {
        const x = 70 + i * 145
        return (
          <g key={i}>
            <line x1={x} y1="160" x2={x} y2="76" stroke={INK} strokeWidth="5" strokeLinecap="round" />
            <path
              d={`M${x + 2} 78 L${x + 62} 94 L${x + 2} 112 Z`}
              fill={c(CANDY[i % CANDY.length])}
              stroke={INK}
              strokeWidth="4"
              strokeLinejoin="round"
              className="anim-flag"
              style={{ animationDelay: `${(i % 4) * 0.25}s` }}
            />
          </g>
        )
      })}
    </g>
  )
}

export function ArenaScene({ className }) {
  return (
    <svg viewBox="0 0 1440 1000" preserveAspectRatio="xMidYMid slice" className={cx('pointer-events-none size-full', className)} aria-hidden="true">
      <defs>
        <clipPath id="arena-field">
          <ellipse cx="720" cy="770" rx="640" ry="205" />
        </clipPath>
      </defs>

      {/* Lớp 1: bầu trời */}
      <rect width="1440" height="1000" fill={mix('sky', 30)} />
      <g className="anim-drift">
        <Cloud x={120} y={20} s={1.1} />
        <Cloud x={980} y={34} s={0.9} />
      </g>
      <g className="anim-drift" style={{ animationDelay: '-7s' }}>
        <Cloud x={560} y={6} s={0.7} />
      </g>

      {/* Lớp 2: khán đài */}
      <Flags />
      <rect x="-10" y="150" width="1460" height="30" fill={c('primary')} stroke={INK} strokeWidth="5" />
      {[0, 1, 2, 3].map((row) => (
        <rect key={row} x="-10" y={180 + row * 58} width="1460" height="58" fill={row % 2 ? c('raised') : c('surface')} stroke={INK} strokeWidth="4" />
      ))}
      <Crowd />
      {/* Bảng quảng cáo quanh sân */}
      <rect x="-10" y="412" width="1460" height="56" fill={c('ink')} />
      {Array.from({ length: 9 }, (_, i) => (
        <rect key={i} x={i * 164 + 6} y="420" width="152" height="40" rx="8" fill={c(CANDY[(i + 2) % CANDY.length])} stroke={INK} strokeWidth="3" />
      ))}

      {/* Lớp 3: mặt sân nhìn chéo */}
      <ellipse cx="720" cy="770" rx="900" ry="310" fill={mix('orange', 22, 'bg')} stroke={INK} strokeWidth="6" />
      <g clipPath="url(#arena-field)">
        <rect x="0" y="500" width="720" height="500" fill={mix('primary', 22)} />
        <rect x="720" y="500" width="720" height="500" fill={mix('orange', 30)} />
      </g>
      <ellipse cx="720" cy="770" rx="640" ry="205" fill="none" stroke={INK} strokeWidth="5" />
      <line x1="720" y1="565" x2="720" y2="975" stroke={INK} strokeWidth="4" strokeDasharray="18 14" />
      <ellipse cx="720" cy="770" rx="170" ry="56" fill="none" stroke={INK} strokeWidth="4" />
    </svg>
  )
}

function Bush({ flip = false }) {
  return (
    <svg viewBox="0 0 260 180" className={cx('h-auto w-full', flip && '-scale-x-100')} aria-hidden="true">
      <line x1="200" y1="176" x2="200" y2="30" stroke={INK} strokeWidth="7" strokeLinecap="round" />
      <path d="M203 34 L256 50 L203 68 Z" fill={flip ? c('orange') : c('primary')} stroke={INK} strokeWidth="5" strokeLinejoin="round" className="anim-flag" />
      <g fill={c('accent')} stroke={INK} strokeWidth="5" strokeLinejoin="round">
        <circle cx="60" cy="140" r="58" />
        <circle cx="130" cy="152" r="46" />
        <circle cx="10" cy="120" r="44" />
      </g>
      <circle cx="80" cy="118" r="7" fill={c('danger')} stroke={INK} strokeWidth="3" />
      <circle cx="122" cy="140" r="6" fill={c('gold')} stroke={INK} strokeWidth="3" />
    </svg>
  )
}

export function ArenaForeground() {
  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 flex justify-between" aria-hidden="true">
      <div className="w-36 -translate-x-6 translate-y-6 md:w-60">
        <Bush />
      </div>
      <div className="w-36 translate-x-6 translate-y-6 md:w-60">
        <Bush flip />
      </div>
    </div>
  )
}
