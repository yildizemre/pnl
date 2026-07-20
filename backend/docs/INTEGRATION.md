# HypeVision Entegrasyon API

Mobil uygulama, AI sunucu, YOLO ve müşteri bilgi işlem sistemleri bu API ile veri gönderir veya çeker.

## Kimlik doğrulama

Tüm entegrasyon isteklerinde header:

```
X-API-Key: hv_live_xxxxxxxx...
```

API anahtarı **Üyelik Yönetimi** → kullanıcı satırı → **API Anahtarı** ile oluşturulur. Anahtar yalnızca bir kez gösterilir; sunucuda hash olarak saklanır.

## Veritabanı

| Ortam | Motor | Not |
|-------|-------|-----|
| Geliştirme (varsayılan) | **SQLite** | `backend/data/hypevision.db` |
| Üretim (önerilen) | **PostgreSQL** | `.env` → `DATABASE_URL=postgresql://...` |

MySQL kullanılmıyor. SQLAlchemy ile SQLite ve PostgreSQL desteklenir.

## Çok kiracı (1000 müşteri)

- Her fabrika / müşteri = **ayrı panel kullanıcısı** (`user` kaydı)
- Her kullanıcının **kendi API anahtarı** — veriler `user_id` ile izole
- 1000 ayrı kullanıcı kullanmak **doğru ve güvenli** yaklaşımdır
- MES: `mes_staff_day` tablosunda kişi×gün upsert — ölçeklenebilir

## Healthcheck & Heartbeat

| Endpoint | Metot | Amaç |
|----------|-------|------|
| `/api/v1/integrations/health` | **GET** | Bağlantı testi, AI aktif mi |
| `/api/v1/integrations/heartbeat` | **POST** | AI sunucu canlı sinyali |

**Önerilen sıklık:** Her **3 dakikada** bir `GET /health` veya `POST /heartbeat`  
**Pasif sayılma:** **5 dakika** sinyal gelmezse panel AI'yı pasif gösterir

```http
GET /api/v1/integrations/health
X-API-Key: hv_live_...
```

Yanıt örneği:

```json
{
  "ok": true,
  "ai_aktif": true,
  "database": "sqlite",
  "heartbeat_recommended_seconds": 180,
  "heartbeat_max_idle_seconds": 300
}
```

```http
POST /api/v1/integrations/heartbeat
Content-Type: application/json
X-API-Key: hv_live_...

{"camera_id": "Kamera 01"}
```

MES tick veya bildirim göndermek de heartbeat sayılır.

## MES — Yazma (YOLO, her ~30 dk)

```http
POST /api/v1/integrations/mes/tick
Content-Type: application/json
X-API-Key: hv_live_...

{
  "camera_id": "Kamera 01",
  "interval_minutes": 30,
  "observed_at": "2026-07-20T10:30:00+03:00",
  "stations": [
    {"person_id": "P-014", "name": "Emre Yıldız", "masa": "Masa B-07", "hat": "Montaj B", "present": true}
  ]
}
```

YOLO edge tarafında 22 dk / 8 dk sayar; API'ye yalnızca `present: true/false` gönderilir.

## MES — Okuma (bilgi işlem, GET)

```http
GET /api/v1/integrations/mes/productivity?tarih=2026-07-20
X-API-Key: hv_live_...
```

Personel listesi, verimlilik %, slotlar ve segmentler döner.

## Bildirimler

### Gönderme (POST)

```http
POST /api/v1/integrations/notification
Content-Type: application/json
X-API-Key: hv_live_...

{
  "baslik": "Yangın algılandı",
  "detay": "Montaj hattı A",
  "kategori": "Yangın",
  "seviye": "kritik",
  "kamera": "Kamera 03"
}
```

Görsel: `POST /api/v1/integrations/notification/detect/upload` (multipart)

### Okuma (GET — bilgi işlem)

```http
GET /api/v1/integrations/notifications?limit=50&tarih=2026-07-20
X-API-Key: hv_live_...

GET /api/v1/integrations/notifications/123
X-API-Key: hv_live_...
```

Yalnızca ilgili müşterinin bildirimleri döner.

## Panel (JWT) — web arayüzü

Panel kullanıcıları JWT ile giriş yapar; teknik HTTP kodları yerine anlaşılır hata mesajları gösterilir.

```http
GET /api/mes/productivity?tarih=2026-07-20
Authorization: Bearer <token>
```

## Güvenlik

| Önlem | Açıklama |
|-------|----------|
| API anahtarı | Hash (bcrypt) — düz metin saklanmaz |
| Şifreler | Hash — düz metin saklanmaz |
| Kiracı izolasyonu | Her sorgu `user_id` ile filtrelenir |
| Rate limit | Entegrasyon API: dakikada ~120 istek / anahtar |
| Header'lar | `X-Content-Type-Options`, `X-Frame-Options`, vb. |
| Üretim | `JWT_SECRET` ve `DATABASE_URL` ortam değişkeninden; HTTPS zorunlu |

## Örnek scriptler

```bash
cd backend
python scripts/send_healthcheck.py
python examples/send_mes_tick.py
python examples/send_yangin.py
```

## cURL örnekleri

```bash
API_KEY=$(cat backend/data/.demo-api-key)

# Healthcheck (GET)
curl -s -H "X-API-Key: $API_KEY" http://127.0.0.1:8000/api/v1/integrations/health

# MES verisi çek (GET)
curl -s -H "X-API-Key: $API_KEY" "http://127.0.0.1:8000/api/v1/integrations/mes/productivity?tarih=2026-07-20"

# Bildirim gönder (POST)
curl -s -X POST -H "X-API-Key: $API_KEY" -H "Content-Type: application/json" \
  -d '{"baslik":"Test","kategori":"Sistem","seviye":"bilgi"}' \
  http://127.0.0.1:8000/api/v1/integrations/notification
```
