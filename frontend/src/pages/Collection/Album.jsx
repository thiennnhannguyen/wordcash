/*
 * Album 100 linh vật, ô chưa có hiện bóng đen.
 *
 * Phần đầu (tiến độ "x/100" tính trên 100 ô, thanh 4 màu theo độ hiếm, lượt quay, mảnh), thanh lọc (độ hiếm, vùng,
 * "Chỉ hiện đã có", sắp xếp theo số thứ tự / độ hiếm / mới nhận) và lưới thẻ (desktop 6 cột, mobile 3 cột).
 * Thẻ đã có đầy màu đúng khung độ hiếm, nhãn "MỚI", huy hiệu "xN"; thẻ chưa có là hình bóng kèm "?"; ô coming_soon có
 * nhãn "Sắp ra mắt"; ô thuộc vùng chưa mở có nhãn "Mở khóa ở B1". Rê chuột: thẻ nghiêng 3D, Huyền Thoại lóe ánh kim.
 * Mở album thì gọi POST /collection/seen cho các thẻ đang có nhãn MỚI (nhãn vẫn hiện trong lần xem này).
 * Dữ liệu: danh mục GET /mascots (store/mascotStore.js), bộ sưu tập GET /collection (services/collectionApi.js).
 *
 * Dev: `?mascot=9` (mở chi tiết), `?exchange=1` (`&pick=19`, `&confirm=1`), `?odds=1`, `?rarity=legendary&owned=1`,
 * `?region=A2`, `?sort=rarity|recent`.
 */

import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import MascotCard from '../../components/collection/MascotCard'
import { formatMascotNumber } from '../../utils/format'
import MascotBlob from '../../components/collection/MascotBlob'
import Button from '../../components/ui/Button'
import Select from '../../components/ui/Select'
import Switch from '../../components/ui/Switch'
import { useAuthStore } from '../../store/authStore'
import { useCollectionStore } from '../../store/collectionStore'
import { useMascotCatalog } from '../../store/mascotStore'
import { useToastStore } from '../../store/toastStore'
import cx from '../../utils/cx'
import { RARITIES, RARITY_ORDER } from '../../utils/constants'
import { messageFor } from '../../utils/errorMessages'
import { exchangeShards, fetchCollection, fetchRates, markSeen, updateMascots } from '../../services/collectionApi'
import CollectionHeader, { OddsModal } from './CollectionHeader'
import ExchangeModal from './ExchangeModal'
import MascotArt from './MascotArt'
import MascotDetail from './MascotDetail'

const SORTS = [
  { value: 'number', label: 'Số thứ tự' },
  { value: 'rarity', label: 'Độ hiếm' },
  { value: 'recent', label: 'Mới nhận' },
]

export const REGION_NAMES = { A1: 'A1', A2: 'A2', B1: 'B1', B2: 'B2', C1: 'C1', C2: 'C2', special: 'Đặc biệt' }
const REGIONS = [{ value: 'all', label: 'Mọi vùng' }, ...Object.entries(REGION_NAMES).map(([value, name]) => ({ value, label: `Vùng ${name}` }))]

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

/** Tiến độ theo độ hiếm (đã có / tổng ô) tính trên 100 ô. */
function countByRarity(mascots, owned) {
  return Object.fromEntries(RARITY_ORDER.map((r) => [r, mascots.filter((m) => m.rarity === r && owned[m.id]).length]))
}

function FilterBar({ rarity, setRarity, region, setRegion, onlyOwned, setOnlyOwned, sort, setSort }) {
  const chips = [{ key: 'all', label: 'Tất cả' }, ...RARITY_ORDER.map((r) => ({ key: r, label: RARITIES[r].name }))]
  return (
    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
      <div className="-mx-4 overflow-x-auto px-4 py-1 lg:mx-0 lg:px-0 [&::-webkit-scrollbar]:hidden [scrollbar-width:none]">
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
      <div className="grid grid-cols-2 items-center gap-3 sm:flex sm:justify-end sm:gap-4">
        <Select aria-label="Lọc theo vùng" options={REGIONS} value={region} onChange={(e) => setRegion(e.target.value)} className="sm:w-40 [&>div]:h-11" />
        <Select aria-label="Sắp xếp" options={SORTS} value={sort} onChange={(e) => setSort(e.target.value)} className="sm:w-44 [&>div]:h-11" />
        <Switch checked={onlyOwned} onChange={setOnlyOwned} className="col-span-2">
          Chỉ hiện đã có
        </Switch>
      </div>
    </div>
  )
}

