"""AI algılama bildirimi — yapılandırılmış JSON."""

from __future__ import annotations

import json
from datetime import datetime
from typing import Any


def parse_event_time(zaman: str | None) -> tuple[str, str, str | None]:
    """tarih, zaman (HH:MM), iso_zaman"""
    if not zaman:
        now = datetime.now()
        return now.strftime("%Y-%m-%d"), now.strftime("%H:%M"), now.isoformat(timespec="seconds")
    raw = str(zaman).strip()
    try:
        dt = datetime.fromisoformat(raw.replace("Z", "+00:00"))
        return dt.strftime("%Y-%m-%d"), dt.strftime("%H:%M"), dt.isoformat(timespec="seconds")
    except ValueError:
        if len(raw) <= 8 and ":" in raw:
            now = datetime.now()
            return now.strftime("%Y-%m-%d"), raw[:5], raw
        now = datetime.now()
        return now.strftime("%Y-%m-%d"), now.strftime("%H:%M"), raw


def build_detection_meta(body: dict[str, Any]) -> dict[str, Any]:
    meta: dict[str, Any] = {}
    if body.get("alan"):
        meta["alan"] = str(body["alan"])
    if body.get("guven") is not None:
        try:
            meta["guven"] = float(body["guven"])
        except (TypeError, ValueError):
            pass
    if body.get("zaman"):
        _, _, iso = parse_event_time(body.get("zaman"))
        meta["zaman"] = iso
    if body.get("kamera_id"):
        meta["kamera_id"] = str(body["kamera_id"])
    if body.get("model"):
        meta["model"] = str(body["model"])
    if body.get("bbox"):
        meta["bbox"] = body["bbox"]
    return meta


def format_detection_detay(meta: dict[str, Any]) -> str:
    parts: list[str] = []
    if meta.get("alan"):
        parts.append(f"Alan: {meta['alan']}")
    if meta.get("guven") is not None:
        g = meta["guven"]
        pct = g * 100 if g <= 1 else g
        parts.append(f"Doğruluk: {pct:.1f}%")
    if meta.get("model"):
        parts.append(f"Model: {meta['model']}")
    return " · ".join(parts)


def detection_to_notification_fields(body: dict[str, Any]) -> dict[str, Any]:
    meta = build_detection_meta(body)
    tarih, zaman, _ = parse_event_time(body.get("zaman"))
    detay = body.get("detay") or format_detection_detay(meta)
    return {
        "baslik": body["baslik"],
        "detay": detay,
        "kategori": body.get("kategori", "Sistem"),
        "seviye": body.get("seviye", "bilgi"),
        "kamera": body.get("kamera", ""),
        "modul": body.get("modul", ""),
        "tarih": tarih,
        "zaman": zaman,
        "gorsel": body.get("gorsel_url") or body.get("gorsel") or "",
        "meta_json": json.dumps(meta, ensure_ascii=False),
    }
