#!/usr/bin/env python3
"""HypeVision entegrasyon scriptleri — ortak yardımcılar."""

from __future__ import annotations

import argparse
import json
import os
import sys
from pathlib import Path

try:
    import requests
except ImportError:
    print("requests gerekli: pip install requests")
    sys.exit(1)

BACKEND_DIR = Path(__file__).resolve().parent.parent
DEFAULT_BASE = os.getenv("HYPEVISION_API", "http://127.0.0.1:8000")


def load_demo_api_key() -> str | None:
    key_file = BACKEND_DIR / "data" / ".demo-api-key"
    if key_file.exists():
        return key_file.read_text(encoding="utf-8").strip()
    return os.getenv("HYPEVISION_API_KEY")


def api_headers(api_key: str) -> dict:
    return {"X-API-Key": api_key, "Accept": "application/json"}


def login(email: str, password: str, base: str = DEFAULT_BASE) -> str:
    r = requests.post(f"{base}/api/auth/login", json={"email": email, "password": password}, timeout=30)
    r.raise_for_status()
    return r.json()["token"]


def admin_create_api_key(user_id: str, label: str, admin_token: str, base: str = DEFAULT_BASE) -> str:
    r = requests.post(
        f"{base}/api/admin/users/{user_id}/api-keys",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={"label": label},
        timeout=30,
    )
    r.raise_for_status()
    return r.json()["api_key"]


def parse_args_base():
    p = argparse.ArgumentParser()
    p.add_argument("--base", default=DEFAULT_BASE, help="API base URL")
    p.add_argument("--api-key", default=None, help="X-API-Key (yoksa demo anahtar dosyası)")
    return p
