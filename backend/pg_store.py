from __future__ import annotations

import json
import uuid
from datetime import date, datetime, timedelta, timezone

from api_keys import generate_api_key, verify_api_key
from passlib.context import CryptContext
from sqlalchemy.orm import Session, joinedload, object_session

from models import ApiKeyModel, CameraModel, DailyMetricModel, FloorPlanModel, HeartbeatModel, NotificationModel, SessionLocal, UserModel, init_db
from roles import modules_for_role
from mock_data import NOTIFICATIONS, build_facility_cameras
from demo_data import (
    ADMIN_EMAIL,
    ADMIN_PASSWORD,
    ADMIN_USER_ID,
    DEMO_EMAIL,
    DEMO_PASSWORD,
    DEMO_USER_ID,
    MIN_PANEL_NOTIFICATIONS,
    PANEL_DEMO_USER_IDS,
    build_panel_notifications,
    date_range,
    detection_logs_from_notifications,
    kpi_for_date,
    mes_productivity_for_date,
    notification_stats_all,
    product_for_date,
)

HEARTBEAT_MAX_SECONDS = 300


def _new_site_id() -> str:
    return f"site-{uuid.uuid4().hex[:8]}"


def _normalize_floor_plan_raw(raw_json: str | None, row: FloorPlanModel | None = None) -> dict:
    if not raw_json:
        sid = _new_site_id()
        return {"sites": [{"id": sid, "name": "Ana Tesis", "mode": "default", "background": "", "points": []}], "active_site_id": sid}
    try:
        parsed = json.loads(raw_json)
    except json.JSONDecodeError:
        parsed = []

    if isinstance(parsed, list):
        sid = "site-main" if row else _new_site_id()
        return {
            "sites": [{
                "id": sid,
                "name": "Ana Tesis",
                "mode": (row.mode if row else "default") or "default",
                "background": (row.background if row else "") or "",
                "points": parsed,
            }],
            "active_site_id": sid,
        }

    if isinstance(parsed, dict) and "sites" in parsed:
        sites = parsed.get("sites") or []
        if not sites:
            sid = _new_site_id()
            sites = [{"id": sid, "name": "Ana Tesis", "mode": "default", "background": "", "points": []}]
        active = parsed.get("active_site_id") or sites[0]["id"]
        if not any(s.get("id") == active for s in sites):
            active = sites[0]["id"]
        return {"sites": sites, "active_site_id": active}

    sid = _new_site_id()
    return {"sites": [{"id": sid, "name": "Ana Tesis", "mode": "default", "background": "", "points": []}], "active_site_id": sid}


def _flatten_floor_plan(plan: dict) -> dict:
    sites = plan.get("sites") or []
    active_id = plan.get("active_site_id") or (sites[0]["id"] if sites else "")
    active = next((s for s in sites if s.get("id") == active_id), sites[0] if sites else {})
    all_points: list[dict] = []
    for site in sites:
        for p in site.get("points") or []:
            all_points.append({**p, "site_id": site.get("id"), "site_name": site.get("name", "")})
    return {
        **plan,
        "mode": active.get("mode", "default"),
        "background": active.get("background", ""),
        "points": active.get("points") or [],
        "active_site": active,
        "all_points": all_points,
        "camera_count": len(all_points),
    }


def _floor_plan_points(floor_plan: dict | None) -> list[dict]:
    plan = floor_plan or {}
    if plan.get("all_points"):
        return plan["all_points"]
    return plan.get("points") or []

pwd = CryptContext(schemes=["pbkdf2_sha256"], deprecated="auto")
MODULES = ["isg", "sayim", "urun", "mes", "genel"]


def _as_utc(dt: datetime | None) -> datetime:
    """SQLite bazen timezone'suz datetime döndürür."""
    if dt is None:
        return datetime.now(timezone.utc)
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc)


def _session() -> Session:
    return SessionLocal()


def hash_password(p: str) -> str:
    return pwd.hash(p)


def verify_password(plain: str, hashed: str) -> bool:
    return pwd.verify(plain, hashed)


def _cams(n: int, prefix: str):
    return build_facility_cameras(prefix, min(n, 12))


SEED_USERS = [
    {"id": "u-admin", "kullanici_adi": "admin", "ad": "Derebaşı", "email": "admin@vislivis.com", "sifre": "admin", "rol": "admin", "kurulum": "", "kameralar": []},
    {"id": "u-isg", "kullanici_adi": "isg", "ad": "Ayşe İSG", "email": "isg@vislivis.com", "sifre": "demo", "rol": "isg", "kurulum": "Boyner İstinye Park", "kameralar": _cams(8, "isg")},
    {"id": "u-operator", "kullanici_adi": "operator", "ad": "Mehmet Operatör", "email": "operator@vislivis.com", "sifre": "demo", "rol": "operator", "kurulum": "Boyner İstinye Park", "kameralar": _cams(6, "operator")},
    {"id": "u-mudur", "kullanici_adi": "mudur", "ad": "Can Müdür", "email": "mudur@vislivis.com", "sifre": "demo", "rol": "uretim_muduru", "kurulum": "Boyner İstinye Park", "kameralar": _cams(12, "mudur")},
    {"id": "u-demo", "kullanici_adi": "demo", "ad": "demo", "email": "demo@vislivis.com", "sifre": "demo", "rol": "user", "kurulum": "Boyner İstinye Park", "kameralar": _cams(12, "boyner")},
    {"id": "u-emilio", "kullanici_adi": "emilio", "ad": "emilio", "email": "emilio@vislivis.com", "sifre": "emilio", "rol": "user", "kurulum": "Emilio Demo Magaza", "kameralar": _cams(10, "emilio")},
    {
        "id": DEMO_USER_ID,
        "kullanici_adi": "demo",
        "ad": "Hype Demo",
        "email": DEMO_EMAIL,
        "sifre": DEMO_PASSWORD,
        "rol": "user",
        "kurulum": "Hype Vision Lab — Üretim Tesisi",
        "kameralar": _cams(12, "hype"),
    },
    {
        "id": ADMIN_USER_ID,
        "kullanici_adi": "admin",
        "ad": "Hype Admin",
        "email": ADMIN_EMAIL,
        "sifre": ADMIN_PASSWORD,
        "rol": "admin",
        "kurulum": "Hype Vision Lab",
        "kameralar": [],
    },
]


