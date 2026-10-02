/*
 * Vật trang trí trên bản đồ (phẳng 2.5D, viền mực 2px, bóng đổ cứng dưới chân): cây tròn, cây thông, bụi cây, hoa,
 * cừu, nhà gạch, hộp thư đỏ, bốt điện thoại đỏ, hàng rào, cờ dây, cọ; mảng lớn (cánh đồng kẻ sọc, đồi);
 * vật chuyển động (xe buýt hai tầng, thuyền, mòng biển, mây tiền cảnh có mưa).
 *
 * Mọi sprite vẽ quanh gốc (0, 0) là điểm chạm đất. Màu nhạt, độ bão hòa thấp hơn trạm để con đường luôn nổi bật.
 * Không vẽ logo hay chữ thương hiệu thật lên xe cộ, biển hiệu.
 */

const INK = 'var(--color-ink)'
const c = (token) => `var(--color-${token})`
const line = { stroke: INK, strokeWidth: 2, strokeLinejoin: 'round', strokeLinecap: 'round' }

function Shadow({ rx, ry = 4, dx = 4 }) {
  return <ellipse cx={dx} cy={1} rx={rx} ry={ry} fill={INK} opacity="0.16" />
}

const TREE_FILLS = ['map-grass-shade', 'map-pine', 'map-grass-shade', 'map-grass-deep']

function TreeRound({ variant }) {
  return (
    <g>
      <Shadow rx={16} />
      <rect x="-4" y="-18" width="8" height="19" rx="2" fill={c('map-wood')} {...line} />
      <circle cx="0" cy="-32" r="19" fill={c(TREE_FILLS[variant])} {...line} />
      <circle cx="-7" cy="-38" r="5" fill={c('white')} opacity="0.45" />
    </g>
  )
}

function Pine({ variant }) {
  const fill = c(variant % 2 ? 'map-pine' : 'map-grass-shade')
  return (
    <g>
      <Shadow rx={13} />
      <rect x="-3" y="-10" width="6" height="11" fill={c('map-wood')} {...line} />
      <path d="M0 -56 L14 -30 L7 -30 L18 -10 L-18 -10 L-7 -30 L-14 -30 Z" fill={fill} {...line} />
    </g>
  )
}

function Bush({ variant }) {
  return (
    <g>
      <Shadow rx={13} />
      <path d="M-14 0 A8 8 0 0 1 -12 -12 A9 9 0 0 1 4 -16 A8 8 0 0 1 15 -6 A6 6 0 0 1 14 0 Z" fill={c(TREE_FILLS[(variant + 1) % 4])} {...line} />
    </g>
  )
}

function Flowers({ variant }) {
  const colors = [['danger', 'gold', 'white'], ['gold', 'white', 'sky'], ['white', 'danger', 'gold'], ['sky', 'gold', 'white']][variant]
  return (
    <g opacity="0.9">
      <path d="M-12 0 Q-10 -8 -6 -2 Q-2 -12 2 -2 Q6 -10 10 -1 Z" fill={c('map-grass-shade')} {...line} strokeWidth="1.5" />
      <circle cx="-7" cy="-9" r="3.2" fill={c(colors[0])} {...line} strokeWidth="1.5" />
      <circle cx="2" cy="-13" r="3.2" fill={c(colors[1])} {...line} strokeWidth="1.5" />
      <circle cx="9" cy="-7" r="3.2" fill={c(colors[2])} {...line} strokeWidth="1.5" />
    </g>
  )
}

export function Sheep({ animated }) {
  return (
    <g>
      <Shadow rx={15} />
      <path d="M-9 -4 V1 M-2 -4 V1 M5 -4 V1 M11 -4 V1" {...line} strokeWidth="2.5" />
      <path
        d="M-12 -6 A6 6 0 0 1 -12 -18 A7 7 0 0 1 0 -22 A7 7 0 0 1 12 -18 A6 6 0 0 1 12 -6 A7 7 0 0 1 0 -3 A7 7 0 0 1 -12 -6 Z"
        fill={c('white')}
        {...line}
      />
      <g className={animated ? 'anim-sheep' : undefined} style={{ transformOrigin: '100% 60%', transformBox: 'fill-box' }}>
        <ellipse cx="-17" cy="-15" rx="6" ry="7" fill={c('muted')} {...line} />
        <circle cx="-19" cy="-16" r="1.2" fill={c('white')} />
      </g>
    </g>
  )
}

