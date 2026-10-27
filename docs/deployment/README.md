# Deployment, operations and recovery

## Local Docker topology

Requires Docker with a **Linux** engine and Compose. Current Windows host has no running daemon; local container verification may be blocked (see VERIFICATION.md).

```powershell
$env:NEUROMAP_PASSWORD = Read-Host 'Set a unique password of at least 12 characters'
docker compose up --build -d
docker compose ps
```

Open http://localhost:8080. nginx serves the production frontend and proxies `/api` to the private API. API runs as UID 10001, persists data in a named volume, applies migrations before startup and exposes readiness internally. Web binds host loopback. `docker compose down` stops without deleting data; `down -v` destroys the named volume and must not be used for ordinary shutdown.

Use a private trusted TLS reverse proxy for remote research use. Set exact CORS origins. Do not embed credentials in frontend builds. Do not run multiple API workers or replicas: queue, admission locks and rate limits are process-local. No hosted deployment is created by source/build preparation alone.

## Capacity and scaling

CPU-only small research workloads; reserve 1–2 CPU cores and at least 1–2 GB free memory for backend + browser, more during npm/Electron builds. These are starting budgets, not validated performance guarantees. Default API container limit: 1 GiB / 2 CPUs; frontend 256 MiB. File caps and one worker bound individual work but accumulated datasets/reports/backups consume disk. Maximum 100 datasets; each input file up to 16 MiB. View responses include at most 18,000 points. Monitor resident memory, request latency/error counts, job duration/failures, free disk, database size and backup age.

`python scripts/load_test.py` sends 40 loopback health requests at concurrency 4 and prints median/p95. This is a smoke test, not a neuroimaging load benchmark. No claim of production-proven scale is made. Full scientific analysis, native parser isolation and simultaneous large upload load need future testing.

Horizontal scaling requires a durable external queue (Redis/RQ or equivalent), transactional job dispatch/leases, shared object storage, distributed limits and PostgreSQL. PostgreSQL is not installed/tested in this release; SQLAlchemy portability does not prove deployment support. Add tenant authorization before multi-user work. GPU encoders remain optional separate compute services after model validation.

## Backup and recovery

1. Quiesce uploads and stop the API gracefully so running work finishes.
2. Copy **both** the SQLite database and UUID payload files from the private data directory/named volume into an encrypted access-controlled backup. Do not publish it or put it in Git. Record application version and SHA-256 manifest privately.
3. Store password/configuration separately in a secret store. Define institutional retention and restore frequency.
4. Restore the matching data/DB pair with restrictive permissions into a test workspace. Use the matching source version, apply reviewed migrations, rotate password and restart.
5. Verify readiness, dataset counts/checksums, image preview, an existing completed report and a new synthetic run before reopening access. Interrupted queued/running records become failed on startup and need explicit resubmission.

Rollback: stop the new service, preserve its data snapshot, restore the prior source and compatible backup. Do not downgrade schema blindly. Initial migration downgrade removes tables; only exercise it in disposable tests. Recovery time and point objectives are operator-defined and not measured here.
