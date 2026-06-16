"""Bildirim oluşturma ve WebSocket yayını."""

from __future__ import annotations

from datetime import datetime

from store import add_notification, count_unread, find_user_by_id, user_public
from mock_data import DASHBOARD_SUMMARY
from ws_manager import manager


def _summary_for_user(pub: dict, uid: str) -> dict:
    cams = pub.get("kameralar", [])
    n = len(cams)
    if n > 0:
        offline = 1 if n >= 10 else 0
        kameralar = {"aktif": n - offline, "toplam": n, "degisim": f"{n - offline}/{n} çevrimiçi"}
    else:
        kameralar = dict(DASHBOARD_SUMMARY["kameralar"])
    return {
        **DASHBOARD_SUMMARY,
        "kameralar": kameralar,
        "bildirim_sayisi": count_unread(uid),
    }


async def push_notification(user_id: str, item: dict) -> None:
    u = find_user_by_id(user_id)
    pub = user_public(u) if u else {}
    await manager.send_user(
        user_id,
        {
            "type": "notification",
            "item": item,
            "unread": count_unread(user_id),
            "summary": _summary_for_user(pub, user_id),
        },
    )


def build_notification_payload(
    user_id: str,
    *,
    baslik: str,
    detay: str = "",
    kategori: str = "Sistem",
    seviye: str = "bilgi",
    kamera: str = "",
    modul: str = "",
    gorsel: str = "",
    tarih: str | None = None,
    zaman: str | None = None,
) -> dict:
    now = datetime.now()
    return {
        "user_id": user_id,
        "tarih": tarih or now.strftime("%Y-%m-%d"),
        "zaman": zaman or now.strftime("%H:%M"),
        "kamera": kamera,
        "kategori": kategori,
        "baslik": baslik,
        "detay": detay,
        "seviye": seviye,
        "modul": modul,
        "gorsel": gorsel,
        "okundu": False,
    }


def create_notification(user_id: str, payload: dict) -> dict:
    payload = {**payload, "user_id": user_id}
    return add_notification(payload)
