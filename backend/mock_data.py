from __future__ import annotations

from datetime import datetime, timedelta

NOW = datetime.now()

MODULES = ["isg", "sayim", "urun", "mes", "genel"]

CAT_SLUG = {
    "Yangın": "yangin",
    "Duman": "duman",
    "Düşme": "dusme",
    "Yasak Bölge": "yasak-bolge",
    "İSG": "isg",
    "Üretim": "uretim",
    "MES": "mes",
    "Kalite": "kalite",
    "Sistem": "sistem",
}

# ——— Tesis kameraları (tüm demo hesaplar) ———
FACILITY_CAMERAS = [
    {"ad": "Montaj Hattı A — Giriş", "modul": "isg", "ip": 101},
    {"ad": "Montaj Hattı A — İstasyon 3", "modul": "isg", "ip": 102},
    {"ad": "Montaj Hattı B — Ana", "modul": "mes", "ip": 103},
    {"ad": "Montaj Hattı B — Çıkış", "modul": "sayim", "ip": 104},
    {"ad": "Paketleme — Konveyör", "modul": "urun", "ip": 105},
    {"ad": "Paketleme — Palet", "modul": "urun", "ip": 106},
    {"ad": "Depo Koridoru — Ana", "modul": "genel", "ip": 107},
    {"ad": "Depo — Forklift Alanı", "modul": "isg", "ip": 108},
    {"ad": "Sevkiyat Rampası", "modul": "sayim", "ip": 109},
    {"ad": "Kalite Kontrol", "modul": "mes", "ip": 110},
    {"ad": "Giriş Turnike", "modul": "genel", "ip": 111},
    {"ad": "Kaynak Atölyesi", "modul": "isg", "ip": 112},
]


def build_facility_cameras(prefix: str = "hype", count: int = 12) -> list[dict]:
    items = FACILITY_CAMERAS[:count]
    slug = prefix.lower().replace(" ", "-")
    return [
        {
            "id": f"{slug}-cam-{i}",
            "ad": cam["ad"],
            "rtsp": f"rtsp://admin:Hype2024@192.168.1.{cam['ip']}:554/stream1",
            "modul": cam["modul"],
            "token": f"tok_{slug}_{i}",
        }
        for i, cam in enumerate(items, 1)
    ]


def _t(h: int, m: int) -> str:
    return f"{h:02d}:{m:02d}"


def _dates(n=90):
    base = NOW.date()
    return [(base - timedelta(days=i)).isoformat() for i in range(n)]


AVAILABLE_DATES = _dates(90)

DASHBOARD_SUMMARY = {
    "kameralar": {"aktif": 12, "toplam": 12, "degisim": "12 aktif kamera"},
    "isg_ihlaller": {"bugun": 3, "alt_metin": "Kritik ihlal yok"},
    "hat_verimlilik": {"ortalama": 94.2, "alt_metin": "Optimum düzeyde"},
    "urun_sayim_bugun": {"toplam": 1847, "degisim": "+%8 dünden fazla"},
    "aktif_personel": {"sayi": 38, "degisim": "3 vardiya aktif"},
    "ai_sunucu": "aktif",
    "sistem_yuku": 23,
    "bildirim_sayisi": 12,
}

TRAFFIC_24H = [
    {"saat": "00:00", "kisi": 8},
    {"saat": "02:00", "kisi": 5},
    {"saat": "04:00", "kisi": 6},
    {"saat": "06:00", "kisi": 28},
    {"saat": "08:00", "kisi": 67},
    {"saat": "10:00", "kisi": 118},
    {"saat": "12:00", "kisi": 156},
    {"saat": "14:00", "kisi": 142},
    {"saat": "16:00", "kisi": 131},
    {"saat": "18:00", "kisi": 98},
    {"saat": "20:00", "kisi": 62},
    {"saat": "22:00", "kisi": 41},
]

