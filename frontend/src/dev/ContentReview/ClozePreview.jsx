/*
 * Xem trước câu hỏi Mức 4 ("điền vào câu") của mục đang duyệt, dựng NGAY từ ô đang sửa (cloze_en + cloze_distractors), bằng
 * đúng component người học thấy (QuestionView, đáp án đúng đang được chọn) — để duyệt nhanh, không cần lưu trước.
 * Bên dưới: từng đáp án nhiễu thay vào chỗ trống (câu phải SAI rõ ràng về nghĩa) và cảnh báo khi chưa đủ điều kiện Mức 4
 * (thiếu câu, câu không chứa đúng một lần từ, không đủ 3 đáp án nhiễu khác nhau…) — khi đó người học sẽ gặp Mức 3.
 * Quy tắc chỗ trống khớp backend/app/services/question_builder.py (blank_sentence, cloze_ready).
 */

import { Warning } from '@phosphor-icons/react'
import Icon from '../../components/ui/Icon'
import QuestionView from '../../components/academy/QuestionView'

const BLANK = '______'

function wordPattern(word, flags = 'i') {
  const escaped = word.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return new RegExp(`(?<![\\w'-])${escaped}(?![\\w'-])`, flags)
}

/** Thứ tự lựa chọn cố định theo từ (không nhảy lung tung khi đang gõ), giống việc server xáo một lần cho mỗi câu. */
function stableShuffle(items, seedText) {
  let seed = [...seedText].reduce((h, ch) => (h * 31 + ch.charCodeAt(0)) >>> 0, 7)
  const out = [...items]
  for (let i = out.length - 1; i > 0; i -= 1) {
    seed = (seed * 1103515245 + 12345) >>> 0
    const j = seed % (i + 1)
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}

export function clozeProblems(headword, sentence, distractors) {
  const problems = []
  const text = sentence.trim()
  if (!text) problems.push('Chưa có câu điền từ.')
  else {
    const count = (text.match(wordPattern(headword, 'gi')) || []).length
    if (count !== 1) problems.push(`Câu phải chứa đúng 1 lần "${headword}" (đang có ${count}).`)
  }
  const lowered = distractors.map((d) => d.toLowerCase())
  if (distractors.length !== 3) problems.push(`Cần đúng 3 đáp án nhiễu (đang có ${distractors.length}).`)
  if (new Set(lowered).size !== lowered.length) problems.push('Đáp án nhiễu bị trùng nhau.')
  if (lowered.includes(headword.trim().toLowerCase())) problems.push('Đáp án nhiễu trùng đáp án đúng.')
  return problems
}

export default function ClozePreview({ headword, sentence, distractors }) {
  const problems = clozeProblems(headword, sentence, distractors)
  const blanked = sentence.trim() ? sentence.replace(wordPattern(headword), BLANK) : ''
  const ready = problems.length === 0
  const question = ready && { id: 'preview', level: 4, sentence: blanked, options: stableShuffle([headword, ...distractors], headword) }

  return (
    <div className="flex flex-col gap-3" aria-label="Xem trước câu điền từ">
      {ready ? (
        <QuestionView question={question} answer={headword} onAnswer={() => {}} locked shadowClass="shadow-hard" />
      ) : (
        <div className="flex gap-2 rounded-btn border-2 border-line bg-gold-soft px-3 py-2 text-[14px] text-ink" role="status">
          <Icon icon={Warning} size={20} color="orange" className="mt-0.5 shrink-0" />
          <div>
            <b>Chưa đủ điều kiện Mức 4 — người học sẽ gặp Mức 3 (gõ từ).</b>
            <ul className="mt-1 list-disc pl-5">
              {problems.map((p) => <li key={p}>{p}</li>)}
            </ul>
          </div>
        </div>
      )}
      {blanked.includes(BLANK) && distractors.length > 0 && (
        <div className="rounded-btn border-2 border-line bg-surface px-3 py-2 text-[14px]">
          <p className="hud-label mb-1">Thay từng đáp án nhiễu vào — câu phải sai rõ ràng về nghĩa</p>
          <ul className="flex flex-col gap-1">
            {distractors.map((d) => {
              const [before, after] = blanked.split(BLANK)
              return (
                <li key={d} className="text-ink">
                  {before}<b className="rounded bg-danger/20 px-1">{d}</b>{after}
                </li>
              )
            })}
          </ul>
        </div>
      )}
    </div>
  )
}
