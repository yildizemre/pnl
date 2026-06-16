@echo off
chcp 65001 >nul
cd /d "%~dp0.."
title HypeVision — Demo Bildirim

echo.
echo  Demo bildirim paketi gonderiliyor...
echo  (metin + gorsel, demo@hypevisionlab.com)
echo.

python examples\run_demo.py
echo.
pause
