/*
 * Bệ đảo tròn của địa danh: mặt cỏ xanh nhạt, thành đất nâu, viền mực, bóng đổ cứng lệch xuống dưới-phải.
 * `children` là tranh địa danh (khung vuông, chân công trình nằm ở `ground` × chiều cao khung).
 * `px`: bề rộng khung tranh (desktop ~210, mobile ~140). `size`: "normal" | "boss" (boss lớn gấp 1.5 lần).
 * `surface`: mặt đảo "grass" (cỏ) | "water" (nước, Vịnh Hạ Long) | "mountain" (núi mờ sương, Cầu Vàng).
 * `state`: "done" đầy màu · "current" quầng sáng phía sau và nhún nhẹ · "locked" xám mờ, phủ sương.
 * Tranh B1 cũ giữ kiểu riêng: `lockedStyle="silhouette"` (chỉ thấy bóng), `currentStyle="none"` (bản đồ tự vẽ tia sáng).
 * Điểm neo của component là tâm mặt đảo (chỗ chân địa danh chạm đất): bọc ngoài đặt left = -width/2, top = -anchorY.
 */

import cx from '../../../utils/cx'

const INK = 'var(--color-ink)'
const SURFACE = { grass: 'map-island-top', water: 'vn-water', mountain: 'map-grass-shade' }

export function islandMetrics(px, size = 'normal', ground = 0.925) {
  const art = size === 'boss' ? px * 1.5 : px
  const w = art * 1.18
  const ry = art * 0.13
  const depth = art * 0.1
  return { art, w, ry, depth, anchorY: art * ground, height: art * ground + ry + depth + 10 }
}

export function IslandBase({ w, ry, depth, surface = 'grass' }) {
  const rx = w / 2 - 4
  const h = ry * 2 + depth + 10
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} overflow="visible" aria-hidden="true">
      <path d={`M4 ${ry} V${ry + depth} A${rx} ${ry} 0 0 0 ${w - 4} ${ry + depth} V${ry} Z`} fill={INK} opacity="0.2" transform="translate(5 5)" />
      <path d={`M4 ${ry} V${ry + depth} A${rx} ${ry} 0 0 0 ${w - 4} ${ry + depth} V${ry} Z`} fill="var(--color-map-island-side)" stroke={INK} strokeWidth="2.6" strokeLinejoin="round" />
      <path d={`M${w * 0.3} ${ry * 2 + depth - 3} v-${depth * 0.55} M${w * 0.62} ${ry * 2 + depth - 2} v-${depth * 0.45} M${w * 0.47} ${ry * 2 + depth} v-${depth * 0.35}`} stroke={INK} strokeWidth="1.6" opacity="0.35" strokeLinecap="round" />
      <ellipse cx={w / 2} cy={ry} rx={rx} ry={ry} fill={`var(--color-${SURFACE[surface] ?? SURFACE.grass})`} stroke={INK} strokeWidth="2.6" />
      {surface === 'water' && <path d={`M${w * 0.22} ${ry} h${w * 0.08} M${w * 0.66} ${ry * 1.35} h${w * 0.1}`} stroke="var(--color-white)" strokeWidth="3" strokeLinecap="round" />}
    </svg>
  )
}

export default function LandmarkIsland({
  px,
  size = 'normal',
  state = 'done',
  surface = 'grass',
  ground = 0.925,
  showIsland = true,
  lockedStyle = 'fade',
  currentStyle = 'halo',
  className,
  children,
}) {
  const m = islandMetrics(px, size, ground)
  const silhouette = state === 'locked' && lockedStyle === 'silhouette'
  const fade = state === 'locked' && !silhouette
  const current = state === 'current' && currentStyle === 'halo'
  return (
    <div
      className={cx('relative', className)}
      style={{ width: m.w, height: m.height, filter: fade ? 'grayscale(1) opacity(0.45)' : undefined }}
    >
      {showIsland && (
        <div className="absolute left-0" style={{ top: m.anchorY - m.ry, opacity: silhouette ? 0.5 : 1 }}>
          <IslandBase w={m.w} ry={m.ry} depth={m.depth} surface={surface} />
        </div>
      )}
      {current && (
        <span
          aria-hidden="true"
          className="anim-halo absolute rounded-pill"
          style={{
            left: m.w / 2 - m.art * 0.45,
            top: m.anchorY - m.art * 0.82,
            width: m.art * 0.9,
            height: m.art * 0.8,
            background: 'var(--color-gold)',
          }}
        />
      )}
      <div
        className={cx('absolute', current && 'anim-lm-bob')}
        style={{ left: (m.w - m.art) / 2, top: 0, width: m.art, height: m.art, ...(silhouette && { filter: 'brightness(0)', opacity: 0.5 }) }}
      >
        {children}
      </div>
      {fade && (
        // Lớp sương trắng phủ lên địa danh chưa tới: một dải mây phẳng quanh thân
        <svg
          aria-hidden="true"
          className="absolute left-0"
          style={{ top: m.anchorY - m.art * 0.5 }}
          width={m.w}
          height={m.art * 0.6}
          viewBox="0 0 100 50"
          preserveAspectRatio="none"
        >
          {[[14, 30, 14], [32, 22, 17], [52, 28, 18], [72, 20, 16], [88, 30, 13], [44, 40, 15], [70, 40, 14]].map(([x, y, r]) => (
            <ellipse key={`${x}${y}`} cx={x} cy={y} rx={r} ry={r * 0.8} fill="var(--color-map-fog)" opacity="0.8" />
          ))}
        </svg>
      )}
    </div>
  )
}