NOTIF_SEED = [
    ("Yangın", "Alev tespiti — depo bölgesi", "kritik", "Depo Koridoru — Ana", "Isı imzası %94 — acil müdahale protokolü", "Yangın Algılama"),
    ("Duman", "Duman yoğunluğu yükseldi", "kritik", "Kaynak Atölyesi", "Sensör eşiği aşıldı — 42 sn süre", "Duman Algılama"),
    ("Düşme", "Personel düşme algılandı", "kritik", "Montaj Hattı A — İstasyon 3", "Pose analizi — acil durum bildirimi", "Düşme Algılama"),
    ("İSG", "Baret tespit edilemedi", "kritik", "Montaj Hattı A — İstasyon 3", "Operatör #A-12 — baret yok", "Baret Algılama"),
    ("İSG", "Eldiven eksik", "uyari", "Kaynak Atölyesi", "Kaynak işlemi sırasında eldiven yok", "Eldiven"),
    ("Yasak Bölge", "Yasaklı bölge ihlali", "kritik", "Depo — Forklift Alanı", "Forklift yakınlığında personel", "Bölge İhlali"),
    ("İSG", "Yelek ihlali", "kritik", "Sevkiyat Rampası", "Yükleme alanı girişi — yansıtıcı yelek yok", "Yelek Algılama"),
    ("İSG", "Hız limiti aşımı", "uyari", "Depo Koridoru — Ana", "Forklift 12 km/s — limit 8 km/s", "Hız Limiti"),
    ("İSG", "KKD bölgesi ihlali", "kritik", "Montaj Hattı A — Giriş", "Koruyucu gözlük eksik", "KKD Bölgesi"),
    ("Duman", "Hafif duman uyarısı", "uyari", "Montaj Hattı B — Ana", "Partikül yoğunluğu artışı", "Duman Algılama"),
    ("Düşme", "Düşme riski — merdiven", "uyari", "Giriş Turnike", "Tutunma kaybı tespiti", "Düşme Algılama"),
    ("Üretim", "Ürün sayım anomalisi", "uyari", "Paketleme — Konveyör", "Beklenen adetin %15 altında", "Ürün Sayım"),
    ("Üretim", "Hat duruşu", "kritik", "Montaj Hattı B — Ana", "8 dk beklenmedik duruş — sensör 2", "Hat İzleme"),
    ("Üretim", "Konveyör yavaşlama", "uyari", "Paketleme — Palet", "Hız %72 — hedef %90", "Hat İzleme"),
    ("MES", "Verimlilik düşüşü", "bilgi", "Montaj Hattı B — Ana", "Personel P-007 — %82 verimlilik", "MES"),
    ("MES", "Vardiya geç kalma", "bilgi", "Giriş Turnike", "3 operatör 12 dk geç giriş", "Turnike"),
    ("Kalite", "Kusur tespiti", "uyari", "Kalite Kontrol", "Yüzey çizik — lot #4421", "Kalite AI"),
    ("Kalite", "Renk sapması", "uyari", "Kalite Kontrol", "RGB tolerans dışı — lot #4418", "Kalite AI"),
    ("Kalite", "Ölçü sapması", "bilgi", "Montaj Hattı A — Giriş", "Tolerans dışı 2 parça", "Ölçüm"),
    ("MES", "Mola süresi aşımı", "uyari", "Montaj Hattı A — Giriş", "Operatör #B-04 — 18 dk mola", "MES"),
    ("Sistem", "Kamera bağlantı uyarısı", "bilgi", "Paketleme — Palet", "RTSP 3 sn kesinti — otomatik yeniden bağlandı", "Sistem"),
    ("Sistem", "AI model güncellemesi", "bilgi", "Kontrol Odası", "Düşme algılama modeli v3.1 yüklendi", "Sistem"),
    ("Yangın", "Isı kaynağı — kaynak atölyesi", "kritik", "Kaynak Atölyesi", "Termal kamera eşiği aşıldı — sprinkler hazır", "Yangın Algılama"),
    ("Yangın", "Yangın paneli testi", "bilgi", "Giriş Turnike", "Haftalık alarm testi tamamlandı", "Yangın Algılama"),
    ("Duman", "Yoğun duman — paketleme", "kritik", "Paketleme — Konveyör", "Partikül %88 — havalandırma tetiklendi", "Duman Algılama"),
    ("Düşme", "Bayılma pozisyonu", "kritik", "Depo Koridoru — Ana", "Hareketsizlik 45 sn — güvenlik bilgilendirildi", "Düşme Algılama"),
    ("Düşme", "Merdiven düşme riski", "kritik", "Giriş Turnike", "Korkuluk tutunma kaybı algılandı", "Düşme Algılama"),
    ("İSG", "Gözlük eksik", "uyari", "Kalite Kontrol", "Kimyasal bölge girişi — koruyucu gözlük yok", "KKD Bölgesi"),
    ("Yasak Bölge", "Gece vardiyası ihlali", "kritik", "Sevkiyat Rampası", "Yetkisiz personel — yükleme alanı", "Bölge İhlali"),
    ("Üretim", "Palet sayım farkı", "uyari", "Sevkiyat Rampası", "Beklenen 24 — sayılan 19", "Ürün Sayım"),
]


