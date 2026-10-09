/*
 * Báo lỗi nội dung (nút "Báo lỗi" ở thẻ học và tấm phản hồi sau mỗi câu; chỉ từ hệ thống).
 * Câu hỏi: gửi tham chiếu phiên + câu (server tự chụp lại đề + đáp án đúng đã lưu, không lấy từ client); thẻ học: entry_id.
 * Phản hồi `{created}`: false = hôm nay đã báo cùng từ + cùng loại (vẫn coi là thành công).
 */

import { request } from './api'

export const REPORT_KINDS = [
  { value: 'confusing_answer', label: 'Đáp án gây nhầm', hint: 'Có hơn một đáp án đúng', questionOnly: true },
  { value: 'wrong_meaning', label: 'Nghĩa sai', hint: 'Nghĩa tiếng Việt chưa đúng' },
  { value: 'wrong_example', label: 'Câu ví dụ sai', hint: 'Câu tiếng Anh hoặc bản dịch có lỗi' },
  { value: 'wrong_audio', label: 'Phát âm sai', hint: 'Âm thanh hoặc phiên âm chưa đúng' },
  { value: 'other', label: 'Lỗi khác', hint: 'Ghi rõ ở ô bên dưới' },
]

export const reportContent = (body) => request({ method: 'post', url: '/content-reports', data: body })

/* ---------- Quản trị (CHỈ role admin; dùng ở tab "Báo lỗi" của /dev/content) ---------- */

/** Báo cáo gom theo mục, sắp theo số báo cáo. `status`: open | resolved | dismissed | all. */
export const fetchReports = (status = 'open') => request({ url: '/admin/content-reports', params: { status } })

/** resolved / dismissed: mọi báo cáo đang mở của mục; open: mở lại. Trả {updated}. */
export const setEntryReportStatus = (entryId, status) =>
  request({ method: 'patch', url: `/admin/content-reports/entries/${entryId}`, data: { status } })

export const setReportStatus = (id, status) => request({ method: 'patch', url: `/admin/content-reports/${id}`, data: { status } })
