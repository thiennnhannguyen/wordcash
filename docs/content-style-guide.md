# Hướng dẫn soạn nội dung kho từ

Áp dụng cho mọi mục từ trong `backend/content/<cấp>/*.json`, dù do AI soạn nháp hay người viết tay. Prompt AI
(`backend/data_pipeline/prompts/enrich_v2.md`) chèn nguyên khối "Quy tắc cho AI" ở cuối trang này. Sửa khối đó thì prompt
đổi theo, và cache AI tự hết hiệu lực vì mã băm của prompt đổi.

**Chủ đề quyết định từ vựng, địa danh chỉ là trang trí.** Mỗi chặng trên bản đồ là một chủ đề (greetings, food…); địa danh
của chặng chỉ để trang trí, không ảnh hưởng việc chọn từ, nghĩa, câu ví dụ hay tên bài. Không viết nội dung "theo địa danh"
(chặng Chợ Đồng Xuân không bắt buộc câu về chợ). Từ đời sống Việt Nam (`vn_context_allowlist.txt`) chỉ là từ ĐƯỢC PHÉP dùng
cho câu gần gũi, không bắt buộc, không gắn với chặng nào. Tên bài đặt theo nội dung từ vựng của bài.

Chuẩn tiếng Anh: Anh-Mỹ (en-US), cả chính tả (`br_us_spelling.tsv`) lẫn **từ vựng** (`backend/data_pipeline/uk_us_vocab.tsv`):
từ chỉ người Anh dùng thì thay bằng từ Mỹ (flat → apartment, trousers → pants, football → soccer, mobile phone → cell
phone); từ người Mỹ vẫn hiểu và dùng (autumn, shop, film, holiday, toilet) thì giữ, kèm `variant_note` "Mỹ thường dùng: fall"
(tự điền, hiện dưới nghĩa trên thẻ học). Câu ví dụ, cụm đi kèm, định nghĩa cũng dùng từ Mỹ (cờ `uk_vocab`). IPA lấy từ CMUdict, không tự sửa trừ khi mục có cờ `ipa_unverified`. IPA của cụm từ ghép
từng từ: từ nội dung có dấu nhấn (kể cả từ một âm tiết), từ chức năng không nhấn và dùng dạng đọc lướt (of /əv/, a /ə/, to
/tə/, for /fər/, and /ən/, can /kən/, at /ət/, from /frəm/, some /səm/, the /ðə/, trước nguyên âm /ði/; bảng `WEAK_FORMS`
trong `lib/ipa.py`). Từ chức năng đứng riêng giữ dạng đầy đủ.

## 1. Chọn nghĩa

Mỗi mục là **một nghĩa chính**, và đó phải là nghĩa hợp với chủ đề được gán. Nghĩa khác của cùng từ, nếu cần, là một mục riêng
ở chủ đề hợp với nghĩa đó (khác `content_key`).

| | Ví dụ |
|---|---|
| ĐÚNG | `orange` ở chủ đề Đồ ăn → "quả cam" |
| SAI | `orange` ở chủ đề Đồ ăn → "quả cam; màu cam" (hai nghĩa trong một thẻ) |
| ĐÚNG | `table` ở chủ đề Nhà cửa → "cái bàn" |
| SAI | `table` ở chủ đề Nhà cửa → "bảng (số liệu)" (không hợp chủ đề) |

## 2. Văn phong `meaning_vi`

Viết nghĩa tự nhiên, ngắn (tối đa 6 từ), đúng cách người Việt nói. Không dịch máy, không kèm chú thích dài hay ngoặc giải
thích. Danh từ chỉ đồ vật có thể dùng loại từ quen thuộc ("quả", "cái", "con") khi người Việt thường nói như vậy.
Tránh đại từ khi có thể: cụm `I'm hungry` → "đói rồi", không phải "tôi đói rồi" (cờ `meaning_vi_pronoun` khi có "tôi").
Nghĩa phải phân biệt được với mọi mục khác trong cùng cấp (cờ `duplicate_meaning_in_level`). Từ đồng âm trong tiếng Việt thì
thêm ghi chú ngắn trong ngoặc: `five` → "năm (số)", `year` → "năm (mười hai tháng)"; từ gần nghĩa khác cách dùng thì ghi cách
dùng: `mom` → "mẹ (gọi hằng ngày)", `mommy` → "mẹ (trẻ nhỏ gọi)". Hai từ đồng nghĩa hoàn toàn (`burger` / `hamburger`) thì
giữ một mục, ghi từ kia vào `synonyms`, thêm từ bỏ vào `data_pipeline/a1_excluded_duplicates.txt`.

