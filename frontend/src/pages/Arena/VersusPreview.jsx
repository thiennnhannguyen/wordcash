/*
 * Trang xem thử màn VS (chỉ để duyệt thiết kế). Không có `frame` thì màn VS chạy lặp lại;
 * `?frame=a|b|c|d` dừng ở từng khung hình chính: (a) hai nửa trượt vào, (b) VS đập xuống,
 * (c) giữ nguyên, (d) vệt trắng chéo quét qua.
 */

import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { MATCH_INFO, OPPONENT, PLAYER_CARD } from './arenaMock'
import VersusIntro from './VersusIntro'

export default function VersusPreview() {
  const [params] = useSearchParams()
  const [round, setRound] = useState(0)
  const frame = params.get('frame')

  return (
    <VersusIntro
      key={`${frame}-${round}`}
      player={PLAYER_CARD}
      opponent={OPPONENT}
      match={MATCH_INFO}
      frame={frame}
      onDone={() => setTimeout(() => setRound((r) => r + 1), 600)}
    />
  )
}
