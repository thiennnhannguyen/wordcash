/*
 * A2 · Đồi cát Mũi Né: đồi cát lượn sóng hai màu đỏ cam và trắng kem, có vân gió; dải biển xanh; vài chiếc thúng chai
 * trên bờ; cây dừa nhỏ; một con diều màu bay trên trời.
 */

import { c, LandmarkSvg, Palm, S, T } from '../shared/parts'

function Basket({ x, y }) {
  return (
    <g>
      <path d={`M${x - 14} ${y} Q${x} ${y + 14} ${x + 14} ${y} Z`} fill={c('vn-wood')} {...S} />
      <path d={`M${x - 8} ${y + 2} l4 6 M${x} ${y + 3} v6 M${x + 8} ${y + 2} l-4 6`} {...T} opacity="0.5" />
    </g>
  )
}

export default function MuiNe({ size }) {
  return (
    <LandmarkSvg size={size}>
      {/* Diều */}
      <path d="M166 92 Q150 130 128 150" fill="none" {...T} strokeDasharray="3 4" />
      <path d="M166 62 L182 80 L166 98 L150 80 Z" fill={c('danger')} {...S} />
      <path d="M166 62 V98 M150 80 H182" {...T} />
      <path d="M166 62 L182 80 L166 80 Z" fill={c('gold')} {...T} />
      {/* Biển */}
      <path d="M130 196 Q180 184 238 186 V222 H120 Z" fill={c('sky')} {...S} />
      <path d="M170 200 h20 M206 208 h18" stroke={c('white')} strokeWidth="3" strokeLinecap="round" />
      {/* Đồi cát đỏ cam phía sau, trắng kem phía trước */}
      <path d="M4 196 Q30 110 90 112 Q140 114 170 196 Z" fill={c('orange')} {...S} />
      <path d="M40 150 Q70 132 104 140 M30 172 Q70 150 120 162" fill="none" stroke={c('map-brick')} strokeWidth="3" strokeLinecap="round" />
      <path d="M2 222 Q14 162 70 160 Q120 158 150 210 Q170 222 140 222 Z" fill={c('map-stone')} {...S} />
      <path d="M30 196 Q60 180 98 186 M50 212 Q80 198 116 204" fill="none" stroke={c('map-stone-deep')} strokeWidth="3" strokeLinecap="round" />
      <Basket x={150} y={210} />
      <Basket x={180} y={214} />
      <Palm x={206} y={204} s={0.95} flip />
    </LandmarkSvg>
  )
}
