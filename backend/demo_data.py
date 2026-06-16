"""Demo kullanıcı için sabit günlük KPI üretimi (her tarih aynı kalır)."""

from __future__ import annotations

from datetime import datetime, timedelta

from mock_data import CAT_SLUG, NOTIF_SEED

DEMO_EMAIL = "demo@hypevisionlab.com"
DEMO_USER_ID = "u-hype-demo"
DEMO_PASSWORD = "demo123"

ADMIN_EMAIL = "admin@hypevisionlab.com"
ADMIN_USER_ID = "u-hype-admin"
ADMIN_PASSWORD = "admin"

# Bildirim seed sürümü — artınca mevcut DB yeniden doldurulur
NOTIFICATION_SEED_VERSION = 2
MIN_PANEL_NOTIFICATIONS = 400

PANEL_DEMO_USER_IDS = {
    DEMO_USER_ID,
    "u-demo",
    "u-mudur",
    "u-isg",
    "u-operator",
    "u-emilio",
    "u-kasimemre",
    "u-paket",
}


def date_range(days: int = 90) -> list[str]:
    base = datetime.now().date()
    return [(base - timedelta(days=i)).isoformat() for i in range(days)]


def _seed_int(tarih: str, salt: int = 0) -> int:
    return int(tarih.replace("-", "")) + salt


def kpi_for_date(tarih: str) -> dict:
    """Deterministik — aynı tarih her zaman aynı değer."""
    d = _seed_int(tarih)
    return {
        "tarih": tarih,
        "urun_toplam": 1580 + (d % 420),
        "verimlilik": round(87.5 + (d % 11) * 0.55, 1),
        "isg_ihlal": 1 + (d % 6),
        "personel_aktif": 34 + (d % 8),
        "bildirim_sayisi": 3 + (d % 9),
        "log_sayisi": 12 + (d % 25),
        "kamera_aktif": 10 + (d % 3),
    }


def product_for_date(tarih: str) -> dict:
    d = _seed_int(tarih, 7)
    mult = 0.82 + (d % 20) / 100
    toplam = int(1650 * mult)
    base = datetime.strptime(tarih, "%Y-%m-%d").date()
    gunluk_trend = []
    for i in range(6, -1, -1):
        day = base - timedelta(days=i)
        dd = _seed_int(day.isoformat(), 3)
        gunluk_trend.append({
            "gun": day.strftime("%d.%m"),
            "adet": int(1500 * (0.78 + (dd % 22) / 100)),
        })
    return {
        "toplam": toplam,
        "hatlar": [
            {"hat": "Montaj Hattı A", "adet": int(toplam * 0.22)},
            {"hat": "Montaj Hattı B", "adet": int(toplam * 0.21)},
            {"hat": "Paketleme", "adet": int(toplam * 0.28)},
            {"hat": "Sevkiyat Palet", "adet": int(toplam * 0.17)},
            {"hat": "Kalite Kontrol", "adet": int(toplam * 0.12)},
        ],
        "saatlik": [
            {"saat": f"{h:02d}:00", "adet": int(toplam * (0.05 + i * 0.12))}
            for i, h in enumerate([6, 8, 10, 12, 14, 16, 18])
        ],
        "gunluk_trend": gunluk_trend,
        "urun_turleri": [
            {"tur": "Koli (A Tipi)", "adet": int(toplam * 0.38)},
            {"tur": "Koli (B Tipi)", "adet": int(toplam * 0.27)},
            {"tur": "Palet", "adet": int(toplam * 0.2)},
            {"tur": "Tekil Parça", "adet": int(toplam * 0.15)},
        ],
    }


def mes_productivity_for_date(tarih: str) -> dict:
    k = kpi_for_date(tarih)
    personeller = personnel_for_date(tarih)
    return {
        "tarih": tarih,
        "ortalama_verimlilik": k["verimlilik"],
        "aktif_personel": k["personel_aktif"],
        "personeller": personeller,
        "vardiya_trend": [
            {"vardiya": "06-14", "verimlilik": round(k["verimlilik"] - 2.1, 1)},
            {"vardiya": "14-22", "verimlilik": round(k["verimlilik"] + 0.6, 1)},
            {"vardiya": "22-06", "verimlilik": round(k["verimlilik"] - 4.9, 1)},
        ],
    }


STAT_COLORS = {
    "Yangın": "#ef4444",
    "Duman": "#f97316",
    "Düşme": "#dc2626",
    "İSG": "#f59e0b",
    "Yasak Bölge": "#8b5cf6",
    "Üretim": "#6366f1",
    "MES": "#22c55e",
    "Kalite": "#3b82f6",
    "Sistem": "#64748b",
}

SEV_DURUM = {
    "kritik": "Kritik",
    "uyari": "Uyarı",
    "bilgi": "Bilgi",
    "basari": "Başarılı",
    "normal": "Normal",
}


