/*
 * Sương mù/mây trắng dày phủ vùng đất chưa khám phá, bắt đầu ngay trên trạm hiện tại và dày dần lên phía trên.
 * Mép sương là một dải mây phẳng viền mực. Khi mở trạm mới, mép sương trượt lên một đoạn (1,2 giây) và dải mây cũ
 * tan ra hai bên. Sương không nhận thao tác chuột: trạm bị khóa bên dưới vẫn bấm được để xem điều kiện mở.
 */

import { useEffect, useMemo, useRef, useState } from 'react'
import { seeded } from './layout'

const INK = 'var(--color-ink)'
const FOG = 'var(--color-map-fog)'

export function puffBand(width, rng, spread = 0) {
  const puffs = []
  for (let x = -20; x < width + 40; x += 38 + rng() * 26) {
    puffs.push({ x, y: (rng() - 0.5) * spread - 4, r: 26 + rng() * 22 })
  }
  return puffs
}

// Vẽ nhóm mây liền khối: viền mực trước, phần thân trắng đè lên để các vòng tròn hòa làm một
export function Puffs({ puffs, stroke = 2.4, fill = FOG, opacity = 1 }) {
  return (
    <g opacity={opacity}>
      {puffs.map((p, i) => (
        <circle key={`s${i}`} cx={p.x} cy={p.y} r={p.r + stroke} fill={INK} />
      ))}
      {puffs.map((p, i) => (
        <circle key={`f${i}`} cx={p.x} cy={p.y} r={p.r} fill={fill} />
      ))}
    </g>
  )
}

export default function Fog({ width, height, fogY, levelCode }) {
  const band = useMemo(() => puffBand(width, seeded(`${levelCode}-fog`)), [width, levelCode])
  // Mây lẻ bên trong vùng sương cho có kết cấu
  const inner = useMemo(() => {
    const rng = seeded(`${levelCode}-fog-inner`)
    const list = []
    for (let y = -180; y > -height; y -= 150) {
      const n = Math.max(1, Math.round(width / 320))
      for (let i = 0; i < n; i++) {
        const cx = rng() * width
        list.push(Array.from({ length: 4 }, (_, k) => ({ x: cx + (k - 1.5) * 34 + rng() * 10, y: y + (rng() - 0.5) * 30 - (k % 2) * 16, r: 24 + rng() * 18 })))
      }
    }
    return list
  }, [width, height, levelCode])

  // Dải mây cũ tan ra khi mép sương dịch lên
  const prev = useRef(fogY)
  const [clearing, setClearing] = useState(null)
  useEffect(() => {
    if (prev.current != null && fogY != null && fogY < prev.current - 1) {
      setClearing({ y: prev.current, key: Date.now() })
      const t = setTimeout(() => setClearing(null), 1400)
      prev.current = fogY
      return () => clearTimeout(t)
    }
    prev.current = fogY
    return undefined
  }, [fogY])

  if (fogY == null) return null

  return (
    <svg className="pointer-events-none absolute inset-0" width={width} height={height} aria-hidden="true">
      <defs>
        <linearGradient id="fog-grad" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="0" y2="-700">
          <stop offset="0" stopColor={FOG} stopOpacity="0.42" />
          <stop offset="0.45" stopColor={FOG} stopOpacity="0.8" />
          <stop offset="1" stopColor={FOG} stopOpacity="0.9" />
        </linearGradient>
      </defs>
      <g className="map-fog-front" style={{ transform: `translateY(${fogY}px)` }}>
        <rect x="0" y={-height} width={width} height={height} fill="url(#fog-grad)" />
        {inner.map((group, i) => (
          <Puffs key={i} puffs={group} stroke={2} opacity={0.75} />
        ))}
        <Puffs puffs={band} />
      </g>
      {clearing && (
        <g key={clearing.key} style={{ transform: `translateY(${clearing.y}px)` }}>
          <g className="anim-fog-clear-l">
            <Puffs puffs={band.filter((p) => p.x < width / 2)} />
          </g>
          <g className="anim-fog-clear-r">
            <Puffs puffs={band.filter((p) => p.x >= width / 2)} />
          </g>
        </g>
      )}
    </svg>
  )
}
