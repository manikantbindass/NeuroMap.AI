# Initial repository audit

Audit date: 2026-10-27 (Asia/Kolkata).

- Original: https://github.com/manikantbindass/AI-for-Personalized-Brain-Mapping-Disease-Prediction
- Owner: manikantbindass. Public, size 0 KB, default branch main, no commits or source files. No README, license, manifests, workflows, issues, releases, branches or tags at inspection. GitHub API reports admin/push permissions.
- Workspace initially empty. Cloned original; no unrelated files removed. Preserve original URL; a rename adds no implementation value.
- Requested branch: feat/neuromap-ai-foundation. Git writes require elevated sandbox access; normal shell network DNS is restricted. GitHub API succeeds with elevated authenticated gh.
- Windows; Python 3.14 default, Python 3.13 and 3.12 also detected. Select 3.12 for scientific-library compatibility. Node 24.14.1, npm 11.11.0, Git 2.55.0. Docker and Java executables exist; daemon/build-tool availability must be tested separately. Apple tooling unavailable on Windows. Detailed capacity and build evidence will be recorded in VERIFICATION.md.
- No licensed imaging cohort or trained model exists. Do not download controlled data. Research review precedes method selection.

## Implementation plan and acceptance

Implement a modular FastAPI/SQLAlchemy service with SQLite migrations, a single-user research workspace, bounded NIfTI ingestion and inspection, persisted jobs, reports, and a React/TypeScript dashboard. Start with a reproducible **synthetic tabular classification** experiment, not a disease predictor. Render actual volume slices and affine-positioned voxel points; clearly distinguish a procedural demonstration from anatomy. Use CPU-only dependencies. Add Docker, CI, native client build paths, evidence docs and genuine screenshots. Test the complete upload/job/report loop and malformed data, authentication, group splits, reproducibility, frontend navigation and production build. Publish only artifacts actually built and verified; document every blocked target.

## Scope boundaries

No clinical model, clinical validation, DICOM conversion, registration, segmentation, connectivity inference, multi-user tenancy, distributed queue or regulatory clearance is claimed. These require additional data, infrastructure and validation. Initial worker is bounded to one process and one concurrent job; production deployment is limited to a private research workspace until operational controls are validated.
