#!/usr/bin/env python3
"""Generate STS1 relic-list copies matching STS2's ~55px artwork in a 56px slot.
Run offline with Python + Pillow. Original assets and detail pages are untouched.
"""
import json
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
CANVAS = 128
ARTWORK = 126


def main():
    relics = json.loads((ROOT / 'data/sts1/relics.json').read_text())
    icons = sorted({r['icon'] for r in relics if r.get('icon')})
    target = ROOT / 'public/images/sts1/relics-list'
    target.mkdir(parents=True, exist_ok=True)
    for name in icons:
        image = Image.open(ROOT / 'public/images/sts1/relics' / name).convert('RGBA')
        bounds = image.getchannel('A').point([255 if a > 16 else 0 for a in range(256)]).getbbox()
        if bounds is None:
            raise ValueError(f'Empty relic artwork: {name}')
        art = image.crop(bounds)
        scale = ARTWORK / max(art.size)
        size = (max(1, round(art.width * scale)), max(1, round(art.height * scale)))
        art = art.resize(size, Image.Resampling.LANCZOS)
        output = Image.new('RGBA', (CANVAS, CANVAS))
        output.alpha_composite(art, ((CANVAS - size[0]) // 2, (CANVAS - size[1]) // 2))
        output.save(target / name, optimize=True)
    print(f'Generated {len(icons)} STS1 relic-list icons')


if __name__ == '__main__':
    main()
