/*
 * Phần đầu album: tiêu đề "BỘ SƯU TẬP", số lớn "x/y" (y = số ô trong danh mục GET /mascots), thanh tiến độ sưu tầm chia 4 màu
 * độ hiếm kèm chú thích (`counts`: {độ hiếm: {owned, total}}, total đếm từ danh mục server), viên "LƯỢT QUAY" (hồng, có chấm
 * thông báo) và viên "MẢNH" (nút "Đổi", mốc giá kế tiếp). Nút "Tỉ lệ quay" mở bảng tỉ lệ công khai và bộ đếm pity.
 * Tỉ lệ, pity, giá đổi mảnh, số con có thể ra: GET /collection/rates (store/ratesStore.js); số lượt mỗi N từ: GET /public/stats.
 * Chưa tải xong luật thì ẩn con số tương ứng (không dùng số tự đặt).
 * Không có mua lượt quay bằng tiền. Mobile: thu gọn thành một khối, hai viên nằm cạnh nhau.
 */

import { Info, PuzzlePiece, SpinnerBall } from '@phosphor-icons/react'
import Button from '../../components/ui/Button'
import Icon from '../../components/ui/Icon'
import Modal from '../../components/ui/Modal'
import { Stars } from '../../components/collection/MascotCard'
import { ErrorState, Skeleton } from '../../components/ui/DataState'
import cx from '../../utils/cx'
import { RARITIES, RARITY_ORDER } from '../../utils/constants'
import { useGachaRates } from '../../store/ratesStore'
import { useRules } from '../../store/rulesStore'

const LOCKED_STRIPES = 'repeating-linear-gradient(135deg, var(--color-surface) 0 5px, var(--color-raised) 5px 10px)'

function ProgressSegments({ counts }) {
  const all = RARITY_ORDER.reduce((n, r) => n + counts[r].total, 0) || 1
  return (
    <div className="flex h-7 w-full overflow-hidden rounded-pill border-thick border-line bg-surface shadow-hard-sm md:h-9" role="img" aria-label="Tiến độ sưu tầm theo độ hiếm">
      {RARITY_ORDER.map((r, i) => (
        <div
          key={r}
          className={cx('relative h-full', i > 0 && 'border-l-thick border-line')}
          style={{ width: `${(counts[r].total / all) * 100}%`, background: LOCKED_STRIPES }}
        >
          <div className="h-full" style={{ width: `${(counts[r].owned / Math.max(counts[r].total, 1)) * 100}%`, background: RARITIES[r].color }} />
        </div>
      ))}
    </div>
  )
}

function Legend({ counts }) {
  return (
    <ul className="grid grid-cols-2 gap-x-3 gap-y-1 sm:flex sm:flex-wrap sm:gap-x-5">
      {RARITY_ORDER.map((r) => (
        <li key={r} className="flex items-center gap-2 whitespace-nowrap text-[13px] font-medium text-ink sm:text-base">
          <span className="size-3.5 shrink-0 rounded-[5px] border-2 border-line" style={{ background: RARITIES[r].color }} aria-hidden="true" />
          {RARITIES[r].name}{' '}
          <span className="font-num">
            {counts[r].owned}/{counts[r].total}
          </span>
        </li>
      ))}
    </ul>
  )
}

// Mốc mảnh tiếp theo: giá rẻ nhất (theo server) mà số mảnh hiện có chưa đủ
function nextShardGoal(shards, cost) {
  if (!cost) return null
  const r = RARITY_ORDER.find((key) => cost[key] > shards)
  return r ? { rarity: r, cost: cost[r] } : null
}

