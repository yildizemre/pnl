#!/bin/bash
# GitHub push veya manuel tetikleme sonrası güncelleme.
# Kullanım: ./deploy/auto-deploy.sh
set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$PROJECT_DIR"

LOCK_FILE="/tmp/hypevision-deploy.lock"
LOG_DIR="$PROJECT_DIR/deploy/logs"
LOG_FILE="$LOG_DIR/auto-deploy.log"
BRANCH="${DEPLOY_BRANCH:-main}"

mkdir -p "$LOG_DIR"
exec 9>"$LOCK_FILE"
if ! flock -n 9; then
  echo "$(date -Iseconds) deploy zaten çalışıyor, atlandı" | tee -a "$LOG_FILE"
  exit 0
fi

{
  echo ""
  echo "=== $(date -Iseconds) deploy başladı ==="
  echo "Proje: $PROJECT_DIR | branch: $BRANCH"

  if [ ! -d .git ]; then
    echo "[!] .git yok — git pull atlandı"
    "$PROJECT_DIR/deploy/post-pull.sh"
    echo "=== deploy bitti (post-pull only) ==="
    exit 0
  fi

  git fetch origin "$BRANCH"
  BEFORE="$(git rev-parse HEAD)"
  REMOTE_REF="origin/$BRANCH"

  if ! git show-ref --verify --quiet "refs/remotes/$REMOTE_REF"; then
    echo "[!] Uzak branch bulunamadı: $REMOTE_REF"
    exit 1
  fi

  git merge --ff-only "$REMOTE_REF"
  AFTER="$(git rev-parse HEAD)"

  if [ "$BEFORE" = "$AFTER" ]; then
    echo "Zaten güncel ($AFTER)"
  else
    echo "Güncellendi: ${BEFORE:0:8} -> ${AFTER:0:8}"
    if [ ! -x "$PROJECT_DIR/venv/bin/python3" ]; then
      echo "venv eksik — yeniden oluşturuluyor..."
      python3 -m venv "$PROJECT_DIR/venv"
    fi
    "$PROJECT_DIR/deploy/post-pull.sh"
  fi

  if curl -sf http://127.0.0.1:8000/api/meta/roles >/dev/null; then
    echo "API sağlık kontrolü: OK"
  else
    echo "[!] API yanıt vermiyor — journalctl -u hypevision-api -n 30"
    exit 1
  fi

  echo "=== deploy bitti ==="
} >>"$LOG_FILE" 2>&1

tail -20 "$LOG_FILE"