def _notification_row(nid: int, tarih: str, tpl: tuple, day: int, i: int, user_salt: int = 0) -> dict:
    cat, baslik, sev, kam, detay, modul = tpl
    h = 6 + (day + i * 2 + user_salt) % 12
    m = (day * 17 + i * 11 + user_salt) % 60
    is_today = day == 0
    okundu = not is_today and (day + i + user_salt) % 3 == 0
    if is_today and sev in ("kritik", "uyari"):
        okundu = False
    return {
        "id": nid,
        "tarih": tarih,
        "zaman": f"{h:02d}:{m:02d}",
        "kamera": kam,
        "kategori": cat,
        "baslik": baslik,
        "detay": detay,
        "seviye": sev,
        "modul": modul,
        "gorsel": f"/api/placeholder/{CAT_SLUG.get(cat, 'sistem')}-{(nid + i) % 5 + 1}.jpg",
        "okundu": okundu,
    }


def _gen_notifications() -> list[dict]:
    out: list[dict] = []
    nid = 1
    for day in range(90):
        tarih = AVAILABLE_DATES[day]
        if day == 0:
            indices = range(len(NOTIF_SEED))
        elif day < 7:
            indices = [i for i in range(len(NOTIF_SEED)) if (day + i) % 3 != 2]
        else:
            indices = [i for i in range(len(NOTIF_SEED)) if (day * 2 + i) % 5 != 4]
        for i in indices:
            out.append(_notification_row(nid, tarih, NOTIF_SEED[i], day, i))
            nid += 1
    return out


NOTIFICATIONS = _gen_notifications()

NOTIFICATION_CATEGORIES = ["Yangın", "Duman", "Düşme", "İSG", "Yasak Bölge", "Üretim", "MES", "Kalite", "Sistem"]

NOTIFICATION_STATS = [
    {"kategori": "Yangın", "adet": 8, "renk": "#ef4444"},
    {"kategori": "Duman", "adet": 6, "renk": "#f97316"},
    {"kategori": "Düşme", "adet": 5, "renk": "#dc2626"},
    {"kategori": "İSG", "adet": 18, "renk": "#f59e0b"},
    {"kategori": "Yasak Bölge", "adet": 7, "renk": "#8b5cf6"},
    {"kategori": "Üretim", "adet": 12, "renk": "#6366f1"},
    {"kategori": "MES", "adet": 6, "renk": "#22c55e"},
    {"kategori": "Kalite", "adet": 5, "renk": "#3b82f6"},
    {"kategori": "Sistem", "adet": 4, "renk": "#64748b"},
]

