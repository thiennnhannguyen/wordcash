"""
Cấu hình quy trình kho từ (data_pipeline/config.py): 10 chủ đề A1 khớp đúng tên và địa danh trong seeds/seed_landmarks.py,
tham số quy mô hợp lệ, API key chỉ đọc từ môi trường / backend/.env và không bao giờ lộ trong thông báo lỗi.
"""

import pytest

from data_pipeline import config
from seeds.seed_landmarks import LANDMARKS


def test_a1_topics_match_db_landmarks():
    seeded = LANDMARKS["A1"]["topics"]
    ours = config.topics("A1")
    assert len(ours) == len(seeded) == 10
    assert [(t.title, t.landmark_key) for t in ours] == [(s["title"], s["landmark_key"]) for s in seeded]
    assert len({t.code for t in ours}) == 10


def test_scale_parameters_are_consistent():
    assert config.UNIT_SIZE_MIN == 16 and config.UNIT_SIZE_MAX == 20 and config.PHRASE_RATIO == 0.1
    assert config.TARGET_PER_LEVEL == 800
    # mỗi chủ đề 70–90 mục phải chia được thành 4–5 bài 16–20 mục
    for n in range(config.TOPIC_SIZE_MIN, config.TOPIC_SIZE_MAX + 1):
        assert any(k * config.UNIT_SIZE_MIN <= n <= k * config.UNIT_SIZE_MAX
                   for k in range(config.UNITS_PER_TOPIC_MIN, config.UNITS_PER_TOPIC_MAX + 1)), n


def test_function_word_list_loaded():
    words = config.read_word_list(config.EXCLUDE_FUNCTION_WORDS)
    assert {"the", "a", "is", "can", "she", "in", "and"} <= words
    assert "house" not in words and "" not in words


def test_api_key_from_env_file_never_in_error(tmp_path, monkeypatch):
    secret = "sk-ant-test-SECRET-123"
    monkeypatch.delenv("ANTHROPIC_API_KEY", raising=False)
    monkeypatch.setattr(config, "BACKEND", tmp_path)
    with pytest.raises(RuntimeError) as err:
        config.anthropic_api_key()
    assert "ANTHROPIC_API_KEY" in str(err.value)
    (tmp_path / ".env").write_text(f'# chú thích\nANTHROPIC_API_KEY="{secret}"\nANTHROPIC_MODEL=claude-test\n', encoding="utf-8")
    assert config.anthropic_api_key() == secret and config.anthropic_model() == "claude-test"
    monkeypatch.setenv("ANTHROPIC_API_KEY", "from-env")
    assert config.anthropic_api_key() == "from-env"
