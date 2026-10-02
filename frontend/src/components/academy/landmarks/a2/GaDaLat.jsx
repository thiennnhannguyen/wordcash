/*
 * A2 · Ga Đà Lạt: nhà ga kem vàng pastel với 3 đầu hồi tam giác nhọn cao cạnh nhau (gợi đỉnh Lang Biang), mỗi đầu hồi có
 * ô kính màu; đầu máy hơi nước nhỏ xanh rêu và đỏ đậu phía trước; đồi thông phía sau; luống cẩm tú cầu và hướng dương.
 */

import { c, LandmarkSvg, Pine, S, T } from '../shared/parts'

function Gable({ x, w, top }) {
  return (
    <g>
      <path d={`M${x} 150 L${x + w / 2} ${top} L${x + w} 150 Z`} fill={c('map-stone')} {...S} />
      <path d={`M${x + 4} 150 L${x + w / 2} ${top + 8} L${x + w - 4} 150`} fill="none" stroke={c('vn-tile')} strokeWidth="4" strokeLinejoin="round" />
      <rect x={x + w / 2 - 10} y={top + 38} width="20" height="24" fill={c('sky')} {...T} />
      <path d={`M${x + w / 2} ${top + 38} v24 M${x + w / 2 - 10} ${top + 50} h20`} {...T} />
      <rect x={x + w / 2 - 10} y={top + 38} width="10" height="12" fill={c('danger')} {...T} strokeWidth="1.5" />
      <rect x={x + w / 2} y={top + 50} width="10" height="12" fill={c('gold')} {...T} strokeWidth="1.5" />
    </g>
  )
}

export default function GaDaLat({ size }) {
  return (
    <LandmarkSvg size={size}>
      {/* Đồi thông */}
      <path d="M2 150 Q60 90 120 104 Q180 86 238 150 Z" fill={c('map-grass-shade')} {...S} />
      <Pine x={26} y={140} s={0.7} />
      <Pine x={212} y={140} s={0.75} />
      {/* Nhà ga */}
      <rect x="22" y="150" width="196" height="50" fill={c('map-stone')} {...S} />
      {[38, 70, 154, 186].map((x) => (
        <rect key={x} x={x} y="162" width="16" height="22" rx="3" fill={c('sky')} {...T} />
      ))}
      <rect x="108" y="160" width="24" height="40" fill={c('vn-wood')} {...T} />
      <Gable x={24} w={64} top={74} />
      <Gable x={152} w={64} top={74} />
      <Gable x={84} w={72} top={56} />
      <path d="M18 150 H222" {...S} strokeWidth="4" />
      {/* Đầu máy hơi nước */}
      <g transform="translate(60 214)">
        <rect x="-30" y="-16" width="42" height="16" rx="3" fill={c('map-pine')} {...S} />
        <rect x="8" y="-30" width="22" height="30" rx="3" fill={c('vn-tile')} {...S} />
        <rect x="-24" y="-28" width="8" height="12" fill={c('ink')} />
        <circle cx="-18" cy="2" r="6" fill={c('ink')} />
        <circle cx="0" cy="2" r="6" fill={c('ink')} />
        <circle cx="20" cy="2" r="6" fill={c('ink')} />
      </g>
      {/* Hoa cẩm tú cầu, hướng dương */}
      {[[132, 214, 'primary'], [146, 210, 'sky'], [160, 214, 'map-heather']].map(([x, y, col]) => (
        <circle key={x} cx={x} cy={y} r="7" fill={c(col)} {...T} />
      ))}
      {[190, 210].map((x) => (
        <g key={x}>
          <path d={`M${x} 222 v-14`} stroke={c('map-pine')} strokeWidth="3" />
          <circle cx={x} cy="206" r="7" fill={c('gold')} {...T} />
          <circle cx={x} cy="206" r="3" fill={c('vn-wood')} />
        </g>
      ))}
    </LandmarkSvg>
  )
}
