/*
 * Bài kiểm tra cuối bài (qua 80%) và cuối chặng.
 *
 * Khung câu hỏi giống màn luyện tập (đủ 4 mức, không có gợi ý). Thanh tiến độ trên cùng có vạch mốc 80%
 * và bộ đếm "Đúng 14/20". Đúng/sai từng câu, điểm, việc mở bài tiếp và danh sách từ sai do server trả về.
 * Kết quả đạt: điểm lớn, trạm tiếp theo vỡ khóa. Chưa đạt: điểm, số câu còn thiếu, linh vật động viên,
 * danh sách từ sai và luồng "Ôn từ sai rồi làm lại" (lật thẻ các từ sai rồi làm lại bài).
 *
 * Dữ liệu thật: `?unit=<id>` (kiểm tra cuối bài) hoặc `?topic=<id>` (bài tổng hợp chặng) qua services/academyApi.js.
 * Qua bài: hiện trạm vừa mở, con dấu địa danh (bài tổng hợp), lượt quay / lên rank (RewardsLayer).
 * Dev: `?preview=pass|fail`, `?q=16` (bản mock: vào thẳng câu 17, đã làm sẵn 16 câu).
 */

import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { motion, useReducedMotion } from 'framer-motion'
import confetti from 'canvas-confetti'
import { ArrowClockwise, ArrowRight, MapTrifold, SpeakerHigh, XCircle } from '@phosphor-icons/react'
import Button, { IconButton } from '../../components/ui/Button'
import Icon from '../../components/ui/Icon'
import Modal from '../../components/ui/Modal'
import MascotBlob from '../../components/collection/MascotBlob'
import BigScore from '../../components/academy/BigScore'
import QuestionView from '../../components/academy/QuestionView'
import TestActionBar from '../../components/academy/TestActionBar'
import UnlockMap from '../../components/academy/UnlockMap'
import WordCard from '../../components/academy/WordCard'
import cx from '../../utils/cx'
import { speak } from '../../utils/speech'
import RewardsLayer from '../../components/academy/RewardsLayer'
import { finishUnitTest, startUnitTest } from '../../services/academyApi'
import { AcademyError } from './AcademyLesson'
import { ENTRY_BY_WORD, LESSON } from './lessonMock'
import LessonTopBar from './LessonTopBar'
import { PREVIEW_UNIT } from './testMock'
import useTestRun from './useTestRun'

function tokenColors(names) {
  const style = getComputedStyle(document.documentElement)
  return names.map((n) => style.getPropertyValue(`--color-${n}`).trim()).filter(Boolean)
}

/** Tiêu đề bài: kiểm tra cuối bài hoặc bài tổng hợp chặng (`lesson.kind === 'topic'`). */
function titleOf(lesson = LESSON) {
  return lesson.kind === 'topic' ? `${lesson.level} · Chặng ${lesson.number}: ${lesson.title}` : `${lesson.level} · Bài ${lesson.number}: ${lesson.title}`
}
const kindLabel = (lesson) => (lesson?.kind === 'topic' ? 'Bài tổng hợp chặng' : 'Kiểm tra cuối bài')

/** Trang kế tiếp sau khi qua bài, theo phần server vừa mở. */
function nextRoute(unlocked) {
  if (!unlocked) return '/academy'
  if (unlocked.kind === 'unit' || unlocked.kind === 'topic') return unlocked.id ? `/academy/lesson?unit=${unlocked.id}` : '/academy'
  if (unlocked.kind === 'topic_test') return `/academy/unit-test?topic=${unlocked.topicId}`
  if (unlocked.kind === 'boss') return `/academy/boss?level=${unlocked.code}`
  return '/academy/lesson'
}

/** Thanh tiến độ có vạch mốc qua bài. Phần xanh chanh là số câu đúng (server đếm). */
function TestProgress({ answered, correct, total, passPercent }) {
  return (
    <div className="relative flex-1 pt-7">
      <div
        role="progressbar"
        aria-label={`Đúng ${correct} trên ${total} câu, cần ${passPercent}%`}
        aria-valuemin={0}
        aria-valuemax={total}
        aria-valuenow={correct}
        className="relative h-6 overflow-hidden rounded-pill border-thick border-line bg-surface"
      >
        <span className="absolute inset-y-0 left-0 bg-ink/12 transition-[width] duration-500" style={{ width: `${(answered / total) * 100}%` }} />
        <span
          className={cx('absolute inset-y-0 left-0 bg-accent transition-[width] duration-500', correct > 0 && 'border-r-thick border-line')}
          style={{ width: `${(correct / total) * 100}%` }}
        />
      </div>
      {/* Vạch mốc qua bài */}
      <span className="pointer-events-none absolute bottom-[-6px] top-5 w-[3px] -translate-x-1/2 rounded-pill bg-ink" style={{ left: `${passPercent}%` }} />
      <span
        className="pointer-events-none absolute top-0 -translate-x-1/2 rounded-pill border-2 border-line bg-gold px-2 font-num text-xs leading-5"
        style={{ left: `${passPercent}%` }}
      >
        {passPercent}%
      </span>
    </div>
  )
}

