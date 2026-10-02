/*
 * Linh vật tạm (placeholder): khối tròn dễ thương có mắt, nhiều màu.
 * Sẽ được thay bằng linh vật do tác giả tự vẽ. `shadow` = false bỏ bóng dưới chân (khi màn gọi tự vẽ bóng riêng). `monster` vẽ thêm sừng, lông mày cau và răng (dùng cho Trận Boss).
 * `traits` tạo khác biệt giữa 100 linh vật: `top` (tai mèo, tai thỏ, tai gấu, ăng-ten, mầm lá, vương miện, tia sét, sừng, chỏm tóc),
 * `eyes` (tròn, cười híp, nháy mắt), `belly` (mảng bụng sáng). Hình bóng (`silhouette`) giữ nguyên dáng, kể cả phần trên đầu.
 */

// Thân khối, vị trí khuôn mặt và đỉnh đầu theo từng dáng
const SHAPES = {
  round: { body: <ellipse cx="60" cy="66" rx="46" ry="42" />, faceY: 62, topY: 26 },
  tall: { body: <rect x="26" y="14" width="68" height="94" rx="34" />, faceY: 52, topY: 16 },
  wide: { body: <rect x="10" y="36" width="100" height="68" rx="34" />, faceY: 66, topY: 38 },
  drop: { body: <path d="M60 10 C72 30 104 52 104 76 A44 34 0 0 1 16 76 C16 52 48 30 60 10 Z" />, faceY: 72, topY: 14 },
}

// Phần nằm sau thân (tai)
function BackTop({ top, t, fill }) {
  const common = { fill, stroke: 'var(--color-ink)', strokeWidth: 4, strokeLinejoin: 'round' }
  if (top === 'cat')
    return (
      <g {...common}>
        <path d={`M26 ${t + 18} L30 ${t - 14} L52 ${t + 4} Z`} />
        <path d={`M94 ${t + 18} L90 ${t - 14} L68 ${t + 4} Z`} />
      </g>
    )
  if (top === 'bunny')
    return (
      <g {...common}>
        <ellipse cx="44" cy={t - 8} rx="8" ry="20" transform={`rotate(-12 44 ${t - 8})`} />
        <ellipse cx="76" cy={t - 8} rx="8" ry="20" transform={`rotate(12 76 ${t - 8})`} />
      </g>
    )
  if (top === 'bear')
    return (
      <g {...common}>
        <circle cx="32" cy={t + 6} r="12" />
        <circle cx="88" cy={t + 6} r="12" />
      </g>
    )
  if (top === 'horns')
    return (
      <g {...common} fill={fill === 'var(--color-ink)' ? fill : 'var(--color-surface)'}>
        <path d={`M34 ${t + 14} L26 ${t - 14} L50 ${t + 4} Z`} />
        <path d={`M86 ${t + 14} L94 ${t - 14} L70 ${t + 4} Z`} />
      </g>
    )
  return null
}

// Phần nằm trên thân (ăng-ten, mầm lá, vương miện, tia sét, chỏm tóc)
function FrontTop({ top, t, silhouette }) {
  const ink = 'var(--color-ink)'
  const paint = (token) => (silhouette ? ink : `var(--color-${token})`)
  const common = { stroke: ink, strokeWidth: 3.5, strokeLinejoin: 'round', strokeLinecap: 'round' }
  if (top === 'antenna')
    return (
      <g {...common}>
        <path d={`M60 ${t + 4} Q54 ${t - 8} 62 ${t - 16}`} fill="none" />
        <circle cx="62" cy={t - 19} r="6" fill={paint('gold')} />
      </g>
    )
  if (top === 'leaf')
    return (
      <g {...common}>
        <path d={`M60 ${t + 4} L60 ${t - 8}`} fill="none" />
        <path d={`M60 ${t - 8} C50 ${t - 22} 38 ${t - 14} 42 ${t - 6} C48 ${t - 2} 56 ${t - 4} 60 ${t - 8} Z`} fill={paint('accent')} />
        <path d={`M60 ${t - 8} C68 ${t - 20} 80 ${t - 16} 78 ${t - 8} C74 ${t - 2} 66 ${t - 4} 60 ${t - 8} Z`} fill={paint('accent')} />
      </g>
    )
  if (top === 'crown')
    return <path {...common} d={`M42 ${t + 4} L40 ${t - 16} L50 ${t - 6} L60 ${t - 20} L70 ${t - 6} L80 ${t - 16} L78 ${t + 4} Z`} fill={paint('gold')} />
  if (top === 'bolt')
    return <path {...common} d={`M64 ${t - 22} L50 ${t - 2} L60 ${t - 2} L54 ${t + 12} L72 ${t - 8} L62 ${t - 8} L68 ${t - 22} Z`} fill={paint('gold')} />
  if (top === 'tuft')
    return <path {...common} d={`M52 ${t + 4} Q48 ${t - 10} 58 ${t - 12} M60 ${t + 2} Q62 ${t - 14} 70 ${t - 10}`} fill="none" strokeWidth="4" />
  return null
}

