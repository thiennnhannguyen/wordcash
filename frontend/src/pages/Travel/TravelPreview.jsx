/*
 * Trang phát cảnh chuyển cấp. Trong luồng thật: thắng Trận Boss → server mở cấp mới → màn kết quả Boss dẫn tới đây;
 * người dùng mới xong onboarding (bắt đầu từ A1) thấy biến thể "Hành trình bắt đầu từ đây".
 *
 * Dev: `?from=B1` (cấp vừa chinh phục), `?hold=a|b|c|d|e` (dừng ở một khung), `?variant=start` (người dùng mới).
 */

import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { getMascot } from '../../data/mascots'
import LevelTravel from './LevelTravel'
import StartJourney from './StartJourney'
import { fetchJourneyStart, fetchLevelComplete } from './travelMock'

export default function TravelPreview() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const variant = params.get('variant')
  const from = params.get('from') ?? 'B1'
  const [data] = useState(() => (variant === 'start' ? fetchJourneyStart() : fetchLevelComplete(from)))
  const mascot = getMascot(1)

  if (variant === 'start') return <StartJourney data={data} mascot={mascot} onStart={() => navigate('/academy?level=A1')} />
  return <LevelTravel key={params.toString()} data={data} mascot={mascot} hold={params.get('hold')} onStart={() => navigate(`/academy?level=${data.to?.code ?? from}`)} />
}
