/*
 * A1 · Ruộng bậc thang Mù Cang Chải: các tầng ruộng cong ôm quanh đồi, sọc vàng óng xen xanh non; nhà sàn gỗ mái tranh
 * trên đỉnh đồi; chú trâu nhỏ trên ruộng; dải mây mỏng vắt ngang đồi.
 */

import { c, LandmarkSvg, S, T } from '../shared/parts'

const TERRACES = ['accent', 'gold', 'accent', 'gold', 'accent']

export default function MuCangChai({ size }) {
  return (
    <LandmarkSvg size={size}>
      {/* Các tầng ruộng: dải cong ôm quanh đồi, vàng óng xen xanh non */}
      {TERRACES.map((fill, i) => {
        const w0 = 108 - i * 19
        const t0 = 200 - i * 24
        const w1 = 108 - (i + 1) * 19
        const t1 = 200 - (i + 1) * 24
        const outer = `M${120 - w0} 222 Q${120 - w0} ${t0} 120 ${t0 - 8} Q${120 + w0} ${t0} ${120 + w0} 222`
        const inner = i === TERRACES.length - 1 ? ' Z' : ` L${120 + w1} 222 Q${120 + w1} ${t1} 120 ${t1 - 8} Q${120 - w1} ${t1} ${120 - w1} 222 Z`
        return <path key={i} d={outer + inner} fill={c(fill)} {...S} />
      })}
      <path d="M40 214 Q44 176 74 160 M200 212 Q194 182 170 166" fill="none" stroke={c('white')} strokeWidth="2.5" opacity="0.6" strokeLinecap="round" />
      {/* Nhà sàn mái tranh trên đỉnh */}
      <path d="M106 96 v14 M134 96 v14 M120 96 v14" {...S} />
      <rect x="100" y="80" width="40" height="18" fill={c('vn-wood')} {...S} />
      <rect x="114" y="84" width="10" height="14" fill={c('map-wood-light')} {...T} />
      <path d="M92 82 L120 52 L148 82 Z" fill={c('map-field-deep')} {...S} />
      <path d="M104 72 l6 -4 M126 66 l8 6" {...T} opacity="0.5" />
      {/* Trâu nhỏ */}
      <g transform="translate(160 186)">
        <ellipse cx="0" cy="0" rx="14" ry="9" fill={c('map-rock-deep')} {...T} />
        <path d="M-8 8 v8 M8 8 v8" stroke={c('ink')} strokeWidth="3" strokeLinecap="round" />
        <circle cx="-16" cy="-4" r="6" fill={c('map-rock-deep')} {...T} />
        <path d="M-22 -9 q-4 -6 2 -8 M-12 -9 q4 -6 -2 -8" fill="none" {...T} />
      </g>
      {/* Mây vắt ngang */}
      <path d="M20 128 Q40 116 66 124 Q90 112 112 124 H40 Q24 132 20 128 Z" fill={c('white')} {...S} />
      <path d="M168 110 Q182 100 200 106 Q214 100 224 110 Z" fill={c('white')} {...S} />
    </LandmarkSvg>
  )
}