| | Ví dụ |
|---|---|
| ĐÚNG | `breakfast` → "bữa sáng" |
| SAI | `breakfast` → "bữa ăn đầu tiên trong ngày (thường vào buổi sáng)" |
| ĐÚNG | `excuse me` → "xin lỗi (cho hỏi)" — chấp nhận ngoặc ngắn khi cần phân biệt cách dùng |
| SAI | `excuse me` → "miễn thứ cho tôi" (dịch máy, không ai nói) |
| ĐÚNG | `I'm hungry` → "đói rồi" |
| SAI | `I'm hungry` → "tôi đói rồi" (thừa đại từ) |
| ĐÚNG | `busy` → "bận" |
| SAI | `busy` → "bận rộn, nhiều việc, không rảnh" (liệt kê nhiều nghĩa) |

## 3. Định nghĩa tiếng Anh `definition_en`

Chỉ dùng từ A1–A2, tối đa 12 từ, không dùng chính headword. **Đơn giản nhưng không sai sự thật:** định nghĩa ngắn không
được nói điều sai hoặc quá rộng tới mức chỉ sang thứ khác (quả bóng, quả cam cũng "tròn"). Nêu đặc điểm phân biệt thật.

| | Ví dụ |
|---|---|
| ĐÚNG | `kitchen` → "the room where you cook food" |
| SAI | `kitchen` → "a kitchen is a culinary area" (dùng headword, từ khó) |
| ĐÚNG | `egg` → "a food that comes from a chicken" |
| SAI | `egg` → "a round food" (sai: trứng không tròn, và quá rộng) |

## 4. Câu ví dụ `example_en` / `example_vi`

- 5–12 từ, trình độ của cấp đang soạn; chứa headword hoặc dạng biến đổi (số nhiều, chia thì).
- Thì hiện tại đơn là chính; dùng thì khác chỉ khi nghĩa của từ cần (vd. `yesterday`).
- Ngữ cảnh đời sống Việt Nam: chợ, xe máy, phở, Tết, trường học, gia đình. Từ đời sống Việt Nam được phép (không bị cờ
  `hard_words`) nằm trong `backend/data_pipeline/vn_context_allowlist.txt` (pho, banh mi, Tet, ao dai, motorbike, Hanoi,
  Ho Chi Minh City, Ha Long Bay, Hoi An…), viết không dấu kiểu tiếng Anh. **Mỗi câu ví dụ tối đa 1 từ trong danh sách này**
  (cờ `vn_context_overuse`), để câu vẫn là câu tiếng Anh dễ hiểu.
- Tránh tên thật và người nổi tiếng; dùng tên phổ biến (Lan, Nam, Minh, Mai) hoặc "my mom", "my friend".
- Không thương hiệu, rượu bia, thuốc lá, bạo lực, tôn giáo, chính trị; không định kiến giới tính, vùng miền, nghề nghiệp,
  ngoại hình.
- `example_vi` dịch tự nhiên, không dịch từng chữ. Ngôi thứ nhất thống nhất dùng **"mình"** ("Mẹ mình…", "Mình đói rồi."),
  không dùng "tôi", "tớ".

