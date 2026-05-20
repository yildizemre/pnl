# hp-pan — Sunucuda hemen çalıştır

Repo: `~/hp-pan` (GitHub: yildizemre/hp-pan)

`dist/` repoda var → **npm build şart değil.**

---

## Yol 1: venv + nginx (senin kurulumun — önerilen)

```bash
cd ~/hp-pan

# venv proje içinde olsun (~/venv değil)
python3 -m venv venv
source venv/bin/activate
pip install -r backend/requirements.txt

mkdir -p backend/data backend/uploads
cp deploy/.env.example backend/.env

chmod +x deploy/install-vds.sh
sudo ./deploy/install-vds.sh
```

Panel: **http://SUNUCU_IP/**

---

## Yol 2: Docker (docker kuruluysa)

```bash
cd ~/hp-pan
docker compose up -d --build
```

Panel: **http://SUNUCU_IP:5173** (port 5173!)

---

## Manuel (install script olmadan)

```bash
cd ~/hp-pan
source venv/bin/activate
pip install -r backend/requirements.txt
mkdir -p backend/data backend/uploads
cp deploy/.env.example backend/.env

# API arka plan
cd backend
nohup ../venv/bin/python -m uvicorn main:app --host 127.0.0.1 --port 8000 > ../api.log 2>&1 &

# nginx
sudo apt install -y nginx
sudo cp deploy/nginx-hypevision.conf /etc/nginx/sites-available/hypevision
sudo sed -i "s|/root/hp-pan|$(pwd)|g" /etc/nginx/sites-available/hypevision
sudo ln -sf /etc/nginx/sites-available/hypevision /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl reload nginx
```

---

## Demo giriş

| Email | Şifre |
|-------|-------|
| demo@hypevisionlab.com | demo |
| admin@vislivis.com | admin |

---

## Sorun giderme

```bash
# API çalışıyor mu?
curl -s http://127.0.0.1:8000/docs | head -2

# systemd
journalctl -u hypevision-api -n 30 --no-pager

# nginx
sudo nginx -t
```
