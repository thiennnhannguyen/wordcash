/*
 * Hằng số giao diện dùng chung trong khu "Khóa học của tôi": nhãn/màu 4 trạng thái từ, 5 chế độ học, định dạng ngày ôn.
 */

import { Brain, Cards, Exam, Lightning, Sparkle } from '@phosphor-icons/react'

export const STATUS = {
  new: { label: 'Mới', color: 'neutral' },
  learning: { label: 'Đang học', color: 'sky' },
  mastered: { label: 'Đã thuộc', color: 'accent' },
  forgotten: { label: 'Đã quên', color: 'danger' },
}
export const STATUS_ORDER = ['mastered', 'learning', 'forgotten', 'new']

export const MODES = [
  { key: 'learn', label: 'Học mới', hint: 'Thẻ học rồi luyện ngay', icon: Sparkle, bg: 'accent' },
  { key: 'review', label: 'Ôn đến hạn', hint: 'Đúng lúc sắp quên', icon: Cards, bg: 'sky' },
  { key: 'quick', label: 'Ôn nhanh', hint: '20 câu trộn ngẫu nhiên', icon: Lightning, bg: 'gold' },
  { key: 'hard', label: 'Từ khó', hint: 'Có sao hoặc hay sai', icon: Brain, bg: 'danger' },
  { key: 'test', label: 'Kiểm tra', hint: '20 câu, có điểm', icon: Exam, bg: 'primary' },
]

const DAY = 24 * 3600 * 1000

export function formatDue(iso) {
  if (!iso) return 'Chưa học'
  const due = new Date(iso)
  const start = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
  const days = Math.round((start(due) - start(new Date())) / DAY)
  if (due.getTime() <= Date.now()) return days < 0 ? `Quá hạn ${-days} ngày` : 'Đến hạn ôn'
  if (days === 0) return 'Ôn hôm nay'
  if (days === 1) return 'Ôn ngày mai'
  if (days < 7) return `Ôn sau ${days} ngày`
  return `Ôn ngày ${due.getDate()}/${due.getMonth() + 1}`
}

export const isOverdue = (iso) => Boolean(iso) && new Date(iso).getTime() <= Date.now()