| | Ví dụ |
|---|---|
| ĐÚNG | `market` → "My mom buys vegetables at the market." / "Mẹ mình mua rau ở chợ." |
| SAI | `market` → "The market was crowded because of the festival." (từ khó, thì quá khứ không cần) |
| ĐÚNG | `motorbike` → "Nam goes to school by motorbike." |
| SAI | `motorbike` → "He drives a Honda motorbike." (thương hiệu) |
| ĐÚNG | `breakfast` → "I eat pho for breakfast." (1 từ đời sống Việt Nam) |
| SAI | `breakfast` → "In Hanoi, I eat pho and banh mi for breakfast." (3 từ đời sống Việt Nam) |
| SAI | `cook` → "Women always cook for the family." (định kiến giới) |
| SAI | `drink` → "My dad drinks beer every night." (rượu bia) |

## 5. Cụm từ cố định

Khoảng 10% mục mỗi cấp là cụm cố định thông dụng (`pos = phrase`): `good morning`, `thank you`, `how much`, `excuse me`.
Cụm dài 2–4 từ, dùng thật trong giao tiếp. `meaning_vi` là cách người Việt nói cùng ý đó; câu ví dụ đặt cụm vào một tình huống
nhỏ, có thật.

| | Ví dụ |
|---|---|
| ĐÚNG | `how much` → "bao nhiêu (tiền)"; "How much is this hat?" |
| SAI | `how much is it that you want` (không phải cụm cố định) |
| ĐÚNG | `see you later` → "hẹn gặp lại" |
| SAI | `see you later` → "nhìn thấy bạn muộn hơn" (dịch từng chữ) |

## 6. Mẹo nhớ `mnemonic_vi`

Tùy chọn. Tối đa 20 từ, dựa trên âm hoặc hình ảnh dễ nhớ; không thô tục, không chế giễu ai. Không có mẹo hay thì để trống.

| | Ví dụ |
|---|---|
| ĐÚNG | `bee` → "Con ong kêu 'bi bi' bay quanh hoa." |
| SAI | `fat` → "Như ông hàng xóm béo phì." (chế giễu ngoại hình) |

## 7. Cụm đi kèm, họ từ, từ đồng nghĩa, từ khóa ảnh

- `collocations` của từ đơn: 2–3 cụm thông dụng, mỗi cụm **có chứa headword** (`rice` → "cook rice", "a bowl of rice").
- `collocations` của cụm từ cố định (`pos = phrase`): 2–3 **cụm liên quan** có ích (biến thể, câu đáp lại, cụm cùng nhóm),
  **không lặp lại chính cụm đó** thêm một chữ (cờ `phrase_related_repeats_headword`). Thẻ học hiện nhãn "Cụm liên quan".

| | Ví dụ |
|---|---|
| ĐÚNG | `I'm hungry` → "I'm thirsty", "I'm full" |
| ĐÚNG | `It's hot` → "It's cold", "It's warm" |
| SAI | `I'm hungry` → "I'm hungry now", "I'm hungry again" (lặp lại chính cụm) |

- `word_family`: 0–3 từ cùng họ hữu ích (`teach` → "teacher").
- `synonyms`: 0–2, chỉ khi giúp người học (`big` → "large"); không thì để trống.
- `image_keyword`: 1–4 từ tiếng Anh để tìm hoặc vẽ ảnh (`rice` → "bowl of rice").

<!-- ai-rules:start -->
- ONE card = ONE main meaning, the meaning that matches the topic. Right: "orange" in Food → "quả cam". Wrong: "quả cam; màu cam".
- meaning_vi: natural, short Vietnamese (max 6 words), the way Vietnamese people really say it; no machine translation,
  no long notes. Right: "breakfast" → "bữa sáng". Wrong: "bữa ăn đầu tiên trong ngày (thường vào buổi sáng)".
  Avoid pronouns when possible: "I'm hungry" → "đói rồi" (Wrong: "tôi đói rồi").
- definition_en: only A1–A2 words, max 12 words, never use the headword. Right: "kitchen" → "the room where you cook food".
  Simple but never untrue or so broad it fits other things. Right: "egg" → "a food that comes from a chicken".
  Wrong: "egg" → "a round food".
- example_en: 5–12 words at the target level, contains the headword or its inflected form, mostly present simple, everyday
  life in Vietnam (market, motorbike, pho, Tet, school, family). Right: "My mom buys vegetables at the market."
  Wrong: "The market was crowded because of the festival."
