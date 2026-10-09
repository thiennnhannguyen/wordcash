/*
 * Dữ liệu thật, không số giả (backend + PostgreSQL thật, ENV=e2e; backend tự seed dev_normal / dev_shaky / dev_new).
 * - Người mới tinh: Sảnh, Hồ Sơ, Bảng xếp hạng không hiện số liệu giả cũ; khối trống có lời gợi ý; Đấu Trường "sắp mở".
 * - Landing khi chưa đăng nhập: số mục từ, số linh vật khớp GET /public/stats; dưới 100 người học thì không hiện số người.
 * - dev_normal: số từ đã thuộc, top tuần khớp dữ liệu seed.
 */

import { expect, test } from '@playwright/test'
import { createUserViaApi, loginAs, shot } from './helpers.js'

const FAKE = /1\.248|12\.400|128 người|Minh Anh|Kẹo Dẻo|resilient|Chuỗi thắng|7 thắng/

async function noFake(page) {
  const text = await page.locator('main, body').first().innerText()
  expect(text).not.toMatch(FAKE)
  expect(text).not.toMatch(/undefined|NaN/)
}

test('người mới tinh: Sảnh, Hồ Sơ, Bảng xếp hạng chỉ có số thật, khối trống có gợi ý', async ({ page, context }) => {
  await createUserViaApi(context.request)
  await page.goto('/lobby')
  await expect(page.getByRole('heading', { name: /Chào .+!/ })).toBeVisible()
  await expect(page.getByText('0 từ đã thuộc')).toBeVisible()
  await expect(page.getByText('Tự tạo bộ từ của riêng bạn')).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Đấu Trường sắp mở' })).toBeVisible()
  await expect(page.getByRole('button', { name: /Tìm trận/ })).toBeDisabled()
  await expect(page.getByText('Top tuần này')).toBeVisible()
  await expect(page.getByText(/Chơi .*Đấu Trường/)).toHaveCount(0)
  await noFake(page)
  await shot(page, 'real-new-lobby')

  await page.goto('/profile')
  await expect(page.getByText('Chưa có từ nào bị quên')).toBeVisible()
  await expect(page.getByText('Chưa có câu Cửa Ải nào')).toBeVisible()
  await expect(page.getByText('Tủ huy hiệu')).toBeVisible()
  await noFake(page)

  await page.goto('/leaderboard')
  await expect(page.getByRole('heading', { name: 'Bảng xếp hạng' })).toBeVisible()
  await expect(page.getByText('Bạn chưa có từ mới thuộc trong tuần này')).toBeVisible()
  await page.getByRole('tab', { name: 'Bạn bè' }).click()
  await expect(page.getByText('Bảng bạn bè sắp ra mắt')).toBeVisible()
  await noFake(page)

  await page.goto('/arena/matchmaking')
  await expect(page.getByRole('heading', { name: 'Đấu Trường sắp mở' })).toBeVisible()
})

test('Landing chưa đăng nhập: số liệu khớp /public/stats, không có số người giả', async ({ page, request }) => {
  const stats = await (await request.get('/api/v1/public/stats')).json()
  await page.goto('/')
  await expect(page.getByRole('heading', { name: /Học từ/ })).toBeVisible()
  const strip = page.getByText('mục từ · thêm cấp mới liên tục').locator('..')
  await expect(strip).toContainText(stats.entries_total.toLocaleString('vi-VN'))
  await expect(page.getByText('linh vật đã ra mắt')).toBeVisible()
  if (stats.learners == null) await expect(page.getByText(/người đang luyện từ/)).toHaveCount(0)
  await noFake(page)
  await shot(page, 'real-landing')
})

test('dev_normal: số từ đã thuộc và top tuần khớp dữ liệu seed', async ({ page }) => {
  await loginAs(page, 'dev_normal')
  await page.goto('/lobby')
  await expect(page.getByText('150 từ đã thuộc')).toBeVisible()
  await page.goto('/leaderboard')
  await expect(page.getByText('+30 từ tuần này').first()).toBeVisible()
  await page.goto('/profile/dev_shaky')
  await expect(page.getByRole('heading', { name: 'Dev Lung Lay' })).toBeVisible()
  await expect(page.getByText('Từ hay quên nhất')).toHaveCount(0)
  await page.goto('/profile/khong-ton-tai-abc')
  await expect(page.getByText('Không tìm thấy người chơi')).toBeVisible()
})