function House({ variant }) {
  const wall = c(variant % 2 ? 'map-brick' : 'map-stone')
  const roof = c(variant % 2 ? 'map-slate' : 'map-roof')
  return (
    <g>
      <Shadow rx={24} ry={5} dx={6} />
      {/* Mặt bên (tối hơn) và mặt trước */}
      <path d="M8 0 L26 -6 L26 -24 L8 -18 Z" fill={wall} {...line} />
      <path d="M8 0 L26 -6 L26 -24 L8 -18 Z" fill={INK} opacity="0.12" />
      <rect x="-20" y="-18" width="28" height="18" fill={wall} {...line} />
      <path d="M-23 -17 L-6 -36 L11 -17 Z" fill={roof} {...line} />
      <path d="M-6 -36 L14 -42 L29 -23 L11 -17 Z" fill={roof} {...line} />
      <rect x="15" y="-44" width="6" height="10" fill={wall} {...line} />
      <rect x="-9" y="-11" width="7" height="11" fill={c('map-wood')} {...line} strokeWidth="1.6" />
      <rect x="-17" y="-14" width="6" height="6" fill={c('map-fog')} {...line} strokeWidth="1.6" />
      <rect x="1" y="-14" width="5" height="6" fill={c('map-fog')} {...line} strokeWidth="1.6" />
    </g>
  )
}

function Postbox() {
  return (
    <g>
      <Shadow rx={8} />
      <path d="M-7 0 V-22 A7 7 0 0 1 7 -22 V0 Z" fill={c('uk-red')} {...line} />
      <path d="M-8 -22 H8" {...line} />
      <path d="M-4 -17 H4" stroke={INK} strokeWidth="2.2" strokeLinecap="round" />
      <rect x="-8" y="-3" width="16" height="3" fill={INK} />
    </g>
  )
}

function Booth() {
  return (
    <g>
      <Shadow rx={10} />
      <path d="M-9 0 V-30 Q-9 -36 0 -37 Q9 -36 9 -30 V0 Z" fill={c('uk-red')} {...line} />
      <rect x="-6" y="-26" width="12" height="20" fill={c('map-fog')} {...line} strokeWidth="1.6" />
      <path d="M0 -26 V-6 M-6 -19.5 H6 M-6 -13 H6" stroke={c('uk-red')} strokeWidth="1.6" />
      <rect x="-5" y="-33" width="10" height="3.5" fill={c('map-fog')} stroke={INK} strokeWidth="1.2" />
    </g>
  )
}

function Fence() {
  return (
    <g>
      <path d="M-30 -9 H30 M-30 -16 H30" stroke={INK} strokeWidth="5" strokeLinecap="round" />
      <path d="M-30 -9 H30 M-30 -16 H30" stroke={c('map-wood-light')} strokeWidth="2.5" strokeLinecap="round" />
      {[-28, -9, 10, 28].map((x) => (
        <rect key={x} x={x - 3} y="-22" width="6" height="22" rx="1.5" fill={c('map-wood')} {...line} strokeWidth="1.6" />
      ))}
    </g>
  )
}

const BUNTING = ['danger', 'gold', 'sky', 'accent', 'primary', 'orange']

function Bunting({ variant }) {
  const flags = [-26, -14, -2, 10, 22]
  return (
    <g>
      <Shadow rx={6} dx={-38} />
      <Shadow rx={6} dx={42} />
      <path d="M-40 0 V-40 M40 0 V-40" stroke={INK} strokeWidth="4.5" strokeLinecap="round" />
      <path d="M-40 0 V-40 M40 0 V-40" stroke={c('map-wood')} strokeWidth="2" strokeLinecap="round" />
      <path d="M-40 -38 Q0 -22 40 -38" fill="none" stroke={INK} strokeWidth="1.5" />
      {flags.map((x, i) => {
        const y = -38 + 16 * (1 - ((x / 40) ** 2)) * 0.95
        return <path key={x} d={`M${x - 5} ${y - 1} L${x + 5} ${y + 0.5} L${x} ${y + 11} Z`} fill={c(BUNTING[(i + variant) % BUNTING.length])} {...line} strokeWidth="1.4" />
      })}
    </g>
  )
}

function Palm() {
  return (
    <g>
      <Shadow rx={14} />
      <path d="M-2 0 Q-6 -20 2 -40" fill="none" stroke={INK} strokeWidth="7" strokeLinecap="round" />
      <path d="M-2 0 Q-6 -20 2 -40" fill="none" stroke={c('map-wood-light')} strokeWidth="3.5" strokeLinecap="round" />
      <path d="M2 -40 Q-14 -50 -24 -36 Q-12 -42 2 -40 Q-4 -56 10 -58 Q2 -48 2 -40 Q18 -52 26 -40 Q14 -44 2 -40 Z" fill={c('map-pine')} {...line} />
    </g>
  )
}

const SPRITES = { tree: TreeRound, pine: Pine, bush: Bush, flowers: Flowers, sheep: Sheep, house: House, postbox: Postbox, booth: Booth, fence: Fence, bunting: Bunting, palm: Palm }

