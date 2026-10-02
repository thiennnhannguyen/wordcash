/*
 * A2 · Chùa Thiên Mụ: tháp Phước Duyên bát giác 7 tầng thon cao, hồng cam nhạt pha kem, tầng trên nhỏ dần, mỗi tầng có
 * khám vòm; đứng trên đồi xanh cạnh sông Hương rộng; thuyền rồng đầu rồng sặc sỡ; cây hoa đại.
 */

import { Arch, c, LandmarkSvg, S, T } from '../shared/parts'

export default function ChuaThienMu({ size }) {
  const tiers = Array.from({ length: 7 }, (_, i) => ({ w: 46 - i * 4.6, h: 20 - i * 1, y: 0 }))
  let y = 186
  tiers.forEach((t) => {
    y -= t.h + 4
    t.y = y
  })
  return (
    <LandmarkSvg size={size}>
      {/* Sông Hương và thuyền rồng */}
      <path d="M126 222 Q150 196 238 192 V222 Z" fill={c('vn-water')} {...S} />
      <g transform="translate(196 212)">
        <path d="M-26 -4 H22 Q24 6 10 8 H-18 Q-28 6 -26 -4 Z" fill={c('vn-tile')} {...S} />
        <path d="M22 -4 Q26 -18 34 -18 Q40 -14 34 -8 Q30 -6 30 -2 Z" fill={c('gold')} {...S} />
        <circle cx="34" cy="-14" r="1.6" fill={c('ink')} />
        <path d="M-20 -4 v-10 h28 v10" fill={c('gold')} {...T} />
      </g>
      {/* Đồi xanh */}
      <path d="M2 222 Q10 176 70 176 Q130 176 150 222 Z" fill={c('map-grass-deep')} {...S} />
      {/* Tháp 7 tầng */}
      <rect x="54" y="180" width="56" height="8" fill={c('map-stone-deep')} {...S} />
      {tiers.map((t, i) => (
        <g key={i}>
          <rect x={82 - t.w / 2} y={t.y} width={t.w} height={t.h} fill={c('vn-salmon')} {...S} />
          <path d={`M${82 - t.w / 2 + t.w * 0.28} ${t.y} V${t.y + t.h} M${82 + t.w / 2 - t.w * 0.28} ${t.y} V${t.y + t.h}`} {...T} opacity="0.35" />
          <Arch x={82 - 4} y={t.y + 4} w={8} h={t.h - 6} />
          <path d={`M${82 - t.w / 2 - 5} ${t.y} H${82 + t.w / 2 + 5}`} stroke={c('ink')} strokeWidth="5" strokeLinecap="round" />
          <path d={`M${82 - t.w / 2 - 4} ${t.y} H${82 + t.w / 2 + 4}`} stroke={c('map-stone')} strokeWidth="2" strokeLinecap="round" />
        </g>
      ))}
      <path d={`M82 ${tiers[6].y} V${tiers[6].y - 16}`} stroke={c('ink')} strokeWidth="5" strokeLinecap="round" />
      <path d={`M82 ${tiers[6].y} V${tiers[6].y - 16}`} stroke={c('gold')} strokeWidth="2.5" strokeLinecap="round" />
      {/* Cây hoa đại */}
      <g transform="translate(150 176)">
        <path d="M0 0 Q-2 -14 4 -26" fill="none" stroke={c('vn-wood')} strokeWidth="5" strokeLinecap="round" />
        <ellipse cx="2" cy="-36" rx="22" ry="14" fill={c('map-pine')} {...S} />
        {[[-10, -38], [6, -44], [12, -32], [-2, -30]].map(([x, yy]) => (
          <g key={`${x}${yy}`}>
            <circle cx={x} cy={yy} r="4" fill={c('white')} {...T} strokeWidth="1.4" />
            <circle cx={x} cy={yy} r="1.4" fill={c('gold')} />
          </g>
        ))}
      </g>
    </LandmarkSvg>
  )
}