def user_public(u: UserModel, cameras: list | None = None) -> dict:
    floor_plan = get_floor_plan(u.id)
    points = _floor_plan_points(floor_plan)
    tracked = build_tracked_cameras(floor_plan)
    return {
        "id": u.id,
        "kullanici_adi": u.kullanici_adi,
        "ad": u.ad,
        "email": u.email,
        "rol": u.rol,
        "kurulum": u.kurulum or "",
        "kamera_sayisi": len(points),
        "kameralar": tracked,
        "moduller": modules_for_role(u.rol),
        "onboarding_done": bool(u.onboarding_done),
        "dashboard_layout": json.loads(u.dashboard_layout or "{}"),
    }


def seed_if_empty():
    init_db()
    with _session() as db:
        if db.query(UserModel).count() > 0:
            return
        for su in SEED_USERS:
            pw = su.pop("sifre")
            cams = su.pop("kameralar", [])
            user = UserModel(
                id=su["id"],
                kullanici_adi=su["kullanici_adi"],
                ad=su["ad"],
                email=su["email"].lower(),
                sifre_hash=hash_password(pw),
                rol=su["rol"],
                kurulum=su.get("kurulum", ""),
                onboarding_done=su["rol"] == "admin",
            )
            db.add(user)
            for c in cams:
                db.add(CameraModel(user_id=user.id, **c))
        panel_users = [u["id"] for u in SEED_USERS if u["id"] != "u-admin" and u.get("kameralar")]
        now = datetime.now(timezone.utc)
        for uid in ["u-admin", "u-demo", "u-mudur"]:
            db.merge(
                HeartbeatModel(
                    user_id=uid,
                    camera_id=None,
                    zaman=now,
                    ai_zaman=now,
                )
            )
        db.commit()
    ensure_demo_seed()
    ensure_admin_seed()
    ensure_all_panel_seeds()


def _seed_notifications(db: Session, uid: str) -> None:
    notif_count = db.query(NotificationModel).filter(NotificationModel.user_id == uid).count()
    yangin_count = (
        db.query(NotificationModel)
        .filter(NotificationModel.user_id == uid, NotificationModel.kategori == "Yangın")
        .count()
    )
    if notif_count < MIN_PANEL_NOTIFICATIONS or yangin_count < 5:
        db.query(NotificationModel).filter(NotificationModel.user_id == uid).delete()
        for n in build_panel_notifications(uid, 90):
            db.add(
                NotificationModel(
                    user_id=uid,
                    tarih=n["tarih"],
                    zaman=n["zaman"],
                    kamera=n["kamera"],
                    kategori=n["kategori"],
                    baslik=n["baslik"],
                    detay=n["detay"],
                    seviye=n["seviye"],
                    modul=n["modul"],
                    gorsel=n.get("gorsel", ""),
                    okundu=n.get("okundu", False),
                )
            )


def ensure_admin_seed():
    """admin@hypevisionlab.com — yönetici (mevcut DB'de yoksa eklenir)."""
    init_db()
    with _session() as db:
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
        elif user.rol != "admin":
            user.rol = "admin"
        _seed_notifications(db, ADMIN_USER_ID)
        now = datetime.now(timezone.utc)
        db.merge(
            HeartbeatModel(
                user_id=ADMIN_USER_ID,
                camera_id=None,
                zaman=now,
                ai_zaman=now,
            )
        )
        db.commit()


def ensure_panel_seed_for_user(uid: str):
    """90 günlük KPI + bildirim + tesis kameraları (yalnızca demo hesaplar)."""
    if uid not in PANEL_DEMO_USER_IDS:
        return
    init_db()
    with _session() as db:
        user = db.query(UserModel).filter(UserModel.id == uid).first()
        if not user or user.rol == "admin":
            return

        metric_count = db.query(DailyMetricModel).filter(DailyMetricModel.user_id == uid).count()
        if metric_count < 80:
            db.query(DailyMetricModel).filter(DailyMetricModel.user_id == uid).delete()
            for tarih in date_range(90):
                k = kpi_for_date(tarih)
                db.add(
                    DailyMetricModel(
                        user_id=uid,
                        tarih=tarih,
                        urun_toplam=k["urun_toplam"],
                        verimlilik=str(k["verimlilik"]),
                        isg_ihlal=k["isg_ihlal"],
                        personel_aktif=k["personel_aktif"],
                        bildirim_sayisi=k["bildirim_sayisi"],
                        log_sayisi=k["log_sayisi"],
                    )
                )

        notif_count = db.query(NotificationModel).filter(NotificationModel.user_id == uid).count()
        yangin_count = (
            db.query(NotificationModel)
            .filter(NotificationModel.user_id == uid, NotificationModel.kategori == "Yangın")
            .count()
        )
        if notif_count < MIN_PANEL_NOTIFICATIONS or yangin_count < 5:
            _seed_notifications(db, uid)

        cam_count = db.query(CameraModel).filter(CameraModel.user_id == uid).count()
        generic = db.query(CameraModel).filter(CameraModel.user_id == uid, CameraModel.ad.like("%Kamera %")).count()
        if cam_count < 8 or generic > 0:
            db.query(CameraModel).filter(CameraModel.user_id == uid).delete()
            prefix = user.kullanici_adi or "hype"
            for c in build_facility_cameras(prefix, 12):
                db.add(CameraModel(user_id=uid, **c))

        now = datetime.now(timezone.utc)
        db.merge(HeartbeatModel(user_id=uid, camera_id=None, zaman=now, ai_zaman=now))
        db.commit()


def ensure_all_panel_seeds():
    """Önceden tanımlı demo hesaplara örnek veri yükle."""
    init_db()
    with _session() as db:
        targets = [
            u.id
            for u in db.query(UserModel).filter(UserModel.id.in_(PANEL_DEMO_USER_IDS)).all()
        ]
    for uid in targets:
        ensure_panel_seed_for_user(uid)


def ensure_demo_seed():
    """demo@hypevisionlab.com — 90 günlük sabit KPI + bildirim."""
    init_db()
    with _session() as db:
        user = db.query(UserModel).filter(UserModel.email == DEMO_EMAIL.lower()).first()
        if not user:
            raw = next((x for x in SEED_USERS if x["id"] == DEMO_USER_ID), None)
            if not raw:
                return
            su = {**raw, "kameralar": list(raw.get("kameralar", []))}
            pw = su.pop("sifre")
            cams = su.pop("kameralar", [])
            user = UserModel(
                id=su["id"],
                kullanici_adi=su["kullanici_adi"],
                ad=su["ad"],
                email=su["email"].lower(),
                sifre_hash=hash_password(pw),
                rol=su["rol"],
                kurulum=su.get("kurulum", ""),
            )
            db.add(user)
            for c in cams:
                db.add(CameraModel(user_id=user.id, **c))
            db.commit()
        else:
            user.sifre_hash = hash_password(DEMO_PASSWORD)
            db.commit()
    ensure_panel_seed_for_user(DEMO_USER_ID)


