/*
 * Bộ chọn linh vật đang sở hữu (Sảnh → "Linh vật đang dùng" → ĐỔI): lưới các thẻ đã có, bấm một thẻ để đặt làm avatar.
 * Chỉ hiện linh vật đang sở hữu (GET /collection); server vẫn kiểm tra lại quyền sở hữu (MASCOT_NOT_OWNED).
 * Mobile: tấm trượt toàn màn hình.
 */

import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { BookOpen, CheckFat } from '@phosphor-icons/react'
import Button from '../ui/Button'
import Icon from '../ui/Icon'
import Modal from '../ui/Modal'
import MascotCard from './MascotCard'
import MascotBlob from './MascotBlob'
import { useAuthStore } from '../../store/authStore'
import { useMascotCatalog } from '../../store/mascotStore'
import { useToastStore } from '../../store/toastStore'
import { fetchCollection, updateMascots } from '../../services/collectionApi'
import { RARITIES } from '../../utils/constants'
import { messageFor } from '../../utils/errorMessages'
import { formatMascotNumber } from '../../utils/format'

export default function MascotPicker({ open, onClose }) {
  const navigate = useNavigate()
  const catalog = useMascotCatalog()
  const user = useAuthStore((s) => s.user)
  const setUser = useAuthStore((s) => s.setUser)
  const pushToast = useToastStore((s) => s.push)
  const [owned, setOwned] = useState(null)
  const [busy, setBusy] = useState(null)

  useEffect(() => {
    if (!open) return
    setOwned(null)
    fetchCollection()
      .then((c) => setOwned(Object.keys(c.owned).map(Number).sort((a, b) => a - b)))
      .catch(() => setOwned([]))
  }, [open])

  const pick = async (mascot) => {
    setBusy(mascot.id)
    try {
      const updated = await updateMascots({ avatarId: mascot.id })
      if (updated) setUser(updated)
      pushToast({ variant: 'success', title: 'Đã đổi avatar', message: `${mascot.name} giờ là ảnh đại diện của bạn.` })
      onClose()
    } catch (err) {
      pushToast({ variant: 'error', title: 'Chưa đổi được', message: messageFor(err) })
    } finally {
      setBusy(null)
    }
  }

  const list = (owned ?? []).map((id) => catalog.byId[id]).filter(Boolean)

  return (
    <Modal open={open} onClose={onClose} mobileSheet title="Chọn linh vật" className="max-w-3xl">
      <div className="flex flex-col gap-4 text-ink">
        <p className="font-medium text-muted">Chỉ để trang trí, không ảnh hưởng tới trận đấu.</p>
        {owned === null || !catalog.ready ? (
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-4" aria-busy="true">
            {Array.from({ length: 4 }, (_, i) => (
              <div key={i} className="aspect-[3/4] animate-pulse rounded-[20px] bg-raised" />
            ))}
          </div>
        ) : (
          <ul className="grid grid-cols-3 gap-x-3 gap-y-4 sm:grid-cols-4 md:grid-cols-5">
            {list.map((m) => {
              const current = m.id === user?.avatar_mascot_id
              return (
                <li key={m.id}>
                  <button
                    type="button"
                    disabled={current || busy !== null}
                    onClick={() => pick(m)}
                    aria-label={`${formatMascotNumber(m.number)} ${m.name}, ${RARITIES[m.rarity].name}${current ? ', đang dùng' : ''}`}
                    className="relative block w-full rounded-[22px] p-1 text-left transition-transform enabled:hover:-translate-y-1 disabled:cursor-default"
                  >
                    <MascotCard rarity={m.rarity} name={m.name} number={m.number} compact art={<MascotBlob color={m.color} shape={m.shape} traits={m.traits} size={80} shadow={false} />} />
                    {current && (
                      <span className="absolute -right-1 -top-1 z-30 grid size-8 place-items-center rounded-pill border-2 border-line bg-accent shadow-hard-sm">
                        <Icon icon={CheckFat} size={16} color="ink" />
                      </span>
                    )}
                  </button>
                </li>
              )
            })}
          </ul>
        )}
        <Button variant="secondary" icon={BookOpen} onClick={() => navigate('/collection')} className="self-start">
          Xem cả album
        </Button>
      </div>
    </Modal>
  )
}
