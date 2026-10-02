/*
 * Định dạng số, ngày.
 */

const numberFormatter = new Intl.NumberFormat('vi-VN')

/** 1234 → "1.234" */
export function formatNumber(value) {
  return numberFormatter.format(value ?? 0)
}

/** -1 → "−1", 3 → "+3" (dấu trừ thật, dùng cho thay đổi số từ, máu...) */
export function formatDelta(value) {
  if (value > 0) return `+${formatNumber(value)}`
  if (value < 0) return `−${formatNumber(Math.abs(value))}`
  return '0'
}

/** Số ngày tới lần ôn tiếp (server tính) → "Hôm nay", "Ngày mai", "3 ngày nữa"; null → "Chưa học" */
export function formatDueIn(days) {
  if (days == null) return 'Chưa học'
  if (days <= 0) return 'Hôm nay'
  if (days === 1) return 'Ngày mai'
  return `${days} ngày nữa`
}

const decimalFormatter = new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 1 })

/** 1.9 → "1,9" (số thập phân kiểu Việt Nam, tối đa 1 chữ số lẻ) */
export function formatDecimal(value) {
  return decimalFormatter.format(value ?? 0)
}

/** Số phút đã qua → "2 phút trước", "3 giờ trước", "2 ngày trước" */
export function formatTimeAgo(minutes) {
  if (minutes < 1) return 'Vừa xong'
  if (minutes < 60) return `${minutes} phút trước`
  if (minutes < 1440) return `${Math.floor(minutes / 60)} giờ trước`
  return `${Math.floor(minutes / 1440)} ngày trước`
}

/** Số giây → đồng hồ "00:07", "01:25" */
export function formatClock(seconds) {
  const s = Math.max(0, Math.floor(seconds))
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`
}

/** Date hoặc chuỗi ISO → "30/09/2026" */
export function formatDate(value) {
  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(value))
}

/** Số thứ tự linh vật → "#037" */
export function formatMascotNumber(number) {
  return `#${String(number).padStart(3, '0')}`
}

/** Ngày ISO ("2026-09-11" hoặc có giờ) → "11.09" (dd.mm) cho con dấu "ĐÃ ĐẾN". Ngày sai định dạng trả chuỗi rỗng. */
export function formatDayMonth(iso) {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso ?? '')
  return m ? `${m[3]}.${m[2]}` : ''
}
