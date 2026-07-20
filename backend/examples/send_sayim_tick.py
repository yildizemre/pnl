"""Demo: YOLO sayım tick gönderimi (cycle_seconds ile)."""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from _client import api_post, load_env  # noqa: E402


def main():
    load_env()
    p = argparse.ArgumentParser(description="Sayım tick gönder")
    p.add_argument("--station", default="ST-01")
    p.add_argument("--name", default="Sevkiyat Çıkışı")
    p.add_argument("--hat", default="Hat 1")
    p.add_argument("--count", type=int, default=1)
    p.add_argument("--cycle", type=float, default=15.0, help="Önceki sayımdan bu yana saniye")
    p.add_argument("--camera", default="cam-sayim-01")
    args = p.parse_args()

    body = {
        "camera_id": args.camera,
        "stations": [
            {
                "station_id": args.station,
                "station_name": args.name,
                "hat": args.hat,
                "count": args.count,
                "cycle_seconds": args.cycle,
            }
        ],
    }
    res = api_post("/api/v1/integrations/sayim/tick", body)
    print(res)


if __name__ == "__main__":
    main()
