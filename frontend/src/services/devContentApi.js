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

/**
 * Viết lại MỘT trường. Chế độ agent (mặc định): yêu cầu vào hàng đợi, trả {queued: true, request}; AI_PROVIDER=anthropic: trả
 * {field, old, new, queued: false}. Cả hai KHÔNG tự lưu.
 */
export const rewriteField = (level, topic, key, field, note) =>
  request({ url: `${base}/${level}/${topic}/entries/${encodeURIComponent(key)}/rewrite`, method: 'POST', data: { field, note } })

/** Chọn bản mới (accept = true, ghi vào file) hoặc giữ bản cũ của một yêu cầu viết lại; trả {entry, summary, rewrites}. */
export const resolveRewrite = (level, topic, id, accept) =>
  request({ url: `${base}/${level}/${topic}/rewrites/${encodeURIComponent(id)}`, method: 'POST', data: { accept } })

export const patchUnit = (level, topic, unitKey, patch) =>
  request({ url: `${base}/${level}/${topic}/units/${encodeURIComponent(unitKey)}`, method: 'PATCH', data: patch })
