/*
 * Kiểm thử đầu-cuối lõi Học Viện (backend thật, ENV=e2e, giả lập ngày bằng X-Debug-Now):
 * 1. Người mới: Cửa Ải được miễn → học bài 1 → kiểm tra đạt → bài 2 mở trên bản đồ.
 * 2. Ngày hôm sau: vào trang học bị đưa tới Cửa Ải; đúng hết thì streak = 1; DAILY_CHECK_REQUIRED thì chuyển hướng.
 * 3. Cửa Ải có câu sai: số từ đã thuộc giảm đúng, Sảnh cập nhật.
 * 4. Hoàn thành chặng 1 (2 bài + bài tổng hợp): con dấu xuất hiện, Hộ chiếu +1.
 * 5. Boss A1: thua → bị chặn kèm đồng hồ; luyện chặng yếu → được thử ngay; thắng → A2 mở, dấu Hạ Long, +1 lượt đặc biệt.
 * 6. Bỏ một ngày: streak về 0.
 * Phần không cần đi qua giao diện được dựng nhanh bằng API; câu trả lời qua giao diện dùng khóa đáp án của route dev/e2e.
 */

import { expect, test } from '@playwright/test'
import { createUserViaApi, navigateInApp, shot } from './helpers.js'
import {
  answerAllOnScreen,
  answerViaApi,
  api,
  dailyCheckViaApi,
  flipAllCards,
  roadmap,
  sessionKey,
  setDay,
  stats,
  waitSession,
} from './academy-helpers.js'

test.setTimeout(240_000)

async function start(page, context, day = 0) {
  await setDay(context, day)
  await createUserViaApi(context.request)
  await page.goto('/lobby')
  await expect(page.getByRole('heading', { name: /Chào .+!/ })).toBeVisible()
}

/** Học bài 1 bằng API (đúng hết) để có từ đã học. */
async function learnUnitViaApi(page, unitId) {
  const s = (await api(page, 'POST', `/academy/units/${unitId}/learn-sessions`)).body
  return answerViaApi(page, s.id)
}

test('1. người mới: miễn Cửa Ải → học bài 1 → kiểm tra ≥ 80% → bài 2 mở', async ({ page, context }) => {
  await start(page, context)
  expect(page.url()).toContain('/lobby') // không bị đưa tới Cửa Ải: chưa học từ nào → được miễn
  expect((await api(page, 'GET', '/daily-check/today')).body.status).toBe('exempt')
  await shot(page, 'acad-01-lobby-new')

  // Học bài 1 từ card Học Viện ở Sảnh
  const learn = waitSession(page, '/learn-sessions')
  await page.getByRole('button', { name: 'Học tiếp' }).click()
  const session = await learn
  expect(session.cards).toHaveLength(15)
  await flipAllCards(page)
  await answerAllOnScreen(page, await sessionKey(page, session.id))
  await expect(page.getByText('15 từ mới đã vào sổ!')).toBeVisible()

  // Kiểm tra cuối bài: 12/15 đúng = 80% (đúng ngưỡng)
  const test1 = waitSession(page, '/test-sessions')
  await page.getByRole('button', { name: 'Làm bài kiểm tra' }).click()
  const testSession = await test1
  const keys = await sessionKey(page, testSession.id)
  await answerAllOnScreen(page, keys, { wrongAt: new Set([0, 1, 2]) })
  await expect(page.getByRole('heading', { name: 'Qua bài rồi!' })).toBeVisible()
  await expect(page.getByText(/Đã mở: Bài 2/)).toBeVisible()
  await shot(page, 'acad-02-unit-test-pass')

  await page.getByRole('button', { name: 'Về bản đồ' }).click()
  await page.waitForURL('**/academy')
  await expect(page.getByText('Bài 2 · Giới thiệu bản thân')).toBeVisible()
  const units = (await roadmap(page)).levels[0].topics[0].units
  expect(units.map((u) => u.status)).toEqual(['completed', 'unlocked'])
  expect(units[0].best_score).toBe(80)
  await shot(page, 'acad-03-map-unit2-open')
})

