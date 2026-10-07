/*
 * Khai báo toàn bộ đường dẫn trang.
 *
 * Landing (`/`) đứng riêng, không có thanh điều hướng của app. Các trang trong app nằm trong PageShell.
 * Các khu chưa làm giao diện dùng trang tạm.
 * Bảo vệ route (components/layout/RouteGuards.jsx): công khai (landing) · chỉ khách (/login, /register)
 * · cần đăng nhập (/onboarding) · cần đăng nhập và xong onboarding (mọi trang còn lại).
 *
 * Trang dev và trang xem thử nằm trong src/dev và CHỈ được đăng ký khi `import.meta.env.DEV`, dưới /dev/* (src/dev/DevRoutes.jsx,
 * import động bên trong nhánh DEV nên bản build production không chứa các module này): /dev/design-system, /dev/landmarks,
 * /dev/content, /dev/arena/*, /dev/rank-up, /dev/certificates…
 * Đấu Trường chưa có backend: /arena/* hiện trang "Đấu Trường sắp mở".
 * `/travel` không phải trang xem thử (Onboarding và màn thắng Boss dẫn tới đó) nên luôn có.
 */

import { lazy, Suspense } from 'react'
import TravelPreview from './pages/Travel/TravelPreview'
import { Outlet, useRoutes } from 'react-router-dom'
import PageShell from './components/layout/PageShell'
import Landing from './pages/Landing/Landing'
import Lobby from './pages/Lobby/Lobby'
import Login from './pages/Auth/Login'
import Register from './pages/Auth/Register'
import Onboarding from './pages/Onboarding/Onboarding'
import DailyCheck from './pages/DailyCheck/DailyCheck'
import RoadmapMap from './pages/Academy/RoadmapMap'
import Lesson from './pages/Academy/Lesson'
import AcademyLesson from './pages/Academy/AcademyLesson'
import AcademyStudy from './pages/Academy/AcademyStudy'
import { USE_MOCK } from './services/academyApi'
import UnitTest from './pages/Academy/UnitTest'
import BossBattle from './pages/Academy/BossBattle'
import PlacementTest from './pages/Academy/PlacementTest'
import Review from './pages/Academy/Review'
import ArenaComingSoon from './pages/Arena/ArenaComingSoon'
import Album from './pages/Collection/Album'
import GachaSpin from './pages/Collection/GachaSpin'
import Profile from './pages/Profile/Profile'
import Leaderboard from './pages/Leaderboard/Leaderboard'
import ComingSoon from './pages/ComingSoon'
import { BootSplash, GuestOnly, RequireAuth } from './components/layout/RouteGuards'
import MyCourses from './pages/Courses/MyCourses'
import CourseDetail from './pages/Courses/CourseDetail'
import CourseStudy from './pages/Courses/CourseStudy'
import About from './pages/About/About'

const DEV = import.meta.env.DEV

// Chỉ tạo khi chạy dev; ở production cả nhánh này là mã chết và thư mục src/dev không vào bản build
const DevRoutes = DEV ? lazy(() => import('./dev/DevRoutes')) : null

function DevArea() {
  return (
    <Suspense fallback={<BootSplash />}>
      <DevRoutes />
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
    // Chỉ khi chạy dev: mọi trang dev và trang xem thử (src/dev/DevRoutes.jsx tự kiểm tra đăng nhập khi cần)
    ...(DEV ? [{ path: '/dev/*', element: <DevArea /> }] : []),
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
        // Bản dữ liệu thật dùng phiên học của server; Lesson.jsx (chế độ học, ngữ cảnh) chỉ còn ở chế độ mock
        { path: '/academy/lesson', element: USE_MOCK ? <Lesson /> : <AcademyLesson /> },
        { path: '/academy/practice', element: <AcademyStudy kind="practice" /> },
        { path: '/academy/unit-test', element: <UnitTest /> },
        { path: '/academy/boss', element: <BossBattle /> },
        { path: '/academy/placement', element: <PlacementTest /> },
        { path: '/academy/review/session', element: USE_MOCK ? <ComingSoon title="Phiên ôn tập" standalone /> : <AcademyStudy kind="review" /> },
        // Màn học của "Khóa học của tôi": toàn màn hình như Học bài
        { path: '/courses/:id/study', element: <CourseStudy /> },
        // Quay thẻ: màn toàn màn hình, tự gắn thanh trên
        { path: '/collection/spin', element: <GachaSpin /> },
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
            // Đấu Trường chưa có backend: mọi route /arena/* hiện trang "Đấu Trường sắp mở"
            { path: '/arena/*', element: <ArenaComingSoon /> },
            { path: '/profile', element: <Profile /> },
            { path: '/profile/:handle', element: <Profile /> },
            { path: '/courses', element: <MyCourses /> },
            { path: '/courses/:id', element: <CourseDetail /> },
            { path: '/about', element: <About /> },
            { path: '*', element: <ComingSoon title="Không tìm thấy trang" /> },
          ],
        },
      ],
    },
  ])
}
