/*
 * Dữ liệu mẫu cho "Khóa học của tôi" khi chạy chế độ mock (VITE_USE_MOCK). services/coursesMock.js dùng dữ liệu này
 * để đóng vai server.
 *
 * - BANK: kho từ hệ thống (source = system, đã duyệt). Gồm 18 từ của bài học mẫu (pages/Academy/lessonMock.js) và một số từ
 *   IT, phim, du lịch. Nghĩa, ví dụ là nội dung nháp tự viết (tương đương status = draft), chỉ để dựng giao diện.
 * - CUSTOM: từ người dùng tự tạo (source = user).
 * - COURSES: 3 khóa đang học + 1 khóa đã lưu trữ; PROGRESS: tiến độ mẫu của một số từ.
 */

import { ENTRIES as LESSON_ENTRIES } from '../pages/Academy/lessonMock'

const DAY = 24 * 3600 * 1000

const EXTRA_BANK = [
  // IT
  ['deploy', '/dɪˈplɔɪ/', 'động từ', 'triển khai (phần mềm)', 'We deploy the new version every Friday.', 'B2'],
  ['debug', '/ˌdiːˈbʌɡ/', 'động từ', 'gỡ lỗi', 'It took me two hours to debug this function.', 'B2'],
  ['database', '/ˈdeɪtəbeɪs/', 'danh từ', 'cơ sở dữ liệu', 'All orders are saved in the database.', 'B1'],
  ['framework', '/ˈfreɪmwɜːk/', 'danh từ', 'khung (phần mềm), bộ khung', 'React is a popular framework for building websites.', 'B2'],
  ['algorithm', '/ˈælɡərɪðəm/', 'danh từ', 'thuật toán', 'The app uses an algorithm to choose your next word.', 'C1'],
  ['server', '/ˈsɜːvə/', 'danh từ', 'máy chủ', 'The server is down, so nobody can log in.', 'B1'],
  ['interface', '/ˈɪntəfeɪs/', 'danh từ', 'giao diện', 'The new interface is much easier to use.', 'B2'],
  ['variable', '/ˈveəriəbl/', 'danh từ', 'biến (trong lập trình)', 'Give every variable a clear name.', 'B2'],
  ['bug', '/bʌɡ/', 'danh từ', 'con bọ', 'There is a little bug on the leaf.', 'A2'],
  ['update', '/ʌpˈdeɪt/', 'động từ', 'cập nhật', 'Please update the app to the latest version.', 'A2'],
  ['feature', '/ˈfiːtʃə/', 'danh từ', 'tính năng', 'This feature lets you study offline.', 'B1'],
  ['release', '/rɪˈliːs/', 'động từ', 'phát hành', 'The team will release the game next month.', 'B1'],
  // Phim
  ['villain', '/ˈvɪlən/', 'danh từ', 'nhân vật phản diện', 'The villain wants to destroy the city.', 'B2'],
  ['sequel', '/ˈsiːkwəl/', 'danh từ', 'phần tiếp theo (phim, truyện)', 'The sequel is even better than the first film.', 'B2'],
  ['rescue', '/ˈreskjuː/', 'động từ', 'giải cứu', 'The hero arrives just in time to rescue her friends.', 'B1'],
  ['plot', '/plɒt/', 'danh từ', 'cốt truyện', 'I love the plot of this movie.', 'B1'],
  ['scene', '/siːn/', 'danh từ', 'cảnh (phim)', 'The final scene made everyone cry.', 'B1'],
  ['trailer', '/ˈtreɪlə/', 'danh từ', 'đoạn giới thiệu phim', 'Have you watched the new trailer?', 'B1'],
  ['hero', '/ˈhɪərəʊ/', 'danh từ', 'người hùng', 'Every hero needs a good friend.', 'A2'],
  // Du lịch
  ['passport', '/ˈpɑːspɔːt/', 'danh từ', 'hộ chiếu', 'Do not forget your passport at the hotel.', 'A2'],
  ['luggage', '/ˈlʌɡɪdʒ/', 'danh từ', 'hành lý', 'My luggage is too heavy for the plane.', 'A2'],
  ['reservation', '/ˌrezəˈveɪʃn/', 'danh từ', 'sự đặt chỗ', 'I have a reservation for two nights.', 'B1'],
  ['sightseeing', '/ˈsaɪtsiːɪŋ/', 'danh từ', 'tham quan', 'We spent the whole day sightseeing in Kyoto.', 'B1'],
  ['souvenir', '/ˌsuːvəˈnɪə/', 'danh từ', 'quà lưu niệm', 'She bought a small souvenir for her mum.', 'B1'],
  ['itinerary', '/aɪˈtɪnərəri/', 'danh từ', 'lịch trình', 'Our itinerary includes Tokyo and Osaka.', 'C1'],
  ['delay', '/dɪˈleɪ/', 'danh từ', 'sự chậm trễ', 'There is a two-hour delay because of the storm.', 'B1'],
  // Từ của ngày ở Sảnh
  ['resilient', '/rɪˈzɪl.i.ənt/', 'tính từ', 'kiên cường, nhanh chóng gượng dậy', 'After losing three matches in a row, Minh stayed resilient and won the fourth.', 'B1'],
  ['journey', '/ˈdʒɜː.ni/', 'danh từ', 'chuyến đi, hành trình', 'Every journey starts with one small step.', 'A1'],
]

