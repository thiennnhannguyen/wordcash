/*
 * A1 · Phố cổ Hà Nội & Ô Quan Chưởng: cổng thành đá kem vàng có một cửa vòm, chòi gác mái ngói cong trên cổng;
 * hai bên là nhà ống hẹp tường vàng, cửa chớp xanh lá, ban công có chậu cây; phía trước có gánh hàng rong và bát phở bốc khói.
 */

import { Arch, c, CurvedRoof, LandmarkSvg, S, T } from '../shared/parts'

function TubeHouse({ x, w, top }) {
  return (
    <g>
      <rect x={x} y={top} width={w} height={222 - top} fill={c('gold')} {...S} />
      <path d={`M${x - 3} ${top} H${x + w + 3} L${x + w - 4} ${top - 12} H${x + 4} Z`} fill={c('vn-tile')} {...S} />
      <rect x={x + 7} y={top + 12} width={w - 14} height="18" fill={c('map-pine')} {...T} />
      <path d={`M${x + w / 2} ${top + 12} v18`} {...T} />
      <path d={`M${x + 4} ${top + 40} H${x + w - 4}`} {...S} />
      <path d={`M${x + 6} ${top + 40} v-6 M${x + w - 6} ${top + 40} v-6`} {...T} />
      <circle cx={x + w / 2} cy={top + 34} r="5" fill={c('map-grass-shade')} {...T} />
      <rect x={x + 8} y={top + 52} width={w - 16} height={222 - top - 52} fill={c('map-pine')} {...T} />
    </g>
  )
}

export default function PhoCo({ size }) {
  return (
    <LandmarkSvg size={size}>
      <TubeHouse x={10} w={44} top={118} />
      <TubeHouse x={186} w={44} top={126} />
      {/* Cổng Ô Quan Chưởng */}
      <rect x="62" y="122" width="116" height="100" fill={c('map-stone')} {...S} />
      <path d="M62 140 H178" {...T} opacity="0.35" />
      <Arch x={96} y={154} w={48} h={68} />
      <path d="M58 122 H182" {...S} strokeWidth="4" />
      {/* Chòi gác */}
      <rect x="88" y="92" width="64" height="30" fill={c('vn-wood')} {...S} />
      <rect x="98" y="100" width="12" height="14" fill={c('map-stone')} {...T} />
      <rect x="130" y="100" width="12" height="14" fill={c('map-stone')} {...T} />
      <CurvedRoof x={78} y={92} w={84} h={26} fill="vn-tile" tips={10} />
      {/* Gánh hàng rong và bát phở */}
      <path d="M22 190 L74 182" stroke={c('vn-wood')} strokeWidth="4" strokeLinecap="round" />
      <path d="M26 190 v10 M70 183 v10" {...T} />
      <path d="M16 200 h20 l-3 14 h-14 Z M60 193 h20 l-3 14 h-14 Z" fill={c('map-field-deep')} {...S} />
      <rect x="160" y="204" width="30" height="6" rx="2" fill={c('sky')} {...T} />
      <path d="M164 210 v12 M186 210 v12" stroke={c('sky')} strokeWidth="4" strokeLinecap="round" />
      <path d="M164 196 h22 q-2 9 -11 9 q-9 0 -11 -9 Z" fill={c('white')} {...T} />
      <path d="M170 190 q-3 -5 0 -9 M179 190 q-3 -5 0 -9" fill="none" stroke={c('white')} strokeWidth="3" strokeLinecap="round" />
    </LandmarkSvg>
  )
}
