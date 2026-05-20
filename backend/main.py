from __future__ import annotations

import asyncio
import shutil
import uuid
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import BackgroundTasks, Depends, FastAPI, File, Form, HTTPException, Query, UploadFile, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, Response
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel, EmailStr

from auth import create_token, decode_token
from config import DB_KIND, PUBLIC_WS_INTERVAL
import store
from store import (
    MODULES,
    add_camera,
    add_notification,
    change_password,
    create_user,
    delete_camera,
    find_user_by_email,
    find_user_by_id,
    get_cameras,
    hash_password,
    heartbeat_active,
    list_notifications,
    list_users,
    record_heartbeat,
    delete_user,
    ensure_demo_seed,
    get_daily_metric,
    metrics_trend,
    notification_stats_for_date,
    seed_if_empty,
    update_camera,
    update_user_layout,
    user_public,
    verify_password,
)
from demo_data import date_range, kpi_for_date, personnel_for_date, product_for_date
from mock_data import (
    AVAILABLE_DATES,
    DASHBOARD_SUMMARY,
    DETECTION_LOGS,
    NOTIFICATION_CATEGORIES,
    NOTIFICATION_STATS,
    PERSONNEL_PRODUCTIVITY,
    PRODUCT_BY_DATE,
    TRAFFIC_24H,
    get_compare,
)
from reports_export import build_pdf, build_xlsx
from roles import ROLE_LABELS
from ws_manager import manager

security = HTTPBearer(auto_error=False)
UPLOAD_DIR = Path(__file__).parent / "uploads"
UPLOAD_DIR.mkdir(exist_ok=True)

_next_mem_id = 1000


class LoginBody(BaseModel):
    email: str
    password: str


class UserCreate(BaseModel):
    kullanici_adi: str
    ad: str
    email: EmailStr
    sifre: str
    rol: str = "user"
    kurulum: str = ""


class PasswordChange(BaseModel):
    mevcut_sifre: str
    yeni_sifre: str


class CameraBody(BaseModel):
    ad: str
    rtsp: str
    modul: str
    token: str


class HeartbeatBody(BaseModel):
    camera_id: str | None = None


class LayoutBody(BaseModel):
    dashboard_layout: dict
    onboarding_done: bool | None = None


class ExportBody(BaseModel):
    title: str
    rows: list[dict] = []
    format: str = "pdf"


async def _ws_push_loop():
    while True:
        await asyncio.sleep(PUBLIC_WS_INTERVAL)
        for uid in list(manager.active.keys()):
            u = find_user_by_id(uid)
            if not u:
                continue
            pub = user_public(u)
            payload = {
                "type": "dashboard_tick",
                "summary": _summary_for_user(pub),
                "unread": len([n for n in list_notifications(uid) if not n.get("okundu")]),
                "ai_aktif": heartbeat_active(uid),
            }
            await manager.send_user(uid, payload)


@asynccontextmanager
async def lifespan(app: FastAPI):
    seed_if_empty()
    ensure_demo_seed()
    for uid in ["u-demo", "u-emilio", "u-admin", "u-mudur", "u-isg", "u-hype-demo"]:
        u = find_user_by_id(uid)
        if u:
            record_heartbeat(uid)
    task = asyncio.create_task(_ws_push_loop())
    yield
    task.cancel()


