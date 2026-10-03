/*
 * Màn học của "Khóa học của tôi" /courses/:id/study?mode=learn|review|quick|hard|test (toàn màn hình, ngoài PageShell).
 *
 * Dùng lại component của Học Viện: WordCard (thẻ học, vuốt ngang), QuestionView (4 mức câu hỏi), FeedbackSheet.
 * Thanh trên ghi tên khóa học và chế độ. Câu hỏi nhận từ server KHÔNG kèm đáp án; mỗi câu nộp lên server chấm rồi mới
 * hiện tấm phản hồi. Chế độ Kiểm tra không hiện đúng/sai từng câu, chỉ hiện điểm và đáp án khi nộp hết.
 * Màn kết thúc có thống kê và nút "Ôn lại từ sai" (phiên ôn nhanh chỉ gồm các từ sai, truyền qua location.state).
 */

import { useCallback, useEffect, useState } from 'react'
import { useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import confetti from 'canvas-confetti'
import { ArrowLeft, ArrowRight, ArrowsClockwise, CheckCircle, Crown, SpeakerHigh, Target, XCircle } from '@phosphor-icons/react'
import Button from '../../components/ui/Button'
import Icon, { IconBadge } from '../../components/ui/Icon'
import ProgressBar from '../../components/ui/ProgressBar'
import Sticker from '../../components/ui/Sticker'
import FeedbackSheet from '../../components/academy/FeedbackSheet'
import QuestionView from '../../components/academy/QuestionView'
import WordCard from '../../components/academy/WordCard'
import MascotBlob from '../../components/collection/MascotBlob'
import * as coursesApi from '../../services/coursesApi'
import cx from '../../utils/cx'
import { courseIcon } from '../../utils/courseIcons'
import { speak } from '../../utils/speech'
import { MODES } from './courseUi'

const SWIPE_THRESHOLD = 80

function play(text, audioUrl, slow = false) {
  if (audioUrl) {
    const audio = new Audio(audioUrl)
    audio.playbackRate = slow ? 0.75 : 1
    audio.play().catch(() => {})
  } else if (text) speak(text, { rate: slow ? 0.6 : 0.9 })
}

function StudyTopBar({ course, mode, value, max, onExit }) {
  const modeLabel = MODES.find((m) => m.key === mode)?.label
  return (
    <header className="mx-auto flex w-full max-w-3xl flex-col gap-3 px-4 pt-4 md:px-8 md:pt-6">
      <div className="flex items-center gap-3">
        <button type="button" onClick={onExit} aria-label="Thoát phiên học" className="-ml-2 grid size-11 shrink-0 place-items-center rounded-pill text-muted hover:bg-raised hover:text-ink">
          <Icon icon={XCircle} size={30} />
        </button>
        <span className="flex min-w-0 items-center gap-2 rounded-pill border-2 border-line px-2 py-1 pr-3 text-ink" style={{ background: `var(--color-${course.color})` }}>
          <IconBadge icon={courseIcon(course.icon)} bg="surface" size="sm" shape="circle" shadow={false} className="!size-7" />
          <span className={cx('truncate font-display text-[13px] font-bold uppercase', course.color === 'primary' && 'text-white')}>{course.title}</span>
        </span>
        <span className="hud-label ml-auto shrink-0 text-muted">{modeLabel}</span>
      </div>
      {max > 0 && (
        <div className="flex items-center gap-3">
          <ProgressBar value={value} max={max} size="md" className="flex-1" />
          <span className="font-num shrink-0 text-base">
            {value}/{max}
          </span>
        </div>
      )}
    </header>
  )
}

function toCardEntry(card) {
  return {
    word: card.headword,
    ipa: card.ipa,
    pos: card.pos,
    meaning: card.meaning_vi,
    definition: card.personal_note ? `Ghi chú của bạn: ${card.personal_note}` : null,
    example: card.example,
    collocations: card.collocations,
    family: card.word_family,
  }
}

function CardsStep({ session, onFinish, onExit }) {
  const [index, setIndex] = useState(0)
  const [direction, setDirection] = useState(1)
  const cards = session.cards
  const card = cards[index]

  const go = useCallback(
    (delta) => {
      const target = index + delta
      if (target < 0) return
      if (target >= cards.length) {
        onFinish()
        return
      }
      setDirection(delta)
      setIndex(target)
      window.scrollTo({ top: 0 })
    },
    [index, cards.length, onFinish],
  )

  useEffect(() => {
    const onKey = (event) => {
      if (event.key === 'ArrowRight') go(1)
      if (event.key === 'ArrowLeft') go(-1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [go])

  return (
    <div className="flex min-h-dvh flex-col bg-bg">
      <StudyTopBar course={session.course} mode={session.mode} value={index + 1} max={cards.length} onExit={onExit} />
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col overflow-x-clip px-4 pb-36 pt-5 md:px-8 md:pb-40 md:pt-8">
        <span className="hud-label mb-3 text-muted">Thẻ học · từ mới</span>
        <AnimatePresence mode="popLayout" initial={false} custom={direction}>
          <motion.div
            key={card.entry_id}
            initial={{ x: direction * 80, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: direction * -80, opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.6}
            onDragEnd={(_, info) => {
              if (info.offset.x < -SWIPE_THRESHOLD) go(1)
              else if (info.offset.x > SWIPE_THRESHOLD) go(-1)
            }}
            className="touch-pan-y"
          >
            <WordCard
              entry={toCardEntry(card)}
              level={card.cefr}
              tag={card.source === 'user' && <span className="rounded-pill border-2 border-line bg-gold px-2.5 font-display text-[13px] font-bold uppercase leading-6">Tự tạo</span>}
            />
          </motion.div>
        </AnimatePresence>
        <p className="mt-4 text-center text-caption text-muted md:hidden">Vuốt ngang để chuyển thẻ</p>
      </main>
      <div className="fixed inset-x-0 bottom-0 z-30 border-t-thick border-line bg-surface px-4 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-4 md:px-8">
        <div className="mx-auto flex max-w-3xl gap-3 md:justify-end">
          <Button variant="secondary" size="lg" icon={SpeakerHigh} className="shrink-0 px-5" onClick={() => play(card.headword, card.audio_url)}>
            <span className="hidden sm:inline">Nghe lại</span>
            <span className="sr-only sm:hidden">Nghe lại</span>
          </Button>
          <Button size="lg" iconRight={ArrowRight} className="flex-1 md:min-w-72 md:flex-none" onClick={() => go(1)}>
            {index === cards.length - 1 ? 'Vào luyện tập' : 'Đã hiểu, tiếp'}
          </Button>
        </div>
      </div>
    </div>
  )
}

function QuestionsStep({ session, onDone, onExit }) {
  const [index, setIndex] = useState(0)
  const [answer, setAnswer] = useState('')
  const [feedback, setFeedback] = useState(null)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState(null)
  const isTest = session.mode === 'test'
  const question = session.questions[index]

  useEffect(() => {
    if (question?.level === 2) play(null, question.audio_url)
  }, [question])

  const advance = (res) => {
    setFeedback(null)
    setAnswer('')
    if (res.finished) onDone(res)
    else setIndex((i) => i + 1)
  }

  const check = async () => {
    if (!answer.trim() || pending || feedback) return
    setPending(true)
    setError(null)
    try {
      const res = await coursesApi.submitAnswers(session.id, [{ question_id: question.id, answer }])
      const r = res.results[0]
      if (isTest) advance(res)
      else
        setFeedback({
          res,
          result: { correct: r.correct, correctAnswer: r.entry?.headword ?? r.correct_answer, meaning: r.entry?.meaning_vi, ipa: r.entry?.ipa, example: r.entry?.example },
        })
    } catch (err) {
      setError(err.message)
    } finally {
      setPending(false)
    }
  }

  return (
    <div className="flex min-h-dvh flex-col bg-bg">
      <StudyTopBar course={session.course} mode={session.mode} value={index + (feedback ? 1 : 0)} max={session.questions.length} onExit={onExit} />
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-4 pb-36 pt-5 md:px-8 md:pb-40 md:pt-8">
        <QuestionView
          key={question.id}
          question={question}
          answer={answer}
          onAnswer={setAnswer}
          onSubmit={check}
          locked={Boolean(feedback) || pending}
          onPlayAudio={({ slow }) => play(null, question.audio_url, slow)}
        />
        {error && (
          <p role="alert" className="mt-4 text-center font-semibold text-danger-deep">
            {error}
          </p>
        )}
      </main>
      {!feedback && (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t-thick border-line bg-surface px-4 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-4 md:px-8">
          <div className="mx-auto flex max-w-3xl items-center justify-between gap-4">
            <span className="hud-label hidden md:inline">{isTest ? 'Kiểm tra: kết quả hiện khi làm xong' : 'Phím 1–4 để chọn · Enter để kiểm tra'}</span>
            <Button size="lg" fullWidth className="md:w-auto md:min-w-64" disabled={!answer.trim() || pending} onClick={check}>
              {pending ? 'Đang chấm…' : isTest ? 'Trả lời' : 'Kiểm tra'}
            </Button>
          </div>
        </div>
      )}
      <AnimatePresence>
        {feedback && (
          <FeedbackSheet
            key={index}
            result={feedback.result}
            onContinue={() => advance(feedback.res)}
            note={feedback.res.results[0].became_mastered ? 'Bạn vừa thuộc từ này!' : 'Từ này sẽ quay lại trong lượt ôn.'}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

function tokenColors(names) {
  const style = getComputedStyle(document.documentElement)
  return names.map((n) => style.getPropertyValue(`--color-${n}`).trim()).filter(Boolean)
}

function DoneScreen({ session, summary, onRetryWrong, onBack, onAgain }) {
  const reduceMotion = useReducedMotion()
  const great = summary.score >= 80
  const isTest = session.mode === 'test'

  useEffect(() => {
    if (reduceMotion || !great) return undefined
    const t = setTimeout(() => confetti({ particleCount: 80, spread: 75, origin: { y: 0.35 }, colors: tokenColors(['primary', 'accent', 'gold', 'sky']) }), 250)
    return () => clearTimeout(t)
  }, [reduceMotion, great])

  return (
    <div className={cx('min-h-dvh', great ? 'bg-accent' : 'bg-bg')}>
      <main className="mx-auto flex w-full max-w-2xl flex-col items-center gap-6 px-4 pb-12 pt-10 text-center">
        <div className="relative">
          <motion.div animate={reduceMotion || !great ? undefined : { y: [0, -24, 0] }} transition={{ duration: 0.9, repeat: Infinity, repeatDelay: 0.8 }}>
            <MascotBlob color={great ? 'primary' : 'sky'} shape="round" size={120} />
          </motion.div>
          <Sticker bg={great ? 'gold' : 'surface'} tilt={-8} className="absolute -left-16 top-2">
            {great ? 'Đỉnh!' : 'Cố lên!'}
          </Sticker>
        </div>
        <div className="flex flex-col gap-2">
          <span className="hud-label text-ink/70">
            {session.course.title} · {MODES.find((m) => m.key === session.mode)?.label}
          </span>
          <h1 className="text-[36px] leading-[1.05] md:text-[48px]">{isTest ? `Điểm: ${summary.score}/100` : `Đúng ${summary.correct}/${summary.total} câu`}</h1>
        </div>

        <div className="grid w-full grid-cols-3 gap-3">
          {[
            { icon: Target, bg: 'sky', value: `${summary.score}%`, label: 'Chính xác' },
            { icon: CheckCircle, bg: 'accent', value: summary.correct, label: 'Câu đúng' },
            { icon: Crown, bg: 'gold', value: summary.mastered_now, label: 'Từ vừa thuộc' },
          ].map((s) => (
            <div key={s.label} className="flex flex-col items-center gap-2 rounded-card border-thick border-line bg-surface p-3 shadow-hard md:flex-row md:text-left">
              <IconBadge icon={s.icon} bg={s.bg} size="md" shape="square" shadow={false} />
              <div className="leading-tight">
                <div className="font-num text-2xl">{s.value}</div>
                <div className="text-[13px] text-muted">{s.label}</div>
              </div>
            </div>
          ))}
        </div>

        {summary.wrong.length > 0 && (
          <section className="flex w-full flex-col gap-3 rounded-panel border-thick border-danger bg-surface p-4 text-left shadow-hard md:p-5">
            <h2 className="text-h3">{summary.wrong.length} từ cần ôn lại</h2>
            <ul className="flex flex-col divide-y-2 divide-line/10">
              {summary.wrong.map((w) => (
                <li key={w.id} className="flex items-center gap-3 py-2.5">
                  <button type="button" onClick={() => play(w.headword, w.audio_url)} aria-label={`Nghe phát âm ${w.headword}`} className="grid size-11 shrink-0 place-items-center rounded-pill border-thick border-line bg-sky">
                    <Icon icon={SpeakerHigh} size={20} color="ink" />
                  </button>
                  <div className="min-w-0 flex-1">
                    <div className="font-display text-lg font-bold">{w.headword}</div>
                    <div className="text-caption">{w.meaning_vi}</div>
                  </div>
                  {w.your_answer && (
                    <s className="max-w-[40%] truncate text-caption font-semibold text-danger-deep decoration-2" title={`Bạn trả lời: ${w.your_answer}`}>
                      {w.your_answer}
                    </s>
                  )}
                </li>
              ))}
            </ul>
          </section>
        )}

        <div className="flex w-full flex-col gap-3 md:flex-row md:justify-center">
          {summary.wrong.length > 0 && (
            <Button size="lg" variant="danger" icon={ArrowsClockwise} onClick={onRetryWrong}>
              Ôn lại từ sai
            </Button>
          )}
          {summary.wrong.length === 0 && (
            <Button size="lg" icon={ArrowsClockwise} onClick={onAgain}>
              Học tiếp
            </Button>
          )}
          <Button size="lg" variant="secondary" icon={ArrowLeft} onClick={onBack}>
            Về khóa học
          </Button>
        </div>
      </main>
    </div>
  )
}

export default function CourseStudy() {
  const { id } = useParams()
  const [params] = useSearchParams()
  const location = useLocation()
  const navigate = useNavigate()
  const mode = params.get('mode') ?? 'learn'
  const entryIds = location.state?.entryIds ?? null
  const [session, setSession] = useState(null)
  const [error, setError] = useState(null)
  const [step, setStep] = useState('loading')
  const [summary, setSummary] = useState(null)

  useEffect(() => {
    let alive = true
    setStep('loading')
    setSummary(null)
    coursesApi
      .startSession(id, { mode, ...(entryIds ? { entry_ids: entryIds } : {}) })
      .then((s) => {
        if (!alive) return
        setSession(s)
        setStep(s.cards.length ? 'cards' : 'questions')
      })
      .catch((err) => alive && setError(err))
    return () => {
      alive = false
    }
    // location.key: bấm "Ôn lại từ sai" mở phiên mới cùng đường dẫn
  }, [id, mode, location.key]) // eslint-disable-line react-hooks/exhaustive-deps

  const back = () => navigate(`/courses/${id}`)

  if (error) {
    const reason = error.details?.reason
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-5 bg-bg px-4 text-center">
        <MascotBlob color="sky" shape="round" size={110} />
        <h1 className="text-h2">{error.code === 'NOTHING_TO_STUDY' ? (reason === 'daily_limit' ? 'Hôm nay đủ từ mới rồi!' : 'Chưa có từ cho chế độ này') : 'Chưa bắt đầu được'}</h1>
        <p className="max-w-md text-muted">
          {error.code === 'NOTHING_TO_STUDY'
            ? reason === 'daily_limit'
              ? 'Bạn đã học đủ số từ mới cho hôm nay. Ôn lại các từ đã học để nhớ lâu hơn nhé.'
              : 'Thử chế độ khác hoặc thêm từ vào khóa học.'
            : error.message}
        </p>
        <Button icon={ArrowLeft} onClick={back}>
          Về khóa học
        </Button>
      </div>
    )
  }
  if (step === 'loading' || !session) return <div className="min-h-dvh bg-bg" aria-busy="true" />
  if (step === 'cards') return <CardsStep session={session} onFinish={() => setStep('questions')} onExit={back} />
  if (step === 'questions')
    return (
      <QuestionsStep
        session={session}
        onExit={back}
        onDone={(res) => {
          setSummary(res.summary)
          setStep('done')
        }}
      />
    )
  return (
    <DoneScreen
      session={session}
      summary={summary}
      onBack={back}
      onAgain={() => navigate(`/courses/${id}/study?mode=quick`, { replace: true })}
      onRetryWrong={() => navigate(`/courses/${id}/study?mode=quick`, { replace: true, state: { entryIds: summary.wrong.map((w) => w.id) } })}
    />
  )
}
