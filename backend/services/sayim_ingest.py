"""YOLO sayım tick → saatlik kova + panel özeti."""

from __future__ import annotations

import json
from datetime import date, datetime, timedelta
from typing import Any

from models import SayimBucketModel, SessionLocal


STATIONS_DEMO = [
    {"id": "ST-01", "ad": "Sevkiyat Çıkışı", "hat": "Hat 1", "kamera": "Kamera 09", "beklenen_saat": 40},
    {"id": "ST-02", "ad": "Montaj Çıkış A", "hat": "Hat 1", "kamera": "Kamera 01", "beklenen_saat": 45},
    {"id": "ST-03", "ad": "Paketleme Giriş", "hat": "Hat 2", "kamera": "Kamera 04", "beklenen_saat": 55},
    {"id": "ST-04", "ad": "Paketleme Çıkış", "hat": "Hat 2", "kamera": "Kamera 05", "beklenen_saat": 50},
    {"id": "ST-05", "ad": "Kalite Bant", "hat": "Hat 3", "kamera": "Kamera 06", "beklenen_saat": 30},
    {"id": "ST-06", "ad": "Palet Sevk", "hat": "Hat 3", "kamera": "Kamera 10", "beklenen_saat": 35},
]

SHIFT_HOURS = list(range(8, 18))  # 08:00–17:00


def _hour_label(h: int) -> str:
    return f"{h:02d}:00"


def _session():
    return SessionLocal()


def normalize_sayim_tick(raw: dict, camera_id: str = "") -> dict | None:
    sid = str(raw.get("station_id") or raw.get("id") or "").strip()
    if not sid:
        return None
    cycle = raw.get("cycle_seconds")
    try:
        cycle_f = float(cycle) if cycle is not None else None
    except (TypeError, ValueError):
        cycle_f = None
    try:
        delta = int(raw.get("count") if raw.get("count") is not None else raw.get("adet") or 1)
    except (TypeError, ValueError):
        delta = 1
    if delta < 0:
        delta = 0
    return {
        "station_id": sid,
        "ad": str(raw.get("station_name") or raw.get("ad") or raw.get("name") or sid),
        "hat": str(raw.get("hat") or raw.get("line") or ""),
        "kamera": str(raw.get("kamera") or camera_id or ""),
        "adet": delta,
        "cycle_seconds": cycle_f,
        "beklenen": raw.get("beklenen"),
    }


def ingest_sayim_ticks(
    user_id: str,
    stations: list[dict],
    *,
    camera_id: str = "",
    ts: datetime | None = None,
) -> dict:
    """Her sayım olayını saatlik kovaya yazar. cycle_seconds YOLO'dan gelir."""
    now = ts or datetime.now()
    tarih = now.date().isoformat()
    saat = _hour_label(now.hour)
    upserted = 0

    with _session() as db:
        for raw in stations:
            st = normalize_sayim_tick(raw, camera_id)
            if not st:
                continue
            row = (
                db.query(SayimBucketModel)
                .filter_by(user_id=user_id, tarih=tarih, saat=saat, station_id=st["station_id"])
                .first()
            )
            cycle = st.get("cycle_seconds")
            if row is None:
                row = SayimBucketModel(
                    user_id=user_id,
                    tarih=tarih,
                    saat=saat,
                    station_id=st["station_id"],
                    ad=st["ad"],
                    hat=st["hat"],
                    kamera=st["kamera"],
                    adet=st["adet"],
                    cycle_sum_ms=int((cycle or 0) * 1000) if cycle else 0,
                    cycle_count=1 if cycle else 0,
                    beklenen=int(st["beklenen"]) if st.get("beklenen") is not None else 0,
                )
                db.add(row)
            else:
                row.adet = int(row.adet or 0) + st["adet"]
                if st["ad"]:
                    row.ad = st["ad"]
                if st["hat"]:
                    row.hat = st["hat"]
                if st["kamera"]:
                    row.kamera = st["kamera"]
                if cycle is not None:
                    row.cycle_sum_ms = int(row.cycle_sum_ms or 0) + int(cycle * 1000)
                    row.cycle_count = int(row.cycle_count or 0) + 1
                if st.get("beklenen") is not None:
                    row.beklenen = int(st["beklenen"])
            upserted += 1
        db.commit()

    return {"ok": True, "upserted": upserted, "tarih": tarih, "saat": saat}


