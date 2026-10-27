# API reference

Run the API, then open [Swagger](http://127.0.0.1:8000/docs), [ReDoc](http://127.0.0.1:8000/redoc), or [OpenAPI JSON](http://127.0.0.1:8000/openapi.json). These links require your local server.

All `/api` routes except health/readiness/login require `Authorization: Bearer <session>`. Session lifetime: eight hours, invalidated at restart. The sole role is workspace-owner. There is no cookie authentication; ambient cookie CSRF does not apply. Never put tokens in URLs.

| Method / route | Behavior |
|---|---|
| GET /health, /ready | Liveness / DB schema readiness |
| POST /auth/login | JSON password → access_token, expires_in, role |
| POST /auth/logout | Revoke current session |
| POST /demo | Create two original synthetic datasets |
| GET /sample/csv or /sample/nifti | Download generated fixture |
| POST /datasets | Multipart file + X-Data-Consent: authorized-research |
| GET /datasets?offset=0&limit=50 | Bounded records, metadata, checksum |
| GET /datasets/{id}/volume?axis=2&index=-1 | Downsampled affine point cloud, slice, geometry |
| DELETE /datasets/{id} | Payload + associated jobs/reports; blocks active jobs |
| POST /jobs | JSON dataset_id, idempotency_key → job ID/status |
| GET /jobs?offset=0&limit=50 | History, status and computed reports |
| POST /jobs/{id}/cancel | Cancel queued job only |
| GET /jobs/{id}/report | Download completed JSON report |

Example (Python; do not print/store the token):

```python
import getpass, uuid, httpx

base = "http://127.0.0.1:8000/api"
with httpx.Client() as client:
    token = client.post(base + "/auth/login", json={"password": getpass.getpass()}).json()[
        "access_token"
    ]
    client.headers["Authorization"] = "Bearer " + token
    datasets = client.post(base + "/demo").json()
    response = client.post(
        base + "/jobs", json={"dataset_id": datasets[0]["id"], "idempotency_key": str(uuid.uuid4())}
    )
    print(response.json())  # UUID and queued/running status, not invented metrics
```

Example submission response: `{"id":"<generated UUID>","status":"queued"}`. Poll history until completed, failed or cancelled before requesting the report. A completed synthetic report includes metrics, baseline, intervals, split IDs, artifact coefficients, SHA-256 and versions. Image reports contain inspection metadata only.

Error semantics: 400 consent/request error; 401 unauthorized/expired; 404 missing; 409 state/idempotency conflict; 413 request/file too large; 422 invalid format/schema/geometry; 429 rate or queue limit. Request IDs and no-store headers support troubleshooting. Default limiter: 10 login attempts and 300 other requests per client IP per minute, single process. Reverse proxy IP is intentionally not trusted automatically.
