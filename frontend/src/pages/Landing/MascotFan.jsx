/*
 * Bộ thẻ linh vật xòe như bộ bài, đủ 4 độ hiếm. Rê chuột vào thẻ thì thẻ nhấc lên.
 * Mobile chỉ hiện 3 thẻ giữa để thẻ đủ to.
 */

import MascotCard from '../../components/collection/MascotCard'
import MascotBlob from '../../components/collection/MascotBlob'
import { MASCOT_BY_ID } from '../../data/mascots'

// Linh vật lấy từ data/mascots.js: Bánh Mì Bé, Tò He, Rồng Mây, Bánh Bao Sấm, Diều Sáo
const FAN = [
  { id: 4, rotate: -14, y: 34 },
  { id: 7, rotate: -7, y: 10 },
  { id: 10, rotate: 0, y: 0 },
  { id: 9, rotate: 7, y: 10 },
  { id: 14, rotate: 14, y: 34 },
].map((f) => ({ ...MASCOT_BY_ID[f.id], ...f }))

export default function MascotFan() {
  return (
    <div className="flex justify-center pb-10 pt-6">
      {FAN.map((m, i) => (
        <div
          key={m.name}
          className={`w-[132px] shrink-0 transition-transform duration-200 hover:z-10 hover:!translate-y-[-12px] sm:w-40 md:w-48 ${
            i === 0 || i === FAN.length - 1 ? 'hidden sm:block' : ''
          } ${i > 1 ? '-ml-8' : ''} ${i === 1 ? 'sm:-ml-10' : ''} sm:[&:not(:first-child)]:-ml-10 md:[&:not(:first-child)]:-ml-8`}
          style={{ transform: `translateY(${m.y}px) rotate(${m.rotate}deg)`, zIndex: i === 2 ? 5 : 5 - Math.abs(2 - i) }}
        >
          <MascotCard
            rarity={m.rarity}
            name={m.name}
            number={m.number}
            art={<MascotBlob color={m.color} shape={m.shape} traits={m.traits} size={120} className="h-auto w-3/4" />}
          />
        </div>
      ))}
    </div>
  )
}
