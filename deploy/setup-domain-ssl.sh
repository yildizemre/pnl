#!/bin/bash
# panel.hypevisionlab.com + Let's Encrypt SSL
# Kullanım: deactivate 2>/dev/null; cd /home/pnl && sudo ./deploy/setup-domain-ssl.sh
#
# Not: venv aktifken apt certbot pyOpenSSL ile çakışabilir — script temiz ortam kullanır.

set -e

DOMAIN="${DOMAIN:-panel.hypevisionlab.com}"
EMAIL="${CERTBOT_EMAIL:-admin@hypevisionlab.com}"
PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
CERTBOT_BIN=""

echo "=== HypeVision domain + SSL ==="
echo "Domain: $DOMAIN"
echo "Proje:  $PROJECT_DIR"

chmod 755 /root 2>/dev/null || true
chmod -R 755 "$PROJECT_DIR/dist" 2>/dev/null || true
chmod 755 "$PROJECT_DIR" 2>/dev/null || true
PARENT="$(dirname "$PROJECT_DIR")"
if [ "$PARENT" != "/" ]; then chmod 755 "$PARENT" 2>/dev/null || true; fi
if [ "$(dirname "$PARENT")" != "/" ]; then chmod 755 "$(dirname "$PARENT")" 2>/dev/null || true; fi

NGINX_CONF="/etc/nginx/sites-available/hypevision"
sed "s|/root/hp-pan|$PROJECT_DIR|g" "$PROJECT_DIR/deploy/nginx-hypevision.conf" | tee "$NGINX_CONF" >/dev/null
ln -sf "$NGINX_CONF" /etc/nginx/sites-enabled/hypevision
rm -f /etc/nginx/sites-enabled/default 2>/dev/null || true

nginx -t
systemctl reload nginx

echo ""
echo "DNS kontrolü (@8.8.8.8 — global):"
SERVER_IP="$(curl -4 -s --max-time 5 ifconfig.me 2>/dev/null || hostname -I | awk '{print $1}')"
DNS_IP="$(dig +short "$DOMAIN" @8.8.8.8 2>/dev/null | grep -E '^[0-9.]+$' | head -1)"
echo "  Sunucu IP: ${SERVER_IP:-?}"
echo "  DNS $DOMAIN -> ${DNS_IP:-çözülemedi}"
if [ -n "$SERVER_IP" ] && [ -n "$DNS_IP" ] && [ "$SERVER_IP" != "$DNS_IP" ]; then
  echo ""
  echo "[!] UYARI: Global DNS ($DNS_IP) sunucu IP ($SERVER_IP) ile farklı."
  echo "    Netlify DNS A kaydını kontrol et. Yine de devam için: e"
  read -r -p "Devam? (e/h) " ans
  [ "$ans" = "e" ] || [ "$ans" = "E" ] || exit 1
fi

if command -v ufw >/dev/null 2>&1 && ufw status 2>/dev/null | grep -q "Status: active"; then
  ufw allow 80/tcp
  ufw allow 443/tcp
fi

install_certbot() {
  # Snap certbot — venv cryptography ile çakışmaz (önerilen)
  if command -v snap >/dev/null 2>&1; then
    echo "[*] certbot (snap) kuruluyor..."
    snap install core 2>/dev/null || snap refresh core 2>/dev/null || true
    if snap install --classic certbot 2>/dev/null; then
      ln -sf /snap/bin/certbot /usr/bin/certbot 2>/dev/null || true
      CERTBOT_BIN="/snap/bin/certbot"
      return 0
    fi
  fi

  echo "[*] certbot (apt) kuruluyor..."
  apt-get update -qq
  DEBIAN_FRONTEND=noninteractive apt-get install -y -qq certbot python3-certbot-nginx \
    python3-openssl python3-cryptography 2>/dev/null || true
  CERTBOT_BIN="$(command -v certbot)"
}

run_certbot() {
  # venv PYTHONPATH / cryptography certbot'u bozar
  env -i \
    HOME=/root \
    PATH=/snap/bin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/bin \
    TERM="${TERM:-xterm}" \
    "$CERTBOT_BIN" --nginx \
    -d "$DOMAIN" \
    --non-interactive \
    --agree-tos \
    --email "$EMAIL" \
    --redirect
}

install_certbot

if ! env -i PATH="/snap/bin:/usr/sbin:/usr/bin" "$CERTBOT_BIN" --version >/dev/null 2>&1; then
  echo "[!] certbot test başarısız — OpenSSL paketleri onarılıyor..."
  apt-get install -y --reinstall python3-openssl python3-cryptography openssl 2>/dev/null || true
fi

if ! run_certbot 2>/dev/null; then
  echo ""
  echo "[!] İlk deneme başarısız. Snap certbot ile tekrar..."
  if command -v snap >/dev/null 2>&1; then
    snap install --classic certbot 2>/dev/null || true
    CERTBOT_BIN="/snap/bin/certbot"
    ln -sf /snap/bin/certbot /usr/bin/certbot 2>/dev/null || true
    run_certbot
  else
    exit 1
  fi
fi

nginx -t
systemctl reload nginx

echo ""
echo "============================================"
echo "  Panel:  https://$DOMAIN/"
echo "  Admin:  admin@hypevisionlab.com / admin"
echo "  Demo:   demo@hypevisionlab.com / demo"
echo "============================================"
