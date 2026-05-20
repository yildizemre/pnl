#!/bin/bash
# panel.hypevisionlab.com + Let's Encrypt SSL
# Kullanım: cd ~/hp-pan && chmod +x deploy/setup-domain-ssl.sh && sudo ./deploy/setup-domain-ssl.sh
#
# Ön koşul: DNS A kaydı panel -> sunucu IP (propagation tamamlanmış olmalı)

set -e

DOMAIN="${DOMAIN:-panel.hypevisionlab.com}"
EMAIL="${CERTBOT_EMAIL:-admin@hypevisionlab.com}"
PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"

echo "=== HypeVision domain + SSL ==="
echo "Domain: $DOMAIN"
echo "Proje:  $PROJECT_DIR"

# nginx www-data /root okuma
chmod 755 /root 2>/dev/null || true
chmod -R 755 "$PROJECT_DIR/dist" 2>/dev/null || true

NGINX_CONF="/etc/nginx/sites-available/hypevision"
sed "s|/root/hp-pan|$PROJECT_DIR|g" "$PROJECT_DIR/deploy/nginx-hypevision.conf" | tee "$NGINX_CONF" >/dev/null
ln -sf "$NGINX_CONF" /etc/nginx/sites-enabled/hypevision
rm -f /etc/nginx/sites-enabled/default 2>/dev/null || true

nginx -t
systemctl reload nginx

echo ""
echo "DNS kontrolü (sunucu IP ile panel A kaydı eşleşmeli):"
SERVER_IP="$(curl -4 -s --max-time 5 ifconfig.me 2>/dev/null || hostname -I | awk '{print $1}')"
DNS_IP="$(getent ahostsv4 "$DOMAIN" 2>/dev/null | awk '{print $1; exit}')"
echo "  Sunucu IP: ${SERVER_IP:-?}"
echo "  DNS $DOMAIN -> ${DNS_IP:-çözülemedi}"
if [ -n "$SERVER_IP" ] && [ -n "$DNS_IP" ] && [ "$SERVER_IP" != "$DNS_IP" ]; then
  echo ""
  echo "[!] UYARI: DNS IP ($DNS_IP) sunucu IP ($SERVER_IP) ile aynı değil."
  echo "    TurkTicaret panelinde A kaydını düzelt, 5-60 dk bekle, tekrar çalıştır."
  read -r -p "Yine de devam edilsin mi? (e/h) " ans
  [ "$ans" = "e" ] || [ "$ans" = "E" ] || exit 1
fi

apt-get update -qq
DEBIAN_FRONTEND=noninteractive apt-get install -y -qq certbot python3-certbot-nginx

# Firewall (varsa)
if command -v ufw >/dev/null 2>&1 && ufw status 2>/dev/null | grep -q "Status: active"; then
  ufw allow 80/tcp
  ufw allow 443/tcp
fi

certbot --nginx \
  -d "$DOMAIN" \
  --non-interactive \
  --agree-tos \
  --email "$EMAIL" \
  --redirect

nginx -t
systemctl reload nginx

echo ""
echo "============================================"
echo "  Panel:  https://$DOMAIN/"
echo "  Admin:  admin@hypevisionlab.com / admin"
echo "  Demo:   demo@hypevisionlab.com / demo"
echo "============================================"
echo "Sertifika yenileme otomatik (certbot timer)."
