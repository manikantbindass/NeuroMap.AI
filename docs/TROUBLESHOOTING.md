# Troubleshooting and FAQ

- **Password startup error:** set a unique NEUROMAP_PASSWORD of at least 12 characters; example placeholder is rejected. scripts/start_verified.py can provision a local random `.env` for a dedicated test workspace; keep that file private.
- **No database directory/table:** create data, run `python -m alembic upgrade head` with the configured database URL. Settings alone do not create tables.
- **401 after reload/restart:** session is browser-memory only; sign in again. Restart intentionally invalidates sessions.
- **API unavailable / CORS:** use frontend Vite proxy or nginx; VITE_API_URL is a build-time origin. Add exact native/web origins to NEUROMAP_ORIGINS. Do not use wildcard origins as a shortcut.
- **Port in use:** stop the old application or choose ports and update proxy/origins consistently. Health alone does not prove the UI is connected to the intended data directory.
- **Upload rejected:** read the validation error. Only exact synthetic CSV schema or 3D single-file scalar NIfTI-1. Rejects unsupported dimensions, nonfinite values, oversized payloads and invalid affine/offsets. DICOM and 4D fMRI need an external validated conversion/preprocessing workflow.
- **No brain in viewer:** the procedural form/phantom is non-anatomical. Choose an uploaded image. WebGL failure leaves metadata and slices usable; thresholds can hide low-intensity points.
- **Analysis failed after restart:** submit a new run; no automatic retry/retraining occurs. A completed report is immutable until its dataset is deleted.
- **429:** wait for per-minute limiter or queued work to drain. Proxy users may share a client IP; current limiter is not a distributed production control.
- **No clinical prediction:** intentional scope. A synthetic score does not measure MRI diagnostic performance. See research review/model card.
- **Docker named pipe missing:** start Docker Desktop in Linux-container mode. Docker executable alone is not an operational engine.
- **Android SDK missing:** install Android tooling in an owner-approved build environment or use mobile CI; no APK can be claimed from native source generation.
- **iOS on Windows:** Xcode/macOS and real signing credentials are required. Simulator compilation does not produce a signed IPA.
- **Installer server unavailable:** run API plus frontend preview, or set NEUROMAP_DESKTOP_URL to a trusted HTTPS frontend. The Windows client is not an offline inference bundle.
- **Test temp permissions on Windows:** create a disposable data directory and use `pytest --basetemp=data/pytest-<unique-run>`. Do not point pytest basetemp at valuable files; pytest cleans it.
- **Dependency advisory:** inspect npm audit/pip-audit, update a compatible version, regenerate locks, rerun affected tests and record any remaining advisory. Do not suppress findings merely to make release green.
