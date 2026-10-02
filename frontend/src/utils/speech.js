/*
 * Phát âm tạm bằng Web Speech API của trình duyệt.
 * TODO: thay bằng file audio_url của mục từ (Howler, hooks/useSound.js) khi kho từ có audio.
 */

export function speak(text, { lang = 'en-US', rate = 0.9 } = {}) {
  try {
    if (!('speechSynthesis' in window)) return
    window.speechSynthesis.cancel()
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = lang
    utterance.rate = rate
    window.speechSynthesis.speak(utterance)
  } catch {
    // Trình duyệt không hỗ trợ: bỏ qua, không chặn luồng học
  }
}
