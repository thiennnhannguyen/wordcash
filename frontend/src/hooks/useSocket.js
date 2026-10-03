/*
 * Kết nối và lắng nghe sự kiện Socket.IO.
 *
 * Dùng trong các màn Đấu Trường: mở kết nối khi màn được gắn, đóng khi rời (services/socket.js đếm số màn đang dùng).
 * Trả `{ socket, status }`, status: connecting | connected | disconnected | error.
 */

import { useEffect, useState } from 'react'
import { connectSocket, disconnectSocket } from '../services/socket'

export default function useSocket(enabled = true) {
  const [status, setStatus] = useState('idle')
  const [socket, setSocket] = useState(null)

  useEffect(() => {
    if (!enabled) return undefined
    setSocket(connectSocket({ onStatus: (s) => setStatus(s) }))
    return () => {
      disconnectSocket()
      setSocket(null)
    }
  }, [enabled])

  return { socket, status }
}
