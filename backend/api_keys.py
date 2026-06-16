"""API anahtarı üretimi ve doğrulama (mobil / harici entegrasyon)."""

from __future__ import annotations

import hashlib
import secrets

from passlib.context import CryptContext

_pwd = CryptContext(schemes=["pbkdf2_sha256"], deprecated="auto")
KEY_PREFIX = "hv_live_"


def generate_api_key() -> tuple[str, str, str]:
    """Ham anahtar, hash ve görünen önek döner."""
    raw = KEY_PREFIX + secrets.token_urlsafe(32)
    key_hash = _pwd.hash(raw)
    visible = raw[:16] + "…"
    return raw, key_hash, visible


def verify_api_key(raw: str, key_hash: str) -> bool:
    if not raw or not key_hash:
        return False
    try:
        return _pwd.verify(raw, key_hash)
    except Exception:
        return False


def key_fingerprint(raw: str) -> str:
    return hashlib.sha256(raw.encode()).hexdigest()[:12]
