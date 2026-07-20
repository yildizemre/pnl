from __future__ import annotations

import asyncio
import shutil
import uuid
from contextlib import asynccontextmanager
from datetime import date
from pathlib import Path
from typing import List, Optional

from fastapi import BackgroundTasks, Depends, FastAPI, File, Form, HTTPException, Query, Request, UploadFile, WebSocket, WebSocketDisconnect
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse, Response
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel, EmailStr, model_validator

from auth import create_token, decode_token
from config import DB_KIND, PUBLIC_WS_INTERVAL
import store
from store import (
    MODULES,
    change_password,
    count_unread,
    create_api_key,
    create_user,
    delete_api_key,
    find_user_by_email,
    find_user_by_login,
    find_user_by_id,
    hash_password,
    heartbeat_active,
    list_api_keys,
    list_notifications,
    list_users,
    mark_all_notifications_read,
    mark_notification_read,
    set_notification_feedback,
    get_notification,
    record_heartbeat,
    delete_user,
    reset_user_panel_data,
    ensure_admin_seed,
    ensure_all_panel_seeds,
    ensure_demo_api_key,
    ensure_demo_seed,
    get_daily_metric,
    get_mes_presence,
    mes_productivity_for_user,
    save_mes_presence,
    metrics_trend,
    notification_stats_for_date,
    notifications_for_date,
    build_traffic_from_notifications,
    build_notification_insights,
    build_system_health,
    build_tracked_cameras,
    build_training_feedback_report,
    dashboard_summary_for_user,
    panel_detection_logs,
    panel_notification_stats,
    panel_product_counts,
    get_floor_plan,
    get_integration_status,
    save_floor_plan,
    seed_if_empty,
    update_user,
    update_user_layout,
    user_public,
    verify_password,
)
from services.notifications import build_notification_payload, create_notification, push_notification
from routes.integrations import router as integrations_router
from security_middleware import SecurityHeadersMiddleware
from demo_data import date_range, kpi_for_date, mes_productivity_for_date, product_for_date
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
DEMO_KEY_FILE = Path(__file__).parent / "data" / ".demo-api-key"


class LoginBody(BaseModel):
    login: Optional[str] = None
    email: Optional[str] = None
    password: str

    @model_validator(mode="after")
    def _identifier_present(self):
        if not (self.login or self.email or "").strip():
            raise ValueError("E-posta veya kullanıcı adı gerekli")
        return self

    @property
    def identifier(self) -> str:
        return (self.login or self.email or "").strip()


class UserCreate(BaseModel):
    kullanici_adi: str
    ad: str = ""
    isim: str = ""
    soyisim: str = ""
    email: EmailStr
    sifre: str
    rol: str = "user"
    kurulum: str = ""
    moduller: Optional[List[str]] = None

    def resolved_ad(self) -> str:
        full = f"{(self.isim or '').strip()} {(self.soyisim or '').strip()}".strip()
        name = full or (self.ad or "").strip()
        if not name:
            raise ValueError("İsim soyisim gerekli")
        return name


class UserUpdate(BaseModel):
    ad: Optional[str] = None
    isim: Optional[str] = None
    soyisim: Optional[str] = None
    kullanici_adi: Optional[str] = None
    rol: Optional[str] = None
    kurulum: Optional[str] = None
    moduller: Optional[List[str]] = None

    def resolved_ad(self) -> str | None:
        if self.isim is not None or self.soyisim is not None:
            full = f"{(self.isim or '').strip()} {(self.soyisim or '').strip()}".strip()
            return full or None
        if self.ad is not None:
            return self.ad.strip() or None
        return None


class PasswordChange(BaseModel):
    mevcut_sifre: str
    yeni_sifre: str


class NotificationJsonBody(BaseModel):
    baslik: str
    detay: str = ""
    kategori: str = "İSG"
    seviye: str = "uyari"
    kamera: str = ""
    modul: str = ""
    gorsel: str = ""
    tarih: Optional[str] = None
    zaman: Optional[str] = None
    guven: Optional[float] = None
    alan: Optional[str] = None
    model: Optional[str] = None


class MesPresenceBody(BaseModel):
    tarih: Optional[str] = None
    personeller: List[dict]


class HeartbeatBody(BaseModel):
    camera_id: Optional[str] = None


class LayoutBody(BaseModel):
    dashboard_layout: dict
    onboarding_done: Optional[bool] = None


