/*
 * Giả lập server "Khóa học của tôi" khi VITE_USE_MOCK bật (mặc định) hoặc backend chưa chạy.
 * Trả đúng cấu trúc JSON của API thật (docs/courses.md) và ném lỗi dạng {code, message, details, status}.
 *
 * Giữ luật "server là trọng tài": đáp án của phiên học chỉ nằm trong biến SESSIONS của module này; câu hỏi trả cho
 * component không kèm đáp án; chấm, cập nhật trạng thái từ đều làm ở đây. Dữ liệu sống trong bộ nhớ, tải lại trang là về
 * dữ liệu mẫu ban đầu (data/mockCourses.js).
 */

import { BANK, COURSES, CUSTOM, PROGRESS } from '../data/mockCourses'

const LATENCY_MS = 220
const DAY = 24 * 3600 * 1000
const LIMITS = { courses: 50, archived_courses: 100, words_per_course: 500, import_rows: 200, custom_entries: 1000 }
const DAILY_NEW_LIMIT = 20
const OPTION_COUNT = 4
const BLANK = '______'

const wait = (ms = LATENCY_MS) => new Promise((resolve) => setTimeout(resolve, ms))
const clone = (value) => JSON.parse(JSON.stringify(value))
const key = (text) => text.trim().replace(/\s+/g, ' ').toLowerCase()
const nowIso = () => new Date().toISOString()

function fail(code, message, details = null, status = 400) {
  throw { code, message, details, status }
}

// ---------- Trạng thái "server" ----------

const db = {
  entries: new Map([...BANK, ...CUSTOM].map((e) => [e.id, clone(e)])),
  courses: COURSES.map((c) => ({
    id: c.id,
    title: c.title,
    description: c.description,
    icon: c.icon,
    color: c.color,
    visibility: 'private',
    created_at: c.created_at,
    updated_at: c.created_at,
    archived_at: c.archived_at ?? null,
    entries: clone(c.entries),
  })),
  progress: clone(PROGRESS),
  newToday: 0,
  nextEntryId: 5000,
  logs: [], // {entry_id, correct, at}
}
const SESSIONS = new Map()

function findCourse(id) {
  const course = db.courses.find((c) => c.id === id)
  if (!course) fail('COURSE_NOT_FOUND', 'Không tìm thấy khóa học.', null, 404)
  return course
}

function progressOf(entryId) {
  return db.progress[entryId] ?? { status: 'new', due_at: null, wrong_count: 0, correct_count: 0, strong_days: 0 }
}

const isDue = (p) => p.due_at && new Date(p.due_at).getTime() <= Date.now()

function courseOut(course) {
  const { entries, ...rest } = course
  return { ...rest, word_count: entries.length }
}

function entryRow(link) {
  const e = db.entries.get(link.entry_id)
  const p = progressOf(e.id)
  return {
    entry_id: e.id,
    headword: e.headword,
    meaning_vi: e.meaning_vi,
    pos: e.pos,
    ipa: e.ipa,
    audio_url: e.audio_url,
    example: e.example,
    image_url: e.image_url,
    cefr: e.cefr,
    source: e.source,
    personal_note: link.personal_note,
    is_starred: link.is_starred,
    position: link.position,
    added_at: link.added_at,
    progress: { status: p.status, due_at: p.due_at },
  }
}

function brief(e) {
  return { id: e.id, headword: e.headword, meaning_vi: e.meaning_vi, pos: e.pos, ipa: e.ipa, cefr: e.cefr, example: e.example, audio_url: e.audio_url, source: e.source }
}

function stats(course) {
  const by = { new: 0, learning: 0, mastered: 0, forgotten: 0 }
  let due = 0
  let hard = 0
  for (const link of course.entries) {
    const p = progressOf(link.entry_id)
    by[p.status] += 1
    if (isDue(p)) due += 1
    if (link.is_starred || p.wrong_count > 0) hard += 1
  }
  const ids = new Set(course.entries.map((l) => l.entry_id))
  const since = Date.now() - 7 * DAY
  const logs = db.logs.filter((l) => ids.has(l.entry_id) && l.at >= since)
  // Dữ liệu mẫu chưa có nhật ký: lấy độ chính xác từ số lần đúng/sai đã có
  let answered = logs.length
  let correct = logs.filter((l) => l.correct).length
  if (!answered) {
    for (const link of course.entries) {
      const p = progressOf(link.entry_id)
      answered += p.correct_count + p.wrong_count
      correct += p.correct_count
    }
  }
  const left = Math.max(DAILY_NEW_LIMIT - db.newToday, 0)
  const total = course.entries.length
  return {
    word_count: total,
    by_status: by,
    due_count: due,
    accuracy_7d: answered ? Math.round((correct / answered) * 1000) / 1000 : null,
    answers_7d: answered,
    new_words_left_today: left,
    modes: { learn: Math.min(by.new, left), review: due, quick: total, hard, test: total },
  }
}

