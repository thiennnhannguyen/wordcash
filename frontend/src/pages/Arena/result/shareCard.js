/*
 * Vẽ ảnh kết quả trận dạng thẻ (1080×1350, tỉ lệ 4:5 hợp mạng xã hội) bằng canvas, có logo WORDCLASH.
 * Màu lấy từ token CSS (không hard-code), font dùng đúng Be Vietnam Pro / Chakra Petch đã nạp.
 * Trả về data URL PNG để xem trước, tải về hoặc chia sẻ.
 */

import { formatDecimal } from '../../../utils/format'

const W = 1080
const H = 1350

function tokens() {
  const style = getComputedStyle(document.documentElement)
  const get = (n) => style.getPropertyValue(`--color-${n}`).trim()
  return { ink: get('ink'), white: get('white'), surface: get('surface'), primary: get('primary'), orange: get('orange'), gold: get('gold'), danger: get('danger'), accent: get('accent'), neutral: get('neutral'), raised: get('raised') }
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}

// Khối neo-brutalism: bóng cứng lệch xuống-phải, viền mực dày
function block(ctx, c, x, y, w, h, fill, r = 36) {
  ctx.fillStyle = c.ink
  roundRect(ctx, x + 12, y + 12, w, h, r)
  ctx.fill()
  ctx.fillStyle = fill
  roundRect(ctx, x, y, w, h, r)
  ctx.fill()
  ctx.lineWidth = 7
  ctx.strokeStyle = c.ink
  ctx.stroke()
}

function strokedText(ctx, c, text, x, y, font, fill, stroke = 14) {
  ctx.font = font
  ctx.lineJoin = 'round'
  ctx.lineWidth = stroke
  ctx.strokeStyle = c.ink
  ctx.strokeText(text, x, y)
  ctx.fillStyle = fill
  ctx.fillText(text, x, y)
}

export async function drawShareCard(result) {
  await document.fonts?.ready
  const c = tokens()
  const win = result.outcome === 'win'
  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')

  // Nền
  ctx.fillStyle = win ? c.primary : c.neutral
  ctx.fillRect(0, 0, W, H)
  // Tia sáng
  ctx.save()
  ctx.translate(W / 2, 420)
  ctx.fillStyle = c.white
  ctx.globalAlpha = 0.1
  for (let i = 0; i < 12; i++) {
    ctx.rotate(Math.PI / 6)
    ctx.beginPath()
    ctx.moveTo(0, 0)
    ctx.lineTo(-90, -1100)
    ctx.lineTo(90, -1100)
    ctx.fill()
  }
  ctx.restore()

  // Logo
  block(ctx, c, 270, 70, 540, 110, c.surface, 55)
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.font = 'italic 900 64px "Be Vietnam Pro"'
  const logo = 'WORDCLASH'
  const full = ctx.measureText(logo).width
  const wWidth = ctx.measureText('W').width
  ctx.textAlign = 'left'
  ctx.fillStyle = c.primary
  ctx.fillText('W', W / 2 - full / 2, 127)
  ctx.fillStyle = c.ink
  ctx.fillText('ORDCLASH', W / 2 - full / 2 + wWidth, 127)

  // Tiêu đề
  ctx.textAlign = 'center'
  strokedText(ctx, c, win ? 'CHIẾN THẮNG!' : 'THẤT BẠI', W / 2, 330, 'italic 700 150px "Chakra Petch"', win ? c.gold : c.danger, 22)

  // Tỉ số
  block(ctx, c, 90, 460, 900, 380, c.surface)
  ctx.textBaseline = 'alphabetic'
  const sides = [
    { x: 290, name: result.me.name, hp: result.hp.me, color: c.primary },
    { x: 790, name: result.opp.name, hp: result.hp.opp, color: c.orange },
  ]
  sides.forEach((s) => {
    ctx.fillStyle = s.color
    roundRect(ctx, s.x - 70, 510, 140, 140, 32)
    ctx.fill()
    ctx.lineWidth = 6
    ctx.strokeStyle = c.ink
    ctx.stroke()
    ctx.fillStyle = c.white
    ctx.font = '700 72px "Chakra Petch"'
    ctx.fillText(s.name.charAt(0).toUpperCase(), s.x, 605)
    ctx.fillStyle = c.ink
    ctx.font = 'italic 700 48px "Chakra Petch"'
    ctx.fillText(s.name.toUpperCase(), s.x, 715)
    ctx.font = '700 72px "Chakra Petch"'
    ctx.fillText(`${s.hp} HP`, s.x, 800)
  })
  ctx.fillStyle = c.danger
  roundRect(ctx, 430, 560, 220, 70, 20)
  ctx.fill()
  ctx.stroke()
  ctx.fillStyle = c.ink
  ctx.font = '700 38px "Chakra Petch"'
  ctx.fillText(result.reason === 'ko' ? `K.O. · C${result.koRound}` : 'SO MÁU', 540, 608)

  // Thông số
  const stats = [
    ['CÂU ĐÚNG', result.stats.correct.me, result.stats.correct.opp],
    ['TỐC ĐỘ TB', `${formatDecimal(result.stats.avgSeconds.me)}s`, `${formatDecimal(result.stats.avgSeconds.opp)}s`],
    ['COMBO', result.stats.bestCombo.me, result.stats.bestCombo.opp],
  ]
  block(ctx, c, 90, 900, 900, 300, c.raised)
  stats.forEach(([label, a, b], i) => {
    const y = 985 + i * 82
    ctx.font = '700 52px "Chakra Petch"'
    ctx.fillStyle = c.primary
    ctx.textAlign = 'left'
    ctx.fillText(String(a), 150, y)
    ctx.fillStyle = c.ink
    ctx.textAlign = 'right'
    ctx.fillText(String(b), 930, y)
    ctx.textAlign = 'center'
    ctx.font = '700 34px "Chakra Petch"'
    ctx.fillText(label, 540, y - 6)
  })

  ctx.textAlign = 'center'
  ctx.fillStyle = win ? c.white : c.ink
  ctx.font = '700 36px "Chakra Petch"'
  ctx.fillText('ĐẤU TỪ VỰNG · WORDCLASH', W / 2, 1290)

  return canvas.toDataURL('image/png')
}
