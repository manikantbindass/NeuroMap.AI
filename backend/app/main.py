import hashlib
import hmac
import json
import logging
import secrets
import threading
import time
import uuid
from concurrent.futures import ThreadPoolExecutor
from contextlib import asynccontextmanager

import numpy as np
from fastapi import Depends, FastAPI, Header, HTTPException, Request, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, Response
from pydantic import BaseModel, Field
from sqlalchemy import delete, select, text, update

from ml.pipeline import parse_csv, synthetic_csv, train

from .config import Settings
from .db import Audit, Dataset, Job, SessionToken, connect
from .imaging import inspect_nifti, phantom_bytes, preview

logger = logging.getLogger("neuromap")


class Login(BaseModel):
    password: str = Field(max_length=256)


class Submission(BaseModel):
    dataset_id: str = Field(pattern=r"^[0-9a-f-]{36}$")
    idempotency_key: str = Field(min_length=8, max_length=80, pattern=r"^[a-zA-Z0-9-]+$")


def create_app(settings=None):
    settings = settings or Settings()
    settings.prepare()
    engine, sessions = connect(settings.database_url)
    executor = ThreadPoolExecutor(max_workers=1, thread_name_prefix="analysis")
    limits = {}
    lock = threading.Lock()
    # Slow comparison keeps plaintext credentials out of persistence.
    salt = secrets.token_bytes(16)
    password_hash = hashlib.scrypt(settings.password.encode(), salt=salt, n=16384, r=8, p=1)

    @asynccontextmanager
    async def lifespan(app):
        with sessions.begin() as db:
            db.execute(text("SELECT 1"))
            db.execute(
                update(Job)
                .where(Job.status.in_(["queued", "running"]))
                .values(
                    status="failed",
                    result=json.dumps({"error": "Server restarted; submit a new run"}),
                )
            )
            db.execute(delete(SessionToken))
        yield
        executor.shutdown(wait=True, cancel_futures=True)
        engine.dispose()

    app = FastAPI(
        title="NeuroMap AI",
        version="0.1.1",
        lifespan=lifespan,
        description="Single-user research workspace. Synthetic ML and bounded image inspection. No clinical predictions.",
    )
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.origins,
        allow_methods=["GET", "POST", "DELETE"],
        allow_headers=["Authorization", "Content-Type", "X-Data-Consent"],
    )
    app.state.sessions = sessions

    @app.middleware("http")
    async def boundary(request: Request, call_next):
        request_id = str(uuid.uuid4())
        host = request.client.host if request.client else "unknown"
        now = time.monotonic()
        with lock:
            # Bounded process-local limiter. Do not trust X-Forwarded-For.
            stale = [key for key, (start, _) in limits.items() if now - start > 60]
            for key in stale:
                del limits[key]
            key = (host, "login" if request.url.path == "/api/auth/login" else "api")
            start, count = limits.get(key, (now, 0))
            limit = 10 if key[1] == "login" else 300
            if count >= limit or len(limits) > 10000:
                return JSONResponse(
                    {"detail": "Rate limit reached; retry in 60 seconds"},
                    429,
                    headers={"Retry-After": "60"},
                )
            limits[key] = (start, count + 1)
        content_length = request.headers.get("content-length")
        if content_length and (
            not content_length.isdigit()
            or int(content_length) > settings.upload_bytes + 1024 * 1024
        ):
            return JSONResponse({"detail": "Request too large"}, 413)
        # Bound streamed multipart bodies before Starlette spools them to disk.
        received = 0
        original_receive = request._receive

        async def bounded_receive():
            nonlocal received
            message = await original_receive()
            received += len(message.get("body", b""))
            if received > settings.upload_bytes + 1024 * 1024:
                raise HTTPException(413, "Request too large")
            return message

        request._receive = bounded_receive
        response = await call_next(request)
        response.headers.update(
            {
                "X-Request-ID": request_id,
                "X-Content-Type-Options": "nosniff",
                "Cache-Control": "no-store",
                "Referrer-Policy": "no-referrer",
            }
        )
        logger.info(
            json.dumps(
                {"request_id": request_id, "method": request.method, "status": response.status_code}
            )
        )
        return response

    def auth(authorization: str = Header(default="")):
        if not authorization.startswith("Bearer ") or len(authorization) > 200:
            raise HTTPException(401, "Sign in to the research workspace")
        digest = hashlib.sha256(authorization[7:].encode()).hexdigest()
        with sessions() as db:
            token = db.get(SessionToken, digest)
            if not token or token.expires < time.time():
                raise HTTPException(401, "Session expired; sign in again")
        return digest

    def audit(db, action, resource):
        db.add(Audit(id=str(uuid.uuid4()), action=action, resource=resource))

    @app.get("/api/health")
    def health():
        return {"status": "ok", "version": "0.1.1", "clinical_inference": False}

    @app.get("/api/ready")
    def ready():
        with sessions() as db:
            db.execute(text("SELECT 1 FROM datasets LIMIT 1"))
        return {"ready": True}

    @app.post("/api/auth/login")
    def login(body: Login):
        candidate = hashlib.scrypt(body.password.encode(), salt=salt, n=16384, r=8, p=1)
        if not hmac.compare_digest(candidate, password_hash):
            raise HTTPException(401, "Invalid workspace password")
        token = secrets.token_urlsafe(32)
        with sessions.begin() as db:
            db.execute(delete(SessionToken).where(SessionToken.expires < time.time()))
            db.add(
                SessionToken(
                    digest=hashlib.sha256(token.encode()).hexdigest(), expires=time.time() + 28800
                )
            )
            audit(db, "login", "workspace")
        return {"access_token": token, "expires_in": 28800, "role": "workspace-owner"}

    @app.post("/api/auth/logout")
    def logout(digest=Depends(auth)):
        with sessions.begin() as db:
            db.execute(delete(SessionToken).where(SessionToken.digest == digest))
        return {"signed_out": True}

    def save_dataset(raw, kind, name):
        identity = str(uuid.uuid4())
        path = settings.data_dir / identity
        if kind == "csv":
            _, y, groups, sites = parse_csv(raw)
            details = {
                "observations": len(y),
                "participants": len(set(groups)),
                "sites": len(set(sites)),
                "synthetic": True,
            }
            path.write_bytes(raw)
        else:
            volume, details = inspect_nifti(raw, name, settings)
            with path.open("wb") as f:
                np.savez_compressed(f, volume=volume)
        try:
            with sessions.begin() as db:
                db.add(
                    Dataset(
                        id=identity,
                        name=name,
                        kind=kind,
                        checksum=hashlib.sha256(raw).hexdigest(),
                        details=json.dumps(details),
                    )
                )
                audit(db, "dataset-create", identity)
        except Exception:
            path.unlink(missing_ok=True)
            raise
        return {"id": identity, "name": name, "kind": kind, "details": details}

    @app.post("/api/demo", dependencies=[Depends(auth)])
    def demo():
        with sessions() as db:
            if db.query(Dataset).count() > 98:
                raise HTTPException(409, "Workspace limit is 100 datasets; delete unused datasets")
        return [
            save_dataset(synthetic_csv(), "csv", "Synthetic feature cohort.csv"),
            save_dataset(phantom_bytes(), "nifti", "Synthetic geometry phantom.nii"),
        ]

    @app.get("/api/sample/{kind}", dependencies=[Depends(auth)])
    def sample(kind: str):
        if kind not in ["csv", "nifti"]:
            raise HTTPException(404)
        return Response(
            synthetic_csv() if kind == "csv" else phantom_bytes(),
            media_type="application/octet-stream",
            headers={
                "Content-Disposition": f'attachment; filename="synthetic.{"csv" if kind == "csv" else "nii"}"'
            },
        )

    @app.post("/api/datasets", dependencies=[Depends(auth)])
    async def upload(file: UploadFile, consent: str = Header(default="", alias="X-Data-Consent")):
        if consent != "authorized-research":
            raise HTTPException(
                400, "Confirm authorized research use and removal of identifying data"
            )
        with sessions() as db:
            if db.query(Dataset).count() >= 100:
                raise HTTPException(409, "Workspace limit is 100 datasets")
        name = file.filename or ""
        if (
            len(name) > 100
            or any(c in name for c in "/\\\r\n")
            or not name.lower().endswith((".csv", ".nii", ".nii.gz"))
        ):
            raise HTTPException(
                422, "Supported extensions: .csv, .nii, .nii.gz; simple filenames only"
            )
        raw = await file.read(settings.upload_bytes + 1)
        await file.close()
        if len(raw) > settings.upload_bytes:
            raise HTTPException(413, "File exceeds 16 MiB limit")
        try:
            return save_dataset(raw, "csv" if name.lower().endswith(".csv") else "nifti", name)
        except ValueError as exc:
            raise HTTPException(422, str(exc)) from exc

    @app.get("/api/datasets", dependencies=[Depends(auth)])
    def datasets(offset: int = 0, limit: int = 50):
        if offset < 0 or not 1 <= limit <= 100:
            raise HTTPException(422, "Invalid pagination")
        with sessions() as db:
            return [
                {
                    "id": d.id,
                    "name": d.name,
                    "kind": d.kind,
                    "created": d.created,
                    "checksum": d.checksum,
                    "details": json.loads(d.details),
                }
                for d in db.scalars(
                    select(Dataset).order_by(Dataset.created.desc()).offset(offset).limit(limit)
                )
            ]

    def get_dataset(identity):
        with sessions() as db:
            d = db.get(Dataset, identity)
            if not d:
                raise HTTPException(404, "Dataset not found")
            return d

    @app.get("/api/datasets/{identity}/volume", dependencies=[Depends(auth)])
    def volume_view(identity: str, axis: int = 2, index: int = -1):
        d = get_dataset(identity)
        if d.kind != "nifti" or axis not in [0, 1, 2]:
            raise HTTPException(422, "Select an image and a valid axis")
        details = json.loads(d.details)
        with np.load(settings.data_dir / d.id, allow_pickle=False) as archive:
            volume = archive["volume"]
        index = volume.shape[axis] // 2 if index == -1 else index
        if not 0 <= index < volume.shape[axis]:
            raise HTTPException(422, "Slice index out of range")
        return {
            "preview": preview(volume, details["affine"]),
            "slice": np.take(volume, index, axis=axis).round(3).tolist(),
            "axis": axis,
            "index": index,
            "details": details,
        }

    @app.delete("/api/datasets/{identity}", dependencies=[Depends(auth)])
    def remove_dataset(identity: str):
        get_dataset(identity)
        with lock, sessions.begin() as db:
            related = list(db.scalars(select(Job).where(Job.dataset_id == identity)))
            if any(j.status in ["queued", "running"] for j in related):
                raise HTTPException(409, "Wait for the active job before deleting")
            (settings.data_dir / identity).unlink(missing_ok=True)
            for j in related:
                db.delete(j)
            db.delete(db.get(Dataset, identity))
            audit(db, "dataset-delete", identity)
        return {"deleted": identity, "reports_deleted": len(related)}

    def worker(identity):
        try:
            with lock, sessions.begin() as db:
                j = db.get(Job, identity)
                if j.status == "cancelled":
                    return
                j.status = "running"
                dataset_id = j.dataset_id
            d = get_dataset(dataset_id)
            if d.kind == "csv":
                result = train((settings.data_dir / d.id).read_bytes())
            else:
                result = {
                    "task": "image-metadata-inspection",
                    "details": json.loads(d.details),
                    "dataset_sha256": d.checksum,
                    "warning": "No disease inference. Geometry and intensity inspection only.",
                }
            with sessions.begin() as db:
                j = db.get(Job, identity)
                j.result = json.dumps(result, allow_nan=False)
                j.status = "completed"
                audit(db, "job-complete", identity)
        except Exception:
            logger.error(json.dumps({"event": "job-failed", "job_id": identity}))
            with sessions.begin() as db:
                j = db.get(Job, identity)
                j.status = "failed"
                j.result = json.dumps(
                    {"error": "Analysis failed; check data constraints and submit a new run"}
                )

    @app.post("/api/jobs", dependencies=[Depends(auth)])
    def submit(body: Submission):
        with lock, sessions.begin() as db:
            if not db.get(Dataset, body.dataset_id):
                raise HTTPException(404, "Dataset not found")
            old = db.scalar(select(Job).where(Job.key == body.idempotency_key))
            if old:
                if old.dataset_id != body.dataset_id:
                    raise HTTPException(409, "Idempotency key belongs to another dataset")
                return {"id": old.id, "status": old.status}
            if db.query(Job).filter(Job.status.in_(["running", "queued"])).count() >= 4:
                raise HTTPException(429, "Job queue is full")
            identity = str(uuid.uuid4())
            db.add(
                Job(
                    id=identity,
                    dataset_id=body.dataset_id,
                    status="queued",
                    key=body.idempotency_key,
                )
            )
            audit(db, "job-submit", identity)
        executor.submit(worker, identity)
        return {"id": identity, "status": "queued"}

    @app.get("/api/jobs", dependencies=[Depends(auth)])
    def jobs(offset: int = 0, limit: int = 50):
        if offset < 0 or not 1 <= limit <= 100:
            raise HTTPException(422)
        with sessions() as db:
            return [
                {
                    "id": j.id,
                    "dataset_id": j.dataset_id,
                    "status": j.status,
                    "created": j.created,
                    "result": json.loads(j.result),
                }
                for j in db.scalars(
                    select(Job).order_by(Job.created.desc()).offset(offset).limit(limit)
                )
            ]

    @app.post("/api/jobs/{identity}/cancel", dependencies=[Depends(auth)])
    def cancel(identity: str):
        with lock, sessions.begin() as db:
            j = db.get(Job, identity)
            if not j:
                raise HTTPException(404)
            if j.status != "queued":
                raise HTTPException(409, "Only queued jobs may be cancelled")
            j.status = "cancelled"
        return {"status": "cancelled"}

    @app.get("/api/jobs/{identity}/report", dependencies=[Depends(auth)])
    def report(identity: str):
        with sessions() as db:
            j = db.get(Job, identity)
            if not j:
                raise HTTPException(404)
            if j.status != "completed":
                raise HTTPException(409, "Report is available after completion")
            payload = {
                "application": "NeuroMap AI",
                "version": "0.1.1",
                "job_id": j.id,
                "created": j.created,
                "result": json.loads(j.result),
            }
        return Response(
            json.dumps(payload, indent=2),
            media_type="application/json",
            headers={"Content-Disposition": f'attachment; filename="neuromap-{identity}.json"'},
        )

    return app
