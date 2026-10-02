/*
 * A1 · Tràng An – Ninh Bình: cụm 3 núi đá vôi tròn cao phủ cây xanh mọc lên từ dòng sông ngọc uốn lượn; cửa hang ở chân
 * núi có sông chảy vào; thuyền nan có người đội nón lá chèo; mái đền cổ ló giữa các núi.
 */

import { c, CurvedRoof, HatPerson, LandmarkSvg, S, Sampan, T } from '../shared/parts'

function Karst({ x, w, top, base, fill = 'map-grass-shade' }) {
  return (
    <g>
      <path d={`M${x} ${base} C${x - 4} ${top + 40} ${x + w * 0.1} ${top} ${x + w / 2} ${top} C${x + w * 0.9} ${top} ${x + w + 4} ${top + 40} ${x + w} ${base} Z`} fill={c('vn-stone')} {...S} />
      <path d={`M${x + 4} ${top + 44} C${x + 4} ${top + 10} ${x + w * 0.2} ${top - 2} ${x + w / 2} ${top - 2} C${x + w * 0.8} ${top - 2} ${x + w - 4} ${top + 10} ${x + w - 2} ${top + 40} Q${x + w * 0.7} ${top + 30} ${x + w / 2} ${top + 46} Q${x + w * 0.3} ${top + 30} ${x + 4} ${top + 44} Z`} fill={c(fill)} {...S} />
      <circle cx={x + w * 0.3} cy={top + 62} r="6" fill={c('map-pine')} {...T} />
      <circle cx={x + w * 0.7} cy={top + 78} r="5" fill={c('map-pine')} {...T} />
    </g>
  )
}

export default function TrangAn({ size }) {
  return (
    <LandmarkSvg size={size}>
      <Karst x={26} w={62} top={92} base={196} />
      <Karst x={150} w={64} top={86} base={196} fill="map-pine" />
      {/* Mái đền cổ ló giữa núi */}
      <rect x="100" y="104" width="40" height="18" fill={c('vn-wood')} {...T} />
      <CurvedRoof x={94} y={104} w={52} h={16} fill="vn-tile" tips={7} />
      <Karst x={78} w={84} top={54} base={198} />
      {/* Cửa hang */}
      <path d="M100 198 Q100 164 120 164 Q140 164 140 198 Z" fill={c('ink')} {...S} />
      {/* Sông ngọc uốn lượn chảy vào hang */}
      <path d="M2 222 Q30 196 70 206 Q104 214 106 198 H134 Q140 212 180 210 Q220 208 238 222 Z" fill={c('vn-water')} {...S} />
      <path d="M40 212 h18 M170 216 h18" stroke={c('white')} strokeWidth="3" strokeLinecap="round" />
      <Sampan x={62} y={216} s={0.9}>
        <HatPerson x={4} y={-8} s={0.9} shirt="danger" />
      </Sampan>
    </LandmarkSvg>
  )
}
