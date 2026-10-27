$ErrorActionPreference = 'Stop'
Set-Location (Split-Path $PSScriptRoot -Parent)
if (-not $env:NEUROMAP_PASSWORD) { throw 'Set NEUROMAP_PASSWORD to a unique password of at least 12 characters.' }
New-Item -ItemType Directory -Force data | Out-Null
& ./.venv/Scripts/python.exe -m alembic upgrade head
if ($LASTEXITCODE -ne 0) { throw 'Migration failed' }
& ./.venv/Scripts/python.exe -m uvicorn backend.app.main:create_app --factory --host 127.0.0.1 --port 8000 --no-access-log
