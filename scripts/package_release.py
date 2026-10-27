"""Manifest real built artifacts; never synthesize platform binaries."""

import hashlib
import json
import subprocess
from datetime import datetime, timezone
from pathlib import Path

folder = Path("releases/artifacts")
folder.mkdir(parents=True, exist_ok=True)
assets = []
for path in sorted(folder.iterdir()):
    if path.is_file() and path.name not in ["SHA256SUMS.txt", "release-manifest.json"]:
        assets.append(
            {
                "name": path.name,
                "bytes": path.stat().st_size,
                "sha256": hashlib.sha256(path.read_bytes()).hexdigest(),
            }
        )
if not assets or any(a["bytes"] == 0 for a in assets):
    raise SystemExit("No usable artifacts; refusing manifest")
(folder / "SHA256SUMS.txt").write_text(
    "".join(f"{a['sha256']}  {a['name']}\n" for a in assets), encoding="utf-8"
)
(folder / "release-manifest.json").write_text(
    json.dumps(
        {
            "application": "NeuroMap AI",
            "version": json.loads(Path("frontend/package.json").read_text())["version"],
            "source_commit": subprocess.check_output(
                ["git", "rev-parse", "HEAD"], text=True
            ).strip(),
            "manifest_created_utc": datetime.now(timezone.utc).isoformat(),
            "assets": assets,
            "clinical_model": False,
        },
        indent=2,
    ),
    encoding="utf-8",
)
