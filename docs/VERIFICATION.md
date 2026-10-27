# Verification and acceptance record

Executed 2026-10-27 on Windows 11 Home Single Language; Python 3.12, Node 24.14.1, npm 11.11.0, Git 2.55.0. About 16 GiB memory (under 1 GiB free during initial audit), D: about 51 GiB free. No CUDA functionality required or asserted.

## Passed locally

| Check | Actual outcome |
|---|---|
| Repository audit | Original public repository empty, 0 KB, no source/history/releases/issues/workflows; admin/push permissions confirmed |
| Backend/API/ML | pytest: **22 passed**, one upstream Starlette/httpx deprecation warning; includes malformed uploads, auth, migrations, split integrity, metrics, reproducibility and imaging limits |
| Python quality | Ruff lint/format passed; pip check found no broken requirements |
| Frontend | TypeScript/Vite production build, Prettier format check, ESLint and **3 Vitest tests passed** |
| Browser | **1 Playwright end-to-end test passed** (final 54.8 s): actual fixture upload, training, evaluation, JSON download, image/slice controls, consent gating, Escape-key dialog close, themes, mobile navigation |
| Accessibility / responsive | axe overview WCAG 2 A/AA scan: zero violations in tested screen; 390x844 viewport no document horizontal overflow. Not a comprehensive audit |
| Live application | API, dev frontend and production preview actually started; health/readiness/login HTTP 200; real computed synthetic workflow |
| ML CLI | generate / train / evaluate executed; evaluate checks stored model hash and exports recorded evaluation |
| Load smoke | 40 loopback health requests, concurrency 4: median 0.0125 s, p95 0.3095 s. Not a capacity benchmark |
| Screenshots | Actual dashboard, brain-viewer, model-evaluation, mobile-view and packaged windows-client PNGs; four main captures visually inspected |
| Windows | Real branded x64 NSIS installer built. Authenticode: NotSigned. Packaged unpacked executable launched against production preview; expected login/title/URL verified, application closed |
| Native source | Genuine Capacitor Android/iOS projects generated; identity/version/original icons configured; Android cleartext and backup disabled |
| Security audits | Frontend/desktop/mobile npm audits reported zero vulnerabilities after fixes; Python audit initially flagged pip 24.0 only, upgraded to 26.2.2, re-audit: no known vulnerabilities |
| Metadata | Requested GitHub description and research topics updated; original URL retained |
| Compose syntax | docker compose config --quiet passed |
| GitHub CI | [CI 40457493240](https://github.com/manikantbindass/AI-for-Personalized-Brain-Mapping-Disease-Prediction/actions/runs/40457493240) and [Security 40457493245](https://github.com/manikantbindass/AI-for-Personalized-Brain-Mapping-Disease-Prediction/actions/runs/40457493245) passed for code commit 41250ad870a57e507c7be0b24a4065c65aaae83e. CI includes successful Linux Docker build/startup/readiness/frontend smoke, Python tests, frontend quality/build, and browser/accessibility flow |

## Actual synthetic result

240 artificial participants / 480 observations; participant partitions 144/48/48, observations 288/96/96. Seed 42, selected C=10. Test ROC-AUC 0.909565, 95% participant-cluster bootstrap CI 0.831239-0.973588; dummy AUC 0.5. Average precision 0.906363, balanced accuracy 0.814783, Brier 0.124906. Confusion matrix: [[38,12],[6,40]]. These are computed engineering results with **no clinical meaning**.

## Corrected failures

Sandbox blocked initial network/Git writes and pytest temp creation; scoped elevated execution and workspace temp paths resolved these. Tests started during dependency installation initially lacked Alembic/tsc and were rerun after installation. Vitest initially included Playwright files; unit paths corrected. Browser cold-login wait increased after direct HTTP 200 check; upload harness corrected to preserve downloaded CSV extension. Frontend formatter's unsupported SVG input removed. Vitest and mobile CLI advisories fixed with compatible updates/pins; pip upgraded. An approval-review usage-limit failure briefly blocked one browser command; after user instructed continue the same review path succeeded.

A later browser rerun timed out during login while heavy packaging/scanning was concurrent on the memory-constrained host. Direct API login still returned HTTP 200 in 1.06 s. Idle Three.js rendering was changed to event-driven drawing (continuous rendering only for explicit auto-rotation) to reduce unnecessary software-GPU load; the final full browser rerun then passed in 54.8 s and refreshed screenshots.

Gitleaks 8.24.2 staged-diff scans before the baseline, API, frontend/native and documentation commits reported no leaks. All four workflow YAML files parsed successfully. These checks reduce risk; they are not a guarantee of absence of secrets or independent security certification.

## Blocked, skipped and not implemented

| Gate | Blocker / remaining requirement |
|---|---|
| Local Docker runtime | Local Docker 29.4 daemon/named pipe unavailable. Linux Docker topology build/startup **passed on GitHub CI**; enable Linux engine for local Compose use |
| Android APK | No Android SDK. Build attempt fails at invalid JAVA_HOME pointing to nonexistent jdk-22; java command is 25. Configure compatible JDK/SDK or execute Android CI. No APK produced |
| iOS IPA | No macOS/Xcode/Apple signing environment on Windows. Native source and macOS simulator workflow provided; signed archive/export remains owner-provisioned. No IPA produced |
| Windows installation/signing | Unpacked launch tested; full installed upgrade/uninstall and signing not verified. Unsigned distribution explicitly disclosed |
| Public deployment | No hosted frontend/API or public demo configured |
| Clinical features | No authorized disease cohort or weights; no disease model, registration, segmentation, parcellation, site holdout, external validation or clinical calibration |
| Production assurance | No multi-tenant auth, distributed queue/limits, isolated parser process, formal penetration test, broad stress test or restore drill |
| Optional mobile dispatch | Attempt returned HTTP 404 because mobile.yml is not on the default branch. After authorized PR merge, dispatch the Android unsigned-release and macOS simulator workflow; distribution signing remains separate |

Commit/push/PR, tag and exact release asset links/hashes are recorded in the final handoff and actual GitHub release manifest. This is a scoped research foundation; the larger advanced/clinical roadmap is not complete.
