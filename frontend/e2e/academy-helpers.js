/*
 * Tiện ích e2e cho Học Viện.
 * - Giả lập ngày bằng header X-Debug-Now (backend e2e chạy ENV=e2e; production bỏ qua header này).
 * - Đọc khóa đáp án qua route chỉ có ở dev/e2e (/api/v1/dev/...) để trả lời đúng hoặc sai có chủ đích QUA GIAO DIỆN.
 * - Dựng nhanh tiến độ bằng API (khi kịch bản không cần đi qua giao diện phần đó).
 */

import { expect } from '@playwright/test'

export const API = '/api/v1'
const DAY0 = Date.parse('2026-10-05T03:00:00Z') // 10:00 giờ Việt Nam (múi giờ mặc định của tài khoản)

export const dayIso = (n, hours = 0) => new Date(DAY0 + n * 86400000 + hours * 3600000).toISOString()

/** Mọi request của trình duyệt (và context.request) từ giờ mang "bây giờ" = ngày n. */
export async function setDay(context, n, hours = 0) {
  await context.setExtraHTTPHeaders({ 'X-Debug-Now': dayIso(n, hours) })
}

/** Gọi API bằng access token đang nằm trong bộ nhớ của trang. */
export async function api(page, method, path, data) {
  const token = await page.evaluate(() => window.__wcAuthStore.getState().accessToken)
  const res = await page.context().request.fetch(`${API}${path}`, { method, data, headers: { Authorization: `Bearer ${token}` } })
  const body = await res.json().catch(() => null)
  return { status: res.status(), body }
}

export async function sessionKey(page, sessionId) {
  return (await api(page, 'GET', `/dev/study-sessions/${sessionId}/key`)).body
}

/** Nộp cả phiên bằng API: `wrongTopics` (Boss) hoặc `wrong` (số câu đầu sai). */
export async function answerViaApi(page, sessionId, { wrong = 0, wrongTopics = [] } = {}) {
  const keys = await sessionKey(page, sessionId)
  const answers = keys.map((k, i) => ({ question_id: k.id, answer: i < wrong || wrongTopics.includes(k.topic_id) ? 'sai-hoan-toan' : k.answer }))
  return (await api(page, 'POST', `/study-sessions/${sessionId}/answers`, { answers })).body
}

export async function roadmap(page) {
  return (await api(page, 'GET', '/academy/roadmap')).body
}

/** Trả lời câu đang hiện trên màn (gõ từ hoặc chọn đáp án), đúng hoặc sai. */
export async function answerOnScreen(page, answer, { right = true } = {}) {
  const typeBox = page.getByPlaceholder('Gõ từ ở đây')
  if (await typeBox.isVisible()) {
    await typeBox.fill(right ? answer : 'zzzz')
  } else {
    const group = page.getByRole('radiogroup', { name: 'Các đáp án' })
    const options = group.getByRole('button')
    const texts = await options.evaluateAll((els) => els.map((el) => el.querySelector('span.flex-1')?.textContent ?? ''))
    const index = right ? texts.indexOf(answer) : texts.findIndex((t) => t !== answer)
    expect(index, `Không thấy đáp án "${answer}" trong ${texts.join(' | ')}`).toBeGreaterThanOrEqual(0)
    await options.nth(index).click()
  }
  await page.getByRole('button', { name: /^(Kiểm tra|Trả lời)$/ }).click()
}

/** Bấm nút đi tiếp sau khi chấm (tấm phản hồi hoặc thanh kết quả của bài kiểm tra). */
export async function continueAfter(page) {
  await page.getByRole('button', { name: /^(Tiếp|Đã nhớ)$/ }).click()
}

const QUESTION = '[role=radiogroup][aria-label="Các đáp án"], input[placeholder="Gõ từ ở đây"]'

/**
 * Trả lời lần lượt mọi câu của phiên qua giao diện (khóa đáp án theo đúng thứ tự câu). `wrongAt`: chỉ số câu cố ý sai.
 * Sau mỗi câu chờ khung câu cũ rời DOM (hiệu ứng chuyển câu) rồi mới đọc câu kế.
 */
export async function answerAllOnScreen(page, keys, { wrongAt = new Set() } = {}) {
  for (let i = 0; i < keys.length; i += 1) {
    await answerOnScreen(page, keys[i].answer, { right: !wrongAt.has(i) })
    const next = page.getByRole('button', { name: /^(Tiếp|Đã nhớ)$/ })
    await next.waitFor()
    const current = await page.locator(QUESTION).last().elementHandle()
    await next.click()
    if (i < keys.length - 1) await current.waitForElementState('hidden')
  }
}

/** Chờ request tạo phiên (POST …-sessions) do giao diện gửi, trả id phiên. */
export function waitSession(page, part) {
  return page
    .waitForResponse((r) => r.request().method() === 'POST' && r.url().includes(part) && r.status() === 201)
    .then((r) => r.json())
}

/** Bấm qua hết thẻ học từ mới. */
export async function flipAllCards(page) {
  const done = page.getByRole('button', { name: 'Vào luyện tập' })
  while (!(await done.isVisible())) await page.getByRole('button', { name: 'Đã hiểu, tiếp' }).click()
  await done.click()
}

/** Học một bài bằng API (đúng hết) để có từ đã học. */
export async function learnUnitViaApi(page, unitId) {
  const s = (await api(page, 'POST', `/academy/units/${unitId}/learn-sessions`)).body
  return answerViaApi(page, s.id)
}

/** Cửa Ải qua API: trả lời đúng hết (hoặc `wrong` câu đầu sai). */
export async function dailyCheckViaApi(page, { wrong = 0 } = {}) {
  const today = (await api(page, 'GET', '/daily-check/today')).body
  if (today.status !== 'pending') return today
  const keys = (await api(page, 'GET', '/dev/daily-check/key')).body
  const answers = keys.map((k, i) => ({ question_id: k.id, answer: i < wrong ? 'sai-hoan-toan' : k.answer }))
  return (await api(page, 'POST', '/daily-check/today/answers', { answers })).body
}

export async function stats(page) {
  return (await api(page, 'GET', '/me/stats')).body
}
