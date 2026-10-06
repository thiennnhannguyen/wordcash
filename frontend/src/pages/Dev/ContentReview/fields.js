/*
 * Các trường của một mục nội dung trên trang duyệt (/dev/content): nhãn tiếng Việt, kiểu ô (một dòng / nhiều dòng / danh
 * sách mỗi dòng một mục), trường nào nhờ AI viết lại được (khớp REWRITABLE ở backend/app/services/dev_content_service.py).
 */

export const FIELDS = [
  { key: 'meaning_vi', label: 'Nghĩa tiếng Việt', kind: 'line', ai: true },
  { key: 'definition_en', label: 'Định nghĩa tiếng Anh', kind: 'text', ai: true },
  { key: 'example_en', label: 'Câu ví dụ', kind: 'text', ai: true },
  { key: 'example_vi', label: 'Dịch câu ví dụ', kind: 'text', ai: true },
  { key: 'collocations', label: 'Cụm đi kèm (mỗi dòng một cụm)', kind: 'list', ai: true },
  { key: 'word_family', label: 'Họ từ (mỗi dòng một từ)', kind: 'list', ai: true },
  { key: 'synonyms', label: 'Từ đồng nghĩa (mỗi dòng một từ)', kind: 'list', ai: true },
  { key: 'mnemonic_vi', label: 'Mẹo nhớ', kind: 'text', ai: true },
  { key: 'image_keyword', label: 'Từ khóa ảnh', kind: 'line', ai: true },
  { key: 'ipa', label: 'IPA', kind: 'line', ai: false },
  { key: 'subgroup', label: 'Nhóm nhỏ (gom bài)', kind: 'line', ai: false },
  { key: 'commonness', label: 'Độ phổ biến 1–5', kind: 'number', ai: false },
]

export const STATUS_LABEL = { draft: 'Nháp', approved: 'Đã duyệt', rejected: 'Từ chối' }
export const STATUS_TONE = { draft: 'bg-neutral', approved: 'bg-accent', rejected: 'bg-danger' }

export const toForm = (entry) =>
  Object.fromEntries(FIELDS.map((f) => [f.key, f.kind === 'list' ? (entry[f.key] ?? []).join('\n') : (entry[f.key] ?? '')]))

export function fromForm(form) {
  return Object.fromEntries(
    FIELDS.map((f) => {
      const v = form[f.key]
      if (f.kind === 'list') return [f.key, String(v).split('\n').map((s) => s.trim()).filter(Boolean)]
      if (f.kind === 'number') return [f.key, Number(v) || 3]
      if (f.key === 'ipa') return [f.key, String(v).trim() || null]
      return [f.key, String(v)]
    }),
  )
}

/** Các trường đã sửa so với mục gốc (để PATCH gọn và biết còn thay đổi chưa lưu). */
export function changedFields(entry, form) {
  const next = fromForm(form)
  return Object.fromEntries(Object.entries(next).filter(([k, v]) => JSON.stringify(v) !== JSON.stringify(entry[k] ?? (Array.isArray(v) ? [] : ''))))
}
