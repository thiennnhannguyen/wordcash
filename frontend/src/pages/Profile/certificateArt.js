/*
 * Vẽ THẺ CHỨNG NHẬN rank thành ảnh PNG (poster để chia sẻ mạng xã hội).
 *
 * Hai khổ: "post" 1080×1350 và "story" 1080×1920. Thẻ màu chủ đạo của rank, họa tiết hình học phẳng,
 * viền mực dày và bóng cứng, đặt trên nền kem. Nội dung: logo và "CHỨNG NHẬN RANK", huy hiệu rank cực lớn,
 * tên rank và "Rank 5/8", họ tên, số từ đã thuộc trên dải highlighter xanh chanh, 3 chỉ số nhỏ,
 * linh vật đại diện trong khung độ hiếm (góc dưới trái), mã QR tới hồ sơ (góc dưới phải), ngày đạt, mã chứng nhận, tagline.
 * Rank càng cao thẻ càng lộng lẫy: Tân Binh chấm tròn đơn giản → … → Huyền Thoại nền cầu vồng, ánh kim, góc viền vàng.
 * Màu lấy từ token, không hard-code.
 */

import { RANKS } from '../../utils/constants'
import { block, drawMascotCard, drawQr, fitFont, loadFonts, mascotImage, resolveVars, roundRect, sparkle, strokedText, token } from '../../utils/canvasArt'
import { formatDate, formatNumber } from '../../utils/format'

export const FORMATS = {
  post: { w: 1080, h: 1350, label: 'Bài đăng' },
  story: { w: 1080, h: 1920, label: 'Story' },
}

const LAYOUT = {
  post: { logo: 124, sub: 188, shield: 418, shieldSize: 300, rankName: 700, rankFont: 116, pill: 760, name: 862, nameFont: 62, hl: 944, chips: 1022, mascotY: 1052, mascotW: 176, qr: 150, qrY: 1066, date: 1106, code: 1154, tagline: 1222 },
  story: { logo: 168, sub: 238, shield: 596, shieldSize: 400, rankName: 972, rankFont: 150, pill: 1046, name: 1176, nameFont: 72, hl: 1270, chips: 1366, mascotY: 1488, mascotW: 250, qr: 210, qrY: 1512, date: 1560, code: 1614, tagline: 1740 },
}

const SHIELD = 'M50 4 L90 18 L90 52 C90 76 72 92 50 100 C28 92 10 76 10 52 L10 18 Z'
const STAR = 'M50 30 L56.5 43.5 L71 45.5 L60.5 55.5 L63 70 L50 63 L37 70 L39.5 55.5 L29 45.5 L43.5 43.5 Z'
const RAINBOW = ['danger', 'gold', 'accent', 'sky', 'primary']

function rainbow(ctx, x0, y0, x1, y1) {
  const g = ctx.createLinearGradient(x0, y0, x1, y1)
  RAINBOW.forEach((c, i) => g.addColorStop(i / (RAINBOW.length - 1), token(c)))
  return g
}