DETECTION_LOGS = [
    {"zaman": _t(14, 32), "kamera": "Montaj Hattı A — İstasyon 3", "modul": "Baret Algılama", "durum": "Kritik", "tip": "kritik", "tarih": AVAILABLE_DATES[0]},
    {"zaman": _t(14, 21), "kamera": "Depo — Forklift Alanı", "modul": "Yasaklı Bölge", "durum": "Uyarı", "tip": "uyari", "tarih": AVAILABLE_DATES[0]},
    {"zaman": _t(14, 15), "kamera": "Montaj Hattı B — Ana", "modul": "MES Verimlilik", "durum": "Optimum", "tip": "basari", "tarih": AVAILABLE_DATES[0]},
    {"zaman": _t(13, 47), "kamera": "Paketleme — Konveyör", "modul": "Ürün Sayım", "durum": "Bilgi", "tip": "bilgi", "tarih": AVAILABLE_DATES[0]},
    {"zaman": _t(13, 22), "kamera": "Giriş Turnike", "modul": "Personel Giriş", "durum": "Normal", "tip": "normal", "tarih": AVAILABLE_DATES[0]},
    {"zaman": _t(12, 58), "kamera": "Kalite Kontrol", "modul": "Kusur Tespiti", "durum": "Uyarı", "tip": "uyari", "tarih": AVAILABLE_DATES[0]},
    {"zaman": _t(11, 34), "kamera": "Sevkiyat Rampası", "modul": "Yelek Algılama", "durum": "Kritik", "tip": "kritik", "tarih": AVAILABLE_DATES[0]},
    {"zaman": _t(10, 12), "kamera": "Montaj Hattı B — Çıkış", "modul": "Hat Sayım", "durum": "Optimum", "tip": "basari", "tarih": AVAILABLE_DATES[0]},
    {"zaman": _t(9, 45), "kamera": "Kaynak Atölyesi", "modul": "Eldiven", "durum": "Uyarı", "tip": "uyari", "tarih": AVAILABLE_DATES[0]},
    {"zaman": _t(8, 20), "kamera": "Depo Koridoru — Ana", "modul": "Hız Limiti", "durum": "Uyarı", "tip": "uyari", "tarih": AVAILABLE_DATES[0]},
    {"zaman": _t(7, 55), "kamera": "Paketleme — Palet", "modul": "Palet Sayım", "durum": "Bilgi", "tip": "bilgi", "tarih": AVAILABLE_DATES[0]},
    {"zaman": _t(6, 30), "kamera": "Montaj Hattı A — Giriş", "modul": "Vardiya Giriş", "durum": "Normal", "tip": "normal", "tarih": AVAILABLE_DATES[0]},
]

# Hype Demo paneli — 10 kişilik örnek (Sabah 08:00–17:00)
HYPE_DEMO_PERSONNEL = [
    {"id": "P-001", "ad": "Mehmet Kaya", "hat": "Montaj Hattı A", "masa": "Masa A-01", "kamera": "Kamera 01", "verimlilik": 96.2, "vardiya": "sabah", "durum": "verimli"},
    {"id": "P-002", "ad": "Ayşe Demir", "hat": "Montaj Hattı A", "masa": "Masa A-02", "kamera": "Kamera 02", "verimlilik": 94.8, "vardiya": "sabah", "durum": "verimli"},
    {"id": "P-003", "ad": "Ali Yıldız", "hat": "Montaj Hattı B", "masa": "Masa B-01", "kamera": "Kamera 03", "verimlilik": 91.5, "vardiya": "sabah", "durum": "verimli"},
    {"id": "P-004", "ad": "Fatma Çelik", "hat": "Paketleme", "masa": "Paket 01", "kamera": "Kamera 04", "verimlilik": 97.4, "vardiya": "sabah", "durum": "verimli"},
    {"id": "P-005", "ad": "Can Öztürk", "hat": "Paketleme", "masa": "Paket 02", "kamera": "Kamera 05", "verimlilik": 95.1, "vardiya": "sabah", "durum": "verimli"},
    {"id": "P-006", "ad": "Zeynep Arslan", "hat": "Kalite Kontrol", "masa": "KK-01", "kamera": "Kamera 06", "verimlilik": 88.2, "vardiya": "sabah", "durum": "verimsiz"},
    {"id": "P-007", "ad": "Burak Koç", "hat": "Montaj Hattı B", "masa": "Masa B-02", "kamera": "Kamera 07", "verimlilik": 82.0, "vardiya": "sabah", "durum": "verimsiz"},
    {"id": "P-008", "ad": "Elif Şahin", "hat": "Depo Operasyon", "masa": "Depo 01", "kamera": "Kamera 08", "verimlilik": 93.6, "vardiya": "sabah", "durum": "verimli"},
    {"id": "P-009", "ad": "Emre Yıldız", "hat": "Montaj Hattı A", "masa": "Masa A-05", "kamera": "Kamera 09", "verimlilik": 75.0, "vardiya": "sabah", "durum": "verimsiz"},
    {"id": "P-010", "ad": "Selin Güneş", "hat": "Paketleme", "masa": "Paket 03", "kamera": "Kamera 10", "verimlilik": 96.8, "vardiya": "sabah", "durum": "verimli"},
]

