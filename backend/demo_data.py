"""Demo kullanıcı için sabit günlük KPI üretimi (her tarih aynı kalır)."""

from __future__ import annotations

from datetime import datetime, timedelta

DEMO_EMAIL = "demo@hypevisionlab.com"
DEMO_USER_ID = "u-hype-demo"


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
        "verimlilik": round(87.5 + (d % 11) * 0.1, 1),
        "isg_ihlal": 1 + (d % 6),
        "personel_aktif": 34 + (d % 8),
        "bildirim_sayisi": 2 + (d % 9),
        "log_sayisi": 12 + (d % 25),
        "kamera_aktif": 6 + (d % 3),
    }


def product_for_date(tarih: str) -> dict:
    d = _seed_int(tarih, 7)
    mult = 0.82 + (d % 20) / 100
    toplam = int(1650 * mult)
    return {
        "toplam": toplam,
        "hatlar": [
            {"hat": "Montaj Hattı-1", "adet": int(toplam * 0.22)},
            {"hat": "Montaj Hattı-2", "adet": int(toplam * 0.21)},
            {"hat": "Paketleme", "adet": int(toplam * 0.28)},
            {"hat": "Sevkiyat Palet", "adet": int(toplam * 0.17)},
            {"hat": "Kalite Kontrol", "adet": int(toplam * 0.12)},
        ],
        "saatlik": [
            {"saat": f"{h:02d}:00", "adet": int(toplam * (0.05 + i * 0.12))}
            for i, h in enumerate([6, 8, 10, 12, 14, 16, 18])
        ],
        "urun_turleri": [
            {"tur": "Koli (A Tipi)", "adet": int(toplam * 0.38)},
            {"tur": "Koli (B Tipi)", "adet": int(toplam * 0.27)},
            {"tur": "Palet", "adet": int(toplam * 0.2)},
            {"tur": "Tekil Parça", "adet": int(toplam * 0.15)},
        ],
    }


def personnel_for_date(tarih: str) -> list[dict]:
    from mock_data import PERSONNEL_LIST

    d = _seed_int(tarih, 13)
    out = []
    for i, p in enumerate(PERSONNEL_LIST):
        v = p["verimlilik"] + ((d + i * 3) % 9) - 4
        v = max(78, min(99, round(v, 1)))
        out.append({**p, "tarih": tarih, "verimlilik": v})
    return out


def notification_templates() -> list[dict]:
    return [
        ("İSG", "Baret tespit edilemedi", "kritik", "Montaj Hattı-1"),
        ("İSG", "Yasaklı bölge ihlali", "uyari", "Depo Koridoru"),
        ("Üretim", "Sayım sapması", "uyari", "Paketleme Hattı"),
        ("MES", "Verimlilik düşüşü", "bilgi", "Montaj Hattı-2"),
        ("Kalite", "Kusur tespiti", "bilgi", "Kalite Kontrol"),
        ("Sistem", "Kamera bağlantı uyarısı", "bilgi", "Sevkiyat Rampası"),
    ]


def notification_for_day(tarih: str, user_id: str, start_id: int) -> list[dict]:
    d = _seed_int(tarih, 99)
    count = 2 + (d % 4)
    templates = notification_templates()
    rows = []
    for i in range(count):
        cat, baslik, sev, kam = templates[(d + i) % len(templates)]
        rows.append({
            "user_id": user_id,
            "tarih": tarih,
            "zaman": f"{9 + (d + i) % 8:02d}:{(15 + (d * 3 + i) % 40):02d}",
            "kamera": kam,
            "kategori": cat,
            "baslik": baslik,
            "detay": f"Otomatik demo kayıt — {tarih}",
            "seviye": sev,
            "modul": cat,
            "gorsel": "",
            "okundu": i % 2 == 1,
        })
    return rows, start_id + count

