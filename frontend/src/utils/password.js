/*
 * Chấm độ mạnh mật khẩu 0–4 để hiển thị gợi ý khi đăng ký.
 * Chỉ phục vụ giao diện; server vẫn tự kiểm tra quy tắc mật khẩu.
 */

export const MIN_PASSWORD_LENGTH = 8

export const STRENGTH_LABELS = ['Quá ngắn', 'Yếu', 'Tạm được', 'Khá', 'Mạnh']

export function passwordStrength(password) {
  if (!password || password.length < MIN_PASSWORD_LENGTH) return password ? 1 : 0
  let score = 1
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score += 1
  if (/\d/.test(password)) score += 1
  if (/[^A-Za-z0-9]/.test(password) || password.length >= 14) score += 1
  return Math.min(score, 4)
}