function visibleBank() {
  return [...db.entries.values()].filter((e) => e.source === 'system')
}

function ownCustom() {
  return [...db.entries.values()].filter((e) => e.source === 'user')
}

// ---------- Khóa học ----------

// Tối đa 50 khóa đang học và 100 khóa đã lưu trữ (đếm riêng)
function ensureRoom(archived) {
  const limit = archived ? LIMITS.archived_courses : LIMITS.courses
  const count = db.courses.filter((c) => Boolean(c.archived_at) === archived).length
  if (count >= limit) {
    const message = archived ? `Bạn đã lưu trữ tối đa ${limit} khóa học. Xóa bớt một khóa đã lưu trữ nhé.` : `Bạn đang học tối đa ${limit} khóa học. Lưu trữ hoặc xóa bớt một khóa nhé.`
    fail('COURSE_LIMIT_REACHED', message, { limit, scope: archived ? 'archived' : 'active' }, 409)
  }
}

export async function listCourses({ archived = false } = {}) {
  await wait()
  const items = db.courses
    .filter((c) => (archived ? c.archived_at : !c.archived_at))
    .sort((a, b) => (a.updated_at < b.updated_at ? 1 : -1))
    .map((c) => {
      const s = stats(c)
      return { ...courseOut(c), mastered_count: s.by_status.mastered, due_count: s.due_count }
    })
  const masteredIds = new Set()
  for (const c of db.courses.filter((x) => !x.archived_at)) {
    for (const l of c.entries) if (progressOf(l.entry_id).status === 'mastered') masteredIds.add(l.entry_id)
  }
  const customMastered = ownCustom().filter((e) => progressOf(e.id).status === 'mastered').length
  return { items, mastered_total: masteredIds.size, custom_mastered_count: customMastered, limits: LIMITS }
}

export async function createCourse(data) {
  await wait()
  ensureRoom(false)
  const title = (data.title ?? '').trim()
  if (!title) fail('VALIDATION_ERROR', 'Dữ liệu chưa hợp lệ, bạn kiểm tra lại nhé.', [{ field: 'title', message: 'Cần ít nhất 1 ký tự' }], 422)
  const course = {
    id: `c-${Date.now().toString(36)}`,
    title,
    description: data.description?.trim() || null,
    icon: data.icon ?? 'book-open',
    color: data.color ?? 'primary',
    visibility: 'private',
    created_at: nowIso(),
    updated_at: nowIso(),
    archived_at: null,
    entries: [],
  }
  db.courses.push(course)
  return courseOut(course)
}

export async function getCourse(id) {
  await wait()
  const course = findCourse(id)
  return { ...courseOut(course), stats: stats(course) }
}

export async function updateCourse(id, data) {
  await wait()
  const course = findCourse(id)
  for (const field of ['title', 'description', 'icon', 'color']) {
    if (field in data) course[field] = field === 'description' ? data[field]?.trim() || null : data[field]
  }
  course.updated_at = nowIso()
  return courseOut(course)
}

export async function setArchived(id, archived) {
  await wait()
  const course = findCourse(id)
  if (archived === Boolean(course.archived_at)) return courseOut(course)
  ensureRoom(archived)
  course.archived_at = archived ? nowIso() : null
  return courseOut(course)
}

export async function deleteCourse(id) {
  await wait()
  findCourse(id)
  db.courses = db.courses.filter((c) => c.id !== id)
}

export async function getStats(id) {
  await wait()
  return stats(findCourse(id))
}

// ---------- Mục từ ----------

