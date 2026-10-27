NeuroMap AI 0.1.1 adds configurable HTTPS server connections for native clients and a signed Android release-build path. It remains a research foundation: image inspection, synthetic classification, computed reports and a private dashboard. It does not diagnose disease or provide clinical risk predictions.

Web bundle requires the Python API and configured proxy. Windows client requires an available frontend/API server and is unsigned unless explicitly stated. The Android client requires the operator's HTTPS backend configured under Server connection, with https://localhost allowed in server CORS origins. Clients have no offline ML runtime. APK publication is gated on authorized signing, signature verification, release lint and package checks. No iOS IPA is attached without successful Apple signing and provisioning.

Read docs/VERIFICATION.md, docs/RELEASE_AND_SIGNING.md and SHA256SUMS.txt. Reported metrics are synthetic engineering outputs only. No real patient data, pretrained weights or restricted datasets are distributed.

The source manifest records the exact revision and all published asset checksums. Scientific methodology remains the same as 0.1.0. No real patient dataset or disease model is bundled. See the release's actual files for supported downloads; missing platform assets are not simulated or replaced with renamed archives.