function Eyes({ eyes, y }) {
  const ink = 'var(--color-ink)'
  const arc = (cx) => <path d={`M${cx - 7} ${y + 2} Q${cx} ${y - 8} ${cx + 7} ${y + 2}`} fill="none" stroke={ink} strokeWidth="4" strokeLinecap="round" />
  const open = (cx) => (
    <>
      <ellipse cx={cx} cy={y} rx="6.5" ry="8.5" fill={ink} />
      <circle cx={cx + 2.5} cy={y - 3} r="2.4" fill="var(--color-white)" />
    </>
  )
  if (eyes === 'happy') return <>{arc(46)}{arc(74)}</>
  if (eyes === 'wink') return <>{open(46)}{arc(74)}</>
  return <>{open(46)}{open(74)}</>
}

export default function MascotBlob({ color = 'primary', shape = 'round', size = 96, silhouette = false, monster = false, shadow = true, traits, className }) {
  const s = SHAPES[shape] ?? SHAPES.round
  const fill = silhouette ? 'var(--color-ink)' : `var(--color-${color})`
  const y = s.faceY
  const top = monster ? 'horns' : traits?.top

  return (
    <svg viewBox="0 0 120 120" width={size} height={size} className={className} aria-hidden="true" overflow="visible">
      {/* Bóng dưới chân */}
      {shadow && <ellipse cx="60" cy="112" rx="34" ry="5" fill="var(--color-ink)" opacity="0.15" />}
      <BackTop top={top} t={s.topY} fill={fill} />
      <g fill={fill} stroke="var(--color-ink)" strokeWidth="4" strokeLinejoin="round">
        {s.body}
      </g>
      <FrontTop top={top} t={s.topY} silhouette={silhouette} />
      {!silhouette && (
        <g>
          {traits?.belly && <ellipse cx="60" cy={y + 30} rx="22" ry="12" fill="var(--color-white)" opacity="0.45" />}
          {/* Má hồng */}
          <ellipse cx="36" cy={y + 12} rx="7" ry="4.5" fill="var(--color-danger)" opacity="0.55" />
          <ellipse cx="84" cy={y + 12} rx="7" ry="4.5" fill="var(--color-danger)" opacity="0.55" />
          {monster ? (
            <>
              <Eyes y={y} />
              {/* Lông mày cau và miệng nhe răng */}
              <path d={`M36 ${y - 16} L54 ${y - 9}`} stroke="var(--color-ink)" strokeWidth="4.5" strokeLinecap="round" />
              <path d={`M84 ${y - 16} L66 ${y - 9}`} stroke="var(--color-ink)" strokeWidth="4.5" strokeLinecap="round" />
              <path
                d={`M46 ${y + 12} Q60 ${y + 24} 74 ${y + 12} Z`}
                fill="var(--color-ink)"
                stroke="var(--color-ink)"
                strokeWidth="3"
                strokeLinejoin="round"
              />
              <path d={`M52 ${y + 13} l3 5 l3 -5 M62 ${y + 13} l3 5 l3 -5`} fill="var(--color-white)" />
            </>
          ) : (
            <>
              <Eyes eyes={traits?.eyes} y={y} />
              <path
                d={`M54 ${y + 12} Q60 ${y + 18} 66 ${y + 12}`}
                fill="none"
                stroke="var(--color-ink)"
                strokeWidth="3.5"
                strokeLinecap="round"
              />
            </>
          )}
        </g>
      )}
    </svg>
  )
}
