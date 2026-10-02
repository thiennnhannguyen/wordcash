/*
 * Vẽ ảnh chia sẻ "Mình vừa mở được…" (1080×1350) bằng canvas: nền màu độ hiếm có tia sáng, logo WORDCLASH,
 * thẻ linh vật theo khung độ hiếm (số thứ tự, sao, tên, nhãn độ hiếm). Linh vật lấy từ SVG đang hiện trên màn,
 * thay biến màu CSS bằng giá trị thật để vẽ được vào canvas. Màu lấy từ token, không hard-code.
 */

import { formatMascotNumber } from '../../../utils/format'
import { RARITIES } from '../../../utils/constants'

const W = 1080
const H = 1350

function token(name) {
  return getComputedStyle(document.documentElement).getPropertyValue(`--color-${name}`).trim()
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

function block(ctx, x, y, w, h, fill, r, shadow = 14) {
  ctx.fillStyle = token('ink')
  roundRect(ctx, x + shadow, y + shadow, w, h, r)
  ctx.fill()
  ctx.fillStyle = fill
  roundRect(ctx, x, y, w, h, r)
  ctx.fill()
  ctx.lineWidth = 8
  ctx.strokeStyle = token('ink')
  ctx.stroke()
}

function star(ctx, cx, cy, r) {
  ctx.beginPath()
  for (let i = 0; i < 10; i++) {
    const rad = i % 2 ? r * 0.45 : r
    const a = (Math.PI / 5) * i - Math.PI / 2
    ctx.lineTo(cx + Math.cos(a) * rad, cy + Math.sin(a) * rad)
  }
  ctx.closePath()
  ctx.fillStyle = token('gold')
  ctx.fill()
  ctx.lineWidth = 5
  ctx.strokeStyle = token('ink')
  ctx.stroke()
}

function svgToImage(svgEl) {
  if (!svgEl) return Promise.resolve(null)
  const clone = svgEl.cloneNode(true)
  clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg')
  clone.setAttribute('width', '600')
  clone.setAttribute('height', '600')
  const markup = new XMLSerializer().serializeToString(clone).replace(/var\(--color-([a-z0-9-]+)\)/g, (_, n) => token(n))
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => resolve(null)
    img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(markup)}`
  })
}

const BG = { common: 'sky', rare: 'sky', epic: 'primary', legendary: 'gold' }
const CARD = { common: 'bg', rare: 'sky', epic: 'primary', legendary: 'gold' }

export async function drawSpinShareCard(mascot, svgEl) {
  await document.fonts?.ready
  const art = await svgToImage(svgEl)
  const info = RARITIES[mascot.rarity]
  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')
  const ink = token('ink')

  // Nền và tia sáng
  ctx.fillStyle = token(BG[mascot.rarity])
  ctx.fillRect(0, 0, W, H)
  ctx.save()
  ctx.translate(W / 2, 700)
  ctx.fillStyle = token('white')
  ctx.globalAlpha = 0.18
  for (let i = 0; i < 16; i++) {
    ctx.rotate(Math.PI / 8)
    ctx.beginPath()
    ctx.moveTo(0, 0)
    ctx.lineTo(-70, -1200)
    ctx.lineTo(70, -1200)
    ctx.fill()
  }
  ctx.restore()

  // Logo
  block(ctx, 300, 56, 480, 96, token('surface'), 48, 10)
  ctx.font = 'italic 900 56px "Be Vietnam Pro"'
  ctx.textBaseline = 'middle'
  const full = ctx.measureText('WORDCLASH').width
  const wWidth = ctx.measureText('W').width
  ctx.textAlign = 'left'
  ctx.fillStyle = token('primary')
  ctx.fillText('W', W / 2 - full / 2, 106)
  ctx.fillStyle = ink
  ctx.fillText('ORDCLASH', W / 2 - full / 2 + wWidth, 106)

  // Dòng khoe
  ctx.textAlign = 'center'
  ctx.font = '800 60px "Be Vietnam Pro"'
  ctx.lineJoin = 'round'
  ctx.lineWidth = 14
  ctx.strokeStyle = ink
  ctx.strokeText('Mình vừa mở được…', W / 2, 250)
  ctx.fillStyle = token('white')
  ctx.fillText('Mình vừa mở được…', W / 2, 250)

  // Thẻ
  const cw = 600
  const ch = 800
  const cx = (W - cw) / 2
  const cy = 330
  block(ctx, cx, cy, cw, ch, token(CARD[mascot.rarity]), 44, 16)
  ctx.textBaseline = 'alphabetic'
  ctx.textAlign = 'left'
  ctx.font = '700 44px "Chakra Petch"'
  ctx.fillStyle = mascot.rarity === 'epic' ? token('white') : ink
  ctx.fillText(formatMascotNumber(mascot.number), cx + 40, cy + 70)
  for (let i = 0; i < info.stars; i++) star(ctx, cx + cw - 50 - i * 52, cy + 55, 22)

  // Ô tranh
  ctx.fillStyle = token('surface')
  roundRect(ctx, cx + 30, cy + 100, cw - 60, 470, 30)
  ctx.fill()
  ctx.lineWidth = 6
  ctx.strokeStyle = ink
  ctx.stroke()
  if (art) ctx.drawImage(art, cx + 80, cy + 115, cw - 160, cw - 160)

  // Tên
  ctx.fillStyle = token('surface')
  roundRect(ctx, cx + 30, cy + 595, cw - 60, 90, 22)
  ctx.fill()
  ctx.stroke()
  ctx.textAlign = 'center'
  ctx.fillStyle = ink
  ctx.font = '800 50px "Be Vietnam Pro"'
  ctx.fillText(mascot.name, W / 2, cy + 657)

  // Dải nhãn độ hiếm
  ctx.save()
  roundRect(ctx, cx, cy, cw, ch, 44)
  ctx.clip()
  ctx.fillStyle = mascot.rarity === 'common' ? token('rarity-common') : ink
  ctx.fillRect(cx, cy + ch - 90, cw, 90)
  ctx.restore()
  ctx.beginPath()
  ctx.moveTo(cx, cy + ch - 90)
  ctx.lineTo(cx + cw, cy + ch - 90)
  ctx.lineWidth = 7
  ctx.strokeStyle = ink
  ctx.stroke()
  ctx.font = '700 44px "Chakra Petch"'
  ctx.fillStyle = mascot.rarity === 'common' ? ink : mascot.rarity === 'legendary' ? token('gold') : token('white')
  ctx.fillText(info.name.toUpperCase(), W / 2, cy + ch - 30)

  ctx.font = '700 36px "Chakra Petch"'
  ctx.fillStyle = mascot.rarity === 'legendary' ? ink : token('white')
  ctx.fillText('HỌC TỪ VỰNG · SĂN LINH VẬT · WORDCLASH', W / 2, 1270)

  return canvas.toDataURL('image/png')
}
