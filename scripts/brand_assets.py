"""Generate original lightweight vector branding. No external artwork."""

import math
from pathlib import Path

folder = Path("assets/branding")
folder.mkdir(parents=True, exist_ok=True)


def graphic(height, footer=False):
    paths = []
    for j in range(13):
        points = []
        for i in range(110):
            x = 760 + i * 3.5
            y = height / 2 + math.sin(i / 15 + j / 5) * (25 + j * 3) + (j - 6) * 7
            points.append(f"{x:.1f},{y:.1f}")
        paths.append(
            f'<polyline points="{" ".join(points)}" fill="none" stroke="url(#line)" stroke-width="1.2" opacity="{0.25 + j * 0.04}"/>'
        )
    title = "NEUROMAP AI" if not footer else "BETTER QUESTIONS. TRACEABLE SCIENCE."
    subtitle = (
        "Explore brain imaging. Understand model predictions. Advance reproducible neuroscience."
        if not footer
        else "Research first. Evidence always."
    )
    return f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 {height}" role="img" aria-label="NeuroMap AI original scientific brand banner">
<defs><linearGradient id="bg"><stop stop-color="#101b30"/><stop offset="1" stop-color="#09111f"/></linearGradient><linearGradient id="line"><stop stop-color="#80e6cf"/><stop offset="1" stop-color="#9c91e8"/></linearGradient></defs>
<rect width="1200" height="{height}" rx="18" fill="url(#bg)"/><path d="M0 {height - 2}H1200" stroke="#365851"/>{"".join(paths)}
<g font-family="Segoe UI,Arial,sans-serif"><text x="52" y="{42 if footer else 62}" fill="#80e6cf" font-size="10" letter-spacing="4">REPRODUCIBLE NEUROIMAGING RESEARCH</text><text x="50" y="{77 if footer else 142}" fill="#eef4ff" font-size="{23 if footer else 56}" font-weight="600" letter-spacing="{-0.3 if footer else -2}">{title}</text><text x="52" y="{104 if footer else 186}" fill="#a5b4cb" font-size="{12 if footer else 15}">{subtitle}</text>{"" if footer else '<text x="52" y="250" fill="#80e6cf" font-size="11" letter-spacing="2">IMAGING  /  EXPERIMENTS  /  EVIDENCE</text>'}</g></svg>'''


(folder / "hero.svg").write_text(graphic(300), encoding="utf-8")
(folder / "footer.svg").write_text(graphic(140, True), encoding="utf-8")