def _demo_buckets_for_day(tarih: str) -> list[dict]:
    """Demo veri — YOLO henüz göndermediyse panel dolu görünsün."""
    seed = sum(ord(c) for c in tarih) % 17
    rows: list[dict] = []
    for si, st in enumerate(STATIONS_DEMO):
        for h in SHIFT_HOURS:
            # 10→11 hızlı (~15sn), 11→12 yavaş (~30sn) örneği
            if h == 10:
                cycle = 15.0 + (si % 3)
                mult = 1.15
            elif h == 11:
                cycle = 28.0 + (si % 4)
                mult = 0.72
            elif h in (12, 13):
                cycle = 22.0
                mult = 0.85
            else:
                cycle = 18.0 + ((si + h + seed) % 8)
                mult = 0.95 + ((h + si) % 5) * 0.03
            beklenen = st["beklenen_saat"]
            adet = max(1, int(beklenen * mult + ((seed + si + h) % 5) - 2))
            rows.append(
                {
                    "tarih": tarih,
                    "saat": _hour_label(h),
                    "station_id": st["id"],
                    "ad": st["ad"],
                    "hat": st["hat"],
                    "kamera": st["kamera"],
                    "adet": adet,
                    "ort_cycle_sn": round(cycle, 1),
                    "beklenen": beklenen,
                }
            )
    return rows


def _rows_from_db(user_id: str, tarih_list: list[str]) -> list[dict]:
    try:
        with _session() as db:
            q = (
                db.query(SayimBucketModel)
                .filter(SayimBucketModel.user_id == user_id, SayimBucketModel.tarih.in_(tarih_list))
                .all()
            )
            out = []
            for r in q:
                cc = int(r.cycle_count or 0)
                ort = round((int(r.cycle_sum_ms or 0) / 1000) / cc, 1) if cc else None
                out.append(
                    {
                        "tarih": r.tarih,
                        "saat": r.saat,
                        "station_id": r.station_id,
                        "ad": r.ad,
                        "hat": r.hat,
                        "kamera": r.kamera,
                        "adet": int(r.adet or 0),
                        "ort_cycle_sn": ort,
                        "beklenen": int(r.beklenen or 0),
                    }
                )
            return out
    except Exception:
        return []


def _period_dates(tarih: str, period: str) -> list[str]:
    d = date.fromisoformat(tarih)
    if period == "ay":
        start = d.replace(day=1)
        if d.month == 12:
            end = d.replace(year=d.year + 1, month=1, day=1) - timedelta(days=1)
        else:
            end = d.replace(month=d.month + 1, day=1) - timedelta(days=1)
        out = []
        cur = start
        while cur <= end:
            out.append(cur.isoformat())
            cur += timedelta(days=1)
        return out
    if period == "gun":
        # son 7 gün trend için; tek gün filtre ayrı
        return [(d - timedelta(days=i)).isoformat() for i in range(6, -1, -1)]
    # saat — tek gün
    return [tarih]


