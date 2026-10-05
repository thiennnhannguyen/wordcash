/*
 * Chi tiết một linh vật đã sở hữu: hộp thoại lớn trên desktop, tấm trượt toàn màn hình trên mobile.
 *
 * Trái: thẻ cỡ lớn xoay chậm trên bệ trưng bày, nút "Lật thẻ" xem mặt sau (logo WORDCLASH và họa tiết).
 * Phải: số thứ tự và tên, nhãn độ hiếm, hồ sơ (ngày sinh, quê, tính cách, thích, ghét, từ yêu thích, câu cửa miệng, tiểu sử;
 * lấy từ docs/mascots-lore.md qua API, trường nào trống thì ẩn), ngày và nguồn nhận, số bản đang sở hữu (bản trùng đã đổi
 * thành mảnh), hai nút "Đặt làm avatar" và "Dùng trong Đấu Trường" (đang dùng thì "Đang dùng ✓"), dải 4 tư thế (ShapeMascot).
 * Linh vật chỉ để trang trí: không hiện chỉ số sức mạnh nào.
 */

import { useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { ArrowsClockwise, CalendarBlank, CheckFat, Gift, PuzzlePiece, Sword, UserCircle } from '@phosphor-icons/react'
import Button from '../../components/ui/Button'
import Icon from '../../components/ui/Icon'
import Modal from '../../components/ui/Modal'
import MascotCard, { Stars } from '../../components/collection/MascotCard'
import MascotPoses from '../../components/collection/MascotPoses'
import CardBack from '../../components/collection/CardBack'
import { GACHA, RARITIES } from '../../utils/constants'
import { formatDate, formatMascotNumber } from '../../utils/format'
import MascotArt from './MascotArt'

function Showcase({ mascot, entry }) {
  const reduceMotion = useReducedMotion()
  const [flipped, setFlipped] = useState(false)

  return (
    <div className="flex flex-col items-center gap-5">
      <div className="relative flex flex-col items-center pt-2">
        <div className={reduceMotion || flipped ? '' : 'anim-showcase'} style={{ perspective: 900, transformStyle: 'preserve-3d' }}>
          <motion.div
            className="relative w-[190px] md:w-[260px]"
            animate={{ rotateY: flipped ? 180 : 0 }}
            transition={reduceMotion ? { duration: 0 } : { type: 'spring', stiffness: 160, damping: 18 }}
            style={{ transformStyle: 'preserve-3d' }}
          >
            <div className="[backface-visibility:hidden]">
              <MascotCard
                rarity={mascot.rarity}
                name={mascot.name}
                number={mascot.number}
                count={entry.count}
                holo
                interactive={!flipped}
                art={<MascotArt mascot={mascot} />}
              />
            </div>
            <CardBack asBack />
          </motion.div>
        </div>
        {/* Bệ trưng bày */}
        <div className="relative -mt-3 h-9 w-[230px] rounded-[50%] border-thick border-line bg-gold shadow-hard md:w-[300px]" aria-hidden="true">
          <span className="absolute inset-x-6 top-1.5 h-2 rounded-pill bg-white/50" />
        </div>
      </div>
      <Button size="sm" variant="secondary" icon={ArrowsClockwise} onClick={() => setFlipped((f) => !f)} aria-pressed={flipped}>
        {flipped ? 'Lật lại' : 'Lật thẻ'}
      </Button>
    </div>
  )
}

const PROFILE = [
  ['birthday_text', 'Ngày sinh'],
  ['hometown', 'Quê'],
  ['personality', 'Tính cách'],
  ['likes', 'Thích'],
  ['dislikes', 'Ghét'],
  ['favorite_word', 'Từ yêu thích'],
]

function Profile({ mascot }) {
  const profile = mascot.profile ?? {}
  const rows = PROFILE.filter(([key]) => profile[key])
  return (
    <div className="flex flex-col gap-3">
      {profile.catchphrase && (
        <p className="relative rounded-card border-thick border-line bg-raised px-4 py-3 font-heading font-extrabold leading-snug">“{profile.catchphrase}”</p>
      )}
      {rows.length > 0 && (
        <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-1.5">
          {rows.map(([key, label]) => (
            <div key={key} className="contents">
              <dt className="font-display text-[13px] font-bold uppercase leading-6 tracking-wide text-muted">{label}</dt>
              <dd className={key === 'favorite_word' ? 'font-num leading-6' : 'font-medium leading-6'}>{profile[key]}</dd>
            </div>
          ))}
        </dl>
      )}
      {(profile.bio ?? mascot.bio) && <p className="font-medium leading-relaxed text-ink">{profile.bio ?? mascot.bio}</p>}
    </div>
  )
}

function InUse({ label }) {
  return (
    <Button variant="accent" icon={CheckFat} disabled aria-label={label} className="disabled:opacity-100">
      Đang dùng
    </Button>
  )
}

function Fact({ icon, children }) {
  return (
    <li className="flex items-start gap-2.5">
      <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-[10px] border-2 border-line bg-raised">
        <Icon icon={icon} size={18} color="ink" />
      </span>
      <span className="pt-1 font-medium leading-snug text-ink">{children}</span>
    </li>
  )
}

export default function MascotDetail({ mascot, entry, isAvatar, isArena, onSetAvatar, onSetArena, onClose }) {
  const [busy, setBusy] = useState(null)
  const open = Boolean(mascot && entry)
  const info = mascot ? RARITIES[mascot.rarity] : null
  const dupes = entry ? entry.count - 1 : 0

  const run = async (key, fn) => {
    setBusy(key)
    try {
      await fn()
    } finally {
      setBusy(null)
    }
  }

  return (
    <Modal open={open} onClose={onClose} mobileSheet className="max-w-5xl md:p-10">
      {open && (
        <div className="flex flex-col gap-6 text-ink md:gap-8">
          <div className="grid items-center gap-6 md:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] md:gap-10">
            <Showcase mascot={mascot} entry={entry} />

            <div className="flex min-w-0 flex-col gap-4 md:gap-5">
              <div className="flex flex-col gap-3">
                <h2 className="font-heading text-[28px] font-black uppercase leading-tight md:text-[40px]">
                  <span className="font-num text-muted">{formatMascotNumber(mascot.number)}</span> · {mascot.name}
                </h2>
                <span
                  className="inline-flex w-fit items-center gap-2 rounded-pill border-thick border-line px-3.5 font-display text-sm font-bold uppercase leading-8 tracking-wider shadow-hard-sm"
                  style={{ background: info.color, color: mascot.rarity === 'epic' ? 'var(--color-white)' : 'var(--color-ink)' }}
                >
                  {info.name}
                  <Stars count={info.stars} size={16} />
                </span>
              </div>

              <Profile mascot={mascot} />

              <ul className="flex flex-col gap-2.5">
                <Fact icon={CalendarBlank}>Ngày nhận: {formatDate(entry.receivedAt)}</Fact>
                <Fact icon={Gift}>Nhận từ: {entry.source.charAt(0).toLowerCase() + entry.source.slice(1)}</Fact>
                <Fact icon={PuzzlePiece}>
                  Đang sở hữu: <span className="font-num">{entry.count}</span>
                  {dupes > 0 && (
                    <span className="text-muted">
                      {' '}
                      ({dupes} bản trùng → <span className="font-bold text-accent-deep">+{dupes * GACHA.shardsPerDuplicate[mascot.rarity]} mảnh</span>)
                    </span>
                  )}
                </Fact>
              </ul>

              <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                {isAvatar ? (
                  <InUse label="Đang dùng làm avatar" />
                ) : (
                  <Button variant="secondary" icon={UserCircle} disabled={busy === 'avatar'} onClick={() => run('avatar', onSetAvatar)}>
                    Đặt làm avatar
                  </Button>
                )}
                {isArena ? (
                  <InUse label="Đang dùng trong Đấu Trường" />
                ) : (
                  <Button variant="orange" icon={Sword} disabled={busy === 'arena'} onClick={() => run('arena', onSetArena)} className="whitespace-nowrap">
                    Dùng trong Đấu Trường
                  </Button>
                )}
              </div>
            </div>
          </div>

          <section className="flex flex-col gap-3 border-t-2 border-dashed border-line/25 pt-5">
            <h3 className="hud-label">Trong Đấu Trường</h3>
            <MascotPoses mascot={mascot} className="md:max-w-xl" />
          </section>
        </div>
      )}
    </Modal>
  )
}
