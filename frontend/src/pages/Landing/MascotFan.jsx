/*
 * Bộ thẻ linh vật xòe như bộ bài, đủ 4 độ hiếm. Rê chuột vào thẻ thì thẻ nhấc lên. Mobile chỉ hiện 3 thẻ giữa để thẻ đủ to.
 * Linh vật lấy từ `featured_mascots` của GET /public/stats (linh vật đã ra mắt; server chọn mỗi độ hiếm một con).
 * Đang tải: 5 khung thẻ chờ.
 */

import MascotCard from '../../components/collection/MascotCard'
import MascotBlob from '../../components/collection/MascotBlob'
import { Skeleton } from '../../components/ui/DataState'
import { toMascot } from '../../services/collectionApi'

const LAYOUT = [
  { rotate: -14, y: 34 },
  { rotate: -7, y: 10 },
  { rotate: 0, y: 0 },
  { rotate: 7, y: 10 },
  { rotate: 14, y: 34 },
]

function slotClass(i, n) {
  return `w-[132px] shrink-0 transition-transform duration-200 hover:z-10 hover:!translate-y-[-12px] sm:w-40 md:w-48 ${
    n === 5 && (i === 0 || i === n - 1) ? 'hidden sm:block' : ''
  } ${i > 1 ? '-ml-8' : ''} ${i === 1 ? 'sm:-ml-10' : ''} sm:[&:not(:first-child)]:-ml-10 md:[&:not(:first-child)]:-ml-8`
}

export default function MascotFan({ mascots }) {
  const items = mascots ? mascots.map(toMascot) : null
  const n = items ? items.length : LAYOUT.length
  const layout = LAYOUT.slice((LAYOUT.length - n) >> 1)
  return (
    <div className="flex justify-center pb-10 pt-6" aria-busy={!items}>
      {(items ?? layout).map((m, i) => (
        <div
          key={items ? m.id : i}
          className={slotClass(i, n)}
          style={{ transform: `translateY(${layout[i].y}px) rotate(${layout[i].rotate}deg)`, zIndex: 5 - Math.abs(((n - 1) >> 1) - i) }}
        >
          {items ? (
            <MascotCard
              rarity={m.rarity}
              name={m.name}
              number={m.number}
              art={<MascotBlob color={m.color} shape={m.shape} traits={m.traits} size={120} className="h-auto w-3/4" />}
            />
          ) : (
            <Skeleton className="aspect-[3/4] w-full" rounded="rounded-[20px]" />
          )}
        </div>
      ))}
    </div>
  )
}