export async function listEntries(id, { q = '', filter = 'all', sort = 'added', page = 1, pageSize = 50 } = {}) {
  await wait(150)
  const course = findCourse(id)
  let rows = course.entries.map(entryRow)
  const needle = q.trim().toLowerCase()
  if (needle) rows = rows.filter((r) => r.headword.toLowerCase().includes(needle) || r.meaning_vi.toLowerCase().includes(needle))
  if (filter === 'starred') rows = rows.filter((r) => r.is_starred)
  else if (filter === 'due') rows = rows.filter((r) => isDue(r.progress))
  else if (filter !== 'all') rows = rows.filter((r) => r.progress.status === filter)
  const sorters = {
    alpha: (a, b) => a.headword.localeCompare(b.headword),
    due: (a, b) => (a.progress.due_at ?? '9999').localeCompare(b.progress.due_at ?? '9999'),
    added: (a, b) => (a.added_at < b.added_at ? 1 : -1),
  }
  rows.sort(sorters[sort])
  return { items: rows.slice((page - 1) * pageSize, page * pageSize), total: rows.length, page, page_size: pageSize }
}

function link(course, entry, note = null) {
  if (course.entries.length >= LIMITS.words_per_course) {
    fail('WORD_LIMIT_REACHED', `Mỗi khóa học có tối đa ${LIMITS.words_per_course} từ.`, { limit: LIMITS.words_per_course, scope: 'course' }, 409)
  }
  const position = Math.max(0, ...course.entries.map((l) => l.position)) + 1
  const row = { entry_id: entry.id, position, personal_note: note, is_starred: false, added_at: nowIso() }
  course.entries.push(row)
  course.updated_at = nowIso()
  return row
}

export async function addFromBank(id, entryId, personalNote = null) {
  await wait()
  const course = findCourse(id)
  const entry = db.entries.get(entryId)
  if (!entry) fail('ENTRY_NOT_FOUND', 'Không tìm thấy mục từ.', null, 404)
  if (course.entries.some((l) => l.entry_id === entryId)) fail('DUPLICATE_IN_COURSE', 'Từ này đã có trong khóa học.', null, 409)
  return entryRow(link(course, entry, personalNote))
}

function systemMatches(headword) {
  return visibleBank().filter((e) => key(e.headword) === key(headword))
}

export async function createCustom(id, data) {
  await wait()
  const course = findCourse(id)
  const headword = data.headword.trim().replace(/\s+/g, ' ')
  const own = ownCustom().find((e) => key(e.headword) === key(headword))
  if (own) {
    if (course.entries.some((l) => l.entry_id === own.id)) fail('DUPLICATE_IN_COURSE', 'Từ này đã có trong khóa học.', null, 409)
    fail('CUSTOM_ENTRY_EXISTS', 'Bạn đã tự tạo từ này rồi.', { entry: brief(own) }, 409)
  }
  if (!data.force) {
    const matches = systemMatches(headword)
    if (matches.length) {
      if (matches.some((m) => course.entries.some((l) => l.entry_id === m.id))) fail('DUPLICATE_IN_COURSE', 'Từ này đã có trong khóa học.', null, 409)
      fail('SYSTEM_ENTRY_EXISTS', 'Từ này đã có trong kho WORDCLASH, kèm đủ phát âm và ví dụ. Dùng bản trong kho nhé?', { suggestions: matches.map(brief) }, 409)
    }
  }
  const entry = {
    id: db.nextEntryId++,
    headword,
    meaning_vi: data.meaning_vi.trim(),
    pos: data.pos || null,
    ipa: data.ipa || null,
    example: data.example || null,
    image_url: data.image_url || null,
    cefr: null,
    source: 'user',
    audio_url: null,
    collocations: [],
    word_family: [],
    entry_type: 'word',
  }
  db.entries.set(entry.id, entry)
  return entryRow(link(course, entry, data.note || null))
}

export async function updateEntry(id, entryId, changes) {
  await wait()
  const course = findCourse(id)
  const row = course.entries.find((l) => l.entry_id === entryId)
  if (!row) fail('ENTRY_NOT_FOUND', 'Không tìm thấy mục từ.', null, 404)
  const entry = db.entries.get(entryId)
  const content = ['headword', 'meaning_vi', 'pos', 'ipa', 'example', 'image_url'].filter((f) => f in changes)
  if (content.length && entry.source !== 'user') fail('ENTRY_NOT_OWNED', 'Bạn chỉ sửa được từ do chính mình tạo.', null, 403)
  for (const f of content) entry[f] = changes[f] === '' ? null : changes[f]
  if ('personal_note' in changes) row.personal_note = changes.personal_note || null
  if ('is_starred' in changes) row.is_starred = changes.is_starred
  return entryRow(row)
}

