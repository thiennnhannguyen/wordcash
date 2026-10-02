/*
 * Công cụ vẽ canvas dùng chung cho các ảnh chia sẻ (thẻ chứng nhận, ảnh khoe linh vật…).
 *
 * Mọi màu lấy từ token CSS lúc vẽ (không hard-code). Linh vật được dựng từ chính component MascotBlob
 * (renderToStaticMarkup) rồi thay biến màu bằng giá trị thật để vẽ được vào canvas. Mã QR dùng thư viện `qrcode`.
 */

import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import QRCode from 'qrcode'
import MascotBlob from '../components/collection/MascotBlob'
import { RARITIES } from './constants'
import { formatMascotNumber } from './format'

export function resolveVars(value) {
  const style = getComputedStyle(document.documentElement)
  return value.replace(/var\((--[a-z0-9-]+)\)/g, (_, n) => style.getPropertyValue(n).trim())
}

export const token = (name) => resolveVars(`var(--color-${name})`)

export async function loadFonts() {
  await Promise.all(
    ['700 40px "Chakra Petch"', 'italic 700 40px "Chakra Petch"', '900 40px "Be Vietnam Pro"', '800 40px "Be Vietnam Pro"', '500 40px "Be Vietnam Pro"'].map((f) =>
      document.fonts?.load(f).catch(() => null),
    ),
  )
  await document.fonts?.ready
}

export function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}

// Khối neo-brutalism: bóng cứng lệch xuống-phải, viền mực
export function block(ctx, x, y, w, h, r, fill, { shadow = 10, line = 7 } = {}) {
  const ink = token('ink')
  if (shadow) {
    ctx.fillStyle = ink
    roundRect(ctx, x + shadow, y + shadow, w, h, r)
    ctx.fill()
  }
  ctx.fillStyle = fill
  roundRect(ctx, x, y, w, h, r)
  ctx.fill()
  if (line) {
    ctx.lineWidth = line
    ctx.strokeStyle = ink
    ctx.stroke()
  }
}

export function star5(ctx, cx, cy, r, fill, line = 4) {
  ctx.beginPath()
  for (let i = 0; i < 10; i++) {
    const rad = i % 2 ? r * 0.45 : r
    const a = (Math.PI / 5) * i - Math.PI / 2
    ctx.lineTo(cx + Math.cos(a) * rad, cy + Math.sin(a) * rad)
  }
  ctx.closePath()
  ctx.fillStyle = fill
  ctx.fill()
  ctx.lineWidth = line
  ctx.lineJoin = 'round'
  ctx.strokeStyle = token('ink')
  ctx.stroke()
}

// Hạt lấp lánh 4 cánh
export function sparkle(ctx, cx, cy, r, fill, line = 3) {
  ctx.beginPath()
  ctx.moveTo(cx, cy - r)
  ctx.quadraticCurveTo(cx, cy, cx + r, cy)
  ctx.quadraticCurveTo(cx, cy, cx, cy + r)
  ctx.quadraticCurveTo(cx, cy, cx - r, cy)
  ctx.quadraticCurveTo(cx, cy, cx, cy - r)
  ctx.closePath()
  ctx.fillStyle = fill
  ctx.fill()
  if (line) {
    ctx.lineWidth = line
    ctx.strokeStyle = token('ink')
    ctx.stroke()
  }
}

// Chữ viền mực (paint-order: viền trước, màu sau)
export function strokedText(ctx, text, x, y, font, fill, stroke = 12, strokeColor = token('ink')) {
  ctx.font = font
  ctx.lineJoin = 'round'
  ctx.lineWidth = stroke
  ctx.strokeStyle = strokeColor
  ctx.strokeText(text, x, y)
  ctx.fillStyle = fill
  ctx.fillText(text, x, y)
}

// Chọn cỡ chữ lớn nhất để dòng chữ vừa `maxWidth`
export function fitFont(ctx, text, template, start, maxWidth, min = 24) {
  let size = start
  while (size > min) {
    ctx.font = template(size)
    if (ctx.measureText(text).width <= maxWidth) break
    size -= 4
  }
  return template(size)
}

