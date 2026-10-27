import gzip
import time

import pytest
from alembic import command
from alembic.config import Config
from fastapi.testclient import TestClient

from backend.app.config import Settings
from backend.app.imaging import phantom_bytes
from backend.app.main import create_app
from ml.pipeline import synthetic_csv


@pytest.fixture
def client(tmp_path, monkeypatch):
    url = f"sqlite:///{tmp_path / 'test.db'}"
    monkeypatch.setenv("NEUROMAP_DATABASE_URL", url)
    command.upgrade(Config("alembic.ini"), "head")
    app = create_app(Settings(password="test-only-passphrase", data_dir=tmp_path, database_url=url))
    with TestClient(app) as c:
        yield c


def login(client):
    r = client.post("/api/auth/login", json={"password": "test-only-passphrase"})
    assert r.status_code == 200
    return {"Authorization": "Bearer " + r.json()["access_token"]}


def wait_job(client, headers, identity):
    for _ in range(300):
        job = next(
            j for j in client.get("/api/jobs", headers=headers).json() if j["id"] == identity
        )
        if job["status"] in ["completed", "failed"]:
            return job
        time.sleep(0.05)
    pytest.fail("Job timed out")


def test_auth_and_health(client):
    assert client.get("/api/health").json()["clinical_inference"] is False
    assert client.get("/api/ready").status_code == 200
    assert client.get("/api/datasets").status_code == 401
    assert client.post("/api/auth/login", json={"password": "incorrect"}).status_code == 401
    headers = login(client)
    assert client.get("/api/datasets", headers=headers).json() == []
    assert client.post("/api/auth/logout", headers=headers).status_code == 200
    assert client.get("/api/datasets", headers=headers).status_code == 401


def test_upload_analyze_report_delete(client):
    h = login(client)
    h["X-Data-Consent"] = "authorized-research"
    r = client.post("/api/datasets", headers=h, files={"file": ("synthetic.csv", synthetic_csv())})
    assert r.status_code == 200, r.text
    d = r.json()
    assert d["details"]["participants"] == 240
    payload = {"dataset_id": d["id"], "idempotency_key": "test-key-123"}
    j = client.post("/api/jobs", headers=h, json=payload).json()
    assert client.post("/api/jobs", headers=h, json=payload).json()["id"] == j["id"]
    complete = wait_job(client, h, j["id"])
    assert complete["status"] == "completed", complete
    report = client.get(f"/api/jobs/{j['id']}/report", headers=h)
    assert report.status_code == 200
    result = report.json()["result"]
    assert result["synthetic"] is True
    assert 0 <= result["metrics"]["roc_auc"] <= 1
    assert len(result["model_sha256"]) == 64
    assert client.delete(f"/api/datasets/{d['id']}", headers=h).status_code == 200
    assert client.get("/api/jobs", headers=h).json() == []
    assert client.get(f"/api/jobs/{j['id']}/report", headers=h).status_code == 404


@pytest.mark.parametrize(
    "name,raw",
    [
        ("bad.nii", b"not an image"),
        ("truncated.nii", phantom_bytes()[:400]),
        ("../escape.csv", synthetic_csv()),
        ("archive.zip", b"PK"),
        ("missing.csv", b"a,b\n1,2"),
        ("bad.nii.gz", b"invalid gzip"),
    ],
)
def test_malformed_uploads(client, name, raw):
    h = login(client)
    h["X-Data-Consent"] = "authorized-research"
    r = client.post("/api/datasets", headers=h, files={"file": (name, raw)})
    assert r.status_code == 422, r.text
    assert client.get("/api/datasets", headers=h).json() == []


def test_image_geometry_preview_and_job(client):
    h = login(client)
    h["X-Data-Consent"] = "authorized-research"
    r = client.post(
        "/api/datasets",
        headers=h,
        files={"file": ("phantom.nii.gz", gzip.compress(phantom_bytes()))},
    )
    assert r.status_code == 200, r.text
    d = r.json()
    assert d["details"]["shape"] == [48, 56, 48]
    view = client.get(f"/api/datasets/{d['id']}/volume", headers=h)
    assert view.status_code == 200
    assert 0 < len(view.json()["preview"]["positions"]) <= 18000
    assert client.get(f"/api/datasets/{d['id']}/volume?axis=9", headers=h).status_code == 422
    j = client.post(
        "/api/jobs", headers=h, json={"dataset_id": d["id"], "idempotency_key": "image-run-123"}
    ).json()
    assert wait_job(client, h, j["id"])["result"]["task"] == "image-metadata-inspection"


def test_consent_limits_and_cors(client):
    h = login(client)
    assert (
        client.post(
            "/api/datasets", headers=h, files={"file": ("x.csv", synthetic_csv())}
        ).status_code
        == 400
    )
    assert client.get("/api/datasets?limit=1000", headers=h).status_code == 422
    response = client.options(
        "/api/datasets",
        headers={"Origin": "https://evil.example", "Access-Control-Request-Method": "POST"},
    )
    assert response.status_code == 400
    assert client.get("/api/health").headers["cache-control"] == "no-store"


def test_migrations_upgrade_downgrade(tmp_path, monkeypatch):
    monkeypatch.setenv("NEUROMAP_DATABASE_URL", f"sqlite:///{tmp_path / 'migration.db'}")
    config = Config("alembic.ini")
    command.upgrade(config, "head")
    command.check(config)
    command.downgrade(config, "base")
    command.upgrade(config, "head")


def test_login_rate_limit(client):
    for _ in range(10):
        assert client.post("/api/auth/login", json={"password": "wrong"}).status_code == 401
    assert client.post("/api/auth/login", json={"password": "wrong"}).status_code == 429
