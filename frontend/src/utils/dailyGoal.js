/*
 * Mục tiêu từ mới trong ngày (số liệu từ GET /me/stats → today.new_words, new_words_goal, new_words_nudge_at, date).
 * - Từ mới mỗi ngày KHÔNG giới hạn (bỏ hạn mức cứng 10/10/2026). Mục tiêu (10/12/15/20 theo thời lượng chọn ở onboarding)
 *   CHỈ để hiển thị, động viên; đạt rồi vẫn học tiếp được.
 * - Lời nhắc nhẹ: số từ mới trong ngày VƯỢT `new_words_nudge_at` (server tính = bội số của mục tiêu) → một toast duy nhất
 *   trong ngày, không chặn, không chuyển trang. "Đã nhắc hôm nay" nhớ theo ngày của server trong localStorage (tiện ích
 *   từng trình duyệt, không phải dữ liệu cần giữ; storage hỏng thì nhớ trong bộ nhớ của tab).
 * Client không tự quyết được học hay không, chỉ chọn lời hiển thị.
 */

export const GOAL_MESSAGE = 'Đạt mục tiêu hôm nay rồi, giỏi quá! Nghỉ chút cho não thấm từ nhé, muốn học thêm vẫn được.'
export const NUDGE_MESSAGE = 'Bạn học nhiều quá trời! Nhớ ôn lại vào những ngày tới để không quên nhé.'
export const NUDGE_STORAGE_KEY = 'wc.dailyNudgeDate'

/** 'progress' | 'goal' (đạt mục tiêu, vẫn học tiếp được). */
export function goalState({ learned, goal }) {
  return learned >= goal ? 'goal' : 'progress'
}

/** Câu hiển thị dưới vòng tiến độ. */
export function goalMessage({ learned, goal }) {
  if (goalState({ learned, goal }) === 'goal') return GOAL_MESSAGE
  return `${learned}/${goal} từ mới. Còn ${goal - learned} từ nữa!`
}

/** Vừa vượt mục tiêu trong phiên này (trước < goal ≤ sau) → hiện lời khen một lần. */
export function crossedGoal(before, after, goal) {
  return before < goal && after >= goal
}

/** Số từ mới hôm nay đã vượt mốc nhắc nhẹ của server. */
export function shouldNudge(today) {
  return Boolean(today?.new_words_nudge_at) && today.new_words > today.new_words_nudge_at
}

function defaultStorage() {
  try {
    return window.localStorage
  } catch {
    return null
  }
}

let shownInTab = null // dự phòng khi không đọc / ghi được localStorage

/** Hiện toast nhắc nhẹ nếu cần và chưa nhắc trong ngày `today.date`. Trả true khi vừa hiện. */
export function nudgeOncePerDay(today, push, storage = defaultStorage()) {
  if (!shouldNudge(today)) return false
  let seen = shownInTab
  try {
    seen = storage?.getItem(NUDGE_STORAGE_KEY) ?? seen
  } catch {
    // storage bị chặn: dùng giá trị trong tab
  }
  if (seen === today.date) return false
  shownInTab = today.date
  try {
    storage?.setItem(NUDGE_STORAGE_KEY, today.date)
  } catch {
    // như trên
  }
  push({ variant: 'info', title: NUDGE_MESSAGE })
  return true
}

/** Chỉ cho test: quên lần nhắc trong tab. */
export function resetNudgeForTest() {
  shownInTab = null
}
