"""Harici entegrasyon API (mobil, AI sunucu, scriptler)."""

from __future__ import annotations

import json
import shutil
import uuid
from datetime import datetime
from pathlib import Path
from typing import Optional

from fastapi import APIRouter, Depends, File, Form, Header, HTTPException, Query, UploadFile
from pydantic import BaseModel, Field

from config import DB_KIND
from services.detection import detection_to_notification_fields
from services.notifications import build_notification_payload, create_notification, push_notification
from store import (
    HEARTBEAT_MAX_SECONDS,
    HEARTBEAT_RECOMMEND_SECONDS,
    get_notification,
    heartbeat_active,
    ingest_mes_ticks,
    ingest_sayim_ticks,
    list_notifications,
    mes_productivity_for_user,
    record_heartbeat,
    resolve_api_key,
)

router = APIRouter(prefix="/api/v1/integrations", tags=["integrations"])

UPLOAD_DIR = Path(__file__).resolve().parent.parent / "uploads"


class NotificationIn(BaseModel):
    baslik: str = Field(..., min_length=1, max_length=512)
    detay: str = ""
    kategori: str = "Sistem"
    seviye: str = "bilgi"
    kamera: str = ""
    modul: str = ""
    tarih: str | None = None
    zaman: str | None = None
    gorsel_url: str | None = None
    alan: str | None = None
    guven: float | None = Field(default=None, ge=0, le=1)
    kamera_id: str | None = None
    model: str | None = None


class DetectionIn(BaseModel):
    baslik: str = Field(..., min_length=1, max_length=512)
    kategori: str = "İSG"
    seviye: str = "kritik"
    kamera: str = ""
    modul: str = ""
    alan: str = ""
    guven: float = Field(..., ge=0, le=1)
    zaman: str = Field(..., description="ISO-8601 örn. 2026-06-16T00:17:32")
    detay: str = ""
    gorsel_url: str | None = None
    kamera_id: str | None = None
    model: str | None = None


class HeartbeatIn(BaseModel):
    camera_id: str | None = None


class MesStationIn(BaseModel):
    person_id: str = Field(..., min_length=1, max_length=64)
    name: str | None = None
    ad: str | None = None
    masa: str | None = None
    hat: str | None = None
    present: bool = True


class MesTickIn(BaseModel):
    """YOLO her ~30 dk bir kamera için gönderir. Hesaplama backend'de."""

    camera_id: str = Field(..., min_length=1, max_length=128)
    observed_at: str | None = Field(default=None, description="ISO-8601; yoksa sunucu saati")
    interval_minutes: int = Field(default=30, ge=5, le=120)
    tarih: str | None = None
    stations: list[MesStationIn] = Field(..., min_length=1, max_length=100)


def get_api_user(x_api_key: str = Header(..., alias="X-API-Key")) -> dict:
    user = resolve_api_key(x_api_key.strip())
    if not user:
        raise HTTPException(401, "Geçersiz veya pasif API anahtarı")
    return {"id": user.id, "email": user.email, "rol": user.rol}


async def _save_image(gorsel: UploadFile | None) -> str:
    if not gorsel or not gorsel.filename:
        return ""
    UPLOAD_DIR.mkdir(exist_ok=True)
    ext = Path(gorsel.filename).suffix or ".jpg"
    fname = f"{uuid.uuid4().hex}{ext}"
    path = UPLOAD_DIR / fname
    with path.open("wb") as f:
        shutil.copyfileobj(gorsel.file, f)
    return f"/api/uploads/{fname}"


def _payload_from_detection(body: dict, gorsel_url: str = "") -> dict:
    data = detection_to_notification_fields({**body, "gorsel_url": gorsel_url})
    return {**data, "okundu": False}


def _touch_ai(user_id: str, camera_id: str | None = None) -> None:
    """Bildirim veya heartbeat — AI sunucu canlı sayılır."""
    record_heartbeat(user_id, camera_id, ai_server=True)


@router.get("/health")
def integration_health(user: dict = Depends(get_api_user)):
    return {
        "ok": True,
        "user_id": user["id"],
        "email": user["email"],
        "ai_aktif": heartbeat_active(user["id"]),
        "database": DB_KIND,
        "heartbeat_recommended_seconds": HEARTBEAT_RECOMMEND_SECONDS,
        "heartbeat_max_idle_seconds": HEARTBEAT_MAX_SECONDS,
        "time": datetime.now().isoformat(),
    }


@router.post("/heartbeat")
def integration_heartbeat(body: HeartbeatIn, user: dict = Depends(get_api_user)):
    record_heartbeat(user["id"], body.camera_id, ai_server=True)
    return {
        "ok": True,
        "ai_aktif": True,
        "heartbeat_recommended_seconds": HEARTBEAT_RECOMMEND_SECONDS,
    }


@router.get("/mes/productivity")
def integration_mes_productivity(
    user: dict = Depends(get_api_user),
    tarih: str | None = Query(default=None, description="YYYY-MM-DD; yoksa bugün"),
):
    """Bilgi işlem / ERP — personel verimlilik verisini GET ile çeker."""
    key = tarih or datetime.now().date().isoformat()
    data = mes_productivity_for_user(user["id"], key)
    return {"ok": True, **data}


@router.post("/mes/tick")
def integration_mes_tick(body: MesTickIn, user: dict = Depends(get_api_user)):
    """Personel varlık tick — kamera başına batch (ör. 2 masa)."""
    stations = [s.model_dump() for s in body.stations]
    result = ingest_mes_ticks(
        user["id"],
        camera_id=body.camera_id,
        stations=stations,
        observed_at=body.observed_at,
        interval_minutes=body.interval_minutes,
        tarih=body.tarih,
    )
    _touch_ai(user["id"], body.camera_id)
    return result


