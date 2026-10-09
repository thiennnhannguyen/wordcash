/*
 * Tải một khối dữ liệu từ server và trả trạng thái cho components/ui/DataState.jsx:
 * `status`: loading | error | ready; `data` chỉ có khi ready; `reload()` tải lại (nút "Thử lại").
 * Lỗi KHÔNG BAO GIỜ được thay bằng dữ liệu giả: khối hiện ErrorState.
 * `load` là hàm async; `deps` như useEffect (đổi thì tải lại).
 */

import { useCallback, useEffect, useRef, useState } from 'react'

export default function useServerData(load, deps = []) {
  const [state, setState] = useState({ status: 'loading', data: null, error: null })
  const [nonce, setNonce] = useState(0)
  const loadRef = useRef(load)
  loadRef.current = load

  useEffect(() => {
    let alive = true
    setState((s) => (s.status === 'loading' ? s : { status: 'loading', data: null, error: null }))
    Promise.resolve()
      .then(() => loadRef.current())
      .then((data) => alive && setState({ status: 'ready', data, error: null }))
      .catch((error) => alive && setState({ status: 'error', data: null, error }))
    return () => {
      alive = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nonce, ...deps])

  const reload = useCallback(() => setNonce((n) => n + 1), [])
  return { ...state, reload }
}