function SpinPill({ spins, onSpin }) {
  return (
    <button
      type="button"
      onClick={onSpin}
      className="pressable relative flex min-h-16 items-center gap-3 rounded-card border-thick border-line bg-danger px-3 text-left shadow-hard md:min-w-56 md:px-4"
    >
      {spins > 0 && (
        <span className="absolute -right-1.5 -top-1.5 size-4 rounded-pill border-2 border-line bg-gold" aria-hidden="true">
          <span className="anim-beacon absolute inset-0 rounded-pill" />
        </span>
      )}
      <span className="grid size-10 shrink-0 place-items-center rounded-pill border-2 border-line bg-surface max-md:hidden">
        <Icon icon={SpinnerBall} size={24} color="ink" />
      </span>
      <span className="flex flex-col">
        <span className="font-num text-2xl leading-none text-ink md:text-[28px]">{spins}</span>
        <span className="font-display text-[13px] font-bold uppercase leading-tight tracking-wide text-ink">Lượt quay</span>
      </span>
    </button>
  )
}

function ShardPill({ shards, onExchange }) {
  const { rates } = useGachaRates()
  const cost = rates?.shardCost
  const goal = nextShardGoal(shards, cost)
  const canExchange = cost ? shards >= Math.min(...RARITY_ORDER.map((r) => cost[r])) : false
  return (
    <div className="flex min-h-16 min-w-0 flex-1 items-center gap-3 rounded-card border-thick border-line bg-surface px-3 shadow-hard md:min-w-64 md:px-4">
      <span className="grid size-10 shrink-0 place-items-center rounded-pill border-2 border-line bg-gold max-md:size-8">
        <Icon icon={PuzzlePiece} size={24} color="ink" />
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-1">
        <span className="flex items-baseline gap-1.5">
          <span className="font-display text-[13px] font-bold uppercase tracking-wide">Mảnh</span>
          <span className="font-num text-2xl leading-none md:text-[28px]">{shards}</span>
          {goal && <span className="font-num text-sm text-muted">/{goal.cost}</span>}
        </span>
        {goal && (
          <span className="h-2 w-full overflow-hidden rounded-pill border-2 border-line bg-raised" aria-hidden="true">
            <span className="block h-full bg-gold" style={{ width: `${(shards / goal.cost) * 100}%` }} />
          </span>
        )}
      </span>
      <Button size="sm" variant="gold" onClick={onExchange} disabled={!canExchange} className="shrink-0 px-3">
        Đổi
      </Button>
    </div>
  )
}

export function OddsModal({ open, onClose }) {
  const { status, rates, retry } = useGachaRates()
  const { rules } = useRules()
  return (
    <Modal open={open} onClose={onClose} title="Tỉ lệ quay" className="max-w-lg">
      {status === 'loading' && (
        <div className="flex flex-col gap-2" role="status" aria-label="Đang tải">
          {RARITY_ORDER.map((r) => (
            <Skeleton key={r} className="h-12 w-full" rounded="rounded-[16px]" />
          ))}
        </div>
      )}
      {status === 'error' && <ErrorState title="Chưa tải được tỉ lệ quay" onRetry={retry} />}
      {rates && <OddsBody rates={rates} rules={rules} />}
    </Modal>
  )
}

