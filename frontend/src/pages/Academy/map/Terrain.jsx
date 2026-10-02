/*
 * Địa hình nền của bản đồ: đồng cỏ, đồi, cánh đồng kẻ sọc, đường nhỏ, dòng sông (nước lấp lánh, thuyền),
 * con đường đất có cầu vượt sông, dấu chân và chấm xanh chanh trên đoạn đã đi, nét đứt mờ ở đoạn chưa mở.
 *
 * Tách thành ba lớp SVG (mặt đất · sông · đường và vật trang trí) để phần nước chuyển động chỉ vẽ lại vùng của nó.
 * `walkedLen` là độ dài con đường đã đi; dấu chân hiện dần theo nó (mặt nạ nét đứt có chuyển tiếp) khi nhà du hành bước tới.
 */

import { memo, useMemo } from 'react'
import { Boat, Bus, Fields, Gull, Hill, Lane, Prop } from './Props'
import { pointAt, polylinePath } from './layout'

const INK = 'var(--color-ink)'
const c = (token) => `var(--color-${token})`

function slice(road, from, to) {
  return road.points.filter((p) => p.len >= from && p.len <= to)
}

const Ground = memo(function Ground({ layout }) {
  const { width, height, features, lanes, mobile } = layout
  return (
    <svg className="absolute inset-0" width={width} height={height} aria-hidden="true">
      <defs>
        <pattern id="grass-tufts" width="90" height="90" patternUnits="userSpaceOnUse">
          <path d="M12 20 l3 -6 l3 6 M58 64 l3 -6 l3 6 M70 18 l2 -5 l2 5 M30 76 l2 -5 l2 5" fill="none" stroke={c('map-grass-shade')} strokeWidth="2" strokeLinecap="round" />
        </pattern>
      </defs>
      <rect width={width} height={height} fill={c('map-grass')} />
      <rect width={width} height={height} fill="url(#grass-tufts)" />
      {features.map((f, i) => (f.kind === 'fields' ? <Fields key={i} f={f} /> : <Hill key={i} f={f} />))}
      {lanes.map((lane, i) => (
        <Lane key={i} lane={lane} mobile={mobile} />
      ))}
    </svg>
  )
})

const River = memo(function River({ layout }) {
  const { river, width, sizes } = layout
  if (!river) return null
  const ys = river.points.map((p) => p.y)
  const top = Math.min(...ys) - sizes.river
  const bottom = Math.max(...ys) + sizes.river
  const d = polylinePath(river.points.map((p) => ({ x: p.x, y: p.y - top })))
  return (
    <svg className="absolute left-0" style={{ top }} width={width} height={bottom - top} aria-hidden="true">
      <path d={d} fill="none" stroke={INK} strokeWidth={sizes.river + 5} strokeLinecap="round" />
      <path d={d} fill="none" stroke={c('map-water')} strokeWidth={sizes.river} strokeLinecap="round" />
      <path className="anim-shimmer" d={d} fill="none" stroke={c('white')} strokeWidth="3" strokeLinecap="round" strokeDasharray="14 46" transform="translate(0 -9)" />
      <path className="anim-shimmer" d={d} fill="none" stroke={c('white')} strokeWidth="3" strokeLinecap="round" strokeDasharray="10 64" transform="translate(0 10)" style={{ animationDelay: '-1.2s' }} />
    </svg>
  )
})

// Cầu gỗ: hai thành cầu song song với con đường, chỗ cắt sông
function Bridge({ layout }) {
  const { bridge, road, sizes } = layout
  if (!bridge) return null
  const half = sizes.river / 2 + 16
  const pts = slice(road, bridge.len - half, bridge.len + half)
  if (pts.length < 2) return null
  const off = sizes.road / 2 + 4
  const side = (sign) =>
    polylinePath(
      pts.map((p, i) => {
        const q = pts[Math.min(i + 1, pts.length - 1)]
        const r = pts[Math.max(i - 1, 0)]
        const a = Math.atan2(q.y - r.y, q.x - r.x)
        return { x: p.x - Math.sin(a) * off * sign, y: p.y + Math.cos(a) * off * sign }
      }),
    )
  return (
    <g>
      <path d={polylinePath(pts)} fill="none" stroke={INK} strokeWidth={sizes.road + 16} strokeLinecap="butt" />
      <path d={polylinePath(pts)} fill="none" stroke={c('map-wood-light')} strokeWidth={sizes.road + 11} strokeLinecap="butt" />
      <path d={polylinePath(pts)} fill="none" stroke={INK} strokeWidth={sizes.road + 11} strokeDasharray="2 9" opacity="0.4" />
      {[1, -1].map((s) => (
        <g key={s}>
          <path d={side(s)} fill="none" stroke={INK} strokeWidth="7" strokeLinecap="round" />
          <path d={side(s)} fill="none" stroke={c('map-wood')} strokeWidth="3.5" strokeLinecap="round" />
        </g>
      ))}
    </g>
  )
}

