/*
 * A1 · Chợ Đồng Xuân: mặt tiền kem vàng với 3 đầu hồi tam giác cao đứng cạnh nhau, mỗi đầu hồi có cửa sổ vòm lớn,
 * cửa chính vòm ở giữa; sạp hàng mái bạt sọc, thúng hoa quả, một chiếc xích lô.
 */

import { Arch, c, LandmarkSvg, S, T } from '../shared/parts'

function Gable({ x, w, top, base }) {
  return (
    <g>
      <path d={`M${x} ${base} V${top + 26} L${x + w / 2} ${top} L${x + w} ${top + 26} V${base} Z`} fill={c('map-stone')} {...S} />
      <path d={`M${x + 6} ${top + 28} L${x + w / 2} ${top + 8} L${x + w - 6} ${top + 28}`} fill="none" {...T} />
      <Arch x={x + w / 2 - 12} y={top + 34} w={24} h={32} fill="sky" />
      <path d={`M${x + w / 2} ${top + 46} v20 M${x + w / 2 - 12} ${top + 54} h24`} {...T} />
    </g>
  )
}

function Stall({ x, colors }) {
  return (
    <g>
      <path d={`M${x} 194 h40 l-4 -14 h-32 Z`} fill={c(colors[0])} {...S} />
      <path d={`M${x + 10} 180 l-2 14 M${x + 20} 180 v14 M${x + 30} 180 l2 14`} stroke={c('white')} strokeWidth="4" />
      <path d={`M${x} 194 h40 l-4 -14 h-32 Z`} fill="none" {...S} />
      <path d={`M${x + 4} 194 v20 M${x + 36} 194 v20`} {...T} />
      <path d={`M${x + 4} 208 q16 8 32 0 v8 h-32 Z`} fill={c('vn-wood')} {...T} />
      {colors.slice(1).map((col, i) => (
        <circle key={i} cx={x + 12 + i * 8} cy={204 - (i % 2) * 3} r="4.5" fill={c(col)} {...T} strokeWidth="1.5" />
      ))}
    </g>
  )
}

export default function ChoDongXuan({ size }) {
  return (
    <LandmarkSvg size={size}>
      <rect x="20" y="132" width="200" height="90" fill={c('gold')} {...S} />
      <Gable x={26} w={60} top={78} base={176} />
      <Gable x={154} w={60} top={78} base={176} />
      <Gable x={86} w={68} top={58} base={176} />
      <path d="M16 176 H224" {...S} strokeWidth="4" />
      <Arch x={98} y={180} w={44} h={42} />
      {/* Sạp hàng và xích lô */}
      <Stall x={22} colors={['vn-tile', 'gold', 'accent', 'orange']} />
      <Stall x={152} colors={['primary', 'danger', 'gold', 'accent']} />
      <g transform="translate(196 214)">
        <circle cx="-12" cy="0" r="8" fill="none" {...S} />
        <circle cx="14" cy="0" r="8" fill="none" {...S} />
        <path d="M-20 -14 h16 v10 h-16 Z" fill={c('danger')} {...T} />
        <path d="M-4 -6 L14 0 M6 -4 V-20 h6" fill="none" {...T} />
      </g>
    </LandmarkSvg>
  )
}
