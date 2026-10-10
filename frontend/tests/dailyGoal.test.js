/*
 * Mục tiêu ngày chỉ để hiển thị; không có hạn mức từ mới (utils/dailyGoal.js).
 * Lời nhắc nhẹ: số từ mới trong ngày VƯỢT mốc server trả (new_words_nudge_at) → một toast duy nhất trong ngày, không chặn.
 */

import { beforeEach, expect, test, vi } from 'vitest'
import {
  GOAL_MESSAGE, NUDGE_MESSAGE, NUDGE_STORAGE_KEY, crossedGoal, goalMessage, goalState, nudgeOncePerDay, resetNudgeForTest, shouldNudge,
} from '../src/utils/dailyGoal.js'

function memoryStorage() {
  const data = new Map()
  return { getItem: (k) => data.get(k) ?? null, setItem: (k, v) => data.set(k, String(v)) }
}

const today = (newWords, date = '2026-10-10') => ({ date, new_words: newWords, new_words_goal: 15, new_words_nudge_at: 45 })

beforeEach(() => resetNudgeForTest())

test('trạng thái: chưa đạt → đạt mục tiêu; học bao nhiêu cũng không có trạng thái chặn', () => {
  expect(goalState({ learned: 4, goal: 10 })).toBe('progress')
  expect(goalState({ learned: 15, goal: 10 })).toBe('goal') // người chọn 5 phút học trọn bài 15 từ
  expect(goalState({ learned: 120, goal: 10 })).toBe('goal')
})

test('lời nhắn theo trạng thái', () => {
  expect(goalMessage({ learned: 4, goal: 10 })).toBe('4/10 từ mới. Còn 6 từ nữa!')
  expect(goalMessage({ learned: 80, goal: 10 })).toBe(GOAL_MESSAGE)
})

test('lời khen chỉ hiện khi vừa vượt mục tiêu trong phiên', () => {
  expect(crossedGoal(5, 20, 10)).toBe(true)
  expect(crossedGoal(10, 25, 10)).toBe(false)
  expect(crossedGoal(2, 8, 10)).toBe(false)
})

test('nhắc nhẹ chỉ khi VƯỢT mốc (gấp 3 mục tiêu do server tính)', () => {
  expect(shouldNudge(today(45))).toBe(false) // bằng mốc: chưa vượt
  expect(shouldNudge(today(46))).toBe(true)
  expect(shouldNudge({ date: '2026-10-10', new_words: 99 })).toBe(false) // server không gửi mốc
})

test('toast nhắc nhẹ một lần duy nhất trong ngày, ngày mới nhắc lại', () => {
  const push = vi.fn()
  const storage = memoryStorage()
  expect(nudgeOncePerDay(today(30), push, storage)).toBe(false)
  expect(nudgeOncePerDay(today(46), push, storage)).toBe(true)
  expect(nudgeOncePerDay(today(60), push, storage)).toBe(false) // cùng ngày: không nhắc lại
  expect(push).toHaveBeenCalledTimes(1)
  expect(push).toHaveBeenCalledWith({ variant: 'info', title: NUDGE_MESSAGE })
  expect(NUDGE_MESSAGE).toBe('Bạn học nhiều quá trời! Nhớ ôn lại vào những ngày tới để không quên nhé.')
  expect(storage.getItem(NUDGE_STORAGE_KEY)).toBe('2026-10-10')
  expect(nudgeOncePerDay(today(50, '2026-10-11'), push, storage)).toBe(true)
  expect(push).toHaveBeenCalledTimes(2)
})

test('storage bị chặn: vẫn chỉ nhắc một lần trong tab', () => {
  const push = vi.fn()
  const broken = { getItem: () => { throw new Error('blocked') }, setItem: () => { throw new Error('blocked') } }
  expect(nudgeOncePerDay(today(46), push, broken)).toBe(true)
  expect(nudgeOncePerDay(today(47), push, broken)).toBe(false)
  expect(push).toHaveBeenCalledTimes(1)
})
