/*
 * Album 100 linh vật, ô chưa có hiện bóng đen.
 *
 * Phần đầu (tiến độ sưu tầm, lượt quay, mảnh), thanh lọc (độ hiếm, "Chỉ hiện đã có", sắp xếp) và lưới thẻ
 * (desktop 6 cột, mobile 3 cột). Thẻ đã có đầy màu đúng khung độ hiếm, thẻ mới có nhãn "MỚI", thẻ trùng có "x3";
 * thẻ chưa có là hình bóng trên nền kẻ sọc (Huyền Thoại giữ viền vàng mờ). Rê chuột: thẻ nghiêng 3D, Huyền Thoại lóe ánh kim.
 * Bấm thẻ đã có mở trang chi tiết; nút "Đổi" mở hộp thoại đổi mảnh. Dữ liệu do server trả (hiện lấy từ collectionMock.js).
 *
 * Dev: `?mascot=37` (mở chi tiết), `?exchange=1` (`&pick=8`, `&confirm=1`), `?odds=1`, `?rarity=legendary&owned=1`, `?sort=rarity|recent`.
 */

import { useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import MascotCard from '../../components/collection/MascotCard'
import { formatMascotNumber } from '../../utils/format'
import MascotBlob from '../../components/collection/MascotBlob'
import Select from '../../components/ui/Select'
import Switch from '../../components/ui/Switch'
import { useToastStore } from '../../store/toastStore'
import cx from '../../utils/cx'
import { RARITIES, RARITY_ORDER } from '../../utils/constants'
import CollectionHeader, { OddsModal } from './CollectionHeader'
import ExchangeModal from './ExchangeModal'
import MascotArt from './MascotArt'
import MascotDetail from './MascotDetail'
import { MASCOTS, MASCOT_BY_ID, totalSpins, countByRarity, exchangeShards, fetchCollection, markSeen, setArenaMascot, setAvatar } from './collectionMock'

const SORTS = [
  { value: 'number', label: 'Số thứ tự' },
  { value: 'rarity', label: 'Độ hiếm' },
  { value: 'recent', label: 'Mới nhận' },
]

function sortMascots(list, sort, owned) {
  const rank = (m) => RARITY_ORDER.indexOf(m.rarity)
  if (sort === 'rarity') return [...list].sort((a, b) => rank(b) - rank(a) || a.number - b.number)
  if (sort === 'recent')
    return [...list].sort((a, b) => {
      const ta = owned[a.id] ? new Date(owned[a.id].receivedAt).getTime() : -Infinity
      const tb = owned[b.id] ? new Date(owned[b.id].receivedAt).getTime() : -Infinity
      return tb - ta || a.number - b.number
    })
  return list
}

function FilterBar({ rarity, setRarity, onlyOwned, setOnlyOwned, sort, setSort }) {
  const chips = [{ key: 'all', label: 'Tất cả' }, ...RARITY_ORDER.map((r) => ({ key: r, label: RARITIES[r].name }))]
  return (
    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
      <div className="-mx-4 overflow-x-auto px-4 py-1 md:mx-0 md:px-0 [&::-webkit-scrollbar]:hidden [scrollbar-width:none]">
        <div className="flex w-max gap-2" role="radiogroup" aria-label="Lọc theo độ hiếm">
          {chips.map((c) => {
            const active = rarity === c.key
            return (
              <button
                key={c.key}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => setRarity(c.key)}
                className={cx(
                  'inline-flex h-11 items-center gap-2 whitespace-nowrap rounded-pill border-thick border-line px-4 font-display text-sm font-bold uppercase tracking-wide transition-transform',
                  active ? 'bg-ink text-white shadow-none' : 'bg-surface text-ink shadow-hard-sm hover:-translate-y-0.5',
                )}
              >
                {c.key !== 'all' && <span className="size-3 rounded-[4px] border-2 border-line" style={{ background: RARITIES[c.key].color }} aria-hidden="true" />}
                {c.label}
              </button>
            )
          })}
        </div>
      </div>
      <div className="flex items-center justify-between gap-3 md:justify-end md:gap-5">
        <Switch checked={onlyOwned} onChange={setOnlyOwned}>
          Chỉ hiện đã có
        </Switch>
        <Select aria-label="Sắp xếp" options={SORTS} value={sort} onChange={(e) => setSort(e.target.value)} className="w-40 md:w-48 [&>div]:h-11" />
      </div>
    </div>
  )
}

function EmptyState({ rarity }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-panel border-thick border-dashed border-line bg-surface px-6 py-12 text-center">
      <MascotBlob color="neutral" shape="round" traits={{ eyes: 'happy' }} size={96} />
      <p className="font-heading text-xl font-extrabold">Chưa có thẻ {rarity === 'all' ? 'nào' : RARITIES[rarity].name} nào</p>
      <p className="max-w-sm font-medium text-muted">
        {rarity === 'all' ? 'Học thêm từ để nhận lượt quay đầu tiên nhé.' : `Tỉ lệ ra ${RARITIES[rarity].name} là ${RARITIES[rarity].rate}%. Cứ học đều, lượt quay sẽ tới!`}
      </p>
    </div>
  )
}

