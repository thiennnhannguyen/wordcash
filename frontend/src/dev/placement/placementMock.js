/*
 * Giả lập API kiểm tra xếp lớp (khoảng 40 câu, khó dần theo câu trả lời).
 *
 * Server chọn câu kế tiếp dựa trên độ khó hiện tại, chấm câu trả lời và tính trình độ cuối cùng.
 * Client chỉ nhận từng câu (không kèm đáp án) cùng vị trí thanh độ khó; không hiện đúng/sai từng câu.
 * "Tôi chưa biết từ này" gửi lên câu trả lời rỗng và được tính như trả lời sai.
 * Kết quả: mở khóa tới cấp ước tính, nhưng từ ở các cấp bỏ qua KHÔNG tự tính là đã thuộc (luật mở khóa).
 * Ngân hàng câu bên dưới là nội dung nháp tự viết (tương đương status = draft).
 * TODO: thay bằng services/academyApi.
 */

import { speak } from '../../utils/speech'

const LATENCY_MS = 200
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
const normalize = (text) => text.trim().toLowerCase()

export const PLACEMENT_TOTAL = 40
const LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2']

// Mỗi cấp vài mục từ nháp: [từ, nghĩa]
const BANK = {
  A1: [['apple', 'quả táo'], ['family', 'gia đình'], ['happy', 'vui vẻ'], ['river', 'con sông'], ['cheap', 'rẻ'], ['kitchen', 'nhà bếp']],
  A2: [['borrow', 'mượn'], ['journey', 'chuyến đi'], ['polite', 'lịch sự'], ['invite', 'mời'], ['noisy', 'ồn ào'], ['medicine', 'thuốc']],
  B1: [['reliable', 'đáng tin cậy'], ['deadline', 'hạn chót'], ['pollution', 'sự ô nhiễm'], ['confident', 'tự tin'], ['recycle', 'tái chế'], ['salary', 'tiền lương']],
  B2: [['sustainable', 'bền vững'], ['reluctant', 'miễn cưỡng'], ['hypothesis', 'giả thuyết'], ['thrive', 'phát triển mạnh'], ['obstacle', 'trở ngại'], ['diverse', 'đa dạng']],
  C1: [['ambiguous', 'mơ hồ, nước đôi'], ['meticulous', 'tỉ mỉ'], ['undermine', 'làm suy yếu'], ['scrutiny', 'sự soi xét kỹ'], ['resilient', 'kiên cường'], ['advocate', 'ủng hộ, bênh vực']],
  C2: [['ubiquitous', 'có mặt khắp nơi'], ['ephemeral', 'phù du, chóng tàn'], ['obfuscate', 'làm rối, che giấu'], ['quintessential', 'tinh túy nhất'], ['pernicious', 'độc hại ngấm ngầm'], ['recalcitrant', 'ngoan cố']],
}

// Trạng thái phiên phía "server"
let state = null

function makeQuestion(n) {
  const levelIndex = Math.max(0, Math.min(5, Math.round(state.difficulty)))
  const pool = BANK[LEVELS[levelIndex]]
  const [word, meaning] = pool[(n * 5 + levelIndex) % pool.length]
  const others = pool.filter(([w]) => w !== word).slice(n % 3, (n % 3) + 3)
  const type = [1, 2, 1, 3][n % 4]
  const id = `pl${n + 1}`
  const shift = n % 4

  if (type === 3) {
    state.key[id] = { answer: word, word }
    return { id, level: 3, prompt: meaning, letterCount: word.length }
  }
  const pick = type === 1 ? ([, m]) => m : ([w]) => w
  const options = [[word, meaning], ...others].map(pick)
  const rotated = [...options.slice(shift), ...options.slice(0, shift)]
  state.key[id] = { answer: type === 1 ? meaning : word, word }
  return type === 1 ? { id, level: 1, word, options: rotated } : { id, level: 2, options: rotated }
}

function view() {
  return {
    total: PLACEMENT_TOTAL,
    answered: state.answered,
    difficulty: state.difficulty,
    question: state.current,
  }
}

/** Độ khó bắt đầu ở A2; mỗi câu đúng tăng, sai giảm, bước nhảy nhỏ dần để hội tụ. */
function step(correct) {
  const size = Math.max(0.2, 0.8 - state.answered * 0.03)
  state.difficulty = Math.max(0, Math.min(5, state.difficulty + (correct ? size : -size)))
  state.history.push(state.difficulty)
  state.answered += 1
}

export async function startPlacement({ resumeAt = 0 } = {}) {
  await wait(LATENCY_MS)
  state = { difficulty: 1, answered: 0, key: {}, history: [], current: null }
  // Dev: giả lập đã làm sẵn `resumeAt` câu, hội tụ quanh B1
  for (let i = 0; i < Math.min(resumeAt, PLACEMENT_TOTAL - 1); i++) step(state.difficulty < 2.2)
  state.current = makeQuestion(state.answered)
  return view()
}

/** `answer` = null nghĩa là bấm "Tôi chưa biết từ này". Không trả đúng/sai về client. */
export async function submitPlacementAnswer(questionId, answer) {
  await wait(LATENCY_MS)
  const correct = answer != null && normalize(answer) === normalize(state.key[questionId].answer)
  step(correct)
  state.current = state.answered < PLACEMENT_TOTAL ? makeQuestion(state.answered) : null
  return view()
}

export function playPlacementAudio(questionId, { slow = false } = {}) {
  const item = state?.key[questionId]
  if (item) speak(item.word, { rate: slow ? 0.55 : 0.9 })
}

export async function finishPlacement() {
  await wait(LATENCY_MS)
  const tail = state.history.slice(-10)
  const avg = tail.reduce((a, b) => a + b, 0) / Math.max(1, tail.length)
  const level = LEVELS[Math.max(0, Math.min(5, Math.round(avg)))]
  return { level, unlockedUpTo: level, skippedLevels: LEVELS.slice(0, LEVELS.indexOf(level)) }
}

/** Kết quả dựng sẵn cho `?step=result`. */
export const PREVIEW_RESULT = { level: 'B1', unlockedUpTo: 'B1', skippedLevels: ['A1', 'A2'] }
