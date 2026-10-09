/*
 * Kệ trưng bày tối đa 3 thẻ linh vật trên Hồ sơ (`showcase` do server trả: chủ hồ sơ tự chọn, hoặc mặc định 3 con hiếm nhất).
 * Chủ hồ sơ bấm "Đổi" ở từng ô để chọn thẻ đang sở hữu (GET /collection); lưu bằng PATCH /users/me {showcase_mascot_ids},
 * server kiểm tra sở hữu (MASCOT_NOT_OWNED). Ô trống hiện khung nét đứt.
 * Bên cạnh là tiến độ bộ sưu tập ("Bộ sưu tập x/y": số linh vật sở hữu từ hồ sơ, tổng ô từ GET /public/stats) và nút "Xem album"
 * (chỉ trên hồ sơ của mình).
 */

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { BookOpen, Cards, PencilSimple, Plus } from '@phosphor-icons/react'
import Button from '../../components/ui/Button'
import Icon from '../../components/ui/Icon'
import Modal from '../../components/ui/Modal'
import MascotCard from '../../components/collection/MascotCard'
import { EmptyState, ErrorState, Skeleton } from '../../components/ui/DataState'
import useServerData from '../../hooks/useServerData'
import { fetchCollection } from '../../services/collectionApi'
import { updateMe } from '../../services/profileApi'
import { useMascotCatalog } from '../../store/mascotStore'
import { useRules } from '../../store/rulesStore'
import { useToastStore } from '../../store/toastStore'
import { messageFor } from '../../utils/errorMessages'
import MascotArt from '../Collection/MascotArt'
import { StatCard } from './LearningStats'

const SLOTS = 3

