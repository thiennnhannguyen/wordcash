/*
 * Theo dõi một media query CSS, vd. `useMediaQuery('(min-width: 768px)')` để đổi bố cục bằng JS
 * khi class Tailwind không đủ (clip-path, hướng chuyển động).
 */

import { useEffect, useState } from 'react'

export default function useMediaQuery(query) {
  const [matches, setMatches] = useState(() => typeof window !== 'undefined' && window.matchMedia(query).matches)

  useEffect(() => {
    const mq = window.matchMedia(query)
    const onChange = () => setMatches(mq.matches)
    onChange()
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [query])

  return matches
}
