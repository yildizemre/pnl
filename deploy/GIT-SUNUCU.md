# Local → GitHub → Sunucu (hp-pan)

## 1) Bilgisayarında (local)

```powershell
cd C:\Users\Fahrihan\Desktop\hype-dashboard
git add .
git commit -m "fix: Python 3.8 sunucu, deploy, demo_data"
git push origin main
```

(GitHub repo adın `hp-pan` ise remote’u ona push et.)

---

## 2) Sunucuda (VDS)

```bash
cd ~/hp-pan
git pull

source venv/bin/activate
pip install -r backend/requirements.txt

# İlk kez .env yoksa
test -f backend/.env || cp deploy/.env.example backend/.env

chmod +x deploy/post-pull.sh
./deploy/post-pull.sh
```

Panel: **http://SUNUCU_IP/**

---

## Demo hesaplar

| Email | Şifre |
|-------|-------|
| demo@hypevisionlab.com | demo |
| admin@vislivis.com | admin |