export function svgToImage(markup) {
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => resolve(null)
    img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(resolveVars(markup))}`
  })
}

export function mascotImage(mascot, size = 600) {
  const markup = renderToStaticMarkup(
    createElement(MascotBlob, { color: mascot.color, shape: mascot.shape, traits: mascot.traits, size, shadow: false }),
  ).replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg"')
  return svgToImage(markup)
}

const CARD_BG = { common: 'bg', rare: 'sky', epic: 'primary', legendary: 'gold' }

// Thẻ linh vật theo khung độ hiếm (tỉ lệ 3:4), vẽ tại (x, y) với độ rộng w, nghiêng `rotate` độ
export function drawMascotCard(ctx, mascot, img, x, y, w, rotate = 0) {
  const h = (w * 4) / 3
  const s = w / 300
  const ink = token('ink')
  const info = RARITIES[mascot.rarity]
  ctx.save()
  ctx.translate(x + w / 2, y + h / 2)
  ctx.rotate((rotate * Math.PI) / 180)
  ctx.translate(-w / 2, -h / 2)

  block(ctx, 0, 0, w, h, 30 * s, token(CARD_BG[mascot.rarity]), { shadow: 10 * s, line: 7 * s })
  ctx.save()
  roundRect(ctx, 0, 0, w, h, 30 * s)
  ctx.clip()
  if (mascot.rarity === 'legendary') {
    ctx.save()
    ctx.translate(w / 2, h * 0.42)
    ctx.fillStyle = token('white')
    ctx.globalAlpha = 0.4
    for (let i = 0; i < 16; i++) {
      ctx.rotate(Math.PI / 8)
      ctx.beginPath()
      ctx.moveTo(0, 0)
      ctx.lineTo(-24 * s, -400 * s)
      ctx.lineTo(24 * s, -400 * s)
      ctx.fill()
    }
    ctx.restore()
  }
  // Dải nhãn độ hiếm
  ctx.fillStyle = mascot.rarity === 'common' ? token('rarity-common') : ink
  ctx.fillRect(0, h - 52 * s, w, 52 * s)
  ctx.restore()
  ctx.beginPath()
  ctx.moveTo(0, h - 52 * s)
  ctx.lineTo(w, h - 52 * s)
  ctx.lineWidth = 6 * s
  ctx.strokeStyle = ink
  ctx.stroke()
  if (mascot.rarity === 'legendary') {
    ctx.lineWidth = 4 * s
    roundRect(ctx, 9 * s, 9 * s, w - 18 * s, h - 18 * s, 22 * s)
    ctx.stroke()
  }

  // Số thứ tự và sao
  ctx.textBaseline = 'alphabetic'
  ctx.textAlign = 'left'
  ctx.font = `700 ${26 * s}px "Chakra Petch"`
  ctx.fillStyle = mascot.rarity === 'epic' ? token('white') : ink
  ctx.fillText(formatMascotNumber(mascot.number), 22 * s, 44 * s)
  for (let i = 0; i < info.stars; i++) star5(ctx, w - 30 * s - i * 30 * s, 34 * s, 12 * s, token('gold'), 3 * s)

  // Ô tranh
  ctx.fillStyle = token('surface')
  roundRect(ctx, 18 * s, 62 * s, w - 36 * s, 210 * s, 20 * s)
  ctx.fill()
  ctx.lineWidth = 5 * s
  ctx.strokeStyle = ink
  ctx.stroke()
  if (img) ctx.drawImage(img, w / 2 - 95 * s, 70 * s, 190 * s, 190 * s)

  // Tên
  ctx.fillStyle = token('surface')
  roundRect(ctx, 18 * s, 284 * s, w - 36 * s, 50 * s, 14 * s)
  ctx.fill()
  ctx.stroke()
  ctx.textAlign = 'center'
  ctx.fillStyle = ink
  ctx.font = fitFont(ctx, mascot.name, (n) => `800 ${n}px "Be Vietnam Pro"`, 28 * s, w - 60 * s, 14 * s)
  ctx.fillText(mascot.name, w / 2, 318 * s)

  ctx.font = `700 ${24 * s}px "Chakra Petch"`
  ctx.fillStyle = mascot.rarity === 'common' ? ink : mascot.rarity === 'legendary' ? token('gold') : mascot.rarity === 'rare' ? token('sky') : token('white')
  ctx.fillText(info.name.toUpperCase(), w / 2, h - 18 * s)
  ctx.restore()
}

// Mã QR vẽ bằng ô vuông màu mực trên nền trắng có viền
export function drawQr(ctx, text, x, y, size) {
  const qr = QRCode.create(text, { errorCorrectionLevel: 'M' })
  const n = qr.modules.size
  const pad = size * 0.08
  block(ctx, x, y, size, size, size * 0.1, token('white'), { shadow: size * 0.05, line: size * 0.035 })
  const cell = (size - pad * 2) / n
  ctx.fillStyle = token('ink')
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      if (qr.modules.data[r * n + c]) ctx.fillRect(x + pad + c * cell, y + pad + r * cell, Math.ceil(cell), Math.ceil(cell))
    }
  }
}
