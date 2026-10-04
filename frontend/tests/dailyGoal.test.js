/*
 * Mục tiêu ngày chỉ để hiển thị; hạn mức cứng mới đổi lời nhắn (utils/dailyGoal.js).
 */

import assert from 'node:assert/strict'
import { test } from 'node:test'
import { CAP_MESSAGE, crossedGoal, goalMessage, goalState } from '../src/utils/dailyGoal.js'

test('trạng thái: chưa đạt → đạt mục tiêu (vẫn học được) → chạm hạn mức', () => {
  assert.equal(goalState({ learned: 4, goal: 10, cap: 40 }), 'progress')
  assert.equal(goalState({ learned: 15, goal: 10, cap: 40 }), 'goal') // người chọn 5 phút học trọn bài 15 từ
  assert.equal(goalState({ learned: 40, goal: 10, cap: 40 }), 'cap')
})

test('lời nhắn theo trạng thái', () => {
  assert.equal(goalMessage({ learned: 4, goal: 10, cap: 40 }), '4/10 từ mới. Còn 6 từ nữa!')
  assert.match(goalMessage({ learned: 12, goal: 10, cap: 40 }), /Nghỉ chút/)
  assert.ok(goalMessage({ learned: 41, goal: 10, cap: 40 }).startsWith(CAP_MESSAGE))
})

test('lời khen chỉ hiện khi vừa vượt mục tiêu trong phiên', () => {
  assert.equal(crossedGoal(5, 20, 10), true)
  assert.equal(crossedGoal(10, 25, 10), false)
  assert.equal(crossedGoal(2, 8, 10), false)
})