export async function removeEntry(id, entryId) {
  await wait()
  const course = findCourse(id)
  course.entries = course.entries.filter((l) => l.entry_id !== entryId)
}

export async function deleteCustom(entryId) {
  await wait()
  const entry = db.entries.get(entryId)
  if (!entry) fail('ENTRY_NOT_FOUND', 'Không tìm thấy mục từ.', null, 404)
  if (entry.source !== 'user') fail('ENTRY_NOT_OWNED', 'Bạn chỉ sửa được từ do chính mình tạo.', null, 403)
  db.entries.delete(entryId)
  delete db.progress[entryId]
  for (const c of db.courses) c.entries = c.entries.filter((l) => l.entry_id !== entryId)
}

export async function bankSearch(q, courseId) {
  await wait(120)
  const needle = key(q)
  if (!needle) return []
  const course = courseId ? findCourse(courseId) : null
  return visibleBank()
    .filter((e) => e.headword.toLowerCase().startsWith(needle))
    .sort((a, b) => (key(a.headword) === needle ? -1 : 0) - (key(b.headword) === needle ? -1 : 0) || a.headword.length - b.headword.length)
    .slice(0, 10)
    .map((e) => ({
      id: e.id,
      headword: e.headword,
      cefr: e.cefr,
      pos: e.pos,
      ipa: e.ipa,
      meaning_vi: e.meaning_vi,
      entry_type: e.entry_type,
      in_course: course ? course.entries.some((l) => l.entry_id === e.id) : null,
    }))
}

// ---------- Nhập hàng loạt ----------

function splitLine(line) {
  if (line.includes('\t')) {
    const i = line.indexOf('\t')
    return [line.slice(0, i), line.slice(i + 1)]
  }
  for (const re of [/\s+[-–—]\s+/, /:/, /[-–—]/]) {
    const m = line.match(re)
    if (m) return [line.slice(0, m.index), line.slice(m.index + m[0].length)]
  }
  return null
}

const clean = (s) => (s ?? '').replace(/\s+/g, ' ').trim()

function validate(row) {
  if (!row.headword) row.error = 'Thiếu từ'
  else if (!row.meaning) row.error = 'Thiếu nghĩa'
  else if (row.headword.length > 100) row.error = 'Từ dài quá 100 ký tự'
  else if (row.meaning.length > 300) row.error = 'Nghĩa dài quá 300 ký tự'
  return row
}

function parseCsvLine(line) {
  const cells = []
  let cur = ''
  let quoted = false
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i]
    if (quoted) {
      if (ch === '"' && line[i + 1] === '"') {
        cur += '"'
        i += 1
      } else if (ch === '"') quoted = false
      else cur += ch
    } else if (ch === '"') quoted = true
    else if (ch === ',') {
      cells.push(cur)
      cur = ''
    } else cur += ch
  }
  cells.push(cur)
  return cells
}

function parse(text, format) {
  const lines = text.replace(/^﻿/, '').split(/\r?\n/)
  const rows = []
  if (format === 'csv') {
    let header = null
    lines.forEach((raw, i) => {
      if (!raw.trim()) return
      const cells = parseCsvLine(raw)
      if (!header) {
        header = cells.map((c) => c.trim().toLowerCase())
        if (!header.includes('word') || !header.includes('meaning')) fail('IMPORT_INVALID', 'File CSV cần dòng tiêu đề có cột word và meaning.', null, 422)
        return
      }
      const get = (name) => clean(cells[header.indexOf(name)])
      rows.push(validate({ line: i + 1, headword: get('word'), meaning: get('meaning'), example: get('example') || null, note: get('note') || null, error: null }))
    })
    if (!header) fail('IMPORT_INVALID', 'File CSV đang trống.', null, 422)
    return rows
  }
  lines.forEach((raw, i) => {
    const line = raw.trim()
    if (!line || line.startsWith('#')) return
    const parts = splitLine(line)
    if (!parts) rows.push({ line: i + 1, headword: clean(line), meaning: '', example: null, note: null, error: 'Không tìm thấy dấu ngăn cách giữa từ và nghĩa' })
    else rows.push(validate({ line: i + 1, headword: clean(parts[0]), meaning: clean(parts[1]), example: null, note: null, error: null }))
  })
  return rows
}

