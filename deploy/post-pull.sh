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

# nginx (domain config şablonundan)
if command -v nginx >/dev/null 2>&1 && [ -f deploy/nginx-hypevision.conf ]; then
  sudo sed "s|/root/hp-pan|$PROJECT|g" deploy/nginx-hypevision.conf | sudo tee /etc/nginx/sites-available/hypevision >/dev/null
  sudo ln -sf /etc/nginx/sites-available/hypevision /etc/nginx/sites-enabled/hypevision
  sudo nginx -t && sudo systemctl reload nginx
fi

echo "Bitti. https://panel.hypevisionlab.com/ (SSL: sudo ./deploy/setup-domain-ssl.sh)"
