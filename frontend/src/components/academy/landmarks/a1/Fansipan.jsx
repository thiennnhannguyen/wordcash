/*
 * A1 · Fansipan – Sa Pa: đỉnh núi đá nhọn nhô trên biển mây; chóp kim loại tam giác màu bạc và lá cờ đỏ nhỏ trên đỉnh;
 * cabin cáp treo trên dây; cây thông trên sườn; một bên mặt trời ló, bên kia mây mưa nhỏ (thời tiết thay đổi).
 */

import { c, Cloud, LandmarkSvg, Pine, S, T } from '../shared/parts'

export default function Fansipan({ size }) {
  return (
    <LandmarkSvg size={size}>
      {/* Mặt trời ló sau mây, mây mưa bên kia */}
      <circle cx="40" cy="78" r="18" fill={c('gold')} {...S} />
      <Cloud x={52} y={92} s={0.9} />
      <g stroke={c('sky')} strokeWidth="3" strokeLinecap="round">
        <path d="M188 92 l-3 9 M198 94 l-3 9 M208 92 l-3 9" />
      </g>
      <Cloud x={198} y={78} s={0.9} fill="vn-stone" />
      {/* Núi */}
      <path d="M30 206 L92 108 L118 62 L132 76 L150 104 L214 206 Z" fill={c('map-rock')} {...S} />
      <path d="M118 62 L132 76 L150 104 L214 206 H150 L136 130 Z" fill={c('map-rock-deep')} {...T} />
      <path d="M118 62 L106 86 L116 82 L124 94 L132 76 Z" fill={c('white')} {...T} />
      <Pine x={76} y={180} s={0.7} />
      <Pine x={96} y={186} s={0.6} />
      <Pine x={176} y={186} s={0.65} />
      {/* Chóp bạc và cờ đỏ */}
      <path d="M110 64 L118 40 L126 64 Z" fill={c('map-runway')} {...S} />
      <path d="M118 40 L126 64 H118 Z" fill={c('vn-stone')} {...T} />
      <path d="M134 66 V42" {...S} />
      <path d="M135 43 h14 l-4 5 l4 5 h-14 Z" fill={c('flag-red')} {...T} />
      {/* Cáp treo */}
      <path d="M2 128 L104 92" {...T} />
      <path d="M58 109 v8" {...T} />
      <rect x="47" y="116" width="22" height="16" rx="4" fill={c('vn-tile')} {...S} />
      <rect x="51" y="120" width="14" height="6" fill={c('sky')} {...T} strokeWidth="1.5" />
      {/* Biển mây quanh chân núi */}
      <path d="M8 222 Q8 200 30 202 Q38 186 60 194 Q76 182 96 196 Q114 186 132 198 Q152 184 170 196 Q190 186 206 200 Q232 198 232 222 Z" fill={c('white')} {...S} />
    </LandmarkSvg>
  )
}
