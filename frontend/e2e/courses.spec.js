/*
 * Đầu-cuối: Khóa học của tôi chạy bằng API thật.
 * (d) Tạo khóa học → thêm 1 từ từ kho → tự tạo 1 từ → nhập hàng loạt 5 dòng (1 dòng lỗi) → học "Học mới" đến hết
 * → thống kê thay đổi (từ mới chuyển sang đang học).
 */

import { expect, test } from '@playwright/test'
import { createUserViaApi, shot } from './helpers'

const IMPORT_TEXT = ['hotfix - bản sửa lỗi gấp', 'teacher: giáo viên', 'standup\tcuộc họp nhanh đầu ngày', 'dòng này thiếu dấu ngăn', 'sprint - chu kỳ làm việc ngắn'].join('\n')

async function answerUntilDone(page) {
  // Thẻ học: bấm "Đã hiểu, tiếp" tới thẻ cuối ("Vào luyện tập")
  for (let i = 0; i < 30; i += 1) {
    const next = page.getByRole('button', { name: /Đã hiểu, tiếp|Vào luyện tập/ })
    const label = await next.innerText()
    await next.click()
    if (/Vào luyện tập/i.test(label)) break
  }
  // Câu hỏi: chọn đáp án đầu tiên hoặc gõ đại, nộp cho server chấm, rồi đi tiếp tới màn kết thúc
  const done = page.getByRole('button', { name: 'Về khóa học' })
  const check = page.getByRole('button', { name: 'Kiểm tra' })
  for (let i = 0; i < 40; i += 1) {
    await expect(done.or(check)).toBeVisible()
    if (await done.isVisible()) return
    const option = page.locator('main [role=radiogroup] button').first()
    if (await option.isVisible()) await option.click()
    else await page.locator('main input').fill('answer')
    await check.click()
    await page.locator('section[role=status] button').last().click()
  }
}

test('(d) tạo khóa học, thêm từ 3 cách, học mới đến hết, thống kê thay đổi', async ({ page, context }) => {
  await createUserViaApi(context.request)

  // Tạo khóa học
  await page.goto('/courses')
  await expect(page.getByRole('heading', { name: 'Tạo bộ từ đầu tiên của bạn' })).toBeVisible()
  await shot(page, '03-courses-empty')
  await page.getByRole('button', { name: 'Tạo khóa học' }).first().click()
  await page.getByLabel('Tên khóa học').fill('Từ vựng IT')
  await page.getByRole('dialog').getByRole('button', { name: 'Tạo khóa học' }).click()
  await page.waitForURL(/\/courses\/[0-9a-f-]+\?add=1/)
  const panel = page.getByRole('dialog')

  // a) Thêm từ kho
  await panel.getByLabel('Tìm từ trong kho WORDCLASH').fill('mon')
  await panel.getByRole('button', { name: 'Thêm money' }).click()
  await expect(panel.getByText('Đã có')).toBeVisible()
  await shot(page, '04-add-from-bank')

  // b) Tự tạo
  await panel.getByRole('tab', { name: 'Tự tạo' }).click()
  await panel.getByLabel('Từ tiếng Anh *').fill('spreadsheet')
  await panel.getByLabel('Nghĩa tiếng Việt *').fill('bảng tính')
  await panel.getByRole('button', { name: 'Tạo và thêm vào khóa' }).click()
  await expect(page.getByText('Đã tạo "spreadsheet"')).toBeVisible()

  // c) Nhập nhiều: 5 dòng, 1 dòng lỗi, "teacher" khớp kho
  await panel.getByRole('tab', { name: 'Nhập nhiều' }).click()
  await panel.getByLabel('Dán danh sách từ').fill(IMPORT_TEXT)
  await panel.getByRole('button', { name: 'Xem trước' }).click()
  await expect(panel.getByText('Lỗi: 1')).toBeVisible()
  await expect(panel.getByText('Khớp kho: 1')).toBeVisible()
  await shot(page, '05-import-preview')
  await panel.getByRole('button', { name: 'Thêm 4 từ' }).click()
  await expect(page.getByText('Đã thêm 4 từ')).toBeVisible()
  await panel.getByRole('button', { name: 'Đóng' }).click()

  const legend = page.locator('header ul')
  await expect(legend).toContainText('Mới 6')
  await expect(legend).toContainText('Đang học 0')
  await expect(page.getByRole('heading', { name: /Danh sách từ/ })).toContainText('6')
  await shot(page, '06-course-detail')

  // Học mới đến hết
  await page.getByRole('button', { name: /Học mới/ }).click()
  await page.waitForURL(/\/study\?mode=learn/)
  await expect(page.getByText('Từ vựng IT').first()).toBeVisible()
  await shot(page, '07-study-card')
  await answerUntilDone(page)
  await expect(page.getByRole('heading', { name: /Đúng \d+\/\d+ câu/ })).toBeVisible()
  await shot(page, '08-study-done')
  await page.getByRole('button', { name: 'Về khóa học' }).click()

  // Thống kê thay đổi: 6 từ mới đã chuyển sang đang học
  await expect(legend).toContainText('Mới 0')
  await expect(legend).toContainText('Đang học 6')
  await shot(page, '09-course-after')
})
