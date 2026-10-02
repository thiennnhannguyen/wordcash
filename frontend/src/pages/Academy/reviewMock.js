/*
 * Giả lập API trang Ôn tập khi backend chưa có.
 *
 * Mọi con số (từ đến hạn, số từ theo trạng thái, lịch ôn, ngày ôn tiếp) do server tính theo SRS và múi giờ
 * người dùng; client chỉ hiển thị. Danh sách từ là nội dung nháp tự viết (tương đương status = draft).
 * API thật nên lọc/tìm kiếm và phân trang phía server; bản mock lọc ngay ở client cho gọn.
 * TODO: thay bằng services/academyApi.
 */

export const REVIEW_SUMMARY = {
  due: 23,
  estimatedMinutes: 6,
  counts: { learning: 146, mastered: 1248, forgotten: 9, new: 604 },
  // Số từ đến hạn trong 7 ngày tới, phần tử đầu là hôm nay
  forecast: [23, 14, 9, 17, 6, 11, 20],
}

// Từ vừa quên ở Cửa Ải Hôm Nay (luật: sai ở Cửa Ải thì vào danh sách ôn gấp)
export const URGENT = [
  { word: 'reliable', meaning: 'đáng tin cậy', level: 'B1', forgotAt: 'Cửa Ải sáng nay' },
  { word: 'neighbour', meaning: 'hàng xóm', level: 'A2', forgotAt: 'Cửa Ải sáng nay' },
  { word: 'deadline', meaning: 'hạn chót', level: 'B1', forgotAt: 'Cửa Ải hôm qua' },
]

// `dueInDays`: 0 = hôm nay; null = chưa học nên chưa có lịch ôn
export const WORDS = [
  { word: 'reliable', meaning: 'đáng tin cậy', level: 'B1', status: 'forgotten', dueInDays: 0 },
  { word: 'neighbour', meaning: 'hàng xóm', level: 'A2', status: 'forgotten', dueInDays: 0 },
  { word: 'deadline', meaning: 'hạn chót', level: 'B1', status: 'forgotten', dueInDays: 0 },
  { word: 'candidate', meaning: 'ứng viên', level: 'B1', status: 'learning', dueInDays: 0 },
  { word: 'salary', meaning: 'tiền lương', level: 'B1', status: 'learning', dueInDays: 0 },
  { word: 'take off', meaning: 'cất cánh; cởi (quần áo)', level: 'A2', status: 'learning', dueInDays: 0 },
  { word: 'confident', meaning: 'tự tin', level: 'B1', status: 'learning', dueInDays: 1 },
  { word: 'breakfast', meaning: 'bữa sáng', level: 'A1', status: 'mastered', dueInDays: 3 },
  { word: 'weather', meaning: 'thời tiết', level: 'A1', status: 'mastered', dueInDays: 3 },
  { word: 'experience', meaning: 'kinh nghiệm', level: 'B1', status: 'learning', dueInDays: 2 },
  { word: 'make a decision', meaning: 'đưa ra quyết định', level: 'A2', status: 'mastered', dueInDays: 7 },
  { word: 'crowded', meaning: 'đông đúc', level: 'A2', status: 'mastered', dueInDays: 16 },
  { word: 'pollution', meaning: 'sự ô nhiễm', level: 'B1', status: 'learning', dueInDays: 1 },
  { word: 'ticket', meaning: 'vé', level: 'A1', status: 'mastered', dueInDays: 35 },
  { word: 'recycle', meaning: 'tái chế', level: 'B1', status: 'learning', dueInDays: 4 },
  { word: 'look forward to', meaning: 'mong chờ', level: 'B1', status: 'learning', dueInDays: 5 },
  { word: 'sustainable', meaning: 'bền vững', level: 'B2', status: 'new', dueInDays: null },
  { word: 'hypothesis', meaning: 'giả thuyết', level: 'B2', status: 'new', dueInDays: null },
  { word: 'impress', meaning: 'gây ấn tượng', level: 'B1', status: 'new', dueInDays: null },
  { word: 'ambiguous', meaning: 'mơ hồ, nước đôi', level: 'C1', status: 'new', dueInDays: null },
]
