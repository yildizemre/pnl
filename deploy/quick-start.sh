#!/bin/bash
# Nginx olmadan hızlı test — API dışarı açık (demo için firewall'da 8000 aç)
set -e
cd "$(dirname "$0")/.."
source venv/bin/activate
mkdir -p backend/data backend/uploads
[ -f backend/.env ] || cp deploy/.env.example backend/.env

if [ ! -d dist ]; then
  echo "dist yok — önce: npm install && npm run build"
  exit 1
fi

# Statik dosya + API tek portta değil; sadece API:
echo "API: http://0.0.0.0:8000"
echo "Panel için nginx veya bilgisayardan dist serve et."
exec python -m uvicorn main:app --host 0.0.0.0 --port 8000 --app-dir backend
