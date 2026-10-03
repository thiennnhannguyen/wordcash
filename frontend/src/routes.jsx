/*
 * Khai báo toàn bộ đường dẫn trang.
 *
 * Landing (`/`) đứng riêng, không có thanh điều hướng của app. Các trang trong app nằm trong PageShell.
 * Các khu chưa làm giao diện dùng trang tạm.
 */

import LandmarkGallery from './pages/Dev/LandmarkGallery'
import TravelPreview from './pages/Travel/TravelPreview'
import { Navigate, Outlet, useRoutes } from 'react-router-dom'
import PageShell from './components/layout/PageShell'
import Landing from './pages/Landing/Landing'
import DesignSystem from './pages/DesignSystem/DesignSystem'
import Lobby from './pages/Lobby/Lobby'
import Login from './pages/Auth/Login'
import Register from './pages/Auth/Register'
import Onboarding from './pages/Onboarding/Onboarding'
import DailyCheck from './pages/DailyCheck/DailyCheck'
import RoadmapMap from './pages/Academy/RoadmapMap'
import Lesson from './pages/Academy/Lesson'
import UnitTest from './pages/Academy/UnitTest'
import BossBattle from './pages/Academy/BossBattle'
import PlacementTest from './pages/Academy/PlacementTest'
import Review from './pages/Academy/Review'
import ArenaLobby from './pages/Arena/ArenaLobby'
import Matchmaking from './pages/Arena/Matchmaking'
import Battle from './pages/Arena/Battle'
import MatchResult from './pages/Arena/MatchResult'
import RoomLobby from './pages/Arena/RoomLobby'
import VersusPreview from './pages/Arena/VersusPreview'
import Album from './pages/Collection/Album'
import GachaSpin from './pages/Collection/GachaSpin'
import Profile from './pages/Profile/Profile'
import CertificateGallery from './pages/Profile/CertificateGallery'
import RankUpPreview from './pages/RankUp/RankUpPreview'
import Leaderboard from './pages/Leaderboard/Leaderboard'
import ComingSoon from './pages/ComingSoon'

function AppLayout() {
  return (
    <PageShell>
      <Outlet />
    </PageShell>
  )
}

export default function AppRoutes() {
  return useRoutes([
    { path: '/', element: <Landing /> },
    { path: '/login', element: <Login /> },
    { path: '/register', element: <Register /> },
    { path: '/onboarding', element: <Onboarding /> },
    { path: '/daily-check', element: <DailyCheck /> },
    { path: '/academy/lesson', element: <Lesson /> },
    { path: '/academy/unit-test', element: <UnitTest /> },
    { path: '/academy/boss', element: <BossBattle /> },
    { path: '/academy/placement', element: <PlacementTest /> },
    { path: '/academy/review/session', element: <ComingSoon title="Phiên ôn tập" standalone /> },
    // Sảnh Đấu Trường tự vẽ nền tràn màn hình và tự gắn thanh điều hướng
    { path: '/arena', element: <ArenaLobby /> },
    { path: '/arena/matchmaking', element: <Matchmaking /> },
    { path: '/arena/room/:code', element: <RoomLobby /> },
    { path: '/arena/vs', element: <VersusPreview /> },
    { path: '/arena/battle', element: <Battle /> },
    { path: '/arena/result', element: <MatchResult /> },
    // Quay thẻ: màn toàn màn hình, tự gắn thanh trên
    { path: '/collection/spin', element: <GachaSpin /> },
    { path: '/rank-up', element: <RankUpPreview /> },
    // Trang xem trước địa danh, chỉ có khi chạy dev
    ...(import.meta.env.DEV ? [{ path: '/dev/landmarks', element: <LandmarkGallery /> }] : []),
    // Cảnh chuyển cấp "Bay sang vùng đất mới" và màn bắt đầu hành trình cho người mới
    { path: '/travel', element: <TravelPreview /> },
    // Bản đồ lộ trình: tranh bản đồ tràn khung, tự gắn thanh điều hướng
    { path: '/academy', element: <RoadmapMap /> },
    { path: '/forgot-password', element: <ComingSoon title="Quên mật khẩu" standalone /> },
    {
      element: <AppLayout />,
      children: [
        { path: '/lobby', element: <Lobby /> },
        { path: '/academy/review', element: <Review /> },
        { path: '/collection', element: <Album /> },
        { path: '/leaderboard', element: <Leaderboard /> },
        { path: '/profile', element: <Profile /> },
        { path: '/profile/:handle', element: <Profile /> },
        { path: '/certificates', element: <CertificateGallery /> },
        { path: '/courses', element: <ComingSoon title="Khóa học của tôi" /> },
        { path: '/design-system', element: <DesignSystem /> },
        { path: '*', element: <ComingSoon title="Không tìm thấy trang" /> },
      ],
    },
    { path: '/style-guide', element: <Navigate to="/design-system" replace /> },
  ])
}
