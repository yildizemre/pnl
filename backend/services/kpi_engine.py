"""KPI kataloğu + sorgulama + dönem / hat karşılaştırması."""

from __future__ import annotations

import uuid
from datetime import date, datetime, timedelta
from typing import Any

from services.sayim_ingest import panel_sayim


CATALOG: dict[str, Any] = {
    "sources": [
        {
            "id": "isg",
            "labelTr": "İSG & Bildirimler",
            "labelEn": "HSE & Notifications",
            "descTr": "Olay, aksiyon ve kamera bildirimleri",
            "descEn": "Events, actions and camera alerts",
            "fields": [
                {"id": "bildirim_adet", "labelTr": "Bildirim adedi", "labelEn": "Notification count", "type": "number", "format": "int", "aggs": ["count"]},
                {"id": "kritik_adet", "labelTr": "Kritik olay", "labelEn": "Critical events", "type": "number", "format": "int", "aggs": ["count"]},
                {"id": "aksiyon_acik", "labelTr": "Açık aksiyon", "labelEn": "Open actions", "type": "number", "format": "int", "aggs": ["count"]},
                {"id": "yanlis_alarm", "labelTr": "Yanlış alarm", "labelEn": "False alarms", "type": "number", "format": "int", "aggs": ["count"]},
                {"id": "kapandi", "labelTr": "Kapanan olay", "labelEn": "Closed events", "type": "number", "format": "int", "aggs": ["count"]},
            ],
            "dimensions": ["none", "kategori", "kamera", "seviye"],
        },
        {
            "id": "mes",
            "labelTr": "MES — Personel",
            "labelEn": "MES — Personnel",
            "descTr": "Varlık, verimli/verimsiz saat",
            "descEn": "Presence and efficient hours",
            "fields": [
                {"id": "presence_pct", "labelTr": "Ort. verimli %", "labelEn": "Avg efficient %", "type": "percent", "format": "pct", "aggs": ["avg"]},
                {"id": "aktif_personel", "labelTr": "Aktif personel", "labelEn": "Active staff", "type": "number", "format": "int", "aggs": ["count"]},
                {"id": "yerinde_saat", "labelTr": "Verimli saat", "labelEn": "Efficient hours", "type": "number", "format": "float", "aggs": ["sum", "avg"]},
                {"id": "yok_saat", "labelTr": "Verimsiz saat", "labelEn": "Inefficient hours", "type": "number", "format": "float", "aggs": ["sum", "avg"]},
            ],
            "dimensions": ["none", "hat", "kamera", "masa"],
        },
        {
            "id": "sayim",
            "labelTr": "Sayım — İstasyon",
            "labelEn": "Counting — Stations",
            "descTr": "Adet, hedef, cycle süresi",
            "descEn": "Count, target, cycle time",
            "fields": [
                {"id": "toplam_adet", "labelTr": "Toplam sayım", "labelEn": "Total count", "type": "number", "format": "int", "aggs": ["sum"]},
                {"id": "beklenen", "labelTr": "Beklenen", "labelEn": "Expected", "type": "number", "format": "int", "aggs": ["sum"]},
                {"id": "verimlilik_pct", "labelTr": "Sayım verimliliği %", "labelEn": "Count efficiency %", "type": "percent", "format": "pct", "aggs": ["avg"]},
                {"id": "ort_cycle_sn", "labelTr": "Ort. cycle (sn)", "labelEn": "Avg cycle (s)", "type": "number", "format": "float", "aggs": ["avg"]},
            ],
            "dimensions": ["none", "hat", "istasyon", "kamera"],
        },
    ],
    "dimensions": [
        {"id": "none", "labelTr": "Toplam (kırılımsız)", "labelEn": "Total (no breakdown)"},
        {"id": "hat", "labelTr": "Hat", "labelEn": "Line"},
        {"id": "kamera", "labelTr": "Kamera", "labelEn": "Camera"},
        {"id": "kategori", "labelTr": "Kategori", "labelEn": "Category"},
        {"id": "seviye", "labelTr": "Seviye", "labelEn": "Severity"},
        {"id": "masa", "labelTr": "İstasyon / Masa", "labelEn": "Station / Desk"},
        {"id": "istasyon", "labelTr": "Sayım istasyonu", "labelEn": "Count station"},
    ],
    "periods": [
        {"id": "gun", "labelTr": "Gün", "labelEn": "Day"},
        {"id": "hafta", "labelTr": "Hafta", "labelEn": "Week"},
        {"id": "ay", "labelTr": "Ay", "labelEn": "Month"},
    ],
    "comparePresets": [
        {"id": "bugun_dun", "labelTr": "Bugün vs Dün", "labelEn": "Today vs Yesterday"},
        {"id": "hafta", "labelTr": "Bu hafta vs Geçen hafta", "labelEn": "This week vs Last week"},
        {"id": "ay", "labelTr": "Bu ay vs Geçen ay", "labelEn": "This month vs Last month"},
        {"id": "hat", "labelTr": "Hat vs Hat", "labelEn": "Line vs Line"},
    ],
}


