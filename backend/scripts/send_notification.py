#!/usr/bin/env python3
"""
Örnek bildirim gönderir (görsel opsiyonel).

Kullanım:
  python scripts/send_notification.py --baslik "Yangın algılandı" --kategori Yangın --seviye kritik
  python scripts/send_notification.py --image ./ornek.jpg --baslik "İSG ihlali" --kategori İSG
  python scripts/send_notification.py --api-key hv_live_xxx --baslik "Test"

API anahtarı yoksa backend/data/.demo-api-key dosyası okunur (ilk kurulumda otomatik oluşur).
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

import requests

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from scripts._common import DEFAULT_BASE, api_headers, load_demo_api_key  # noqa: E402


def main():
    p = argparse.ArgumentParser(description="HypeVision — örnek bildirim gönder")
    p.add_argument("--base", default=DEFAULT_BASE)
    p.add_argument("--api-key", default=None)
    p.add_argument("--baslik", required=True)
    p.add_argument("--detay", default="Script ile gönderilen test bildirimi")
    p.add_argument("--kategori", default="Sistem")
    p.add_argument("--seviye", default="uyari", choices=["kritik", "uyari", "bilgi"])
    p.add_argument("--kamera", default="Kamera 01 — Giriş")
    p.add_argument("--modul", default="AI Algılama")
    p.add_argument("--image", default=None, help="Görsel dosya yolu (jpg/png)")
    args = p.parse_args()

    api_key = args.api_key or load_demo_api_key()
    if not api_key:
        print("API anahtarı bulunamadı. Admin panelden oluşturun veya --api-key verin.")
        sys.exit(1)

    headers = api_headers(api_key)

    if args.image:
        path = Path(args.image)
        if not path.exists():
            print(f"Görsel bulunamadı: {path}")
            sys.exit(1)
        with path.open("rb") as f:
            r = requests.post(
                f"{args.base}/api/v1/integrations/notification/upload",
                headers=headers,
                data={
                    "baslik": args.baslik,
                    "detay": args.detay,
                    "kategori": args.kategori,
                    "seviye": args.seviye,
                    "kamera": args.kamera,
                    "modul": args.modul,
                },
                files={"gorsel": (path.name, f, "image/jpeg")},
                timeout=60,
            )
    else:
        r = requests.post(
            f"{args.base}/api/v1/integrations/notification",
            headers={**headers, "Content-Type": "application/json"},
            json={
                "baslik": args.baslik,
                "detay": args.detay,
                "kategori": args.kategori,
                "seviye": args.seviye,
                "kamera": args.kamera,
                "modul": args.modul,
            },
            timeout=30,
        )

    print(f"HTTP {r.status_code}")
    try:
        data = r.json()
        print(data)
        if r.ok:
            n = data.get("notification", {})
            print(f"\n✓ Bildirim #{n.get('id')} gönderildi — panelde popup görünmeli.")
    except Exception:
        print(r.text)
        sys.exit(1 if not r.ok else 0)

    if not r.ok:
        sys.exit(1)


if __name__ == "__main__":
    main()
