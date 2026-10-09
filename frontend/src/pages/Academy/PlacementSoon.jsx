/*
 * Kiểm tra xếp lớp chưa có backend: /academy/placement hiện trạng thái "Sắp ra mắt" (minh họa, mô tả ngắn, nút học từ A1).
 * Giao diện bài xếp lớp dựng trên dữ liệu giả chỉ có khi chạy dev, ở /dev/placement.
 */

import { ArrowRight, MagnifyingGlass } from '@phosphor-icons/react'
import { useNavigate } from 'react-router-dom'
import Button from '../../components/ui/Button'
import Card from '../../components/ui/Card'
import { IconBadge } from '../../components/ui/Icon'
import Sticker from '../../components/ui/Sticker'

export default function PlacementSoon() {
  const navigate = useNavigate()
  return (
    <div className="grid min-h-dvh place-items-center bg-bg px-4 py-10">
      <Card padding="lg" className="relative flex w-full max-w-lg flex-col items-center gap-5 text-center">
        <Sticker bg="gold" tilt={5} size="sm" className="absolute right-4 top-4">
          Sắp ra mắt
        </Sticker>
        <IconBadge icon={MagnifyingGlass} bg="sky" size="xl" />
        <h1 className="text-[30px] leading-tight md:text-[38px]">Kiểm tra xếp lớp</h1>
        <p className="max-w-sm text-lg font-medium text-muted">
          Bài kiểm tra giúp vào thẳng cấp phù hợp đang được xây dựng. Trong lúc chờ, bạn học từ A1: bài dễ sẽ qua rất nhanh.
        </p>
        <Button size="lg" iconRight={ArrowRight} onClick={() => navigate('/academy?level=A1')}>
          Học từ A1
        </Button>
      </Card>
    </div>
  )
}