def get_catalog() -> dict:
    return CATALOG


def _dates_for_period(tarih: str, period: str) -> list[str]:
    d = date.fromisoformat(tarih)
    if period == "ay":
        start = d.replace(day=1)
        if d.month == 12:
            end = date(d.year + 1, 1, 1) - timedelta(days=1)
        else:
            end = date(d.year, d.month + 1, 1) - timedelta(days=1)
        out = []
        cur = start
        while cur <= min(end, d):
            out.append(cur.isoformat())
            cur += timedelta(days=1)
        return out
    if period == "hafta":
        start = d - timedelta(days=d.weekday())
        return [(start + timedelta(days=i)).isoformat() for i in range(7) if start + timedelta(days=i) <= d]
    return [tarih]


def _prev_period_anchor(tarih: str, period: str) -> str:
    d = date.fromisoformat(tarih)
    if period == "ay":
        first = d.replace(day=1)
        prev_last = first - timedelta(days=1)
        return prev_last.isoformat()
    if period == "hafta":
        return (d - timedelta(days=7)).isoformat()
    return (d - timedelta(days=1)).isoformat()


def _notif_rows(user_id: str, dates: list[str]) -> list[dict]:
    from store import list_notifications

    rows = list_notifications(user_id)
    date_set = set(dates)
    return [n for n in rows if n.get("tarih") in date_set]


def _eval_isg(user_id: str, dates: list[str], field: str, dimension: str, filt: dict) -> dict:
    rows = _notif_rows(user_id, dates)
    if filt.get("kategori"):
        rows = [r for r in rows if (r.get("kategori") or "") == filt["kategori"]]
    if filt.get("kamera"):
        rows = [r for r in rows if (r.get("kamera") or "") == filt["kamera"]]
    if filt.get("hat"):
        # hat filter not on notifs — skip
        pass

    def match(r):
        st = (r.get("aksiyon_durum") or ("kapandi" if r.get("okundu") else "acik")).lower()
        if field == "bildirim_adet":
            return True
        if field == "kritik_adet":
            return (r.get("seviye") or "").lower() == "kritik"
        if field == "aksiyon_acik":
            return st == "acik"
        if field == "yanlis_alarm":
            return st == "yanlis_alarm" or r.get("feedback") == "hayir"
        if field == "kapandi":
            return st in ("kapandi", "egitim", "yanlis_alarm") or bool(r.get("okundu"))
        return True

    matched = [r for r in rows if match(r)]
    if dimension in (None, "", "none"):
        return {"value": len(matched), "breakdown": [], "series": _series_by_day(matched, dates)}

    key_map = {"kategori": "kategori", "kamera": "kamera", "seviye": "seviye"}
    key = key_map.get(dimension, dimension)
    buckets: dict[str, int] = {}
    for r in matched:
        k = str(r.get(key) or "—")
        buckets[k] = buckets.get(k, 0) + 1
    breakdown = [{"label": k, "value": v} for k, v in sorted(buckets.items(), key=lambda x: -x[1])]
    return {"value": len(matched), "breakdown": breakdown, "series": _series_by_day(matched, dates)}