function classify(course, text, format) {
  const parsed = parse(text, format)
  if (!parsed.length) fail('IMPORT_INVALID', 'Chưa có dòng nào để nhập.', null, 422)
  if (parsed.length > LIMITS.import_rows) {
    fail('IMPORT_INVALID', `Mỗi lần nhập tối đa ${LIMITS.import_rows} dòng (bạn đang có ${parsed.length} dòng).`, { limit: LIMITS.import_rows, rows: parsed.length }, 422)
  }
  const inCourse = new Set(course.entries.map((l) => key(db.entries.get(l.entry_id).headword)))
  const seen = new Map()
  let room = LIMITS.words_per_course - course.entries.length
  return parsed.map((r) => {
    const row = { line: r.line, headword: r.headword, meaning: r.meaning, example: r.example, note: r.note, status: 'invalid', reason: r.error, entry_id: null, cefr: null, system_meaning: null }
    if (r.error) return row
    const k = key(r.headword)
    if (seen.has(k)) return { ...row, status: 'duplicate_in_course', reason: `Lặp lại dòng ${seen.get(k)}` }
    seen.set(k, r.line)
    if (inCourse.has(k)) return { ...row, status: 'duplicate_in_course', reason: 'Đã có trong khóa học' }
    if (room <= 0) return { ...row, reason: `Khóa học đã đủ ${LIMITS.words_per_course} từ` }
    room -= 1
    const own = ownCustom().find((e) => key(e.headword) === k)
    if (own) return { ...row, status: 'match_own', reason: null, entry_id: own.id }
    const sys = systemMatches(r.headword)[0]
    if (sys) return { ...row, status: 'match_system', reason: null, entry_id: sys.id, cefr: sys.cefr, system_meaning: sys.meaning_vi }
    return { ...row, status: 'new_custom', reason: null }
  })
}

const ADDABLE = ['new_custom', 'match_system', 'match_own']

export async function importPreview(id, { text, format }) {
  await wait(350)
  const rows = classify(findCourse(id), text, format)
  const counts = Object.fromEntries([...ADDABLE, 'duplicate_in_course', 'invalid'].map((s) => [s, rows.filter((r) => r.status === s).length]))
  return { rows, counts, to_add: ADDABLE.reduce((n, s) => n + counts[s], 0) }
}

export async function importCommit(id, { text, format, skip_lines: skipLines = [] }) {
  await wait(400)
  const course = findCourse(id)
  const rows = classify(course, text, format)
  const skip = new Set(skipLines)
  let created = 0
  let linked = 0
  for (const row of rows) {
    if (!ADDABLE.includes(row.status) || skip.has(row.line)) continue
    let entry
    if (row.status === 'new_custom') {
      entry = { id: db.nextEntryId++, headword: row.headword, meaning_vi: row.meaning, example: row.example, pos: null, ipa: null, cefr: null, source: 'user', audio_url: null, image_url: null, collocations: [], word_family: [], entry_type: 'word' }
      db.entries.set(entry.id, entry)
      created += 1
    } else {
      entry = db.entries.get(row.entry_id)
      linked += 1
    }
    link(course, entry, row.note)
  }
  return { added: created + linked, created_custom: created, linked, skipped: rows.length - created - linked, course: courseOut(course) }
}

// ---------- Phiên học ----------

