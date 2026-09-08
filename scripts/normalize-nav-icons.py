#!/usr/bin/env python3
"""Generate navigation-only icons. Run with Python + Pillow; no build dependency.

Original nav assets stay untouched. Trim transparent padding, preserve aspect
ratio, and center visible artwork on a common canvas. Commit generated PNGs.
"""
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
CANVAS = 128
ARTWORK = 112
ALPHA_THRESHOLD = 16


def normalize(source: Path, target: Path) -> None:
    image = Image.open(source).convert("RGBA")
    bounds = image.getchannel("A").point(
        [255 if alpha > ALPHA_THRESHOLD else 0 for alpha in range(256)]
    ).getbbox()
    if bounds is None:
        raise ValueError(f"Empty artwork: {source}")
    artwork = image.crop(bounds)
    scale = ARTWORK / max(artwork.size)
    size = (max(1, round(artwork.width * scale)), max(1, round(artwork.height * scale)))
    artwork = artwork.resize(size, Image.Resampling.LANCZOS)
    result = Image.new("RGBA", (CANVAS, CANVAS))
    result.alpha_composite(artwork, ((CANVAS - size[0]) // 2, (CANVAS - size[1]) // 2))
    target.parent.mkdir(parents=True, exist_ok=True)
    result.save(target, optimize=True)
    print(f"{target.relative_to(ROOT)}: {image.size} -> visible {size}")


if __name__ == "__main__":
    for game in ("sts1", "sts2"):
        for source in sorted((ROOT / "public/images" / game / "nav").glob("*.png")):
            normalize(source, source.parent.parent / "nav-normalized" / source.name)