def _aggregate(rows: list[dict], period: str, focus_date: str) -> dict[str, Any]:
    by_station: dict[str, dict] = {}
    by_hat: dict[str, dict] = {}
    by_hour: dict[str, dict] = {}
    by_day: dict[str, int] = {}

    for r in rows:
        if period == "saat" and r["tarih"] != focus_date:
            continue
        sid = r["station_id"]
        st = by_station.setdefault(
            sid,
            {
                "id": sid,
                "ad": r["ad"],
                "hat": r["hat"],
                "kamera": r["kamera"],
                "adet": 0,
                "beklenen": 0,
                "cycle_sum": 0.0,
                "cycle_n": 0,
                "saatlik": {},
            },
        )
        st["ad"] = r["ad"] or st["ad"]
        st["hat"] = r["hat"] or st["hat"]
        st["adet"] += r["adet"]
        bek = int(r.get("beklenen") or 0)
        if period == "saat":
            st["beklenen"] += bek
        else:
            # gün/ay: saatlik beklenen × ilgili saat sayısı yerine satırdaki beklenen toplamı
            st["beklenen"] += bek
        if r.get("ort_cycle_sn") is not None:
            st["cycle_sum"] += float(r["ort_cycle_sn"]) * max(1, r["adet"])
            st["cycle_n"] += max(1, r["adet"])

        if period == "saat":
            h = r["saat"]
            slot = st["saatlik"].setdefault(h, {"saat": h, "adet": 0, "beklenen": bek, "cycle_sum": 0.0, "cycle_n": 0})
            slot["adet"] += r["adet"]
            slot["beklenen"] = bek or slot["beklenen"]
            if r.get("ort_cycle_sn") is not None:
                slot["cycle_sum"] += float(r["ort_cycle_sn"]) * max(1, r["adet"])
                slot["cycle_n"] += max(1, r["adet"])

            ht = by_hour.setdefault(h, {"saat": h, "adet": 0, "beklenen": 0})
            ht["adet"] += r["adet"]
            ht["beklenen"] += bek

        by_day[r["tarih"]] = by_day.get(r["tarih"], 0) + r["adet"]

        hat = r["hat"] or "—"
        hh = by_hat.setdefault(
            hat,
            {"hat": hat, "adet": 0, "beklenen": 0, "istasyon_sayisi": set(), "cycle_sum": 0.0, "cycle_n": 0},
        )
        hh["adet"] += r["adet"]
        hh["beklenen"] += bek
        hh["istasyon_sayisi"].add(sid)
        if r.get("ort_cycle_sn") is not None:
            hh["cycle_sum"] += float(r["ort_cycle_sn"]) * max(1, r["adet"])
            hh["cycle_n"] += max(1, r["adet"])

    istasyonlar = []
    for st in by_station.values():
        ort = round(st["cycle_sum"] / st["cycle_n"], 1) if st["cycle_n"] else None
        bek = st["beklenen"] or 1
        saatlik = []
        for h in sorted(st["saatlik"].keys()):
            s = st["saatlik"][h]
            s_ort = round(s["cycle_sum"] / s["cycle_n"], 1) if s["cycle_n"] else None
            s_bek = s["beklenen"] or 1
            saatlik.append(
                {
                    "saat": s["saat"],
                    "adet": s["adet"],
                    "beklenen": s["beklenen"],
                    "ort_cycle_sn": s_ort,
                    "verimlilik_pct": round(100.0 * s["adet"] / s_bek, 1),
                }
            )
        istasyonlar.append(
            {
                "id": st["id"],
                "ad": st["ad"],
                "hat": st["hat"],
                "kamera": st["kamera"],
                "adet": st["adet"],
                "beklenen": st["beklenen"],
                "ort_cycle_sn": ort,
                "verimlilik_pct": round(100.0 * st["adet"] / bek, 1),
                "saatlik": saatlik,
            }
        )
    istasyonlar.sort(key=lambda x: -x["adet"])

    hatlar = []
    for h in by_hat.values():
        bek = h["beklenen"] or 1
        ort = round(h["cycle_sum"] / h["cycle_n"], 1) if h["cycle_n"] else None
        hatlar.append(
            {
                "hat": h["hat"],
                "adet": h["adet"],
                "beklenen": h["beklenen"],
                "istasyon_sayisi": len(h["istasyon_sayisi"]),
                "ort_cycle_sn": ort,
                "verimlilik_pct": round(100.0 * h["adet"] / bek, 1),
            }
        )
    hatlar.sort(key=lambda x: -x["verimlilik_pct"])

    saatlik_toplam = []
    for h in sorted(by_hour.keys()):
        s = by_hour[h]
        bek = s["beklenen"] or 1
        saatlik_toplam.append(
            {
                "saat": s["saat"],
                "adet": s["adet"],
                "beklenen": s["beklenen"],
                "verimlilik_pct": round(100.0 * s["adet"] / bek, 1),
            }
        )

    gunluk_trend = [{"gun": k[8:10] + "." + k[5:7], "tarih": k, "adet": v} for k, v in sorted(by_day.items())]

    # aylık: gün bazlı aynı trend
    toplam = sum(s["adet"] for s in istasyonlar)
    beklenen_toplam = sum(s["beklenen"] for s in istasyonlar)
    return {
        "toplam": toplam,
        "beklenen_toplam": beklenen_toplam,
        "verimlilik_pct": round(100.0 * toplam / (beklenen_toplam or 1), 1),
        "istasyon_sayisi": len(istasyonlar),
        "hat_sayisi": len(hatlar),
        "istasyonlar": istasyonlar,
        "hatlar": hatlar,
        "saatlik": saatlik_toplam,
        "gunluk_trend": gunluk_trend,
        "aylik_trend": gunluk_trend,
    }


def panel_sayim(user_id: str, tarih: str, period: str = "saat") -> dict:
    period = period if period in ("saat", "gun", "ay") else "saat"
    dates = _period_dates(tarih, period)
    db_rows = _rows_from_db(user_id, dates)
    if not db_rows:
        # demo: tüm günler için üret
        db_rows = []
        for d in dates:
            db_rows.extend(_demo_buckets_for_day(d))
    elif period == "saat":
        # sadece o gün boşsa o güne demo ekle
        if not any(r["tarih"] == tarih for r in db_rows):
            db_rows.extend(_demo_buckets_for_day(tarih))

    agg = _aggregate(db_rows, period, tarih)
    from demo_data import date_range

    return {
        "tarih": tarih,
        "period": period,
        "dates": date_range(90),
        "baslangic": dates[0] if dates else tarih,
        "bitis": dates[-1] if dates else tarih,
        **agg,
        "urun_turleri": [],
    }