function EmptyState({ rarity }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-panel border-thick border-dashed border-line bg-surface px-6 py-12 text-center">
      <MascotBlob color="neutral" shape="round" traits={{ eyes: 'happy' }} size={96} />
      <p className="font-heading text-xl font-extrabold">Chưa có thẻ {rarity === 'all' ? 'nào' : RARITIES[rarity].name} nào</p>
      <p className="max-w-sm font-medium text-muted">Học thêm từ để nhận lượt quay, hoặc đổi bộ lọc để xem các ô khác nhé.</p>
    </div>
  )
}

function Loading({ error, onRetry }) {
  if (error)
    return (
      <div className="flex flex-col items-center gap-4 py-16 text-center">
        <p className="font-heading text-xl font-extrabold">Chưa tải được bộ sưu tập</p>
        <Button onClick={onRetry}>Thử lại</Button>
      </div>
    )
  return (
    <div className="flex flex-col gap-6" aria-busy="true" aria-label="Đang tải bộ sưu tập">
      <div className="h-48 animate-pulse rounded-panel bg-raised" />
      <div className="grid grid-cols-3 gap-3 md:grid-cols-4 xl:grid-cols-6">
        {Array.from({ length: 12 }, (_, i) => (
          <div key={i} className="aspect-[3/4] animate-pulse rounded-[20px] bg-raised" />
        ))}
      </div>
    </div>
  )
}

