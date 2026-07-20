"""Temel güvenlik: rate limit (entegrasyon) + güvenlik header'ları."""

from __future__ import annotations

import time
from collections import defaultdict, deque
from threading import Lock

from fastapi import HTTPException, Request
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse

_RATE_LOCK = Lock()
_RATE_BUCKETS: dict[str, deque[float]] = defaultdict(deque)
RATE_LIMIT_PER_MINUTE = 120
RATE_WINDOW_SECONDS = 60


def _client_key(request: Request) -> str:
    api_key = request.headers.get("X-API-Key", "").strip()
    if api_key:
        return f"key:{api_key[:16]}"
    auth = request.headers.get("Authorization", "")
    if auth.startswith("Bearer "):
        return f"jwt:{auth[7:24]}"
    host = request.client.host if request.client else "unknown"
    return f"ip:{host}"


def check_integration_rate_limit(request: Request) -> None:
    if not request.url.path.startswith("/api/v1/integrations"):
        return
    key = _client_key(request)
    now = time.monotonic()
    with _RATE_LOCK:
        bucket = _RATE_BUCKETS[key]
        while bucket and now - bucket[0] > RATE_WINDOW_SECONDS:
            bucket.popleft()
        if len(bucket) >= RATE_LIMIT_PER_MINUTE:
            raise HTTPException(
                429,
                "Çok fazla istek. Lütfen kısa bir süre bekleyip tekrar deneyin.",
            )
        bucket.append(now)


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        try:
            check_integration_rate_limit(request)
        except HTTPException as exc:
            return JSONResponse(
                status_code=exc.status_code,
                content={"ok": False, "detail": exc.detail},
            )
        response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()"
        return response