def _series_by_day(rows: list[dict], dates: list[str]) -> list[dict]:
    counts = {d: 0 for d in dates}
    for r in rows:
        t = r.get("tarih")
        if t in counts:
            counts[t] += 1
    return [{"tarih": d, "value": counts[d]} for d in dates]


def _eval_mes(user_id: str, tarih: str, period: str, field: str, dimension: str, filt: dict, agg: str) -> dict:
    from store import mes_productivity_period

    pmap = {"gun": "gun", "hafta": "hafta", "ay": "ay"}
    mes = mes_productivity_period(user_id, tarih, pmap.get(period, "gun"))
    people = list(mes.get("personeller") or [])
    if filt.get("hat"):
        people = [p for p in people if (p.get("hat") or "") == filt["hat"]]
    if filt.get("kamera"):
        people = [p for p in people if (p.get("kamera") or "") == filt["kamera"]]

    if field == "aktif_personel":
        value = len(people)
        fmt = "int"
    elif field == "presence_pct":
        vals = [float(p.get("presence_pct") or 0) for p in people]
        value = round(sum(vals) / len(vals), 1) if vals else 0
        fmt = "pct"
    elif field in ("yerinde_saat", "yok_saat"):
        vals = [float(p.get(field) or 0) for p in people]
        value = round(sum(vals), 1) if agg == "sum" else (round(sum(vals) / len(vals), 1) if vals else 0)
        fmt = "float"
    else:
        value = 0
        fmt = "int"

    breakdown = []
    if dimension not in (None, "", "none"):
        dim_key = "masa" if dimension == "masa" else dimension
        buckets: dict[str, list[float]] = {}
        for p in people:
            k = str(p.get(dim_key) or "—")
            buckets.setdefault(k, [])
            if field == "aktif_personel":
                buckets[k].append(1)
            elif field == "presence_pct":
                buckets[k].append(float(p.get("presence_pct") or 0))
            else:
                buckets[k].append(float(p.get(field) or 0))
        for k, vals in buckets.items():
            if field == "aktif_personel":
                v = len(vals)
            elif field == "presence_pct" or agg == "avg":
                v = round(sum(vals) / len(vals), 1) if vals else 0
            else:
                v = round(sum(vals), 1)
            breakdown.append({"label": k, "value": v})
        breakdown.sort(key=lambda x: -x["value"])

    series = []
    for g in mes.get("gunluk") or []:
        series.append({"tarih": g.get("tarih"), "value": g.get("ortalama") or g.get("adet") or 0})

    return {"value": value, "breakdown": breakdown, "series": series, "format": fmt}


