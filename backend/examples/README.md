# Örnek Bildirim Gönderimi

Demo kullanıcıya (`demo@hypevisionlab.com`) entegrasyon API üzerinden bildirim gönderme örnekleri.

## Gereksinimler

- Backend çalışıyor olmalı: `http://127.0.0.1:8000`
- API anahtarı: `backend/data/.demo-api-key` (ilk kurulumda otomatik oluşur)

## Hızlı başlangıç

```bat
cd backend
examples\run_demo.bat
```

veya:

```bash
cd backend
python examples/run_demo.py
```

## Yangın (İsg & Güvenlik)

```bash
cd backend
python examples/send_yangin.py
```

## MES — YOLO 30 dk tick (1 kamera, 2 personel)

Backend oranı hesaplar; YOLO sadece `present: true/false` yollar.

```bash
cd backend
python examples/send_mes_tick.py
python examples/send_mes_tick.py --absent P-002
```

Örnek JSON: `examples/mes_tick_sample.json`  
Endpoint: `POST /api/v1/integrations/mes/tick`

Ölçek: her üyelik kendi API key'i ile; kamera başına 1 istek (içinde N masa).  
1000 üye × 30 masa ≈ kamera gruplarına bölünmüş batch upsert (`mes_staff_day`).

## Tek tek çalıştırma

```bash
# Sadece metin
python examples/send_text.py --baslik "Test yangın" --kategori Yangın --seviye kritik

# Görsel ile (varsayılan: examples/assets/demo-camera.jpg)
python examples/send_image.py
python examples/send_image.py --image ./assets/demo-camera.jpg --baslik "Baret yok"
```

## Parametreler

| Parametre | Açıklama |
|-----------|----------|
| `--api-key` | `hv_live_...` (yoksa `.demo-api-key` okunur) |
| `--base` | API adresi (varsayılan `http://127.0.0.1:8000`) |
| `--kategori` | Yangın, İSG, MES, Üretim, Sistem... |
| `--seviye` | `kritik`, `uyari`, `bilgi` |
| `--kamera` | Kroki eşleşmesi için kamera adı |

## Panelde kontrol

1. `http://localhost:5173` açın
2. `demo@hypevisionlab.com` / `demo123` ile giriş
3. **İsg & Güvenlik** → yangın kaydı
4. **Mes** → tick sonrası personel barları

## API endpoint'leri

- `POST /api/v1/integrations/notification` — JSON bildirim
- `POST /api/v1/integrations/notification/upload` — multipart + görsel
- `POST /api/v1/integrations/mes/tick` — YOLO varlık tick

Detay: `backend/docs/INTEGRATION.md`
