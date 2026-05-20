#!/bin/bash
# git pull sonrası sunucuda: ./deploy/post-pull.sh
set -e
cd "$(dirname "$0")/.."
PROJECT="$(pwd)"

source venv/bin/activate
pip install -q -r backend/requirements.txt
mkdir -p backend/data backend/uploads

if [ ! -f backend/.env ]; then
  cp deploy/.env.example backend/.env 2>/dev/null || true
fi

# Python 3.8 test
cd backend && python -c "import main; print('import OK')" && cd ..

# systemd yolu güncelle
if [ -f /etc/systemd/system/hypevision-api.service ]; then
  sudo sed -i "s|WorkingDirectory=.*|WorkingDirectory=$PROJECT/backend|" /etc/systemd/system/hypevision-api.service
  sudo sed -i "s|ExecStart=.*|ExecStart=$PROJECT/venv/bin/python -m uvicorn main:app --host 127.0.0.1 --port 8000|" /etc/systemd/system/hypevision-api.service
  sudo sed -i "s|EnvironmentFile=.*|EnvironmentFile=-$PROJECT/backend/.env|" /etc/systemd/system/hypevision-api.service
  sudo systemctl daemon-reload
  sudo systemctl restart hypevision-api
  echo "API: $(systemctl is-active hypevision-api)"
fi

# nginx root
if [ -f /etc/nginx/sites-available/hypevision ]; then
  sudo sed -i "s|root .*dist;|root $PROJECT/dist;|" /etc/nginx/sites-available/hypevision
  sudo nginx -t && sudo systemctl reload nginx
fi

echo "Bitti. http://$(hostname -I | awk '{print $1}')/"
