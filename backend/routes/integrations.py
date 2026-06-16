"""Harici entegrasyon API (mobil, AI sunucu, scriptler)."""

from __future__ import annotations

import json
import shutil
import uuid
from datetime import datetime
from pathlib import Path
from typing import Optional

from fastapi import APIRouter, Depends, File, Form, Header, HTTPException, UploadFile
from pydantic import BaseModel, Field

from services.detection import detection_to_notification_fields
from services.notifications import build_notification_payload, create_notification, push_notification
from store import heartbeat_active, record_heartbeat, resolve_api_key

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
        "time": datetime.now().isoformat(),
    }


@router.post("/heartbeat")
def integration_heartbeat(body: HeartbeatIn, user: dict = Depends(get_api_user)):
    record_heartbeat(user["id"], body.camera_id, ai_server=True)
    return {"ok": True, "ai_aktif": True}


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
