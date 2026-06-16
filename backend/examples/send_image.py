#!/usr/bin/env python3
"""
Yapilandirilmis JSON algilama bildirimi + gorsel gonderir.

Kullanim:
  python examples/send_image.py
  python examples/send_image.py --json examples/send_detect.json --image data/tmp-test.png
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
    check_health,
    print_result,
    resolve_api_key,
    send_detect_upload,
)

EXAMPLES_DIR = Path(__file__).resolve().parent
DEFAULT_JSON = EXAMPLES_DIR / "send_detect.json"
DEFAULT_IMAGE = Path(__file__).resolve().parent.parent / "data" / "tmp-test.png"


def main():
    p = argparse.ArgumentParser(description="HypeVision — JSON algilama + gorsel")
    p.add_argument("--base", default=DEFAULT_BASE)
    p.add_argument("--api-key", default=None)
    p.add_argument("--json", default=str(DEFAULT_JSON), help="Algilama JSON dosyasi")
    p.add_argument("--image", default=str(DEFAULT_IMAGE), help="Gorsel dosya yolu")
    args = p.parse_args()

    json_path = Path(args.json)
    image_path = Path(args.image)
    if not json_path.exists():
        raise SystemExit(f"JSON bulunamadi: {json_path}")
    if not image_path.exists():
        raise SystemExit(f"Gorsel bulunamadi: {image_path}")

    payload = json.loads(json_path.read_text(encoding="utf-8"))
    if "zaman" not in payload:
        payload["zaman"] = datetime.now(timezone.utc).isoformat(timespec="seconds")

    api_key = resolve_api_key(args.api_key)
    health = check_health(args.base, api_key)
    print(f"Bagli kullanici: {health['email']} ({health['user_id']})")
    print(f"JSON: {json_path.name}")
    print(f"Gorsel: {image_path}")

    data = send_detect_upload(
        image_path=image_path,
        payload=payload,
        api_key=api_key,
        base=args.base,
    )
    print_result(data)
    n = data.get("notification", {})
    meta = n.get("meta") or {}
    if meta:
        print(f"  Alan: {meta.get('alan')} | Guven: {meta.get('guven')} | Zaman: {meta.get('zaman')}")


if __name__ == "__main__":
    main()
