/*
 * Giới thiệu & nguồn dữ liệu (/about, trong app, mở từ menu tài khoản và chân trang PageShell).
 *
 * Ghi công đầy đủ các nguồn dữ liệu (DATA_SOURCES trong utils/constants.js, khớp docs/data-sources.md) và cách nội dung
 * được soạn: nghĩa, câu ví dụ do WORDCLASH tự soạn (bản nháp có hỗ trợ AI) và người duyệt kiểm tra trước khi đưa vào học.
 */

import { ArrowSquareOut, BookOpenText, Info, SpeakerHigh } from '@phosphor-icons/react'
import Card from '../../components/ui/Card'
import Icon, { IconBadge } from '../../components/ui/Icon'
import { DATA_SOURCES } from '../../utils/constants'

const ICONS = { cefrj: BookOpenText, cmudict: SpeakerHigh }

export default function About() {
  return (
    <div className="flex flex-col gap-6">
      <header className="flex items-center gap-3">
        <IconBadge icon={Info} bg="sky" />
        <div>
          <h1 className="font-heading text-h2 font-black text-ink">Giới thiệu</h1>
          <p className="text-muted">WORDCLASH và các nguồn dữ liệu dùng trong ứng dụng.</p>
        </div>
      </header>

      <Card className="flex flex-col gap-3">
        <h2 className="font-heading text-h3 font-extrabold text-ink">Nội dung bài học</h2>
        <p className="text-ink">
          Nghĩa tiếng Việt, định nghĩa và câu ví dụ do WORDCLASH tự soạn: bản nháp có hỗ trợ AI, mỗi mục được người duyệt kiểm tra
          trước khi đưa vào học. Chúng tôi không sao chép định nghĩa hay câu ví dụ từ từ điển có bản quyền.
        </p>
      </Card>

      <section aria-labelledby="sources" className="flex flex-col gap-3">
        <h2 id="sources" className="font-heading text-h3 font-extrabold text-ink">Nguồn dữ liệu</h2>
        <ul className="grid gap-4 md:grid-cols-2">
          {DATA_SOURCES.map((s) => (
            <li key={s.key}>
              <Card className="flex h-full flex-col gap-2">
                <div className="flex items-center gap-3">
                  <IconBadge icon={ICONS[s.key] ?? BookOpenText} bg="gold" size="sm" />
                  <h3 className="font-heading text-[18px] font-extrabold text-ink">{s.name}</h3>
                </div>
                <p className="text-caption text-muted">© {s.owner}</p>
                <p className="text-ink">{s.use}</p>
                <p className="text-caption text-muted">{s.license}</p>
                <a
                  href={s.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-auto inline-flex min-h-11 items-center gap-1.5 self-start font-semibold text-primary hover:underline"
                >
                  Trang nguồn <Icon icon={ArrowSquareOut} size={18} color="current" />
                </a>
              </Card>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
