/*
 * Mục tiêu và hạn mức từ mới trong ngày (số liệu từ GET /me/stats → today.new_words, new_words_goal, new_words_cap).
 * - Mục tiêu (10/12/15/20 theo thời lượng chọn ở onboarding) CHỈ để hiển thị, động viên; đạt rồi vẫn học tiếp được.
 * - Hạn mức cứng do server chặn (NEW_WORDS_DAILY_CAP); chạm hạn mức thì chỉ luyện lại từ đã gặp và ôn tập.
 * Hàm thuần, không gọi API; client không tự quyết được học hay không, chỉ chọn lời hiển thị.
 */

export const CAP_MESSAGE = 'Hôm nay bạn học đủ nhiều rồi, mai học tiếp nhé'
export const GOAL_MESSAGE = 'Đạt mục tiêu hôm nay rồi, giỏi quá! Nghỉ chút cho não thấm từ nhé, muốn học thêm vẫn được.'

/** 'progress' | 'goal' (đạt mục tiêu, chưa chạm hạn mức) | 'cap' (chạm hạn mức). */
export function goalState({ learned, goal, cap }) {
  if (cap && learned >= cap) return 'cap'
  if (learned >= goal) return 'goal'
  return 'progress'
}

/** Câu hiển thị dưới vòng tiến độ. */
export function goalMessage({ learned, goal, cap }) {
  const state = goalState({ learned, goal, cap })
  if (state === 'cap') return `${CAP_MESSAGE}. Bạn vẫn ôn tập được.`
  if (state === 'goal') return GOAL_MESSAGE
  return `${learned}/${goal} từ mới. Còn ${goal - learned} từ nữa!`
}

/** Vừa vượt mục tiêu trong phiên này (trước < goal ≤ sau) → hiện lời khen một lần. */
export function crossedGoal(before, after, goal) {
  return before < goal && after >= goal
}
