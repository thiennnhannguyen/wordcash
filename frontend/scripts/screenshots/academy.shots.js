/*
 * Chụp ảnh màn hình Học Viện với dữ liệu thật (KHÔNG phải kiểm thử; không nằm trong `npm run e2e` hay CI).
 * Chạy: `npm run screenshots` (ảnh lưu ở frontend/screenshots/, đổi bằng biến E2E_SHOTS).
 * Dựng tiến độ nhiều ngày bằng API + X-Debug-Now (backend ENV=e2e), rồi chụp:
 * - shot-daily-milestone (Cửa Ải chạm streak 7), shot-daily-mistake-shaky (sai hết, rank lung lay),
 * - shot-lobby-real, shot-lobby-shaky (Sảnh số liệu thật), shot-map-a1 (bản đồ A1),
 * - shot-boss-battle, shot-boss-lose (Trận Boss đang đánh và thua).
 */

import { expect, test } from '@playwright/test'
import { createUserViaApi, shot } from '../../e2e/helpers.js'
import { answerAllOnScreen, answerViaApi, api, dailyCheckViaApi, roadmap, sessionKey, setDay, stats, waitSession } from '../../e2e/academy-helpers.js'

test.setTimeout(900_000)

async function introduce(page, state) {
  for (let guard = 0; guard < 20 && state.introduced < 100; guard += 1) {
    const pos = (await stats(page)).position
    if (pos.step === 'topic_test') {
      const s = (await api(page, 'POST', `/academy/topics/${pos.topic_id}/test-sessions`)).body
      await answerViaApi(page, s.id)
      continue
    }
    if (pos.step !== 'unit') break
    const unit = (await api(page, 'GET', `/academy/units/${pos.unit_id}`)).body
    const fresh = unit.words.filter((w) => w.status === 'new').length
    if (fresh > 0) {
      if (unit.new_words_left_today === 0) break
      const s = (await api(page, 'POST', `/academy/units/${pos.unit_id}/learn-sessions`)).body
      state.introduced += s.cards.length
      state.units.add(pos.unit_id)
      await answerViaApi(page, s.id)
      if (fresh > s.cards.length) break // hết quota hôm nay
    }
    const t = (await api(page, 'POST', `/academy/units/${pos.unit_id}/test-sessions`)).body
    await answerViaApi(page, t.id)
  }
}

async function practice(page, state) {
  for (const id of state.units) {
    const s = await api(page, 'POST', `/academy/units/${id}/learn-sessions`)
    if (s.status === 201 && s.body.cards.length === 0) await answerViaApi(page, s.body.id)
  }
}

test('ảnh: Cửa Ải mốc 7 ngày, câu sai + lung lay, Sảnh, bản đồ', async ({ page, context }) => {
  await setDay(context, 0)
  await createUserViaApi(context.request)
  await page.goto('/lobby')
  await expect(page.getByRole('heading', { name: /Chào .+!/ })).toBeVisible()
  const state = { introduced: 0, units: new Set() }
  for (let day = 0; day <= 6; day += 1) {
    await setDay(context, day)
    await dailyCheckViaApi(page)
    await introduce(page, state)
    await practice(page, state)
  }
  const s6 = await stats(page)
  console.log('DAY6', state.introduced, s6.mastered_count, s6.rank.current, s6.streak.current)

  await setDay(context, 7)
  await page.goto('/lobby')
  await page.waitForURL('**/daily-check')
  await page.getByRole('button', { name: 'Mở cửa ải' }).click()
  await answerAllOnScreen(page, (await api(page, 'GET', '/dev/daily-check/key')).body)
  await page.waitForTimeout(1500)
  await shot(page, 'shot-daily-milestone')
  await page.getByRole('button', { name: /Vào Sảnh|Tiếp tục/ }).click()

  await setDay(context, 8)
  await page.goto('/lobby')
  await page.waitForURL('**/daily-check')
  await page.getByRole('button', { name: 'Mở cửa ải' }).click()
  await answerAllOnScreen(page, (await api(page, 'GET', '/dev/daily-check/key')).body, { wrongAt: new Set([0]) })
  await page.waitForTimeout(1500)
  await shot(page, 'shot-daily-mistake-shaky')
  const s8 = await stats(page)
  console.log('DAY8', s8.mastered_count, s8.rank.current, s8.rank.shaky, s8.streak.current)
  await page.getByRole('button', { name: 'Vào Sảnh' }).click()
  await page.waitForTimeout(2500)
  await shot(page, 'shot-lobby-real')
  await page.goto('/academy')
  await page.waitForTimeout(2500)
  await shot(page, 'shot-map-a1')
})

test('ảnh: Trận Boss thua', async ({ page, context }) => {
  await setDay(context, 0)
  await createUserViaApi(context.request)
  await page.goto('/lobby')
  await expect(page.getByRole('heading', { name: /Chào .+!/ })).toBeVisible()
  await api(page, 'POST', '/dev/academy/fast-forward', { level_code: 'A1' })
  const a1 = (await roadmap(page)).levels[0]
  const fight = waitSession(page, '/boss-sessions')
  await page.goto('/academy/boss?level=A1')
  const session = await fight
  const keys = await sessionKey(page, session.id)
  await page.waitForTimeout(800)
  await shot(page, 'shot-boss-battle')
  const weak = new Set([a1.topics[2].id, a1.topics[6].id])
  await answerAllOnScreen(page, keys, { wrongAt: new Set(keys.map((k, i) => (weak.has(k.topic_id) ? i : -1)).filter((i) => i >= 0)) })
  await expect(page.getByRole('heading', { name: 'Boss vẫn còn trụ!' })).toBeVisible()
  await page.waitForTimeout(1200)
  await shot(page, 'shot-boss-lose')
})

test('ảnh: rank lung lay', async ({ page, context }) => {
  test.setTimeout(1_200_000)
  await setDay(context, 0)
  await createUserViaApi(context.request)
  await page.goto('/lobby')
  await expect(page.getByRole('heading', { name: /Chào .+!/ })).toBeVisible()
  const state = { introduced: 0, units: new Set() }
  let day = 0
  for (; day <= 14; day += 1) {
    await setDay(context, day)
    await dailyCheckViaApi(page)
    if (state.introduced < 130) await introduce(page, state)
    await practice(page, state)
    if ((await stats(page)).rank.current === 'dong') break
  }
  console.log('DONG at day', day, (await stats(page)).mastered_count)
  for (let tries = 0; tries < 5; tries += 1) {
    day += 1
    await setDay(context, day)
    await page.goto('/lobby')
    await page.waitForURL('**/daily-check')
    await page.getByRole('button', { name: 'Mở cửa ải' }).click()
    const keys = (await api(page, 'GET', '/dev/daily-check/key')).body
    await answerAllOnScreen(page, keys, { wrongAt: new Set(keys.map((_, i) => i)) })
    await page.waitForTimeout(1500)
    const s = await stats(page)
    console.log('SHAKY?', day, s.mastered_count, s.rank.current, s.rank.shaky)
    if (s.rank.shaky) {
      await shot(page, 'shot-daily-mistake-shaky')
      await page.getByRole('button', { name: 'Vào Sảnh' }).click()
      await page.waitForTimeout(2500)
      await shot(page, 'shot-lobby-shaky')
      return
    }
    await page.getByRole('button', { name: 'Vào Sảnh' }).click()
  }
  throw new Error('không tới được trạng thái lung lay')
})
