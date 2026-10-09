/*
 * Gọi API hồ sơ, bảng xếp hạng, Từ của ngày và số liệu công khai (backend: services/profile_service.py, leaderboard_service.py,
 * word_of_day.py, public_stats.py). Trả thẳng JSON của server (snake_case); lỗi chuẩn hóa {code, message, details, status}.
 *
 * - `getMyProfile()`: GET /me/profile (phần công khai + tiến độ từng cấp, lịch 12 tuần, Cửa Ải 30 ngày, từ hay quên…).
 * - `getPublicProfile(username)`: GET /users/{username}/profile (chỉ phần công khai; không tồn tại → USER_NOT_FOUND).
 * - `updateMe(data)`: PATCH /users/me (display_name, showcase_mascot_ids, show_on_leaderboard…), trả user mới.
 * - `getLeaderboard(board, limit)`: GET /leaderboard (board weekly | alltime), kèm my_entry và seconds_left.
 * - `getDailyWord()`: GET /words/daily.
 * - `getPublicStats()`: GET /public/stats (không cần đăng nhập).
 */

import { request } from './api'

export const getMyProfile = () => request({ url: '/me/profile' })
export const getPublicProfile = (username) => request({ url: `/users/${encodeURIComponent(username)}/profile` })
export const updateMe = (data) => request({ method: 'patch', url: '/users/me', data })
export const getLeaderboard = (board = 'weekly', limit = 50) => request({ url: '/leaderboard', params: { board, limit } })
export const getDailyWord = () => request({ url: '/words/daily' })
export const getPublicStats = () => request({ url: '/public/stats' })
