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