class SayimStationIn(BaseModel):
    station_id: str = Field(..., min_length=1, max_length=64)
    station_name: str | None = None
    ad: str | None = None
    hat: str | None = None
    kamera: str | None = None
    count: int = Field(default=1, ge=0, le=10000)
    cycle_seconds: float | None = Field(default=None, ge=0, le=3600)
    beklenen: int | None = None


class SayimTickIn(BaseModel):
    """YOLO her sayımda veya periyodik batch gönderir. cycle_seconds = önceki sayımdan bu yana süre."""
    camera_id: str = ""
    stations: list[SayimStationIn] = Field(..., min_length=1, max_length=100)
    observed_at: str | None = None


@router.post("/sayim/tick")
def integration_sayim_tick(body: SayimTickIn, user: dict = Depends(get_api_user)):
    stations = [s.model_dump() for s in body.stations]
    ts = None
    if body.observed_at:
        try:
            ts = datetime.fromisoformat(body.observed_at.replace("Z", "+00:00"))
        except ValueError:
            ts = None
    result = ingest_sayim_ticks(user["id"], stations, camera_id=body.camera_id, ts=ts)
    _touch_ai(user["id"], body.camera_id or None)
    return result


@router.get("/sayim/productivity")
def integration_sayim_productivity(
    user: dict = Depends(get_api_user),
    tarih: str | None = Query(default=None),
    period: str = Query(default="saat", pattern="^(saat|gun|ay)$"),
):
    from store import panel_product_counts

    key = tarih or datetime.now().date().isoformat()
    return {"ok": True, **panel_product_counts(key, period, user_id=user["id"])}


@router.get("/notifications")
def integration_list_notifications(
    user: dict = Depends(get_api_user),
    limit: int = Query(default=50, ge=1, le=200),
    tarih: str | None = Query(default=None, description="YYYY-MM-DD filtresi"),
):
    """Bilgi işlem — bildirim listesini GET ile çeker (yalnızca bu müşteri)."""
    items = [n for n in list_notifications(user["id"]) if n.get("user_id") == user["id"]]
    if tarih:
        items = [n for n in items if n.get("tarih") == tarih]
    return {"ok": True, "count": min(len(items), limit), "notifications": items[:limit]}


@router.get("/notifications/{notification_id}")
def integration_get_notification(notification_id: int, user: dict = Depends(get_api_user)):
    row = get_notification(notification_id, user["id"])
    if not row or row.get("user_id") != user["id"]:
        raise HTTPException(404, "Bildirim bulunamadı")
    return {"ok": True, "notification": row}


@router.post("/notification/detect")
async def integration_detection_json(body: DetectionIn, user: dict = Depends(get_api_user)):
    fields = _payload_from_detection(body.model_dump(), body.gorsel_url or "")
    saved = create_notification(user["id"], {**fields, "user_id": user["id"]})
    _touch_ai(user["id"], body.kamera_id or body.kamera or None)
    await push_notification(user["id"], saved)
    return {"ok": True, "notification": saved}


@router.post("/notification/detect/upload")
async def integration_detection_upload(
    user: dict = Depends(get_api_user),
    payload: str = Form(..., description="JSON algılama payload"),
    gorsel: UploadFile = File(...),
):
    try:
        body = json.loads(payload)
    except json.JSONDecodeError as e:
        raise HTTPException(400, f"Gecersiz JSON: {e}") from e
    if "baslik" not in body or "guven" not in body or "zaman" not in body:
        raise HTTPException(400, "payload: baslik, guven, zaman zorunlu")
    gorsel_url = await _save_image(gorsel)
    fields = _payload_from_detection(body, gorsel_url)
    saved = create_notification(user["id"], {**fields, "user_id": user["id"]})
    _touch_ai(user["id"], body.get("kamera_id") or body.get("kamera") or None)
    await push_notification(user["id"], saved)
    return {"ok": True, "notification": saved}


@router.post("/notification")
async def integration_notification_json(body: NotificationIn, user: dict = Depends(get_api_user)):
    if body.alan or body.guven is not None:
        fields = _payload_from_detection(body.model_dump(exclude_none=True), body.gorsel_url or "")
        saved = create_notification(user["id"], {**fields, "user_id": user["id"]})
    else:
        payload = build_notification_payload(
            user["id"],
            baslik=body.baslik,
            detay=body.detay,
            kategori=body.kategori,
            seviye=body.seviye,
            kamera=body.kamera,
            modul=body.modul,
            gorsel=body.gorsel_url or "",
            tarih=body.tarih,
            zaman=body.zaman,
        )
        saved = create_notification(user["id"], payload)
    _touch_ai(user["id"], body.kamera_id or body.kamera or None)
    await push_notification(user["id"], saved)
    return {"ok": True, "notification": saved}


@router.post("/notification/upload")
async def integration_notification_upload(
    user: dict = Depends(get_api_user),
    baslik: str = Form(...),
    detay: str = Form(""),
    kategori: str = Form("Sistem"),
    seviye: str = Form("bilgi"),
    kamera: str = Form(""),
    modul: str = Form(""),
    tarih: Optional[str] = Form(None),
    zaman: Optional[str] = Form(None),
    gorsel: Optional[UploadFile] = File(None),
):
    gorsel_url = await _save_image(gorsel)
    payload = build_notification_payload(
        user["id"],
        baslik=baslik,
        detay=detay,
        kategori=kategori,
        seviye=seviye,
        kamera=kamera,
        modul=modul,
        gorsel=gorsel_url,
        tarih=tarih,
        zaman=zaman,
    )
    saved = create_notification(user["id"], payload)
    _touch_ai(user["id"], kamera or None)
    await push_notification(user["id"], saved)
    return {"ok": True, "notification": saved}