function TestTopBar({ index, total, progress, passPercent, onExit }) {
  return (
    <header className="mx-auto flex w-full max-w-3xl items-end gap-3 px-4 pt-3 md:gap-4 md:px-8 md:pt-5">
      <button
        type="button"
        onClick={onExit}
        aria-label="Thoát bài kiểm tra"
        className="-ml-2 grid size-11 shrink-0 place-items-center rounded-pill text-muted transition-colors hover:bg-raised hover:text-ink"
      >
        <Icon icon={XCircle} size={30} />
      </button>
      <TestProgress answered={progress.answered} correct={progress.correct} total={total} passPercent={passPercent} />
      <div className="flex shrink-0 flex-col items-end gap-1">
        <span className="hud-label hidden sm:inline">
          Câu {Math.min(index + 1, total)}/{total}
        </span>
        <span className="font-num rounded-pill border-thick border-line bg-accent px-3 text-sm leading-7 shadow-hard-sm">
          Đúng {progress.correct}/{total}
        </span>
      </div>
    </header>
  )
}

function TestStep({ session, onFinish, onExit }) {
  const run = useTestRun(session, { onFinish })
  const { question, verdict } = run
  if (!question) return <div className="min-h-dvh bg-bg" aria-busy="true" />

  return (
    <div className="flex min-h-dvh flex-col bg-bg">
      <TestTopBar index={run.index} total={session.total} progress={run.progress} passPercent={session.passPercent} onExit={onExit} />
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-4 pb-36 pt-5 md:px-8 md:pb-40 md:pt-7">
        <span className="hud-label mb-3 truncate">
          {kindLabel(session.lesson)} · {titleOf(session.lesson)}
        </span>
        <div key={verdict ? `${question.id}-v` : question.id} className={cx('flex flex-1 flex-col', verdict && !verdict.correct && 'anim-shake')}>
          <QuestionView
            question={question}
            answer={run.answer}
            onAnswer={run.setAnswer}
            onSubmit={run.submit}
            locked={!!verdict || run.pending}
            onPlayAudio={run.playAudio}
          />
        </div>
      </main>
      <TestActionBar
        verdict={verdict}
        canSubmit={!!run.answer.trim()}
        pending={run.pending}
        onSubmit={run.submit}
        onNext={run.next}
        hint="Phím 1–4 để chọn · Enter để kiểm tra"
      />
    </div>
  )
}

function ResultActions({ children }) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-30 flex flex-col gap-3 border-t-thick border-line bg-surface px-4 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-4 md:static md:flex-row md:justify-center md:border-0 md:bg-transparent md:pb-12 md:pt-2">
      {children}
    </div>
  )
}

