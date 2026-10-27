"""Rasterize the original geometric brand for native icon formats using Pillow."""

from pathlib import Path

from PIL import Image, ImageDraw

image = Image.new("RGBA", (512, 512), "#10182b")
draw = ImageDraw.Draw(image)
mint = "#78e0cb"
left = [
    (236, 116),
    (211, 105),
    (175, 107),
    (144, 128),
    (120, 161),
    (110, 197),
    (117, 232),
    (97, 252),
    (95, 295),
    (111, 337),
    (145, 370),
    (181, 379),
    (205, 373),
    (236, 399),
    (236, 116),
]
for points in [left, [(512 - x, y) for x, y in left]]:
    draw.line(points, fill=mint, width=15, joint="curve")
for points in [[(131, 208), (184, 233), (160, 313)], [(184, 233), (236, 277)]]:
    draw.line(points, fill=mint, width=14, joint="curve")
    draw.line([(512 - x, y) for x, y in points], fill=mint, width=14, joint="curve")
folder = Path("assets/branding")
folder.mkdir(parents=True, exist_ok=True)
image.save(folder / "icon.png", optimize=True)
image.save(
    folder / "icon.ico", sizes=[(16, 16), (32, 32), (48, 48), (64, 64), (128, 128), (256, 256)]
)
for path in Path("mobile/android/app/src/main/res").glob("mipmap-*/*.png"):
    with Image.open(path) as existing:
        size = existing.size
    image.resize(size, Image.Resampling.LANCZOS).save(path, optimize=True)
image.resize((1024, 1024), Image.Resampling.LANCZOS).convert("RGB").save(
    "mobile/ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png", optimize=True
)
