/*
 * Đếm ngược tới một thời điểm do server trả (ISO), cập nhật mỗi giây.
 * Trả về số ngày, giờ, phút, giây còn lại (không âm).
 */

import { useEffect, useState } from 'react'

export default function useCountdown(deadline) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    if (!deadline) return undefined
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [deadline])
  const left = Math.max(0, new Date(deadline).getTime() - now)
  const s = Math.floor(left / 1000)
  return { days: Math.floor(s / 86400), hours: Math.floor((s % 86400) / 3600), minutes: Math.floor((s % 3600) / 60), seconds: s % 60 }
}
