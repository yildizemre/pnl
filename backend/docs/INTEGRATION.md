# HypeVision Entegrasyon API

Mobil uygulama, AI sunucu ve harici sistemler bu API ile bildirim gönderir ve healthcheck yapar.

## Kimlik doğrulama

Tüm entegrasyon isteklerinde header:

```
X-API-Key: hv_live_xxxxxxxx...
```

API anahtarı **Üyelik Yönetimi** → kullanıcı satırı → **API Anahtarı** ile oluşturulur. Anahtar yalnızca bir kez gösterilir.

İlk kurulumda demo kullanıcı için otomatik anahtar oluşur:

```
backend/data/.demo-api-key
```

## Demo hesap

| Alan | Değer |
|------|-------|
| E-posta | `demo@hypevisionlab.com` |
| Şifre | `demo123` |

## Endpoints

### Healthcheck

```http
GET /api/v1/integrations/health
X-API-Key: hv_live_...
```

### Heartbeat (AI sunucu aktif)

```http
POST /api/v1/integrations/heartbeat
Content-Type: application/json
X-API-Key: hv_live_...

{"camera_id": "cam-opsiyonel"}
```

### Bildirim (JSON)

```http
POST /api/v1/integrations/notification
Content-Type: application/json
X-API-Key: hv_live_...

{
  "baslik": "Yangın algılandı",
  "detay": "Montaj hattı A — duman tespiti",
  "kategori": "Yangın",
  "seviye": "kritik",
  "kamera": "Kamera 03 — Montaj",
  "modul": "Yangın/Duman AI"
}
```

Kategoriler: `Yangın`, `Duman`, `Düşme`, `İSG`, `Yasak Bölge`, `Üretim`, `MES`, `Kalite`, `Sistem`  
Seviyeler: `kritik`, `uyari`, `bilgi`

### Bildirim + görsel (multipart)

```http
POST /api/v1/integrations/notification/upload
X-API-Key: hv_live_...
Content-Type: multipart/form-data

baslik, detay, kategori, seviye, kamera, modul, gorsel (dosya)
```

## Panel (JWT) — okundu işaretleme

```http
PATCH /api/notifications/{id}/read
Authorization: Bearer <token>

PATCH /api/notifications/read-all
GET /api/notifications/unread-count
```

## WebSocket (canlı popup)

```
ws://host/api/ws?token=<JWT>
```

Yeni bildirim mesajı:

```json
{
  "type": "notification",
  "item": { "id": 1, "baslik": "...", "gorsel": "/api/uploads/..." },
  "unread": 5
}
```

## Örnek scriptler

Backend klasöründen:

```bash
# Healthcheck
python scripts/send_healthcheck.py

# Bildirim (görselsiz)
python scripts/send_notification.py --baslik "Test uyarı" --kategori İSG --seviye uyari

# Bildirim + görsel
python scripts/send_notification.py --baslik "Düşme tespiti" --kategori Düşme --seviye kritik --image ./ornek.jpg

# Yeni kullanıcı
python scripts/create_user.py --email yeni@firma.com --password sifre123 --ad "Fabrika Kullanıcı" --with-api-key
```

## Mobil için notlar

- Her müşteri/tesis = ayrı `user` kaydı (Üyelik Yönetimi)
- Her mobil kurulum için o kullanıcıya özel API anahtarı
- Bildirimler `user_id` ile izole — başka kullanıcı görmez
- Görseller `POST .../notification/upload` ile yüklenir, URL panelde `/api/uploads/...`
- JWT login mobilde de aynı: `POST /api/auth/login`

## cURL örnekleri

```bash
API_KEY=$(cat backend/data/.demo-api-key)

curl -s -H "X-API-Key: $API_KEY" http://127.0.0.1:8000/api/v1/integrations/health

curl -s -X POST -H "X-API-Key: $API_KEY" -H "Content-Type: application/json" \
  -d '{"baslik":"Test","kategori":"Sistem","seviye":"bilgi"}' \
  http://127.0.0.1:8000/api/v1/integrations/notification
```
