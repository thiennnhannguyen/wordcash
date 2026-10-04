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

/** Múi giờ IANA của trình duyệt (Intl.DateTimeFormat().resolvedOptions().timeZone), không có thì mặc định Việt Nam. */
export function browserTimezone() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || DEFAULT_TIMEZONE
  } catch {
    return DEFAULT_TIMEZONE
  }
}
