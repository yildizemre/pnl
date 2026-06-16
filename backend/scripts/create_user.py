#!/usr/bin/env python3
"""
Yeni kullanıcı oluşturur (admin JWT ile).

Kullanım:
  python scripts/create_user.py --email yeni@firma.com --password sifre123 --ad "Yeni Kullanıcı" --kurulum "Fabrika A"
  python scripts/create_user.py --email mobil@test.com --password test123 --rol operator --admin-email admin@hypevisionlab.com --admin-password admin
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

import requests

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from scripts._common import DEFAULT_BASE, admin_create_api_key, login  # noqa: E402


def main():
    p = argparse.ArgumentParser(description="HypeVision — yeni kullanıcı oluştur")
    p.add_argument("--base", default=DEFAULT_BASE)
    p.add_argument("--admin-email", default="admin@hypevisionlab.com")
    p.add_argument("--admin-password", default="admin")
    p.add_argument("--email", required=True)
    p.add_argument("--password", required=True)
    p.add_argument("--kullanici-adi", default=None, help="Boşsa e-posta @ öncesi")
    p.add_argument("--ad", required=True)
    p.add_argument("--kurulum", default="Demo Tesis")
    p.add_argument("--rol", default="user", choices=["user", "operator", "isg", "uretim_muduru", "admin"])
    p.add_argument("--with-api-key", action="store_true", help="Mobil entegrasyon anahtarı da oluştur")
    args = p.parse_args()

    token = login(args.admin_email, args.admin_password, args.base)
    kullanici_adi = args.kullanici_adi or args.email.split("@")[0]

    r = requests.post(
        f"{args.base}/api/admin/users",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "kullanici_adi": kullanici_adi,
            "ad": args.ad,
            "email": args.email,
            "sifre": args.password,
            "rol": args.rol,
            "kurulum": args.kurulum,
        },
        timeout=30,
    )
    if not r.ok:
        print("Hata:", r.status_code, r.text)
        sys.exit(1)

    user = r.json()
    print(f"✓ Kullanıcı oluşturuldu: {user['email']} (id={user['id']})")
    print(f"  Giriş: {args.email} / {args.password}")

    if args.with_api_key:
        key = admin_create_api_key(user["id"], "Mobil / Script", token, args.base)
        print(f"  API anahtarı: {key}")


if __name__ == "__main__":
    main()
