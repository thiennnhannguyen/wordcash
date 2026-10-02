/*
 * Lá cờ vẽ phẳng (không dùng emoji): Vương quốc Anh, Việt Nam, Mỹ, Úc và quả địa cầu cho chặng "Thế giới".
 * Bản cách điệu, bo góc, viền mực.
 */

const INK = 'var(--color-ink)'
const c = (token) => `var(--color-${token})`

function UK() {
  return (
    <>
      <rect width="60" height="36" fill={c('flag-blue')} />
      <path d="M0 0 L60 36 M60 0 L0 36" stroke={c('white')} strokeWidth="8" />
      <path d="M0 0 L60 36 M60 0 L0 36" stroke={c('flag-red')} strokeWidth="3" />
      <path d="M30 0 V36 M0 18 H60" stroke={c('white')} strokeWidth="11" />
      <path d="M30 0 V36 M0 18 H60" stroke={c('flag-red')} strokeWidth="6" />
    </>
  )
}

const star = (cx, cy, r) => {
  const pts = Array.from({ length: 10 }, (_, i) => {
    const a = -Math.PI / 2 + (i * Math.PI) / 5
    const rr = i % 2 ? r * 0.42 : r
    return `${(cx + Math.cos(a) * rr).toFixed(2)},${(cy + Math.sin(a) * rr).toFixed(2)}`
  })
  return `M${pts.join('L')}Z`
}

function VN() {
  return (
    <>
      <rect width="60" height="36" fill={c('flag-red')} />
      <path d={star(30, 19, 11)} fill={c('gold')} />
    </>
  )
}

function US() {
  return (
    <>
      <rect width="60" height="36" fill={c('white')} />
      {[0, 1, 2, 3].map((i) => (
        <rect key={i} y={i * 10} width="60" height="5" fill={c('flag-red')} />
      ))}
      <rect width="26" height="20" fill={c('flag-blue')} />
      {[5, 13, 21].flatMap((x) => [5, 10, 15].map((y) => <circle key={`${x}${y}`} cx={x} cy={y} r="1.4" fill={c('white')} />))}
    </>
  )
}

function AU() {
  return (
    <>
      <rect width="60" height="36" fill={c('flag-blue')} />
      <g transform="scale(0.5)">
        <path d="M0 0 L60 36 M60 0 L0 36" stroke={c('white')} strokeWidth="8" />
        <path d="M30 0 V36 M0 18 H60" stroke={c('white')} strokeWidth="11" />
        <path d="M30 0 V36 M0 18 H60" stroke={c('flag-red')} strokeWidth="6" />
      </g>
      <path d={star(15, 28, 5)} fill={c('white')} />
      {[
        [46, 8],
        [40, 18],
        [52, 17],
        [46, 29],
      ].map(([x, y]) => (
        <path key={x + y} d={star(x, y, 3)} fill={c('white')} />
      ))}
    </>
  )
}

function World() {
  return (
    <>
      <rect width="60" height="36" fill={c('sky')} />
      <circle cx="30" cy="18" r="14" fill={c('map-water')} stroke={INK} strokeWidth="2" />
      <path d="M20 10 Q26 8 28 14 Q24 18 26 24 Q20 22 19 16 Z M33 8 Q40 10 42 16 Q38 20 40 26 Q34 26 34 20 Q30 14 33 8 Z" fill={c('accent')} stroke={INK} strokeWidth="1.4" />
    </>
  )
}

const FLAGS = { uk: UK, vn: VN, us: US, au: AU, world: World }

export default function Flag({ code, width = 36, className }) {
  const Art = FLAGS[code] ?? World
  return (
    <svg viewBox="-1 -1 62 38" width={width} height={(width * 38) / 62} className={className} aria-hidden="true">
      <defs>
        <clipPath id={`flag-${code}`}>
          <rect width="60" height="36" rx="5" />
        </clipPath>
      </defs>
      <g clipPath={`url(#flag-${code})`}>
        <Art />
      </g>
      <rect width="60" height="36" rx="5" fill="none" stroke={INK} strokeWidth="2.4" />
    </svg>
  )
}