test('2. ngày hôm sau: bị đưa tới Cửa Ải, đúng hết → streak 1; DAILY_CHECK_REQUIRED thì chuyển hướng', async ({ page, context }) => {
  await start(page, context)
  const unitId = (await roadmap(page)).levels[0].topics[0].units[0].id
  await learnUnitViaApi(page, unitId)

  await setDay(context, 1)
  await page.goto('/academy')
  await page.waitForURL('**/daily-check')
  await expect(page.getByRole('heading', { name: 'Cửa Ải Hôm Nay' })).toBeVisible()
  await shot(page, 'acad-04-daily-intro')
  await page.getByRole('button', { name: 'Mở cửa ải' }).click()
  const keys = (await api(page, 'GET', '/dev/daily-check/key')).body
  expect(keys.length).toBeGreaterThanOrEqual(2)
  expect(keys.length).toBeLessThanOrEqual(5)
  await answerAllOnScreen(page, keys)
  await expect(page.getByText('1 ngày', { exact: false }).first()).toBeVisible()
  expect((await stats(page)).streak.current).toBe(1)
  await shot(page, 'acad-05-daily-perfect')
  await page.getByRole('button', { name: /Tiếp tục|Vào Sảnh/ }).click()
  await page.waitForURL('**/academy')

  // Qua nửa đêm khi đang mở app: API học trả DAILY_CHECK_REQUIRED → chuyển tới Cửa Ải (không tải lại trang)
  await setDay(context, 2)
  await navigateInApp(page, `/academy/lesson?unit=${unitId}`)
  await page.waitForURL('**/daily-check')
  await expect(page.getByRole('button', { name: 'Mở cửa ải' })).toBeVisible()
})

test('3. Cửa Ải có câu sai: số từ đã thuộc giảm đúng, Sảnh cập nhật', async ({ page, context }) => {
  await start(page, context)
  const unitId = (await roadmap(page)).levels[0].topics[0].units[0].id
  // 3 ngày đúng ở mức ≥ 3 → 15 từ thành "đã thuộc"
  for (const day of [0, 1, 2]) {
    await setDay(context, day)
    await dailyCheckViaApi(page)
    await learnUnitViaApi(page, unitId)
  }
  const before = (await stats(page)).mastered_count
  expect(before).toBe(15)

  await setDay(context, 3)
  await page.goto('/lobby')
  await page.waitForURL('**/daily-check')
  await page.getByRole('button', { name: 'Mở cửa ải' }).click()
  const keys = (await api(page, 'GET', '/dev/daily-check/key')).body
  await answerAllOnScreen(page, keys, { wrongAt: new Set([0]) })
  await expect(page.getByText(/[−-]\s?1/).first()).toBeVisible()
  await shot(page, 'acad-06-daily-mistake')
  expect((await stats(page)).mastered_count).toBe(before - 1)

  await page.getByRole('button', { name: 'Vào Sảnh' }).click()
  await page.waitForURL('**/lobby')
  await expect(page.getByText(`${before - 1} từ đã thuộc`, { exact: false }).first()).toBeVisible()
  await shot(page, 'acad-07-lobby-after-mistake')
})

test('4. hoàn thành chặng 1: con dấu xuất hiện, Hộ chiếu +1', async ({ page, context }) => {
  await start(page, context)
  const topic = (await roadmap(page)).levels[0].topics[0]
  for (const unit of topic.units) {
    const s = (await api(page, 'POST', `/academy/units/${unit.id}/test-sessions`)).body
    await answerViaApi(page, s.id)
  }
  await page.goto('/academy')
  await expect(page.getByText('0/11 địa danh A1')).toBeVisible()

  const created = waitSession(page, '/test-sessions')
  await page.goto(`/academy/unit-test?topic=${topic.id}`)
  const session = await created
  await answerAllOnScreen(page, await sessionKey(page, session.id))
  await expect(page.getByRole('heading', { name: 'Qua chặng rồi!' })).toBeVisible()
  await expect(page.getByText(`Đã đến · ${topic.landmark_name}`)).toBeVisible()
  await shot(page, 'acad-08-topic-stamp')

  await page.getByRole('button', { name: 'Về bản đồ' }).click()
  await expect(page.getByText('1/11 địa danh A1')).toBeVisible()
  expect((await roadmap(page)).passport.visited).toBe(1)
  await shot(page, 'acad-09-map-passport')
})

