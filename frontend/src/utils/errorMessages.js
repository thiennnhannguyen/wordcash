/*
 * Bảng mã lỗi → thông báo tiếng Việt cho mọi mã trong docs/auth.md và docs/courses.md.
 *
 * Server đã trả `message` tiếng Việt; bảng này dùng khi cần câu ngắn gọn thống nhất ở giao diện, khi mất mạng,
 * hoặc khi server trả mã lạ. `fieldErrors` đổi lỗi thành {tên_trường: thông báo} để tô đỏ đúng ô:
 * VALIDATION_ERROR lấy `details[i].field`, lỗi 409 (EMAIL_TAKEN, USERNAME_TAKEN) lấy `details.field`.
 */

export const ERROR_MESSAGES = {
  // Chung
  VALIDATION_ERROR: 'Dữ liệu chưa hợp lệ, bạn kiểm tra lại nhé.',
  NOT_FOUND: 'Không tìm thấy.',
  METHOD_NOT_ALLOWED: 'Thao tác này không được hỗ trợ.',
  HTTP_ERROR: 'Yêu cầu không hợp lệ.',
  INTERNAL_ERROR: 'Đã có lỗi xảy ra, bạn thử lại sau nhé.',
  NETWORK_ERROR: 'Không kết nối được máy chủ, bạn thử lại sau nhé.',
  FORBIDDEN: 'Bạn không có quyền thực hiện thao tác này.',
  // Tài khoản (docs/auth.md)
  EMAIL_TAKEN: 'Email này đã được dùng.',
  USERNAME_TAKEN: 'Tên người dùng đã có người chọn.',
  INVALID_CREDENTIALS: 'Email/tên người dùng hoặc mật khẩu không đúng.',
  TOO_MANY_ATTEMPTS: 'Bạn thử quá nhiều lần. Vui lòng đợi một lúc rồi thử lại.',
  TOKEN_EXPIRED: 'Phiên đăng nhập đã hết hạn. Bạn đăng nhập lại nhé.',
  TOKEN_INVALID: 'Phiên đăng nhập không hợp lệ. Bạn đăng nhập lại nhé.',
  SESSION_REVOKED: 'Phiên đăng nhập đã bị thu hồi. Bạn đăng nhập lại nhé.',
  WEAK_PASSWORD: 'Mật khẩu này quá dễ đoán, bạn chọn mật khẩu khác nhé.',
  WRONG_PASSWORD: 'Mật khẩu hiện tại không đúng.',
  ACCOUNT_DISABLED: 'Tài khoản này đã bị khóa.',
  FORBIDDEN_ORIGIN: 'Yêu cầu bị từ chối vì không đến từ trang WORDCLASH.',
  MASCOT_NOT_OWNED: 'Bạn chưa sở hữu linh vật này nên chưa thể đặt làm ảnh đại diện.',
  EMAIL_NOT_VERIFIED: 'Bạn cần xác thực email trước.',
  // Khóa học của tôi (docs/courses.md)
  COURSE_NOT_FOUND: 'Không tìm thấy khóa học.',
  COURSE_LIMIT_REACHED: 'Bạn đã chạm giới hạn số khóa học. Lưu trữ hoặc xóa bớt một khóa nhé.',
  WORD_LIMIT_REACHED: 'Đã chạm giới hạn số từ cho phép.',
  DUPLICATE_IN_COURSE: 'Từ này đã có trong khóa học.',
  ENTRY_NOT_FOUND: 'Không tìm thấy mục từ.',
  ENTRY_NOT_OWNED: 'Bạn chỉ sửa được từ do chính mình tạo.',
  SYSTEM_ENTRY_EXISTS: 'Từ này đã có trong kho WORDCLASH, kèm đủ phát âm và ví dụ.',
  CUSTOM_ENTRY_EXISTS: 'Bạn đã tự tạo từ này rồi.',
  IMPORT_INVALID: 'Nội dung nhập chưa đúng định dạng.',
  CONFIRM_REQUIRED: 'Bạn cần xác nhận trước khi xóa.',
  NOTHING_TO_STUDY: 'Không có từ nào phù hợp với chế độ học này.',
  STUDY_SESSION_NOT_FOUND: 'Không tìm thấy phiên học.',
  STUDY_SESSION_EXPIRED: 'Phiên học đã hết hạn, bạn bắt đầu phiên mới nhé.',
  STUDY_SESSION_FINISHED: 'Phiên học này đã kết thúc.',
}

// Mã mà thông báo của server cụ thể hơn bảng (kèm con số, lý do): ưu tiên dùng message của server
const PREFER_SERVER = new Set(['TOO_MANY_ATTEMPTS', 'WORD_LIMIT_REACHED', 'COURSE_LIMIT_REACHED', 'IMPORT_INVALID'])

/** Thông báo hiển thị cho một lỗi đã chuẩn hóa {code, message, details, status}. */
export function messageFor(error) {
  if (!error) return ''
  if (PREFER_SERVER.has(error.code) && error.message) return error.message
  if (error.code === 'TOO_MANY_ATTEMPTS' && error.details?.retry_after_seconds) {
    return `${ERROR_MESSAGES.TOO_MANY_ATTEMPTS} (khoảng ${Math.ceil(error.details.retry_after_seconds / 60)} phút)`
  }
  return ERROR_MESSAGES[error.code] ?? error.message ?? ERROR_MESSAGES.INTERNAL_ERROR
}

/** Lỗi theo từng trường: {email: '…', username: '…'}. Trả {} nếu lỗi không gắn với trường nào. */
export function fieldErrors(error) {
  if (!error) return {}
  if (error.code === 'VALIDATION_ERROR' && Array.isArray(error.details)) {
    return Object.fromEntries(error.details.filter((d) => d.field && d.field !== '_').map((d) => [d.field, d.message]))
  }
  if (error.details?.field) return { [error.details.field]: messageFor(error) }
  return {}
}
