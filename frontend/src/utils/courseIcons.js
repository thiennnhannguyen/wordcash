/*
 * Icon và màu cho "Khóa học của tôi". Tên icon (kebab-case) và tên màu phải khớp COURSE_ICONS / COURSE_COLORS
 * trong backend/app/schemas/course.py; màu là tên token trong styles/tokens.css (không lưu mã màu).
 */

import {
  AirplaneTilt,
  BookOpen,
  Briefcase,
  Camera,
  ChartLine,
  ChatsCircle,
  Code,
  Coffee,
  FilmSlate,
  Flask,
  ForkKnife,
  GameController,
  GlobeHemisphereEast,
  GraduationCap,
  Heartbeat,
  Leaf,
  Lightbulb,
  MusicNotes,
  Newspaper,
  PaintBrush,
  RocketLaunch,
  SoccerBall,
  Star,
  Trophy,
} from '@phosphor-icons/react'

export const COURSE_ICONS = {
  'book-open': BookOpen,
  code: Code,
  'film-slate': FilmSlate,
  'airplane-tilt': AirplaneTilt,
  briefcase: Briefcase,
  'graduation-cap': GraduationCap,
  'music-notes': MusicNotes,
  'game-controller': GameController,
  heartbeat: Heartbeat,
  flask: Flask,
  'chart-line': ChartLine,
  'globe-hemisphere-east': GlobeHemisphereEast,
  'fork-knife': ForkKnife,
  'soccer-ball': SoccerBall,
  'paint-brush': PaintBrush,
  camera: Camera,
  newspaper: Newspaper,
  lightbulb: Lightbulb,
  'rocket-launch': RocketLaunch,
  leaf: Leaf,
  coffee: Coffee,
  'chats-circle': ChatsCircle,
  trophy: Trophy,
  star: Star,
}

export const COURSE_COLORS = [
  { key: 'primary', label: 'Tím' },
  { key: 'sky', label: 'Xanh trời' },
  { key: 'accent', label: 'Xanh chanh' },
  { key: 'gold', label: 'Vàng' },
  { key: 'orange', label: 'Cam' },
  { key: 'danger', label: 'Hồng' },
]

export function courseIcon(name) {
  return COURSE_ICONS[name] ?? BookOpen
}

// Ba gợi ý tạo nhanh ở trạng thái trống
export const COURSE_TEMPLATES = [
  { title: 'Từ vựng IT', description: 'Từ hay gặp khi đọc tài liệu, làm việc với code.', icon: 'code', color: 'sky' },
  { title: 'Từ trong phim', description: 'Câu thoại, từ lóng nghe được khi xem phim.', icon: 'film-slate', color: 'danger' },
  { title: 'Từ trên lớp', description: 'Từ mới trong bài đọc, bài nghe ở lớp.', icon: 'graduation-cap', color: 'gold' },
]

// Màu chữ/biểu tượng trên nền màu khóa học (nền tím đậm cần chữ trắng)
export function onCourseColor(color) {
  return color === 'primary' ? 'text-white' : 'text-ink'
}