export default function Album() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const pushToast = useToastStore((s) => s.push)
  const [data, setData] = useState(fetchCollection)
  const [rarity, setRarity] = useState(params.get('rarity') ?? 'all')
  const [onlyOwned, setOnlyOwned] = useState(params.get('owned') === '1')
  const [sort, setSort] = useState(params.get('sort') ?? 'number')
  const [detailId, setDetailId] = useState(() => {
    const id = Number(params.get('mascot'))
    return data.owned[id] ? id : null
  })
  const [exchangeOpen, setExchangeOpen] = useState(params.get('exchange') === '1')
  const [oddsOpen, setOddsOpen] = useState(params.get('odds') === '1')

  const counts = useMemo(() => countByRarity(data.owned), [data.owned])
  const ownedCount = Object.keys(data.owned).length

  const visible = useMemo(() => {
    const list = MASCOTS.filter((m) => (rarity === 'all' || m.rarity === rarity) && (!onlyOwned || data.owned[m.id]))
    return sortMascots(list, sort, data.owned)
  }, [rarity, onlyOwned, sort, data.owned])

  const openCard = (m) => {
    if (data.owned[m.id]) {
      setDetailId(m.id)
      setData(markSeen(m.id))
      return
    }
    pushToast({
      variant: 'info',
      title: `${formatMascotNumber(m.number)} chưa có`,
      message: 'Quay thẻ hoặc đổi mảnh để nhận linh vật này.',
    })
  }

  const detail = detailId ? MASCOT_BY_ID[detailId] : null

  return (
    <div className="flex flex-col gap-5 pb-20 md:gap-8 md:pb-0">
      <CollectionHeader
        ownedCount={ownedCount}
        counts={counts}
        spins={totalSpins(data.spins)}
        shards={data.shards}
        onSpin={() => navigate('/collection/spin')}
        onExchange={() => setExchangeOpen(true)}
        onOdds={() => setOddsOpen(true)}
      />

      <FilterBar rarity={rarity} setRarity={setRarity} onlyOwned={onlyOwned} setOnlyOwned={setOnlyOwned} sort={sort} setSort={setSort} />

      {visible.length === 0 ? (
        <EmptyState rarity={rarity} />
      ) : (
        <ul className="grid grid-cols-3 gap-x-3 gap-y-4 pt-2 md:grid-cols-4 md:gap-x-5 md:gap-y-6 xl:grid-cols-6">
          {visible.map((m) => {
            const entry = data.owned[m.id]
            return (
              <li key={m.id}>
                <button
                  type="button"
                  onClick={() => openCard(m)}
                  aria-label={entry ? `${formatMascotNumber(m.number)} ${m.name}, ${RARITIES[m.rarity].name}${entry.isNew ? ', mới' : ''}` : `${formatMascotNumber(m.number)}, ${RARITIES[m.rarity].name}, chưa có`}
                  className="block w-full rounded-[22px] text-left focus-visible:outline-3 focus-visible:outline-offset-4 focus-visible:outline-primary"
                >
                  <MascotCard
                    rarity={m.rarity}
                    name={m.name}
                    number={m.number}
                    owned={Boolean(entry)}
                    isNew={entry?.isNew}
                    count={entry?.count}
                    interactive
                    art={<MascotArt mascot={m} silhouette={!entry} />}
                  />
                </button>
              </li>
            )
          })}
        </ul>
      )}

      <MascotDetail
        mascot={detail}
        entry={detail ? data.owned[detail.id] : null}
        isAvatar={detail?.id === data.avatarId}
        isArena={detail?.id === data.arenaId}
        onClose={() => setDetailId(null)}
        onSetAvatar={async () => {
          setData(await setAvatar(detail.id))
          pushToast({ variant: 'success', title: 'Đã đổi avatar', message: `${detail.name} giờ là ảnh đại diện của bạn.` })
        }}
        onSetArena={async () => {
          setData(await setArenaMascot(detail.id))
          pushToast({ variant: 'success', title: 'Sẵn sàng ra trận', message: `${detail.name} sẽ đấu cùng bạn ở Đấu Trường.` })
        }}
      />

      <ExchangeModal
        open={exchangeOpen}
        onClose={() => setExchangeOpen(false)}
        shards={data.shards}
        owned={data.owned}
        initialPick={params.get('pick') ? Number(params.get('pick')) : null}
        initialConfirm={params.get('confirm') === '1'}
        onExchange={async (id) => setData(await exchangeShards(id))}
      />

      <OddsModal open={oddsOpen} onClose={() => setOddsOpen(false)} pity={data.pity} />
    </div>
  )
}
