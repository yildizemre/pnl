#!/bin/bash
# GitHub webhook ile otomatik deploy kurulumu
# Kullanım: cd /home/pnl && sudo ./deploy/setup-auto-deploy.sh

set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$PROJECT_DIR"

ENV_FILE="$PROJECT_DIR/deploy/deploy.env"
SECRET_FILE="$PROJECT_DIR/deploy/.webhook-secret"
SERVICE_SRC="$PROJECT_DIR/deploy/hypevision-deploy-webhook.service"
SERVICE_DST="/etc/systemd/system/hypevision-deploy-webhook.service"
DOMAIN="${DEPLOY_DOMAIN:-panel.hypevisionlab.com}"

echo "=== HypeVision otomatik deploy kurulumu ==="
echo "Proje: $PROJECT_DIR"

mkdir -p "$PROJECT_DIR/deploy/logs"
chmod +x "$PROJECT_DIR/deploy/auto-deploy.sh" "$PROJECT_DIR/deploy/post-pull.sh" "$PROJECT_DIR/deploy/webhook_server.py" "$PROJECT_DIR/deploy/ensure-nginx-hook.sh"

if [ ! -f "$SECRET_FILE" ]; then
  openssl rand -hex 32 >"$SECRET_FILE"
  chmod 600 "$SECRET_FILE"
  echo "[1] Webhook secret oluşturuldu: $SECRET_FILE"
else
  echo "[1] Mevcut webhook secret kullanılıyor"
fi

SECRET="$(tr -d '\n' <"$SECRET_FILE")"
cat >"$ENV_FILE" <<EOF
# Otomatik deploy — git'e ekleme
DEPLOY_WEBHOOK_SECRET=$SECRET
DEPLOY_BRANCH=main
DEPLOY_REPO=yildizemre/pnl
DEPLOY_WEBHOOK_HOST=127.0.0.1
DEPLOY_WEBHOOK_PORT=9001
EOF
chmod 600 "$ENV_FILE"
echo "[2] deploy/deploy.env yazıldı"

sed "s|/home/pnl|$PROJECT_DIR|g" "$SERVICE_SRC" | tee "$SERVICE_DST" >/dev/null
systemctl daemon-reload
systemctl enable hypevision-deploy-webhook
systemctl restart hypevision-deploy-webhook
echo "[3] Webhook servisi: $(systemctl is-active hypevision-deploy-webhook)"

if command -v nginx >/dev/null 2>&1; then
  if [ -f /etc/letsencrypt/live/$DOMAIN/fullchain.pem ]; then
    bash "$PROJECT_DIR/deploy/ensure-nginx-hook.sh"
  elif [ -f "$PROJECT_DIR/deploy/nginx-hypevision.conf" ]; then
    NGINX_CONF="/etc/nginx/sites-available/hypevision"
    sed "s|/root/hp-pan|$PROJECT_DIR|g" "$PROJECT_DIR/deploy/nginx-hypevision.conf" | tee "$NGINX_CONF" >/dev/null
    ln -sf "$NGINX_CONF" /etc/nginx/sites-enabled/hypevision
    nginx -t
    systemctl reload nginx
    echo "[4] nginx güncellendi (/deploy-hook)"
  fi
fi

curl -sf "http://127.0.0.1:9001/health" >/dev/null && echo "[5] Webhook health: OK" || echo "[!] Webhook health kontrolü başarısız"

echo ""
echo "============================================"
echo "  GitHub → Settings → Webhooks → Add webhook"
echo "  Payload URL:  https://$DOMAIN/deploy-hook"
echo "  Content type: application/json"
echo "  Secret:       (deploy/.webhook-secret içinde)"
echo "  Events:       Just the push event"
echo ""
echo "  Secret göster:"
echo "    cat $SECRET_FILE"
echo "  Deploy log:"
echo "    tail -f $PROJECT_DIR/deploy/logs/auto-deploy.log"
echo "  Manuel deploy:"
echo "    $PROJECT_DIR/deploy/auto-deploy.sh"
echo "============================================"
