"""
Kiểm thử lấy IP người dùng khi chạy trực tiếp và khi chạy sau reverse proxy.
"""

import pytest
from starlette.requests import Request

from app.api.deps import get_client_ip
from app.core.config import settings


def _request(xff: str | None = None, client: tuple[str, int] | None = ("10.0.0.5", 4000)) -> Request:
    headers = [(b"x-forwarded-for", xff.encode())] if xff is not None else []
    return Request({"type": "http", "method": "GET", "path": "/", "headers": headers, "client": client})


@pytest.fixture
def proxy(monkeypatch):
    def configure(trust: bool, hops: int = 1):
        monkeypatch.setattr(settings, "TRUST_PROXY", trust)
        monkeypatch.setattr(settings, "TRUSTED_PROXY_HOPS", hops)

    return configure


def test_default_is_not_trusting_proxy():
    assert settings.TRUST_PROXY is False and settings.TRUSTED_PROXY_HOPS == 1


def test_direct_mode_ignores_forwarded_header(proxy):
    proxy(False)
    assert get_client_ip(_request("1.2.3.4")) == "10.0.0.5"  # client tự đặt X-Forwarded-For: bỏ qua
    assert get_client_ip(_request()) == "10.0.0.5"
    assert get_client_ip(_request(client=None)) is None


@pytest.mark.parametrize(
    ("hops", "xff", "expected"),
    [
        (1, "203.0.113.7", "203.0.113.7"),
        (1, "6.6.6.6, 203.0.113.7", "203.0.113.7"),  # 6.6.6.6 do client giả mạo
        (1, " 6.6.6.6 ,203.0.113.7 ", "203.0.113.7"),
        (2, "6.6.6.6, 203.0.113.7, 10.1.0.1", "203.0.113.7"),  # CDN → proxy → app
        (2, "203.0.113.7", "203.0.113.7"),  # ít phần tử hơn số hop
    ],
)
def test_proxy_mode_reads_from_the_right(proxy, hops, xff, expected):
    proxy(True, hops)
    assert get_client_ip(_request(xff)) == expected


def test_proxy_mode_without_header_falls_back(proxy):
    proxy(True)
    assert get_client_ip(_request()) == "10.0.0.5"
    assert get_client_ip(_request("  ,  ")) == "10.0.0.5"
