/*
 * DỮ LIỆU MẪU CHO TRANG DEV: một bài học mẫu (B1 · Công việc) với 18 mục từ nháp tự viết, dùng cho Đấu Trường giả và các màn
 * kết quả dựng sẵn trong src/dev. Không phải kho từ; code production không dùng.
 */

export const LESSON = {
  id: '3-3',
  level: 'B1',
  topic: 'Công việc',
  number: 3,
  title: 'Phỏng vấn xin việc',
}

// 18 mục từ của bài (nội dung học, được phép gửi xuống client)
export const ENTRIES = [
  { word: 'interview', ipa: '/ˈɪntəvjuː/', pos: 'danh từ', meaning: 'buổi phỏng vấn', definition: 'A formal meeting where someone asks you questions, often for a job.', example: 'I have a job interview on Monday.', collocations: ['job interview', 'interview for a job'], family: ['interviewer', 'interviewee'] },
  { word: 'candidate', ipa: '/ˈkændɪdət/', pos: 'danh từ', meaning: 'ứng viên', definition: 'A person who is trying to get a job or a position.', example: 'She is the best candidate for the role.', collocations: ['strong candidate', 'ideal candidate'], family: ['candidacy'] },
  { word: 'experience', ipa: '/ɪkˈspɪəriəns/', pos: 'danh từ', meaning: 'kinh nghiệm', definition: 'Knowledge or skill you get from doing something.', example: 'Do you have any experience in sales?', collocations: ['work experience', 'gain experience'], family: ['experienced', 'inexperienced'] },
  { word: 'apply', ipa: '/əˈplaɪ/', pos: 'động từ', meaning: 'nộp đơn, ứng tuyển', definition: 'To formally ask for a job or a place somewhere.', example: 'He applied for a job at a bank.', collocations: ['apply for a job', 'apply online'], family: ['application', 'applicant'] },
  { word: 'reliable', ipa: '/rɪˈlaɪəbl/', pos: 'tính từ', meaning: 'đáng tin cậy', definition: 'Able to be trusted to do what people expect.', example: 'She is a very reliable friend.', collocations: ['reliable source', 'reliable friend'], family: ['rely', 'reliability', 'reliably'] },
  { word: 'confident', ipa: '/ˈkɒnfɪdənt/', pos: 'tính từ', meaning: 'tự tin', definition: 'Feeling sure about your own abilities.', example: 'Try to look confident in the interview.', collocations: ['feel confident', 'confident answer'], family: ['confidence', 'confidently'] },
  { word: 'qualification', ipa: '/ˌkwɒlɪfɪˈkeɪʃn/', pos: 'danh từ', meaning: 'bằng cấp, trình độ', definition: 'An exam you passed or a course you finished.', example: 'What qualifications do you need for this job?', collocations: ['academic qualification', 'professional qualification'], family: ['qualify', 'qualified'] },
  { word: 'skill', ipa: '/skɪl/', pos: 'danh từ', meaning: 'kỹ năng', definition: 'The ability to do something well.', example: 'Good communication skills are important.', collocations: ['communication skills', 'language skills'], family: ['skilled', 'skilful'] },
  { word: 'salary', ipa: '/ˈsæləri/', pos: 'danh từ', meaning: 'tiền lương', definition: 'Money you get for your work, usually every month.', example: 'The salary for this position is quite high.', collocations: ['monthly salary', 'salary increase'], family: [] },
  { word: 'deadline', ipa: '/ˈdedlaɪn/', pos: 'danh từ', meaning: 'hạn chót', definition: 'The time by which something must be done.', example: 'The deadline for applications is Friday.', collocations: ['meet a deadline', 'miss a deadline'], family: [] },
  { word: 'responsible', ipa: '/rɪˈspɒnsəbl/', pos: 'tính từ', meaning: 'chịu trách nhiệm', definition: 'Having the job of taking care of something.', example: 'You will be responsible for the sales team.', collocations: ['responsible for', 'feel responsible'], family: ['responsibility', 'responsibly'] },
  { word: 'strength', ipa: '/streŋθ/', pos: 'danh từ', meaning: 'điểm mạnh', definition: 'A good quality or ability that someone has.', example: 'What are your main strengths?', collocations: ['greatest strength', 'strengths and weaknesses'], family: ['strong', 'strengthen'] },
  { word: 'weakness', ipa: '/ˈwiːknəs/', pos: 'danh từ', meaning: 'điểm yếu', definition: 'A part of someone that is not very good.', example: 'Everyone has a weakness.', collocations: ['main weakness', 'admit a weakness'], family: ['weak', 'weaken'] },
  { word: 'employer', ipa: '/ɪmˈplɔɪə/', pos: 'danh từ', meaning: 'nhà tuyển dụng', definition: 'A person or company that pays people to work.', example: 'My employer gave me a day off.', collocations: ['current employer', 'future employer'], family: ['employ', 'employee', 'employment'] },
  { word: 'position', ipa: '/pəˈzɪʃn/', pos: 'danh từ', meaning: 'vị trí công việc', definition: 'A job in a company or an organisation.', example: 'I am applying for the position of manager.', collocations: ['apply for a position', 'senior position'], family: [] },
  { word: 'colleague', ipa: '/ˈkɒliːɡ/', pos: 'danh từ', meaning: 'đồng nghiệp', definition: 'A person you work with.', example: 'My colleagues are very friendly.', collocations: ['close colleague', 'former colleague'], family: [] },
  { word: 'hire', ipa: '/ˈhaɪə/', pos: 'động từ', meaning: 'thuê, tuyển dụng', definition: 'To give someone a job.', example: 'The company plans to hire ten new staff.', collocations: ['hire staff', 'hire someone'], family: [] },
  { word: 'impress', ipa: '/ɪmˈpres/', pos: 'động từ', meaning: 'gây ấn tượng', definition: 'To make someone admire you.', example: 'He impressed the interviewers with his ideas.', collocations: ['impress an employer', 'try to impress'], family: ['impression', 'impressive'] },
]

export const ENTRY_BY_WORD = Object.fromEntries(ENTRIES.map((e) => [e.word, e]))
