/*
 * Gọi API "Khóa học của tôi" (docs/courses.md) qua services/api.js. Trả JSON của server (snake_case), lỗi dạng
 * {code, message, details, status}. Riêng câu hỏi phiên học được đổi `letter_count` → `letterCount` cho khớp
 * components/academy/QuestionView.
 */

import { request } from './api'
const api = {
  listCourses: ({ archived = false } = {}) => request({ url: '/courses', params: { archived } }),
  createCourse: (data) => request({ method: 'post', url: '/courses', data }),
  getCourse: (id) => request({ url: `/courses/${id}` }),
  updateCourse: (id, data) => request({ method: 'patch', url: `/courses/${id}`, data }),
  setArchived: (id, archived) => request({ method: 'post', url: `/courses/${id}/${archived ? 'archive' : 'restore'}` }),
  deleteCourse: (id) => request({ method: 'delete', url: `/courses/${id}`, params: { confirm: true } }),
  getStats: (id) => request({ url: `/courses/${id}/stats` }),
  listEntries: (id, { q, filter, sort, page, pageSize } = {}) =>
    request({ url: `/courses/${id}/entries`, params: { q: q || undefined, filter, sort, page, page_size: pageSize } }),
  addFromBank: (id, entryId, personalNote = null) =>
    request({ method: 'post', url: `/courses/${id}/entries/from-bank`, data: { entry_id: entryId, personal_note: personalNote } }),
  createCustom: (id, data) => request({ method: 'post', url: `/courses/${id}/entries/custom`, data }),
  updateEntry: (id, entryId, data) => request({ method: 'patch', url: `/courses/${id}/entries/${entryId}`, data }),
  removeEntry: (id, entryId) => request({ method: 'delete', url: `/courses/${id}/entries/${entryId}` }),
  deleteCustom: (entryId) => request({ method: 'delete', url: `/custom-entries/${entryId}` }),
  bankSearch: (q, courseId) => request({ url: '/bank/search', params: { q, course_id: courseId || undefined } }),
  importPreview: (id, data) => request({ method: 'post', url: `/courses/${id}/import/preview`, data }),
  importCommit: (id, data) => request({ method: 'post', url: `/courses/${id}/import/commit`, data }),
  startSession: (id, data) => request({ method: 'post', url: `/courses/${id}/study-sessions`, data }),
  submitAnswers: (sessionId, answers) => request({ method: 'post', url: `/study-sessions/${sessionId}/answers`, data: { answers } }),
}

const impl = api

export const listCourses = impl.listCourses
export const createCourse = impl.createCourse
export const getCourse = impl.getCourse
export const updateCourse = impl.updateCourse
export const setArchived = impl.setArchived
export const deleteCourse = impl.deleteCourse
export const getStats = impl.getStats
export const listEntries = impl.listEntries
export const addFromBank = impl.addFromBank
export const createCustom = impl.createCustom
export const updateEntry = impl.updateEntry
export const removeEntry = impl.removeEntry
export const deleteCustom = impl.deleteCustom
export const bankSearch = impl.bankSearch
export const importPreview = impl.importPreview
export const importCommit = impl.importCommit
export const submitAnswers = impl.submitAnswers

export async function startSession(id, data) {
  const session = await impl.startSession(id, data)
  return { ...session, questions: session.questions.map(({ letter_count: letterCount, ...q }) => ({ ...q, letterCount })) }
}

/*
 * Thêm một từ đang xem (thẻ học Học Viện, "Từ bạn đã sai", "Từ của ngày") vào khóa học.
 * Có `id` của mục từ trong kho thì liên kết thẳng; chưa có thì tìm đúng chữ trong kho rồi liên kết;
 * kho không có thì tạo từ riêng với nghĩa đang hiển thị.
 */
export async function addWordToCourse(courseId, { id, headword, meaning_vi: meaning }) {
  if (id) return addFromBank(courseId, id)
  const exact = (await bankSearch(headword, courseId)).find((r) => r.headword.toLowerCase() === headword.toLowerCase())
  if (exact) {
    if (exact.in_course) throw { code: 'DUPLICATE_IN_COURSE', message: 'Từ này đã có trong khóa học.', details: null, status: 409 }
    return addFromBank(courseId, exact.id)
  }
  return createCustom(courseId, { headword, meaning_vi: meaning })
}