function Footprints({ road, sizes }) {
  const marks = useMemo(() => {
    const out = []
    for (let len = 60, k = 0; len < road.length; len += 26, k++) {
      const p = pointAt(road, len)
      const s = k % 2 ? 1 : -1
      const off = sizes.road * 0.2
      out.push({ kind: 'foot', x: p.x - Math.sin(p.angle) * off * s, y: p.y + Math.cos(p.angle) * off * s, angle: (p.angle * 180) / Math.PI + 90 })
      if (k % 2 === 0) {
        const q = pointAt(road, len + 13)
        out.push({ kind: 'dot', x: q.x, y: q.y })
      }
    }
    return out
  }, [road, sizes])
  return marks.map((m, i) =>
    m.kind === 'dot' ? (
      <circle key={i} cx={m.x} cy={m.y} r={sizes.road * 0.15} fill={c('accent')} stroke={INK} strokeWidth="1.5" />
    ) : (
      <ellipse key={i} cx={m.x} cy={m.y} rx={sizes.road * 0.09} ry={sizes.road * 0.14} fill={INK} opacity="0.28" transform={`rotate(${m.angle} ${m.x} ${m.y})`} />
    ),
  )
}

const RoadLayer = memo(function RoadLayer({ layout, openLen }) {
  const { width, height, road, sizes, props } = layout
  const full = polylinePath(road.points)
  const locked = polylinePath(slice(road, openLen, road.length))
  const sorted = useMemo(() => [...props].sort((a, b) => a.y - b.y), [props])
  return (
    <>
      <path d={full} fill="none" stroke={INK} strokeWidth={sizes.road + 6} strokeLinecap="round" strokeLinejoin="round" transform="translate(4 4)" opacity="0.14" />
      <path d={full} fill="none" stroke={INK} strokeWidth={sizes.road + 5} strokeLinecap="round" strokeLinejoin="round" />
      <path d={full} fill="none" stroke={c('map-road')} strokeWidth={sizes.road} strokeLinecap="round" strokeLinejoin="round" />
      <path d={full} fill="none" stroke={c('map-road-edge')} strokeWidth={sizes.road * 0.55} strokeLinecap="round" strokeLinejoin="round" opacity="0.35" />
      {/* Đoạn chưa mở: nhạt màu, nét đứt */}
      <path d={locked} fill="none" stroke={c('map-grass')} strokeWidth={sizes.road + 6} strokeLinecap="round" strokeLinejoin="round" opacity="0.55" />
      <path d={locked} fill="none" stroke={INK} strokeWidth="3" strokeLinecap="round" strokeDasharray="10 12" opacity="0.4" />
      <Bridge layout={layout} />
      {sorted.map((p, i) => (
        <Prop key={i} prop={p} scale={sizes.prop} />
      ))}
      <rect width={width} height={height} fill="none" />
    </>
  )
})

export default function Terrain({ layout, walkedLen, openLen, animateWalk }) {
  const { width, height, road, sizes, lanes, boats, gulls, mobile } = layout
  return (
    <>
      <Ground layout={layout} />
      <River layout={layout} />
      {boats.map((b, i) => (
        <Boat key={i} boat={b} mobile={mobile} />
      ))}
      <svg className="absolute inset-0" width={width} height={height} aria-hidden="true">
        <defs>
          <mask id="walked" maskUnits="userSpaceOnUse" x="0" y="0" width={width} height={height}>
            <path
              d={polylinePath(road.points)}
              fill="none"
              stroke="white"
              strokeWidth={sizes.road + 12}
              style={{ strokeDasharray: `${walkedLen} ${road.length + 2000}`, transition: animateWalk ? 'stroke-dasharray 1.2s ease-in-out' : 'none' }}
            />
          </mask>
        </defs>
        <RoadLayer layout={layout} openLen={openLen} />
        <g mask="url(#walked)">
          <Footprints road={road} sizes={sizes} />
        </g>
      </svg>
      {lanes.map((lane, i) => (
        <Bus key={i} lane={lane} mobile={mobile} />
      ))}
      {gulls.map((g, i) => (
        <Gull key={i} gull={g} />
      ))}
    </>
  )
}