def notification_stats_all(notifications: list[dict]) -> list[dict]:
    counts: dict[str, int] = {}
    for n in notifications:
        cat = n.get("kategori") or "Sistem"
        counts[cat] = counts.get(cat, 0) + 1
    if not counts:
        return []
    return [
        {"kategori": k, "adet": v, "renk": STAT_COLORS.get(k, "#94a3b8")}
        for k, v in sorted(counts.items(), key=lambda x: -x[1])
    ]


def detection_logs_from_notifications(notifications: list[dict], fallback: list[dict]) -> list[dict]:
    if not notifications:
        return []
    out = []
    for n in notifications[:24]:
        sev = n.get("seviye") or "bilgi"
        out.append({
            "zaman": n.get("zaman") or "—",
            "kamera": n.get("kamera") or "—",
            "modul": n.get("modul") or n.get("kategori") or "—",
            "durum": SEV_DURUM.get(sev, "Bilgi"),
            "tip": sev if sev in ("kritik", "uyari", "bilgi", "basari", "normal") else "bilgi",
            "tarih": n.get("tarih") or "",
        })
    return out


def personnel_for_date(tarih: str) -> list[dict]:
    from mock_data import PERSONNEL_LIST

    d = _seed_int(tarih, 13)
    out = []
    for i, p in enumerate(PERSONNEL_LIST):
        v = p["verimlilik"] + ((d + i * 3) % 9) - 4
        v = max(78, min(99, round(v, 1)))
        out.append({**p, "tarih": tarih, "verimlilik": v})
    return out


def notification_templates() -> list[tuple]:
    return [(t[0], t[1], t[2], t[3]) for t in NOTIF_SEED]


def build_panel_notifications(user_id: str, days: int = 90) -> list[dict]:
    """Kullanıcı başına 90 günlük zengin bildirim dummy verisi (görselli)."""
    dates = date_range(days)
    user_salt = sum(ord(c) for c in user_id) % 17
    out: list[dict] = []
    nid = 1
    for day, tarih in enumerate(dates):
        if day == 0:
            indices = range(len(NOTIF_SEED))
        elif day < 7:
            indices = [i for i in range(len(NOTIF_SEED)) if (day + i + user_salt) % 3 != 2]
        else:
            indices = [i for i in range(len(NOTIF_SEED)) if (day * 2 + i + user_salt) % 5 != 4]
        for i in indices:
            tpl = NOTIF_SEED[i]
            cat, baslik, sev, kam, detay, modul = tpl
            h = 6 + (day + i * 2 + user_salt) % 12
            m = (day * 17 + i * 11 + user_salt) % 60
            is_today = day == 0
            okundu = not is_today and (day + i + user_salt) % 3 == 0
            if is_today and sev in ("kritik", "uyari"):
                okundu = False
            out.append({
                "user_id": user_id,
                "tarih": tarih,
                "zaman": f"{h:02d}:{m:02d}",
                "kamera": kam,
                "kategori": cat,
                "baslik": baslik,
                "detay": detay,
                "seviye": sev,
                "modul": modul,
                "gorsel": f"/api/placeholder/{CAT_SLUG.get(cat, 'sistem')}-{(nid + i + user_salt) % 5 + 1}.jpg",
                "okundu": okundu,
            })
            nid += 1
    return out


def notification_needs_reseed(notifications: list[dict]) -> bool:
    if len(notifications) < MIN_PANEL_NOTIFICATIONS:
        return True
    yangin = sum(1 for n in notifications if n.get("kategori") == "Yangın")
    dusme = sum(1 for n in notifications if n.get("kategori") == "Düşme")
    with_image = sum(1 for n in notifications if n.get("gorsel"))
    return yangin < 5 or dusme < 5 or with_image < len(notifications) * 0.8


def _cat_slug(cat: str) -> str:
    return CAT_SLUG.get(cat, "sistem")


def notification_for_day(tarih: str, user_id: str, start_id: int) -> tuple[list[dict], int]:
    """Geriye dönük uyumluluk — tek gün üretir."""
    d = _seed_int(tarih, 99)
    user_salt = sum(ord(c) for c in user_id) % 17
    day_idx = date_range(90).index(tarih) if tarih in date_range(90) else d % 90
    if day_idx == 0:
        indices = range(len(NOTIF_SEED))
    elif day_idx < 7:
        indices = [i for i in range(len(NOTIF_SEED)) if (day_idx + i + user_salt) % 3 != 2]
    else:
        indices = [i for i in range(len(NOTIF_SEED)) if (day_idx * 2 + i + user_salt) % 5 != 4]
    rows = []
    for i in indices:
        tpl = NOTIF_SEED[i]
        cat, baslik, sev, kam, detay, modul = tpl
        rows.append({
            "user_id": user_id,
            "tarih": tarih,
            "zaman": f"{9 + (d + i) % 8:02d}:{(15 + (d * 3 + i) % 40):02d}",
            "kamera": kam,
            "kategori": cat,
            "baslik": baslik,
            "detay": detay,
            "seviye": sev,
            "modul": modul,
            "gorsel": f"/api/placeholder/{_cat_slug(cat)}-{(start_id + i) % 5 + 1}.jpg",
            "okundu": i % 2 == 1 and tarih != date_range(90)[0],
        })
    return rows, start_id + len(rows)
