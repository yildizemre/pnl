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

Bu komut sırayla heartbeat + metin bildirim + görseli bildirim gönderir.

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
3. Sağ üst çan ikonu → Son Bildirimler
4. Bildirimler sayfasında görseli olan kayıt

## API endpoint'leri

- `POST /api/v1/integrations/notification` — JSON
- `POST /api/v1/integrations/notification/upload` — multipart + görsel

Detay: `backend/docs/INTEGRATION.md`
