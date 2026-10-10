/*
 * Tấm phản hồi sau mỗi câu: hiện đáp án đúng ĐÚNG LOẠI mà câu đã hỏi.
 * Mức 1 (nhìn từ, chọn nghĩa) hỏi NGHĨA tiếng Việt; Mức 2 (nghe chọn từ), 3 (gõ từ), 4 (điền vào câu) hỏi TỪ tiếng Anh.
 * Đáp án luôn lấy từ server (`correct_answer`, chỉ có sau khi chấm); headword / phiên âm / nghĩa lấy từ `entry` kèm theo.
 */

// Kết quả chấm của phiên học (POST /study-sessions/{id}/answers) → props `result` của FeedbackSheet
export function studyFeedback(r, question) {
  return {
    correct: r.correct,
    level: question?.level,
    correctAnswer: r.correct_answer,
    word: r.entry?.headword,
    meaning: r.entry?.meaning_vi,
    ipa: r.entry?.ipa,
    example: r.entry?.example,
  }
}

// Phần hiển thị: `answer` (dòng "Đáp án"), `asksMeaning`, `word` (từ tiếng Anh để đọc), `meaning` (dòng phụ khi đáp án là từ)
export function feedbackAnswer(result) {
  const asksMeaning = result.level === 1
  const word = result.word ?? (asksMeaning ? null : result.correctAnswer)
  const answer = result.correctAnswer ?? (asksMeaning ? result.meaning : word)
  return { asksMeaning, answer, word, meaning: asksMeaning ? null : result.meaning }
}