/** Vật trang trí tĩnh, đặt trong SVG nền. */
export function Prop({ prop, scale }) {
  const Sprite = SPRITES[prop.kind]
  if (!Sprite) return null
  return (
    <g transform={`translate(${prop.x.toFixed(1)} ${prop.y.toFixed(1)}) scale(${prop.flip ? -scale : scale} ${scale})`}>
      <Sprite variant={prop.variant} />
    </g>
  )
}

/** Cánh đồng kẻ sọc như bàn cờ: 2×2 hoặc 3×2 ô ruộng, mỗi ô một tông, hàng rào quanh mép. */
export function Fields({ f }) {
  const cols = f.seed % 2 ? 3 : 2
  const rows = 2
  const w = f.w / cols
  const h = f.h / rows
  const fills = ['map-field', 'map-grass-deep', 'map-field-deep', 'map-grass-shade']
  return (
    <g transform={`translate(${f.x} ${f.y}) rotate(${f.rot})`}>
      <rect x={-f.w / 2 + 5} y={-f.h / 2 + 5} width={f.w} height={f.h} rx="8" fill={INK} opacity="0.14" />
      {Array.from({ length: cols * rows }, (_, i) => {
        const col = i % cols
        const row = Math.floor(i / cols)
        const x = -f.w / 2 + col * w
        const y = -f.h / 2 + row * h
        const vertical = (i + f.seed) % 2 === 0
        const fill = fills[(i + f.seed) % fills.length]
        const stripes = []
        for (let k = 7; k < (vertical ? w : h) - 3; k += 9) {
          stripes.push(vertical ? `M${x + k} ${y + 4} V${y + h - 4}` : `M${x + 4} ${y + k} H${x + w - 4}`)
        }
        return (
          <g key={i}>
            <rect x={x} y={y} width={w} height={h} fill={c(fill)} stroke={INK} strokeWidth="2" />
            <path d={stripes.join('')} stroke={INK} strokeWidth="1.2" opacity="0.18" />
          </g>
        )
      })}
      <rect x={-f.w / 2} y={-f.h / 2} width={f.w} height={f.h} rx="6" fill="none" stroke={INK} strokeWidth="2.4" />
    </g>
  )
}

/** Đồi nhấp nhô: khối tròn dẹt, sườn khuất sáng đậm hơn. */
export function Hill({ f }) {
  const rx = f.w / 2
  const ry = f.h / 2
  return (
    <g transform={`translate(${f.x} ${f.y})`}>
      <ellipse cx="5" cy="5" rx={rx} ry={ry} fill={INK} opacity="0.12" />
      <ellipse rx={rx} ry={ry} fill={c('map-grass-deep')} stroke={INK} strokeWidth="2" />
      <path d={`M${rx * 0.2} ${ry * 0.97} A${rx} ${ry} 0 0 0 ${rx} 0 A${rx * 0.75} ${ry * 0.75} 0 0 1 ${rx * 0.2} ${ry * 0.97} Z`} fill={c('map-grass-shade')} />
      <ellipse rx={rx} ry={ry} fill="none" stroke={INK} strokeWidth="2" />
      <path d={`M${-rx * 0.4} ${-ry * 0.2} l3 -6 l3 6 M${-rx * 0.1} ${ry * 0.25} l3 -6 l3 6 M${rx * 0.3} ${-ry * 0.4} l3 -6 l3 6`} fill="none" {...line} strokeWidth="1.6" opacity="0.5" />
    </g>
  )
}

/** Đường nhỏ cho xe buýt (phần tĩnh). */
export function Lane({ lane, mobile }) {
  const h = mobile ? 14 : 18
  return (
    <g transform={`translate(${lane.x - lane.w / 2} ${lane.y - h / 2})`}>
      <rect x="4" y="4" width={lane.w} height={h} rx={h / 2} fill={INK} opacity="0.14" />
      <rect width={lane.w} height={h} rx={h / 2} fill={c('map-road')} stroke={INK} strokeWidth="2" />
      <path d={`M${h} ${h / 2} H${lane.w - h}`} stroke={INK} strokeWidth="1.6" strokeDasharray="7 7" opacity="0.35" />
    </g>
  )
}

// ---------- Vật chuyển động: mỗi cái là một phần tử HTML riêng để trình duyệt tự tối ưu ----------