function Picker({ open, onClose, taken, onPick }) {
  const { byId } = useMascotCatalog()
  const state = useServerData(() => (open ? fetchCollection() : Promise.resolve(null)), [open])
  const list = state.data ? Object.keys(state.data.owned).map(Number).sort((a, b) => a - b).map((id) => byId[id]).filter(Boolean) : []
  return (
    <Modal open={open} onClose={onClose} title="Chọn thẻ trưng bày" mobileSheet className="max-w-3xl">
      {state.status === 'loading' && (
        <div className="grid grid-cols-3 gap-3 p-1 pt-3 sm:grid-cols-4 md:grid-cols-5" role="status" aria-label="Đang tải">
          {Array.from({ length: 5 }, (_, i) => (
            <Skeleton key={i} className="aspect-[3/4] w-full" rounded="rounded-[20px]" />
          ))}
        </div>
      )}
      {state.status === 'error' && <ErrorState title="Chưa tải được bộ sưu tập" onRetry={state.reload} />}
      {state.data && list.length === 0 && <EmptyState title="Chưa có linh vật nào" message="Quay thẻ để sưu tầm linh vật." />}
      {list.length > 0 && (
        <ul className="grid max-h-[60dvh] grid-cols-3 gap-3 overflow-y-auto p-1 pt-3 sm:grid-cols-4 md:grid-cols-5">
          {list.map((m) => (
            <li key={m.id}>
              <button
                type="button"
                disabled={taken.includes(m.id)}
                onClick={() => onPick(m.id)}
                className="block w-full rounded-[22px] transition-transform enabled:hover:-translate-y-1 disabled:cursor-not-allowed disabled:opacity-40"
                aria-label={`${m.name}${taken.includes(m.id) ? ', đang trưng bày' : ''}`}
              >
                <MascotCard rarity={m.rarity} name={m.name} number={m.number} art={<MascotArt mascot={m} />} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </Modal>
  )
}

function EmptySlot({ isMe, onPick }) {
  const Tag = isMe ? 'button' : 'div'
  return (
    <Tag
      type={isMe ? 'button' : undefined}
      onClick={isMe ? onPick : undefined}
      className="grid aspect-[3/4] w-full place-items-center rounded-[20px] border-thick border-dashed border-line/40 bg-raised font-display text-[13px] font-bold uppercase text-muted"
    >
      {isMe ? (
        <span className="flex flex-col items-center gap-1">
          <Icon icon={Plus} size={22} /> Chọn
        </span>
      ) : (
        'Trống'
      )}
    </Tag>
  )
}

export default function Showcase({ profile, onChange, onSaved }) {
  const navigate = useNavigate()
  const { byId } = useMascotCatalog()
  const { stats } = useRules()
  const [slot, setSlot] = useState(null)
  const ids = profile.showcase.map((s) => s.mascot_id)
  const slots = Array.from({ length: SLOTS }, (_, i) => profile.showcase[i] ?? null)

  const pick = async (id) => {
    const next = [...ids]
    next[slot] = id
    const clean = next.filter((x) => x != null)
    setSlot(null)
    const before = profile.showcase
    onChange(clean.map((mid) => before.find((s) => s.mascot_id === mid) ?? { mascot_id: mid, copies: 1 }))
    try {
      onSaved(await updateMe({ showcase_mascot_ids: clean }))
    } catch (e) {
      onChange(before)
      useToastStore.getState().push({ variant: 'error', title: 'Chưa lưu được tủ trưng bày', message: messageFor(e) })
    }
  }

  return (
    <StatCard title="Trưng bày linh vật" icon={Cards} iconBg="gold">
      <div className="grid gap-5 md:grid-cols-[minmax(0,1fr)_220px] md:items-end md:gap-8">
        {/* Giá kệ */}
        <div className="relative px-2 pt-2">
          <ul className="relative z-10 grid grid-cols-3 items-end gap-3 px-1 md:gap-6 md:px-4">
            {slots.map((item, i) => {
              const m = item && byId[item.mascot_id]
              return (
                <li key={i} className="flex flex-col items-center gap-2" style={{ transform: `rotate(${[-3, 0, 3][i]}deg)` }}>
                  <div className="w-full max-w-[170px]">
                    {m ? (
                      <MascotCard rarity={m.rarity} name={m.name} number={m.number} art={<MascotArt mascot={m} />} interactive holo={m.rarity === 'legendary'} />
                    ) : item ? (
                      <Skeleton className="aspect-[3/4] w-full" rounded="rounded-[20px]" />
                    ) : (
                      <EmptySlot isMe={profile.isMe} onPick={() => setSlot(i)} />
                    )}
                  </div>
                </li>
              )
            })}
          </ul>
          <div className="relative -mt-3 h-6 rounded-[10px] border-thick border-line bg-orange shadow-hard" aria-hidden="true">
            <span className="absolute inset-x-3 top-1 h-1.5 rounded-pill bg-white/35" />
          </div>
          <div className="mx-8 flex justify-between" aria-hidden="true">
            <span className="h-5 w-4 rounded-b-[6px] border-thick border-t-0 border-line bg-orange" />
            <span className="h-5 w-4 rounded-b-[6px] border-thick border-t-0 border-line bg-orange" />
          </div>
          {profile.isMe && (
            <div className="mt-1 grid grid-cols-3 gap-3 px-1 md:gap-6 md:px-4">
              {slots.map((item, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setSlot(i)}
                  className="mx-auto inline-flex h-11 items-center gap-1.5 rounded-pill px-3 font-display text-[13px] font-bold uppercase tracking-wide text-muted hover:bg-raised hover:text-ink"
                >
                  <Icon icon={PencilSimple} size={16} /> {item ? 'Đổi' : 'Chọn'}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex flex-col gap-3 rounded-card border-2 border-line bg-raised p-4">
          <p className="font-display text-sm font-bold uppercase tracking-wide">Bộ sưu tập</p>
          {stats ? (
            <>
              <p className="font-num leading-none">
                <span className="text-[40px]">{profile.mascotsOwned}</span>
                <span className="text-xl text-muted">/{stats.mascots_total}</span>
              </p>
              <div className="h-3 overflow-hidden rounded-pill border-2 border-line bg-surface">
                <div className="h-full bg-gold" style={{ width: `${(profile.mascotsOwned / Math.max(stats.mascots_total, 1)) * 100}%` }} />
              </div>
            </>
          ) : (
            <p className="font-num text-[40px] leading-none">{profile.mascotsOwned}</p>
          )}
          {profile.isMe && (
            <Button size="sm" variant="secondary" icon={BookOpen} onClick={() => navigate('/collection')}>
              Xem album
            </Button>
          )}
        </div>
      </div>

      {profile.isMe && <Picker open={slot != null} onClose={() => setSlot(null)} taken={ids} onPick={pick} />}
    </StatCard>
  )
}
