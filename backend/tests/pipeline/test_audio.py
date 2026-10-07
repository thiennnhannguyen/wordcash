"""
Bước 08 (âm thanh, chưa chạy thật) với provider giả trên 3 mục mẫu: tạo mp3 cho headword + câu ví dụ của mục approved,
bỏ qua mục draft, chạy lại không tạo lại, đổi văn bản thì chỉ tạo lại đúng file đó, --dry-run không ghi, provider lạ bị từ chối.
"""

import pytest

from data_pipeline.lib import audio, content
from data_pipeline.lib.schemas import ContentEntry, TopicFile


@pytest.fixture
def root(tmp_path):
    r = tmp_path / "content"
    entries = [ContentEntry(content_key=f"a1.food.{h}.noun", headword=h, pos="noun", example_en=f"We eat {h} today.", status=s)
               for h, s in (("rice", "approved"), ("egg", "approved"), ("soup", "approved"), ("cake", "draft"))]
    content.save_topic(TopicFile(level="A1", topic_code="food", topic_title="Đồ ăn", entries=entries), r)
    return r


def test_generate_only_new_or_changed(tmp_path, root):
    out, tts = tmp_path / "audio", audio.FakeProvider()
    result = audio.generate("A1", tts, root=root, out_dir=out)
    assert len(result.created) == 6 and len(tts.calls) == 6  # 3 mục approved × (từ + câu)
    assert (out / "a1" / "a1.food.rice.noun.word.mp3").read_bytes().startswith(b"ID3FAKE-MP3|en-US|rice")
    assert not (out / "a1" / "a1.food.cake.noun.word.mp3").exists()  # draft: không tạo
    again = audio.generate("A1", tts, root=root, out_dir=out)
    assert again.created == [] and again.skipped == 6 and len(tts.calls) == 6
    topic = content.load_topic(content.topic_path("A1", "food", root))
    next(e for e in topic.entries if e.headword == "egg").example_en = "My mom cooks egg soup."
    content.save_topic(topic, root)
    changed = audio.generate("A1", tts, root=root, out_dir=out)
    assert changed.created == ["a1.food.egg.noun.example"] and tts.calls[-1] == "My mom cooks egg soup."


def test_dry_run_and_unknown_provider(tmp_path, root):
    result = audio.generate("A1", audio.FakeProvider(), root=root, out_dir=tmp_path / "audio", dry_run=True)
    assert len(result.created) == 6 and not (tmp_path / "audio").exists()
    with pytest.raises(ValueError):
        audio.provider("google")
