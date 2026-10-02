/*
 * Hộp thoại đổi mảnh: chọn 1 linh vật chưa có.
 *
 * Giá theo độ hiếm (Thường 20, Hiếm 40, Sử Thi 60, Huyền Thoại 150 mảnh); thẻ chưa đủ mảnh bị làm mờ và không chọn được.
 * Nút "ĐỔI" mở hộp xác nhận; server kiểm tra đủ mảnh rồi trả thẻ mới, sau đó thẻ lật ra kèm pháo giấy.
 * Thẻ chưa có vẫn chỉ hiện hình bóng, số thứ tự và độ hiếm (như trong album).
 */

import { useEffect, useMemo, useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import confetti from 'canvas-confetti'
import { CheckFat, LockSimple, PuzzlePiece, Swap } from '@phosphor-icons/react'
import Button from '../../components/ui/Button'
import Icon from '../../components/ui/Icon'
import Modal from '../../components/ui/Modal'
import MascotCard from '../../components/collection/MascotCard'
import { formatMascotNumber } from '../../utils/format'
import cx from '../../utils/cx'
import { GACHA, RARITIES, RARITY_ORDER } from '../../utils/constants'
import { MASCOTS, MASCOT_BY_ID } from './collectionMock'
import MascotArt from './MascotArt'

function ShardTag({ cost, affordable }) {
  return (
    <span
      className={cx(
        'inline-flex items-center gap-1 rounded-pill border-2 border-line px-2 font-num text-[13px] leading-6',
        affordable ? 'bg-gold text-ink' : 'bg-neutral text-muted',
      )}
    >
      <Icon icon={affordable ? PuzzlePiece : LockSimple} size={14} color={affordable ? 'ink' : 'muted'} />
      {cost}
    </span>
  )
}

function Reveal({ mascot }) {
  const reduceMotion = useReducedMotion()
  useEffect(() => {
    if (reduceMotion) return
    const style = getComputedStyle(document.documentElement)
    const colors = ['gold', 'accent', 'danger', 'sky', 'primary'].map((n) => style.getPropertyValue(`--color-${n}`).trim())
    confetti({ particleCount: 90, spread: 80, origin: { y: 0.45 }, colors, zIndex: 60 })
  }, [reduceMotion])

  return (
    <div className="flex flex-col items-center gap-4 py-2 text-center text-ink">
      <div style={{ perspective: 900 }}>
        <motion.div
          className="w-[180px]"
          initial={reduceMotion ? false : { rotateY: 180, scale: 0.7 }}
          animate={{ rotateY: 0, scale: 1 }}
          transition={{ type: 'spring', stiffness: 140, damping: 14 }}
        >
          <MascotCard rarity={mascot.rarity} name={mascot.name} number={mascot.number} isNew art={<MascotArt mascot={mascot} />} />
        </motion.div>
      </div>
      <p className="font-heading text-2xl font-black">Đã nhận {mascot.name}!</p>
      <p className="font-medium text-muted">Thẻ mới đã vào album của bạn.</p>
    </div>
  )
}

export default function ExchangeModal({ open, onClose, shards, owned, initialPick, initialConfirm = false, onExchange }) {
  const [pick, setPick] = useState(initialPick ?? null)
  const [confirming, setConfirming] = useState(initialConfirm && initialPick != null)
  const [busy, setBusy] = useState(false)
  const [received, setReceived] = useState(null)
  const [error, setError] = useState(null)

  const candidates = useMemo(() => MASCOTS.filter((m) => !owned[m.id]), [owned])
  const picked = pick != null ? MASCOT_BY_ID[pick] : null
  const cost = picked ? GACHA.shardCost[picked.rarity] : 0

  const close = () => {
    setPick(null)
    setConfirming(false)
    setReceived(null)
    setError(null)
    onClose()
  }

  const confirm = async () => {
    setBusy(true)
    setError(null)
    try {
      await onExchange(pick)
      setReceived(pick)
      setConfirming(false)
    } catch {
      setError('Không đổi được. Có thể số mảnh đã thay đổi, hãy thử lại.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <Modal open={open} onClose={close} mobileSheet title={received ? 'Đổi thành công' : 'Đổi mảnh'} className="max-w-5xl">
        {received ? (
          <div className="flex flex-col items-center gap-4">
            <Reveal mascot={MASCOT_BY_ID[received]} />
            <Button onClick={close} className="w-full sm:w-auto">
              Tuyệt!
            </Button>
          </div>
        ) : (
          <div className="flex flex-col gap-4 text-ink">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="font-heading text-lg font-extrabold leading-snug md:text-xl">Chọn 1 linh vật chưa có</p>
              <span className="inline-flex items-center gap-2 rounded-pill border-thick border-line bg-gold px-3 font-display text-sm font-bold uppercase leading-9 shadow-hard-sm">
                <Icon icon={PuzzlePiece} size={20} /> Bạn có <span className="font-num text-base">{shards}</span> mảnh
              </span>
            </div>

            {/* Bảng giá theo độ hiếm */}
            <ul className="flex flex-wrap gap-2" aria-label="Giá đổi theo độ hiếm">
              {RARITY_ORDER.map((r) => (
                <li
                  key={r}
                  className="inline-flex items-center gap-1.5 rounded-pill border-2 border-line px-3 font-display text-[13px] font-bold uppercase leading-7"
                  style={{ background: RARITIES[r].color, color: r === 'epic' ? 'var(--color-white)' : 'var(--color-ink)' }}
                >
                  {RARITIES[r].name} · <span className="font-num">{GACHA.shardCost[r]}</span>
                </li>
              ))}
            </ul>

            <div className="-mx-1 max-h-[52dvh] overflow-y-auto px-1 pb-2 pt-3 md:max-h-[46dvh]">
              <ul className="grid grid-cols-3 gap-x-3 gap-y-4 sm:grid-cols-4 md:grid-cols-6">
                {candidates.map((m) => {
                  const price = GACHA.shardCost[m.rarity]
                  const affordable = shards >= price
                  const selected = pick === m.id
                  return (
                    <li key={m.id}>
                      <button
                        type="button"
                        disabled={!affordable}
                        onClick={() => setPick(m.id)}
                        aria-pressed={selected}
                        aria-label={`${formatMascotNumber(m.number)}, ${RARITIES[m.rarity].name}, ${price} mảnh${affordable ? '' : ', chưa đủ mảnh'}`}
                        className={cx(
                          'group flex w-full flex-col items-center gap-2 rounded-[22px] p-1 transition-transform',
                          affordable ? 'cursor-pointer hover:-translate-y-1' : 'cursor-not-allowed opacity-40',
                          selected && 'bg-primary/15 outline-3 outline-offset-2 outline-primary',
                        )}
                      >
                        <div className="relative w-full">
                          <MascotCard rarity={m.rarity} number={m.number} owned={false} art={<MascotArt mascot={m} silhouette />} />
                          {selected && (
                            <span className="absolute -right-1.5 -top-1.5 z-30 grid size-8 place-items-center rounded-pill border-2 border-line bg-accent shadow-hard-sm">
                              <Icon icon={CheckFat} size={16} color="ink" />
                            </span>
                          )}
                        </div>
                        <ShardTag cost={price} affordable={affordable} />
                      </button>
                    </li>
                  )
                })}
              </ul>
            </div>

            <div className="flex flex-col gap-3 border-t-2 border-dashed border-line/25 pt-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="font-medium text-muted">
                {picked ? (
                  <>
                    Đã chọn <span className="font-num text-ink">{formatMascotNumber(picked.number)}</span> ({RARITIES[picked.rarity].name}) · còn lại{' '}
                    <span className="font-num text-ink">{shards - cost}</span> mảnh sau khi đổi
                  </>
                ) : (
                  'Bấm vào một thẻ để chọn. Thẻ mờ là chưa đủ mảnh.'
                )}
              </p>
              <Button icon={Swap} disabled={!picked} onClick={() => setConfirming(true)} className="shrink-0">
                Đổi{picked ? ` · ${cost} mảnh` : ''}
              </Button>
            </div>
          </div>
        )}
      </Modal>

      <Modal
        open={confirming && Boolean(picked)}
        onClose={() => !busy && setConfirming(false)}
        title="Xác nhận đổi mảnh"
        footer={
          <>
            <Button variant="secondary" onClick={() => setConfirming(false)} disabled={busy}>
              Hủy
            </Button>
            <Button icon={Swap} onClick={confirm} disabled={busy}>
              {busy ? 'Đang đổi…' : 'Đổi'}
            </Button>
          </>
        }
      >
        {picked && (
          <div className="flex items-center gap-4 text-ink">
            <div className="w-24 shrink-0">
              <MascotCard rarity={picked.rarity} number={picked.number} owned={false} compact art={<MascotArt mascot={picked} silhouette />} />
            </div>
            <div className="flex flex-col gap-2">
              <p className="font-medium">
                Dùng <span className="font-num">{cost}</span> mảnh để nhận linh vật <span className="font-num">{formatMascotNumber(picked.number)}</span> ({RARITIES[picked.rarity].name})?
              </p>
              <p className="text-caption text-muted">
                Còn lại <span className="font-num">{shards - cost}</span> mảnh. Không hoàn tác được.
              </p>
              {error && <p className="text-caption font-bold text-danger-deep">{error}</p>}
            </div>
          </div>
        )}
      </Modal>
    </>
  )
}