/** Xe buýt đỏ hai tầng chạy qua lại trên đường nhỏ (không logo, không chữ). */
export function Bus({ lane, mobile }) {
  const s = mobile ? 0.8 : 1
  const w = 56 * s
  return (
    <div
      className="pointer-events-none absolute"
      style={{ left: lane.x - lane.w / 2 + 6, top: lane.y - 40 * s, width: lane.w - 12, height: 44 * s }}
      aria-hidden="true"
    >
      <div className="anim-bus absolute bottom-0 left-0" style={{ '--run': `${lane.w - 12 - w}px`, width: w, height: 44 * s }}>
        <svg viewBox="0 0 56 44" width={w} height={44 * s} overflow="visible">
          <ellipse cx="30" cy="42" rx="26" ry="3" fill={INK} opacity="0.18" />
          <rect x="2" y="4" width="50" height="34" rx="6" fill={c('uk-red')} {...line} />
          <path d="M2 21 H52" {...line} />
          {[7, 18, 29, 40].map((x) => (
            <rect key={x} x={x} y="8" width="8" height="8" rx="1.5" fill={c('map-fog')} {...line} strokeWidth="1.5" />
          ))}
          {[7, 18, 29].map((x) => (
            <rect key={x} x={x} y="24" width="8" height="8" rx="1.5" fill={c('map-fog')} {...line} strokeWidth="1.5" />
          ))}
          <rect x="41" y="24" width="7" height="13" rx="1" fill={c('map-fog')} {...line} strokeWidth="1.5" />
          <circle cx="14" cy="38" r="5" fill={INK} />
          <circle cx="42" cy="38" r="5" fill={INK} />
          <circle cx="14" cy="38" r="2" fill={c('map-rock')} />
          <circle cx="42" cy="38" r="2" fill={c('map-rock')} />
        </svg>
      </div>
    </div>
  )
}

/** Thuyền buồm nhỏ nhấp nhô trên sông. */
export function Boat({ boat, mobile }) {
  const s = mobile ? 0.8 : 1
  return (
    <div className="pointer-events-none absolute" style={{ left: boat.x - 22 * s, top: boat.y - 40 * s, transform: boat.flip ? 'scaleX(-1)' : undefined }} aria-hidden="true">
      <svg viewBox="0 0 44 44" width={44 * s} height={44 * s} className="anim-bob" overflow="visible">
        <path d="M22 4 V30" {...line} />
        <path d="M23 6 L38 28 H23 Z" fill={c('map-fog')} {...line} />
        <path d="M21 10 L10 28 H21 Z" fill={c('gold')} {...line} />
        <path d="M4 31 H40 L34 40 H10 Z" fill={c('map-wood')} {...line} />
      </svg>
    </div>
  )
}

/** Mòng biển bay lượn, vỗ cánh. */
export function Gull({ gull }) {
  return (
    <div className="anim-gull pointer-events-none absolute" style={{ left: gull.x, top: gull.y, animationDelay: `${-gull.delay}s`, transform: gull.flip ? 'scaleX(-1)' : undefined }} aria-hidden="true">
      <svg viewBox="0 0 36 20" width="36" height="20" overflow="visible">
        <g className="anim-flap" style={{ animationDelay: `${-gull.delay}s` }}>
          <path d="M2 8 Q10 0 18 10 Q26 0 34 8 Q26 6 18 14 Q10 6 2 8 Z" fill={c('white')} {...line} strokeWidth="1.8" />
        </g>
        <ellipse cx="22" cy="19" rx="6" ry="1.6" fill={INK} opacity="0.1" />
      </svg>
    </div>
  )
}

/** Mây trắng phẳng; `rain` thêm vài giọt mưa lất phất. */
export function Cloud({ width = 120, rain = false, className, style }) {
  return (
    <svg viewBox="0 0 120 70" width={width} height={(width * 70) / 120} className={className} style={style} overflow="visible" aria-hidden="true">
      {rain && (
        <g className="anim-rain" stroke={c('sky')} strokeWidth="3" strokeLinecap="round">
          <path d="M34 52 l-3 9" />
          <path d="M56 56 l-3 9" style={{ animationDelay: '-0.4s' }} />
          <path d="M78 52 l-3 9" style={{ animationDelay: '-0.8s' }} />
          <path d="M92 58 l-3 9" style={{ animationDelay: '-0.2s' }} />
        </g>
      )}
      <path
        d="M22 50 H98 A15 15 0 0 0 96 20 A20 20 0 0 0 60 12 A18 18 0 0 0 28 24 A13 13 0 0 0 22 50 Z"
        transform="translate(4 4)"
        fill={INK}
        opacity="0.12"
      />
      <path
        d="M22 50 H98 A15 15 0 0 0 96 20 A20 20 0 0 0 60 12 A18 18 0 0 0 28 24 A13 13 0 0 0 22 50 Z"
        fill={rain ? c('map-rock') : c('white')}
        stroke={INK}
        strokeWidth="2.2"
        strokeLinejoin="round"
      />
      <path d="M40 26 Q46 20 54 22" fill="none" stroke={c('white')} strokeWidth="3" strokeLinecap="round" opacity="0.8" />
    </svg>
  )
}
