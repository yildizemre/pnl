"""HypeVision örnek gönderim scriptleri — ortak API istemcisi."""

from __future__ import annotations

import mimetypes
import sys
from pathlib import Path

import requests
from requests.exceptions import ConnectionError, ReadTimeout, RequestException

BACKEND_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BACKEND_DIR))

from scripts._common import DEFAULT_BASE, admin_create_api_key, api_headers, load_demo_api_key, login  # noqa: E402

DEMO_USER = {
    "id": "u-hype-demo",
    "email": "demo@hypevisionlab.com",
    "password": "demo123",
}

# Yangın örneği için varsayılan müşteri (script içinde oluşturulur)
YANGIN_DEMO = {
    "email": "yangin-demo@hypevisionlab.com",
    "password": "demo123",
    "ad": "Yangın Demo Tesis",
    "kurulum": "Montaj Hattı A",
    "kullanici_adi": "yangin-demo",
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


def key_file_for_email(email: str) -> Path:
    slug = email.split("@")[0].replace(".", "-").lower()
    return BACKEND_DIR / "data" / f".{slug}-api-key"


def provision_user_api_key(
    *,
    email: str,
    password: str,
    ad: str,
    kurulum: str = "Demo Tesis",
    kullanici_adi: str | None = None,
    rol: str = "user",
    admin_email: str = "admin@hypevisionlab.com",
    admin_password: str = "admin",
    base: str = DEFAULT_BASE,
    key_file: Path | None = None,
    force_new_key: bool = False,
) -> tuple[str, dict]:
    """Admin ile kullanıcı oluşturur (yoksa), API key üretir, dosyaya kaydeder."""
    path = key_file or key_file_for_email(email)
    if path.exists() and not force_new_key:
        key = path.read_text(encoding="utf-8").strip()
        if key:
            print(f"Mevcut API anahtari: {path.name}")
            return key, {"email": email, "from_cache": True}

    token = login(admin_email, admin_password, base)
    r = _request(
        "GET",
        f"{base}/api/admin/users",
        headers={"Authorization": f"Bearer {token}"},
        timeout=30,
        base_hint=base,
    )
    r.raise_for_status()
    users = r.json().get("data") or []
    user = next((u for u in users if u.get("email") == email), None)

    if not user:
        kullanici = kullanici_adi or email.split("@")[0]
        r = _request(
            "POST",
            f"{base}/api/admin/users",
            headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
            json={
                "kullanici_adi": kullanici,
                "ad": ad,
                "email": email,
                "sifre": password,
                "rol": rol,
                "kurulum": kurulum,
            },
            timeout=30,
            base_hint=base,
        )
        if not r.ok:
            raise SystemExit(f"Kullanici olusturulamadi: {r.status_code} {r.text}")
        user = r.json()
        print(f"Kullanici olusturuldu: {user['email']} (id={user['id']})")
        print(f"  Panel giris: {email} / {password}")
    else:
        print(f"Mevcut kullanici: {user['email']} (id={user['id']})")

    api_key = admin_create_api_key(user["id"], "Script entegrasyon", token, base)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(api_key, encoding="utf-8")
    print(f"API anahtari kaydedildi: {path}")
    print(f"  Key: {api_key[:20]}… (tamami dosyada)")
    return api_key, user


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


def send_mes_tick(
    *,
    camera_id: str,
    stations: list[dict],
    api_key: str,
    observed_at: str | None = None,
    interval_minutes: int = 30,
    tarih: str | None = None,
    base: str = DEFAULT_BASE,
) -> dict:
    body = {
        "camera_id": camera_id,
        "interval_minutes": interval_minutes,
        "stations": stations,
    }
    if observed_at:
        body["observed_at"] = observed_at
    if tarih:
        body["tarih"] = tarih
    r = _request(
        "POST",
        f"{base}/api/v1/integrations/mes/tick",
        headers={**api_headers(api_key), "Content-Type": "application/json"},
        json=body,
        timeout=30,
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
