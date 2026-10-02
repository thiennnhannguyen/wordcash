/*
 * Danh sách múi giờ cho ô chọn khi đăng ký. "Ngày" của Cửa Ải và streak tính theo múi giờ này.
 */

export const DEFAULT_TIMEZONE = 'Asia/Ho_Chi_Minh'

export const TIMEZONES = [
  { value: 'Asia/Ho_Chi_Minh', label: 'GMT+7 (Việt Nam)' },
  { value: 'Asia/Bangkok', label: 'GMT+7 (Thái Lan)' },
  { value: 'Asia/Singapore', label: 'GMT+8 (Singapore)' },
  { value: 'Asia/Tokyo', label: 'GMT+9 (Nhật Bản)' },
  { value: 'Asia/Seoul', label: 'GMT+9 (Hàn Quốc)' },
  { value: 'Australia/Sydney', label: 'GMT+10/+11 (Sydney)' },
  { value: 'Europe/London', label: 'GMT+0/+1 (London)' },
  { value: 'Europe/Berlin', label: 'GMT+1/+2 (Berlin)' },
  { value: 'America/New_York', label: 'GMT−5/−4 (New York)' },
  { value: 'America/Los_Angeles', label: 'GMT−8/−7 (Los Angeles)' },
]

/** Múi giờ của trình duyệt nếu có trong danh sách, không thì mặc định Việt Nam. */
export function detectTimezone() {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone
    return TIMEZONES.some((t) => t.value === tz) ? tz : DEFAULT_TIMEZONE
  } catch {
    return DEFAULT_TIMEZONE
  }
}
