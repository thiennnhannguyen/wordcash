/*
 * Dải xem trước linh vật trong 4 tư thế ở Đấu Trường (đứng thở, bắn, trúng đòn, ăn mừng), vẽ bằng ShapeMascot.
 * Mỗi ô phát lặp một đoạn ngắn; khi người dùng bật giảm chuyển động thì chỉ hiện tư thế đứng yên.
 * Chỉ để trang trí, linh vật không có chỉ số.
 */

import ShapeMascot, { POSES } from './ShapeMascot'
import cx from '../../utils/cx'

export default function MascotPoses({ mascot, className }) {
  return (
    <ul className={cx('grid grid-cols-4 gap-2 md:gap-3', className)} aria-label="Xem trước chuyển động trong Đấu Trường">
      {POSES.map((p) => (
        <li key={p.kind} className="flex flex-col items-center gap-1.5">
          <div className="grid aspect-square w-full place-items-center overflow-hidden rounded-[16px] border-2 border-line bg-raised">
            <ShapeMascot mascot={mascot} pose={p.kind} />
          </div>
          <span className="font-display text-[13px] font-bold uppercase leading-tight text-muted">{p.label}</span>
        </li>
      ))}
    </ul>
  )
}