function OddsBody({ rates, rules }) {
  const { pityEpic, pity } = rates
  const left = Math.max(pityEpic - pity, 0)
  return (
      <div className="flex flex-col gap-5 text-ink">
        <div className="flex items-center gap-3 px-3 font-display text-[13px] font-bold uppercase tracking-wide text-muted" aria-hidden="true">
          <span className="flex-1">Độ hiếm</span>
          <span className="w-16 text-right">Thường</span>
          <span className="w-16 text-right text-ink">Đặc biệt</span>
        </div>
        <ul className="-mt-3 flex flex-col gap-2">
          {RARITY_ORDER.map((r) => (
            <li key={r} className="flex items-center gap-3 rounded-[16px] border-2 border-line px-3 py-2" style={{ background: `color-mix(in srgb, ${RARITIES[r].color} 25%, var(--color-surface))` }}>
              <span className="size-5 shrink-0 rounded-[6px] border-2 border-line" style={{ background: RARITIES[r].color }} aria-hidden="true" />
              <span className="flex-1 font-heading font-extrabold">
                {RARITIES[r].name}{' '}
                <span className="whitespace-nowrap font-medium text-muted">
                  · {rates.poolSize[r]} con có thể ra
                </span>
              </span>
              <Stars count={RARITIES[r].stars} size={14} className="max-sm:hidden" />
              <span className="w-16 text-right font-num text-xl" aria-label={`Lượt thường ${rates.normal[r]}%`}>{rates.normal[r]}%</span>
              <span className="w-16 text-right font-num text-xl text-muted" aria-label={`Lượt đặc biệt ${rates.special[r]}%`}>{rates.special[r]}%</span>
            </li>
          ))}
        </ul>
        <div className="flex flex-col gap-2 rounded-card border-thick border-line bg-raised p-4">
          <p className="font-display text-sm font-bold uppercase tracking-wide">Bảo đảm Sử Thi</p>
          <div className="h-4 overflow-hidden rounded-pill border-2 border-line bg-surface">
            <div className="h-full bg-primary" style={{ width: `${Math.min(pity / pityEpic, 1) * 100}%` }} />
          </div>
          <p className="text-caption font-medium text-muted">
            <span className="font-num text-ink">{pity}</span>/{pityEpic} lượt chưa ra Sử Thi (tính chung cả lượt thường và lượt đặc biệt). Sau {pityEpic} lượt liên tiếp không ra Sử Thi, lượt kế tiếp chắc chắn ra Sử Thi (còn{' '}
            <span className="font-num text-ink">{left}</span> lượt).
          </p>
        </div>
        <ul className="flex flex-col gap-1.5 text-caption font-medium text-muted">
          {rules && (
            <li>
              • Mỗi {rules.spin_every_n_words} từ đã thuộc được 1 lượt; streak mỗi {rules.streak_spin_every} ngày được 1 lượt.
            </li>
          )}
          <li>• Lần đầu lên mỗi rank và lần đầu thắng Boss mỗi cấp được 1 lượt đặc biệt (không ra Thường).</li>
          <li>• Chỉ ra linh vật thuộc vùng bạn đã mở; cùng độ hiếm thì mỗi con có khả năng ngang nhau.</li>
          <li>• Thẻ trùng đổi thành mảnh. Không bán lượt quay bằng tiền.</li>
        </ul>
      </div>
  )
}

export default function CollectionHeader({ ownedCount, total, counts, spins, shards, onSpin, onExchange, onOdds }) {
  return (
    <section className="relative flex flex-col gap-4 overflow-hidden rounded-panel border-thick border-line bg-gold p-4 shadow-hard-lg md:gap-5 md:p-8 lg:flex-row lg:items-end lg:justify-between">
      <div className="flex min-w-0 flex-1 flex-col gap-3 md:gap-4">
        <div className="flex items-end justify-between gap-3 lg:justify-start lg:gap-6">
          <h1 className="font-heading text-[28px] font-black uppercase leading-none md:text-h1">Bộ sưu tập</h1>
          <p className="font-num leading-none" aria-label={`Đã có ${ownedCount} trên ${total} linh vật`}>
            <span className="text-[44px] md:text-[72px]">{ownedCount}</span>
            <span className="text-2xl text-ink/60 md:text-[40px]">/{total}</span>
          </p>
        </div>
        <ProgressSegments counts={counts} />
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Legend counts={counts} />
          <button type="button" onClick={onOdds} className="inline-flex min-h-11 items-center gap-1.5 font-display text-sm font-bold uppercase tracking-wide text-ink underline decoration-2 underline-offset-4">
            <Icon icon={Info} size={18} /> Tỉ lệ quay
          </button>
        </div>
      </div>
      <div className="flex gap-3 lg:flex-col">
        <SpinPill spins={spins} onSpin={onSpin} />
        <ShardPill shards={shards} onExchange={onExchange} />
      </div>
    </section>
  )
}
