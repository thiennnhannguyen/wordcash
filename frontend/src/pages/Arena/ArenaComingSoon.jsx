/*
 * Đấu Trường chưa có backend (trận đấu, ghép trận, phòng riêng): mọi route /arena/* ở bản thật hiện trang này.
 * Minh họa linh vật đang dùng của người chơi (avatar thật), mô tả ngắn, nút quay về Học Viện. Không hiện số người online,
 * thắng/thua hay bất kỳ số liệu nào. Giao diện Đấu Trường dựng trên dữ liệu giả chỉ có khi chạy dev, ở /dev/arena.
 * Không kết nối Socket.IO.
 */

import { ArrowRight, Sword } from '@phosphor-icons/react'
import { useNavigate } from 'react-router-dom'
import Button from '../../components/ui/Button'
import Card from '../../components/ui/Card'
import { IconBadge } from '../../components/ui/Icon'
import Sticker from '../../components/ui/Sticker'
import MascotBlob from '../../components/collection/MascotBlob'
import { useAuthStore } from '../../store/authStore'
import { useMascot } from '../../store/mascotStore'

export default function ArenaComingSoon() {
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const mascot = useMascot(user?.avatar_mascot_id)

  return (
    <div className="mx-auto flex max-w-2xl flex-col items-center px-4 py-10 md:py-16">
      <Card padding="lg" className="relative flex w-full flex-col items-center gap-5 overflow-hidden bg-orange text-center">
        <Sticker bg="surface" tilt={5} size="sm" className="absolute right-4 top-4">
          Sắp ra mắt
        </Sticker>
        <IconBadge icon={Sword} bg="surface" size="lg" />
        <MascotBlob color={mascot.color} shape={mascot.shape} traits={mascot.traits} size={132} blink />
        <h1 className="text-[34px] leading-tight md:text-[44px]">Đấu Trường sắp mở</h1>
        <p className="max-w-md text-lg font-medium">
          Đấu 1v1 thời gian thực: ai trả lời đúng trước thì bắn trúng trước. Trong lúc chờ, hãy học thêm từ ở Học Viện để vào trận
          với vốn từ thật.
        </p>
        <Button size="lg" iconRight={ArrowRight} onClick={() => navigate('/academy')}>
          Về Học Viện
        </Button>
      </Card>
    </div>
  )
}
