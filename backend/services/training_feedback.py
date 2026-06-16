"""Evet/Hayır geri bildirimi — eğitim veri setine kayıt."""

from __future__ import annotations

import json
import shutil
from datetime import datetime, timezone
from pathlib import Path
from uuid import uuid4

BACKEND_DIR = Path(__file__).resolve().parent.parent
UPLOAD_DIR = BACKEND_DIR / "uploads"
TRAINING_DIR = BACKEND_DIR / "data" / "training"
EVET_DIR = TRAINING_DIR / "evet"
HAYIR_DIR = TRAINING_DIR / "hayir"


def _resolve_image_path(gorsel_url: str) -> Path | None:
    if not gorsel_url:
        return None
    name = gorsel_url.rsplit("/", 1)[-1]
    path = UPLOAD_DIR / name
    return path if path.exists() else None


def save_training_sample(notification: dict, label: str) -> dict:
    if label not in ("evet", "hayir"):
        raise ValueError("label evet veya hayir olmali")

    dest_root = EVET_DIR if label == "evet" else HAYIR_DIR
    dest_root.mkdir(parents=True, exist_ok=True)

    nid = notification.get("id", "unknown")
    stamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%S")
    base = f"n{nid}_{stamp}_{uuid4().hex[:6]}"

    src = _resolve_image_path(notification.get("gorsel", ""))
    image_saved = None
    if src:
        ext = src.suffix or ".jpg"
        dest_img = dest_root / f"{base}{ext}"
        shutil.copy2(src, dest_img)
        image_saved = str(dest_img.relative_to(BACKEND_DIR)).replace("\\", "/")

    meta = {
        "notification_id": nid,
        "label": label,
        "saved_at": datetime.now(timezone.utc).isoformat(),
        "image": image_saved,
        "notification": notification,
    }
    meta_path = dest_root / f"{base}.json"
    meta_path.write_text(json.dumps(meta, ensure_ascii=False, indent=2), encoding="utf-8")

    return {
        "label": label,
        "folder": label,
        "image": image_saved,
        "meta": str(meta_path.relative_to(BACKEND_DIR)).replace("\\", "/"),
    }
