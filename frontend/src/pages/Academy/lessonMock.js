/*
 * Giả lập API bài học khi backend và kho từ chưa có. Bài mẫu: B1 · Công việc · Bài 3: Phỏng vấn xin việc.
 *
 * Nội dung mục từ bên dưới là bản nháp tự viết (tương đương status = draft), chỉ để dựng giao diện;
 * sẽ được thay bằng kho từ đã duyệt. Định nghĩa tiếng Anh tự viết, không chép từ điển có bản quyền.
 *
 * Giữ luật "server là trọng tài": câu hỏi luyện tập gửi xuống KHÔNG kèm đáp án. Đáp án, gợi ý chữ cái
 * và âm thanh câu nghe chỉ lấy qua các hàm của module này (tương ứng các endpoint sau này).
 * TODO: thay bằng services/academyApi.
 */

import { speak } from '../../utils/speech'

const LATENCY_MS = 250
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
const normalize = (text) => text.trim().toLowerCase().replace(/\s+/g, ' ')

export const LESSON = {
  id: '3-3',
  level: 'B1',
  topic: 'Công việc',
  number: 3,
  title: 'Phỏng vấn xin việc',
}

// 18 mục từ của bài (nội dung học, được phép gửi xuống client)
export const ENTRIES = [
  { word: 'interview', ipa: '/ˈɪntəvjuː/', pos: 'danh từ', meaning: 'buổi phỏng vấn', definition: 'A formal meeting where someone asks you questions, often for a job.', example: 'I have a job interview on Monday.', collocations: ['job interview', 'interview for a job'], family: ['interviewer', 'interviewee'] },
  { word: 'candidate', ipa: '/ˈkændɪdət/', pos: 'danh từ', meaning: 'ứng viên', definition: 'A person who is trying to get a job or a position.', example: 'She is the best candidate for the role.', collocations: ['strong candidate', 'ideal candidate'], family: ['candidacy'] },
  { word: 'experience', ipa: '/ɪkˈspɪəriəns/', pos: 'danh từ', meaning: 'kinh nghiệm', definition: 'Knowledge or skill you get from doing something.', example: 'Do you have any experience in sales?', collocations: ['work experience', 'gain experience'], family: ['experienced', 'inexperienced'] },
  { word: 'apply', ipa: '/əˈplaɪ/', pos: 'động từ', meaning: 'nộp đơn, ứng tuyển', definition: 'To formally ask for a job or a place somewhere.', example: 'He applied for a job at a bank.', collocations: ['apply for a job', 'apply online'], family: ['application', 'applicant'] },
  { word: 'reliable', ipa: '/rɪˈlaɪəbl/', pos: 'tính từ', meaning: 'đáng tin cậy', definition: 'Able to be trusted to do what people expect.', example: 'She is a very reliable friend.', collocations: ['reliable source', 'reliable friend'], family: ['rely', 'reliability', 'reliably'] },
  { word: 'confident', ipa: '/ˈkɒnfɪdənt/', pos: 'tính từ', meaning: 'tự tin', definition: 'Feeling sure about your own abilities.', example: 'Try to look confident in the interview.', collocations: ['feel confident', 'confident answer'], family: ['confidence', 'confidently'] },
  { word: 'qualification', ipa: '/ˌkwɒlɪfɪˈkeɪʃn/', pos: 'danh từ', meaning: 'bằng cấp, trình độ', definition: 'An exam you passed or a course you finished.', example: 'What qualifications do you need for this job?', collocations: ['academic qualification', 'professional qualification'], family: ['qualify', 'qualified'] },
  { word: 'skill', ipa: '/skɪl/', pos: 'danh từ', meaning: 'kỹ năng', definition: 'The ability to do something well.', example: 'Good communication skills are important.', collocations: ['communication skills', 'language skills'], family: ['skilled', 'skilful'] },
  { word: 'salary', ipa: '/ˈsæləri/', pos: 'danh từ', meaning: 'tiền lương', definition: 'Money you get for your work, usually every month.', example: 'The salary for this position is quite high.', collocations: ['monthly salary', 'salary increase'], family: [] },
  { word: 'deadline', ipa: '/ˈdedlaɪn/', pos: 'danh từ', meaning: 'hạn chót', definition: 'The time by which something must be done.', example: 'The deadline for applications is Friday.', collocations: ['meet a deadline', 'miss a deadline'], family: [] },
  { word: 'responsible', ipa: '/rɪˈspɒnsəbl/', pos: 'tính từ', meaning: 'chịu trách nhiệm', definition: 'Having the job of taking care of something.', example: 'You will be responsible for the sales team.', collocations: ['responsible for', 'feel responsible'], family: ['responsibility', 'responsibly'] },
  { word: 'strength', ipa: '/streŋθ/', pos: 'danh từ', meaning: 'điểm mạnh', definition: 'A good quality or ability that someone has.', example: 'What are your main strengths?', collocations: ['greatest strength', 'strengths and weaknesses'], family: ['strong', 'strengthen'] },
  { word: 'weakness', ipa: '/ˈwiːknəs/', pos: 'danh từ', meaning: 'điểm yếu', definition: 'A part of someone that is not very good.', example: 'Everyone has a weakness.', collocations: ['main weakness', 'admit a weakness'], family: ['weak', 'weaken'] },
  { word: 'employer', ipa: '/ɪmˈplɔɪə/', pos: 'danh từ', meaning: 'nhà tuyển dụng', definition: 'A person or company that pays people to work.', example: 'My employer gave me a day off.', collocations: ['current employer', 'future employer'], family: ['employ', 'employee', 'employment'] },
  { word: 'position', ipa: '/pəˈzɪʃn/', pos: 'danh từ', meaning: 'vị trí công việc', definition: 'A job in a company or an organisation.', example: 'I am applying for the position of manager.', collocations: ['apply for a position', 'senior position'], family: [] },
  { word: 'colleague', ipa: '/ˈkɒliːɡ/', pos: 'danh từ', meaning: 'đồng nghiệp', definition: 'A person you work with.', example: 'My colleagues are very friendly.', collocations: ['close colleague', 'former colleague'], family: [] },
  { word: 'hire', ipa: '/ˈhaɪə/', pos: 'động từ', meaning: 'thuê, tuyển dụng', definition: 'To give someone a job.', example: 'The company plans to hire ten new staff.', collocations: ['hire staff', 'hire someone'], family: [] },
  { word: 'impress', ipa: '/ɪmˈpres/', pos: 'động từ', meaning: 'gây ấn tượng', definition: 'To make someone admire you.', example: 'He impressed the interviewers with his ideas.', collocations: ['impress an employer', 'try to impress'], family: ['impression', 'impressive'] },
]

