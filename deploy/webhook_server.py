#!/usr/bin/env python3
"""GitHub push webhook → deploy/auto-deploy.sh (stdlib only)."""
from __future__ import annotations

import hmac
import hashlib
import json
import os
import subprocess
import sys
import threading
from http.server import BaseHTTPRequestHandler, HTTPServer
from pathlib import Path
from urllib.parse import urlparse

PROJECT_DIR = Path(__file__).resolve().parent.parent
ENV_FILE = PROJECT_DIR / "deploy" / "deploy.env"
DEPLOY_SCRIPT = PROJECT_DIR / "deploy" / "auto-deploy.sh"
HOST = os.environ.get("DEPLOY_WEBHOOK_HOST", "127.0.0.1")
PORT = int(os.environ.get("DEPLOY_WEBHOOK_PORT", "9001"))


def load_config() -> dict[str, str]:
    cfg: dict[str, str] = {
        "DEPLOY_WEBHOOK_SECRET": os.environ.get("DEPLOY_WEBHOOK_SECRET", ""),
        "DEPLOY_BRANCH": os.environ.get("DEPLOY_BRANCH", "main"),
        "DEPLOY_REPO": os.environ.get("DEPLOY_REPO", ""),
    }
    if ENV_FILE.is_file():
        for line in ENV_FILE.read_text(encoding="utf-8").splitlines():
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            key, value = line.split("=", 1)
            cfg[key.strip()] = value.strip()
    return cfg


def verify_signature(secret: str, body: bytes, header: str | None) -> bool:
    if not secret or not header or not header.startswith("sha256="):
        return False
    expected = hmac.new(secret.encode(), body, hashlib.sha256).hexdigest()
    return hmac.compare_digest(f"sha256={expected}", header)


def should_deploy(payload: dict, cfg: dict[str, str]) -> tuple[bool, str]:
    event = payload.get("_event", "")
    if event == "ping":
        return False, "ping"

    ref = payload.get("ref", "")
    branch = cfg.get("DEPLOY_BRANCH", "main")
    want_ref = f"refs/heads/{branch}"
    if ref != want_ref:
        return False, f"branch skip ({ref})"

    repo_full = (payload.get("repository") or {}).get("full_name", "")
    want_repo = cfg.get("DEPLOY_REPO", "").strip()
    if want_repo and repo_full and repo_full.lower() != want_repo.lower():
        return False, f"repo skip ({repo_full})"

    return True, "ok"


def run_deploy() -> None:
    if not DEPLOY_SCRIPT.is_file():
        print("[webhook] deploy script missing", file=sys.stderr)
        return
    subprocess.Popen(
        ["/bin/bash", str(DEPLOY_SCRIPT)],
        cwd=str(PROJECT_DIR),
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
        start_new_session=True,
    )


class Handler(BaseHTTPRequestHandler):
    cfg = load_config()

    def log_message(self, fmt: str, *args) -> None:
        print(f"[webhook] {self.address_string()} {fmt % args}")

    def _json(self, code: int, data: dict) -> None:
        body = json.dumps(data).encode()
        self.send_response(code)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self) -> None:
        path = urlparse(self.path).path
        if path in ("/", "/health"):
            self._json(200, {"ok": True, "service": "hypevision-deploy-webhook"})
            return
        self._json(404, {"ok": False, "error": "not found"})

    def do_POST(self) -> None:
        path = urlparse(self.path).path
        if path not in ("/deploy-hook", "/"):
            self._json(404, {"ok": False, "error": "not found"})
            return

        length = int(self.headers.get("Content-Length", "0"))
        body = self.rfile.read(length)
        event = self.headers.get("X-GitHub-Event", "")
        sig = self.headers.get("X-Hub-Signature-256")

        secret = self.cfg.get("DEPLOY_WEBHOOK_SECRET", "")
        if not verify_signature(secret, body, sig):
            self._json(401, {"ok": False, "error": "invalid signature"})
            return

        try:
            payload = json.loads(body.decode("utf-8"))
        except json.JSONDecodeError:
            self._json(400, {"ok": False, "error": "invalid json"})
            return

        payload["_event"] = event

        if event == "ping":
            self._json(200, {"ok": True, "message": "pong"})
            return

        if event != "push":
            self._json(200, {"ok": True, "message": f"ignored event: {event}"})
            return

        deploy, reason = should_deploy(payload, self.cfg)
        if not deploy:
            self._json(200, {"ok": True, "message": reason})
            return

        threading.Thread(target=run_deploy, daemon=True).start()
        after = (payload.get("after") or "")[:8]
        self._json(200, {"ok": True, "message": "deploy started", "commit": after})


def main() -> None:
    cfg = load_config()
    if not cfg.get("DEPLOY_WEBHOOK_SECRET"):
        print("[webhook] DEPLOY_WEBHOOK_SECRET tanımlı değil", file=sys.stderr)
        sys.exit(1)
    server = HTTPServer((HOST, PORT), Handler)
    print(f"[webhook] listening on {HOST}:{PORT} branch={cfg.get('DEPLOY_BRANCH', 'main')}")
    server.serve_forever()


if __name__ == "__main__":
    main()
