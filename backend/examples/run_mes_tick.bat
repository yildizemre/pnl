@echo off
chcp 65001 >nul
cd /d "%~dp0\.."
python examples\send_mes_tick.py %*
pause
