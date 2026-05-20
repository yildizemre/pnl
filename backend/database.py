from __future__ import annotations

import uuid
from datetime import datetime, timezone

from passlib.context import CryptContext

pwd = CryptContext(schemes=["pbkdf2_sha256"], deprecated="auto")

MODULES = ["isg", "sayim", "urun", "mes", "genel"]


def _cams(n: int, prefix: str):
    return [
        {
            "id": f"{prefix.lower()}-cam-{i}",
            "ad": f"{prefix} Kamera {i}",
            "rtsp": f"rtsp://192.168.1.{10 + i}:554/stream",
            "modul": MODULES[i % len(MODULES)],
            "token": f"tok_{prefix.lower()}_{i}",
        }
        for i in range(1, n + 1)
    ]


USERS: list[dict] = [
    {"id": "u-admin", "kullanici_adi": "admin", "ad": "Derebaşı", "email": "admin@vislivis.com", "sifre": "admin", "rol": "admin", "kurulum": "", "kameralar": [], "onboarding_done": True, "dashboard_layout": {}},
    {"id": "u-isg", "kullanici_adi": "isg", "ad": "Ayşe İSG", "email": "isg@vislivis.com", "sifre": "demo", "rol": "isg", "kurulum": "Boyner İstinye Park", "kameralar": _cams(4, "ISG")},
    {"id": "u-operator", "kullanici_adi": "operator", "ad": "Mehmet Operatör", "email": "operator@vislivis.com", "sifre": "demo", "rol": "operator", "kurulum": "Boyner İstinye Park", "kameralar": _cams(2, "Op")},
    {"id": "u-mudur", "kullanici_adi": "mudur", "ad": "Can Müdür", "email": "mudur@vislivis.com", "sifre": "demo", "rol": "uretim_muduru", "kurulum": "Boyner İstinye Park", "kameralar": _cams(6, "Uretim")},
    {"id": "u-demo", "kullanici_adi": "demo", "ad": "demo", "email": "demo@vislivis.com", "sifre": "demo", "rol": "user", "kurulum": "Boyner İstinye Park", "kameralar": _cams(8, "Boyner")},
    {"id": "u-emilio", "kullanici_adi": "emilio", "ad": "emilio", "email": "emilio@vislivis.com", "sifre": "emilio", "rol": "user", "kurulum": "Emilio Demo Magaza", "kameralar": _cams(8, "Emilio")},
    {"id": "u-kasim", "kullanici_adi": "kasim", "ad": "Kasım", "email": "kasim@vislivis.com.tr", "sifre": "kasim", "rol": "admin", "kurulum": "", "kameralar": []},
    {"id": "u-kasimemre", "kullanici_adi": "kasimemre", "ad": "kasimemre", "email": "kasimemre@vislivis.com", "sifre": "demo", "rol": "user", "kurulum": "Kasim Emre Demo", "kameralar": _cams(4, "KE")},
    {"id": "u-paket", "kullanici_adi": "paket", "ad": "paket", "email": "paket@vislivis.com", "sifre": "demo", "rol": "user", "kurulum": "Paket Demo Magaza", "kameralar": _cams(6, "Paket")},
    {"id": "u-axis", "kullanici_adi": "axis", "ad": "Axis", "email": "axis@vislivis.com", "sifre": "demo", "rol": "user", "kurulum": "Axis Mağaza", "kameralar": _cams(1, "Axis")},
    {"id": "u-yargici", "kullanici_adi": "yargici", "ad": "Yargıcı", "email": "yargici@vislivis.com.tr", "sifre": "demo", "rol": "user", "kurulum": "", "kameralar": []},
    {"id": "u-deneme", "kullanici_adi": "deneme", "ad": "deneme", "email": "deneme@vislivis.com", "sifre": "demo", "rol": "user", "kurulum": "", "kameralar": []},
]

NOTIFICATIONS_STORE: list[dict] = []
HEARTBEATS: dict[str, dict] = {}
_next_notif_id = 1


def hash_password(p: str) -> str:
    return pwd.hash(p)


def verify_password(plain: str, hashed: str) -> bool:
    return pwd.verify(plain, hashed)


def init_passwords():
    for u in USERS:
        u["sifre_hash"] = hash_password(u.pop("sifre", "demo"))


def user_public(u: dict) -> dict:
    from roles import modules_for_role

    return {
        "id": u["id"],
        "kullanici_adi": u["kullanici_adi"],
        "ad": u["ad"],
        "email": u["email"],
        "rol": u["rol"],
        "kurulum": u.get("kurulum", ""),
        "kamera_sayisi": len(u.get("kameralar", [])),
        "kameralar": u.get("kameralar", []),
        "moduller": modules_for_role(u["rol"]),
        "onboarding_done": u.get("onboarding_done", False),
        "dashboard_layout": u.get("dashboard_layout", {}),
    }


def find_user_by_email(email: str) -> dict | None:
    e = email.strip().lower()
    for u in USERS:
        if u["email"].lower() == e:
            return u
    return None


def find_user_by_id(uid: str) -> dict | None:
    for u in USERS:
        if u["id"] == uid:
            return u
    return None


def create_user(data: dict) -> dict:
    user = {
        "id": f"u-{uuid.uuid4().hex[:8]}",
        "kullanici_adi": data["kullanici_adi"],
        "ad": data["ad"],
        "email": data["email"].lower(),
        "sifre_hash": hash_password(data["sifre"]),
        "rol": data.get("rol", "user"),
        "kurulum": data.get("kurulum", ""),
        "kameralar": [],
    }
    USERS.append(user)
    return user


def record_heartbeat(user_id: str, camera_id: str | None = None):
    HEARTBEATS[user_id] = {
        "zaman": datetime.now(timezone.utc).isoformat(),
        "camera_id": camera_id,
    }


def heartbeat_active(user_id: str, max_seconds: int = 90) -> bool:
    hb = HEARTBEATS.get(user_id)
    if not hb:
        return False
    t = datetime.fromisoformat(hb["zaman"].replace("Z", "+00:00"))
    return (datetime.now(timezone.utc) - t).total_seconds() < max_seconds


init_passwords()
