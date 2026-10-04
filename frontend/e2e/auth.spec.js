/*
 * Đầu-cuối: tài khoản và phiên đăng nhập.
 * (a) Đăng ký → onboarding → Sảnh chào đúng tên. (b) Tải lại vẫn đăng nhập (khôi phục phiên qua cookie).
 * (c) Đăng xuất → vào /courses bị chuyển về /login. (e) Hai tab, cả hai access token hết hạn, thao tác cùng lúc:
 * không tab nào bị đăng xuất. (f) Người dùng B không xem được khóa học của A (404).
 */

import { expect, test } from '@playwright/test'
import { authState, createUserViaApi, expiredAccessToken, navigateInApp, newUser, onboardViaUI, registerViaUI, shot } from './helpers'

test('(a)(b)(c) đăng ký → onboarding → Sảnh; tải lại vẫn đăng nhập; đăng xuất thì bị chặn', async ({ page }) => {
  const user = newUser('reg')
  await registerViaUI(page, user)
  await shot(page, '01-onboarding')
  await onboardViaUI(page)

  await page.goto('/lobby')
  await expect(page.getByRole('heading', { level: 1 })).toContainText(`Chào ${user.display_name}!`)
  await shot(page, '02-lobby')

  // (b) Tải lại: access token trong bộ nhớ mất, phiên khôi phục bằng cookie refresh
  await page.reload()
  await expect(page.getByRole('heading', { level: 1 })).toContainText(`Chào ${user.display_name}!`)
  expect(page.url()).toContain('/lobby')
  expect((await authState(page)).status).toBe('authenticated')
  // Không token nào nằm trong localStorage / sessionStorage
  const stored = await page.evaluate(() => JSON.stringify({ ...localStorage, ...sessionStorage }))
  expect(stored).not.toMatch(/eyJ/)

  // (c) Đăng xuất qua menu tài khoản ở thanh bên
  await page.getByRole('button', { name: `Menu tài khoản ${user.display_name}` }).first().click()
  await page.getByRole('menuitem', { name: 'Đăng xuất', exact: true }).click()
  await page.waitForURL('**/login')
  await page.goto('/courses')
  await page.waitForURL('**/login')
  await expect(page.getByRole('heading', { name: 'Mừng chiến binh trở lại!' })).toBeVisible()

  // Đăng nhập lại bằng username, quay về đúng trang định vào (/courses)
  await page.getByLabel('Email hoặc tên người dùng').fill(user.username)
  await page.getByRole('textbox', { name: 'Mật khẩu' }).fill(user.password)
  await page.getByRole('button', { name: 'Vào trận' }).click()
  await page.waitForURL('**/courses')
})

test('đã đăng nhập mà vào /login thì về Sảnh; chưa xong onboarding thì bị đưa về /onboarding', async ({ page }) => {
  const user = newUser('guard')
  await registerViaUI(page, user)
  await page.goto('/courses')
  await page.waitForURL('**/onboarding')
  await onboardViaUI(page)
  await page.goto('/login')
  await page.waitForURL('**/lobby')
})

test('(e) hai tab cùng hết hạn access token, thao tác cùng lúc: không tab nào bị đăng xuất', async ({ context }) => {
  await createUserViaApi(context.request)
  const [a, b] = [await context.newPage(), await context.newPage()]
  for (const p of [a, b]) {
    await p.goto('/lobby')
    await expect(p.getByRole('heading', { level: 1 })).toContainText('Chào')
  }
  const refreshes = []
  for (const p of [a, b]) p.on('response', (r) => r.url().endsWith('/auth/refresh') && refreshes.push(r.status()))

  const { userId } = await authState(a)
  const expired = expiredAccessToken(userId)
  for (const p of [a, b]) await p.evaluate((t) => window.__wcAuthStore.setState({ accessToken: t }), expired)

  // Cả hai tab cùng gọi API (mở trang Khóa học của tôi) với token đã hết hạn
  await Promise.all([navigateInApp(a, '/courses'), navigateInApp(b, '/courses')])
  for (const p of [a, b]) {
    // Danh sách khóa học tải xong (trạng thái trống chỉ hiện sau khi API trả 200)
    await expect(p.getByRole('heading', { name: 'Tạo bộ từ đầu tiên của bạn' })).toBeVisible()
    expect(p.url()).toContain('/courses')
    const state = await authState(p)
    expect(state.status).toBe('authenticated')
    expect(state.token).not.toBe(expired)
  }
  // navigator.locks + BroadcastChannel: chỉ một tab gọi /auth/refresh, tab kia dùng token được phát sang
  expect(refreshes).toEqual([200])

  // Phiên (cookie) vẫn còn hiệu lực ở cả hai tab sau khi tải lại
  for (const p of [a, b]) {
    await p.reload()
    await expect(p.getByRole('heading', { name: 'Khóa học của tôi' })).toBeVisible()
  }
})

test('(f) người dùng B không xem được khóa học của người dùng A', async ({ browser }) => {
  const ctxA = await browser.newContext()
  const a = await createUserViaApi(ctxA.request)
  const created = await ctxA.request.post('/api/v1/courses', { headers: a.headers, data: { title: 'Bí mật của A', icon: 'star', color: 'gold' } })
  expect(created.status()).toBe(201)
  const courseId = (await created.json()).id

  const ctxB = await browser.newContext()
  const b = await createUserViaApi(ctxB.request)
  const res = await ctxB.request.get(`/api/v1/courses/${courseId}`, { headers: b.headers })
  expect(res.status()).toBe(404)
  expect((await res.json()).error.code).toBe('COURSE_NOT_FOUND')

  const page = await ctxB.newPage()
  await page.goto(`/courses/${courseId}`)
  await expect(page.getByRole('heading', { name: 'Không tìm thấy khóa học' })).toBeVisible()
  await expect(page.getByText('Bí mật của A')).toHaveCount(0)
  await ctxA.close()
  await ctxB.close()
})
