@echo off
cd /d "%~dp0"
pip install -r requirements.txt -q
python -m uvicorn main:app --reload --host 0.0.0.0 --port 8000