class ApiKeyCreate(BaseModel):
    label: str = "Entegrasyon"


class NotificationReadBody(BaseModel):
    okundu: bool = True


class FeedbackBody(BaseModel):
    label: str  # evet | hayir


class FloorPlanBody(BaseModel):
    mode: str = "default"
    background: str = ""
    points: List[dict] = []
    sites: Optional[List[dict]] = None
    active_site_id: Optional[str] = None
    name: Optional[str] = None


async def _ws_push_loop():
    while True:
        await asyncio.sleep(PUBLIC_WS_INTERVAL)
        for uid in list(manager.active.keys()):
            u = find_user_by_id(uid)
            if not u:
                continue
            pub = user_public(u)
            today = date.today().isoformat()
            floor_plan = get_floor_plan(uid)
            system_health = build_system_health(uid, floor_plan, today)
            payload = {
                "type": "dashboard_tick",
                "summary": _summary_for_user(pub, today),
                "unread": count_unread(uid),
                "ai_aktif": system_health["ai_aktif"],
                "system_health": system_health,
            }
            await manager.send_user(uid, payload)


async def _run_in_thread(fn):
    """Python 3.8 uyumluluğu — asyncio.to_thread 3.9+."""
    if hasattr(asyncio, "to_thread"):
        return await asyncio.to_thread(fn)
    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(None, fn)


def _run_background_seeds():
    """Ağır demo veri yükleme — girişi bloklamasın diye arka planda."""
    try:
        seed_if_empty()
        ensure_admin_seed()
        ensure_demo_seed()
        ensure_all_panel_seeds()
        demo_key = ensure_demo_api_key()
        if demo_key:
            DEMO_KEY_FILE.parent.mkdir(parents=True, exist_ok=True)
            if not DEMO_KEY_FILE.exists():
                DEMO_KEY_FILE.write_text(demo_key, encoding="utf-8")
                print(f"[HypeVision] Demo API anahtarı oluşturuldu → {DEMO_KEY_FILE}")
        for uid in ["u-demo", "u-emilio", "u-admin", "u-mudur", "u-isg", "u-hype-demo", "u-hype-admin"]:
            u = find_user_by_id(uid)
            if u:
                record_heartbeat(uid, ai_server=True)
        print("[HypeVision] Demo veri yükleme tamamlandı")
    except Exception as exc:
        print(f"[HypeVision] Demo veri yükleme hatası: {exc}")


def _ensure_admin_quick():
    """Giriş için minimum: admin kullanıcısı DB'de olsun."""
    from models import init_db, UserModel, SessionLocal
    from demo_data import ADMIN_EMAIL, ADMIN_PASSWORD, ADMIN_USER_ID

    init_db()
    with SessionLocal() as db:
        user = db.query(UserModel).filter(UserModel.email == ADMIN_EMAIL.lower()).first()
        if not user:
            db.add(
                UserModel(
                    id=ADMIN_USER_ID,
                    kullanici_adi="admin",
                    ad="Hype Admin",
                    email=ADMIN_EMAIL.lower(),
                    sifre_hash=hash_password(ADMIN_PASSWORD),
                    rol="admin",
                    kurulum="Hype Vision Lab",
                    onboarding_done=True,
                )
            )
            db.commit()
        elif user.rol != "admin":
            user.rol = "admin"
            db.commit()


@asynccontextmanager
async def lifespan(app: FastAPI):
    _ensure_admin_quick()
    seed_task = asyncio.create_task(_run_in_thread(_run_background_seeds))
    task = asyncio.create_task(_ws_push_loop())
    yield
    seed_task.cancel()
    task.cancel()