// Họa tiết nền theo bậc rank (0 Tân Binh … 7 Huyền Thoại)
function pattern(ctx, tier, x, y, w, h) {
  const white = token('white')
  const ink = token('ink')
  ctx.save()
  if (tier === 0) {
    ctx.fillStyle = white
    ctx.globalAlpha = 0.28
    for (let py = y + 30; py < y + h; py += 56) for (let px = x + 30; px < x + w; px += 56) {
      ctx.beginPath()
      ctx.arc(px, py, 5, 0, Math.PI * 2)
      ctx.fill()
    }
  } else if (tier === 1) {
    ctx.strokeStyle = white
    ctx.globalAlpha = 0.2
    ctx.lineWidth = 18
    for (let i = -h; i < w + h; i += 64) {
      ctx.beginPath()
      ctx.moveTo(x + i, y)
      ctx.lineTo(x + i + h, y + h)
      ctx.stroke()
    }
  } else if (tier === 2) {
    ctx.fillStyle = white
    ctx.globalAlpha = 0.3
    for (let py = y; py < y + h; py += 70) for (let px = x + ((py / 70) % 2) * 35; px < x + w; px += 70) {
      ctx.beginPath()
      ctx.moveTo(px, py + 14)
      ctx.lineTo(px + 12, py + 34)
      ctx.lineTo(px - 12, py + 34)
      ctx.closePath()
      ctx.fill()
    }
  } else if (tier === 3 || tier === 4) {
    // Vàng: chấm tròn; Bạch Kim: kim cương nhỏ
    for (let py = y + 20; py < y + h; py += 60) for (let px = x + 20 + ((py / 60) % 2) * 30; px < x + w; px += 60) {
      ctx.globalAlpha = 0.35
      ctx.fillStyle = white
      ctx.beginPath()
      if (tier === 3) ctx.arc(px, py, 6, 0, Math.PI * 2)
      else {
        ctx.moveTo(px, py - 10)
        ctx.lineTo(px + 7, py)
        ctx.lineTo(px, py + 10)
        ctx.lineTo(px - 7, py)
        ctx.closePath()
      }
      ctx.fill()
    }
  } else if (tier === 5) {
    // Kim Cương: mặt cắt đá quý
    const cols = 6
    const cw = w / cols
    for (let r = 0; r * cw < h + cw; r++) for (let c = 0; c < cols; c++) {
      const px = x + c * cw
      const py = y + r * cw
      ctx.globalAlpha = (r + c) % 3 === 0 ? 0.16 : 0.08
      ctx.fillStyle = (r + c) % 2 ? white : ink
      ctx.beginPath()
      ctx.moveTo(px, py)
      ctx.lineTo(px + cw, py + cw / 2)
      ctx.lineTo(px, py + cw)
      ctx.closePath()
      ctx.fill()
    }
  } else {
    // Cao Thủ / Huyền Thoại: trời sao
    for (let i = 0; i < 70; i++) {
      const a = Math.sin(i * 12.9898) * 43758.5453
      const b = Math.sin(i * 78.233) * 12345.678
      const px = x + (a - Math.floor(a)) * w
      const py = y + (b - Math.floor(b)) * h
      ctx.globalAlpha = 0.5
      sparkle(ctx, px, py, 6 + (i % 4) * 3, white, 0)
    }
  }
  ctx.restore()
}

function rays(ctx, cx, cy, radius, color, alpha, count = 18) {
  ctx.save()
  ctx.translate(cx, cy)
  ctx.globalAlpha = alpha
  ctx.fillStyle = color
  for (let i = 0; i < count; i++) {
    ctx.rotate((Math.PI * 2) / count)
    ctx.beginPath()
    ctx.moveTo(0, 0)
    ctx.lineTo(-radius * 0.09, -radius)
    ctx.lineTo(radius * 0.09, -radius)
    ctx.fill()
  }
  ctx.restore()
}

