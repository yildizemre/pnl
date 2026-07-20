"""Rol → görünür menü modülleri."""

from __future__ import annotations

# Tüm panel menüleri (admin checkbox listesi)
ALL_MODULES = ["ana", "bildirimler", "mes", "raporlar", "ayarlar"]

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

MODULE_LABELS_TR = {
    "ana": "Genel Bakış",
    "bildirimler": "İSG & Güvenlik",
    "mes": "Personel Verimliliği",
    "raporlar": "Raporlar",
    "ayarlar": "Ayarlar",
    "uyelik": "Üyelik Yönetimi",
}


def modules_for_role(rol: str) -> list[str]:
    return list(ROLE_MODULES.get(rol, ROLE_MODULES["user"]))


def normalize_modules(raw, *, rol: str = "user") -> list[str]:
    """Kullanıcıya özel modül listesini temizle; ana her zaman açık."""
    if not raw:
        return modules_for_role(rol)
    if isinstance(raw, str):
        try:
            import json

            raw = json.loads(raw)
        except (json.JSONDecodeError, TypeError):
            return modules_for_role(rol)
    if not isinstance(raw, list):
        return modules_for_role(rol)
    allowed = set(ALL_MODULES)
    out = []
    for m in raw:
        mid = str(m).strip()
        if mid in allowed and mid not in out:
            out.append(mid)
    if "ana" not in out:
        out.insert(0, "ana")
    if rol == "admin" and "uyelik" not in out:
        out.append("uyelik")
    return out