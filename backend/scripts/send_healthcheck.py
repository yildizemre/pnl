#!/usr/bin/env python3
"""
AI sunucu / edge cihaz healthcheck gönderir.

Kullanım:
  python scripts/send_healthcheck.py
  python scripts/send_healthcheck.py --api-key hv_live_xxx
  python scripts/send_healthcheck.py --camera-id cam-abc123
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

import requests

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from scripts._common import DEFAULT_BASE, api_headers, load_demo_api_key  # noqa: E402


def main():
    p = argparse.ArgumentParser(description="HypeVision — healthcheck / heartbeat")
    p.add_argument("--base", default=DEFAULT_BASE)
    p.add_argument("--api-key", default=None)
    p.add_argument("--camera-id", default=None)
    args = p.parse_args()

    api_key = args.api_key or load_demo_api_key()
    if not api_key:
        print("API anahtarı bulunamadı.")
        sys.exit(1)

    headers = {**api_headers(api_key), "Content-Type": "application/json"}

    # Önce health kontrol
    h = requests.get(f"{args.base}/api/v1/integrations/health", headers=headers, timeout=15)
    print("Health:", h.status_code, h.json() if h.ok else h.text)

    # Heartbeat
    r = requests.post(
        f"{args.base}/api/v1/integrations/heartbeat",
        headers=headers,
        json={"camera_id": args.camera_id},
        timeout=15,
    )
    print("Heartbeat:", r.status_code, r.json() if r.ok else r.text)
    if not r.ok:
        sys.exit(1)
    print("\n✓ Sistem sağlığı güncellendi (AI Aktif).")


if __name__ == "__main__":
    main()
