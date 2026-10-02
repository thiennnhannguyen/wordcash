/*
 * A2 · Chợ nổi Cái Răng – Cần Thơ: vài chiếc ghe gỗ trên sông rộng nước nâu xanh chất đầy trái cây rau củ (dưa hấu, dứa,
 * chuối, bí); mỗi ghe có cây bẹo tre cao treo mẫu hàng trên đỉnh; người bán đội nón lá; hàng dừa trên bờ.
 */

import { c, HatPerson, LandmarkSvg, Palm, S, T } from '../shared/parts'

function Ghe({ x, y, s = 1, goods, sample, children }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      {/* Cây bẹo tre treo mẫu hàng */}
      <path d="M-24 -6 V-86" stroke={c('ink')} strokeWidth="6" strokeLinecap="round" />
      <path d="M-24 -6 V-86" stroke={c('map-wood-light')} strokeWidth="3" strokeLinecap="round" />
      <path d="M-24 -84 v8" {...T} />
      <circle cx="-24" cy="-70" r="7" fill={c(sample)} {...T} />
      {/* Hàng hóa chất đống */}
      {goods.map(([gx, gy, col, r]) => (
        <circle key={`${gx}${gy}`} cx={gx} cy={gy} r={r} fill={c(col)} {...T} />
      ))}
      {children}
      <path d="M-44 -10 Q0 -2 44 -12 Q40 6 0 8 Q-38 6 -44 -10 Z" fill={c('vn-wood')} {...S} />
      <path d="M-30 -2 H30" {...T} opacity="0.5" />
    </g>
  )
}

export default function ChoNoiCaiRang({ size }) {
  return (
    <LandmarkSvg size={size}>
      {/* Hàng dừa trên bờ */}
      <path d="M2 150 Q120 132 238 150 V166 H2 Z" fill={c('map-grass-deep')} {...S} />
      <Palm x={34} y={156} s={1} />
      <Palm x={120} y={150} s={0.9} flip />
      <Palm x={206} y={156} s={1} flip />
      {/* Sông nâu xanh */}
      <path d="M2 162 Q120 152 238 162 V222 H2 Z" fill={c('vn-river')} {...S} />
      <path d="M20 182 h22 M196 178 h24 M110 214 h20" stroke={c('white')} strokeWidth="3" strokeLinecap="round" opacity="0.7" />
      <Ghe x={168} y={180} s={0.85} sample="gold" goods={[[-6, -16, 'gold', 8], [8, -16, 'gold', 8], [20, -18, 'orange', 9]]} />
      <Ghe
        x={84}
        y={208}
        sample="accent"
        goods={[[-10, -18, 'map-pine', 10], [8, -18, 'map-pine', 10], [-2, -28, 'accent', 8], [24, -18, 'orange', 9]]}
      >
        <HatPerson x={34} y={-10} s={1} shirt="sky" />
      </Ghe>
    </LandmarkSvg>
  )
}
