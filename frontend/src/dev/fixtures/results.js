/*
 * DỮ LIỆU MẪU CHO TRANG DEV /dev/results: kết quả dựng sẵn của Kiểm tra cuối bài, Trận Boss, Cửa Ải Hôm Nay (cùng dạng bộ
 * chuyển trong services/academyApi.js). Số liệu khớp mẫu số (20 và 50 câu). Code production không dùng file này.
 */

import { ENTRY_BY_WORD, LESSON } from './lessonEntries'

const wrongWordsOf = (words) => words.map((w) => ({ word: w, meaning: ENTRY_BY_WORD[w].meaning, ipa: ENTRY_BY_WORD[w].ipa, entry: ENTRY_BY_WORD[w] }))

export const PREVIEW_LESSON = { kind: 'unit', level: LESSON.level, number: LESSON.number, title: LESSON.title, topic: LESSON.topic, unitId: 0 }

export const PREVIEW_UNIT = {
  pass: {
    score: 90, correct: 18, total: 20, passPercent: 80, passed: true, missing: 0, stamps: [],
    unlocked: { kind: 'unit', number: 4, title: 'Kỹ năng mềm', id: 0 }, wrongWords: wrongWordsOf(['qualification', 'deadline']),
  },
  fail: {
    score: 70, correct: 14, total: 20, passPercent: 80, passed: false, missing: 2, unlocked: null, stamps: [],
    wrongWords: wrongWordsOf(['reliable', 'qualification', 'responsible', 'deadline', 'salary', 'skill']),
  },
}

const WEAK_STAGES = [
  { id: 1, title: 'Môi trường', percent: 64, color: 'accent' },
  { id: 2, title: 'Sức khỏe', percent: 71, color: 'danger' },
]

export const PREVIEW_BOSS = {
  win: { level: 'B1', nextLevel: 'B2', score: 92, correct: 46, total: 50, passPercent: 85, passed: true, reward: { specialSpins: 1 }, stamps: [], weakStages: [], retryInSeconds: null },
  lose: { level: 'B1', nextLevel: 'B2', score: 78, correct: 39, total: 50, passPercent: 85, passed: false, reward: null, stamps: [], weakStages: WEAK_STAGES, retryInSeconds: 12 * 3600 },
}

export const PREVIEW_DAILY = {
  perfect: { correctCount: 4, total: 4, perfect: true, streakBefore: 12, streakAfter: 13, spinReward: 0, masteredDelta: 0, wrongWords: [], rankShaky: null },
  milestone: { correctCount: 4, total: 4, perfect: true, streakBefore: 13, streakAfter: 14, spinReward: 1, masteredDelta: 0, wrongWords: [], rankShaky: null },
  mistake: {
    correctCount: 3, total: 4, perfect: false, streakBefore: 12, streakAfter: 12, spinReward: 0, masteredDelta: -1,
    wrongWords: [{ word: 'reliable', meaning: 'đáng tin cậy' }], rankShaky: { rank: 'bach_kim', daysLeft: 3, wordsToRecover: 12 },
  },
}
