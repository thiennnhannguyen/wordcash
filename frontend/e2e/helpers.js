/*
 * Hàm dùng chung cho kiểm thử đầu-cuối: tạo người dùng (qua giao diện hoặc qua API), onboarding, ký access token hết hạn,
 * chụp ảnh khi đặt biến E2E_SHOTS (thư mục lưu ảnh).
 */

import { createHmac, randomBytes } from 'node:crypto'
import { expect } from '@playwright/test'

export const PASSWORD = 'Wordclash2026'
export const JWT_SECRET = process.env.E2E_JWT_SECRET ?? 'wordclash-e2e-secret-key-only-for-tests-0001'

export function newUser(prefix = 'e2e') {
  const id = `${prefix}${Date.now().toString(36).slice(-5)}${randomBytes(2).toString('hex')}`
  return { username: id, email: `${id}@wordclash.vn`, display_name: `Chiến binh ${id.slice(-4)}`, password: PASSWORD }
}

export async function shot(page, name) {
  if (!process.env.E2E_SHOTS) return
  await page.waitForTimeout(900) // chờ hiệu ứng xuất hiện/đóng panel chạy xong
  await page.screenshot({ path: `${process.env.E2E_SHOTS}/${name}.png`, fullPage: false })
}

/** Đăng ký qua giao diện /register; dừng ở /onboarding. */
export async function registerViaUI(page, user) {
  await page.goto('/register')
  await page.getByLabel('Tên hiển thị').fill(user.display_name)
  await page.getByLabel('Tên người dùng').fill(user.username)
  await page.getByRole('textbox', { name: 'Email' }).fill(user.email)
  await page.getByRole('textbox', { name: 'Mật khẩu' }).fill(user.password)
  await page.getByText('Tôi đồng ý').click()
  await page.getByRole('button', { name: 'Tạo tài khoản' }).click()
  await page.waitForURL('**/onboarding')
}

/** Làm 4 bước onboarding qua giao diện (bắt đầu từ A1, linh vật #002). */
export async function onboardViaUI(page) {
  for (const choice of ['Giao tiếp hằng ngày', '10 phút', 'Bắt đầu từ A1']) {
    await page.getByText(choice).first().click()
    await page.getByRole('button', { name: 'Tiếp tục' }).click()
  }
  await page.getByRole('radio').nth(1).click()
  await page.getByRole('button', { name: 'Bắt đầu hành trình' }).click()
  await page.waitForURL('**/travel?variant=start')
}

/** Đăng ký + onboarding qua API bằng request của context (cookie refresh gắn luôn vào trình duyệt). Trả {user, token}. */
export async function createUserViaApi(request, user = newUser('api')) {
  const res = await request.post('/api/v1/auth/register', { data: user })
  expect(res.status(), await res.text()).toBe(201)
  const body = await res.json()
  const headers = { Authorization: `Bearer ${body.access_token}` }
  const ob = await request.patch('/api/v1/users/me/onboarding', {
    headers,
    data: { goal: 'general', daily_minutes: 10, starter_mascot_id: 1, start_mode: 'a1' },
  })
  expect(ob.status()).toBe(200)
  return { user: body.user, token: body.access_token, headers }
}

const b64url = (value) => Buffer.from(typeof value === 'string' ? value : JSON.stringify(value)).toString('base64url')

/** Access token đúng chữ ký nhưng đã hết hạn 2 phút (server trả TOKEN_EXPIRED). */
export function expiredAccessToken(userId) {
  const now = Math.floor(Date.now() / 1000)
  const header = b64url({ alg: 'HS256', typ: 'JWT' })
  const payload = b64url({ sub: userId, role: 'user', type: 'access', iat: now - 1000, exp: now - 120, jti: randomBytes(8).toString('hex') })
  const signature = createHmac('sha256', JWT_SECRET).update(`${header}.${payload}`).digest('base64url')
  return `${header}.${payload}.${signature}`
}

/** Điều hướng trong ứng dụng (không tải lại trang, giữ access token trong bộ nhớ). */
export async function navigateInApp(page, path) {
  await page.evaluate((p) => {
    window.history.pushState({}, '', p)
    window.dispatchEvent(new PopStateEvent('popstate'))
  }, path)
}

export async function authState(page) {
  return page.evaluate(() => {
    const s = window.__wcAuthStore.getState()
    return { status: s.status, token: s.accessToken, userId: s.user?.id }
  })
}
