from __future__ import annotations

from datetime import datetime, timedelta

NOW = datetime.now()


def _t(h: int, m: int) -> str:
    return f"{h:02d}:{m:02d}"


def _dates(n=90):
    base = NOW.date()
    return [(base - timedelta(days=i)).isoformat() for i in range(n)]


AVAILABLE_DATES = _dates(90)

DASHBOARD_SUMMARY = {
    "kameralar": {"aktif": 12, "toplam": 16, "degisim": "+2 yeni kamera"},
    "isg_ihlaller": {"bugun": 3, "alt_metin": "Kritik ihlal yok"},
    "hat_verimlilik": {"ortalama": 94.2, "alt_metin": "Optimum düzeyde"},
    "urun_sayim_bugun": {"toplam": 1847, "degisim": "+%8 dünden fazla"},
    "aktif_personel": {"sayi": 38, "degisim": "3 vardiya aktif"},
    "ai_sunucu": "aktif",
    "sistem_yuku": 23,
    "bildirim_sayisi": 12,
}

TRAFFIC_24H = [
    {"saat": "00:00", "kisi": 12},
    {"saat": "06:00", "kisi": 28},
    {"saat": "08:00", "kisi": 67},
    {"saat": "10:00", "kisi": 118},
    {"saat": "12:00", "kisi": 156},
    {"saat": "14:00", "kisi": 142},
    {"saat": "16:00", "kisi": 131},
    {"saat": "18:00", "kisi": 98},
    {"saat": "22:00", "kisi": 41},
]

# Bildirimler — tablo + görsel alanı (demo URL)
NOTIFICATIONS = [
    {
        "id": 1,
        "tarih": AVAILABLE_DATES[0],
        "zaman": _t(14, 32),
        "kamera": "Montaj Hattı-1",
        "kategori": "İSG",
        "baslik": "Baret tespit edilemedi",
        "detay": "Operatör #A-12 — Kritik İSG ihlali",
        "seviye": "kritik",
        "modul": "Baret Algılama",
        "gorsel": "/api/placeholder/isg-1.jpg",
        "okundu": False,
    },
    {
        "id": 2,
        "tarih": AVAILABLE_DATES[0],
        "zaman": _t(14, 21),
        "kamera": "Depo Koridoru",
        "kategori": "İSG",
        "baslik": "Yasaklı bölge ihlali",
        "detay": "Forklift yakınlığında personel",
        "seviye": "uyari",
        "modul": "Bölge İhlali",
        "gorsel": "/api/placeholder/isg-2.jpg",
        "okundu": False,
    },
    {
        "id": 3,
        "tarih": AVAILABLE_DATES[0],
        "zaman": _t(13, 48),
        "kamera": "Kaynak Atölyesi",
        "kategori": "İSG",
        "baslik": "Eldiven eksik",
        "detay": "Kaynak işlemi sırasında",
        "seviye": "uyari",
        "modul": "Eldiven",
        "gorsel": "/api/placeholder/isg-3.jpg",
        "okundu": True,
    },
    {
        "id": 4,
        "tarih": AVAILABLE_DATES[1],
        "zaman": _t(11, 5),
        "kamera": "Paketleme Hattı",
        "kategori": "Üretim",
        "baslik": "Ürün sayım anomalisi",
        "detay": "Beklenen adetin %15 altında",
        "seviye": "uyari",
        "modul": "Ürün Sayım",
        "gorsel": "/api/placeholder/urun-1.jpg",
        "okundu": True,
    },
    {
        "id": 5,
        "tarih": AVAILABLE_DATES[1],
        "zaman": _t(9, 22),
        "kamera": "Montaj Hattı-2",
        "kategori": "MES",
        "baslik": "Verimlilik düşüşü",
        "detay": "Personel P-007 — %82 verimlilik",
        "seviye": "bilgi",
        "modul": "MES",
        "gorsel": "/api/placeholder/mes-1.jpg",
        "okundu": True,
    },
    {
        "id": 6,
        "tarih": AVAILABLE_DATES[2],
        "zaman": _t(16, 10),
        "kamera": "Sevkiyat Rampası",
        "kategori": "İSG",
        "baslik": "Yelek ihlali",
        "detay": "Yükleme alanı girişi",
        "seviye": "kritik",
        "modul": "Yelek Algılama",
        "gorsel": "/api/placeholder/isg-4.jpg",
        "okundu": True,
    },
]

NOTIFICATION_CATEGORIES = ["İSG", "Üretim", "MES", "Sistem", "Kalite"]

