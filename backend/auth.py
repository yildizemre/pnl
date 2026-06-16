from __future__ import annotations

from datetime import datetime, timedelta, timezone

from jose import JWTError, jwt

from config import JWT_SECRET

SECRET = JWT_SECRET
ALGORITHM = "HS256"
ACCESS_HOURS = 24


def create_token(user_id: str, email: str, rol: str, impersonator_id: str | None = None) -> str:
    payload = {
        "sub": user_id,
        "email": email,
        "rol": rol,
        "imp": impersonator_id,
        "exp": datetime.now(timezone.utc) + timedelta(hours=ACCESS_HOURS),
    }
    return jwt.encode(payload, SECRET, algorithm=ALGORITHM)


def decode_token(token: str) -> dict | None:
    try:
        return jwt.decode(token, SECRET, algorithms=[ALGORITHM])
    except JWTError:
        return None