def find_user_by_email(email: str) -> UserModel | None:
    with _session() as db:
        return (
            db.query(UserModel)
            .options(joinedload(UserModel.cameras))
            .filter(UserModel.email == email.strip().lower())
            .first()
        )


def find_user_by_login(login: str) -> UserModel | None:
    """E-posta veya kullanıcı adı ile kullanıcı bul (@kelebekmobilya veya kelebekmobilya)."""
    raw = (login or "").strip()
    if not raw:
        return None
    if "@" in raw:
        local, _, domain = raw.partition("@")
        if domain and "." in domain:
            return find_user_by_email(raw)
        username = (domain or local).lstrip("@").lower()
    else:
        username = raw.lower()
    if not username:
        return None
    with _session() as db:
        return (
            db.query(UserModel)
            .options(joinedload(UserModel.cameras))
            .filter(UserModel.kullanici_adi.ilike(username))
            .first()
        )


def find_user_by_id(uid: str) -> UserModel | None:
    with _session() as db:
        return (
            db.query(UserModel)
            .options(joinedload(UserModel.cameras))
            .filter(UserModel.id == uid)
            .first()
        )


def list_users() -> list[UserModel]:
    with _session() as db:
        return db.query(UserModel).options(joinedload(UserModel.cameras)).order_by(UserModel.ad).all()


