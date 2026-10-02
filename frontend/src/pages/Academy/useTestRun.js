/*
 * Luồng làm một bài kiểm tra (dùng chung cho Kiểm tra cuối bài và Trận Boss).
 *
 * Giữ câu hiện tại, câu trả lời đang chọn, kết quả server trả về cho câu vừa nộp và bộ đếm tiến độ.
 * Client không tự chấm: đúng/sai, số câu đúng và máu Boss đều lấy từ phản hồi của server.
 * Phím tắt: Enter để kiểm tra (câu chọn đáp án), Enter lần nữa để sang câu tiếp.
 */

import { useCallback, useEffect, useState } from 'react'
import { playTestAudio, submitTestAnswer } from './testMock'

export default function useTestRun(session, { onVerdict, onFinish } = {}) {
  const [index, setIndex] = useState(session?.answered ?? 0)
  const [answer, setAnswer] = useState('')
  const [pending, setPending] = useState(false)
  const [verdict, setVerdict] = useState(null)
  const [progress, setProgress] = useState({ answered: session?.answered ?? 0, correct: session?.correct ?? 0, bossHp: session?.bossHp })

  // Khi bắt đầu phiên mới (làm lại) thì đặt lại toàn bộ
  useEffect(() => {
    if (!session) return
    setIndex(session.answered)
    setAnswer('')
    setVerdict(null)
    setProgress({ answered: session.answered, correct: session.correct, bossHp: session.bossHp })
  }, [session])

  const question = session?.questions[index]

  // Câu nghe: tự phát âm khi vào câu
  useEffect(() => {
    if (question?.level === 2) playTestAudio(question.id)
  }, [question])

  const submit = useCallback(async () => {
    if (!question || !answer.trim() || pending || verdict) return
    setPending(true)
    const res = await submitTestAnswer(question.id, answer)
    setPending(false)
    setProgress({ answered: res.answered, correct: res.correctCount, bossHp: res.bossHp })
    setVerdict(res)
    onVerdict?.(res)
  }, [question, answer, pending, verdict, onVerdict])

  const next = useCallback(() => {
    if (!verdict) return
    setVerdict(null)
    setAnswer('')
    if (index + 1 < session.questions.length) {
      setIndex((i) => i + 1)
      window.scrollTo({ top: 0 })
    } else {
      onFinish?.()
    }
  }, [verdict, index, session, onFinish])

  // Enter để kiểm tra câu chọn đáp án (câu gõ từ đã có form riêng)
  useEffect(() => {
    const onKey = (event) => {
      if (event.key !== 'Enter' || event.target instanceof HTMLInputElement || event.target instanceof HTMLButtonElement) return
      if (!verdict) submit()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [submit, verdict])

  return {
    question,
    index,
    answer,
    setAnswer,
    pending,
    verdict,
    progress,
    submit,
    next,
    playAudio: (opts) => question && playTestAudio(question.id, opts),
  }
}
