from __future__ import annotations

import io
from datetime import datetime
from pathlib import Path

from openpyxl import Workbook
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import cm
from reportlab.pdfgen import canvas

LOGO_PATHS = [
    Path(__file__).parent.parent / "src" / "public" / "siyah.png",
    Path(__file__).parent.parent / "src" / "public" / "beyaz.png",
]


def _logo_path():
    for p in LOGO_PATHS:
        if p.exists():
            return str(p)
    return None


def build_pdf(title: str, rows: list[dict], meta: dict | None = None) -> bytes:
    buf = io.BytesIO()
    c = canvas.Canvas(buf, pagesize=A4)
    w, h = A4
    logo = _logo_path()
    y = h - 2 * cm
    if logo:
        c.drawImage(logo, 2 * cm, y - 1.2 * cm, width=4 * cm, height=1.2 * cm, preserveAspectRatio=True, mask="auto")
        y -= 1.6 * cm
    c.setFont("Helvetica-Bold", 18)
    c.drawString(2 * cm, y, "HypeVision AI Analytics")
    y -= 0.8 * cm
    c.setFont("Helvetica", 12)
    c.drawString(2 * cm, y, title)
    y -= 0.6 * cm
    c.setFont("Helvetica", 9)
    c.setFillColor(colors.grey)
    c.drawString(2 * cm, y, f"Oluşturulma: {datetime.now().strftime('%d.%m.%Y %H:%M')}")
    if meta:
        y -= 0.5 * cm
        c.drawString(2 * cm, y, meta.get("kurulum", ""))
    y -= 1 * cm
    c.setFillColor(colors.black)
    c.setFont("Helvetica-Bold", 10)
    headers = ["Alan", "Değer"]
    if rows and "rapor" in rows[0]:
        headers = ["Rapor", "Tarih", "Durum"]
    for i, hdr in enumerate(headers):
        c.drawString(2 * cm + i * 5 * cm, y, hdr)
    y -= 0.5 * cm
    c.setFont("Helvetica", 9)
    for row in rows[:40]:
        if y < 2 * cm:
            c.showPage()
            y = h - 2 * cm
        if "rapor" in row:
            c.drawString(2 * cm, y, str(row.get("rapor", ""))[:40])
            c.drawString(7 * cm, y, str(row.get("tarih", "")))
            c.drawString(12 * cm, y, str(row.get("durum", "")))
        else:
            for i, val in enumerate(row.values()):
                c.drawString(2 * cm + i * 5 * cm, y, str(val)[:35])
        y -= 0.45 * cm
    y -= 0.8 * cm
    c.setFont("Helvetica-Oblique", 8)
    c.setFillColor(colors.grey)
    c.drawString(2 * cm, 1.5 * cm, "Demo rapor — HypeVision © Vislivis")
    c.save()
    buf.seek(0)
    return buf.read()


def build_xlsx(title: str, rows: list[dict]) -> bytes:
    wb = Workbook()
    ws = wb.active
    ws.title = "Rapor"
    ws.append(["HypeVision AI Analytics"])
    ws.append([title])
    ws.append([f"Oluşturulma: {datetime.now().strftime('%d.%m.%Y %H:%M')}"])
    ws.append([])
    if rows and "rapor" in rows[0]:
        ws.append(["Rapor", "Tarih", "Durum"])
        for r in rows:
            ws.append([r.get("rapor"), r.get("tarih"), r.get("durum")])
    else:
        for r in rows:
            ws.append(list(r.values()))
    buf = io.BytesIO()
    wb.save(buf)
    buf.seek(0)
    return buf.read()