test('5. Boss A1: thua → chặn kèm đồng hồ; luyện chặng yếu → thử ngay; thắng → A2, dấu Hạ Long, +1 lượt đặc biệt', async ({ page, context }) => {
  await start(page, context)
  expect((await api(page, 'POST', '/dev/academy/fast-forward', { level_code: 'A1' })).body.ok).toBe(true)
  const road = await roadmap(page)
  const a1 = road.levels[0]
  expect(a1.boss.status).toBe('available')

  // Thua: sai hết câu của chặng 2 và chặng 5 (10/50 sai = 80% < 85%)
  const boss = (await api(page, 'POST', `/academy/levels/${a1.id}/boss-sessions`)).body
  const weak = [a1.topics[1], a1.topics[4]]
  const lost = await answerViaApi(page, boss.id, { wrongTopics: weak.map((t) => t.id) })
  expect(lost.outcome.passed).toBe(false)
  expect(lost.outcome.weak_topics.map((w) => w.id)).toEqual(weak.map((t) => t.id))

  // Vào lại Boss: bị chặn, có đồng hồ đếm ngược và nút luyện từng chặng yếu
  await page.goto('/academy/boss?level=A1')
  await expect(page.getByRole('heading', { name: 'Boss đang hồi sức' })).toBeVisible()
  await expect(page.getByRole('timer')).toContainText(/Đánh lại sau 1[12]:\d\d:\d\d/)
  await shot(page, 'acad-10-boss-cooldown')

  for (const topic of weak) {
    const practice = waitSession(page, '/practice-sessions')
    await page.goto(`/academy/practice?topic=${topic.id}&level=A1`)
    const session = await practice
    expect(session.total).toBeGreaterThanOrEqual(10)
    await answerAllOnScreen(page, await sessionKey(page, session.id))
  }
  await expect(page.getByText('Sẵn sàng đánh lại Boss!')).toBeVisible()

  // Đánh lại ngay và thắng qua giao diện
  const fight = waitSession(page, '/boss-sessions')
  await page.getByRole('button', { name: 'Đánh lại Boss' }).click()
  const session = await fight
  expect(session.total).toBe(50)
  await answerAllOnScreen(page, await sessionKey(page, session.id))
  await expect(page.getByText('Đã chinh phục · Vịnh Hạ Long')).toBeVisible()
  await expect(page.getByText('+1 lượt quay đặc biệt')).toBeVisible()
  await shot(page, 'acad-11-boss-win')

  const after = await roadmap(page)
  expect(after.levels[1].status).toBe('unlocked')
  expect(after.levels[0].boss.status).toBe('won')
  expect((await stats(page)).spins.special).toBe(1)
  await page.getByRole('button', { name: /Bay tới A2/ }).click()
  await page.waitForURL('**/travel?from=A1')
})

test('6. bỏ một ngày: streak về 0', async ({ page, context }) => {
  await start(page, context)
  const unitId = (await roadmap(page)).levels[0].topics[0].units[0].id
  await learnUnitViaApi(page, unitId)
  await setDay(context, 1)
  await dailyCheckViaApi(page)
  expect((await stats(page)).streak.current).toBe(1)

  // Bỏ trọn ngày 2, quay lại ngày 3
  await setDay(context, 3)
  await page.goto('/lobby')
  await page.waitForURL('**/daily-check')
  await expect(page.getByText('0 ngày')).toBeVisible()
  expect((await stats(page)).streak.current).toBe(0)
  await shot(page, 'acad-12-streak-reset')
})