NOTIFICATION_STATS = [
    {"kategori": "İSG", "adet": 8, "renk": "#ef4444"},
    {"kategori": "Üretim", "adet": 5, "renk": "#8b5cf6"},
    {"kategori": "MES", "adet": 4, "renk": "#34d399"},
    {"kategori": "Kalite", "adet": 2, "renk": "#38bdf8"},
    {"kategori": "Sistem", "adet": 1, "renk": "#94a3b8"},
]

DETECTION_LOGS = [
    {"zaman": _t(14, 32), "kamera": "Montaj Hattı-1", "modul": "İSG İhlali (Baret Yok)", "durum": "Kritik", "tip": "kritik", "tarih": AVAILABLE_DATES[0]},
    {"zaman": _t(14, 21), "kamera": "Depo Koridoru", "modul": "Yasaklı Bölge", "durum": "Uyarı", "tip": "uyari", "tarih": AVAILABLE_DATES[0]},
    {"zaman": _t(14, 15), "kamera": "Montaj Hattı-2", "modul": "MES Verimlilik", "durum": "Optimum", "tip": "basari", "tarih": AVAILABLE_DATES[0]},
    {"zaman": _t(13, 47), "kamera": "Paketleme", "modul": "Ürün Sayım", "durum": "Bilgi", "tip": "bilgi", "tarih": AVAILABLE_DATES[0]},
]

PERSONNEL_LIST = [
    {"id": "P-001", "ad": "Mehmet Kaya", "hat": "Montaj Hattı-1", "verimlilik": 96.2, "vardiya": "06-14", "durum": "optimum", "tarih": AVAILABLE_DATES[0]},
    {"id": "P-002", "ad": "Ayşe Demir", "hat": "Montaj Hattı-1", "verimlilik": 94.8, "vardiya": "06-14", "durum": "optimum", "tarih": AVAILABLE_DATES[0]},
    {"id": "P-003", "ad": "Ali Yıldız", "hat": "Montaj Hattı-2", "verimlilik": 91.5, "vardiya": "06-14", "durum": "iyi", "tarih": AVAILABLE_DATES[0]},
    {"id": "P-004", "ad": "Fatma Çelik", "hat": "Paketleme", "verimlilik": 97.4, "vardiya": "06-14", "durum": "optimum", "tarih": AVAILABLE_DATES[0]},
    {"id": "P-005", "ad": "Can Öztürk", "hat": "Paketleme", "verimlilik": 95.1, "vardiya": "14-22", "durum": "optimum", "tarih": AVAILABLE_DATES[0]},
    {"id": "P-006", "ad": "Zeynep Arslan", "hat": "Kalite Kontrol", "verimlilik": 88.2, "vardiya": "06-14", "durum": "dikkat", "tarih": AVAILABLE_DATES[0]},
    {"id": "P-007", "ad": "Burak Koç", "hat": "Montaj Hattı-2", "verimlilik": 82.0, "vardiya": "14-22", "durum": "dikkat", "tarih": AVAILABLE_DATES[0]},
    {"id": "P-008", "ad": "Elif Şahin", "hat": "Depo Operasyon", "verimlilik": 93.6, "vardiya": "06-14", "durum": "iyi", "tarih": AVAILABLE_DATES[0]},
    {"id": "P-009", "ad": "Murat Aydın", "hat": "Montaj Hattı-1", "verimlilik": 93.1, "vardiya": "14-22", "durum": "iyi", "tarih": AVAILABLE_DATES[1]},
    {"id": "P-010", "ad": "Selin Güneş", "hat": "Paketleme", "verimlilik": 96.8, "vardiya": "06-14", "durum": "optimum", "tarih": AVAILABLE_DATES[1]},
]

PERSONNEL_PRODUCTIVITY = {
    "ortalama_verimlilik": 94.2,
    "aktif_personel": 38,
    "personeller": PERSONNEL_LIST,
    "vardiya_trend": [
        {"vardiya": "06-14", "verimlilik": 92.1},
        {"vardiya": "14-22", "verimlilik": 94.8},
        {"vardiya": "22-06", "verimlilik": 89.3},
    ],
}

