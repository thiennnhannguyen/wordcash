/*
 * Chụp ảnh các màn chính bằng 3 tài khoản dev (seeds/seed_dev_accounts.py, backend e2e tự seed): dev_normal (bình thường),
 * dev_shaky (rank lung lay), dev_new (người mới). KHÔNG phải kiểm thử; chạy cùng `npm run screenshots`.
 * Mỗi tài khoản: Sảnh, Hồ Sơ, Bảng xếp hạng, trang "Đấu Trường sắp mở" ở 1440px và 390px. Thêm Landing khi chưa đăng nhập.
 * Ảnh lưu ở E2E_SHOTS (mặc định frontend/screenshots/), tên `acc-<tài khoản>-<trang>-<bề rộng>.png`.
 */

import { test } from '@playwright/test'
import { loginAs } from '../../e2e/helpers.js'

test.setTimeout(600_000)

const ACCOUNTS = ['dev_normal', 'dev_shaky', 'dev_new']
const PAGES = [
  ['lobby', '/lobby'],
  ['profile', '/profile'],
  ['leaderboard', '/leaderboard'],
  ['arena', '/arena'],
]
const WIDTHS = [1440, 390]

async function snap(page, name) {
  await page.waitForTimeout(2000) // chờ dữ liệu và hiệu ứng xuất hiện
  await page.screenshot({ path: `${process.env.E2E_SHOTS}/${name}.png`, fullPage: true })
}

for (const width of WIDTHS) {
  test(`ảnh: Landing chưa đăng nhập (${width}px)`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 })
    await page.goto('/')
    // Cuộn hết trang để các khối hiện dần (Reveal) xuất hiện trước khi chụp
    await page.evaluate(async () => {
      for (let y = 0; y < document.body.scrollHeight; y += 250) {
        window.scrollTo(0, y)
        await new Promise((r) => setTimeout(r, 250))
      }
      window.scrollTo(0, 0)
    })
    await snap(page, `acc-guest-landing-${width}`)
  })

  for (const account of ACCOUNTS) {
    test(`ảnh: ${account} (${width}px)`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 })
      await loginAs(page, account)
      for (const [name, path] of PAGES) {
        await page.goto(path)
        await snap(page, `acc-${account}-${name}-${width}`)
      }
    })
  }
}
