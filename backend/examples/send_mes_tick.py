#!/usr/bin/env python3
"""
MES YOLO tick — 1 kamera, 2 personel.

Ne yapar?
  YOLO her ~30 dk bir kameradaki masaları okur:
    present=true  → o 30 dk verimli
    present=false → o 30 dk verimsiz
  Bu script JSON'u API'ye atar. Oran / bar hesabını backend yapar.
  Panel: Mes sekmesi (API key hangi üyeliğe aitse o hesap).

Kullanım:
  cd backend
  python examples/send_mes_tick.py
  python examples/send_mes_tick.py --absent P-002   # Ayşe bu tick'te yok
"""

from __future__ import annotations

import argparse
import json
import sys
from datetime import datetime
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from examples._client import DEFAULT_BASE, check_health, send_mes_tick  # noqa: E402

# Bu key hangi üyeliğe aitse Mes paneli o hesapta güncellenir
API_KEY = "hv_live_vMeomo-yAOzd-aUnQx8GUc_p9Py2xd2CORPiB22H68I"

CAMERA_ID = "Kamera 01"

# 1 kamera → 2 masa (örnek YOLO çıktısı)
STATIONS = [
    {
        "person_id": "P-001",
        "name": "Mehmet Kaya",
        "masa": "Masa A-01",
        "hat": "Montaj Hattı A",
        "present": True,
    },
    {
        "person_id": "P-002",
        "name": "Ayşe Demir",
        "masa": "Masa A-02",
        "hat": "Montaj Hattı A",
        "present": True,
    },
]


def build_stations(absent_ids: list[str]) -> list[dict]:
    out = []
    for s in STATIONS:
        row = dict(s)
        row["present"] = row["person_id"] not in absent_ids
        out.append(row)
    return out


def main():
    p = argparse.ArgumentParser(description="HypeVision — MES tick (1 kam / 2 kişi)")
    p.add_argument("--base", default=DEFAULT_BASE)
    p.add_argument("--api-key", default=API_KEY, help="X-API-Key (varsayılan script içi)")
    p.add_argument("--absent", nargs="*", default=[], help="Bu tick'te yok: P-001 P-002")
    p.add_argument("--observed-at", default=None, help="ISO zaman; boşsa şimdi")
    args = p.parse_args()

    api_key = args.api_key.strip()
    health = check_health(args.base, api_key)
    print(f"Bagli: {health['email']} ({health['user_id']})")

    stations = build_stations(args.absent)
    observed = args.observed_at or datetime.now().isoformat(timespec="seconds")
    payload = {
        "camera_id": CAMERA_ID,
        "interval_minutes": 30,
        "observed_at": observed,
        "stations": stations,
    }
    print("Gonderilen JSON:")
    print(json.dumps(payload, ensure_ascii=False, indent=2))

    data = send_mes_tick(
        camera_id=CAMERA_ID,
        stations=stations,
        observed_at=observed,
        interval_minutes=30,
        api_key=api_key,
        base=args.base,
    )

    print(
        f"\nOK slot={data.get('slot')} updated={data.get('updated')} "
        f"ort=%{data.get('ortalama_yerinde')}"
    )
    for person in data.get("personeller") or []:
        print(
            f"  {person['id']} {person['ad']}: %{person['presence_pct']} "
            f"({person['durum']}) verimli={person['yerinde_saat']}s "
            f"verimsiz={person['yok_saat']}s"
        )
    print("\nPanel -> Mes (bugunun tarihi)")


if __name__ == "__main__":
    main()
