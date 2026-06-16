#!/usr/bin/env python3
"""
Demo kullanıcıya örnek bildirim paketi gönderir:
  1. Healthcheck + heartbeat
  2. Metin bildirim (uyarı)
  3. Görseli bildirim (kritik)

Kullanım:
  python examples/run_demo.py
"""

from __future__ import annotations

import sys
import time
from pathlib import Path

import requests

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from examples._client import (  # noqa: E402
    DEFAULT_BASE,
    DEMO_USER,
    check_health,
    print_result,
    resolve_api_key,
    send_text,
    send_with_image,
)
from scripts._common import api_headers  # noqa: E402

EXAMPLES_DIR = Path(__file__).resolve().parent
DEMO_IMAGE = EXAMPLES_DIR / "assets" / "demo-camera.jpg"


def send_heartbeat(base: str, api_key: str) -> None:
    r = requests.post(
        f"{base}/api/v1/integrations/heartbeat",
        headers={**api_headers(api_key), "Content-Type": "application/json"},
        json={"camera_id": "demo-cam-1"},
        timeout=15,
    )
    r.raise_for_status()
    print("OK Heartbeat gonderildi (AI Sunucu: Aktif)")


def main():
    api_key = resolve_api_key()
    base = DEFAULT_BASE

    print("=" * 50)
    print("HypeVision Demo Bildirim Paketi")
    print(f"Hedef: {DEMO_USER['email']}")
    print(f"API:    {base}")
    print("=" * 50)

    health = check_health(base, api_key)
    print(f"OK API baglantisi — {health['email']}\n")

    send_heartbeat(base, api_key)
    time.sleep(0.5)

    print("\n[1/2] Metin bildirim...")
    data1 = send_text(
        baslik="MES — verimlilik düşüşü",
        detay="Operatör P-007 %78 verimlilik (eşik %85)",
        kategori="MES",
        seviye="uyari",
        kamera="Montaj Hattı B — Ana",
        modul="MES Verimlilik",
        api_key=api_key,
        base=base,
    )
    print_result(data1)
    time.sleep(1)

    print("\n[2/2] Görseli bildirim...")
    data2 = send_with_image(
        image_path=DEMO_IMAGE,
        baslik="Baret tespit edilemedi",
        detay="Montaj hattı A — istasyon 3, operatör #A-12",
        kategori="İSG",
        seviye="kritik",
        kamera="Montaj Hattı A — İstasyon 3",
        modul="Baret Algılama",
        api_key=api_key,
        base=base,
    )
    print_result(data2)

    print("\n" + "=" * 50)
    print("Tamamlandı. Paneli açın:")
    print("  http://localhost:5173")
    print(f"  Giriş: {DEMO_USER['email']} / {DEMO_USER['password']}")
    print("=" * 50)


if __name__ == "__main__":
    main()
