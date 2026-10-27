# Installation, configuration and development

Requirements: Python 3.12, Node.js 24, npm, Git; about 1 GB install disk and additional artifact space. No GPU needed. Windows PowerShell commands from repository root:

```powershell
py -3.12 -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r backend/requirements-lock.txt
$env:NEUROMAP_PASSWORD = Read-Host 'Choose a unique workspace password (12+ characters)'
New-Item -ItemType Directory -Force data
.\.venv\Scripts\python.exe -m alembic upgrade head
.\.venv\Scripts\python.exe -m uvicorn backend.app.main:create_app --factory --host 127.0.0.1 --port 8000 --no-access-log
```

In a second PowerShell terminal:

```powershell
cd frontend
npm ci
npm run dev
```

Open http://127.0.0.1:5173 and sign in with the password you set. Stop each service with Ctrl+C; the API drains its worker. `scripts/dev.ps1` applies migrations and starts the API after the environment is installed.

POSIX equivalent:

```bash
python3.12 -m venv .venv
.venv/bin/python -m pip install -r backend/requirements-lock.txt
read -rs -p 'Workspace password: ' NEUROMAP_PASSWORD; export NEUROMAP_PASSWORD
mkdir -p data
.venv/bin/python -m alembic upgrade head
.venv/bin/python -m uvicorn backend.app.main:create_app --factory --host 127.0.0.1 --port 8000 --no-access-log
# second terminal: cd frontend && npm ci && npm run dev
```

## Configuration

Copy `.env.example` to `.env` for persistent private local settings, or set environment variables. Do not commit `.env`.

| Variable | Default | Meaning |
|---|---|---|
| NEUROMAP_PASSWORD | none; startup refuses | At least 12 characters; unique private workspace password |
| NEUROMAP_DATA_DIR | ./data | Private file storage; provision restrictive OS ACLs |
| NEUROMAP_DATABASE_URL | sqlite:///./data/neuromap.db | Tested database URL; directory must exist |
| NEUROMAP_ORIGINS | localhost:5173 and localhost:4173 HTTP | JSON array of exact allowed browser origins |
| NEUROMAP_UPLOAD_BYTES | 16777216 | Maximum file bytes; default 16 MiB |
| NEUROMAP_DECODED_BYTES | 67108864 | Decompressed NIfTI byte limit |
| NEUROMAP_MAX_VOXELS | 4000000 | Voxel count cap; additional axis cap 256 |
| VITE_API_URL | empty | Frontend build-time API origin, no trailing slash; empty uses same-origin /api proxy |
| NEUROMAP_DESKTOP_URL | http://127.0.0.1:4173 | Trusted frontend URL for Electron; HTTPS or loopback only |

Native Capacitor builds need VITE_API_URL set to the HTTPS API origin and NEUROMAP_ORIGINS including `https://localhost` (Android) and `capacitor://localhost` (iOS). Rebuild web assets before `cap sync`. Configure trusted server URL and certificate outside source for institutional deployment. No cleartext remote traffic or broad CORS is required.

## Development and checks

Install dev requirements or the complete recorded lock. Run from root:

```powershell
.\.venv\Scripts\python.exe -m ruff check .
.\.venv\Scripts\python.exe -m ruff format --check .
.\.venv\Scripts\python.exe -m pytest -q
```

From frontend: `npm run lint`, `npm test`, `npm run build`. With running API/frontend and the same NEUROMAP_PASSWORD in the test shell: `npx playwright install chromium`, then `npm run test:e2e`. It creates/downloads/uploads synthetic data, runs training, checks charts/report, captures screenshots and runs axe on the overview. It intentionally changes test-workspace state. Use a dedicated local dataset directory/database. No broad accessibility certification is implied by this limited flow.

The lock records exact installed Python versions (including test tools); it currently makes a simple reproducible Docker install at the expense of a larger image. Windows-only packages must not be added without environment markers. Frontend and native npm locks should be committed and installed using `npm ci`.

Migration lifecycle: `python -m alembic upgrade head`, `python -m alembic check`. For rollback, stop the service and back up first. `python -m alembic downgrade base` removes ALL application tables and data records; use only in disposable test databases, not as a routine rollback. Restore a consistent backup for production recovery.
