/*
 * Chạy hàm bắt đầu phiên đúng MỘT lần cho mỗi bộ tham số, kể cả khi React StrictMode (lúc dev) gọi effect hai lần.
 * Tránh tạo hai phiên học trên server cho một lần mở trang (giao diện hiện câu của phiên này nhưng nộp vào phiên kia).
 */

import { useEffect, useRef } from 'react'

export default function useStartOnce(start, deps) {
  const key = JSON.stringify(deps)
  const started = useRef(null)
  useEffect(() => {
    if (started.current === key) return
    started.current = key
    start()
  }, [key]) // eslint-disable-line react-hooks/exhaustive-deps
}
