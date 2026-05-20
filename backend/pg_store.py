from __future__ import annotations

import json
import uuid
from datetime import datetime, timezone

from passlib.context import CryptContext
from sqlalchemy.orm import Session, joinedload, object_session

from models import CameraModel, DailyMetricModel, HeartbeatModel, NotificationModel, SessionLocal, UserModel, init_db
from roles import modules_for_role
from mock_data import NOTIFICATIONS
from demo_data import DEMO_EMAIL, DEMO_USER_ID, date_range, kpi_for_date, notification_for_day

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
    return [
        {
            "id": f"{prefix.lower()}-cam-{i}",
            "ad": f"{prefix} Kamera {i}",
            "rtsp": f"rtsp://192.168.1.{10 + i}:554/stream",
            "modul": MODULES[i % len(MODULES)],
            "token": f"tok_{prefix.lower()}_{i}",
        }
        for i in range(1, n + 1)
    ]


SEED_USERS = [
    {"id": "u-admin", "kullanici_adi": "admin", "ad": "Derebaşı", "email": "admin@vislivis.com", "sifre": "admin", "rol": "admin", "kurulum": "", "kameralar": []},
    {"id": "u-isg", "kullanici_adi": "isg", "ad": "Ayşe İSG", "email": "isg@vislivis.com", "sifre": "demo", "rol": "isg", "kurulum": "Boyner İstinye Park", "kameralar": _cams(4, "ISG")},
    {"id": "u-operator", "kullanici_adi": "operator", "ad": "Mehmet Operatör", "email": "operator@vislivis.com", "sifre": "demo", "rol": "operator", "kurulum": "Boyner İstinye Park", "kameralar": _cams(2, "Op")},
    {"id": "u-mudur", "kullanici_adi": "mudur", "ad": "Can Müdür", "email": "mudur@vislivis.com", "sifre": "demo", "rol": "uretim_muduru", "kurulum": "Boyner İstinye Park", "kameralar": _cams(6, "Uretim")},
    {"id": "u-demo", "kullanici_adi": "demo", "ad": "demo", "email": "demo@vislivis.com", "sifre": "demo", "rol": "user", "kurulum": "Boyner İstinye Park", "kameralar": _cams(8, "Boyner")},
    {"id": "u-emilio", "kullanici_adi": "emilio", "ad": "emilio", "email": "emilio@vislivis.com", "sifre": "emilio", "rol": "user", "kurulum": "Emilio Demo Magaza", "kameralar": _cams(8, "Emilio")},
    {
        "id": DEMO_USER_ID,
        "kullanici_adi": "demo",
        "ad": "Hype Demo",
        "email": DEMO_EMAIL,
        "sifre": "demo",
        "rol": "user",
        "kurulum": "Hype Vision Lab",
        "kameralar": _cams(6, "Hype"),
    },
]


def user_public(u: UserModel, cameras: list | None = None) -> dict:
    if cameras is not None:
        cams = cameras
    elif object_session(u) is not None:
        cams = [{"id": c.id, "ad": c.ad, "rtsp": c.rtsp, "modul": c.modul, "token": c.token} for c in u.cameras]
    else:
        cams = get_cameras(u.id)
    return {
        "id": u.id,
        "kullanici_adi": u.kullanici_adi,
        "ad": u.ad,
        "email": u.email,
        "rol": u.rol,
        "kurulum": u.kurulum or "",
        "kamera_sayisi": len(cams),
        "kameralar": cams,
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
        for n in NOTIFICATIONS[:8]:
            db.add(
                NotificationModel(
                    user_id="u-demo",
                    tarih=n["tarih"],
                    zaman=n["zaman"],
                    kamera=n["kamera"],
                    kategori=n["kategori"],
                    baslik=n["baslik"],
                    detay=n.get("detay", ""),
                    seviye=n["seviye"],
                    modul=n.get("modul", ""),
                    gorsel=n.get("gorsel", ""),
                    okundu=n.get("okundu", False),
                )
            )
        for uid in ["u-admin", "u-demo", "u-mudur"]:
            db.merge(
                HeartbeatModel(
                    user_id=uid,
                    camera_id=None,
                    zaman=datetime.now(timezone.utc),
                )
            )
        db.commit()
    ensure_demo_seed()


def ensure_demo_seed():
    """demo@hypevisionlab.com — 90 günlük sabit KPI + bildirim (mevcut DB'de de çalışır)."""
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
            db.refresh(user)

        uid = user.id
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
        if notif_count < 200:
            db.query(NotificationModel).filter(NotificationModel.user_id == uid).delete()
            nid = 1
            for tarih in date_range(90):
                rows, nid = notification_for_day(tarih, uid, nid)
                for n in rows:
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
        db.merge(HeartbeatModel(user_id=uid, camera_id=None, zaman=datetime.now(timezone.utc)))
        db.commit()


def find_user_by_email(email: str) -> UserModel | None:
    with _session() as db:
        return (
            db.query(UserModel)
            .options(joinedload(UserModel.cameras))
            .filter(UserModel.email == email.strip().lower())
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
            kurulum=data.get("kurulum", ""),
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        # Oturum içinde kameralar boş; detached hatası olmasın
        user.cameras = []
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


def record_heartbeat(user_id: str, camera_id: str | None = None):
    with _session() as db:
        db.merge(
            HeartbeatModel(
                user_id=user_id,
                camera_id=camera_id,
                zaman=datetime.now(timezone.utc),
            )
        )
        db.commit()


def heartbeat_active(user_id: str, max_seconds: int = 90) -> bool:
    with _session() as db:
        hb = db.query(HeartbeatModel).filter(HeartbeatModel.user_id == user_id).first()
        if not hb:
            return False
        return (datetime.now(timezone.utc) - _as_utc(hb.zaman)).total_seconds() < max_seconds


def list_notifications(user_id: str | None = None) -> list[dict]:
    with _session() as db:
        q = db.query(NotificationModel).order_by(NotificationModel.tarih.desc(), NotificationModel.zaman.desc())
        if user_id:
            q = q.filter((NotificationModel.user_id == user_id) | (NotificationModel.user_id.is_(None)))
        rows = q.all()
        return [
            {
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
            }
            for r in rows
        ]


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
        )
        db.add(row)
        db.commit()
        db.refresh(row)
        return {
            "id": row.id,
            "user_id": row.user_id,
            "tarih": row.tarih,
            "zaman": row.zaman,
            "kamera": row.kamera,
            "kategori": row.kategori,
            "baslik": row.baslik,
            "detay": row.detay,
            "seviye": row.seviye,
            "modul": row.modul,
            "gorsel": row.gorsel,
            "okundu": row.okundu,
        }


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
    out = []
    for tarih in reversed(date_range(days)):
        k = kpi_for_date(tarih)
        out.append(
            {
                "tarih": tarih,
                "urun_toplam": k["urun_toplam"],
                "verimlilik": k["verimlilik"],
                "bildirim_sayisi": k["bildirim_sayisi"],
            }
        )
    return out


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
        k = kpi_for_date(tarih)
        return [
            {"kategori": "İSG", "adet": k["isg_ihlal"], "renk": colors["İSG"]},
            {"kategori": "MES", "adet": max(1, k["bildirim_sayisi"] - k["isg_ihlal"]), "renk": colors["MES"]},
            {"kategori": "Üretim", "adet": 1, "renk": colors["Üretim"]},
        ]
    return [{"kategori": k, "adet": v, "renk": colors.get(k, "#94a3b8")} for k, v in counts.items()]