function drawShield(ctx, rankKey, tier, cx, cy, size) {
  const ink = token('ink')
  const R = size * 0.62
  // Huy chương tròn làm nền cho khiên
  ctx.save()
  ctx.fillStyle = ink
  ctx.beginPath()
  ctx.arc(cx + 12, cy + 12, R, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = token('white')
  ctx.beginPath()
  ctx.arc(cx, cy, R, 0, Math.PI * 2)
  ctx.fill()
  ctx.lineWidth = 12
  ctx.strokeStyle = tier === 7 ? rainbow(ctx, cx - R, cy - R, cx + R, cy + R) : ink
  if (tier === 7) ctx.lineWidth = 22
  ctx.stroke()
  if (tier === 7) {
    ctx.lineWidth = 6
    ctx.strokeStyle = ink
    ctx.beginPath()
    ctx.arc(cx, cy, R + 12, 0, Math.PI * 2)
    ctx.stroke()
  }
  ctx.setLineDash([14, 12])
  ctx.lineWidth = 4
  ctx.strokeStyle = ink
  ctx.globalAlpha = 0.35
  ctx.beginPath()
  ctx.arc(cx, cy, R - 26, 0, Math.PI * 2)
  ctx.stroke()
  ctx.restore()

  // Khiên (toạ độ gốc 100×106)
  const k = (size * 0.86) / 100
  const rank = RANKS.find((r) => r.key === rankKey)
  ctx.save()
  ctx.translate(cx - 50 * k, cy - 55 * k)
  ctx.scale(k, k)
  const shield = new Path2D(SHIELD)
  ctx.save()
  ctx.translate(5, 5)
  ctx.fillStyle = ink
  ctx.fill(shield)
  ctx.restore()
  ctx.fillStyle = tier === 7 ? rainbow(ctx, 10, 4, 90, 100) : resolveVars(rank.color)
  ctx.fill(shield)
  ctx.lineWidth = 5
  ctx.lineJoin = 'round'
  ctx.strokeStyle = ink
  ctx.stroke(shield)
  ctx.globalAlpha = 0.35
  ctx.fillStyle = token('white')
  ctx.fill(new Path2D('M22 24 L42 17 L30 62 C24 56 22 50 22 44 Z'))
  ctx.globalAlpha = 1
  const starPath = new Path2D(STAR)
  ctx.fillStyle = tier >= 3 ? token('gold') : token('white')
  if (tier === 3) ctx.fillStyle = token('white')
  ctx.fill(starPath)
  ctx.lineWidth = 4
  ctx.stroke(starPath)
  ctx.restore()
}

function chip(ctx, x, cy, text, dot) {
  ctx.font = '700 30px "Chakra Petch"'
  const w = ctx.measureText(text).width + 78
  block(ctx, x, cy - 30, w, 60, 30, token('white'), { shadow: 6, line: 5 })
  ctx.fillStyle = dot
  ctx.beginPath()
  ctx.arc(x + 32, cy, 12, 0, Math.PI * 2)
  ctx.fill()
  ctx.lineWidth = 4
  ctx.strokeStyle = token('ink')
  ctx.stroke()
  ctx.fillStyle = token('ink')
  ctx.textAlign = 'left'
  ctx.textBaseline = 'middle'
  ctx.fillText(text, x + 56, cy + 2)
  return w
}

function chipWidth(ctx, text) {
  ctx.font = '700 30px "Chakra Petch"'
  return ctx.measureText(text).width + 78
}

/**
 * @param cert { fullName, handle, rank, words, achievedAt, code?, streak, level?, mascots, mascot }
 *   Thẻ thật vẽ từ GET /me/profile: `achievedAt` là ngày đạt LẦN ĐẦU rank hiện tại (sổ spin_grants; null với Tân Binh → bỏ dòng
 *   ngày), không có mã chứng nhận (`code` chỉ có ở dữ liệu mẫu trang dev); `level` null thì bỏ chip cấp độ.
 * @param format "post" | "story"
 * @param scale thu nhỏ khi chỉ cần ảnh xem trước (vd. 0.4 cho lưới 8 thẻ)
 */
export async function drawCertificate(cert, format = 'post', scale = 1) {
  await loadFonts()
  const { w: W, h: H } = FORMATS[format]
  const L = LAYOUT[format]
  const tier = RANKS.findIndex((r) => r.key === cert.rank)
  const rank = RANKS[tier]
  const ink = token('ink')
  const img = await mascotImage(cert.mascot)

  const canvas = document.createElement('canvas')
  canvas.width = Math.round(W * scale)
  canvas.height = Math.round(H * scale)
  const ctx = canvas.getContext('2d')
  ctx.scale(scale, scale)

  // Nền kem chấm nhỏ
  ctx.fillStyle = token('bg')
  ctx.fillRect(0, 0, W, H)
  ctx.fillStyle = token('neutral')
  for (let y = 16; y < H; y += 32) for (let x = 16; x < W; x += 32) ctx.fillRect(x, y, 3, 3)

  // Thẻ
  const x0 = 40
  const y0 = 40
  const cw = W - 100
  const ch = H - 100
  const cx = x0 + cw / 2
  const bg = tier === 7 ? rainbow(ctx, x0, y0, x0 + cw, y0 + ch) : resolveVars(rank.color)
  block(ctx, x0, y0, cw, ch, 60, bg, { shadow: 20, line: 12 })

  ctx.save()
  roundRect(ctx, x0, y0, cw, ch, 60)
  ctx.clip()
  pattern(ctx, tier, x0, y0, cw, ch)
  if (tier >= 2) rays(ctx, cx, L.shield, format === 'story' ? 900 : 760, token(tier === 7 ? 'gold' : 'white'), tier >= 5 ? 0.35 : 0.22, tier >= 5 ? 24 : 18)
  // Ánh kim cầu vồng cho Huyền Thoại
  if (tier === 7) {
    ctx.globalAlpha = 0.35
    ctx.fillStyle = token('white')
    for (let i = -2; i < 6; i++) {
      ctx.beginPath()
      ctx.moveTo(x0 + i * 260, y0)
      ctx.lineTo(x0 + i * 260 + 90, y0)
      ctx.lineTo(x0 + i * 260 + 90 + ch * 0.6, y0 + ch)
      ctx.lineTo(x0 + i * 260 + ch * 0.6, y0 + ch)
      ctx.fill()
    }
    ctx.globalAlpha = 1
  }
  ctx.restore()

  // Viền kép từ Bạch Kim, góc viền vàng từ Cao Thủ
  ctx.lineWidth = 5
  ctx.strokeStyle = ink
  if (tier >= 4) {
    roundRect(ctx, x0 + 22, y0 + 22, cw - 44, ch - 44, 42)
    ctx.stroke()
  }
  if (tier >= 6) {
    const c = 110
    ;[
      [x0 + 22, y0 + 22, 1, 1],
      [x0 + cw - 22, y0 + 22, -1, 1],
      [x0 + 22, y0 + ch - 22, 1, -1],
      [x0 + cw - 22, y0 + ch - 22, -1, -1],
    ].forEach(([px, py, dx, dy]) => {
      ctx.beginPath()
      ctx.moveTo(px, py + dy * 42)
      ctx.lineTo(px, py + dy * c)
      ctx.lineTo(px + dx * 22, py + dy * (c - 22))
      ctx.lineTo(px + dx * 22, py + dy * 22)
      ctx.lineTo(px + dx * (c - 22), py + dy * 22)
      ctx.lineTo(px + dx * c, py)
      ctx.lineTo(px + dx * 42, py)
      ctx.closePath()
      ctx.fillStyle = token('gold')
      ctx.fill()
      ctx.stroke()
    })
  }

  // Logo
  ctx.textBaseline = 'alphabetic'
  ctx.font = 'italic 900 58px "Be Vietnam Pro"'
  const logoW = ctx.measureText('WORDCLASH').width
  block(ctx, cx - logoW / 2 - 40, L.logo - 58, logoW + 80, 84, 42, token('surface'), { shadow: 8, line: 7 })
  ctx.textAlign = 'left'
  ctx.fillStyle = token('primary')
  ctx.fillText('W', cx - logoW / 2, L.logo + 4)
  ctx.fillStyle = ink
  ctx.fillText('ORDCLASH', cx - logoW / 2 + ctx.measureText('W').width, L.logo + 4)
  ctx.textAlign = 'center'
  ctx.font = '700 30px "Chakra Petch"'
  ctx.letterSpacing = '6px'
  const subW = ctx.measureText('CHỨNG NHẬN RANK').width + 48
  block(ctx, cx - subW / 2, L.sub - 30, subW, 46, 23, ink, { shadow: 0, line: 0 })
  ctx.fillStyle = token('white')
  ctx.fillText('CHỨNG NHẬN RANK', cx + 3, L.sub + 2)
  ctx.letterSpacing = '0px'

  // Huy hiệu rank cực lớn
  drawShield(ctx, cert.rank, tier, cx, L.shield, L.shieldSize)
  if (tier >= 3) {
    const sparkleCount = [0, 0, 0, 4, 6, 8, 10, 12][tier]
    for (let i = 0; i < sparkleCount; i++) {
      // Chỉ rải hai bên và phía dưới huy hiệu (góc tính theo độ, 90° là hướng xuống), tránh đè logo phía trên
      const a = ([200, 340, 160, 20, 225, 315, 140, 40, 185, 355, 120, 60][i] * Math.PI) / 180
      const r = L.shieldSize * (0.78 + (i % 2) * 0.16)
      sparkle(ctx, cx + Math.cos(a) * r, L.shield + Math.sin(a) * r, 16 + (i % 3) * 8, token(i % 2 ? 'white' : 'gold'))
    }
  }

  // Tên rank và thứ hạng
  const rankText = rank.name.toUpperCase()
  const rankFont = fitFont(ctx, rankText, (n) => `italic 700 ${n}px "Chakra Petch"`, L.rankFont, cw - 140)
  ctx.save()
  ctx.shadowColor = ink
  ctx.shadowOffsetX = 8
  ctx.shadowOffsetY = 8
  strokedText(ctx, rankText, cx, L.rankName, rankFont, tier === 7 ? token('gold') : token('white'), 18)
  ctx.restore()
  strokedText(ctx, rankText, cx, L.rankName, rankFont, tier === 7 ? token('gold') : token('white'), 18)

  ctx.font = '700 32px "Chakra Petch"'
  const pillText = `RANK ${tier + 1}/${RANKS.length}`
  const pw = ctx.measureText(pillText).width + 48
  block(ctx, cx - pw / 2, L.pill - 28, pw, 52, 26, token('gold'), { shadow: 6, line: 5 })
  ctx.fillStyle = ink
  ctx.textBaseline = 'middle'
  ctx.fillText(pillText, cx, L.pill)
  ctx.textBaseline = 'alphabetic'

  // Họ tên
  const name = cert.fullName.toUpperCase()
  strokedText(ctx, name, cx, L.name, fitFont(ctx, name, (n) => `900 ${n}px "Be Vietnam Pro"`, L.nameFont, cw - 140), ink, 14, token('white'))
  ctx.fillStyle = ink
  ctx.fillText(name, cx, L.name)

  // Số liệu chính trên dải highlighter
  const hlText = `${formatNumber(cert.words)} TỪ VỰNG ĐÃ THUỘC`
  ctx.font = fitFont(ctx, hlText, (n) => `700 ${n}px "Chakra Petch"`, format === 'story' ? 60 : 54, cw - 200)
  const hw = ctx.measureText(hlText).width + 70
  ctx.save()
  ctx.translate(cx, L.hl - 16)
  ctx.rotate(-0.025)
  ctx.fillStyle = token('accent')
  ctx.beginPath()
  ctx.moveTo(-hw / 2 + 8, -38)
  ctx.lineTo(hw / 2 - 4, -44)
  ctx.lineTo(hw / 2 + 10, -30)
  ctx.lineTo(hw / 2, 34)
  ctx.lineTo(-hw / 2 + 4, 40)
  ctx.lineTo(-hw / 2 - 10, 26)
  ctx.closePath()
  ctx.fill()
  ctx.lineWidth = 6
  ctx.strokeStyle = ink
  ctx.stroke()
  ctx.fillStyle = ink
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(hlText, 0, 2)
  ctx.restore()
  ctx.textBaseline = 'alphabetic'

  // 3 chỉ số nhỏ
  const chips = [
    { text: `STREAK ${cert.streak} NGÀY`, dot: token('orange') },
    cert.level && { text: `CẤP ĐỘ ${cert.level}`, dot: token(`level-${cert.level.toLowerCase()}`) },
    { text: `${cert.mascots} LINH VẬT`, dot: token('gold') },
  ].filter(Boolean)
  const gap = 18
  const total = chips.reduce((sum, c) => sum + chipWidth(ctx, c.text), 0) + gap * (chips.length - 1)
  let chipX = cx - total / 2
  chips.forEach((c) => {
    chipX += chip(ctx, chipX, L.chips, c.text, c.dot) + gap
  })

  // Linh vật đại diện (góc dưới trái)
  drawMascotCard(ctx, cert.mascot, img, x0 + 48, L.mascotY, L.mascotW, -6)

  // Mã QR (góc dưới phải)
  const url = `wordclash.vn/@${cert.handle}`
  const qx = x0 + cw - 48 - L.qr
  drawQr(ctx, `https://${url}`, qx, L.qrY, L.qr)
  ctx.textAlign = 'center'
  ctx.textBaseline = 'alphabetic'
  ctx.font = fitFont(ctx, url, (n) => `700 ${n}px "Chakra Petch"`, 24, L.qr + 60, 16)
  const ux = qx + L.qr / 2
  const uw = ctx.measureText(url).width + 24
  block(ctx, ux - uw / 2, L.qrY + L.qr + 18, uw, 38, 19, token('white'), { shadow: 0, line: 4 })
  ctx.fillStyle = ink
  ctx.fillText(url, ux, L.qrY + L.qr + 45)

  // Ngày đạt, mã chứng nhận, tagline (cột giữa)
  const midX = (x0 + 48 + L.mascotW + qx) / 2
  ctx.font = '700 28px "Chakra Petch"'
  ctx.fillStyle = ink
  if (cert.achievedAt) ctx.fillText(`NGÀY ĐẠT LẦN ĐẦU ${formatDate(cert.achievedAt)}`, midX, L.date)
  if (cert.code) {
    ctx.font = '700 30px "Chakra Petch"'
    const codeW = ctx.measureText(cert.code).width + 40
    block(ctx, midX - codeW / 2, L.code - 32, codeW, 48, 12, ink, { shadow: 0, line: 0 })
    ctx.fillStyle = token('white')
    ctx.fillText(cert.code, midX, L.code + 2)
  }
  const tagFont = fitFont(ctx, 'Học từ như đánh trận.', (n) => `italic 900 ${n}px "Be Vietnam Pro"`, format === 'story' ? 52 : 40, qx - (x0 + 48 + L.mascotW) - 40)
  strokedText(ctx, 'Học từ như đánh trận.', midX, L.tagline, tagFont, token('white'), 10)

  return canvas.toDataURL('image/png')
}