- Vietnamese-life words allowed in examples, written without accents: pho, banh mi, bun cha, com, Tet, ao dai, motorbike,
  Hanoi, Ho Chi Minh City, Ha Long Bay, Hoi An, Da Nang, Mekong (full list: vn_context_allowlist.txt). Use AT MOST ONE of
  them per example. Right: "I eat pho for breakfast." Wrong: "In Hanoi, I eat pho and banh mi for breakfast."
- No real people, celebrities or brands (Wrong: "He drives a Honda motorbike."). Use common names (Lan, Nam, Minh, Mai)
  or "my mom", "my friend".
- No alcohol, smoking, violence, religion, politics; no stereotypes about gender, regions, jobs or looks
  (Wrong: "Women always cook for the family.", "My dad drinks beer every night.").
- example_vi: natural Vietnamese, not word-for-word; first person is always "mình" (never "tôi", "tớ").
  Right: "Mẹ mình mua rau ở chợ." Wrong: "Mẹ tôi mua rau ở chợ."
- Fixed phrases (pos "phrase"): 2–4 words really used in conversation; meaning_vi is how Vietnamese people say the same
  thing (Right: "see you later" → "hẹn gặp lại"; Wrong: "nhìn thấy bạn muộn hơn").
- mnemonic_vi: optional, max 20 words, sound or image based, never vulgar or mocking anyone; "" if nothing good.
- collocations: single words: 2–3 common partners, EACH contains the headword ("rice" → "cook rice", "a bowl of rice").
  Fixed phrases: 2–3 RELATED phrases (variant, reply, same group) that do NOT repeat the headword
  (Right: "I'm hungry" → "I'm thirsty", "I'm full". Wrong: "I'm hungry now").
- word_family 0–3 useful words; synonyms 0–2 only when helpful; image_keyword 1–4 English words.
- American English vocabulary, not only spelling: apartment (not flat), pants (not trousers), soccer (not football),
  cell phone (not mobile phone), vacation (not holiday), cookie (not biscuit), candy (not sweets), trash (not rubbish).
<!-- ai-rules:end -->

## 8. Danh sách kiểm tra cho người duyệt

Trả lời từng câu. Có câu "Không" thì sửa trực tiếp, nhờ AI viết lại trường đó, hoặc từ chối kèm lý do.

1. Từ này có thật sự cần cho người học ở cấp này và hợp với chủ đề không?
2. `meaning_vi` có đúng một nghĩa chính, hợp chủ đề, tự nhiên, không dài quá 6 từ không?
3. Phát âm (bấm loa) và IPA có đúng giọng Mỹ không? Mục có cờ `ipa_unverified` đã kiểm IPA chưa?
4. Câu ví dụ có chứa từ, dùng đúng nghĩa, đúng ngữ pháp và đủ dễ không?
5. Câu ví dụ có gần gũi đời sống Việt Nam, không tên thật, không thương hiệu, không chủ đề nhạy cảm hay định kiến không?
6. `example_vi` có dịch tự nhiên và khớp nghĩa câu tiếng Anh không?
7. Định nghĩa tiếng Anh có đơn giản, đúng sự thật (không sai, không rộng tới mức chỉ sang thứ khác), không dùng chính từ đó không?
8. Mỗi cụm đi kèm có chứa từ và là cách nói thông dụng không? Với cụm từ cố định: cụm liên quan có ích, không lặp lại chính cụm?
9. Ở câu hỏi mẫu mức 1–4, đáp án nhiễu có hợp lý, không có hai đáp án cùng đúng không?
10. Mọi cờ của mục đã được xử lý (đã sửa, hoặc đã xem và chấp nhận) chưa?

Nhãn thông tin (`phrase`, `ai_suggested_headword`) không phải lỗi, chỉ nhắc người duyệt chú ý; chúng không tính vào số mục
"có cờ" và không tính vào ngưỡng dừng 10% khi soạn. `ai_suggested_headword` = từ AI đề xuất thêm, đã kiểm có trong CEFR-J A1–A2.
