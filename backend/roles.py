"""Rol → görünür menü modülleri."""

from __future__ import annotations

ROLE_MODULES: dict[str, list[str]] = {
    "admin": ["ana", "bildirimler", "mes", "raporlar", "uyelik", "ayarlar"],
    "isg": ["ana", "bildirimler", "raporlar", "ayarlar"],
    "uretim_muduru": ["ana", "mes", "raporlar", "ayarlar"],
    "operator": ["ana", "bildirimler", "ayarlar"],
    "user": ["ana", "bildirimler", "mes", "raporlar", "ayarlar"],
}

ROLE_LABELS = {
    "admin": "Yönetici",
    "isg": "İSG Sorumlusu",
    "uretim_muduru": "Üretim Müdürü",
    "operator": "Operatör",
    "user": "Kullanıcı",
}


def modules_for_role(rol: str) -> list[str]:
    return list(ROLE_MODULES.get(rol, ROLE_MODULES["user"]))