def _eval_sayim(user_id: str, tarih: str, period: str, field: str, dimension: str, filt: dict) -> dict:
    sp = {"gun": "gun", "hafta": "gun", "ay": "ay"}.get(period, "saat")
    # hafta için günlük trend; saatlik detay için saat
    if period == "gun":
        sp = "saat"
    data = panel_sayim(user_id, tarih, sp if period != "hafta" else "gun")
    stations = list(data.get("istasyonlar") or [])
    hats = list(data.get("hatlar") or [])
    if filt.get("hat"):
        stations = [s for s in stations if (s.get("hat") or "") == filt["hat"]]
        hats = [h for h in hats if (h.get("hat") or "") == filt["hat"]]
    if filt.get("istasyon"):
        stations = [s for s in stations if (s.get("id") or s.get("ad")) == filt["istasyon"]]

    def field_val_station(s):
        if field == "toplam_adet":
            return float(s.get("adet") or 0)
        if field == "beklenen":
            return float(s.get("beklenen") or 0)
        if field == "verimlilik_pct":
            return float(s.get("verimlilik_pct") or 0)
        if field == "ort_cycle_sn":
            return float(s.get("ort_cycle_sn") or 0)
        return 0.0

    if dimension == "hat":
        breakdown = []
        for h in hats:
            if field == "toplam_adet":
                v = float(h.get("adet") or 0)
            elif field == "beklenen":
                v = float(h.get("beklenen") or 0)
            elif field == "verimlilik_pct":
                v = float(h.get("verimlilik_pct") or 0)
            else:
                v = float(h.get("ort_cycle_sn") or 0)
            breakdown.append({"label": h.get("hat"), "value": round(v, 1)})
        value = round(sum(b["value"] for b in breakdown) / len(breakdown), 1) if field in ("verimlilik_pct", "ort_cycle_sn") and breakdown else round(sum(b["value"] for b in breakdown), 1)
        series = [{"tarih": r.get("tarih") or r.get("gun"), "value": r.get("adet") or 0} for r in (data.get("gunluk_trend") or [])]
        return {"value": value, "breakdown": breakdown, "series": series, "format": "pct" if "pct" in field else "float"}

    if dimension == "istasyon":
        breakdown = [{"label": s.get("ad"), "value": round(field_val_station(s), 1)} for s in stations]
        breakdown.sort(key=lambda x: -x["value"])
        vals = [b["value"] for b in breakdown]
        value = round(sum(vals) / len(vals), 1) if field in ("verimlilik_pct", "ort_cycle_sn") and vals else round(sum(vals), 1)
        return {"value": value, "breakdown": breakdown, "series": [], "format": "pct" if "pct" in field else "float"}

    if dimension == "kamera":
        buckets: dict[str, list[float]] = {}
        for s in stations:
            k = str(s.get("kamera") or "—")
            buckets.setdefault(k, []).append(field_val_station(s))
        breakdown = []
        for k, vals in buckets.items():
            v = round(sum(vals) / len(vals), 1) if field in ("verimlilik_pct", "ort_cycle_sn") else round(sum(vals), 1)
            breakdown.append({"label": k, "value": v})
        breakdown.sort(key=lambda x: -x["value"])
        value = round(sum(b["value"] for b in breakdown) / len(breakdown), 1) if field in ("verimlilik_pct", "ort_cycle_sn") and breakdown else round(sum(b["value"] for b in breakdown), 1)
        return {"value": value, "breakdown": breakdown, "series": [], "format": "pct" if "pct" in field else "float"}

    # total
    if field == "toplam_adet":
        value = float(sum(field_val_station(s) for s in stations)) if (filt.get("hat") or filt.get("istasyon")) else float(data.get("toplam") or sum(field_val_station(s) for s in stations))
    elif field == "beklenen":
        value = float(sum(field_val_station(s) for s in stations)) if (filt.get("hat") or filt.get("istasyon")) else float(data.get("beklenen_toplam") or sum(field_val_station(s) for s in stations))
    elif field == "verimlilik_pct":
        if filt.get("hat") or filt.get("istasyon"):
            vals = [field_val_station(s) for s in stations]
            value = round(sum(vals) / len(vals), 1) if vals else 0
        else:
            value = float(data.get("verimlilik_pct") or 0)
    else:
        vals = [field_val_station(s) for s in stations if s.get("ort_cycle_sn") is not None]
        value = round(sum(vals) / len(vals), 1) if vals else 0
    series = [{"tarih": r.get("tarih") or r.get("gun"), "value": r.get("adet") or 0} for r in (data.get("gunluk_trend") or data.get("saatlik") or [])]
    return {"value": round(value, 1), "breakdown": [], "series": series, "format": "pct" if "pct" in field else ("int" if field.endswith("adet") or field == "beklenen" else "float")}


def evaluate_kpi(user_id: str, definition: dict, tarih: str | None = None) -> dict:
    """definition: source, field, agg?, dimension?, filter?, period?"""
    tarih = tarih or date.today().isoformat()
    source = definition.get("source") or "isg"
    field = definition.get("field") or "bildirim_adet"
    dimension = definition.get("dimension") or "none"
    filt = definition.get("filter") or {}
    period = definition.get("period") or "gun"
    agg = definition.get("agg") or "count"
    dates = _dates_for_period(tarih, period)

    if source == "isg":
        result = _eval_isg(user_id, dates, field, dimension, filt)
        result.setdefault("format", "int")
    elif source == "mes":
        result = _eval_mes(user_id, tarih, period, field, dimension, filt, agg)
    elif source == "sayim":
        result = _eval_sayim(user_id, tarih, period, field, dimension, filt)
    else:
        result = {"value": 0, "breakdown": [], "series": [], "format": "int"}

    return {
        "ok": True,
        "tarih": tarih,
        "period": period,
        "baslangic": dates[0] if dates else tarih,
        "bitis": dates[-1] if dates else tarih,
        "definition": definition,
        **result,
    }


