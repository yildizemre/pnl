#!/usr/bin/env python3
"""
Yangın bildirimi — script yanındaki PNG okunur, kullanıcı+API key oluşturulur, gönderilir.

  cd backend
  python examples/send_yangin.py
"""

from __future__ import annotations

import argparse
import json
import sys
from datetime import datetime, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from examples._client import (  # noqa: E402
    DEFAULT_BASE,
    YANGIN_DEMO,
    check_health,
    print_result,
    provision_user_api_key,
    resolve_api_key,
    send_detect_upload,
)

# Script ile aynı klasördeki örnek kare
YANGIN_IMAGE = Path(__file__).resolve().parent / "73c276dbd8e14f2fa6ddb15ec87a49b9.png"


def fire_payload() -> dict:
    return {
        "baslik": "Yangın algılandı — Montaj Hattı A",
        "detay": "Kamera 03: alev/duman skoru yüksek. Tahliye prosedürünü başlatın.",
        "kategori": "Yangın",
        "seviye": "kritik",
        "kamera": "Kamera 03",
        "modul": "Yangın/Duman AI",
        "alan": "Montaj Hattı A",
        "guven": 0.94,
        "zaman": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "model": "yangin-v1",
        "kamera_id": "kamera-03",
    }


def main():
    if not YANGIN_IMAGE.is_file():
        raise SystemExit(f"Gorsel yok (script yaninda olmali): {YANGIN_IMAGE}")

    p = argparse.ArgumentParser(description="HypeVision — yangin + gorsel")
    p.add_argument("--base", default=DEFAULT_BASE)
    p.add_argument("--api-key", default=None)
    p.add_argument("--email", default=YANGIN_DEMO["email"])
    p.add_argument("--password", default=YANGIN_DEMO["password"])
    p.add_argument("--ad", default=YANGIN_DEMO["ad"])
    p.add_argument("--kurulum", default=YANGIN_DEMO["kurulum"])
    p.add_argument("--admin-email", default="admin@hypevisionlab.com")
    p.add_argument("--admin-password", default="admin")
    p.add_argument("--new-key", action="store_true")
    p.add_argument("--use-demo-key", action="store_true")
    args = p.parse_args()

    if args.api_key:
        api_key = args.api_key
    elif args.use_demo_key:
        api_key = resolve_api_key()
    else:
        print("--- Kullanici + API anahtari ---")
        api_key, _ = provision_user_api_key(
            email=args.email,
            password=args.password,
            ad=args.ad,
            kurulum=args.kurulum,
            kullanici_adi=args.email.split("@")[0],
            admin_email=args.admin_email,
            admin_password=args.admin_password,
            base=args.base,
            force_new_key=args.new_key,
        )

    print("\n--- Yangin + gorsel gonder ---")
    health = check_health(args.base, api_key)
    print(f"Bagli: {health['email']} ({health['user_id']})")
    print(f"Gorsel okunuyor: {YANGIN_IMAGE.name} ({YANGIN_IMAGE.stat().st_size // 1024} KB)")

    payload = fire_payload()
    print(f"Payload: {json.dumps(payload, ensure_ascii=False)}")

    data = send_detect_upload(
        image_path=YANGIN_IMAGE,
        payload=payload,
        api_key=api_key,
        base=args.base,
    )
    print_result(data)
    print(f"\nPanel: {args.email} / {args.password} -> Isg & Guvenlik")


if __name__ == "__main__":
    main()