def create_user(data: dict) -> UserModel:
    with _session() as db:
        user = UserModel(
            id=f"u-{uuid.uuid4().hex[:8]}",
            kullanici_adi=data["kullanici_adi"],
            ad=data["ad"],
            email=data["email"].lower(),
            sifre_hash=hash_password(data["sifre"]),
            rol=data.get("rol", "user"),
            kurulum=data.get("kurulum", "") or "Demo Tesis",
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        return user


def update_user_layout(uid: str, layout: dict, onboarding_done: bool | None = None):
    with _session() as db:
        u = db.query(UserModel).filter(UserModel.id == uid).first()
        if not u:
            return
        u.dashboard_layout = json.dumps(layout)
        if onboarding_done is not None:
            u.onboarding_done = onboarding_done
        db.commit()


def record_heartbeat(user_id: str, camera_id: str | None = None, *, ai_server: bool = False):
    now = datetime.now(timezone.utc)
    with _session() as db:
        hb = db.query(HeartbeatModel).filter(HeartbeatModel.user_id == user_id).first()
        if hb:
            hb.zaman = now
            hb.camera_id = camera_id
            if ai_server:
                hb.ai_zaman = now
        else:
            db.add(
                HeartbeatModel(
                    user_id=user_id,
                    camera_id=camera_id,
                    zaman=now,
                    ai_zaman=now if ai_server else None,
                )
            )
        db.commit()


def heartbeat_active(user_id: str, max_seconds: int | None = None) -> bool:
    limit = max_seconds if max_seconds is not None else HEARTBEAT_MAX_SECONDS
    with _session() as db:
        hb = db.query(HeartbeatModel).filter(HeartbeatModel.user_id == user_id).first()
        if not hb or not hb.ai_zaman:
            return False
        return (datetime.now(timezone.utc) - _as_utc(hb.ai_zaman)).total_seconds() < limit


def get_last_heartbeat(user_id: str) -> dict:
    with _session() as db:
        hb = db.query(HeartbeatModel).filter(HeartbeatModel.user_id == user_id).first()
        if not hb:
            return {"zaman": None, "ai_zaman": None}
        return {
            "zaman": hb.zaman.isoformat() if hb.zaman else None,
            "ai_zaman": hb.ai_zaman.isoformat() if hb.ai_zaman else None,
        }


def get_integration_status(user_id: str, base_url: str = "http://127.0.0.1:8000") -> dict:
    hb = get_last_heartbeat(user_id)
    with _session() as db:
        has_api_key = (
            db.query(ApiKeyModel)
            .filter(ApiKeyModel.user_id == user_id, ApiKeyModel.active.is_(True))
            .count()
            > 0
        )
        key_count = (
            db.query(ApiKeyModel)
            .filter(ApiKeyModel.user_id == user_id, ApiKeyModel.active.is_(True))
            .count()
        )
    ai_ok = heartbeat_active(user_id)
    return {
        "has_api_key": has_api_key,
        "api_key_count": key_count,
        "ai_aktif": ai_ok,
        "last_heartbeat": hb.get("ai_zaman"),
        "last_activity": hb.get("zaman"),
        "heartbeat_max_seconds": HEARTBEAT_MAX_SECONDS,
        "endpoints": {
            "health": f"{base_url}/api/v1/integrations/health",
            "heartbeat": f"{base_url}/api/v1/integrations/heartbeat",
            "notification": f"{base_url}/api/v1/integrations/notification",
            "detect_upload": f"{base_url}/api/v1/integrations/notification/detect/upload",
        },
    }


def _notif_to_dict(r: NotificationModel) -> dict:
    import json

    meta = {}
    try:
        meta = json.loads(r.meta_json or "{}")
    except json.JSONDecodeError:
        meta = {}
    return {
        "id": r.id,
        "user_id": r.user_id,
        "tarih": r.tarih,
        "zaman": r.zaman,
        "kamera": r.kamera,
        "kategori": r.kategori,
        "baslik": r.baslik,
        "detay": r.detay,
        "seviye": r.seviye,
        "modul": r.modul,
        "gorsel": r.gorsel,
        "okundu": r.okundu,
        "meta": meta,
        "feedback": r.feedback,
    }


def list_notifications(user_id: str | None = None) -> list[dict]:
    with _session() as db:
        q = db.query(NotificationModel).order_by(NotificationModel.tarih.desc(), NotificationModel.zaman.desc())
        if user_id:
            q = q.filter((NotificationModel.user_id == user_id) | (NotificationModel.user_id.is_(None)))
        rows = q.all()
        return [_notif_to_dict(r) for r in rows]


def get_notification(notification_id: int, user_id: str) -> dict | None:
    with _session() as db:
        row = (
            db.query(NotificationModel)
            .filter(
                NotificationModel.id == notification_id,
                (NotificationModel.user_id == user_id) | (NotificationModel.user_id.is_(None)),
            )
            .first()
        )
        return _notif_to_dict(row) if row else None


def count_unread(user_id: str) -> int:
    with _session() as db:
        return (
            db.query(NotificationModel)
            .filter(
                (NotificationModel.user_id == user_id) | (NotificationModel.user_id.is_(None)),
                NotificationModel.okundu.is_(False),
            )
            .count()
        )


def mark_notification_read(notification_id: int, user_id: str) -> dict | None:
    with _session() as db:
        row = (
            db.query(NotificationModel)
            .filter(
                NotificationModel.id == notification_id,
                (NotificationModel.user_id == user_id) | (NotificationModel.user_id.is_(None)),
            )
            .first()
        )
        if not row:
            return None
        row.okundu = True
        db.commit()
        db.refresh(row)
        return _notif_to_dict(row)


def mark_all_notifications_read(user_id: str) -> int:
    with _session() as db:
        q = db.query(NotificationModel).filter(
            (NotificationModel.user_id == user_id) | (NotificationModel.user_id.is_(None)),
            NotificationModel.okundu.is_(False),
        )
        count = q.count()
        q.update({NotificationModel.okundu: True}, synchronize_session=False)
        db.commit()
        return count


def add_notification(item: dict) -> dict:
    with _session() as db:
        row = NotificationModel(
            user_id=item.get("user_id"),
            tarih=item["tarih"],
            zaman=item["zaman"],
            kamera=item.get("kamera", ""),
            kategori=item.get("kategori", ""),
            baslik=item["baslik"],
            detay=item.get("detay", ""),
            seviye=item.get("seviye", "bilgi"),
            modul=item.get("modul", ""),
            gorsel=item.get("gorsel", ""),
            okundu=item.get("okundu", False),
            meta_json=item.get("meta_json", "{}"),
            feedback=item.get("feedback"),
        )
        db.add(row)
        db.commit()
        db.refresh(row)
        return _notif_to_dict(row)


def set_notification_feedback(notification_id: int, user_id: str, label: str) -> dict | None:
    from services.training_feedback import save_training_sample

    if label not in ("evet", "hayir"):
        return None
    with _session() as db:
        row = (
            db.query(NotificationModel)
            .filter(
                NotificationModel.id == notification_id,
                (NotificationModel.user_id == user_id) | (NotificationModel.user_id.is_(None)),
            )
            .first()
        )
        if not row:
            return None
        item = _notif_to_dict(row)
        save_training_sample(item, label)
        row.feedback = label
        row.okundu = True
        db.commit()
        db.refresh(row)
        return _notif_to_dict(row)


def get_cameras(user_id: str) -> list[dict]:
    with _session() as db:
        rows = db.query(CameraModel).filter(CameraModel.user_id == user_id).all()
        return [{"id": r.id, "ad": r.ad, "rtsp": r.rtsp, "modul": r.modul, "token": r.token} for r in rows]


def add_camera(user_id: str, data: dict) -> dict:
    cam = {"id": f"cam-{uuid.uuid4().hex[:6]}", **data}
    with _session() as db:
        db.add(CameraModel(user_id=user_id, **cam))
        db.commit()
    return cam


def update_camera(user_id: str, camera_id: str, data: dict) -> dict | None:
    with _session() as db:
        row = db.query(CameraModel).filter(CameraModel.user_id == user_id, CameraModel.id == camera_id).first()
        if not row:
            return None
        for k, v in data.items():
            setattr(row, k, v)
        db.commit()
        return {"id": row.id, "ad": row.ad, "rtsp": row.rtsp, "modul": row.modul, "token": row.token}


def delete_camera(user_id: str, camera_id: str):
    with _session() as db:
        db.query(CameraModel).filter(CameraModel.user_id == user_id, CameraModel.id == camera_id).delete()
        db.commit()


def change_password(user_id: str, new_hash: str):
    with _session() as db:
        u = db.query(UserModel).filter(UserModel.id == user_id).first()
        if u:
            u.sifre_hash = new_hash
            db.commit()


def reset_user_panel_data(user_id: str) -> str | None:
    """Bildirim ve KPI geçmişini temizle (kroki ve API anahtarları kalır)."""
    if user_id in PANEL_DEMO_USER_IDS or user_id == ADMIN_USER_ID:
        return "Demo veya admin hesaplar sıfırlanamaz"
    with _session() as db:
        u = db.query(UserModel).filter(UserModel.id == user_id).first()
        if not u:
            return "Kullanıcı bulunamadı"
        db.query(NotificationModel).filter(NotificationModel.user_id == user_id).delete()
        db.query(DailyMetricModel).filter(DailyMetricModel.user_id == user_id).delete()
        db.query(CameraModel).filter(CameraModel.user_id == user_id).delete()
        db.commit()
    return None


def delete_user(user_id: str) -> str | None:
    """None = ok, string = hata mesajı."""
    if user_id in ("u-admin",):
        return "Ana yönetici silinemez"
    with _session() as db:
        u = db.query(UserModel).filter(UserModel.id == user_id).first()
        if not u:
            return "Kullanıcı bulunamadı"
        db.query(NotificationModel).filter(NotificationModel.user_id == user_id).delete()
        db.query(DailyMetricModel).filter(DailyMetricModel.user_id == user_id).delete()
        db.query(CameraModel).filter(CameraModel.user_id == user_id).delete()
        db.query(HeartbeatModel).filter(HeartbeatModel.user_id == user_id).delete()
        db.query(ApiKeyModel).filter(ApiKeyModel.user_id == user_id).delete()
        db.query(FloorPlanModel).filter(FloorPlanModel.user_id == user_id).delete()
        db.delete(u)
        db.commit()
    return None


def get_daily_metric(user_id: str, tarih: str) -> dict | None:
    with _session() as db:
        row = (
            db.query(DailyMetricModel)
            .filter(DailyMetricModel.user_id == user_id, DailyMetricModel.tarih == tarih)
            .first()
        )
        if not row:
            return None
        return {
            "tarih": row.tarih,
            "urun_toplam": row.urun_toplam,
            "verimlilik": float(row.verimlilik),
            "isg_ihlal": row.isg_ihlal,
            "personel_aktif": row.personel_aktif,
            "bildirim_sayisi": row.bildirim_sayisi,
            "log_sayisi": row.log_sayisi,
        }


def notifications_for_date(user_id: str, tarih: str) -> list[dict]:
    return [n for n in list_notifications(user_id) if n.get("tarih") == tarih]


def build_traffic_from_notifications(notifications: list[dict]) -> list[dict]:
    if not notifications:
        return []
    buckets: dict[str, int] = {}
    for n in notifications:
        zaman = (n.get("zaman") or "00:00")[:2]
        buckets[zaman] = buckets.get(zaman, 0) + 1
    return [{"saat": f"{h}:00", "kisi": c} for h, c in sorted(buckets.items())]


def dashboard_summary_for_user(user_id: str, floor_plan: dict | None, tarih: str) -> dict:
    points = _floor_plan_points(floor_plan)
    cam_total = len(points)

    today_notifs = notifications_for_date(user_id, tarih)
    unread_today = [n for n in today_notifs if not n.get("okundu")]
    isg_bugun = len(
        [
            n
            for n in today_notifs
            if n.get("seviye") in ("kritik", "uyari")
            or n.get("kategori") in ("İSG", "Yangın", "Duman", "Yasak Bölge", "Düşme")
        ]
    )

    k = get_daily_metric(user_id, tarih)
    verim = float(k["verimlilik"]) if k else None

    if cam_total > 0:
        kameralar = {
            "aktif": cam_total,
            "toplam": cam_total,
            "degisim": f"{cam_total} aktif kamera",
        }
    else:
        kameralar = {"aktif": 0, "toplam": 0, "degisim": "Henüz kamera eklenmedi"}

    if verim is not None:
        verim_alt = "Optimum düzeyde" if verim >= 85 else "İzleniyor"
    else:
        verim_alt = "Veri yok"

    urun_toplam = k["urun_toplam"] if k else 0

    return {
        "kameralar": kameralar,
        "isg_ihlaller": {
            "bugun": isg_bugun,
            "alt_metin": "Bugünkü ihlal" if isg_bugun else "İhlal yok",
        },
        "hat_verimlilik": {
            "ortalama": round(verim) if verim is not None else None,
            "alt_metin": verim_alt,
        },
        "urun_sayim_bugun": {"toplam": urun_toplam, "degisim": "Bugün" if urun_toplam else "Veri yok"},
        "aktif_personel": {
            "sayi": k["personel_aktif"] if k else 0,
            "degisim": "Bugün" if k else "Veri yok",
        },
        "ai_sunucu": "aktif" if heartbeat_active(user_id) else "pasif",
        "sistem_yuku": 0,
        "bildirim_sayisi": len(unread_today),
        "bildirim_toplam_bugun": len(today_notifs),
    }


MODULE_TRACKING_RULES = {
    "isg": ["hard_hat", "gloves", "ppe_zone", "restricted"],
    "sayim": ["person_count", "product_count"],
    "urun": ["product_count", "vehicle"],
    "mes": ["person_count", "line_efficiency"],
    "genel": ["person_count", "hard_hat"],
}

TRACKING_RULE_LABELS = {
    "hard_hat": {"labelTr": "Baret", "labelEn": "Hard hat"},
    "gloves": {"labelTr": "Eldiven", "labelEn": "Gloves"},
    "speed_limit": {"labelTr": "Hız limiti", "labelEn": "Speed limit"},
    "ppe_zone": {"labelTr": "KKD bölgesi", "labelEn": "PPE zone"},
    "person_count": {"labelTr": "Kişi sayımı", "labelEn": "Headcount"},
    "product_count": {"labelTr": "Ürün sayımı", "labelEn": "Product count"},
    "restricted": {"labelTr": "Yasak bölge", "labelEn": "Restricted zone"},
    "vehicle": {"labelTr": "Araç takibi", "labelEn": "Vehicle track"},
    "line_efficiency": {"labelTr": "Hat verimi", "labelEn": "Line efficiency"},
}


def build_tracked_cameras(floor_plan: dict | None) -> list[dict]:
    plan = floor_plan or {}
    sites = plan.get("sites") or []
    if not sites and plan.get("points"):
        sites = [{"id": "legacy", "name": "Ana Tesis", "points": plan.get("points") or []}]
    out = []
    for site in sites:
        for i, p in enumerate(site.get("points") or []):
            modules = p.get("modules") or ["genel"]
            rule_ids: list[str] = []
            for mod in modules:
                rule_ids.extend(MODULE_TRACKING_RULES.get(mod, MODULE_TRACKING_RULES["genel"]))
            seen: set[str] = set()
            rules = []
            for rid in rule_ids:
                if rid in seen or rid not in TRACKING_RULE_LABELS:
                    continue
                seen.add(rid)
                rules.append({"id": rid, **TRACKING_RULE_LABELS[rid]})
            site_name = site.get("name") or "Kroki"
            out.append({
                "id": p.get("id") or f"pt-{site.get('id', 'x')}-{i}",
                "ad": p.get("tag") or p.get("label") or f"Kamera {i + 1}",
                "modules": modules,
                "rules": rules,
                "konum": site_name,
                "site_id": site.get("id"),
                "site_name": site_name,
            })
    return out


def build_system_health(user_id: str, floor_plan: dict | None, today: str) -> dict:
    all_points = _floor_plan_points(floor_plan)
    cam_total = len(all_points)
    ai_ok = heartbeat_active(user_id)
    today_notifs = notifications_for_date(user_id, today)
    unread_today = [n for n in today_notifs if not n.get("okundu")]
    hb = get_last_heartbeat(user_id)
    mins = HEARTBEAT_MAX_SECONDS // 60

    with _session() as db:
        has_api_key = (
            db.query(ApiKeyModel)
            .filter(ApiKeyModel.user_id == user_id, ApiKeyModel.active.is_(True))
            .count()
            > 0
        )

    flow_ok = ai_ok or len(today_notifs) > 0
    if not flow_ok and cam_total == 0 and not has_api_key:
        flow_status, flow_detail = "inactive", "Kurulmadı"
    elif flow_ok:
        flow_status, flow_detail = "ok", "Aktif akış"
    else:
        flow_status, flow_detail = "warn", "Veri bekleniyor"

    if not has_api_key:
        notif_status, notif_detail = "inactive", "API anahtarı yok"
    elif len(unread_today) >= 30:
        notif_status, notif_detail = "warn", "Yoğun"
    else:
        notif_status, notif_detail = "ok", "Bağlı"

    if cam_total == 0:
        cam_status, cam_detail = "inactive", "0/0"
        cam_aktif = 0
    else:
        cam_aktif = cam_total
        cam_status, cam_detail = "ok", f"{cam_aktif}/{cam_total} çevrimiçi"

    ai_detail_tr = "Çalışıyor" if ai_ok else "Beklemede"
    ai_detail_en = "Running" if ai_ok else "Waiting"
    if not ai_ok and not has_api_key and cam_total == 0:
        ai_hint_tr = "Kurulum tamamlanmadı — API anahtarı ve kroki gerekli"
        ai_hint_en = "Setup incomplete — API key and floor plan required"
    elif not ai_ok:
        ai_hint_tr = f"AI sunucu son {mins} dk içinde sinyal göndermedi"
        ai_hint_en = f"AI server sent no signal in the last {mins} min"
    else:
        ai_hint_tr = ""
        ai_hint_en = ""

    checks = [
        {
            "id": "ai",
            "labelTr": "AI Sunucu",
            "labelEn": "AI Server",
            "status": "ok" if ai_ok else ("inactive" if cam_total == 0 and not has_api_key else "warn"),
            "detailTr": ai_detail_tr,
            "detailEn": ai_detail_en,
            "hintTr": ai_hint_tr,
            "hintEn": ai_hint_en,
        },
        {
            "id": "flow",
            "labelTr": "Veri Akışı",
            "labelEn": "Data Pipeline",
            "status": flow_status,
            "detailTr": flow_detail,
            "detailEn": {"Kurulmadı": "Not configured", "Aktif akış": "Streaming", "Veri bekleniyor": "Awaiting data"}.get(flow_detail, flow_detail),
            "hintTr": "Entegrasyon henüz veri göndermedi" if flow_status == "warn" else "",
            "hintEn": "Integration has not sent data yet" if flow_status == "warn" else "",
        },
        {
            "id": "notif",
            "labelTr": "Bildirim Kanalı",
            "labelEn": "Notification Channel",
            "status": notif_status,
            "detailTr": notif_detail,
            "detailEn": {"API anahtarı yok": "No API key", "Yoğun": "High load", "Bağlı": "Connected"}.get(notif_detail, notif_detail),
            "hintTr": "Admin panelden API anahtarı oluşturulmalı" if notif_status == "inactive" else "",
            "hintEn": "Create an API key in admin panel" if notif_status == "inactive" else "",
        },
        {
            "id": "cam",
            "labelTr": "Kamera Ağı",
            "labelEn": "Camera Network",
            "status": cam_status,
            "detailTr": cam_detail if cam_total else "Henüz kamera yok",
            "detailEn": f"{cam_aktif}/{cam_total} online" if cam_total else "No cameras yet",
            "hintTr": "Kroki editöründen kamera noktası ekleyin" if cam_total == 0 else "",
            "hintEn": "Add camera points in floor plan editor" if cam_total == 0 else "",
        },
    ]

    statuses = [c["status"] for c in checks]
    hints_tr = [c["hintTr"] for c in checks if c.get("hintTr")]
    hints_en = [c["hintEn"] for c in checks if c.get("hintEn")]
    if any(s == "fail" for s in statuses):
        overall = "fail"
        overallTr, overallEn = "Müdahale gerekli", "Attention required"
    elif all(s == "inactive" for s in statuses):
        overall = "inactive"
        overallTr, overallEn = "Kurulum bekleniyor", "Setup pending"
    elif any(s in ("warn", "inactive") for s in statuses):
        overall = "warn"
        overallTr, overallEn = "Küçük sorunlar", "Minor issues"
    else:
        overall = "ok"
        overallTr, overallEn = "Tümü İyi", "All Good"

    return {
        "overall": overall,
        "overallTr": overallTr,
        "overallEn": overallEn,
        "overallHintTr": " · ".join(hints_tr) if hints_tr else "",
        "overallHintEn": " · ".join(hints_en) if hints_en else "",
        "checks": checks,
        "cameras": {"aktif": cam_aktif, "toplam": cam_total},
        "ai_aktif": ai_ok,
        "has_api_key": has_api_key,
        "last_heartbeat": hb.get("ai_zaman"),
        "heartbeat_max_seconds": HEARTBEAT_MAX_SECONDS,
    }


def build_notification_insights(user_id: str, tarih: str) -> dict:
    notifs = notifications_for_date(user_id, tarih)
    floor_plan = get_floor_plan(user_id)
    points = floor_plan.get("points") or []

    by_sev = {"kritik": 0, "uyari": 0, "bilgi": 0}
    by_kat: dict[str, int] = {}
    by_cam: dict[str, int] = {}
    guven_vals: list[float] = []
    feedback_evet = 0
    feedback_hayir = 0

    for n in notifs:
        sev = n.get("seviye") or "bilgi"
        if sev in by_sev:
            by_sev[sev] += 1
        kat = n.get("kategori") or "Sistem"
        by_kat[kat] = by_kat.get(kat, 0) + 1
        cam = (n.get("kamera") or "").strip() or "—"
        by_cam[cam] = by_cam.get(cam, 0) + 1
        g = (n.get("meta") or {}).get("guven")
        if g is not None:
            try:
                guven_vals.append(float(g))
            except (TypeError, ValueError):
                pass
        fb = n.get("feedback")
        if fb == "evet":
            feedback_evet += 1
        elif fb == "hayir":
            feedback_hayir += 1

    unread = len([n for n in notifs if not n.get("okundu")])
    ort_guven = round(sum(guven_vals) / len(guven_vals) * 100, 1) if guven_vals else None
    top_cams = sorted(by_cam.items(), key=lambda x: -x[1])[:8]
    top_cats = sorted(by_kat.items(), key=lambda x: -x[1])
    now_iso = datetime.now(timezone.utc).isoformat()

    kpi = {
        "toplam": len(notifs),
        "okunmamis": unread,
        "kritik": by_sev["kritik"],
        "uyari": by_sev["uyari"],
        "bilgi": by_sev["bilgi"],
        "kategoriler": [{"kategori": k, "adet": v} for k, v in top_cats],
        "kameralar": [{"kamera": k, "adet": v} for k, v in top_cams],
        "ortalama_guven": ort_guven,
        "feedback_evet": feedback_evet,
        "feedback_hayir": feedback_hayir,
        "kroki_kamera": len(points),
    }

    if not notifs:
        return {
            "tarih": tarih,
            "kpi": kpi,
            "llm_insights": [
                {
                    "id": "empty",
                    "type": "info",
                    "titleTr": "Henüz bildirim yok",
                    "titleEn": "No notifications yet",
                    "bodyTr": f"{tarih} tarihinde kayıtlı bildirim yok. Krokiye kamera ekleyip API ile olay gönderdiğinizde KPI ve AI yorumları burada görünecek.",
                    "bodyEn": f"No notifications for {tarih}. Add floor-plan cameras and send events via API to see KPIs and AI insights.",
                    "confidence": None,
                    "generated_at": now_iso,
                }
            ],
        }

    top_cam = top_cams[0][0] if top_cams else "—"
    top_cat = top_cats[0][0] if top_cats else "—"
    insights: list[dict] = [
        {
            "id": "daily-summary",
            "type": "summary",
            "titleTr": "Günlük özet",
            "titleEn": "Daily summary",
            "bodyTr": (
                f"Bugün toplam {kpi['toplam']} bildirim alındı. "
                f"{kpi['kritik']} kritik, {kpi['uyari']} uyarı, {kpi['bilgi']} bilgi seviyesinde. "
                f"En sık kategori: {top_cat}."
            ),
            "bodyEn": (
                f"Today {kpi['toplam']} notifications received — "
                f"{kpi['kritik']} critical, {kpi['uyari']} warnings, {kpi['bilgi']} info. "
                f"Top category: {top_cat}."
            ),
            "confidence": 0.91,
            "generated_at": now_iso,
        },
    ]

    if kpi["kritik"] > 0:
        insights.append({
            "id": "risk",
            "type": "risk",
            "titleTr": "Risk değerlendirmesi",
            "titleEn": "Risk assessment",
            "bodyTr": (
                f"{kpi['kritik']} kritik olay tespit edildi. "
                "Öncelikle bu kameraların canlı akışı ve saha müdahalesi kontrol edilmeli."
            ),
            "bodyEn": (
                f"{kpi['kritik']} critical events detected. "
                "Prioritize live review and on-site response for affected cameras."
            ),
            "confidence": 0.88,
            "generated_at": now_iso,
        })

    if top_cam != "—":
        insights.append({
            "id": "camera-focus",
            "type": "camera",
            "titleTr": "Kamera odağı",
            "titleEn": "Camera focus",
            "bodyTr": (
                f"En yoğun kamera: {top_cam} ({top_cams[0][1]} bildirim). "
                "Bu noktada modül kurallarını ve eşik değerlerini gözden geçirin."
            ),
            "bodyEn": (
                f"Busiest camera: {top_cam} ({top_cams[0][1]} alerts). "
                "Review module rules and thresholds for this point."
            ),
            "confidence": 0.85,
            "generated_at": now_iso,
        })

    if ort_guven is not None:
        insights.append({
            "id": "accuracy",
            "type": "quality",
            "titleTr": "Model güveni",
            "titleEn": "Model confidence",
            "bodyTr": (
                f"Ortalama algılama güveni %{ort_guven}. "
                + ("Yüksek güven — otomatik aksiyon güvenle tetiklenebilir." if ort_guven >= 80 else "Düşük/orta güven — manuel doğrulama önerilir.")
            ),
            "bodyEn": (
                f"Average detection confidence {ort_guven}%. "
                + ("High confidence — automated actions are reliable." if ort_guven >= 80 else "Moderate/low confidence — manual verification recommended.")
            ),
            "confidence": 0.87,
            "generated_at": now_iso,
        })

    if feedback_evet + feedback_hayir > 0:
        rate = round(feedback_evet / (feedback_evet + feedback_hayir) * 100)
        insights.append({
            "id": "feedback",
            "type": "learning",
            "titleTr": "Operatör geri bildirimi",
            "titleEn": "Operator feedback",
            "bodyTr": f"Eğitim verisi: {feedback_evet} doğru, {feedback_hayir} yanlış (%{rate} onay). Model iyileştirmesi için kullanılabilir.",
            "bodyEn": f"Training feedback: {feedback_evet} correct, {feedback_hayir} incorrect ({rate}% approval). Useful for model tuning.",
            "confidence": 0.9,
            "generated_at": now_iso,
        })

    insights.append({
        "id": "action",
        "type": "action",
        "titleTr": "Önerilen aksiyon",
        "titleEn": "Recommended action",
        "bodyTr": (
            "Okunmamış kritik bildirimleri önceliklendirin. "
            + (f"Kroki üzerinde {len(points)} kamera izleniyor." if points else "Krokiye kamera ekleyerek saha haritasını tamamlayın.")
        ),
        "bodyEn": (
            "Prioritize unread critical alerts. "
            + (f"{len(points)} cameras tracked on floor plan." if points else "Complete the floor plan by adding camera points.")
        ),
        "confidence": 0.84,
        "generated_at": now_iso,
    })

    return {"tarih": tarih, "kpi": kpi, "llm_insights": insights}


def panel_notification_stats(user_id: str) -> list[dict]:
    return notification_stats_all(list_notifications(user_id))


def panel_detection_logs(user_id: str, fallback: list[dict]) -> list[dict]:
    notifs = list_notifications(user_id)
    if not notifs:
        return []
    return detection_logs_from_notifications(notifs, fallback)


def panel_product_counts(tarih: str):
    from mock_data import PRODUCT_BY_DATE

    payload = PRODUCT_BY_DATE.get(tarih) or product_for_date(tarih)
    return {"tarih": tarih, "dates": date_range(90), **payload}


def metrics_trend(user_id: str, days: int = 30) -> list[dict]:
    with _session() as db:
        rows = (
            db.query(DailyMetricModel)
            .filter(DailyMetricModel.user_id == user_id)
            .order_by(DailyMetricModel.tarih.desc())
            .limit(days)
            .all()
        )
        if rows:
            return [
                {
                    "tarih": r.tarih,
                    "urun_toplam": r.urun_toplam,
                    "verimlilik": float(r.verimlilik),
                    "bildirim_sayisi": r.bildirim_sayisi,
                }
                for r in reversed(rows)
            ]
    return []


def notification_stats_for_date(user_id: str, tarih: str) -> list[dict]:
    colors = {"İSG": "#ef4444", "Üretim": "#8b5cf6", "MES": "#34d399", "Kalite": "#38bdf8", "Sistem": "#94a3b8"}
    with _session() as db:
        rows = (
            db.query(NotificationModel)
            .filter(NotificationModel.user_id == user_id, NotificationModel.tarih == tarih)
            .all()
        )
    counts: dict[str, int] = {}
    for r in rows:
        counts[r.kategori] = counts.get(r.kategori, 0) + 1
    if not counts:
        return []
    return [{"kategori": k, "adet": v, "renk": colors.get(k, "#94a3b8")} for k, v in counts.items()]


def create_api_key(user_id: str, label: str = "") -> tuple[dict, str]:
    """API anahtarı oluşturur. Dönen tuple: (kayıt, ham_anahtar — yalnızca bir kez gösterilir)."""
    raw, key_hash, visible = generate_api_key()
    key_id = f"key-{uuid.uuid4().hex[:10]}"
    with _session() as db:
        row = ApiKeyModel(
            id=key_id,
            user_id=user_id,
            label=label or "Entegrasyon",
            key_hash=key_hash,
            key_prefix=visible,
            active=True,
        )
        db.add(row)
        db.commit()
        db.refresh(row)
        return {
            "id": row.id,
            "user_id": row.user_id,
            "label": row.label,
            "key_prefix": row.key_prefix,
            "active": row.active,
            "created_at": row.created_at.isoformat() if row.created_at else None,
        }, raw


def list_api_keys(user_id: str) -> list[dict]:
    with _session() as db:
        rows = (
            db.query(ApiKeyModel)
            .filter(ApiKeyModel.user_id == user_id)
            .order_by(ApiKeyModel.created_at.desc())
            .all()
        )
        return [
            {
                "id": r.id,
                "user_id": r.user_id,
                "label": r.label,
                "key_prefix": r.key_prefix,
                "active": r.active,
                "created_at": r.created_at.isoformat() if r.created_at else None,
                "last_used_at": r.last_used_at.isoformat() if r.last_used_at else None,
            }
            for r in rows
        ]


def revoke_api_key(key_id: str) -> bool:
    with _session() as db:
        row = db.query(ApiKeyModel).filter(ApiKeyModel.id == key_id).first()
        if not row:
            return False
        row.active = False
        db.commit()
        return True


def delete_api_key(key_id: str) -> bool:
    with _session() as db:
        deleted = db.query(ApiKeyModel).filter(ApiKeyModel.id == key_id).delete()
        db.commit()
        return deleted > 0


def resolve_api_key(raw_key: str) -> UserModel | None:
    """X-API-Key header ile kullanıcı çözümle."""
    if not raw_key or not raw_key.startswith("hv_live_"):
        return None
    with _session() as db:
        keys = db.query(ApiKeyModel).filter(ApiKeyModel.active.is_(True)).all()
        for k in keys:
            if verify_api_key(raw_key, k.key_hash):
                k.last_used_at = datetime.now(timezone.utc)
                db.commit()
                return db.query(UserModel).filter(UserModel.id == k.user_id).first()
    return None


def ensure_demo_api_key() -> str | None:
    """Demo kullanıcı için varsayılan entegrasyon anahtarı (yoksa oluşturur). Scriptler için."""
    with _session() as db:
        existing = (
            db.query(ApiKeyModel)
            .filter(ApiKeyModel.user_id == DEMO_USER_ID, ApiKeyModel.label == "Demo Entegrasyon")
            .first()
        )
        if existing:
            return None
    _, raw = create_api_key(DEMO_USER_ID, "Demo Entegrasyon")
    return raw


def get_floor_plan(user_id: str) -> dict:
    with _session() as db:
        row = db.query(FloorPlanModel).filter(FloorPlanModel.user_id == user_id).first()
        if not row:
            return _flatten_floor_plan(_normalize_floor_plan_raw(None))
        plan = _normalize_floor_plan_raw(row.points_json, row)
        result = _flatten_floor_plan(plan)
        result["updated_at"] = row.updated_at.isoformat() if row.updated_at else None
        return result


def save_floor_plan(user_id: str, data: dict) -> dict:
    with _session() as db:
        row = db.query(FloorPlanModel).filter(FloorPlanModel.user_id == user_id).first()
        if not row:
            row = FloorPlanModel(user_id=user_id)
            db.add(row)

        current = _normalize_floor_plan_raw(row.points_json, row)

        if "sites" in data:
            plan = {
                "sites": data.get("sites") or current["sites"],
                "active_site_id": data.get("active_site_id") or current["active_site_id"],
            }
        else:
            sites = [dict(s) for s in current["sites"]]
            aid = data.get("active_site_id") or current["active_site_id"]
            for i, site in enumerate(sites):
                if site.get("id") == aid:
                    sites[i] = {
                        **site,
                        "name": data.get("name", site.get("name", "Ana Tesis")),
                        "mode": data.get("mode", site.get("mode", "default")),
                        "background": data.get("background", site.get("background", "")) if "background" in data else site.get("background", ""),
                        "points": data.get("points", site.get("points") or []) if "points" in data else site.get("points") or [],
                    }
                    break
            plan = {"sites": sites, "active_site_id": aid}

        active = next((s for s in plan["sites"] if s.get("id") == plan["active_site_id"]), plan["sites"][0])
        row.mode = active.get("mode", "default") or "default"
        row.background = active.get("background", "") or ""
        row.points_json = json.dumps(plan, ensure_ascii=False)
        row.updated_at = datetime.now(timezone.utc)
        db.query(CameraModel).filter(CameraModel.user_id == user_id).delete()
        db.commit()
    return get_floor_plan(user_id)


def build_training_feedback_report(user_id: str, days: int = 7) -> dict:
    end = date.today()
    start = end - timedelta(days=max(1, days) - 1)
    start_iso = start.isoformat()
    end_iso = end.isoformat()

    with _session() as db:
        rows = (
            db.query(NotificationModel)
            .filter(
                NotificationModel.user_id == user_id,
                NotificationModel.feedback.isnot(None),
                NotificationModel.tarih >= start_iso,
                NotificationModel.tarih <= end_iso,
            )
            .order_by(NotificationModel.tarih.desc(), NotificationModel.zaman.desc())
            .all()
        )

    evet = hayir = 0
    by_day: dict[str, dict] = {}
    by_kategori: dict[str, dict] = {}
    samples: list[dict] = []

    for r in rows:
        item = _notif_to_dict(r)
        fb = item.get("feedback")
        if fb == "evet":
            evet += 1
        elif fb == "hayir":
            hayir += 1
        else:
            continue

        tarih = item.get("tarih") or start_iso
        if tarih not in by_day:
            by_day[tarih] = {"evet": 0, "hayir": 0}
        by_day[tarih][fb] += 1

        kat = item.get("kategori") or "Sistem"
        if kat not in by_kategori:
            by_kategori[kat] = {"evet": 0, "hayir": 0}
        by_kategori[kat][fb] += 1

        if len(samples) < 12:
            samples.append({
                "id": item["id"],
                "tarih": item.get("tarih"),
                "zaman": item.get("zaman"),
                "baslik": item.get("baslik"),
                "kamera": item.get("kamera"),
                "kategori": kat,
                "feedback": fb,
                "gorsel": item.get("gorsel"),
            })

    total = evet + hayir
    approval = round(evet / total * 100) if total else None
    daily = [
        {"tarih": d, "evet": by_day[d]["evet"], "hayir": by_day[d]["hayir"]}
        for d in sorted(by_day.keys(), reverse=True)
    ]
    categories = [
        {"kategori": k, "evet": v["evet"], "hayir": v["hayir"]}
        for k, v in sorted(by_kategori.items(), key=lambda x: -(x[1]["evet"] + x[1]["hayir"]))
    ]

    return {
        "days": days,
        "start": start_iso,
        "end": end_iso,
        "evet": evet,
        "hayir": hayir,
        "total": total,
        "approval_pct": approval,
        "daily": daily,
        "by_kategori": categories,
        "samples": samples,
        "has_data": total > 0,
    }

