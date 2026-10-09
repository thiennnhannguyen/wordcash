"""
Bước 08 (chuẩn bị, CHƯA chạy với dịch vụ thật) — tạo mp3 cho headword và example_en của mục đã duyệt (gọi từ
data_pipeline/08_generate_audio.py).

- Nhà cung cấp TTS cấu hình được (`PROVIDERS`); giọng en-US (`TTS_VOICE`). Hiện chỉ có `fake` (sinh byte giả, dùng cho
  test). Thêm nhà cung cấp thật: viết lớp có `name`, `synthesize(text, voice) -> bytes` rồi đăng ký — CHỈ gọi khi chủ dự án
  cho phép (chi phí, giấy phép thương mại của giọng đọc).
- Chỉ tạo cho mục `approved` chưa có audio hoặc có văn bản đã đổi: so mã băm (nhà cung cấp + giọng + văn bản) với
  audio_out/manifest.json. File tạm ở audio_out/<cấp>/<content_key>.<word|example>.mp3; tải lên R2 làm sau.
"""

import hashlib
from dataclasses import dataclass, field
from pathlib import Path
from typing import Protocol

from data_pipeline import config
from data_pipeline.lib import content
from data_pipeline.lib.jsonio import read_json, write_json

DEFAULT_VOICE = "en-US"


class TTSProvider(Protocol):
    name: str

    def synthesize(self, text: str, voice: str) -> bytes: ...


@dataclass
class FakeProvider:
    """Không gọi mạng: trả byte giả có chứa văn bản (đủ để kiểm tra luồng)."""

    name: str = "fake"
    calls: list[str] = field(default_factory=list)

    def synthesize(self, text: str, voice: str) -> bytes:
        self.calls.append(text)
        return b"ID3FAKE-MP3|" + voice.encode() + b"|" + text.encode()


PROVIDERS: dict[str, type] = {"fake": FakeProvider}


def provider(name: str) -> TTSProvider:
    if name not in PROVIDERS:
        raise ValueError(f"Nhà cung cấp TTS '{name}' chưa có. Hiện có: {', '.join(PROVIDERS)} (dịch vụ thật chưa được bật).")
    return PROVIDERS[name]()


def text_hash(provider_name: str, voice: str, text: str) -> str:
    return hashlib.sha256(f"{provider_name}|{voice}|{text}".encode()).hexdigest()


@dataclass
class AudioResult:
    created: list[str] = field(default_factory=list)
    skipped: int = 0


def jobs(level: str, root: Path | None = None) -> list[tuple[str, str, str]]:
    """(content_key, loại, văn bản) của mọi mục approved trong cấp."""
    out = []
    for path in content.level_files(level, root):
        for e in content.load_topic(path).entries:
            if e.status != "approved":
                continue
            out.append((e.content_key, "word", e.headword))
            if e.example_en.strip():
                out.append((e.content_key, "example", e.example_en.strip()))
    return out


def generate(level: str, tts: TTSProvider, *, voice: str = DEFAULT_VOICE, root: Path | None = None,
             out_dir: Path = config.AUDIO_OUT, dry_run: bool = False) -> AudioResult:
    manifest_path = Path(out_dir) / "manifest.json"
    manifest: dict = read_json(manifest_path, {})
    result = AudioResult()
    for key, kind, text in jobs(level, root):
        digest = text_hash(tts.name, voice, text)
        file = Path(out_dir) / level.lower() / f"{key}.{kind}.mp3"
        old = manifest.get(key, {}).get(kind)
        if old and old.get("hash") == digest and file.exists():
            result.skipped += 1
            continue
        result.created.append(f"{key}.{kind}")
        if dry_run:
            continue
        file.parent.mkdir(parents=True, exist_ok=True)
        file.write_bytes(tts.synthesize(text, voice))
        manifest.setdefault(key, {})[kind] = {"hash": digest, "file": str(file.relative_to(out_dir)), "text": text,
                                              "provider": tts.name, "voice": voice}
    if not dry_run:
        write_json(manifest_path, manifest)
    return result
