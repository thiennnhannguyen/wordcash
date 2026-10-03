/*
 * Trang xem thử màn LÊN RANK (trong ứng dụng, màn này hiện đè lên trang đang học khi server báo vừa lên rank).
 * Nút "Nhận thẻ chứng nhận" mở màn xem trước thẻ, "Quay ngay" tới lượt quay đặc biệt, "Về Sảnh" về trang chính.
 *
 * Dev: `?to=bach_kim|huyen_thoai|…` (rank mới; rank cũ là rank liền trước), `?hold=a|b|c|d|e|f` (dừng ở một khung).
 */

import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import RankUpOverlay from '../../components/layout/RankUpOverlay'
import { RANKS } from '../../utils/constants'
import { getMascot } from '../../data/mascots'
import CertificateModal from '../Profile/Certificate'
import { fetchCertificate } from '../Profile/profileMock'

export default function RankUpPreview() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const toKey = RANKS.some((r) => r.key === params.get('to')) && params.get('to') !== 'tan_binh' ? params.get('to') : 'bach_kim'
  const index = RANKS.findIndex((r) => r.key === toKey)
  const [cert] = useState(() => fetchCertificate(toKey))
  const [certOpen, setCertOpen] = useState(false)

  return (
    <div className="min-h-dvh bg-bg">
      <RankUpOverlay
        key={`${toKey}-${params.get('hold')}`}
        from={RANKS[index - 1].key}
        to={toKey}
        words={RANKS[index].min}
        mascot={getMascot(1)}
        hold={params.get('hold')}
        onCertificate={() => setCertOpen(true)}
        onSpin={() => navigate('/collection/spin?type=special')}
        onLobby={() => navigate('/lobby')}
      />
      <CertificateModal open={certOpen} onClose={() => setCertOpen(false)} cert={cert} />
    </div>
  )
}
