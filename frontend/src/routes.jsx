/*
 * Khai báo toàn bộ đường dẫn trang.
 *
 * Landing (`/`) đứng riêng, không có thanh điều hướng của app. Các trang trong app nằm trong PageShell.
 * Các khu chưa làm giao diện dùng trang tạm.
 * Bảo vệ route (components/layout/RouteGuards.jsx): công khai (landing) · chỉ khách (/login, /register)
 * · cần đăng nhập (/onboarding) · cần đăng nhập và xong onboarding (mọi trang còn lại).
 *
 * Trang dev và trang xem thử (/design-system, /dev/landmarks, /arena/vs, /rank-up, /certificates) CHỈ được đăng ký khi
 * `import.meta.env.DEV`: chúng được import động bên trong nhánh DEV nên bản build production không chứa các module này.
 * `/travel` không phải trang xem thử (Onboarding và màn thắng Boss dẫn tới đó) nên luôn có.
 */

import { lazy, Suspense } from 'react'
import TravelPreview from './pages/Travel/TravelPreview'
import { Navigate, Outlet, useRoutes } from 'react-router-dom'
import PageShell from './components/layout/PageShell'
import Landing from './pages/Landing/Landing'
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
import Album from './pages/Collection/Album'
import GachaSpin from './pages/Collection/GachaSpin'
import Profile from './pages/Profile/Profile'
import Leaderboard from './pages/Leaderboard/Leaderboard'
import ComingSoon from './pages/ComingSoon'
import { BootSplash, GuestOnly, RequireAuth } from './components/layout/RouteGuards'
import MyCourses from './pages/Courses/MyCourses'
import CourseDetail from './pages/Courses/CourseDetail'
import CourseStudy from './pages/Courses/CourseStudy'

const DEV = import.meta.env.DEV

// Chỉ tạo khi chạy dev; ở production cả khối này là mã chết và bị loại khỏi bản build
const DEV_PAGES = DEV
  ? {
      DesignSystem: lazy(() => import('./pages/DesignSystem/DesignSystem')),
      LandmarkGallery: lazy(() => import('./pages/Dev/LandmarkGallery')),
      VersusPreview: lazy(() => import('./pages/Arena/VersusPreview')),
      RankUpPreview: lazy(() => import('./pages/RankUp/RankUpPreview')),
      CertificateGallery: lazy(() => import('./pages/Profile/CertificateGallery')),
    }
  : {}

function DevPage({ name }) {
  const Page = DEV_PAGES[name]
  return (
    <Suspense fallback={<BootSplash />}>
      <Page />
    </Suspense>
  )
}

function AppLayout() {
  return (
    <PageShell>
      <Outlet />
    </PageShell>
  )
}

export default function AppRoutes() {
  return useRoutes([
    // Công khai
    { path: '/', element: <Landing /> },
    { path: '/forgot-password', element: <ComingSoon title="Quên mật khẩu" standalone /> },
    // Chỉ khi chạy dev: design system, trang xem trước địa danh
    ...(DEV
      ? [
          { path: '/design-system', element: <DevPage name="DesignSystem" /> },
          { path: '/style-guide', element: <Navigate to="/design-system" replace /> },
          { path: '/dev/landmarks', element: <DevPage name="LandmarkGallery" /> },
        ]
      : []),
    // Chỉ dành cho khách: đã đăng nhập thì về Sảnh
    {
      element: <GuestOnly />,
      children: [
        { path: '/login', element: <Login /> },
        { path: '/register', element: <Register /> },
      ],
    },
    // Đã đăng nhập, chưa cần xong onboarding
    {
      element: <RequireAuth allowOnboarding />,
      children: [{ path: '/onboarding', element: <Onboarding /> }],
    },
    // Đã đăng nhập và xong onboarding
    {
      element: <RequireAuth />,
      children: [
        { path: '/daily-check', element: <DailyCheck /> },
        { path: '/academy/lesson', element: <Lesson /> },
        { path: '/academy/unit-test', element: <UnitTest /> },
        { path: '/academy/boss', element: <BossBattle /> },
        { path: '/academy/placement', element: <PlacementTest /> },
        { path: '/academy/review/session', element: <ComingSoon title="Phiên ôn tập" standalone /> },
        // Màn học của "Khóa học của tôi": toàn màn hình như Học bài
        { path: '/courses/:id/study', element: <CourseStudy /> },
        // Sảnh Đấu Trường tự vẽ nền tràn màn hình và tự gắn thanh điều hướng
        { path: '/arena', element: <ArenaLobby /> },
        { path: '/arena/matchmaking', element: <Matchmaking /> },
        { path: '/arena/room/:code', element: <RoomLobby /> },
        ...(DEV ? [{ path: '/arena/vs', element: <DevPage name="VersusPreview" /> }] : []),
        { path: '/arena/battle', element: <Battle /> },
        { path: '/arena/result', element: <MatchResult /> },
        // Quay thẻ: màn toàn màn hình, tự gắn thanh trên
        { path: '/collection/spin', element: <GachaSpin /> },
        ...(DEV ? [{ path: '/rank-up', element: <DevPage name="RankUpPreview" /> }] : []),
        // Cảnh chuyển cấp "Bay sang vùng đất mới" và màn bắt đầu hành trình cho người mới
        { path: '/travel', element: <TravelPreview /> },
        // Bản đồ lộ trình: tranh bản đồ tràn khung, tự gắn thanh điều hướng
        { path: '/academy', element: <RoadmapMap /> },
        {
          element: <AppLayout />,
          children: [
            { path: '/lobby', element: <Lobby /> },
            { path: '/academy/review', element: <Review /> },
            { path: '/collection', element: <Album /> },
            { path: '/leaderboard', element: <Leaderboard /> },
            { path: '/profile', element: <Profile /> },
            { path: '/profile/:handle', element: <Profile /> },
            ...(DEV ? [{ path: '/certificates', element: <DevPage name="CertificateGallery" /> }] : []),
            { path: '/courses', element: <MyCourses /> },
            { path: '/courses/:id', element: <CourseDetail /> },
            { path: '*', element: <ComingSoon title="Không tìm thấy trang" /> },
          ],
        },
      ],
    },
  ])
}