function shuffle(list) {
  const a = [...list]
  for (let i = a.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function blankSentence(example, headword) {
  if (!example) return null
  const re = new RegExp(`(?<![\\w'-])${headword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?![\\w'-])`, 'i')
  return re.test(example) ? example.replace(re, BLANK) : null
}

function levelsOf(e) {
  return [1, ...(e.audio_url ? [2] : []), 3, ...(blankSentence(e.example, e.headword) ? [4] : [])]
}

function buildQuestion(qid, e, level, pool) {
  const others = pool.filter((o) => o.id !== e.id)
  const samePos = others.filter((o) => e.pos && o.pos === e.pos)
  const source = samePos.length >= OPTION_COUNT - 1 ? samePos : others
  if (level === 2 && !e.audio_url) level = 1
  if (level === 4 && !blankSentence(e.example, e.headword)) level = 3
  if (level !== 3) {
    const correct = level === 1 ? e.meaning_vi : e.headword
    const seen = new Set([key(correct)])
    const distractors = []
    for (const o of shuffle(source)) {
      const v = level === 1 ? o.meaning_vi : o.headword
      if (!seen.has(key(v))) {
        seen.add(key(v))
        distractors.push(v)
      }
      if (distractors.length === OPTION_COUNT - 1) break
    }
    if (distractors.length) {
      const options = shuffle([correct, ...distractors])
      const pub = { id: qid, level, type: { 1: 'choose_meaning', 2: 'listen', 4: 'fill_blank' }[level], options }
      if (level === 1) Object.assign(pub, { word: e.headword, ipa: e.ipa, pos: e.pos })
      if (level === 2) pub.audio_url = e.audio_url
      if (level === 4) pub.sentence = blankSentence(e.example, e.headword)
      return { pub, answer: { entry_id: e.id, level, answer: correct } }
    }
  }
  return {
    pub: { id: qid, level: 3, type: 'type_word', prompt: e.meaning_vi, pos: e.pos, letter_count: e.headword.replace(/ /g, '').length },
    answer: { entry_id: e.id, level: 3, answer: e.headword },
  }
}

const pick = (list) => list[Math.floor(Math.random() * list.length)]

export async function startSession(id, { mode, limit = 10, entry_ids: entryIds = null }) {
  await wait(300)
  const course = findCourse(id)
  let links = [...course.entries].sort((a, b) => a.position - b.position)
  if (entryIds) links = links.filter((l) => entryIds.includes(l.entry_id))
  const rows = links.map((l) => ({ link: l, entry: db.entries.get(l.entry_id), p: progressOf(l.entry_id) }))
  let chosen = rows
  let reason = 'empty'
  if (mode === 'learn') {
    const left = Math.max(DAILY_NEW_LIMIT - db.newToday, 0)
    const fresh = rows.filter((r) => r.p.status === 'new')
    chosen = fresh.slice(0, Math.min(limit, left))
    if (!chosen.length && fresh.length && left === 0) reason = 'daily_limit'
  } else if (mode === 'review') {
    chosen = rows.filter((r) => isDue(r.p)).sort((a, b) => a.p.due_at.localeCompare(b.p.due_at)).slice(0, limit)
  } else if (mode === 'hard') {
    chosen = rows
      .filter((r) => r.link.is_starred || r.p.wrong_count > 0)
      .sort((a, b) => Number(b.link.is_starred) - Number(a.link.is_starred) || b.p.wrong_count - b.p.correct_count - (a.p.wrong_count - a.p.correct_count))
      .slice(0, limit)
  }
  if (!chosen.length) fail('NOTHING_TO_STUDY', 'Không có từ nào phù hợp với chế độ học này.', { mode, reason }, 409)

  let pairs = []
  if (mode === 'quick' || mode === 'test') {
    const firsts = []
    const seconds = []
    const used = new Set()
    for (const [r, lvl] of shuffle(chosen.flatMap((r) => levelsOf(r.entry).map((lvl) => [r, lvl])))) {
      ;(used.has(r.entry.id) ? seconds : firsts).push([r, lvl])
      used.add(r.entry.id)
    }
    pairs = [...firsts, ...seconds].slice(0, 20)
  } else {
    for (const r of chosen) {
      const strong = levelsOf(r.entry).filter((l) => l >= 3)
      const weak = levelsOf(r.entry).filter((l) => l <= 2)
      if (mode === 'learn') pairs.push([r, 1], [r, pick(strong)])
      else if (mode === 'hard') pairs.push([r, pick(strong)])
      else pairs.push([r, pick(r.p.correct_count < 2 ? weak : strong)])
    }
    pairs = mode === 'learn' ? [...pairs.filter((p) => p[1] === 1), ...shuffle(pairs.filter((p) => p[1] !== 1))] : shuffle(pairs)
  }

  let pool = course.entries.map((l) => db.entries.get(l.entry_id))
  if (pool.length < OPTION_COUNT) pool = [...pool, ...shuffle(visibleBank().filter((e) => !pool.includes(e))).slice(0, OPTION_COUNT * 2)]

  const built = pairs.map(([r, lvl], i) => buildQuestion(`q${i + 1}`, r.entry, lvl, pool))
  const sessionId = `s-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`
  SESSIONS.set(sessionId, { mode, courseId: id, keys: Object.fromEntries(built.map((b) => [b.pub.id, b.answer])), answers: {} })
  return {
    id: sessionId,
    mode,
    course: { id: course.id, title: course.title, icon: course.icon, color: course.color },
    cards:
      mode === 'learn'
        ? chosen.map(({ link: l, entry: e }) => ({
            entry_id: e.id,
            headword: e.headword,
            meaning_vi: e.meaning_vi,
            pos: e.pos,
            ipa: e.ipa,
            audio_url: e.audio_url,
            example: e.example,
            image_url: e.image_url,
            cefr: e.cefr,
            source: e.source,
            collocations: e.collocations,
            word_family: e.word_family,
            personal_note: l.personal_note,
          }))
        : [],
    questions: built.map((b) => b.pub),
    total: built.length,
    expires_at: new Date(Date.now() + DAY).toISOString(),
  }
}

// Cập nhật tiến độ (rút gọn của services/srs.py + mastery.py)
function record(entryId, level, correct) {
  const p = { ...progressOf(entryId) }
  if (p.status === 'new') db.newToday += 1
  if (p.status === 'new' || p.status === 'forgotten') p.status = 'learning'
  let became = false
  if (correct) {
    p.correct_count += 1
    if (level >= 3) p.strong_days = Math.min((p.strong_days ?? 0) + (p.strongToday ? 0 : 1), 3)
    p.strongToday = p.strongToday || level >= 3
    if (!p.due_at || isDue(p)) p.due_at = new Date(Date.now() + [1, 3, 7, 16, 35][Math.min(p.correct_count - 1, 4)] * DAY).toISOString()
    if (p.status === 'learning' && p.strong_days >= 3) {
      p.status = 'mastered'
      became = true
    }
  } else {
    p.wrong_count += 1
    p.due_at = new Date(Date.now() + DAY).toISOString()
  }
  db.progress[entryId] = p
  db.logs.push({ entry_id: entryId, correct, at: Date.now() })
  return { status: p.status, became }
}

const normalize = (s) => (s ?? '').replace(/[’‘]/g, "'").replace(/\s+/g, ' ').trim().toLowerCase()

export async function submitAnswers(sessionId, answers) {
  await wait(180)
  const s = SESSIONS.get(sessionId)
  if (!s) fail('STUDY_SESSION_NOT_FOUND', 'Không tìm thấy phiên học.', null, 404)
  const total = Object.keys(s.keys).length
  const isTest = s.mode === 'test'
  const reveal = (k) => {
    const e = db.entries.get(k.entry_id)
    return { correct_answer: k.answer, entry: e ? brief(e) : null }
  }
  const results = answers.map(({ question_id: qid, answer }) => {
    const k = s.keys[qid]
    if (!k) fail('VALIDATION_ERROR', 'Câu hỏi không thuộc phiên học này.', null, 422)
    if (!s.answers[qid]) {
      const correct = Boolean(answer) && normalize(answer) === normalize(k.answer)
      const out = db.entries.has(k.entry_id) ? record(k.entry_id, k.level, correct) : { status: null, became: false }
      s.answers[qid] = { answer, correct, status: out.status, became_mastered: out.became }
    }
    const prev = s.answers[qid]
    return { question_id: qid, correct: prev.correct, status: prev.status, became_mastered: prev.became_mastered, ...(isTest ? { correct_answer: null, entry: null } : reveal(k)) }
  })
  const answered = Object.keys(s.answers).length
  const finished = answered === total
  let summary = null
  if (finished) {
    if (isTest) results.forEach((r) => Object.assign(r, reveal(s.keys[r.question_id])))
    const correct = Object.values(s.answers).filter((a) => a.correct).length
    const wrongIds = []
    for (const [qid, k] of Object.entries(s.keys)) {
      if (!s.answers[qid].correct && !wrongIds.some((w) => w.id === k.entry_id) && db.entries.has(k.entry_id)) {
        wrongIds.push({ ...brief(db.entries.get(k.entry_id)), your_answer: s.answers[qid].answer })
      }
    }
    summary = {
      total,
      correct,
      score: Math.round((correct * 100) / total),
      mastered_now: Object.values(s.answers).filter((a) => a.became_mastered).length,
      wrong: wrongIds,
      review: isTest
        ? Object.entries(s.keys).map(([qid, k]) => ({ question_id: qid, level: k.level, correct: s.answers[qid].correct, your_answer: s.answers[qid].answer, correct_answer: k.answer, entry: brief(db.entries.get(k.entry_id)) }))
        : null,
    }
  }
  return { results, answered, total, finished, summary }
}
