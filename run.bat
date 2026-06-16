@echo off
setlocal EnableExtensions
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

echo  Port 8000 temizleniyor (eski API surecleri)...
powershell -NoProfile -Command "Get-CimInstance Win32_Process -Filter \"name='python.exe'\" | Where-Object { $_.CommandLine -match 'uvicorn main:app|multiprocessing.spawn' } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }" >nul 2>&1
for /L %%i in (1,1,2) do (
  for /f "tokens=5" %%a in ('netstat -ano 2^>nul ^| findstr ":8000" ^| findstr "LISTENING"') do (
    taskkill /F /PID %%a >nul 2>&1
  )
  ping 127.0.0.1 -n 2 >nul
)

echo  [1/2] API baslatiliyor  http://127.0.0.1:8000
echo        Veritabani: backend\data\hypevision.db
start "HypeVision API" cmd /k "cd /d "%~dp0backend" && python -m uvicorn main:app --host 127.0.0.1 --port 8000"

ping 127.0.0.1 -n 4 >nul

echo  [2/2] Panel baslatiliyor  http://localhost:5173
start "HypeVision Panel" cmd /k "cd /d "%~dp0" && npm run dev"

echo.
echo  Panel ac:     http://localhost:5173
echo  Admin giris:  admin@hypevisionlab.com  /  admin
echo  Demo giris:   demo@hypevisionlab.com   /  demo123
echo.
echo  API hazir olana kadar 5-10 sn bekleyin, sonra giris yapin.
echo  Kapatmak icin acilan 2 pencereyi kapat.
echo.
pause
endlocal