export default function Album() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const pushToast = useToastStore((s) => s.push)
  const setUser = useAuthStore((s) => s.setUser)
  const catalog = useMascotCatalog()
  const [data, setData] = useState(null)
  const [loadError, setLoadError] = useState(null)
  const [rates, setRates] = useState(null)
  const [rarity, setRarity] = useState(params.get('rarity') ?? 'all')
  const [region, setRegion] = useState(params.get('region') ?? 'all')
  const [onlyOwned, setOnlyOwned] = useState(params.get('owned') === '1')
  const [sort, setSort] = useState(params.get('sort') ?? 'number')
  const [detailId, setDetailId] = useState(() => Number(params.get('mascot')) || null)
  const [exchangeOpen, setExchangeOpen] = useState(params.get('exchange') === '1')
  const [oddsOpen, setOddsOpen] = useState(params.get('odds') === '1')
  const seenSent = useRef(false)

  const apply = (collection) => {
    setData(collection)
    useCollectionStore.getState().setFrom(collection)
  }

  const load = () => {
    setLoadError(null)
    fetchCollection()
      .then(apply)
      .catch(setLoadError)
  }

  useEffect(load, [])

  // Mở album: báo server đã xem các thẻ MỚI (nhãn vẫn hiện tới lần mở sau)
  useEffect(() => {
    if (!data || seenSent.current) return
    seenSent.current = true
    const fresh = Object.entries(data.owned)
      .filter(([, o]) => o.isNew)
      .map(([id]) => Number(id))
    if (fresh.length) markSeen(fresh).then(() => useCollectionStore.setState({ newCount: 0 })).catch(() => {})
  }, [data])

  useEffect(() => {
    if (oddsOpen && !rates) fetchRates().then(setRates).catch(() => {})
  }, [oddsOpen, rates])

  const owned = data?.owned ?? {}
  const counts = useMemo(() => countByRarity(catalog.mascots, owned), [catalog.mascots, owned])

  const visible = useMemo(() => {
    const list = catalog.mascots.filter(
      (m) => (rarity === 'all' || m.rarity === rarity) && (region === 'all' || m.region === region) && (!onlyOwned || owned[m.id]),
    )
    return sortMascots(list, sort, owned)
  }, [catalog.mascots, rarity, region, onlyOwned, sort, owned])

  if (!data || !catalog.ready) return <Loading error={loadError || catalog.error} onRetry={() => (catalog.error ? catalog.retry() : load())} />

  const regions = data.unlockedRegions ?? []
  const lockedLabel = (m) => (m.status === 'available' && m.region !== 'special' && !regions.includes(m.region) ? `Mở khóa ở ${m.region}` : undefined)

  const openCard = (m) => {
    if (owned[m.id]) {
      setDetailId(m.id)
      return
    }
    if (m.status === 'coming_soon') {
      pushToast({ variant: 'info', title: `${formatMascotNumber(m.number)} sắp ra mắt`, message: 'Linh vật này chưa phát hành, chưa thể nhận từ vòng quay.' })
      return
    }
    const locked = lockedLabel(m)
    pushToast({
      variant: 'info',
      title: `${formatMascotNumber(m.number)} chưa có`,
      message: locked ? `${locked}: vượt Trận Boss của cấp trước để vùng này vào vòng quay.` : 'Quay thẻ hoặc đổi mảnh để nhận linh vật này.',
    })
  }

  const choose = async (patch, toast) => {
    try {
      const user = await updateMascots(patch)
      if (user) setUser(user)
      apply(await fetchCollection())
      pushToast({ variant: 'success', ...toast })
    } catch (err) {
      pushToast({ variant: 'error', title: 'Chưa đổi được', message: messageFor(err) })
    }
  }

  const detail = detailId && owned[detailId] ? catalog.byId[detailId] : null
  const arenaId = data.arenaId ?? data.avatarId

  return (
    <div className="flex flex-col gap-5 pb-20 md:gap-8 md:pb-0">
      <CollectionHeader
        ownedCount={Object.keys(owned).length}
        counts={counts}
        spins={data.spins.normal + data.spins.special}
        shards={data.shards}
        onSpin={() => navigate('/collection/spin')}
        onExchange={() => setExchangeOpen(true)}
        onOdds={() => setOddsOpen(true)}
      />

      <FilterBar
        rarity={rarity}
        setRarity={setRarity}
        region={region}
        setRegion={setRegion}
        onlyOwned={onlyOwned}
        setOnlyOwned={setOnlyOwned}
        sort={sort}
        setSort={setSort}
      />

      {visible.length === 0 ? (
        <EmptyState rarity={rarity} />
      ) : (
        <ul className="grid grid-cols-3 gap-x-3 gap-y-4 pt-2 md:grid-cols-4 md:gap-x-5 md:gap-y-6 xl:grid-cols-6">
          {visible.map((m) => {
            const entry = owned[m.id]
            const locked = !entry ? lockedLabel(m) : undefined
            const state = entry ? '' : m.status === 'coming_soon' ? ', sắp ra mắt' : locked ? `, ${locked.toLowerCase()}` : ', chưa có'
            return (
              <li key={m.id}>
                <button
                  type="button"
                  onClick={() => openCard(m)}
                  aria-label={entry ? `${formatMascotNumber(m.number)} ${m.name}, ${RARITIES[m.rarity].name}${entry.isNew ? ', mới' : ''}` : `${formatMascotNumber(m.number)}, ${RARITIES[m.rarity].name}${state}`}
                  className="block w-full rounded-[22px] text-left focus-visible:outline-3 focus-visible:outline-offset-4 focus-visible:outline-primary"
                >
                  <MascotCard
                    rarity={m.rarity}
                    name={m.name}
                    number={m.number}
                    owned={Boolean(entry)}
                    comingSoon={m.status === 'coming_soon'}
                    lockedLabel={locked}
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
        entry={detail ? owned[detail.id] : null}
        isAvatar={detail?.id === data.avatarId}
        isArena={detail?.id === arenaId}
        onClose={() => setDetailId(null)}
        onSetAvatar={() => choose({ avatarId: detail.id }, { title: 'Đã đổi avatar', message: `${detail.name} giờ là ảnh đại diện của bạn.` })}
        onSetArena={() => choose({ arenaId: detail.id }, { title: 'Sẵn sàng ra trận', message: `${detail.name} sẽ đấu cùng bạn ở Đấu Trường.` })}
      />

      <ExchangeModal
        open={exchangeOpen}
        onClose={() => setExchangeOpen(false)}
        shards={data.shards}
        owned={owned}
        mascots={catalog.mascots}
        byId={catalog.byId}
        unlockedRegions={regions}
        initialPick={params.get('pick') ? Number(params.get('pick')) : null}
        initialConfirm={params.get('confirm') === '1'}
        onExchange={async (id) => apply(await exchangeShards(id))}
      />

      <OddsModal open={oddsOpen} onClose={() => setOddsOpen(false)} pity={rates?.pity ?? data.pity} rates={rates} />
    </div>
  )
}
