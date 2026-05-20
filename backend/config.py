from __future__ import annotations

import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent

try:
    from dotenv import load_dotenv

    load_dotenv(BASE_DIR / ".env")
except ImportError:
    pass
DATA_DIR = BASE_DIR / "data"
DATA_DIR.mkdir(parents=True, exist_ok=True)

# Varsayılan: SQLite dosyası (kalıcı kullanıcı + bildirim)
DB_FILE = DATA_DIR / "hypevision.db"
DATABASE_URL = os.getenv("DATABASE_URL", f"sqlite:///{DB_FILE.as_posix()}")
USE_DB = True
DB_KIND = "postgresql" if DATABASE_URL.startswith("postgresql") else "sqlite"

JWT_SECRET = os.getenv("JWT_SECRET", "hypevision-demo-secret-change-in-prod")
PUBLIC_WS_INTERVAL = int(os.getenv("WS_PUSH_SECONDS", "8"))
