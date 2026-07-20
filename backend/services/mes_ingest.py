"""MES YOLO tick → günlük verimli/verimsiz hesaplama.

Her ~30 dk kamera başına batch gelir. Backend slot doldurur, oranları hesaplar.
Vardiya: 08:00–17:00 (18 × 30 dk slot).
"""

from __future__ import annotations

from datetime import datetime
from typing import Any

SHIFT_START_MIN = 8 * 60
SHIFT_END_MIN = 17 * 60
SLOT_MINUTES = 30
SLOT_COUNT = (SHIFT_END_MIN - SHIFT_START_MIN) // SLOT_MINUTES  # 18
THRESHOLD_PCT = 85.0


def _fmt(mins: int) -> str:
    h, m = divmod(int(mins) % (24 * 60), 60)
    return f"{h:02d}:{m:02d}"


def parse_observed_at(value: str | None) -> datetime:
    if not value:
        return datetime.now().astimezone()
    raw = value.strip().replace("Z", "+00:00")
    try:
        dt = datetime.fromisoformat(raw)
    except ValueError:
        return datetime.now().astimezone()
    if dt.tzinfo is None:
        return dt
    return dt.astimezone()


def slot_index_for(dt: datetime) -> int:
    """Gözlem anının vardiya içi slot index'i (0..17)."""
    minute = dt.hour * 60 + dt.minute
    if minute < SHIFT_START_MIN:
        return 0
    if minute >= SHIFT_END_MIN:
        return SLOT_COUNT - 1
    return (minute - SHIFT_START_MIN) // SLOT_MINUTES


def merge_slot(slots: dict[str, bool], index: int, present: bool) -> dict[str, bool]:
    out = dict(slots)
    out[str(index)] = bool(present)
    return out


def _seg(start_m: int, end_m: int, status: str) -> dict:
    dur = max(0, end_m - start_m)
    total = SLOT_COUNT * SLOT_MINUTES
    return {
        "start": _fmt(start_m),
        "end": _fmt(end_m),
        "status": status,
        "minutes": dur,
        "pct": round(dur / total * 100, 2) if total else 0,
    }


def build_person_record(
    *,
    person_id: str,
    ad: str,
    masa: str = "",
    hat: str = "",
    kamera: str = "",
    slots: dict[str, bool],
    as_of: datetime | None = None,
) -> dict[str, Any]:
    """Slot haritasından panel personel kaydı.

    Metrikler yalnız YOLO'nun gönderdiği slotlardan hesaplanır (boşluklar oranı bozmaz).
    """
    now = as_of or datetime.now().astimezone()
    now_slot = slot_index_for(now)
    filled = {int(k): bool(v) for k, v in slots.items() if str(k).isdigit()}
    last_filled = max(filled.keys()) if filled else -1
    horizon = max(now_slot, last_filled)

    present_m = sum(SLOT_MINUTES for v in filled.values() if v)
    absent_m = sum(SLOT_MINUTES for v in filled.values() if not v)

    statuses: list[str] = []
    for i in range(SLOT_COUNT):
        if i in filled:
            statuses.append("present" if filled[i] else "absent")
        elif i <= horizon:
            # Beklenen ama gelmeyen slot → verimsiz
            statuses.append("absent")
        else:
            statuses.append("present")

    segments: list[dict] = []
    seg_status = statuses[0]
    seg_start = SHIFT_START_MIN
    for i in range(1, SLOT_COUNT):
        if statuses[i] != seg_status:
            end = SHIFT_START_MIN + i * SLOT_MINUTES
            segments.append(_seg(seg_start, end, seg_status))
            seg_status = statuses[i]
            seg_start = end
    segments.append(_seg(seg_start, SHIFT_END_MIN, seg_status))

    observed = present_m + absent_m
    presence_pct = round(present_m / observed * 100, 1) if observed else 0.0
    durum = "verimli" if presence_pct >= THRESHOLD_PCT else "verimsiz"

    return {
        "id": person_id,
        "ad": ad,
        "hat": hat or "—",
        "masa": masa or "—",
        "kamera": kamera or "—",
        "vardiya": "sabah",
        "durum": durum,
        "verimlilik": presence_pct,
        "yerinde_saat": round(present_m / 60, 1),
        "yok_saat": round(absent_m / 60, 1),
        "yerinde_dk": present_m,
        "yok_dk": absent_m,
        "presence_pct": presence_pct,
        "segments": segments,
        "vardiya_baslangic": "08:00",
        "vardiya_bitis": "17:00",
        "slots": {str(k): v for k, v in sorted(filled.items())},
    }


def normalize_station(raw: dict, camera_id: str = "") -> dict | None:
    pid = str(raw.get("person_id") or raw.get("id") or "").strip()
    if not pid:
        return None
    present = raw.get("present")
    if present is None:
        present = raw.get("status") in ("present", "verimli", "yerinde", True, 1, "1")
    return {
        "person_id": pid,
        "ad": str(raw.get("name") or raw.get("ad") or pid),
        "masa": str(raw.get("masa") or raw.get("station") or ""),
        "hat": str(raw.get("hat") or raw.get("line") or ""),
        "kamera": str(raw.get("kamera") or camera_id or ""),
        "present": bool(present),
    }
