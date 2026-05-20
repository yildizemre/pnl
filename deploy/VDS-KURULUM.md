# HypeVision — VDS kurulum (SSH)

Sunucuda proje klasörü: `~/projem` (venv zaten kurulu ✓)

## A) Tek komut (önerilen)

```bash
cd ~/projem
chmod +x deploy/install-vds.sh
sudo ./deploy/install-vds.sh
```

Gerekirse önce:

```bash
sudo apt update
sudo apt install -y nginx nodejs npm  # veya Node 20: nodesource script
```

Firewall:

```bash
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
```

Tarayıcı: `http://SUNUCU_IP/`

---

## B) Adım adım (senin durumun)

Zaten `venv` ve pip paketleri kuruluysa:

### 1) Proje dosyaları sunucuda mı?

```bash
cd ~/projem
ls -la
# package.json, backend/, src/ görünmeli
```

Yoksa Windows'tan yükle (WinSCP / `scp`):

```powershell
scp -r C:\Users\Fahrihan\Desktop\hype-dashboard\* root@SUNUCU_IP:~/projem/
```

### 2) Backend .env + data

```bash
cd ~/projem
cp deploy/.env.example backend/.env
mkdir -p backend/data backend/uploads
```

### 3) Panel build (Node gerekir)

```bash
cd ~/projem
npm install
npm run build
ls dist/index.html   # olmalı
```

Node yoksa build'i **Windows'ta** yap, sadece `dist/` klasörünü sunucuya at.

### 4) API servisi

```bash
cd ~/projem
# systemd yolunu projene göre düzelt
sudo cp deploy/hypevision-api.service /etc/systemd/system/
sudo sed -i "s|/root/projem|$(pwd)|g" /etc/systemd/system/hypevision-api.service
sudo systemctl daemon-reload
sudo systemctl enable hypevision-api
sudo systemctl start hypevision-api
sudo systemctl status hypevision-api
```

Hata logu:

```bash
journalctl -u hypevision-api -n 50 --no-pager
```

### 5) Nginx

```bash
sudo apt install -y nginx
sudo cp deploy/nginx-hypevision.conf /etc/nginx/sites-available/hypevision
sudo sed -i "s|/root/projem|$(pwd)|g" /etc/nginx/sites-available/hypevision
sudo ln -sf /etc/nginx/sites-available/hypevision /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl reload nginx
```

### 6) Test

```bash
curl -s http://127.0.0.1:8000/docs | head
curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1/
```

---

## Demo hesaplar

| Email | Şifre |
|-------|-------|
| admin@vislivis.com | admin |
| demo@hypevisionlab.com | demo |

---

## Sık sorunlar

| Sorun | Çözüm |
|-------|--------|
| Beyaz/siyah ekran | `dist/` yok → `npm run build` |
| API 500 | `journalctl -u hypevision-api -f` |
| Giriş olmuyor | API çalışıyor mu: `curl http://127.0.0.1:8000/api/meta/roles` |
| WebSocket | nginx config'te Upgrade satırları kalsın |
| Python 3.8 | Proje uyumlu; 3.10+ da olur |

---

## Güncelleme

```bash
cd ~/projem
git pull   # veya dosyaları tekrar kopyala
source venv/bin/activate && pip install -r backend/requirements.txt
npm run build
sudo systemctl restart hypevision-api
sudo systemctl reload nginx
```
