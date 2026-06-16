"""HypeVision örnek gönderim scriptleri — ortak API istemcisi."""

from __future__ import annotations

import mimetypes
import sys
from pathlib import Path

import requests
from requests.exceptions import ConnectionError, ReadTimeout, RequestException

BACKEND_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BACKEND_DIR))

from scripts._common import DEFAULT_BASE, api_headers, load_demo_api_key  # noqa: E402

DEMO_USER = {
    "id": "u-hype-demo",
    "email": "demo@hypevisionlab.com",
    "password": "demo123",
}

API_DOWN_MSG = (
    "API yanit vermiyor ({base}).\n"
    "  1) Acik tum 'HypeVision API' pencerelerini kapat\n"
    "  2) Proje kokunden run.bat calistir\n"
    "  veya: backend\\restart_api.bat"
)


def resolve_api_key(explicit: str | None = None) -> str:
    key = explicit or load_demo_api_key()
    if not key:
        raise SystemExit(
            "API anahtari bulunamadi.\n"
            "  Admin panel -> Hype Demo -> API Anahtari olusturun\n"
            "  veya: backend/data/.demo-api-key dosyasina yapistirin"
        )
    return key


def _request(method: str, url: str, **kwargs) -> requests.Response:
    base = kwargs.pop("base_hint", DEFAULT_BASE)
    try:
        return requests.request(method, url, **kwargs)
    except (ReadTimeout, ConnectionError) as e:
        raise SystemExit(API_DOWN_MSG.format(base=base) + f"\n\nHata: {e}") from e
    except RequestException as e:
        raise SystemExit(f"Istek basarisiz: {e}") from e


def check_health(base: str, api_key: str) -> dict:
    r = _request(
        "GET",
        f"{base}/api/v1/integrations/health",
        headers=api_headers(api_key),
        timeout=8,
        base_hint=base,
    )
    r.raise_for_status()
    return r.json()


def send_text(
    *,
    baslik: str,
    detay: str = "",
    kategori: str = "Sistem",
    seviye: str = "bilgi",
    kamera: str = "",
    modul: str = "",
    api_key: str,
    base: str = DEFAULT_BASE,
) -> dict:
    r = _request(
        "POST",
        f"{base}/api/v1/integrations/notification",
        headers={**api_headers(api_key), "Content-Type": "application/json"},
        json={
            "baslik": baslik,
            "detay": detay,
            "kategori": kategori,
            "seviye": seviye,
            "kamera": kamera,
            "modul": modul,
        },
        timeout=30,
        base_hint=base,
    )
    print(f"HTTP {r.status_code}")
    data = r.json()
    if not r.ok:
        raise SystemExit(data)
    return data


def send_detect_upload(
    *,
    image_path: Path,
    payload: dict,
    api_key: str,
    base: str = DEFAULT_BASE,
) -> dict:
    import json as json_mod

    if not image_path.exists():
        raise SystemExit(f"Gorsel bulunamadi: {image_path}")

    mime, _ = mimetypes.guess_type(str(image_path))
    mime = mime or "image/jpeg"

    with image_path.open("rb") as f:
        r = _request(
            "POST",
            f"{base}/api/v1/integrations/notification/detect/upload",
            headers=api_headers(api_key),
            data={"payload": json_mod.dumps(payload, ensure_ascii=False)},
            files={"gorsel": (image_path.name, f, mime)},
            timeout=60,
            base_hint=base,
        )

    print(f"HTTP {r.status_code}")
    data = r.json()
    if not r.ok:
        raise SystemExit(data)
    return data


def send_with_image(
    *,
    image_path: Path,
    baslik: str,
    detay: str = "",
    kategori: str = "Sistem",
    seviye: str = "bilgi",
    kamera: str = "",
    modul: str = "",
    api_key: str,
    base: str = DEFAULT_BASE,
) -> dict:
    if not image_path.exists():
        raise SystemExit(f"Görsel bulunamadı: {image_path}")

    mime, _ = mimetypes.guess_type(str(image_path))
    mime = mime or "image/jpeg"

    with image_path.open("rb") as f:
        r = _request(
            "POST",
            f"{base}/api/v1/integrations/notification/upload",
            headers=api_headers(api_key),
            data={
                "baslik": baslik,
                "detay": detay,
                "kategori": kategori,
                "seviye": seviye,
                "kamera": kamera,
                "modul": modul,
            },
            files={"gorsel": (image_path.name, f, mime)},
            timeout=60,
            base_hint=base,
        )

    print(f"HTTP {r.status_code}")
    data = r.json()
    if not r.ok:
        raise SystemExit(data)
    return data


def print_result(data: dict) -> None:
    n = data.get("notification", {})
    print(f"OK Bildirim #{n.get('id')} -> {n.get('baslik')}")
    if n.get("gorsel"):
        print(f"  Görsel: {n['gorsel']}")
    print("  Panelde toast + Son Bildirimler listesinde görünmeli.")
