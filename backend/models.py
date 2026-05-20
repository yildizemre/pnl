from __future__ import annotations

import json
from datetime import datetime, timezone

from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, String, Text, create_engine
from sqlalchemy.orm import DeclarativeBase, relationship, sessionmaker

from config import DATABASE_URL


class Base(DeclarativeBase):
    pass


class UserModel(Base):
    __tablename__ = "users"

    id = Column(String(64), primary_key=True)
    kullanici_adi = Column(String(128), nullable=False)
    ad = Column(String(256), nullable=False)
    email = Column(String(256), unique=True, nullable=False, index=True)
    sifre_hash = Column(String(512), nullable=False)
    rol = Column(String(32), default="user")
    kurulum = Column(String(256), default="")
    dashboard_layout = Column(Text, default="{}")
    onboarding_done = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    cameras = relationship("CameraModel", back_populates="user", cascade="all, delete-orphan")
    notifications = relationship("NotificationModel", back_populates="user", cascade="all, delete-orphan")


class CameraModel(Base):
    __tablename__ = "cameras"

    id = Column(String(64), primary_key=True)
    user_id = Column(String(64), ForeignKey("users.id"), nullable=False, index=True)
    ad = Column(String(256), nullable=False)
    rtsp = Column(String(512), default="")
    modul = Column(String(64), default="genel")
    token = Column(String(256), default="")

    user = relationship("UserModel", back_populates="cameras")


class NotificationModel(Base):
    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(String(64), ForeignKey("users.id"), nullable=True, index=True)
    tarih = Column(String(16), nullable=False)
    zaman = Column(String(16), nullable=False)
    kamera = Column(String(256), default="")
    kategori = Column(String(64), default="")
    baslik = Column(String(512), nullable=False)
    detay = Column(Text, default="")
    seviye = Column(String(32), default="bilgi")
    modul = Column(String(128), default="")
    gorsel = Column(String(512), default="")
    okundu = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    user = relationship("UserModel", back_populates="notifications")


class HeartbeatModel(Base):
    __tablename__ = "heartbeats"

    user_id = Column(String(64), primary_key=True)
    camera_id = Column(String(64), nullable=True)
    zaman = Column(DateTime(timezone=True), nullable=False)


class DailyMetricModel(Base):
    __tablename__ = "daily_metrics"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(String(64), ForeignKey("users.id"), nullable=False, index=True)
    tarih = Column(String(16), nullable=False, index=True)
    urun_toplam = Column(Integer, default=0)
    verimlilik = Column(String(16), default="0")
    isg_ihlal = Column(Integer, default=0)
    personel_aktif = Column(Integer, default=0)
    bildirim_sayisi = Column(Integer, default=0)
    log_sayisi = Column(Integer, default=0)


_connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}
engine = create_engine(
    DATABASE_URL,
    connect_args=_connect_args,
    pool_pre_ping=not DATABASE_URL.startswith("sqlite"),
)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)


def init_db():
    Base.metadata.create_all(bind=engine)
