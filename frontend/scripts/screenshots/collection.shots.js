/*
 * Chụp ảnh Bộ Sưu Tập & vòng quay với dữ liệu thật (KHÔNG phải kiểm thử; không nằm trong `npm run e2e` hay CI).
 * Chạy: `npm run screenshots -- -g "Bộ Sưu Tập"` (ảnh lưu ở frontend/screenshots/, đổi bằng biến E2E_SHOTS).
 * Ép kết quả từng lượt bằng POST /api/v1/dev/force-next (chỉ có ở dev/e2e) để có đủ:
 * - shot-spin-reveal-{common,rare,epic,legendary} (4 kiểu công bố theo độ hiếm), shot-spin-legend-hint (tối màn, xoáy vàng),
 * - shot-spin-duplicate (thẻ trùng vỡ thành mảnh, "+N MẢNH"), shot-spin-open-all-flipping, shot-spin-open-all-result,
 * - shot-spin-ready, shot-spin-empty, shot-album-desktop, shot-album-mobile, shot-detail-desktop, shot-detail-mobile,
 * - shot-exchange, shot-exchange-confirm, shot-lobby-avatar (Sảnh sau khi đổi avatar).
 */

import { expect, test } from '@playwright/test'
import { createUserViaApi, shot } from '../../e2e/helpers.js'
import { api } from '../../e2e/academy-helpers.js'

const grant = (page, normal, special = 0) => api(page, 'POST', '/dev/grant-spins', { normal, special })
const forceNext = (page, rarity, mascotId) => api(page, 'POST', '/dev/force-next', { rarity, mascot_id: mascotId ?? null })

async function spinOne(page, name) {
  await page.goto('/collection/spin')
  await page.getByRole('button', { name: 'Mở thẻ' }).click()
  await page.getByRole('button', { name: 'Chạm để lật thẻ' }).click({ force: true, timeout: 15_000 })
  await page.waitForTimeout(1100)
  await shot(page, name)
  await page.getByRole('button', { name: 'Bỏ qua hiệu ứng' }).click({ timeout: 5_000 }).catch(() => {})
}

test('ảnh: Bộ Sưu Tập và vòng quay', async ({ page, context }) => {
  test.setTimeout(300_000)
  await createUserViaApi(context.request) // khởi đầu #001 Bông Tím
  await page.goto('/lobby')
  await expect(page.getByRole('heading', { name: /Chào .+!/ })).toBeVisible()
  await grant(page, 12, 1)

  await page.goto('/collection/spin')
  await expect(page.getByRole('button', { name: 'Mở thẻ' })).toBeVisible()
  await page.waitForTimeout(800)
  await shot(page, 'shot-spin-ready')

  // 4 kiểu công bố theo độ hiếm (linh vật A1 chưa có)
  for (const [rarity, id] of [['common', 5], ['rare', 7], ['epic', 9]]) {
    await forceNext(page, rarity, id)
    await spinOne(page, `shot-spin-reveal-${rarity}`)
  }
  await forceNext(page, 'legendary', 10)
  await page.goto('/collection/spin')
  await page.getByRole('button', { name: 'Mở thẻ' }).click()
  await page.waitForTimeout(1700)
  await shot(page, 'shot-spin-legend-hint')
  await page.getByRole('button', { name: 'Chạm để lật thẻ' }).click({ force: true, timeout: 15_000 })
  await page.waitForTimeout(1600)
  await shot(page, 'shot-spin-reveal-legendary')

  // Thẻ trùng → mảnh (Rồng Mây lần hai: +20)
  await forceNext(page, 'legendary', 10)
  await page.goto('/collection/spin')
  await page.getByRole('button', { name: 'Mở thẻ' }).click()
  await page.getByRole('button', { name: 'Chạm để lật thẻ' }).click({ force: true, timeout: 15_000 })
  await page.waitForTimeout(1300)
  await shot(page, 'shot-spin-duplicate')

  // Mở tất cả
  await page.goto('/collection/spin')
  await page.getByRole('button', { name: /Mở tất cả/ }).click()
  await page.waitForTimeout(2600)
  await shot(page, 'shot-spin-open-all-flipping')
  await expect(page.getByRole('button', { name: /Mở tiếp|Đặt làm avatar|Xem trong album/ }).first()).toBeVisible({ timeout: 60_000 })
  await page.waitForTimeout(800)
  await shot(page, 'shot-spin-open-all-result')

  // Hết lượt thường; còn lượt đặc biệt → mở nốt để thấy màn hết lượt
  await page.goto('/collection/spin?type=special')
  await page.getByRole('button', { name: 'Mở thẻ' }).click()
  await page.getByRole('button', { name: 'Bỏ qua hiệu ứng' }).click({ timeout: 10_000 }).catch(() => {})
  await page.goto('/collection/spin')
  await expect(page.getByRole('heading', { name: 'Hết lượt rồi!' })).toBeVisible()
  await shot(page, 'shot-spin-empty')

  // Album, chi tiết, đổi mảnh
  await page.goto('/collection')
  await expect(page.getByLabel(/Đã có \d+ trên 100 linh vật/)).toBeVisible()
  await page.waitForTimeout(800)
  await shot(page, 'shot-album-desktop')
  await page.goto('/collection?mascot=10')
  await page.waitForTimeout(1200)
  await shot(page, 'shot-detail-desktop')
  await page.goto('/collection?exchange=1')
  await page.waitForTimeout(1000)
  await shot(page, 'shot-exchange')
  const dialog = page.getByRole('dialog', { name: 'Đổi mảnh' })
  await dialog.getByRole('button', { name: /mảnh$/ }).and(page.locator(':enabled')).first().click() // thẻ đủ mảnh đầu tiên
  await dialog.getByRole('button', { name: /^Đổi · \d+ mảnh$/ }).click()
  await page.waitForTimeout(500)
  await shot(page, 'shot-exchange-confirm')

  // Sảnh sau khi đổi avatar
  expect((await api(page, 'PATCH', '/users/me', { avatar_mascot_id: 10 })).status).toBe(200)
  await page.goto('/lobby')
  await expect(page.getByText('Rồng Mây').first()).toBeVisible()
  await page.waitForTimeout(1200)
  await shot(page, 'shot-lobby-avatar')

  // Mobile 390px
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/collection')
  await expect(page.getByLabel(/Đã có \d+ trên 100 linh vật/)).toBeVisible()
  await page.waitForTimeout(800)
  await shot(page, 'shot-album-mobile')
  await page.goto('/collection?mascot=9')
  await page.waitForTimeout(1200)
  await shot(page, 'shot-detail-mobile')
})