app = FastAPI(title="HypeVision API", version="3.1.0", lifespan=lifespan)
app.include_router(integrations_router)
app.add_middleware(SecurityHeadersMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def _friendly_http_detail(status: int, detail) -> str:
    if isinstance(detail, str) and detail.strip():
        text = detail.strip()
        if status == 404 and text.lower() in ("not found", "not found."):
            return "İstenen bilgi bulunamadı."
        return text
    if status == 401:
        return "Oturumunuz sona erdi veya yetkiniz yok."
    if status == 403:
        return "Bu işlem için yetkiniz bulunmuyor."
    if status == 404:
        return "İstenen bilgi bulunamadı."
    if status == 422:
        return "Gönderilen bilgiler eksik veya hatalı."
    if status == 429:
        return "Çok fazla istek gönderildi. Lütfen kısa bir süre bekleyin."
    if status >= 500:
        return "Bir sorun oluştu. Lütfen daha sonra tekrar deneyin."
    return "Bir sorun oluştu. Lütfen daha sonra tekrar deneyin."


@app.exception_handler(HTTPException)
async def http_exception_handler(_request: Request, exc: HTTPException):
    return JSONResponse(
        status_code=exc.status_code,
        content={"ok": False, "detail": _friendly_http_detail(exc.status_code, exc.detail)},
    )


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(_request: Request, _exc: RequestValidationError):
    return JSONResponse(
        status_code=422,
        content={"ok": False, "detail": "Gönderilen bilgiler eksik veya hatalı. Alanları kontrol edin."},
    )


@app.exception_handler(404)
async def not_found_handler(_request: Request, _exc):
    return JSONResponse(
        status_code=404,
        content={"ok": False, "detail": "İstenen adres bulunamadı."},
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


def _summary_for_user(user: dict, tarih: str | None = None) -> dict:
    uid = user["id"]
    today = tarih or date.today().isoformat()
    floor_plan = get_floor_plan(uid)
    return dashboard_summary_for_user(uid, floor_plan, today)


@app.post("/api/auth/login")
def login(body: LoginBody):
    user = find_user_by_login(body.identifier)
    if not user:
        raise HTTPException(401, "Email veya şifre hatalı")
    if not verify_password(body.password, user.sifre_hash):
        raise HTTPException(401, "Email veya şifre hatalı")
    uid, email, rol = user.id, user.email, user.rol
    token = create_token(uid, email, rol)
    return {"token": token, "user": user_public(user)}


@app.get("/api/auth/me")
def me(user: dict = Depends(get_current_user)):
    return user


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
    try:
        ad = body.resolved_ad()
    except ValueError as e:
        raise HTTPException(400, str(e)) from e
    payload = body.model_dump()
    payload["ad"] = ad
    u = create_user(payload)
    return user_public(u)


@app.patch("/api/admin/users/{user_id}")
def admin_update_user(user_id: str, body: UserUpdate, _: dict = Depends(require_admin)):
    if not find_user_by_id(user_id):
        raise HTTPException(404, "Kullanıcı bulunamadı")
    data = body.model_dump(exclude_unset=True)
    resolved = body.resolved_ad()
    if resolved is not None:
        data["ad"] = resolved
    data.pop("isim", None)
    data.pop("soyisim", None)
    u = update_user(user_id, data)
    if not u:
        raise HTTPException(404, "Kullanıcı bulunamadı")
    return {"ok": True, "user": user_public(u)}


@app.post("/api/admin/users/{user_id}/reset-panel-data")
def admin_reset_panel_data(user_id: str, _: dict = Depends(require_admin)):
    err = reset_user_panel_data(user_id)
    if err:
        raise HTTPException(400, err)
    return {"ok": True}


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


@app.get("/api/admin/users/{user_id}/api-keys")
def admin_list_api_keys(user_id: str, _: dict = Depends(require_admin)):
    if not find_user_by_id(user_id):
        raise HTTPException(404, "Kullanıcı bulunamadı")
    return {"data": list_api_keys(user_id)}


@app.post("/api/admin/users/{user_id}/api-keys")
def admin_create_api_key(user_id: str, body: ApiKeyCreate, _: dict = Depends(require_admin)):
    if not find_user_by_id(user_id):
        raise HTTPException(404, "Kullanıcı bulunamadı")
    meta, raw = create_api_key(user_id, body.label)
    return {"ok": True, "key": meta, "api_key": raw, "mesaj": "Anahtarı güvenli yerde saklayın — tekrar gösterilmez"}


@app.delete("/api/admin/api-keys/{key_id}")
def admin_delete_api_key(key_id: str, _: dict = Depends(require_admin)):
    if not delete_api_key(key_id):
        raise HTTPException(404, "Anahtar bulunamadı")
    return {"ok": True}


@app.get("/api/floor-plan")
def user_floor_plan(user: dict = Depends(get_current_user)):
    plan = get_floor_plan(user["id"])
    return {"data": plan, "modules": MODULES}


@app.get("/api/admin/users/{user_id}/floor-plan")
def admin_get_floor_plan(user_id: str, _: dict = Depends(require_admin)):
    if not find_user_by_id(user_id):
        raise HTTPException(404, "Kullanıcı bulunamadı")
    return {"data": get_floor_plan(user_id), "modules": MODULES}


@app.put("/api/admin/users/{user_id}/floor-plan")
def admin_save_floor_plan(user_id: str, body: FloorPlanBody, _: dict = Depends(require_admin)):
    if not find_user_by_id(user_id):
        raise HTTPException(404, "Kullanıcı bulunamadı")
    saved = save_floor_plan(user_id, body.model_dump())
    return {"ok": True, "data": saved}


@app.post("/api/admin/users/{user_id}/floor-plan/background")
async def admin_upload_floor_background(
    user_id: str,
    _: dict = Depends(require_admin),
    image: UploadFile = File(...),
):
    if not find_user_by_id(user_id):
        raise HTTPException(404, "Kullanıcı bulunamadı")
    ext = Path(image.filename or "plan.jpg").suffix or ".jpg"
    fname = f"floor-{user_id}-{uuid.uuid4().hex[:8]}{ext}"
    path = UPLOAD_DIR / fname
    with path.open("wb") as f:
        shutil.copyfileobj(image.file, f)
    url = f"/api/uploads/{fname}"
    plan = get_floor_plan(user_id)
    sites = [dict(s) for s in plan.get("sites") or []]
    aid = plan.get("active_site_id")
    for i, site in enumerate(sites):
        if site.get("id") == aid:
            sites[i] = {**site, "mode": "image", "background": url}
            break
    saved = save_floor_plan(user_id, {"sites": sites, "active_site_id": aid})
    return {"ok": True, "background": url, "data": saved}


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
    today = date.today().isoformat()
    floor_plan = get_floor_plan(user["id"])
    health = build_system_health(user["id"], floor_plan, today)
    return {
        "ai_aktif": health["ai_aktif"],
        "heartbeat": health["ai_aktif"],
        "mesaj": "AI Sunucu: Aktif" if health["ai_aktif"] else "Bağlantı bekleniyor",
        "storage": DB_KIND,
        "system_health": health,
    }


@app.get("/api/user/integration")
def user_integration(request: Request, user: dict = Depends(get_current_user)):
    base = str(request.base_url).rstrip("/")
    return get_integration_status(user["id"], base)


@app.post("/api/user/integration/test")
async def user_integration_test(request: Request, user: dict = Depends(get_current_user)):
    from datetime import datetime, timezone

    record_heartbeat(user["id"], ai_server=True)
    payload = build_notification_payload(
        user["id"],
        baslik="Bağlantı testi",
        detay="Panelden gönderilen entegrasyon test bildirimi.",
        kategori="Sistem",
        seviye="bilgi",
        kamera="test",
        modul="Entegrasyon",
        zaman=datetime.now(timezone.utc).strftime("%H:%M"),
    )
    saved = create_notification(user["id"], payload)
    await push_notification(user["id"], saved)
    base = str(request.base_url).rstrip("/")
    today = date.today().isoformat()
    floor_plan = get_floor_plan(user["id"])
    health = build_system_health(user["id"], floor_plan, today)
    return {
        "ok": True,
        "mesaj": "Test bildirimi gönderildi ve bağlantı güncellendi.",
        "notification": saved,
        "integration": get_integration_status(user["id"], base),
        "system_health": health,
    }


@app.get("/api/reports/training-feedback")
def training_feedback_report(days: int = Query(7, ge=1, le=90), user: dict = Depends(get_current_user)):
    return build_training_feedback_report(user["id"], days)


@app.get("/api/placeholder/{filename}")
def placeholder_image(filename: str):
    """Demo bildirim / kamera görselleri için SVG placeholder."""
    name = (filename or "demo").lower().replace(".jpg", "").replace(".png", "")
    palette = {
        "yangin": ("#7f1d1d", "#ef4444", "Yangın"),
        "yangın": ("#7f1d1d", "#ef4444", "Yangın"),
        "duman": ("#7c2d12", "#f97316", "Duman"),
        "dusme": ("#991b1b", "#dc2626", "Düşme"),
        "düşme": ("#991b1b", "#dc2626", "Düşme"),
        "yasak": ("#4c1d95", "#8b5cf6", "Yasak Bölge"),
        "isg": ("#78350f", "#f59e0b", "İSG"),
        "üretim": ("#4c1d95", "#6366f1", "Üretim"),
        "uretim": ("#4c1d95", "#6366f1", "Üretim"),
        "mes": ("#14532d", "#22c55e", "MES"),
        "kalite": ("#1e3a8a", "#3b82f6", "Kalite"),
        "sistem": ("#334155", "#64748b", "Sistem"),
        "camera": ("#0c4a6e", "#38bdf8", "Kamera"),
    }
    key = next((k for k in palette if k in name), "sistem")
    bg, accent, label = palette[key]
    svg = f"""<svg xmlns="http://www.w3.org/2000/svg" width="320" height="180" viewBox="0 0 320 180">
      <rect width="320" height="180" fill="{bg}"/>
      <rect x="16" y="16" width="288" height="148" rx="8" fill="none" stroke="{accent}" stroke-width="2" opacity="0.5"/>
      <circle cx="160" cy="78" r="28" fill="{accent}" opacity="0.25"/>
      <text x="160" y="130" text-anchor="middle" fill="#f8fafc" font-family="Arial,sans-serif" font-size="14" font-weight="600">{label}</text>
      <text x="160" y="150" text-anchor="middle" fill="#94a3b8" font-family="Arial,sans-serif" font-size="10">HypeVision Demo</text>
    </svg>"""
    return Response(content=svg, media_type="image/svg+xml")


@app.get("/api/notifications/insights")
def notification_insights(tarih: Optional[str] = None, user: dict = Depends(get_current_user)):
    key = tarih or date.today().isoformat()
    return build_notification_insights(user["id"], key)


@app.get("/api/notifications/recent")
def recent_notifications(limit: int = 10, user: dict = Depends(get_current_user)):
    items = list_notifications(user["id"])[:limit]
    return {"data": items}


@app.get("/api/notifications")
def get_notifications(user: dict = Depends(get_current_user)):
    uid = user["id"]
    items = list_notifications(uid)
    return {
        "data": items,
        "categories": NOTIFICATION_CATEGORIES,
        "stats": panel_notification_stats(uid),
    }


@app.patch("/api/notifications/{notification_id}/read")
def read_notification(notification_id: int, user: dict = Depends(get_current_user)):
    item = mark_notification_read(notification_id, user["id"])
    if not item:
        raise HTTPException(404, "Bildirim bulunamadı")
    return {"ok": True, "item": item, "unread": count_unread(user["id"])}


@app.post("/api/notifications/{notification_id}/feedback")
def notification_feedback(notification_id: int, body: FeedbackBody, user: dict = Depends(get_current_user)):
    label = body.label.strip().lower()
    if label not in ("evet", "hayir"):
        raise HTTPException(400, "label: evet veya hayir")
    item = set_notification_feedback(notification_id, user["id"], label)
    if not item:
        raise HTTPException(404, "Bildirim bulunamadı")
    return {"ok": True, "item": item, "training": item.get("feedback"), "unread": count_unread(user["id"])}


@app.patch("/api/notifications/read-all")
def read_all_notifications(user: dict = Depends(get_current_user)):
    n = mark_all_notifications_read(user["id"])
    return {"ok": True, "marked": n, "unread": 0}


@app.get("/api/notifications/unread-count")
def unread_count(user: dict = Depends(get_current_user)):
    return {"unread": count_unread(user["id"])}


@app.get("/api/notifications/{notification_id}")
def get_one_notification(notification_id: int, user: dict = Depends(get_current_user)):
    item = get_notification(notification_id, user["id"])
    if not item:
        raise HTTPException(404, "Bildirim bulunamadı")
    return item


@app.post("/api/notifications")
async def create_notification_route(
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
    gorsel: Optional[UploadFile] = File(None),
):
    gorsel_url = ""
    if gorsel and gorsel.filename:
        ext = Path(gorsel.filename).suffix or ".jpg"
        fname = f"{uuid.uuid4().hex}{ext}"
        path = UPLOAD_DIR / fname
        with path.open("wb") as f:
            shutil.copyfileobj(gorsel.file, f)
        gorsel_url = f"/api/uploads/{fname}"

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

    background_tasks.add_task(push_notification, user["id"], saved)
    return saved


@app.post("/api/notifications/json")
async def create_notification_json(
    body: NotificationJsonBody,
    background_tasks: BackgroundTasks,
    user: dict = Depends(get_current_user),
):
    """Panel / entegrasyon — JSON ile İSG, yangın vb. bildirim gönder."""
    today = date.today().isoformat()
    payload = build_notification_payload(
        user["id"],
        baslik=body.baslik,
        detay=body.detay,
        kategori=body.kategori,
        seviye=body.seviye,
        kamera=body.kamera or "Kamera",
        modul=body.modul,
        gorsel=body.gorsel or "",
        tarih=body.tarih or today,
        zaman=body.zaman or "",
    )
    saved = create_notification(user["id"], payload)
    background_tasks.add_task(push_notification, user["id"], saved)
    return saved


@app.get("/api/uploads/{filename}")
def serve_upload(filename: str):
    path = UPLOAD_DIR / filename
    if not path.exists():
        raise HTTPException(404)
    return FileResponse(path)


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
    return mes_productivity_for_date(AVAILABLE_DATES[0])


@app.get("/api/counts/products")
def product_counts(tarih: Optional[str] = None):
    key = tarih or AVAILABLE_DATES[0]
    return panel_product_counts(key)


@app.get("/api/mes/productivity")
def mes_productivity(tarih: Optional[str] = None, user: dict = Depends(get_current_user)):
    key = tarih or date.today().isoformat()
    base = mes_productivity_for_user(user["id"], key)
    k = get_daily_metric(user["id"], key)
    if k:
        base["ortalama_verimlilik"] = float(k["verimlilik"]) if isinstance(k.get("verimlilik"), str) else k["verimlilik"]
    return base


@app.post("/api/mes/presence")
def mes_presence_ingest(body: MesPresenceBody, user: dict = Depends(get_current_user)):
    """YOLO / entegrasyon — günlük personel varlık JSON gönderimi (kullanıcıya özel)."""
    key = body.tarih or date.today().isoformat()
    if not body.personeller:
        raise HTTPException(400, "personeller listesi boş olamaz")
    return save_mes_presence(user["id"], key, body.personeller)


@app.get("/api/reports/kpis")
def reports_kpis(tarih: Optional[str] = None, user: dict = Depends(get_current_user)):
    key = tarih or date.today().isoformat()
    uid = user["id"]
    notifs = notifications_for_date(uid, key)
    k = get_daily_metric(uid, key)
    if not k:
        isg = len([n for n in notifs if n.get("seviye") in ("kritik", "uyari")])
        k = {
            "tarih": key,
            "urun_toplam": 0,
            "verimlilik": 0,
            "isg_ihlal": isg,
            "personel_aktif": 0,
            "bildirim_sayisi": len(notifs),
            "log_sayisi": 0,
        }
    elif notifs:
        k = {**k, "bildirim_sayisi": len(notifs)}
    urun = product_for_date(key) if get_daily_metric(uid, key) else {"toplam": 0, "degisim": "Veri yok"}
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
    compare: Optional[str] = None,
    user: dict = Depends(get_current_user),
):
    today = date.today().isoformat()
    uid = user["id"]
    u = find_user_by_id(uid)
    pub = user_public(u)
    floor_plan = get_floor_plan(uid)
    today_notifs = notifications_for_date(uid, today)
    all_notifs = list_notifications(uid)
    pc = panel_product_counts(today)
    mes = mes_productivity_for_user(uid, today)
    k = get_daily_metric(uid, today)
    if k:
        mes["ortalama_verimlilik"] = float(k["verimlilik"]) if isinstance(k.get("verimlilik"), str) else k["verimlilik"]
    # aktif_personel personel listesinden gelir (çok kiracılı)
    traffic = build_traffic_from_notifications(today_notifs)
    system_health = build_system_health(uid, floor_plan, today)
    return {
        "today": today,
        "summary": _summary_for_user(pub, today),
        "dates": AVAILABLE_DATES,
        "traffic": traffic,
        "compare": get_compare(compare),
        "compare_presets": ["bugun_dun", "hafta"],
        "notifications": all_notifs,
        "today_notifications": today_notifs,
        "notification_categories": NOTIFICATION_CATEGORIES,
        "notification_stats": notification_stats_for_date(uid, today),
        "logs": panel_detection_logs(uid, DETECTION_LOGS),
        "productivity": mes,
        "product_counts": pc,
        "floor_plan": floor_plan,
        "tracked_cameras": build_tracked_cameras(floor_plan),
        "system": {"ai_aktif": system_health["ai_aktif"], "storage": DB_KIND, "has_api_key": system_health["has_api_key"]},
        "system_health": system_health,
        "user": pub,
    }
