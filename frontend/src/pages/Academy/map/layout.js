/*
 * Tính bố cục tấm bản đồ hành trình: tọa độ trạm, địa danh, con đường, sông, sương mù và vật trang trí.
 *
 * Hành trình đi từ DƯỚI LÊN TRÊN. Mọi tọa độ trước hết tính theo khoảng cách từ đáy (`b`), cuối cùng đổi sang `y`
 * tính từ đỉnh để vẽ. Con đường là đường cong Catmull-Rom đi qua tâm các trạm, được lấy mẫu thành polyline
 * để đặt dấu chân, tìm vị trí nhà du hành khi đi bộ và tránh đặt cây cối đè lên đường.
 * Vật trang trí rải ngẫu nhiên nhưng cố định theo hạt giống (mã cấp), nên bản đồ không đổi giữa các lần mở.
 */

export const SIZES = {
  desktop: { lesson: 80, checkpoint: 96, boss: 160, landmark: 210, gap: 118, amp: 170, road: 30, ribbon: 240, prop: 1, cell: 78, river: 58 },
  mobile: { lesson: 68, checkpoint: 80, boss: 128, landmark: 140, gap: 108, amp: 108, road: 24, ribbon: 176, prop: 0.8, cell: 66, river: 46 },
}

// Độ lệch ngang của các bài trong chặng (bội số biên độ, dấu dương = cùng phía địa danh của chặng)
const PATTERNS = {
  3: [0.75, -0.2, -0.85],
  4: [0.75, -0.25, -0.9, -0.1],
  5: [0.75, -0.15, -0.9, -0.35, 0.45],
  6: [0.75, 0.05, -0.8, -0.6, 0.2, -0.2],
}

// Bộ sinh số ngẫu nhiên có hạt giống (mulberry32)
export function seeded(seed) {
  let a = typeof seed === 'string' ? [...seed].reduce((h, c) => Math.imul(h ^ c.charCodeAt(0), 2654435761), 1779033703) : seed
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Lấy mẫu đường cong Catmull-Rom đi qua các điểm; trả polyline kèm độ dài tích lũy và vị trí từng điểm điều khiển. */
function sampleSpline(points, step = 6) {
  const out = []
  const at = [] // độ dài tại từng điểm điều khiển
  let len = 0
  const push = (x, y) => {
    const prev = out.at(-1)
    if (prev) len += Math.hypot(x - prev.x, y - prev.y)
    out.push({ x, y, len })
  }
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i - 1] ?? points[i]
    const p1 = points[i]
    const p2 = points[i + 1]
    const p3 = points[i + 2] ?? p2
    if (i === 0) push(p1.x, p1.y)
    at[i] = len
    const n = Math.max(4, Math.ceil(Math.hypot(p2.x - p1.x, p2.y - p1.y) / step))
    for (let k = 1; k <= n; k++) {
      const t = k / n
      const t2 = t * t
      const t3 = t2 * t
      const f = (a, b, c, d) => 0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3)
      push(f(p0.x, p1.x, p2.x, p3.x), f(p0.y, p1.y, p2.y, p3.y))
    }
  }
  at[points.length - 1] = len
  return { points: out, at, length: len }
}

/** Điểm và hướng trên polyline tại độ dài `len`. */
export function pointAt(road, len) {
  const pts = road.points
  const target = Math.max(0, Math.min(len, road.length))
  let lo = 0
  let hi = pts.length - 1
  while (lo < hi - 1) {
    const mid = (lo + hi) >> 1
    if (pts[mid].len < target) lo = mid
    else hi = mid
  }
  const a = pts[lo]
  const b = pts[hi]
  const t = b.len === a.len ? 0 : (target - a.len) / (b.len - a.len)
  return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t, angle: Math.atan2(b.y - a.y, b.x - a.x) }
}

