/*
 * API công cụ duyệt nội dung kho từ (CHỈ dev: backend chỉ gắn /dev/content khi ENV=development; trang /dev/content chỉ có
 * trong bản dev). Đọc / ghi trực tiếp file backend/content/<cấp>/<chủ-đề>.json.
 */

import { request } from './api'

const base = '/dev/content'

export const fetchLevels = () => request({ url: base })

export const fetchTopic = (level, topic) => request({ url: `${base}/${level}/${topic}` })

/** Sửa trường và/hoặc đổi trạng thái (approved | rejected | draft). Từ chối bắt buộc `reject_reason`. */
export const patchEntry = (level, topic, key, patch) =>
  request({ url: `${base}/${level}/${topic}/entries/${encodeURIComponent(key)}`, method: 'PATCH', data: patch })

export const fetchSampleQuestions = (level, topic, key) =>
  request({ url: `${base}/${level}/${topic}/entries/${encodeURIComponent(key)}/questions` })

/** AI viết lại MỘT trường; trả {field, old, new}, KHÔNG tự lưu. */
export const rewriteField = (level, topic, key, field, note) =>
  request({ url: `${base}/${level}/${topic}/entries/${encodeURIComponent(key)}/rewrite`, method: 'POST', data: { field, note } })

export const patchUnit = (level, topic, unitKey, patch) =>
  request({ url: `${base}/${level}/${topic}/units/${encodeURIComponent(unitKey)}`, method: 'PATCH', data: patch })
