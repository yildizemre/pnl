#!/bin/bash
# HypeVision VDS kurulumu — Ubuntu/Debian
# Kullanım: cd /home/pnl && chmod +x deploy/install-vds.sh && sudo ./deploy/install-vds.sh

set -e
PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$PROJECT_DIR"

echo "=== HypeVision VDS kurulum ==="
echo "Proje: $PROJECT_DIR"

# --- Python venv (3.10+ tercih; 3.8'de asyncio.to_thread yok) ---
PYTHON=""
for candidate in python3.12 python3.11 python3.10 python3; do
  if command -v "$candidate" >/dev/null 2>&1; then
    ver=$("$candidate" -c 'import sys; print(f"{sys.version_info.major}.{sys.version_info.minor}")')
    major=${ver%%.*}
    minor=${ver#*.}
    if [ "$major" -gt 3 ] || { [ "$major" -eq 3 ] && [ "$minor" -ge 9 ]; }; then
      PYTHON=$candidate
      break
    fi
    [ -z "$PYTHON" ] && PYTHON=$candidate
  fi
done
if [ -z "$PYTHON" ]; then
  echo "[!] python3 bulunamadı"
  exit 1
fi
echo "[*] Python: $PYTHON ($($PYTHON --version 2>&1))"

if [ ! -d "$PROJECT_DIR/venv" ]; then
  echo "[1] Python venv oluşturuluyor..."
  "$PYTHON" -m venv "$PROJECT_DIR/venv"
fi
# shellcheck disable=SC1091
source "$PROJECT_DIR/venv/bin/activate"
pip install -q --upgrade pip
pip install -q -r "$PROJECT_DIR/backend/requirements.txt"

# --- Backend .env ---
if [ ! -f "$PROJECT_DIR/backend/.env" ]; then
  SECRET=$(openssl rand -hex 24 2>/dev/null || head -c 24 /dev/urandom | xxd -p | tr -d '\n')
  if [ -f "$PROJECT_DIR/deploy/.env.example" ]; then
    cp "$PROJECT_DIR/deploy/.env.example" "$PROJECT_DIR/backend/.env"
    sed -i "s/uzun-rastgele-bir-anahtar-degistir/$SECRET/" "$PROJECT_DIR/backend/.env" 2>/dev/null || true
  else
    cat >"$PROJECT_DIR/backend/.env" <<EOF
JWT_SECRET=${SECRET}
WS_PUSH_SECONDS=8
EOF
  fi
  echo "[2] backend/.env oluşturuldu"
fi
mkdir -p "$PROJECT_DIR/backend/data" "$PROJECT_DIR/backend/uploads"

# nginx (www-data) dist okuyabilsin
chmod 755 "$PROJECT_DIR" "$PROJECT_DIR/dist" 2>/dev/null || true
PARENT="$(dirname "$PROJECT_DIR")"
if [ "$PARENT" != "/" ]; then chmod 755 "$PARENT" 2>/dev/null || true; fi
if [ "$(dirname "$PARENT")" != "/" ]; then chmod 755 "$(dirname "$PARENT")" 2>/dev/null || true; fi

# --- Frontend build ---
if [ -f "$PROJECT_DIR/dist/index.html" ]; then
  echo "[3] dist/ zaten var — build atlandı"
elif ! command -v node >/dev/null 2>&1; then
  echo "[!] Node.js yok ve dist/ yok!"
  echo "    GitHub'daki dist/ ile gelmeli veya: npm run build"
  exit 1
else
  echo "[3] npm install + build..."
  cd "$PROJECT_DIR"
  npm install
  VITE_API_URL= npm run build
  echo "    dist/ hazır"
fi

# --- systemd API ---
SERVICE=/etc/systemd/system/hypevision-api.service
sed "s|/root/hp-pan|$PROJECT_DIR|g" "$PROJECT_DIR/deploy/hypevision-api.service" | sudo tee "$SERVICE" >/dev/null
sudo systemctl daemon-reload
sudo systemctl enable hypevision-api
sudo systemctl restart hypevision-api
echo "[4] API servisi: $(systemctl is-active hypevision-api)"

# --- nginx ---
if command -v nginx >/dev/null 2>&1; then
  NGINX_CONF="/etc/nginx/sites-available/hypevision"
  sed "s|/root/hp-pan|$PROJECT_DIR|g" "$PROJECT_DIR/deploy/nginx-hypevision.conf" | sudo tee "$NGINX_CONF" >/dev/null
  sudo ln -sf "$NGINX_CONF" /etc/nginx/sites-enabled/hypevision
  sudo rm -f /etc/nginx/sites-enabled/default 2>/dev/null || true
  sudo nginx -t && sudo systemctl reload nginx
  echo "[5] nginx aktif — panel.hypevisionlab.com (SSL: ./deploy/setup-domain-ssl.sh)"
else
  echo "[!] nginx yok. Kur: sudo apt update && sudo apt install -y nginx"
  echo "    Geçici test: cd backend && ../venv/bin/python -m uvicorn main:app --host 0.0.0.0 --port 8000"
fi

# İlk seed
sleep 2
curl -sf http://127.0.0.1:8000/docs >/dev/null && echo "[6] API yanıt veriyor ✓" || echo "[!] API kontrol: journalctl -u hypevision-api -n 30"

# --- Otomatik deploy (GitHub webhook) ---
if [ -f "$PROJECT_DIR/deploy/setup-auto-deploy.sh" ]; then
  chmod +x "$PROJECT_DIR/deploy/setup-auto-deploy.sh" "$PROJECT_DIR/deploy/auto-deploy.sh" 2>/dev/null || true
  if [ ! -f "$PROJECT_DIR/deploy/deploy.env" ]; then
    echo "[7] GitHub webhook deploy kuruluyor..."
    "$PROJECT_DIR/deploy/setup-auto-deploy.sh" || echo "[!] Webhook kurulumu atlandı"
  else
    systemctl restart hypevision-deploy-webhook 2>/dev/null || true
    echo "[7] Webhook deploy servisi: $(systemctl is-active hypevision-deploy-webhook 2>/dev/null || echo 'kurulmadı')"
  fi
fi

echo ""
echo "============================================"
echo "  Panel:  https://panel.hypevisionlab.com/  (SSL: ./deploy/setup-domain-ssl.sh)"
echo "  Admin:  admin@hypevisionlab.com / admin"
echo "  Demo:   demo@hypevisionlab.com / demo"
echo "  Log:    journalctl -u hypevision-api -f"
echo "============================================"
