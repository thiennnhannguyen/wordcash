"""
Gọi AI cho quy trình kho từ.

- `AnthropicClient`: Claude Messages API qua httpx. Key lấy từ config.anthropic_api_key() (biến môi trường / backend/.env),
  model từ ANTHROPIC_MODEL. Không bao giờ log key, header hay toàn bộ request; lỗi chỉ nêu mã HTTP và loại lỗi.
- `FakeAIClient`: dùng trong test — hàm `handler(system, user) -> str` trả lời thay AI (không gọi mạng).
- `call_json`: gửi prompt, tách JSON trong câu trả lời, kiểm bằng Pydantic; sai thì gửi lại kèm mô tả lỗi, tối đa
  AI_MAX_RETRIES lần, rồi ném `AIJsonError` (nơi gọi ghi vào failed.json).
- `Usage` cộng dồn token thật để báo cáo chi phí.
"""

import json
import re
from dataclasses import dataclass, field
from typing import Callable, Protocol, TypeVar

import httpx
from pydantic import BaseModel, TypeAdapter, ValidationError

from data_pipeline import config

API_URL = "https://api.anthropic.com/v1/messages"
API_VERSION = "2023-06-01"
T = TypeVar("T")


@dataclass
class AIResponse:
    text: str
    input_tokens: int = 0
    output_tokens: int = 0


@dataclass
class Usage:
    requests: int = 0
    input_tokens: int = 0
    output_tokens: int = 0
    failures: int = 0

    def add(self, r: AIResponse) -> None:
        self.requests += 1
        self.input_tokens += r.input_tokens
        self.output_tokens += r.output_tokens

    def cost_usd(self) -> float:
        return round(self.input_tokens / 1e6 * config.PRICE_INPUT_PER_MTOK + self.output_tokens / 1e6 * config.PRICE_OUTPUT_PER_MTOK, 4)

    def as_dict(self) -> dict:
        return {"requests": self.requests, "input_tokens": self.input_tokens, "output_tokens": self.output_tokens,
                "failures": self.failures, "cost_usd_estimate": self.cost_usd()}


class AIClient(Protocol):
    def complete(self, system: str, user: str, *, max_tokens: int = 4096) -> AIResponse: ...


class AIError(RuntimeError):
    pass


class AIJsonError(AIError):
    def __init__(self, message: str, last_text: str = ""):
        super().__init__(message)
        self.last_text = last_text


class AnthropicClient:
    def __init__(self, model: str | None = None, api_key: str | None = None, timeout: float = 180.0, transport=None):
        self.model = model or config.anthropic_model()
        self._key = api_key or config.anthropic_api_key()
        self._http = httpx.Client(timeout=timeout, transport=transport)

    def __repr__(self) -> str:  # không bao giờ lộ key khi in đối tượng
        return f"AnthropicClient(model={self.model!r})"

    def complete(self, system: str, user: str, *, max_tokens: int = 4096) -> AIResponse:
        try:
            res = self._http.post(API_URL, headers={"x-api-key": self._key, "anthropic-version": API_VERSION, "content-type": "application/json"},
                                  json={"model": self.model, "max_tokens": max_tokens, "system": system,
                                        "messages": [{"role": "user", "content": user}]})
        except httpx.HTTPError as e:
            raise AIError(f"Lỗi mạng khi gọi AI: {type(e).__name__}") from None
        if res.status_code != 200:
            try:
                kind = res.json().get("error", {}).get("type", "unknown")
            except ValueError:
                kind = "unknown"
            raise AIError(f"AI trả HTTP {res.status_code} ({kind})")
        body = res.json()
        text = "".join(block.get("text", "") for block in body.get("content", []) if block.get("type") == "text")
        usage = body.get("usage", {})
        return AIResponse(text, usage.get("input_tokens", 0), usage.get("output_tokens", 0))


@dataclass
class FakeAIClient:
    handler: Callable[[str, str], str]
    calls: list[tuple[str, str]] = field(default_factory=list)

    def complete(self, system: str, user: str, *, max_tokens: int = 4096) -> AIResponse:
        self.calls.append((system, user))
        text = self.handler(system, user)
        return AIResponse(text, len(system + user) // 4, len(text) // 4)


def extract_json(text: str):
    """Lấy JSON từ câu trả lời (chấp nhận khối ```json … ``` hoặc văn bản thừa quanh mảng / đối tượng)."""
    fenced = re.search(r"```(?:json)?\s*(.*?)```", text, re.S)
    if fenced:
        text = fenced.group(1)
    start = min([i for i in (text.find("["), text.find("{")) if i >= 0], default=-1)
    if start < 0:
        raise ValueError("Không thấy JSON trong câu trả lời")
    end = max(text.rfind("]"), text.rfind("}"))
    return json.loads(text[start:end + 1])


def call_json(client: AIClient, system: str, user: str, schema: type[T] | object, *, usage: Usage | None = None,
              max_tokens: int = 4096, retries: int = config.AI_MAX_RETRIES) -> T:
    """Gọi AI và trả dữ liệu đã kiểm theo `schema` (lớp Pydantic hoặc kiểu như list[Model])."""
    adapter = TypeAdapter(schema)
    prompt = user
    last = ""
    for attempt in range(1, retries + 1):
        try:
            res = client.complete(system, prompt, max_tokens=max_tokens)
        except AIError:
            if usage:
                usage.failures += 1
            if attempt == retries:
                raise
            continue
        if usage:
            usage.add(res)
        last = res.text
        try:
            return adapter.validate_python(extract_json(res.text))
        except (ValueError, ValidationError) as e:
            if usage:
                usage.failures += 1
            detail = str(e)[:1500]
            prompt = (f"{user}\n\nLần trả lời trước KHÔNG hợp lệ ({detail}). Chỉ trả về JSON đúng schema, không kèm chữ nào khác.")
    raise AIJsonError(f"AI trả JSON sai schema sau {retries} lần", last)


class Strict(BaseModel):
    model_config = {"extra": "forbid"}