def _product_day(total_mult=1.0):
    return {
        "toplam": int(1847 * total_mult),
        "hatlar": [
            {"hat": "Montaj Hattı-1", "adet": int(412 * total_mult)},
            {"hat": "Montaj Hattı-2", "adet": int(389 * total_mult)},
            {"hat": "Paketleme", "adet": int(534 * total_mult)},
            {"hat": "Sevkiyat Palet", "adet": int(312 * total_mult)},
            {"hat": "Kalite Kontrol", "adet": int(210 * total_mult)},
        ],
        "saatlik": [
            {"saat": "06:00", "adet": int(80 * total_mult)},
            {"saat": "08:00", "adet": int(142 * total_mult)},
            {"saat": "10:00", "adet": int(298 * total_mult)},
            {"saat": "12:00", "adet": int(456 * total_mult)},
            {"saat": "14:00", "adet": int(612 * total_mult)},
            {"saat": "16:00", "adet": int(339 * total_mult)},
            {"saat": "18:00", "adet": int(220 * total_mult)},
        ],
        "gunluk_trend": [
            {"gun": (NOW - timedelta(days=6)).strftime("%d.%m"), "adet": 1620},
            {"gun": (NOW - timedelta(days=5)).strftime("%d.%m"), "adet": 1710},
            {"gun": (NOW - timedelta(days=4)).strftime("%d.%m"), "adet": 1780},
            {"gun": (NOW - timedelta(days=3)).strftime("%d.%m"), "adet": 1695},
            {"gun": (NOW - timedelta(days=2)).strftime("%d.%m"), "adet": 1755},
            {"gun": (NOW - timedelta(days=1)).strftime("%d.%m"), "adet": 1802},
            {"gun": NOW.strftime("%d.%m"), "adet": 1847},
        ],
        "urun_turleri": [
            {"tur": "Koli (A Tipi)", "adet": int(720 * total_mult)},
            {"tur": "Koli (B Tipi)", "adet": int(445 * total_mult)},
            {"tur": "Palet", "adet": int(312 * total_mult)},
            {"tur": "Tekil Parça", "adet": int(370 * total_mult)},
        ],
    }


PRODUCT_BY_DATE = {
    AVAILABLE_DATES[0]: _product_day(1.0),
    AVAILABLE_DATES[1]: _product_day(0.92),
    AVAILABLE_DATES[2]: _product_day(0.88),
    AVAILABLE_DATES[3]: _product_day(0.85),
    AVAILABLE_DATES[4]: _product_day(0.90),
    AVAILABLE_DATES[5]: _product_day(0.87),
    AVAILABLE_DATES[6]: _product_day(0.83),
}

SETTINGS_CAMERAS = [
    {"id": "cam-1", "ad": "Montaj Hattı-1", "rtsp": "rtsp://admin:pass@192.168.1.101:554/stream1"},
    {"id": "cam-2", "ad": "Montaj Hattı-2", "rtsp": "rtsp://admin:pass@192.168.1.102:554/stream1"},
    {"id": "cam-3", "ad": "Paketleme Hattı", "rtsp": "rtsp://admin:pass@192.168.1.103:554/stream1"},
    {"id": "cam-4", "ad": "Depo Koridoru", "rtsp": "rtsp://admin:pass@192.168.1.104:554/stream1"},
    {"id": "cam-5", "ad": "Sevkiyat Rampası", "rtsp": "rtsp://admin:pass@192.168.1.105:554/stream1"},
]

COMPARE_PRESETS = {
    "bugun_dun": {
        "id": "bugun_dun",
        "label_tr": "Bugün vs Dün",
        "label_en": "Today vs Yesterday",
        "summary": {
            "aktif_personel": {"current": 38, "previous": 35, "change_pct": 8.6},
            "isg_ihlaller": {"current": 3, "previous": 5, "change_pct": -40.0},
            "urun_sayim": {"current": 1847, "previous": 1710, "change_pct": 8.0},
            "verimlilik": {"current": 94.2, "previous": 91.8, "change_pct": 2.6},
            "bildirim": {"current": 12, "previous": 18, "change_pct": -33.3},
        },
        "traffic": [
            {**p, "kisi_once": max(8, int(p["kisi"] * 0.88))} for p in TRAFFIC_24H
        ],
    },
    "hafta": {
        "id": "hafta",
        "label_tr": "Bu Hafta vs Geçen Hafta",
        "label_en": "This Week vs Last Week",
        "summary": {
            "aktif_personel": {"current": 38, "previous": 34, "change_pct": 11.8},
            "isg_ihlaller": {"current": 18, "previous": 24, "change_pct": -25.0},
            "urun_sayim": {"current": 12450, "previous": 11200, "change_pct": 11.2},
            "verimlilik": {"current": 93.1, "previous": 89.5, "change_pct": 4.0},
            "bildirim": {"current": 86, "previous": 102, "change_pct": -15.7},
        },
        "traffic": [
            {**p, "kisi_once": max(6, int(p["kisi"] * 0.82))} for p in TRAFFIC_24H
        ],
    },
}


def get_compare(preset: str | None):
    if not preset or preset not in COMPARE_PRESETS:
        return None
    return COMPARE_PRESETS[preset]
