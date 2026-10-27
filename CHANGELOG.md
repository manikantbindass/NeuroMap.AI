# Changelog

## 0.1.1 — 2026-10-27

Add a configurable HTTPS API server to the login screen for native clients. Add an Android release-build pipeline that checks lint, validates signing, rejects debuggable outputs and includes actual APK artifacts in versioned releases. Android signing requires explicitly authorized credentials; iOS distribution requires Apple provisioning. No new clinical model or offline inference capability.

## 0.1.0 — 2026-10-27

Initial research foundation: React dashboard, authenticated private FastAPI workspace, SQLite/Alembic persistence, bounded NIfTI-1 inspection, voxel/slice viewer, synthetic participant-safe ML baseline, computed evaluation and JSON reports, experiment provenance, source/native build paths, tests, research review and operations documentation. No clinical prediction model or validated disease-risk feature.
