/*
 * A1 · Hồ Gươm & Tháp Rùa: tháp đá 3 tầng có cửa vòm, mái cong nhỏ trên đỉnh, đứng trên gò đảo giữa hồ xanh ngọc;
 * cầu Thê Húc đỏ cong dẫn tới cổng đền; liễu rủ bên hồ; chú rùa nhỏ bơi.
 */

import { Arch, c, CurvedRoof, INK, LandmarkSvg, S, T, Water, Willow } from '../shared/parts'

export default function HoGuom({ size }) {
  return (
    <LandmarkSvg size={size}>
      <Water cx={120} cy={200} rx={112} ry={30} />
      {/* Gò đảo */}
      <ellipse cx="128" cy="190" rx="38" ry="11" fill={c('map-grass-deep')} {...S} />
      {/* Tháp Rùa 3 tầng */}
      <g transform="translate(128 188) scale(1.2) translate(-128 -188)">
      <rect x="102" y="140" width="52" height="48" fill={c('map-stone')} {...S} />
      <path d="M102 164 H154" {...T} />
      <Arch x={121} y={164} w={14} h={24} />
      <Arch x={107} y={146} w={9} h={14} fill="vn-stone" />
      <Arch x={140} y={146} w={9} h={14} fill="vn-stone" />
      <rect x="98" y="134" width="60" height="7" fill={c('map-stone-deep')} {...S} />
      <rect x="110" y="104" width="36" height="31" fill={c('map-stone')} {...S} />
      <Arch x={114} y={110} w={10} h={18} fill="vn-stone" />
      <Arch x={132} y={110} w={10} h={18} fill="vn-stone" />
      <rect x="106" y="98" width="44" height="7" fill={c('map-stone-deep')} {...S} />
      <rect x="116" y="76" width="24" height="23" fill={c('map-stone')} {...S} />
      <Arch x={123} y={81} w={10} h={14} fill="vn-stone" />
      <CurvedRoof x={110} y={76} w={36} h={16} fill="vn-tile" tips={6} />
      <path d="M128 60 V52" {...S} />
      <circle cx="128" cy="50" r="4" fill={c('gold')} {...T} />
      </g>
      {/* Cổng đền và cầu Thê Húc */}
      <rect x="14" y="168" width="34" height="30" fill={c('map-stone')} {...S} />
      <Arch x={24} y={178} w={14} h={20} />
      <CurvedRoof x={12} y={168} w={38} h={14} fill="vn-tile" tips={5} />
      <path d="M44 204 Q76 166 112 194" fill="none" stroke={INK} strokeWidth="13" strokeLinecap="round" />
      <path d="M44 204 Q76 166 112 194" fill="none" stroke={c('vn-tile')} strokeWidth="8" strokeLinecap="round" />
      <path d="M50 192 Q76 158 106 182" fill="none" {...T} />
      {[58, 70, 82, 94].map((x, i) => (
        <path key={x} d={`M${x} ${[186, 178, 176, 181][i]} v8`} {...T} />
      ))}
      {/* Liễu rủ và rùa */}
      <Willow x={206} y={196} s={1.15} />
      <g transform="translate(176 212)">
        <ellipse cx="0" cy="0" rx="11" ry="6" fill={c('map-pine')} {...T} />
        <circle cx="13" cy="-1" r="4" fill={c('map-grass-shade')} {...T} />
        <path d="M-6 -2 l4 -3 M2 -3 l4 3" {...T} strokeWidth="1.5" />
      </g>
    </LandmarkSvg>
  )
}


