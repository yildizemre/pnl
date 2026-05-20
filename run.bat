@echo off
chcp 65001 >nul
cd /d "%~dp0"
title HypeVision

echo.
echo  ============================================
echo    HypeVision - Backend + Panel
echo  ============================================
echo.

if not exist "node_modules\" (
  echo  npm paketleri yukleniyor...
  call npm install
  if errorlevel 1 exit /b 1
)

if not exist "backend\data\" mkdir "backend\data"

echo  [1/2] API baslatiliyor  http://127.0.0.1:8000
echo        Veritabani: backend\data\hypevision.db
start "HypeVision API" cmd /k "cd /d "%~dp0backend" && python -m uvicorn main:app --reload --host 127.0.0.1 --port 8000"

timeout /t 3 /nobreak >nul

echo  [2/2] Panel baslatiliyor  http://localhost:5173
start "HypeVision Panel" cmd /k "cd /d "%~dp0" && npm run dev"

echo.
echo  Panel ac:     http://localhost:5173
echo  Admin giris:  admin@vislivis.com  /  admin
echo.
echo  - Uyelik yonetimi: kullanici ekle (DB kayit)
echo  - Bildirimler: eklediklerin DB de kalir
echo  - Panele Git: otomatik Ana Sayfaya gider
echo.
echo  Kapatmak icin acilan 2 pencereyi kapat.
echo.
pause
