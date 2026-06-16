#!/bin/bash
# Mevcut nginx config'e /deploy-hook ekler (SSL/certbot ayarlarını silmez).
set -euo pipefail

CONF="${1:-/etc/nginx/sites-available/hypevision}"

if [ ! -f "$CONF" ]; then
  echo "[!] nginx config yok: $CONF"
  exit 1
fi

if grep -q 'location /deploy-hook' "$CONF"; then
  echo "deploy-hook zaten tanımlı"
  exit 0
fi

python3 - "$CONF" <<'PY'
import sys
from pathlib import Path

path = Path(sys.argv[1])
text = path.read_text(encoding="utf-8")
block = """    location /deploy-hook {
        proxy_pass http://127.0.0.1:9001;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Hub-Signature-256 $http_x_hub_signature_256;
        proxy_set_header X-GitHub-Event $http_x_github_event;
    }

"""
if "location /deploy-hook" in text:
    sys.exit(0)
if "location /uploads/" not in text:
    print("[!] location /uploads/ bulunamadı", file=sys.stderr)
    sys.exit(1)
text = text.replace("    location /uploads/", block + "    location /uploads/")
path.write_text(text, encoding="utf-8")
print("deploy-hook eklendi")
PY

nginx -t
systemctl reload nginx
echo "nginx reload OK"
