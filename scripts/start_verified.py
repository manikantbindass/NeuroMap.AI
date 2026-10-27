"""Create a private local test credential if missing, apply schema, run loopback API."""

import secrets
from pathlib import Path

import uvicorn
from alembic import command
from alembic.config import Config

if __name__ == "__main__":
    Path("data").mkdir(exist_ok=True)
    env = Path(".env")
    if not env.exists():
        env.write_text("NEUROMAP_PASSWORD=" + secrets.token_urlsafe(24) + "\n", encoding="utf-8")
    command.upgrade(Config("alembic.ini"), "head")
    uvicorn.run(
        "backend.app.main:create_app", factory=True, host="127.0.0.1", port=8000, access_log=False
    )
