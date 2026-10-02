/*
 * Bộ thẻ linh vật xòe như bộ bài, đủ 4 độ hiếm. Rê chuột vào thẻ thì thẻ nhấc lên.
 * Mobile chỉ hiện 3 thẻ giữa để thẻ đủ to.
 */

import MascotCard from '../../components/collection/MascotCard'
import MascotBlob from '../../components/collection/MascotBlob'

const FAN = [
  { rarity: 'common', name: 'Bột Nếp', number: 12, color: 'gold', shape: 'round', rotate: -14, y: 34 },
  { rarity: 'rare', name: 'Giọt Sương', number: 48, color: 'sky', shape: 'drop', rotate: -7, y: 10 },
  { rarity: 'legendary', name: 'Đại Bánh Bao', number: 97, color: 'accent', shape: 'wide', rotate: 0, y: 0 },
  { rarity: 'epic', name: 'Kẹo Dẻo', number: 77, color: 'danger', shape: 'tall', rotate: 7, y: 10 },
  { rarity: 'rare', name: 'Bong Bóng', number: 31, color: 'primary', shape: 'round', rotate: 14, y: 34 },
]

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
            art={<MascotBlob color={m.color} shape={m.shape} size={120} className="h-auto w-3/4" />}
          />
        </div>
      ))}
    </div>
  )
}
