/*
 * Mọi trang chỉ có khi chạy dev, dưới /dev/* (routes.jsx import động file này trong nhánh `import.meta.env.DEV`, nên bản build
 * production không chứa thư mục src/dev). Code production KHÔNG được import từ src/dev (ESLint no-restricted-imports).
 *
 * - /dev/design-system, /dev/landmarks: công khai (không cần đăng nhập).
 * - Cần đăng nhập: /dev/content (duyệt kho từ, backend ENV=development), /dev/arena/* (giao diện Đấu Trường dựng trên dữ liệu
 *   giả trong src/dev/arena), /dev/rank-up, /dev/certificates, /dev/results (các màn kết quả dựng sẵn), /dev/placement (bài xếp lớp giả).
 * Dữ liệu giả dùng ở đây nằm trong src/dev/fixtures.
 */

import { Navigate, Route, Routes } from 'react-router-dom'
import { RequireAuth } from '../components/layout/RouteGuards'
import PageShell from '../components/layout/PageShell'
import DesignSystem from './DesignSystem/DesignSystem'
import LandmarkGallery from './LandmarkGallery'
import ContentReview from './ContentReview/ContentReview'
import ArenaLobby from './arena/ArenaLobby'
import Matchmaking from './arena/Matchmaking'
import RoomLobby from './arena/RoomLobby'
import VersusPreview from './arena/VersusPreview'
import Battle from './arena/Battle'
import MatchResult from './arena/MatchResult'
import RankUpPreview from './RankUpPreview'
import CertificateGallery from './CertificateGallery'
import ResultPreviews from './ResultPreviews'
import PlacementTest from './placement/PlacementTest'

export default function DevRoutes() {
  return (
    <Routes>
      <Route path="design-system" element={<DesignSystem />} />
      <Route path="landmarks" element={<LandmarkGallery />} />
      <Route element={<RequireAuth />}>
        <Route path="content" element={<ContentReview />} />
        <Route path="arena" element={<ArenaLobby />} />
        <Route path="arena/matchmaking" element={<Matchmaking />} />
        <Route path="arena/room/:code" element={<RoomLobby />} />
        <Route path="arena/vs" element={<VersusPreview />} />
        <Route path="arena/battle" element={<Battle />} />
        <Route path="arena/result" element={<MatchResult />} />
        <Route path="rank-up" element={<RankUpPreview />} />
        <Route path="certificates" element={<PageShell><CertificateGallery /></PageShell>} />
        <Route path="results" element={<ResultPreviews />} />
        <Route path="placement" element={<PlacementTest />} />
      </Route>
      <Route path="*" element={<Navigate to="/dev/design-system" replace />} />
    </Routes>
  )
}
