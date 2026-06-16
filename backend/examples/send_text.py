#!/usr/bin/env python3
"""
Demo kullanıcıya metin bildirimi gönderir.

Kullanım:
  python examples/send_text.py
  python examples/send_text.py --baslik "Hat duruşu" --seviye kritik --kategori Üretim
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from examples._client import (  # noqa: E402
    DEFAULT_BASE,
    check_health,
    print_result,
    resolve_api_key,
    send_text,
)


def main():
    p = argparse.ArgumentParser(description="HypeVision — metin bildirimi gönder")
    p.add_argument("--base", default=DEFAULT_BASE)
    p.add_argument("--api-key", default=None)
    p.add_argument("--baslik", default="Script testi — metin bildirim")
    p.add_argument("--detay", default="examples/send_text.py ile gönderildi")
    p.add_argument("--kategori", default="İSG")
    p.add_argument("--seviye", default="uyari", choices=["kritik", "uyari", "bilgi"])
    p.add_argument("--kamera", default="Montaj Hattı A — Giriş")
    p.add_argument("--modul", default="Baret Algılama")
    args = p.parse_args()

    api_key = resolve_api_key(args.api_key)
    health = check_health(args.base, api_key)
    print(f"Bağlı kullanıcı: {health['email']} ({health['user_id']})")

    data = send_text(
        baslik=args.baslik,
        detay=args.detay,
        kategori=args.kategori,
        seviye=args.seviye,
        kamera=args.kamera,
        modul=args.modul,
        api_key=api_key,
        base=args.base,
    )
    print_result(data)


if __name__ == "__main__":
    main()
