/*
 * Kiểm thử đầu-cuối Bộ Sưu Tập & vòng quay (backend thật, ENV=e2e; route /api/v1/dev/* chỉ có ở dev/e2e):
 * 1. Người mới chọn Bé Thính ở onboarding: album 1/100, avatar là Bé Thính.
 * 2. /dev/grant-spins cấp 3 lượt, quay 1: album tăng, viên lượt quay còn 2.
 * 3. /dev/force-next ép thẻ trùng: hiện "+N MẢNH", số mảnh tăng.
 * 4. Đặt avatar bằng linh vật vừa quay: Sảnh cập nhật; API đặt avatar linh vật chưa có → MASCOT_NOT_OWNED.
 * 5. "Mở tất cả" 2 lượt: 2 thẻ lật lần lượt; tải lại trang thì kết quả vẫn ở album.
 * 6. /dev/set-pity 20: lượt kế ra Sử Thi.
 * 7. Đủ mảnh thì đổi được linh vật A1 chưa có; linh vật A2 không có trong danh sách đổi khi chưa mở A2.
 * 8. Bấm MỞ THẺ hai lần thật nhanh: chỉ trừ 1 lượt.
 * Hầu hết kịch bản bật giảm chuyển động (đi thẳng tới kết quả); kịch bản 5 chạy đủ hiệu ứng để thấy thẻ lật lần lượt.
 */

import { expect, test } from '@playwright/test'
import { createUserViaApi, newUser, onboardViaUI, registerViaUI, shot } from './helpers.js'
import { api } from './academy-helpers.js'

test.setTimeout(120_000)

async function start(page, context, { reducedMotion = true } = {}) {
  if (reducedMotion) await page.emulateMedia({ reducedMotion: 'reduce' })
  await createUserViaApi(context.request) // khởi đầu #001 Bông Tím (A1)
  await page.goto('/lobby')
  await expect(page.getByRole('heading', { name: /Chào .+!/ })).toBeVisible()
}

const collection = async (page) => (await api(page, 'GET', '/collection')).body
const grant = (page, normal, special = 0) => api(page, 'POST', '/dev/grant-spins', { normal, special })
const forceNext = (page, rarity, mascotId) => api(page, 'POST', '/dev/force-next', { rarity, mascot_id: mascotId ?? null })

async function openSpinScreen(page) {
  await page.goto('/collection/spin')
  await expect(page.getByRole('button', { name: 'Mở thẻ' })).toBeVisible()
}