export function polylinePath(points) {
  return points.map((p, i) => `${i ? 'L' : 'M'}${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join('')
}

// Khoảng cách từ điểm tới polyline (dùng khi rải vật trang trí)
function nearRoad(road, x, y, d) {
  const d2 = d * d
  for (const p of road.points) {
    const dx = p.x - x
    const dy = p.y - y
    if (dx * dx + dy * dy < d2) return true
  }
  return false
}

/** Chỗ đứng của nhà du hành cạnh một trạm. */
export function travelerSpot(node, cx) {
  const dirIn = node.x >= cx ? -1 : 1
  return { x: node.x + dirIn * (node.size / 2 + 40), y: node.y + node.size / 2 - 2, len: node.len, dir: dirIn }
}

/**
 * @param map dữ liệu từ getLevelMap
 * @param opts { width, roadLeft, roadRight, mobile, topPad, bottomPad, theme }
 */
export function buildLayout(map, { width, roadLeft, roadRight, mobile, topPad, bottomPad, theme }) {
  const S = mobile ? SIZES.mobile : SIZES.desktop
  const cx = (roadLeft + roadRight) / 2
  const A = Math.min(S.amp, (roadRight - roadLeft) / 2 - S.lesson / 2 - 16)
  const waypoints = []
  const nodes = []
  const landmarks = []
  const rng = seeded(`${map.level.code}-${mobile ? 'm' : 'd'}`)

  let b = bottomPad
  waypoints.push({ x: cx + A * 0.35, b: -60 })
  let river = null

  map.stages.forEach((stage, s) => {
    const side = s % 2 === 0 ? 1 : -1
    const pattern = PATTERNS[stage.lessons.length] ?? PATTERNS[4]
    stage.lessons.forEach((lesson, l) => {
      b += l === 0 && s === 0 ? 0 : S.gap
      const node = { kind: 'lesson', stage, item: lesson, status: lesson.status, x: cx + side * pattern[l] * A, b, size: S.lesson }
      nodes.push(node)
      waypoints.push(node)
    })
    b += S.gap * 1.08
    const cp = { kind: 'checkpoint', stage, item: stage.checkpoint, status: stage.checkpoint.status, x: cx - side * 0.3 * A, b, size: S.checkpoint }
    nodes.push(cp)
    waypoints.push(cp)

    // Địa danh đứng trên bệ đảo phía sau trạm kiểm tra; đường vòng qua phía đối diện
    const lb = b + (mobile ? 46 : 58)
    landmarks.push({ stage, side, x: cx + side * (mobile ? 0.95 : 0.92) * A, b: lb, size: S.landmark })
    waypoints.push({ x: cx - side * 1.05 * A, b: lb + S.landmark * 0.5 })
    b = lb + S.landmark + (mobile ? 26 : 34)

    // Dòng sông chảy ngang giữa chặng 1 và chặng 2, đường vượt sông bằng cầu
    if (s === 0 && map.stages.length > 1) {
      river = { b: b + S.river / 2 + 18 }
      b += S.river + 44
    }
  })

  // Trận Boss: con đường dừng ở cầu tàu bên hồ, trạm Boss nổi trên bè giữa hồ; sau hồ là sân bay tới cấp kế tiếp
  const pier = { x: cx, b: b + S.gap * 0.55 }
  waypoints.push(pier)
  // B1: trạm Boss nổi trên bè giữa hồ. Cấp có tranh đảo Boss riêng (Hạ Long, Cầu Vàng): đảo lớn gấp 1.5 lần đứng sau trạm.
  const islandBoss = map.boss.scene === 'island'
  const lake = { cx, b: pier.b + (mobile ? 118 : 150), rx: Math.min((roadRight - roadLeft) / 2 - 8, mobile ? 186 : 380), ry: mobile ? 128 : 160 }
  const boss = { kind: 'boss', item: map.boss, status: map.boss.status, x: cx, b: pier.b + (islandBoss ? S.boss * 0.5 + 6 : mobile ? 108 : 140), size: S.boss }
  nodes.push(boss)
  const bossIsland = islandBoss ? { x: cx, b: boss.b + S.boss / 2 + 16, px: S.landmark, art: S.landmark * 1.5 } : null
  const airport = { x: cx, b: islandBoss ? bossIsland.b + bossIsland.art * 0.93 + (mobile ? 96 : 116) : lake.b + lake.ry + (mobile ? 118 : 130) }
  const height = airport.b + (mobile ? 90 : 110) + topPad
  const bossBottom = pier.b - 20

  const toY = (v) => height - v
  const pts = waypoints.map((p) => ({ x: p.x, y: toY(p.b) }))
  const road = sampleSpline(pts)
  const idx = new Map(waypoints.map((w, i) => [w, i]))
  nodes.forEach((n) => {
    n.y = toY(n.b)
    n.len = n.kind === 'boss' ? road.length + (n.b - pier.b) : road.at[idx.get(n)]
  })
  landmarks.forEach((lm) => {
    lm.y = toY(lm.b)
    lm.ribbonY = lm.y + lm.size * 0.19 // băng rôn cắm trước bệ đảo
  })

  // Sương mù: bắt đầu giữa trạm hiện tại và trạm kế tiếp
  const pathNodes = nodes.filter((n) => n.kind !== 'boss')
  const currentIndex = pathNodes.findIndex((n) => n.status === 'current')
  const current = pathNodes[currentIndex] ?? null
  const next = pathNodes[currentIndex + 1] ?? boss
  const fogY = current ? (current.y + next.y) / 2 : null

  // Sông: đường cong ngang, uốn lượn; cầu ở chỗ cắt con đường
  let riverPath = null
  let bridge = null
  if (river) {
    const ry = toY(river.b)
    const rpts = []
    for (let x = -40; x <= width + 40; x += 40) rpts.push({ x, y: ry + Math.sin(x / 150 + 1.3) * (mobile ? 16 : 26) })
    riverPath = sampleSpline(rpts, 10)
    let best = null
    for (const p of road.points) {
      const d = Math.abs(p.y - (ry + Math.sin(p.x / 150 + 1.3) * (mobile ? 16 : 26)))
      if (!best || d < best.d) best = { ...p, d }
    }
    bridge = best && pointAt(road, best.len) && { ...pointAt(road, best.len), len: best.len }
  }

  // Nhà du hành đứng cạnh trạm hiện tại, lệch về phía giữa bản đồ
  const traveler = current ? travelerSpot(current, cx) : null

  // Biển chỉ đường gỗ (chỉ desktop) ở phía ngoài của mỗi bài học
  // Nếu phía ngoài không đủ chỗ thì đặt biển sang phía trong (phía trong của bài đang học là chỗ nhà du hành đứng)
  const signs = mobile
    ? []
    : nodes
        .filter((n) => n.kind === 'lesson')
        .map((n) => {
          const w = Math.min(176, `Bài ${n.item.number} · ${n.item.title}`.length * 7.2 + 20) + 30
          let dir = n.x >= cx ? 1 : -1
          const fits = (d) => (d > 0 ? n.x + n.size / 2 + 16 + w < roadRight - 4 : n.x - n.size / 2 - 16 - w > roadLeft + 4)
          if (!fits(dir)) dir = -dir
          if (!fits(dir)) return null
          // Biển nằm phía trong trùng chỗ nhà du hành: ẩn khi bài đó đang học (vẫn giữ chỗ để bản đồ không đổi)
          const hidden = dir === (n.x >= cx ? -1 : 1) && n.status === 'current'
          return { node: n, dir, hidden, x: n.x + dir * (n.size / 2 + 16), y: n.y }
        })
        .filter(Boolean)

  // ------- Vật trang trí -------
  const obstacles = []
  const block = (x, y, w, h) => obstacles.push({ x0: x - w / 2, x1: x + w / 2, y0: y - h / 2, y1: y + h / 2 })
  nodes.forEach((n) => block(n.x, n.y, n.size + 40, n.size + 56))
  landmarks.forEach((lm) => {
    block(lm.x, lm.y - lm.size / 2 + 10, lm.size + 50, lm.size + 50)
    block(lm.x, lm.ribbonY + 38, S.ribbon + 20, 90)
  })
  signs.forEach((sg) => block(sg.x + sg.dir * 100, sg.y, 210, 76))
  // Chừa chỗ phía trong mỗi bài cho nhà du hành (không phụ thuộc tiến độ để bản đồ không đổi khi mở trạm mới)
  nodes.forEach((n) => {
    if (n.kind !== 'lesson') return
    const dirIn = n.x >= cx ? -1 : 1
    block(n.x + dirIn * (n.size / 2 + 40), n.y + 6, 100, n.size + 60)
  })
  const bossZoneY = toY(bossBottom)
  const inBoss = (y) => y < bossZoneY + 30
  const blocked = (x, y, r) =>
    obstacles.some((o) => x + r > o.x0 && x - r < o.x1 && y + r > o.y0 && y - r < o.y1) ||
    nearRoad(road, x, y, S.road / 2 + r + 6) ||
    (riverPath && nearRoad(riverPath, x, y, S.river / 2 + r + 4))

  const features = []
  // Mảng lớn trước: cánh đồng kẻ sọc, đồi, đường nhỏ có xe buýt
  const bigCount = Math.round((height / 1000) * (mobile ? 2.2 : 5))
  for (let i = 0, tries = 0; i < bigCount && tries < bigCount * 30; tries++) {
    const kind = rng() < 0.55 ? 'fields' : 'hill'
    const w = (kind === 'fields' ? 170 : 190) * S.prop
    const h = (kind === 'fields' ? 112 : 84) * S.prop
    const x = rng() * width
    const y = rng() * height
    if (inBoss(y) || y > height - 20) continue
    if (blocked(x, y, Math.max(w, h) / 2)) continue
    features.push({ kind, x, y, w, h, rot: (rng() - 0.5) * 16, seed: Math.floor(rng() * 1000) })
    block(x, y, w, h)
    i++
  }

  const lanes = []
  if (theme === 'uk') {
    for (let tries = 0; lanes.length < (mobile ? 1 : 3) && tries < 300; tries++) {
      const w = (mobile ? 190 : 250)
      const x = rng() * width
      const y = height * 0.35 + rng() * height * 0.6
      if (inBoss(y) || x - w / 2 < 0 || x + w / 2 > width) continue
      if (blocked(x, y, 0) || obstacles.some((o) => x + w / 2 > o.x0 && x - w / 2 < o.x1 && y + 26 > o.y0 && y - 26 < o.y1)) continue
      if (nearRoad(road, x - w / 2, y, S.road) || nearRoad(road, x + w / 2, y, S.road) || nearRoad(road, x, y, S.road + 10)) continue
      lanes.push({ x, y, w })
      block(x, y, w + 20, 60)
    }
  }

  // Vật nhỏ rải theo lưới có nhiễu
  const WEIGHTS =
    theme === 'uk'
      ? { tree: 6, pine: 4, bush: 3, flowers: 2, sheep: 4, house: 2.4, postbox: 1, booth: 1, fence: 2, bunting: 1.2 }
      : { tree: 6, pine: 3, bush: 3, flowers: 3, house: 2.4, fence: 2, bunting: 1.2, palm: 2 }
  const RADIUS = { tree: 24, pine: 20, bush: 14, flowers: 14, sheep: 18, house: 30, postbox: 12, booth: 14, fence: 34, bunting: 46, palm: 22 }
  const total = Object.values(WEIGHTS).reduce((a, v) => a + v, 0)
  const pick = () => {
    let r = rng() * total
    for (const [k, v] of Object.entries(WEIGHTS)) {
      r -= v
      if (r <= 0) return k
    }
    return 'tree'
  }
  const props = []
  const cell = S.cell
  for (let y = cell / 2; y < height; y += cell) {
    for (let x = cell / 2; x < width; x += cell) {
      if (rng() < 0.18) continue
      const kind = pick()
      const px = x + (rng() - 0.5) * cell * 0.8
      const py = y + (rng() - 0.5) * cell * 0.8
      const r = RADIUS[kind] * S.prop
      if (inBoss(py) || py > height - 10 || py < 0) continue
      if (blocked(px, py, r)) continue
      if (props.some((p) => Math.hypot(p.x - px, p.y - py) < (p.r + r) * 0.9)) continue
      props.push({ kind, x: px, y: py, r, flip: rng() < 0.5, variant: Math.floor(rng() * 4), animated: kind === 'sheep' && rng() < 0.45 })
    }
  }

  // Thuyền trên sông, mòng biển bay
  const boats = []
  if (riverPath) {
    for (let tries = 0; boats.length < (mobile ? 1 : 2) && tries < 40; tries++) {
      const p = riverPath.points[Math.floor(rng() * riverPath.points.length)]
      if (p.x < 40 || p.x > width - 40 || Math.abs(p.x - bridge.x) < 120 || boats.some((bo) => Math.abs(bo.x - p.x) < 200)) continue
      boats.push({ x: p.x, y: p.y, flip: rng() < 0.5 })
    }
  }
  const gulls = []
  const gullCount = Math.round((height / 1000) * (mobile ? 1.2 : 2))
  for (let i = 0; i < gullCount; i++) gulls.push({ x: 30 + rng() * (width - 60), y: 80 + rng() * (height - 160), delay: rng() * 6, flip: rng() < 0.5 })

  // Mây tiền cảnh (parallax), một vài đám có mưa lất phất
  const clouds = []
  const cloudCount = Math.round((height / 1000) * (mobile ? 1.6 : 2.4))
  for (let i = 0; i < cloudCount; i++) {
    const edge = rng() < 0.5
    clouds.push({
      x: edge ? rng() * (width * 0.22) : width * 0.78 + rng() * width * 0.22,
      y: (i + rng() * 0.8) * (height * 1.2 / cloudCount),
      scale: (0.7 + rng() * 0.6) * (mobile ? 0.75 : 1),
      rain: theme === 'uk' && rng() < 0.3,
      delay: -rng() * 14,
    })
  }

  return {
    width,
    height,
    cx,
    amp: A,
    sizes: S,
    mobile,
    nodes,
    landmarks,
    road,
    fogY,
    bossZoneY,
    lake: islandBoss ? null : { ...lake, y: toY(lake.b) },
    bossIsland: bossIsland && { ...bossIsland, y: toY(bossIsland.b) },
    pier: { x: pier.x, y: toY(pier.b) },
    airport: { ...airport, y: toY(airport.b) },
    river: riverPath,
    bridge,
    traveler,
    signs: signs.filter((sg) => !sg.hidden),
    features,
    lanes,
    props,
    boats,
    gulls,
    clouds,
    current,
  }
}
