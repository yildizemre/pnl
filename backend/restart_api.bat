@echo off
setlocal EnableExtensions
chcp 65001 >nul
cd /d "%~dp0"
title HypeVision API Restart

echo Port 8000 temizleniyor...
for /f "tokens=5" %%a in ('netstat -ano 2^>nul ^| findstr ":8000" ^| findstr "LISTENING"') do (
  taskkill /F /PID %%a >nul 2>&1
)
timeout /t 1 /nobreak >nul

echo API baslatiliyor: http://127.0.0.1:8000
start "HypeVision API" cmd /k "cd /d "%~dp0" && python -m uvicorn main:app --reload --host 127.0.0.1 --port 8000"
timeout /t 3 /nobreak >nul
echo Hazir. Ornek: python examples\send_image.py
endlocal
