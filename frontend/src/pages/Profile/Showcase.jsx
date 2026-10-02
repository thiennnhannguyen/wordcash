/*
 * Kệ trưng bày 3 thẻ linh vật yêu thích trên Hồ sơ. Chủ hồ sơ bấm "Đổi" ở từng ô để chọn thẻ từ các thẻ đã sở hữu.
 * Bên cạnh là tiến độ bộ sưu tập ("Bộ sưu tập 37/100") và nút "Xem album" (chỉ trên hồ sơ của mình).
 */

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { BookOpen, Cards, PencilSimple } from '@phosphor-icons/react'
import Button from '../../components/ui/Button'
import Icon from '../../components/ui/Icon'
import Modal from '../../components/ui/Modal'
import MascotCard from '../../components/collection/MascotCard'
import { GACHA } from '../../utils/constants'
import MascotArt from '../Collection/MascotArt'
import { MASCOTS, fetchCollection } from '../Collection/collectionMock'
import { StatCard } from './LearningStats'

function Picker({ open, onClose, taken, onPick }) {
  const owned = fetchCollection().owned
  const list = MASCOTS.filter((m) => owned[m.id])
  return (
    <Modal open={open} onClose={onClose} title="Chọn thẻ trưng bày" mobileSheet className="max-w-3xl">
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
    </Modal>
  )
}

export default function Showcase({ ids, mascots, collection, isMe, onChange }) {
  const navigate = useNavigate()
  const [slot, setSlot] = useState(null)

  return (
    <StatCard title="Trưng bày linh vật" icon={Cards} iconBg="gold">
      <div className="grid gap-5 md:grid-cols-[minmax(0,1fr)_220px] md:items-end md:gap-8">
        {/* Giá kệ */}
        <div className="relative px-2 pt-2">
          <ul className="relative z-10 grid grid-cols-3 items-end gap-3 px-1 md:gap-6 md:px-4">
            {ids.map((id, i) => {
              const m = mascots[id]
              return (
                <li key={i} className="flex flex-col items-center gap-2" style={{ transform: `rotate(${[-3, 0, 3][i]}deg)` }}>
                  <div className="w-full max-w-[170px]">
                    <MascotCard rarity={m.rarity} name={m.name} number={m.number} art={<MascotArt mascot={m} />} interactive holo={m.rarity === 'legendary'} />
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
          {isMe && (
            <div className="mt-1 grid grid-cols-3 gap-3 px-1 md:gap-6 md:px-4">
              {ids.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setSlot(i)}
                  className="mx-auto inline-flex h-11 items-center gap-1.5 rounded-pill px-3 font-display text-[13px] font-bold uppercase tracking-wide text-muted hover:bg-raised hover:text-ink"
                >
                  <Icon icon={PencilSimple} size={16} /> Đổi
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex flex-col gap-3 rounded-card border-2 border-line bg-raised p-4">
          <p className="font-display text-sm font-bold uppercase tracking-wide">Bộ sưu tập</p>
          <p className="font-num leading-none">
            <span className="text-[40px]">{collection.owned}</span>
            <span className="text-xl text-muted">/{GACHA.totalMascots}</span>
          </p>
          <div className="h-3 overflow-hidden rounded-pill border-2 border-line bg-surface">
            <div className="h-full bg-gold" style={{ width: `${(collection.owned / GACHA.totalMascots) * 100}%` }} />
          </div>
          {isMe && (
            <Button size="sm" variant="secondary" icon={BookOpen} onClick={() => navigate('/collection')}>
              Xem album
            </Button>
          )}
        </div>
      </div>

      {isMe && (
        <Picker
          open={slot != null}
          onClose={() => setSlot(null)}
          taken={ids}
          onPick={(id) => {
            onChange(ids.map((x, i) => (i === slot ? id : x)))
            setSlot(null)
          }}
        />
      )}
    </StatCard>
  )
}