export const ENTRY_BY_WORD = Object.fromEntries(ENTRIES.map((e) => [e.word, e]))

// "Kho" phía server: chỉ module này thấy đáp án
const SERVER_ANSWERS = {
  p1: { answer: 'đáng tin cậy', word: 'reliable' },
  p2: { answer: 'candidate', word: 'candidate' },
  p3: { answer: 'reliable', word: 'reliable' },
  p4: { answer: 'deadline', word: 'deadline' },
  c1: { answer: 'Một công ty du lịch' },
  c2: { answer: 'Đáng tin cậy và luôn kịp hạn chót' },
  c3: { answer: 'Được nhận vào làm' },
}

// Câu luyện tập gửi xuống client: đủ 4 mức, không kèm đáp án
const PRACTICE = [
  { id: 'p1', level: 1, word: 'reliable', options: ['đáng tin cậy', 'có thể tái chế', 'liên quan', 'nổi tiếng'] },
  { id: 'p2', level: 2, options: ['candidate', 'colleague', 'confident', 'qualification'] },
  { id: 'p3', level: 3, prompt: 'đáng tin cậy', letterCount: 8 },
  { id: 'p4', level: 4, sentence: 'The ______ for applications is Friday.', options: ['deadline', 'salary', 'colleague', 'weakness'] },
]

// Đoạn văn ngữ cảnh (~80 từ). [[chữ hiện|mục từ]] đánh dấu mục từ của bài.
export const CONTEXT_PASSAGE =
  'Last week, Minh had his first job [[interview]]. He was one of five [[candidates|candidate]] for a [[position]] at a travel company. ' +
  'He felt nervous, but he tried to look [[confident]]. The [[employer]] asked about his [[experience]] and his greatest [[strength]]. ' +
  'Minh explained that he was [[reliable]] and never missed a [[deadline]]. He also talked honestly about one [[weakness]]. ' +
  "At the end, the manager smiled and said, 'We would like to [[hire]] you.'"

export const CONTEXT_QUESTIONS = [
  { id: 'c1', question: 'Minh ứng tuyển vào đâu?', options: ['Một công ty du lịch', 'Một ngân hàng', 'Một trường học', 'Một bệnh viện'] },
  { id: 'c2', question: 'Minh nói điểm mạnh của mình là gì?', options: ['Nói được nhiều ngoại ngữ', 'Đáng tin cậy và luôn kịp hạn chót', 'Có nhiều bằng cấp', 'Không cần lương cao'] },
  { id: 'c3', question: 'Kết quả buổi phỏng vấn thế nào?', options: ['Bị từ chối', 'Phải phỏng vấn lại', 'Được nhận vào làm', 'Chưa có kết quả'] },
]

export async function fetchPractice() {
  await wait(LATENCY_MS)
  return PRACTICE
}

/** Phát âm thanh câu "Nghe chọn từ". API thật sẽ trả audio_url, không trả chữ. */
export function playQuestionAudio(questionId, { slow = false } = {}) {
  const item = SERVER_ANSWERS[questionId]
  if (!item) return
  speak(item.word, { rate: slow ? 0.55 : 0.9 })
}

/** Gợi ý thêm 1 chữ cái cho câu gõ từ: trả về phần đầu của đáp án. */
export async function requestHint(questionId, revealed) {
  await wait(LATENCY_MS)
  const answer = SERVER_ANSWERS[questionId].answer
  return answer.slice(0, Math.min(revealed + 1, answer.length - 1))
}

export async function submitPracticeAnswer(questionId, answer) {
  await wait(LATENCY_MS)
  const item = SERVER_ANSWERS[questionId]
  const entry = ENTRY_BY_WORD[item.word]
  return {
    correct: normalize(answer) === normalize(item.answer),
    correctAnswer: item.word ?? item.answer,
    ipa: entry?.ipa,
    meaning: entry?.meaning,
    example: entry?.example,
    masteredDelta: 0,
  }
}

export async function submitContextAnswers(answers) {
  await wait(LATENCY_MS)
  return Object.fromEntries(
    Object.entries(answers).map(([id, value]) => [id, { correct: value === SERVER_ANSWERS[id].answer, correctAnswer: SERVER_ANSWERS[id].answer }]),
  )
}

export async function finishLesson({ results, maxCombo }) {
  await wait(LATENCY_MS)
  const correct = results.filter((r) => r.correct).length
  return {
    learned: ENTRIES.length,
    accuracy: results.length ? Math.round((correct / results.length) * 100) : 100,
    maxCombo,
  }
}

/** Kết quả dựng sẵn cho `?step=done`. */
export const PREVIEW_DONE = { learned: 18, accuracy: 88, maxCombo: 7 }
