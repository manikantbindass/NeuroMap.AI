# Security, privacy and threat model

## Assets and boundaries

Assets: user-supplied images, synthetic tables, geometry/checksums, reports/model coefficients, private workspace credential, session tokens, audit records. Actors: workspace owner; unauthorized remote clients; malicious uploaders; compromised dependencies; someone with OS/backups access. Trust boundary: browser/native client → configured TLS proxy → private single-process API → local file/database storage. See architecture diagram.

| Threat | Implemented mitigation | Residual risk / deployment requirement |
|---|---|---|
| Unauthorized API access | One owner password (12+ chars), scrypt comparison, random bearer session; hash-only persistence, 8h expiry, restart invalidation and logout | No separate users, MFA, invitation or tenant isolation. Use private networking; no open public deployment |
| Credential leakage | Browser-memory token; no URL tokens; secret/data ignores; structured method/status/request-ID logs with access logging disabled | TLS, reverse-proxy log policy, endpoint/OS security and password rotation remain operator responsibilities |
| Browser cross-origin abuse | Exact configured CORS origins; no ambient cookies; no clinical uploads cached; no-store responses | XSS can act as authenticated owner. nginx CSP and dependency reviews reduce risk; origin policy is not authentication |
| Traversal / arbitrary files | Generated UUID storage paths; simple filename and extension allowlist; ZIP/tar and paired images rejected | OS owner can read disk; use restrictive directory ACLs and encrypted storage |
| Compression / parser exhaustion | 16 MiB upload, 64 MiB decompression, 4M voxels, scalar numeric 3D, max axis 256, shape/offset/affine checks; bounded streaming body; only known NIfTI parser | Parser runs in API process. No hard process CPU timeout; private trusted research uploads only. Public hosting needs isolated worker containers and quarantine |
| Expensive job flood | Per-IP process-local limiter, four outstanding jobs, one worker, 100 datasets, 5000 CSV rows | Limiters are not distributed; proxy clients may share an IP; disk total and CPU hard quotas need deployment controls |
| Unsafe serialization | Explicit JSON linear-model artifact; no pickle loading; allow_pickle=False on internal arrays | Checksums identify artifact content; they do not establish author trust or clinical validity |
| Sensitive image content | Text headers discarded; geometry/statistics allowlisted; consent attestation; deletion workflow | No automatic defacing or identity detection; user must de-identify files and neutralize names before upload |
| Stale jobs and data deletion | Persist status, fail interrupted runs on startup; wait for active jobs before deleting data/report records | No cross-resource DB/file transaction, automatic retention or backup erasure. Maintain consistent backups and reconcile orphan files |
| Supply-chain attack | Committed locks, dependency audits, CI secret scanning, pinned core actions | No full independent security assessment; native template/framework licenses remain separate |

## Operations

Bind local servers to loopback. Remote hosting requires HTTPS, a reviewed ingress, network restrictions, storage encryption/ACLs, secret provisioning, resource limits and organization-specific approval. Never expose a shared-password server as a public medical-image service. Only the owner role is implemented; RBAC is unnecessary within that explicit single-owner scope but mandatory before shared tenancy.

Password is configuration, not committed. Restart after rotating it; all sessions are cleared. Session tokens are hashed in SQLite. Logs omit paths, headers, uploads and exception payloads. Minimal audit rows record action, timestamp and opaque resource ID. No raw image header text is persisted; source checksum and supplied filename can still be sensitive. Exports may include synthetic participant split IDs. Keep reports and backups private.

Retention is manual: delete datasets through API to remove stored files and related job/model/report records. Audit IDs remain. Stop services before whole-workspace maintenance. Backup retention and secure media disposal must follow your institution's rules. This software does not declare statutory or medical-device compliance.