def compare_kpi(
    user_id: str,
    definition: dict,
    mode: str = "bugun_dun",
    tarih: str | None = None,
    hat_a: str | None = None,
    hat_b: str | None = None,
) -> dict:
    tarih = tarih or date.today().isoformat()

    if mode == "hat":
        def_a = {**definition, "filter": {**(definition.get("filter") or {}), "hat": hat_a or ""}, "dimension": "none"}
        def_b = {**definition, "filter": {**(definition.get("filter") or {}), "hat": hat_b or ""}, "dimension": "none"}
        a = evaluate_kpi(user_id, def_a, tarih)
        b = evaluate_kpi(user_id, def_b, tarih)
        va, vb = float(a.get("value") or 0), float(b.get("value") or 0)
        change = round(((va - vb) / vb) * 100, 1) if vb else (100.0 if va else 0.0)
        return {
            "ok": True,
            "mode": "hat",
            "hat_a": hat_a,
            "hat_b": hat_b,
            "current": {"label": hat_a, "value": va},
            "previous": {"label": hat_b, "value": vb},
            "change_pct": change,
            "a": a,
            "b": b,
        }

    period = "gun" if mode == "bugun_dun" else ("hafta" if mode == "hafta" else "ay")
    def_cur = {**definition, "period": period}
    anchor_prev = _prev_period_anchor(tarih, period)
    a = evaluate_kpi(user_id, def_cur, tarih)
    b = evaluate_kpi(user_id, def_cur, anchor_prev)
    va, vb = float(a.get("value") or 0), float(b.get("value") or 0)
    change = round(((va - vb) / vb) * 100, 1) if vb else (100.0 if va else 0.0)
    return {
        "ok": True,
        "mode": mode,
        "current": {"label": tarih, "value": va, "range": [a.get("baslangic"), a.get("bitis")]},
        "previous": {"label": anchor_prev, "value": vb, "range": [b.get("baslangic"), b.get("bitis")]},
        "change_pct": change,
        "a": a,
        "b": b,
    }


def live_compare_summary(user_id: str, mode: str, tarih: str | None = None) -> dict:
    """Dashboard CompareToggle için canlı özet (mock yerine)."""
    tarih = tarih or date.today().isoformat()
    metrics = [
        ("verimlilik", {"source": "mes", "field": "presence_pct", "agg": "avg"}),
        ("isg_ihlaller", {"source": "isg", "field": "kritik_adet"}),
        ("aktif_personel", {"source": "mes", "field": "aktif_personel"}),
        ("bildirim", {"source": "isg", "field": "bildirim_adet"}),
        ("urun_sayim", {"source": "sayim", "field": "toplam_adet"}),
    ]
    summary = {}
    for key, definition in metrics:
        cmp = compare_kpi(user_id, definition, mode=mode if mode != "hat" else "bugun_dun", tarih=tarih)
        invert = key in ("isg_ihlaller", "bildirim")
        summary[key] = {
            "current": cmp["current"]["value"],
            "previous": cmp["previous"]["value"],
            "change_pct": cmp["change_pct"],
            "invert": invert,
        }
    return {
        "id": mode,
        "label_tr": next((p["labelTr"] for p in CATALOG["comparePresets"] if p["id"] == mode), mode),
        "label_en": next((p["labelEn"] for p in CATALOG["comparePresets"] if p["id"] == mode), mode),
        "summary": summary,
    }


def new_kpi_id() -> str:
    return f"ckpi-{uuid.uuid4().hex[:10]}"


def layout_get_custom_kpis(layout: dict | None) -> list[dict]:
    if not layout or not isinstance(layout, dict):
        return []
    items = layout.get("custom_kpis") or []
    return items if isinstance(items, list) else []
