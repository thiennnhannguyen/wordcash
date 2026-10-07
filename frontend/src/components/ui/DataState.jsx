/*
 * Ba trạng thái bắt buộc của mọi khối lấy dữ liệu từ server (không bao giờ để khối rỗng, "undefined" hay "NaN"):
 * - `Skeleton`: khối chờ tải đúng phong cách (nền tím nhạt, viền mực, bo góc), nhấp nháy nhẹ (tắt khi giảm chuyển động).
 *   `SkeletonLines` dựng nhanh vài dòng chữ chờ.
 * - `ErrorState`: thông báo lỗi + nút "Thử lại" (không kèm số liệu nào). `compact` cho khối nhỏ trong cột widget.
 * - `EmptyState`: linh vật minh họa + lời gợi ý hành động (+ nút tùy chọn).
 * `useServerData(load, deps)` (hooks/useServerData.js) trả {status, data, error, reload} để chọn trạng thái.
 */

import { ArrowClockwise, WarningCircle } from '@phosphor-icons/react'
import Button from './Button'
import { IconBadge } from './Icon'
import MascotBlob from '../collection/MascotBlob'
import cx from '../../utils/cx'

export function Skeleton({ className, rounded = 'rounded-[14px]', style }) {
  return <span aria-hidden="true" style={style} className={cx('anim-skeleton block border-2 border-line/15 bg-raised', rounded, className)} />
}

export function SkeletonLines({ lines = 3, className }) {
  return (
    <div role="status" aria-label="Đang tải" className={cx('flex flex-col gap-2.5', className)}>
      {Array.from({ length: lines }, (_, i) => (
        <Skeleton key={i} className={cx('h-4', i === lines - 1 ? 'w-2/3' : 'w-full')} />
      ))}
    </div>
  )
}

export function ErrorState({ title = 'Chưa tải được dữ liệu', message = 'Kiểm tra kết nối mạng rồi thử lại nhé.', onRetry, compact = false, className }) {
  return (
    <div role="alert" className={cx('flex flex-col items-center text-center', compact ? 'gap-2 py-3' : 'gap-3 py-8', className)}>
      <IconBadge icon={WarningCircle} bg="danger" size={compact ? 'sm' : 'md'} />
      <p className={cx('font-heading font-extrabold', compact ? 'text-base' : 'text-lg')}>{title}</p>
      {!compact && <p className="max-w-sm text-muted">{message}</p>}
      {onRetry && (
        <Button size="sm" variant="secondary" icon={ArrowClockwise} onClick={onRetry}>
          Thử lại
        </Button>
      )}
    </div>
  )
}

export function EmptyState({ mascot, title, message, action, compact = false, className }) {
  return (
    <div className={cx('flex flex-col items-center text-center', compact ? 'gap-2 py-3' : 'gap-3 py-8', className)}>
      <MascotBlob color={mascot?.color ?? 'sky'} shape={mascot?.shape ?? 'round'} traits={mascot?.traits} size={compact ? 64 : 96} blink />
      <p className={cx('font-heading font-extrabold', compact ? 'text-base' : 'text-lg')}>{title}</p>
      {message && <p className="max-w-sm text-muted">{message}</p>}
      {action}
    </div>
  )
}