function PassResult({ result, lesson = LESSON }) {
  const navigate = useNavigate()
  const reduceMotion = useReducedMotion()

  useEffect(() => {
    if (reduceMotion) return undefined
    const t = setTimeout(() => {
      confetti({ particleCount: 110, spread: 90, startVelocity: 48, origin: { y: 0.35 }, colors: tokenColors(['primary', 'accent', 'danger', 'gold', 'sky']) })
    }, 250)
    return () => clearTimeout(t)
  }, [reduceMotion])

  return (
    <div className="flex min-h-dvh flex-col bg-bg">
      <main className="mx-auto flex w-full max-w-xl flex-1 flex-col items-center justify-center gap-5 px-4 pb-48 pt-10 text-center md:pb-8">
        <span className="hud-label">
          {kindLabel(lesson)} · {titleOf(lesson)}
        </span>
        <h1 className="text-[34px] leading-tight md:text-[44px]">{lesson.kind === 'topic' ? 'Qua chặng rồi!' : 'Qua bài rồi!'}</h1>
        <BigScore value={result.score} color="accent" />
        <p className="font-medium text-muted">
          <span className="font-num text-ink">
            {result.correct}/{result.total}
          </span>{' '}
          câu đúng · Cần {result.passPercent}%
        </p>
        {result.stamps?.length > 0 && (
          <motion.div
            initial={{ scale: 2.2, rotate: -18, opacity: 0 }}
            animate={{ scale: 1, rotate: -6, opacity: 1 }}
            transition={{ delay: 0.5, type: 'spring', stiffness: 260, damping: 14 }}
            className="rounded-[14px] border-[3px] border-danger-deep px-5 py-2 font-display text-xl font-bold uppercase text-danger-deep"
            aria-label={`Đóng dấu hộ chiếu: ${result.stamps[0].landmark_name}`}
          >
            Đã đến · {result.stamps[0].landmark_name}
          </motion.div>
        )}
        {result.unlocked && (
          <div className="mt-2 flex w-full flex-col items-center gap-4">
            <UnlockMap
              fromLabel={lesson.kind === 'topic' ? `Chặng ${lesson.number}` : `Bài ${lesson.number}`}
              toLabel={result.unlocked.kind === 'topic' ? `Chặng ${result.unlocked.number}` : result.unlocked.number ? `Bài ${result.unlocked.number}` : result.unlocked.title}
            />
            <motion.p
              initial={{ y: 12, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 1.3 }}
              className="rounded-pill border-thick border-line bg-surface px-5 py-2 font-heading text-lg font-extrabold shadow-hard-sm md:text-xl"
            >
              Đã mở: {result.unlocked.kind === 'topic' ? `Chặng ${result.unlocked.number}` : result.unlocked.number ? `Bài ${result.unlocked.number}` : ''}
              {result.unlocked.number ? ' · ' : ''}
              {result.unlocked.title}
            </motion.p>
          </div>
        )}
      </main>
      <ResultActions>
        <Button size="lg" iconRight={ArrowRight} className="md:min-w-72" onClick={() => navigate(nextRoute(result.unlocked))}>
          {result.unlocked?.kind === 'topic_test' ? 'Làm bài tổng hợp chặng' : result.unlocked?.kind === 'boss' ? 'Tới Trận Boss' : 'Học bài tiếp'}
        </Button>
        <Button size="lg" variant="secondary" icon={MapTrifold} onClick={() => navigate('/academy')}>
          Về bản đồ
        </Button>
      </ResultActions>
    </div>
  )
}

function WrongWords({ words }) {
  return (
    <section className="flex flex-col gap-3 rounded-panel border-thick border-line bg-surface p-5 shadow-hard md:p-6">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-h3">{words.length} từ bạn đã sai</h2>
        <span className="hud-label">Đáp án đúng</span>
      </div>
      <ul className="flex flex-col divide-y-2 divide-line/10">
        {words.map((w) => (
          <li key={w.word} className="flex items-center gap-3 py-2.5">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-baseline gap-x-2">
                <span className="font-display text-lg font-bold">{w.word}</span>
                <span className="text-caption text-muted">{w.ipa}</span>
              </div>
              <div className="text-caption font-medium">{w.meaning}</div>
            </div>
            <IconButton icon={SpeakerHigh} label={`Nghe phát âm ${w.word}`} variant="sky" size="sm" onClick={() => speak(w.word)} />
          </li>
        ))}
      </ul>
    </section>
  )
}

function FailResult({ result, onReview, lesson = LESSON }) {
  const navigate = useNavigate()
  const reduceMotion = useReducedMotion()

  return (
    <div className="flex min-h-dvh flex-col bg-bg">
      <main className="mx-auto grid w-full max-w-5xl flex-1 items-center gap-8 px-4 pb-48 pt-8 md:grid-cols-[1fr_1.05fr] md:gap-12 md:px-8 md:pb-8 md:pt-12">
        <div className="flex flex-col items-center gap-4 text-center">
          <span className="hud-label">
            {kindLabel(lesson)} · {titleOf(lesson)}
          </span>
          <h1 className="text-[34px] leading-tight md:text-[44px]">Suýt nữa thôi!</h1>
          <BigScore value={result.score} color="danger" />
          <p className="rounded-pill border-thick border-line bg-surface px-4 py-1.5 font-display font-bold uppercase shadow-hard-sm">
            Cần {result.passPercent}% · Thiếu {result.missing} câu nữa
          </p>
          <div className="mt-2 flex items-end gap-3">
            <motion.div
              animate={reduceMotion ? undefined : { y: [0, -10, 0] }}
              transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
            >
              <MascotBlob color="gold" shape="tall" size={112} />
            </motion.div>
            <p className="relative mb-12 max-w-52 rounded-card border-thick border-line bg-surface px-4 py-3 text-left font-semibold shadow-hard-sm">
              Ôn lại {result.wrongWords.length} từ này là qua chắc. Mình tin bạn!
              <span className="absolute -left-2.5 bottom-4 size-4 rotate-45 border-b-thick border-l-thick border-line bg-surface" aria-hidden="true" />
            </p>
          </div>
        </div>
        <WrongWords words={result.wrongWords} />
      </main>
      <ResultActions>
        <Button size="lg" icon={ArrowClockwise} className="md:min-w-80" onClick={onReview}>
          Ôn từ sai rồi làm lại
        </Button>
        <Button size="lg" variant="secondary" icon={MapTrifold} onClick={() => navigate('/academy')}>
          Về bản đồ
        </Button>
      </ResultActions>
    </div>
  )
}