let nextId = 1001
export const BANK = [
  ...LESSON_ENTRIES.map((e) => ({
    id: nextId++,
    headword: e.word,
    ipa: e.ipa,
    pos: e.pos,
    meaning_vi: e.meaning,
    example: e.example,
    cefr: 'B1',
    collocations: e.collocations,
    word_family: e.family,
  })),
  ...EXTRA_BANK.map(([headword, ipa, pos, meaning, example, cefr]) => ({
    id: nextId++,
    headword,
    ipa,
    pos,
    meaning_vi: meaning,
    example,
    cefr,
    collocations: [],
    word_family: [],
  })),
].map((e) => ({ ...e, source: 'system', audio_url: null, image_url: null, entry_type: e.headword.includes(' ') ? 'collocation' : 'word' }))

export const CUSTOM = [
  ['refactor', 'tái cấu trúc mã', 'động từ', 'Let us refactor this file before adding new code.'],
  ['merge conflict', 'xung đột khi gộp nhánh', 'danh từ', 'I spent the morning fixing a merge conflict.'],
  ['pull request', 'yêu cầu gộp mã', 'danh từ', 'Please review my pull request today.'],
  ['standup', 'cuộc họp nhanh đầu ngày', 'danh từ', 'Our standup starts at nine.'],
  ['spoiler', 'tiết lộ nội dung phim', 'danh từ', 'No spoiler please, I have not seen it yet!'],
  ['multiverse', 'đa vũ trụ', 'danh từ', null],
  ['plot twist', 'cú lừa của cốt truyện', 'danh từ', 'The ending had a huge plot twist.'],
  ['onsen', 'suối nước nóng (Nhật Bản)', 'danh từ', null],
].map(([headword, meaning_vi, pos, example]) => ({
  id: nextId++,
  headword,
  meaning_vi,
  pos,
  example,
  ipa: null,
  cefr: null,
  source: 'user',
  audio_url: null,
  image_url: null,
  collocations: [],
  word_family: [],
  entry_type: 'word',
}))

const byWord = (word) => [...BANK, ...CUSTOM].find((e) => e.headword === word).id
const ago = (days) => new Date(Date.now() - days * DAY).toISOString()

export const COURSES = [
  {
    id: 'c-it',
    title: 'Từ vựng IT',
    description: 'Từ hay gặp khi đọc tài liệu và làm việc nhóm ở công ty.',
    icon: 'code',
    color: 'sky',
    words: ['deploy', 'debug', 'database', 'framework', 'algorithm', 'server', 'interface', 'variable', 'refactor', 'merge conflict', 'pull request', 'standup'],
    created_at: ago(40),
  },
  {
    id: 'c-marvel',
    title: 'Phim Marvel',
    description: 'Từ trong phim siêu anh hùng, xem không cần phụ đề.',
    icon: 'film-slate',
    color: 'danger',
    words: ['villain', 'sequel', 'rescue', 'plot', 'scene', 'trailer', 'hero', 'spoiler', 'multiverse', 'plot twist'],
    created_at: ago(25),
  },
  {
    id: 'c-japan',
    title: 'Du lịch Nhật Bản',
    description: 'Chuẩn bị cho chuyến đi Tokyo – Osaka tháng 12.',
    icon: 'airplane-tilt',
    color: 'gold',
    words: ['passport', 'luggage', 'reservation', 'sightseeing', 'souvenir', 'itinerary', 'onsen'],
    created_at: ago(9),
  },
  {
    id: 'c-class',
    title: 'Từ trên lớp tháng 9',
    description: 'Bài đọc Unit 3 – 4.',
    icon: 'graduation-cap',
    color: 'accent',
    words: ['resilient', 'journey', 'qualification'],
    created_at: ago(60),
    archived_at: ago(12),
  },
].map((c) => ({ ...c, entries: c.words.map((w, i) => ({ entry_id: byWord(w), position: i + 1, personal_note: null, is_starred: false, added_at: ago(30 - i) })) }))

// Tiến độ mẫu: [từ, trạng thái, hạn ôn (ngày tính từ hôm nay, âm = đã quá hạn), số lần sai]
const PROGRESS_ROWS = [
  ['deploy', 'mastered', 12, 0],
  ['debug', 'mastered', 6, 1],
  ['database', 'mastered', 20, 0],
  ['server', 'learning', -1, 1],
  ['framework', 'learning', -0.2, 2],
  ['interface', 'learning', 2, 0],
  ['refactor', 'mastered', 9, 0],
  ['pull request', 'learning', -2, 3],
  ['standup', 'forgotten', -1, 2],
  ['villain', 'mastered', 15, 0],
  ['sequel', 'learning', -0.5, 1],
  ['plot', 'mastered', 30, 0],
  ['scene', 'learning', 1, 0],
  ['spoiler', 'mastered', 7, 0],
  ['plot twist', 'learning', -3, 2],
  ['hero', 'mastered', 25, 0],
  ['passport', 'learning', 3, 0],
  ['luggage', 'learning', -0.1, 1],
  ['resilient', 'mastered', 40, 0],
]

export const PROGRESS = Object.fromEntries(
  PROGRESS_ROWS.map(([word, status, dueDays, wrong]) => [
    byWord(word),
    { status, due_at: new Date(Date.now() + dueDays * DAY).toISOString(), wrong_count: wrong, correct_count: wrong + 3, strong_days: status === 'mastered' ? 3 : 1 },
  ]),
)

export const STARRED = ['framework', 'pull request', 'sequel']
for (const course of COURSES) {
  for (const link of course.entries) {
    if (STARRED.includes([...BANK, ...CUSTOM].find((e) => e.id === link.entry_id).headword)) link.is_starred = true
  }
}
