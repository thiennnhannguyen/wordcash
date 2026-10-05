/*
 * Hiện phần thưởng server trả về sau khi nộp bài / Cửa Ải: lượt quay mới (toast) và lên rank (màn LÊN RANK toàn màn hình).
 *
 * `rewards`: {spins: [{kind, reason, ref}], rank: {from, to, ranked_up, became_shaky, …} | null} đúng như API.
 * Toast lượt quay có nút "Quay ngay" dẫn tới màn quay; số lượt trên menu (chấm đỏ Bộ Sưu Tập) được làm mới.
 * Client không tự tính gì: chỉ diễn lại những gì server đã cấp. Mỗi bộ phần thưởng chỉ hiện một lần (theo `key`).
 */

import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import RankUpOverlay from '../layout/RankUpOverlay'
import { FALLBACK_MASCOT, mascotById } from '../../store/mascotStore'
import { useCollectionStore } from '../../store/collectionStore'
import { useAuthStore } from '../../store/authStore'
import { useToastStore } from '../../store/toastStore'

const REASONS = {
  milestone: (ref) => `Thuộc đủ ${ref} từ`,
  rank_up: () => 'Lên rank mới',
  boss: (ref) => `Lần đầu hạ Boss ${ref}`,
  streak: () => 'Chạm mốc streak',
}

export default function RewardsLayer({ rewards, words }) {
  const navigate = useNavigate()
  const pushToast = useToastStore((s) => s.push)
  const user = useAuthStore((s) => s.user)
  const shown = useRef(null)
  const [rankUp, setRankUp] = useState(null)

  useEffect(() => {
    if (!rewards || shown.current === rewards) return
    shown.current = rewards
    for (const spin of rewards.spins ?? []) {
      pushToast({
        variant: 'reward',
        title: spin.kind === 'special' ? '+1 lượt quay đặc biệt' : '+1 lượt quay',
        message: REASONS[spin.reason]?.(spin.ref) ?? 'Phần thưởng mới',
        action: { label: 'Quay ngay', onClick: () => navigate(`/collection/spin${spin.kind === 'special' ? '?type=special' : ''}`) },
      })
    }
    if (rewards.spins?.length) useCollectionStore.getState().refresh({ force: true })
    if (rewards.rank?.ranked_up) setRankUp(rewards.rank)
  }, [rewards, pushToast, navigate])

  if (!rankUp) return null
  const close = () => setRankUp(null)
  return (
    <div className="fixed inset-0 z-[200]">
      <RankUpOverlay
        from={rankUp.from}
        to={rankUp.to}
        words={words}
        mascot={mascotById(user?.avatar_mascot_id) ?? FALLBACK_MASCOT}
        onSpin={() => navigate('/collection/spin?type=special')}
        onLobby={close}
        onCertificate={() => navigate('/profile?cert=1')}
      />
    </div>
  )
}
