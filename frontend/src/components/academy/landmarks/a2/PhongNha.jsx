/*
 * A2 · Phong Nha – Kẻ Bàng: cửa hang tròn khổng lồ trong núi đá vôi phủ rừng; dòng sông ngọc chảy vào hang; nhũ đá ánh
 * vàng ấm treo ở miệng hang; thuyền du lịch đầu rồng tiến vào; cây nhiệt đới và dây leo.
 */

import { c, INK, LandmarkSvg, Palm, S, T } from '../shared/parts'

export default function PhongNha({ size }) {
  return (
    <LandmarkSvg size={size}>
      {/* Núi đá vôi phủ rừng */}
      <path d="M8 206 C4 120 40 64 120 60 C200 64 236 120 232 206 Z" fill={c('vn-stone')} {...S} />
      <path d="M14 140 C20 92 60 62 120 60 C180 62 222 92 226 140 Q206 120 190 132 Q170 108 150 124 Q130 102 110 122 Q90 104 72 126 Q52 110 36 132 Q24 124 14 140 Z" fill={c('map-pine')} {...S} />
      <circle cx="60" cy="88" r="8" fill={c('map-grass-shade')} {...T} />
      <circle cx="170" cy="84" r="9" fill={c('map-grass-shade')} {...T} />
      {/* Cửa hang và nhũ đá vàng */}
      <path d="M58 206 Q58 120 120 118 Q182 120 182 206 Z" fill={INK} {...S} />
      {[78, 94, 110, 126, 142, 158].map((x, i) => (
        <path key={x} d={`M${x - 5} ${126 + (i % 3 === 0 ? 8 : 0)} L${x} ${146 + (i % 2) * 8} L${x + 5} ${126 + (i % 3 === 0 ? 8 : 0)} Z`} fill={c('gold')} stroke={c('gold')} strokeWidth="1" />
      ))}
      {/* Dây leo */}
      <path d="M64 136 q-4 12 2 22 M176 130 q6 14 -2 26" fill="none" stroke={c('map-grass-shade')} strokeWidth="4" strokeLinecap="round" />
      {/* Sông ngọc chảy vào hang */}
      <path d="M2 222 Q40 204 80 204 Q120 200 160 204 Q200 204 238 222 Z" fill={c('nessie')} {...S} />
      {/* Thuyền đầu rồng */}
      <g transform="translate(110 210)">
        <path d="M-26 -6 H18 Q20 4 6 6 H-18 Q-28 4 -26 -6 Z" fill={c('vn-tile')} {...S} />
        <path d="M18 -6 Q22 -20 30 -20 Q36 -16 30 -10 Q26 -8 26 -4 Z" fill={c('gold')} {...S} />
        <path d="M-18 -6 v-8 h28 v8" fill={c('map-stone')} {...T} />
      </g>
      <Palm x={22} y={212} s={0.9} />
      <Palm x={220} y={212} s={0.9} flip />
    </LandmarkSvg>
  )
}
