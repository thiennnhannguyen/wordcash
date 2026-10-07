/*
 * Thẻ mục từ: phát âm, nghĩa, ví dụ, hình.
 *
 * `emphasis` đổi phần được đẩy lên nổi bật theo chế độ học: "word" (mặc định), "phrase" (cụm đi kèm),
 * "family" (họ từ). Từ đang học trong câu ví dụ được tô nền xanh chanh.
 * Mục là cụm từ cố định (`pos = "phrase"`): danh sách `collocations` là các CỤM LIÊN QUAN (biến thể, câu đáp lại), nên nhãn
 * đổi thành "Cụm liên quan". `entry.variantNote` (ghi chú biến thể Anh-Mỹ, vd. "Mỹ thường dùng: fall") hiện ngay dưới nghĩa.
 * Dùng chung cho Học Viện và "Khóa học của tôi": cấp độ, loại từ, định nghĩa, ví dụ đều có thể trống (từ tự tạo).
 * `tag`: nhãn phụ cạnh cấp độ (vd. "Tự tạo"); `actions`: hàng nút cuối thẻ (vd. "+ Thêm vào khóa học của tôi").
 */

import { Image, SpeakerHigh } from '@phosphor-icons/react'
import Icon from '../ui/Icon'
import LevelTag from '../ui/LevelTag'
import cx from '../../utils/cx'
import { speak } from '../../utils/speech'

// Tô từ đang học trong câu (bắt cả dạng biến đổi: apply → applied, strength → strengths)
function HighlightedExample({ sentence, word }) {
  const stem = word.replace(/(e|y)$/, '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const parts = sentence.split(new RegExp(`(\\b${stem}\\w*)`, 'i'))
  return (
    <p className="text-lg font-medium md:text-xl">
      {parts.map((part, i) =>
        i % 2 === 1 ? (
          <mark key={i} className="rounded-[6px] bg-accent px-1 font-bold text-ink">
            {part}
          </mark>
        ) : (
          part
        ),
      )}
    </p>
  )
}

function Collocations({ items, big, phrase }) {
  if (!items.length) return null
  return (
    <div className="flex flex-col gap-2">
      <span className="hud-label">{phrase ? 'Cụm liên quan' : 'Cụm đi kèm'}</span>
      <div className="flex flex-wrap gap-2">
        {items.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => speak(c)}
            className={cx(
              'rounded-pill border-thick border-line bg-raised font-semibold shadow-hard-sm transition-colors hover:bg-sky',
              big ? 'px-4 py-2 text-lg' : 'px-3 py-1.5',
            )}
          >
            {c}
          </button>
        ))}
      </div>
    </div>
  )
}

function Family({ word, items, big }) {
  if (!items.length) return null
  const chain = [word, ...items]
  return (
    <div className="flex flex-col gap-2">
      <span className="hud-label">Họ từ</span>
      <p className={cx('flex flex-wrap items-center gap-x-2 gap-y-1 font-display font-bold', big ? 'text-2xl' : 'text-lg')}>
        {chain.map((w, i) => (
          <span key={w} className="inline-flex items-center gap-2">
            {i > 0 && <span className="text-muted">·</span>}
            <span className={cx(w === word && 'text-primary')}>{w}</span>
          </span>
        ))}
      </p>
    </div>
  )
}

// Cỡ chữ tự co theo độ dài từ để không bị ngắt giữa từ trên mobile
function wordSizeClass(word) {
  if (word.length > 10) return 'text-[28px] sm:text-[44px] md:text-[60px]'
  if (word.length > 7) return 'text-[36px] sm:text-[52px] md:text-[72px]'
  return 'text-[44px] sm:text-[56px] md:text-[72px]'
}

export default function WordCard({ entry, level, emphasis = 'word', tag, actions, className }) {
  const phrase = entry.pos === 'phrase'
  const extras =
    emphasis === 'family'
      ? [<Family key="f" word={entry.word} items={entry.family ?? []} big />, <Collocations key="c" items={entry.collocations ?? []} phrase={phrase} />]
      : [<Collocations key="c" items={entry.collocations ?? []} big={emphasis === 'phrase'} phrase={phrase} />, <Family key="f" word={entry.word} items={entry.family ?? []} />]

  return (
    <article className={cx('flex flex-col gap-6 rounded-panel border-thick border-line bg-surface p-5 shadow-hard-lg md:p-8', className)}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 flex-col gap-3">
          <div className="flex flex-wrap items-center gap-2">
            {level && <LevelTag level={level} size="sm" />}
            {tag}
            {entry.pos && (
              <span className="rounded-pill border-2 border-line bg-raised px-2.5 font-display text-xs font-bold uppercase leading-6">
                {entry.pos}
              </span>
            )}
          </div>
          <h1 className={cx('break-words font-display font-bold uppercase leading-none tracking-wide', wordSizeClass(entry.word))}>
            {entry.word}
          </h1>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => speak(entry.word)}
              aria-label={`Nghe phát âm ${entry.word}`}
              className="pressable grid size-16 shrink-0 place-items-center rounded-pill border-thick border-line bg-sky shadow-hard hover:-translate-y-0.5 md:size-18"
            >
              <Icon icon={SpeakerHigh} size={32} color="ink" />
            </button>
            <span className="text-lg text-muted md:text-xl">{entry.ipa}</span>
          </div>
        </div>
        {/* Ô hình minh họa (placeholder) */}
        <div
          className="grid size-16 shrink-0 place-items-center rounded-[16px] border-thick border-dashed border-line/50 bg-raised text-muted sm:size-24 md:size-44 md:rounded-card"
          aria-label="Hình minh họa (sẽ bổ sung)"
          role="img"
        >
          <div className="flex flex-col items-center gap-1">
            <Icon icon={Image} size={32} />
            <span className="hidden text-caption md:block">Hình minh họa</span>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <p className="self-start rounded-[12px] bg-gold px-3 py-1 font-heading text-[30px] font-black leading-tight tracking-tight md:text-[36px]">
          {entry.meaning}
        </p>
        {entry.variantNote && <p className="text-[14px] font-semibold text-muted">{entry.variantNote}</p>}
        {entry.definition && <p className="text-muted">{entry.definition}</p>}
      </div>

      {entry.example && (
        <div className="flex flex-col gap-2 rounded-card border-thick border-line bg-bg p-4">
          <span className="hud-label">Ví dụ</span>
          <HighlightedExample sentence={entry.example} word={entry.word} />
        </div>
      )}

      {extras}
      {actions && <div className="flex flex-wrap items-center gap-3 border-t-2 border-line/15 pt-4">{actions}</div>}
    </article>
  )
}
