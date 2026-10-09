/*
 * Kết quả trận và danh sách từ đã sai để ôn lại.
 *
 * Hai biến thể THẮNG / THUA cùng bố cục: phần đầu ăn mừng hoặc tiếc nuối (40% chiều cao, mobile 30%),
 * bảng tỉ số với thông số đối chiếu và biểu đồ diễn biến máu, phần thưởng hiện lần lượt (không có điểm rank),
 * "Từ bạn đã sai" để biến trận đấu thành buổi ôn tập, và hàng nút: TÁI ĐẤU (kèm "Đối thủ muốn tái đấu!"),
 * TRẬN MỚI, VỀ SẢNH, Chia sẻ (tạo ảnh thẻ kết quả có logo). Mobile: hàng nút dính ở đáy.
 * Số liệu do server trả (hiện lấy từ resultMock.js).
 *
 * Dev: `?outcome=win|lose`, `&rematch=1` (đối thủ đã bấm tái đấu), `&share=1` (mở ảnh chia sẻ).
 */

import { useEffect, useState } from 'react'
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowsClockwise, DownloadSimple, House, ShareNetwork, Sword } from '@phosphor-icons/react'
import Button, { IconButton } from '../../components/ui/Button'
import Icon from '../../components/ui/Icon'
import Modal from '../../components/ui/Modal'
import { useToastStore } from '../../store/toastStore'
import cx from '../../utils/cx'
import ResultHero from './result/ResultHero'
import { Rewards, Scoreboard, WrongWords } from './result/ResultPanels'
import { drawShareCard } from './result/shareCard'
import { RESULTS, watchRematch } from './resultMock'
import VersusIntro from './VersusIntro'
import { MATCH_INFO } from './arenaMock'

function ShareModal({ open, onClose, image }) {
  const pushToast = useToastStore((s) => s.push)

  const share = async () => {
    try {
      const blob = await (await fetch(image)).blob()
      const file = new File([blob], 'wordclash-ket-qua.png', { type: 'image/png' })
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: 'WORDCLASH' })
        return
      }
      pushToast({ variant: 'info', title: 'Thiết bị chưa hỗ trợ chia sẻ ảnh', message: 'Hãy tải ảnh về rồi đăng nhé.' })
    } catch {
      // Người dùng đóng hộp chia sẻ
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Chia sẻ kết quả" className="max-w-md">
      <div className="flex flex-col gap-4 text-ink">
        {image ? (
          <img src={image} alt="Ảnh thẻ kết quả trận" className="w-full rounded-card border-thick border-line shadow-hard" />
        ) : (
          <div className="aspect-[4/5] w-full animate-pulse rounded-card bg-raised" aria-busy="true" />
        )}
        <div className="grid grid-cols-2 gap-3">
          <a
            href={image ?? undefined}
            download="wordclash-ket-qua.png"
            className="pressable inline-flex h-13 items-center justify-center gap-2 rounded-btn border-thick border-line bg-surface font-display font-bold uppercase tracking-wider shadow-hard"
          >
            <Icon icon={DownloadSimple} size={22} /> Tải ảnh
          </a>
          <Button variant="sky" icon={ShareNetwork} onClick={share} disabled={!image}>
            Chia sẻ
          </Button>
        </div>
      </div>
    </Modal>
  )
}

export default function MatchResult() {
  const navigate = useNavigate()
  const location = useLocation()
  const [params] = useSearchParams()
  // Kết quả từ màn đấu (state của `match_end`) hoặc tham số xem thử
  const outcome = params.get('outcome') ?? (location.state?.winner === 'opp' ? 'lose' : 'win')
  const result = RESULTS[outcome] ?? RESULTS.win
  const [oppWants, setOppWants] = useState(params.get('rematch') === '1')
  const [myRequest, setMyRequest] = useState(false)
  const [showVs, setShowVs] = useState(false)
  const [shareOpen, setShareOpen] = useState(params.get('share') === '1')
  const [shareImage, setShareImage] = useState(null)

  useEffect(() => {
    window.scrollTo({ top: 0 })
  }, [outcome])

  useEffect(() => {
    if (oppWants) return undefined
    return watchRematch(() => setOppWants(true))
  }, [oppWants])

  // Cả hai cùng muốn tái đấu thì vào màn VS
  useEffect(() => {
    if (myRequest && oppWants) {
      const t = setTimeout(() => setShowVs(true), 500)
      return () => clearTimeout(t)
    }
    return undefined
  }, [myRequest, oppWants])

  useEffect(() => {
    if (shareOpen && !shareImage) drawShareCard(result).then(setShareImage)
  }, [shareOpen, shareImage, result])

  const reviewWords = () => navigate(`/academy/review/session?words=${result.wrongWords.map((w) => w.word).join(',')}`)

  return (
    <div className="min-h-dvh bg-bg">
      <ResultHero result={result} />

      <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 pb-[calc(170px+env(safe-area-inset-bottom))] pt-6 md:gap-8 md:px-8 md:pb-12 md:pt-10">
        <Scoreboard result={result} />
        <Rewards rewards={result.rewards} />
        <WrongWords words={result.wrongWords} onReview={reviewWords} />

        {/* Hàng nút: dính đáy trên mobile */}
        <div className="fixed inset-x-0 bottom-0 z-30 border-t-thick border-line bg-surface px-4 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-4 md:static md:border-0 md:bg-transparent md:p-0 md:pt-2">
          <div className="mx-auto flex max-w-5xl flex-col gap-2 md:flex-row md:items-end md:justify-center md:gap-4">
            <div className="flex gap-2 md:contents">
              <div className="relative flex-1 md:flex-none">
                {oppWants && !myRequest && (
                  <span className="anim-blink absolute -top-4 left-1/2 z-10 -translate-x-1/2 whitespace-nowrap rounded-pill border-2 border-line bg-accent px-3 font-display text-xs font-bold uppercase leading-6 shadow-hard-sm md:-top-5 md:text-sm">
                    Đối thủ muốn tái đấu!
                  </span>
                )}
                <Button
                  size="lg"
                  variant="orange"
                  icon={ArrowsClockwise}
                  disabled={myRequest && !oppWants}
                  className={cx('w-full text-xl md:h-[76px] md:min-w-80 md:text-2xl', myRequest && !oppWants && 'disabled:opacity-80')}
                  onClick={() => setMyRequest(true)}
                >
                  {myRequest && !oppWants ? 'Chờ đối thủ…' : 'Tái đấu'}
                </Button>
              </div>
              <IconButton icon={ShareNetwork} label="Chia sẻ kết quả" size="lg" variant="sky" className="md:order-last" onClick={() => setShareOpen(true)} />
            </div>
            <div className="grid grid-cols-2 gap-2 md:flex md:gap-4">
              <Button size="lg" icon={Sword} className="whitespace-nowrap px-3 md:px-8" onClick={() => navigate('/dev/arena/matchmaking')}>
                Trận mới
              </Button>
              <Button size="lg" variant="secondary" icon={House} className="whitespace-nowrap px-3 md:px-8" onClick={() => navigate('/dev/arena')}>
                Về sảnh
              </Button>
            </div>
          </div>
        </div>
      </main>

      <ShareModal open={shareOpen} onClose={() => setShareOpen(false)} image={shareImage} />

      {showVs && <VersusIntro player={result.me} opponent={result.opp} match={MATCH_INFO} onDone={() => navigate('/dev/arena/battle', { replace: true })} />}
    </div>
  )
}