PERSONNEL_LIST = [
    *HYPE_DEMO_PERSONNEL,
    {"id": "P-011", "ad": "Oğuz Kılıç", "hat": "Sevkiyat", "masa": "Sevk 01", "kamera": "Kamera 11", "verimlilik": 90.4, "vardiya": "14-22", "durum": "iyi"},
    {"id": "P-012", "ad": "Deniz Acar", "hat": "Kaynak Atölyesi", "masa": "Kaynak 01", "kamera": "Kamera 12", "verimlilik": 87.9, "vardiya": "06-14", "durum": "dikkat"},
    {"id": "P-013", "ad": "Ece Yılmaz", "hat": "Montaj Hattı B", "masa": "Masa B-03", "kamera": "Kamera 13", "verimlilik": 95.6, "vardiya": "22-06", "durum": "optimum"},
    {"id": "P-014", "ad": "Serkan Polat", "hat": "Depo Operasyon", "masa": "Depo 02", "kamera": "Kamera 14", "verimlilik": 91.2, "vardiya": "14-22", "durum": "iyi"},
    {"id": "P-015", "ad": "Gizem Tunç", "hat": "Kalite Kontrol", "masa": "KK-02", "kamera": "Kamera 15", "verimlilik": 94.1, "vardiya": "14-22", "durum": "optimum"},
    {"id": "P-016", "ad": "Kemal Erdoğan", "hat": "Montaj Hattı A", "masa": "Masa A-04", "kamera": "Kamera 16", "verimlilik": 89.7, "vardiya": "22-06", "durum": "iyi"},
    {"id": "P-017", "ad": "Hande Aksoy", "hat": "Paketleme", "masa": "Paket 04", "kamera": "Kamera 18", "verimlilik": 92.4, "vardiya": "06-14", "durum": "iyi"},
    {"id": "P-018", "ad": "Tolga Şimşek", "hat": "Montaj Hattı B", "masa": "Masa B-04", "kamera": "Kamera 19", "verimlilik": 86.3, "vardiya": "14-22", "durum": "dikkat"},
    {"id": "P-019", "ad": "İrem Kara", "hat": "Kalite Kontrol", "masa": "KK-03", "kamera": "Kamera 20", "verimlilik": 97.1, "vardiya": "06-14", "durum": "optimum"},
    {"id": "P-020", "ad": "Yusuf Demirtaş", "hat": "Sevkiyat", "masa": "Sevk 02", "kamera": "Kamera 21", "verimlilik": 88.9, "vardiya": "06-14", "durum": "dikkat"},
]

PERSONNEL_PRODUCTIVITY = {
    "ortalama_verimlilik": 91.1,
    "aktif_personel": 10,
    "personeller": HYPE_DEMO_PERSONNEL,
    "vardiya_trend": [
        {"vardiya": "sabah", "verimlilik": 92.1},
    ],
}


def _product_day(total_mult=1.0):
    return {
        "toplam": int(1847 * total_mult),
        "hatlar": [
            {"hat": "Montaj Hattı A", "adet": int(412 * total_mult)},
            {"hat": "Montaj Hattı B", "adet": int(389 * total_mult)},
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
    AVAILABLE_DATES[i]: _product_day(0.78 + (i % 12) * 0.02)
    for i in range(90)
}

SETTINGS_CAMERAS = build_facility_cameras("demo", 12)

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