test('1. chọn Bé Thính ở onboarding: album 1/100, avatar Bé Thính', async ({ page }) => {
  await registerViaUI(page, newUser('col'))
  await onboardViaUI(page) // chọn linh vật thứ hai: #002 Bé Thính
  await page.goto('/collection')
  await expect(page.getByLabel('Đã có 1 trên 100 linh vật')).toBeVisible()
  await expect(page.getByRole('button', { name: /^#002 Bé Thính, Thường/ })).toBeVisible()
  const me = (await api(page, 'GET', '/users/me')).body
  expect(me.avatar_mascot_id).toBe(2)
  await shot(page, 'col-01-album-starter')
})

test('2. cấp 3 lượt, quay 1: album tăng, còn 2 lượt', async ({ page, context }) => {
  await start(page, context)
  await grant(page, 3)
  await forceNext(page, 'rare') // thẻ Hiếm A1 (chưa có) → chắc chắn là linh vật mới
  await openSpinScreen(page)
  await page.getByRole('button', { name: 'Mở thẻ' }).click()
  await expect(page.getByText('Linh vật mới')).toBeVisible()
  const c = await collection(page)
  expect(c.owned_count).toBe(2)
  expect(c.spins.normal).toBe(2)
  await page.goto('/collection')
  await expect(page.getByLabel('Đã có 2 trên 100 linh vật')).toBeVisible()
  await expect(page.getByRole('button', { name: /^2\s*Lượt quay/ })).toBeVisible()
})

test('3. ép thẻ trùng: hiện +N mảnh, số mảnh tăng', async ({ page, context }) => {
  await start(page, context, { reducedMotion: false })
  await grant(page, 1)
  await forceNext(page, 'common', 1) // Bông Tím đã có (khởi đầu)
  await openSpinScreen(page)
  await page.getByRole('button', { name: 'Mở thẻ' }).click()
  await page.getByRole('button', { name: 'Chạm để lật thẻ' }).click({ force: true }) // thẻ lơ lửng liên tục, không bao giờ "đứng yên"
  await expect(page.getByText('+2 mảnh').first()).toBeVisible()
  await shot(page, 'col-03-duplicate-shards')
  await expect(page.getByText(/Đã có · \+2 mảnh/)).toBeVisible({ timeout: 15_000 })
  expect((await collection(page)).shards).toBe(2)
})

test('4. đặt avatar bằng linh vật vừa quay: Sảnh cập nhật; linh vật chưa có → MASCOT_NOT_OWNED', async ({ page, context }) => {
  await start(page, context)
  await grant(page, 1)
  await forceNext(page, 'epic', 9) // #009 Bánh Bao Sấm (A1, Sử Thi)
  await openSpinScreen(page)
  await page.getByRole('button', { name: 'Mở thẻ' }).click()
  await page.getByRole('button', { name: 'Đặt làm avatar' }).click()
  await expect(page.getByRole('button', { name: 'Đang dùng làm avatar' })).toBeVisible()
  await page.goto('/lobby')
  await expect(page.getByText('Bánh Bao Sấm').first()).toBeVisible()
  await shot(page, 'col-04-lobby-avatar')
  const res = await api(page, 'PATCH', '/users/me', { avatar_mascot_id: 10 })
  expect(res.status).toBe(403)
  expect(res.body.error.code).toBe('MASCOT_NOT_OWNED')
})

test('5. mở tất cả 2 lượt: lật lần lượt, tải lại vẫn còn trong album', async ({ page, context }) => {
  await start(page, context, { reducedMotion: false })
  await grant(page, 2)
  await openSpinScreen(page)
  const spun = page.waitForResponse((r) => r.url().includes('/collection/spins') && r.request().method() === 'POST')
  await page.getByRole('button', { name: 'Mở tất cả (2)' }).click()
  const body = await (await spun).json()
  expect(body.results).toHaveLength(2)
  await expect(page.getByRole('button', { name: 'Bỏ qua hiệu ứng' })).toBeVisible()
  await page.waitForTimeout(1500)
  await shot(page, 'col-05-open-all')
  await page.reload() // giữa hiệu ứng: kết quả đã nằm ở server
  await expect(page.getByRole('heading', { name: 'Hết lượt rồi!' })).toBeVisible()
  const owned = (await collection(page)).owned.map((o) => o.mascot_id)
  for (const r of body.results) expect(owned).toContain(r.mascot.id)
  expect((await collection(page)).spins.normal).toBe(0)
})

test('6. pity 20: lượt kế ra Sử Thi', async ({ page, context }) => {
  await start(page, context)
  await grant(page, 1)
  await api(page, 'POST', '/dev/set-pity', { value: 20 })
  await openSpinScreen(page)
  await expect(page.getByText('20/20 lượt')).toBeVisible()
  const spun = page.waitForResponse((r) => r.url().includes('/collection/spins') && r.request().method() === 'POST')
  await page.getByRole('button', { name: 'Mở thẻ' }).click()
  const result = (await (await spun).json()).results[0]
  expect(result.rarity).toBe('epic')
  expect(result.pity_triggered).toBe(true)
  await expect(page.getByText('Sử Thi', { exact: true }).first()).toBeVisible()
  expect((await collection(page)).pity_counter).toBe(0)
})

test('7. đủ mảnh đổi được linh vật A1 chưa có; A2 không có trong danh sách khi chưa mở', async ({ page, context }) => {
  await start(page, context)
  await grant(page, 2)
  // Rồng Mây (Huyền Thoại A1) hai lần: lần đầu là thẻ mới, lần hai trùng → +20 mảnh
  for (let i = 0; i < 2; i += 1) {
    await forceNext(page, 'legendary', 10)
    const k = crypto.randomUUID()
    const token = await page.evaluate(() => window.__wcAuthStore.getState().accessToken)
    const res = await page.context().request.post('/api/v1/collection/spins', {
      data: { kind: 'normal', count: 1 },
      headers: { Authorization: `Bearer ${token}`, 'Idempotency-Key': k },
    })
    expect(res.status()).toBe(200)
  }
  expect((await collection(page)).shards).toBe(20)

  await page.goto('/collection')
  await page.getByRole('button', { name: 'Đổi', exact: true }).click()
  const dialog = page.getByRole('dialog', { name: 'Đổi mảnh' })
  await expect(dialog.getByRole('button', { name: /^#005, Thường, 20 mảnh$/ })).toBeVisible()
  await expect(dialog.getByRole('button', { name: /^#004,/ })).toHaveCount(0) // Bánh Mì Bé thuộc A2, chưa mở
  await expect(dialog.getByRole('button', { name: /^#002,/ })).toHaveCount(0) // Bé Thính (A2)
  await shot(page, 'col-07-exchange')
  await dialog.getByRole('button', { name: /^#005,/ }).click()
  await dialog.getByRole('button', { name: /Đổi · 20 mảnh/ }).click()
  await page.getByRole('dialog', { name: 'Xác nhận đổi mảnh' }).getByRole('button', { name: 'Đổi', exact: true }).click()
  await expect(page.getByText('Đã nhận Nấm Nón!')).toBeVisible()
  const c = await collection(page)
  expect(c.shards).toBe(0)
  expect(c.owned.find((o) => o.mascot_id === 5)?.source).toBe('exchange')
})

test('8. bấm MỞ THẺ hai lần thật nhanh: chỉ trừ 1 lượt', async ({ page, context }) => {
  await start(page, context)
  await grant(page, 3)
  await openSpinScreen(page)
  let requests = 0
  page.on('request', (r) => {
    if (r.url().includes('/collection/spins') && r.method() === 'POST') requests += 1
  })
  await page.getByRole('button', { name: 'Mở thẻ' }).dblclick()
  await expect(page.getByRole('button', { name: /Mở tiếp/ })).toBeVisible()
  expect(requests).toBe(1)
  expect((await collection(page)).spins.normal).toBe(2)
})