app = FastAPI(title="HypeVision API", version="3.0.0", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def get_current_user(creds: HTTPAuthorizationCredentials = Depends(security)) -> dict:
    if not creds:
        raise HTTPException(401, "Giriş gerekli")
    payload = decode_token(creds.credentials)
    if not payload:
        raise HTTPException(401, "Geçersiz oturum")
    user = find_user_by_id(payload["sub"])
    if not user:
        raise HTTPException(401, "Kullanıcı bulunamadı")
    return {**user_public(user), "impersonator_id": payload.get("imp")}


def require_admin(user: dict = Depends(get_current_user)) -> dict:
    if user["rol"] != "admin":
        raise HTTPException(403, "Admin yetkisi gerekli")
    return user


def _summary_for_user(user: dict) -> dict:
    cams = user.get("kameralar", [])
    aktif = len(cams)
    return {
        **DASHBOARD_SUMMARY,
        "kameralar": {"aktif": aktif, "toplam": max(aktif, 16), "degisim": f"{aktif} kurulum kamerası"},
        "bildirim_sayisi": len([n for n in list_notifications(user["id"]) if not n.get("okundu")]),
    }


@app.post("/api/auth/login")
def login(body: LoginBody):
    user = find_user_by_email(body.email)
    if not user:
        raise HTTPException(401, "Email veya şifre hatalı")
    if not verify_password(body.password, user.sifre_hash):
        raise HTTPException(401, "Email veya şifre hatalı")
    uid, email, rol = user.id, user.email, user.rol
    record_heartbeat(uid)
    token = create_token(uid, email, rol)
    return {"token": token, "user": user_public(user)}


@app.get("/api/auth/me")
def me(user: dict = Depends(get_current_user)):
    u = find_user_by_id(user["id"])
    return user_public(u)


@app.get("/api/meta/roles")
def meta_roles():
    return {"roles": [{"id": k, "label": v} for k, v in ROLE_LABELS.items()]}


@app.put("/api/user/preferences")
def save_preferences(body: LayoutBody, user: dict = Depends(get_current_user)):
    update_user_layout(user["id"], body.dashboard_layout, body.onboarding_done)
    return {"ok": True}


@app.get("/api/admin/users")
def admin_list_users(_: dict = Depends(require_admin)):
    users = list_users()
    return {"data": [user_public(u) for u in users]}


@app.post("/api/admin/users")
def add_user(body: UserCreate, _: dict = Depends(require_admin)):
    if find_user_by_email(body.email):
        raise HTTPException(400, "Email zaten kayıtlı")
    u = create_user(body.model_dump())
    return user_public(u)


@app.delete("/api/admin/users/{user_id}")
def remove_user(user_id: str, admin: dict = Depends(require_admin)):
    if user_id == admin["id"]:
        raise HTTPException(400, "Kendi hesabınızı silemezsiniz")
    err = delete_user(user_id)
    if err:
        raise HTTPException(400, err)
    return {"ok": True}


@app.post("/api/admin/impersonate/{user_id}")
def impersonate(user_id: str, admin: dict = Depends(require_admin)):
    target = find_user_by_id(user_id)
    if not target:
        raise HTTPException(404, "Kullanıcı bulunamadı")
    t = user_public(target)
    token = create_token(t["id"], t["email"], t["rol"], impersonator_id=admin["id"])
    return {"token": token, "user": t}


@app.websocket("/api/ws")
async def websocket_live(ws: WebSocket, token: str = Query(...)):
    payload = decode_token(token)
    if not payload:
        await ws.close(code=4401)
        return
    uid = payload["sub"]
    await manager.connect(uid, ws)
    try:
        await ws.send_json({"type": "connected", "user_id": uid})
        while True:
            msg = await ws.receive_text()
            if msg == "ping":
                await ws.send_json({"type": "pong"})
    except WebSocketDisconnect:
        manager.disconnect(uid, ws)


@app.post("/api/heartbeat")
def heartbeat(body: HeartbeatBody, user: dict = Depends(get_current_user)):
    record_heartbeat(user["id"], body.camera_id)
    return {"ok": True}


@app.get("/api/system/status")
def system_status(user: dict = Depends(get_current_user)):
    aktif = heartbeat_active(user["id"])
    return {
        "ai_aktif": aktif,
        "heartbeat": aktif,
        "mesaj": "AI Sunucu: Aktif" if aktif else "Bağlantı bekleniyor",
        "storage": DB_KIND,
    }


@app.get("/api/cameras/{camera_id}/stream")
def camera_stream(camera_id: str, user: dict = Depends(get_current_user)):
    cams = get_cameras(user["id"])
    cam = next((c for c in cams if c["id"] == camera_id), None)
    if not cam:
        raise HTTPException(404, "Kamera bulunamadı")
    return {
        "camera_id": camera_id,
        "mode": "webrtc_gateway",
        "signaling_url": f"/api/cameras/{camera_id}/signal",
        "rtsp_source": cam["rtsp"],
        "demo_hls": "https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8",
        "poster": "/api/placeholder/camera.jpg",
        "status": "demo_live",
        "mesaj": "Demo: RTSP gateway simülasyonu — üretimde MediaMTX/Janus bağlanır",
    }


@app.get("/api/notifications/recent")
def recent_notifications(limit: int = 10, user: dict = Depends(get_current_user)):
    items = list_notifications(user["id"])[:limit]
    return {"data": items}


@app.get("/api/notifications")
def get_notifications(user: dict = Depends(get_current_user)):
    return {
        "data": list_notifications(user["id"]),
        "categories": NOTIFICATION_CATEGORIES,
        "stats": NOTIFICATION_STATS,
    }


@app.post("/api/notifications")
async def create_notification(
    background_tasks: BackgroundTasks,
    user: dict = Depends(get_current_user),
    tarih: str = Form(...),
    zaman: str = Form(...),
    kamera: str = Form(...),
    kategori: str = Form(...),
    baslik: str = Form(...),
    detay: str = Form(""),
    seviye: str = Form("bilgi"),
    modul: str = Form(""),
    gorsel: UploadFile | None = File(None),
):
    global _next_mem_id
    gorsel_url = ""
    if gorsel and gorsel.filename:
        ext = Path(gorsel.filename).suffix or ".jpg"
        fname = f"{uuid.uuid4().hex}{ext}"
        path = UPLOAD_DIR / fname
        with path.open("wb") as f:
            shutil.copyfileobj(gorsel.file, f)
        gorsel_url = f"/api/uploads/{fname}"

    item = {
        "id": _next_mem_id,
        "user_id": user["id"],
        "tarih": tarih,
        "zaman": zaman,
        "kamera": kamera,
        "kategori": kategori,
        "baslik": baslik,
        "detay": detay,
        "seviye": seviye,
        "modul": modul,
        "gorsel": gorsel_url,
        "okundu": False,
    }
    _next_mem_id += 1
    saved = add_notification(item)

    async def push_ws_notification(uid: str, payload: dict):
        await manager.send_user(uid, payload)

    background_tasks.add_task(
        push_ws_notification,
        user["id"],
        {
            "type": "notification",
            "item": saved,
            "unread": len([n for n in list_notifications(user["id"]) if not n.get("okundu")]),
        },
    )
    return saved


@app.get("/api/uploads/{filename}")
def serve_upload(filename: str):
    path = UPLOAD_DIR / filename
    if not path.exists():
        raise HTTPException(404)
    return FileResponse(path)


@app.get("/api/settings/cameras")
def get_cameras_route(user: dict = Depends(get_current_user)):
    return {"data": get_cameras(user["id"]), "modules": MODULES}


@app.post("/api/settings/cameras")
def add_camera_route(body: CameraBody, user: dict = Depends(get_current_user)):
    return add_camera(user["id"], body.model_dump())


@app.put("/api/settings/cameras/{camera_id}")
def update_camera_route(camera_id: str, body: CameraBody, user: dict = Depends(get_current_user)):
    cam = update_camera(user["id"], camera_id, body.model_dump())
    if not cam:
        raise HTTPException(404, "Kamera bulunamadı")
    return cam


@app.delete("/api/settings/cameras/{camera_id}")
def delete_camera_route(camera_id: str, user: dict = Depends(get_current_user)):
    delete_camera(user["id"], camera_id)
    return {"ok": True}


@app.post("/api/settings/password")
def change_password_route(body: PasswordChange, user: dict = Depends(get_current_user)):
    u = find_user_by_id(user["id"])
    pw = u.sifre_hash
    if not verify_password(body.mevcut_sifre, pw):
        raise HTTPException(401, "Mevcut şifre hatalı")
    if len(body.yeni_sifre) < 6:
        raise HTTPException(400, "Yeni şifre en az 6 karakter")
    change_password(user["id"], hash_password(body.yeni_sifre))
    return {"ok": True, "mesaj": "Şifre güncellendi"}


@app.get("/api/meta/dates")
def meta_dates():
    return {"dates": AVAILABLE_DATES, "compare_presets": ["bugun_dun", "hafta"]}


@app.get("/api/productivity")
def productivity():
    return PERSONNEL_PRODUCTIVITY


@app.get("/api/counts/products")
def product_counts(tarih: str | None = None):
    key = tarih or AVAILABLE_DATES[0]
    payload = PRODUCT_BY_DATE.get(key) or product_for_date(key)
    return {"tarih": key, "dates": AVAILABLE_DATES, **payload}


@app.get("/api/mes/productivity")
def mes_productivity(tarih: str | None = None, user: dict = Depends(get_current_user)):
    key = tarih or AVAILABLE_DATES[0]
    k = get_daily_metric(user["id"], key) or kpi_for_date(key)
    personeller = personnel_for_date(key)
    return {
        "tarih": key,
        "ortalama_verimlilik": k["verimlilik"],
        "aktif_personel": k["personel_aktif"],
        "personeller": personeller,
        "vardiya_trend": [
            {"vardiya": "06-14", "verimlilik": round(k["verimlilik"] - 2.1, 1)},
            {"vardiya": "14-22", "verimlilik": round(k["verimlilik"] + 0.6, 1)},
            {"vardiya": "22-06", "verimlilik": round(k["verimlilik"] - 4.9, 1)},
        ],
    }


@app.get("/api/reports/kpis")
def reports_kpis(tarih: str | None = None, user: dict = Depends(get_current_user)):
    key = tarih or AVAILABLE_DATES[0]
    uid = user["id"]
    k = get_daily_metric(uid, key) or kpi_for_date(key)
    urun = product_for_date(key)
    notifs = [n for n in list_notifications(uid) if n.get("tarih") == key]
    if notifs:
        k = {**k, "bildirim_sayisi": len(notifs)}
    return {
        "tarih": key,
        "dates": AVAILABLE_DATES,
        "kpi": k,
        "urun": urun,
        "trend": metrics_trend(uid, 30),
        "kategori_dagilim": notification_stats_for_date(uid, key),
        "personel_ortalama": k["verimlilik"],
        "kurulum": user.get("kurulum", ""),
    }


@app.post("/api/reports/daily-email")
def daily_email_mock(user: dict = Depends(get_current_user)):
    u = find_user_by_id(user["id"])
    email = u.email
    return {
        "ok": True,
        "mesaj": f"Günlük özet {email} adresine kuyruğa alındı (demo)",
        "gonderim": "simüle",
    }


@app.get("/api/reports/export")
def export_report(
    title: str = Query(...),
    format: str = Query("pdf", pattern="^(pdf|xlsx)$"),
    user: dict = Depends(get_current_user),
):
    rows = [
        {"rapor": "Günlük İSG Özeti", "tarih": "19.05.2026", "durum": "Hazır"},
        {"rapor": "Haftalık Verimlilik (MES)", "tarih": "18.05.2026", "durum": "Hazır"},
        {"rapor": title, "tarih": "19.05.2026", "durum": "Hazır"},
    ]
    meta = {"kurulum": user.get("kurulum", "")}
    if format == "xlsx":
        data = build_xlsx(title, rows)
        return Response(
            data,
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={"Content-Disposition": f'attachment; filename="{title[:40]}.xlsx"'},
        )
    data = build_pdf(title, rows, meta)
    return Response(
        data,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{title[:40]}.pdf"'},
    )


@app.get("/api/dashboard/all")
def dashboard_all(
    compare: str | None = None,
    user: dict = Depends(get_current_user),
):
    today = AVAILABLE_DATES[0]
    u = find_user_by_id(user["id"])
    pub = user_public(u)
    return {
        "summary": _summary_for_user(pub),
        "dates": AVAILABLE_DATES,
        "traffic": TRAFFIC_24H,
        "compare": get_compare(compare),
        "compare_presets": ["bugun_dun", "hafta"],
        "notifications": list_notifications(user["id"]),
        "notification_categories": NOTIFICATION_CATEGORIES,
        "notification_stats": NOTIFICATION_STATS,
        "logs": DETECTION_LOGS,
        "productivity": PERSONNEL_PRODUCTIVITY,
        "product_counts": {"tarih": today, "dates": AVAILABLE_DATES, **PRODUCT_BY_DATE[today]},
        "system": {"ai_aktif": heartbeat_active(user["id"]), "storage": DB_KIND},
        "user": pub,
    }