/** Lật thẻ lần lượt các từ đã sai, xong thì làm lại bài kiểm tra. */
function ReviewStep({ words, onRetry, onExit, level = LESSON.level }) {
  const [index, setIndex] = useState(0)
  const entry = words[index].entry ?? ENTRY_BY_WORD[words[index].word]
  const isLast = index === words.length - 1

  return (
    <div className="flex min-h-dvh flex-col bg-bg">
      <LessonTopBar value={index + 1} max={words.length} label="Ôn từ sai" onExit={onExit} />
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-4 pb-36 pt-5 md:px-8 md:pb-40 md:pt-8">
        <motion.div key={entry.word} initial={{ x: 60, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ duration: 0.25 }}>
          <WordCard entry={entry} level={level} />
        </motion.div>
      </main>
      <div className="fixed inset-x-0 bottom-0 z-30 border-t-thick border-line bg-surface px-4 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-4 md:px-8">
        <div className="mx-auto flex max-w-3xl gap-3 md:justify-end">
          <Button variant="secondary" size="lg" icon={SpeakerHigh} className="shrink-0 px-5" onClick={() => speak(entry.word)}>
            <span className="hidden sm:inline">Nghe lại</span>
            <span className="sr-only sm:hidden">Nghe lại</span>
          </Button>
          {isLast ? (
            <Button size="lg" icon={ArrowClockwise} className="flex-1 md:min-w-72 md:flex-none" onClick={onRetry}>
              Làm lại bài kiểm tra
            </Button>
          ) : (
            <Button
              size="lg"
              iconRight={ArrowRight}
              className="flex-1 md:min-w-72 md:flex-none"
              onClick={() => {
                setIndex((i) => i + 1)
                window.scrollTo({ top: 0 })
              }}
            >
              Đã nhớ, tiếp
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}

export default function UnitTest() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const preview = PREVIEW_UNIT[params.get('preview')]
  const [session, setSession] = useState(null)
  const [result, setResult] = useState(preview ?? null)
  const [step, setStep] = useState(preview ? 'result' : 'test')
  const [exitOpen, setExitOpen] = useState(false)
  const [error, setError] = useState(null)
  const unitId = params.get('unit')
  const topicId = params.get('topic')

  const begin = (resumeAt = 0) => {
    setSession(null)
    setStep('test')
    startUnitTest({ resumeAt, unitId, topicId }).then(setSession).catch(setError)
  }

  useEffect(() => {
    if (!preview) begin(Number(params.get('q')) || 0)
    // Chỉ bắt đầu một lần khi vào trang
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const finish = async () => {
    setResult(await finishUnitTest())
    setStep('result')
    window.scrollTo({ top: 0 })
  }

  const lesson = session?.lesson ?? LESSON
  let screen
  if (error) screen = <AcademyError error={error} onBack={() => navigate('/academy')} />
  else if (step === 'result' && result)
    screen = result.passed ? (
      <PassResult result={result} lesson={lesson} />
    ) : (
      <FailResult
        result={result}
        lesson={lesson}
        onReview={() => {
          setStep('review')
          window.scrollTo({ top: 0 })
        }}
      />
    )
  else if (step === 'review' && result) screen = <ReviewStep words={result.wrongWords} level={lesson.level} onRetry={() => begin()} onExit={() => setExitOpen(true)} />
  else if (session) screen = <TestStep session={session} onFinish={finish} onExit={() => setExitOpen(true)} />
  else screen = <div className="min-h-dvh bg-bg" aria-busy="true" />

  return (
    <>
      {screen}
      {step === 'result' && <RewardsLayer rewards={result?.rewards} />}
      <Modal
        open={exitOpen}
        onClose={() => setExitOpen(false)}
        title={step === 'review' ? 'Dừng ôn từ sai?' : 'Thoát bài kiểm tra?'}
        footer={
          <>
            <Button variant="secondary" onClick={() => navigate('/academy')}>
              Thoát
            </Button>
            <Button onClick={() => setExitOpen(false)}>Làm tiếp</Button>
          </>
        }
      >
        {step === 'review'
          ? 'Bạn có thể quay lại làm bài kiểm tra bất cứ lúc nào từ bản đồ.'
          : 'Bài làm dở sẽ không được lưu. Lần sau bạn sẽ làm lại từ câu đầu tiên.'}
      </Modal>
    </>
  )
}
