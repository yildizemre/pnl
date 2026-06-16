"""Send test notification to Kelebek Mobilya IT operator."""
import json
import sys
from datetime import datetime, timezone
from pathlib import Path

import requests

BACKEND = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BACKEND))

from examples._client import check_health, print_result, send_detect_upload  # noqa: E402
from scripts._common import DEFAULT_BASE, admin_create_api_key, login  # noqa: E402

USER_ID = "u-71adf683"
IMAGE = BACKEND / "examples" / "73c276dbd8e14f2fa6ddb15ec87a49b9.png"
KEY_FILE = BACKEND / "data" / ".kelebek-api-key"

payload = {
    "baslik": "Kamera 1 — operatör test bildirimi",
    "detay": "Kelebek Mobilya IT için örnek algılama bildirimi.",
    "kategori": "İSG",
    "seviye": "uyari",
    "kamera": "kamera1",
    "modul": "Baret Algılama",
    "alan": "Kamera 1",
    "guven": 0.91,
    "zaman": datetime.now(timezone.utc).isoformat(timespec="seconds"),
    "model": "baret-v2",
    "kamera_id": "kamera1",
}


def resolve_kelebek_key() -> str:
    if KEY_FILE.exists():
        return KEY_FILE.read_text(encoding="utf-8").strip()
    token = login("admin@hypevisionlab.com", "admin")
    raw = admin_create_api_key(USER_ID, "Script test", token)
    KEY_FILE.write_text(raw, encoding="utf-8")
    print(f"API anahtari olusturuldu: {KEY_FILE}")
    return raw


def main():
    if not IMAGE.exists():
        raise SystemExit(f"Gorsel bulunamadi: {IMAGE}")

    api_key = resolve_kelebek_key()
    health = check_health(DEFAULT_BASE, api_key)
    print(f"Bagli kullanici: {health['email']} ({health['user_id']})")
    print(f"Gorsel: {IMAGE.name}")
    print(f"Kamera: kamera1")
    print(f"Payload: {json.dumps(payload, ensure_ascii=False)}")

    data = send_detect_upload(
        image_path=IMAGE,
        payload=payload,
        api_key=api_key,
        base=DEFAULT_BASE,
    )
    print_result(data)


if __name__ == "__main__":
    main()
