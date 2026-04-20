#!/usr/bin/env python3
"""Sync STS2 card/relic art from the extracted PCK into public/images/sts2/.

For each entity in data/sts2/{cards,relics}.json, look for matching art in the
extracted PCK. If the image is missing in public/, copy it in and (for cards)
generate a downsized portrait + webp thumbnail.

Idempotent — existing images are left alone unless --force is passed.
"""
from __future__ import annotations

import argparse
import json
import os
import shutil
import sys
from pathlib import Path

try:
    from PIL import Image
except ImportError:
    print("Pillow not installed. Run: pip install Pillow", file=sys.stderr)
    sys.exit(1)


ROOT = Path(__file__).resolve().parents[2]
DATA_DIR = ROOT / "data" / "sts2"
PUBLIC_DIR = ROOT / "public" / "images" / "sts2"

# Card portrait display size (matches existing assets: 250x190)
CARD_PORTRAIT_SIZE = (250, 190)
# Card thumb size used by the card list (matches existing webp thumbs: 300x228)
CARD_THUMB_SIZE = (300, 228)


def index_images(base: Path) -> dict[str, Path]:
    """Index PNGs by stem, preferring non-beta versions over beta."""
    d: dict[str, Path] = {}
    if not base.exists():
        return d
    for p in base.rglob("*.png"):
        name = p.stem
        if name in d:
            existing = d[name]
            # Prefer release art over beta art
            if "/beta/" in str(existing) and "/beta/" not in str(p):
                d[name] = p
        else:
            d[name] = p
    return d


def copy_card_image(src: Path, dest: Path, force: bool = False) -> bool:
    """Copy + resize a card portrait to CARD_PORTRAIT_SIZE. Returns True if written."""
    if dest.exists() and not force:
        return False
    dest.parent.mkdir(parents=True, exist_ok=True)
    img = Image.open(src)
    img.thumbnail(CARD_PORTRAIT_SIZE, Image.LANCZOS)
    img.save(dest, optimize=True)
    return True


def make_card_thumb(src: Path, dest: Path, force: bool = False) -> bool:
    """Generate a webp thumbnail at CARD_THUMB_SIZE."""
    if dest.exists() and not force:
        return False
    dest.parent.mkdir(parents=True, exist_ok=True)
    img = Image.open(src)
    img.thumbnail(CARD_THUMB_SIZE, Image.LANCZOS)
    img.save(dest, format="WEBP", quality=80, method=6)
    return True


def copy_relic_image(src: Path, dest: Path, force: bool = False) -> bool:
    """Copy relic icon as-is (typically 256x256 native)."""
    if dest.exists() and not force:
        return False
    dest.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy(src, dest)
    return True


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--pck-dir",
        default=os.environ.get("STS2_PCK_DIR"),
        help="Extracted PCK directory (default: $STS2_PCK_DIR)",
    )
    parser.add_argument(
        "--force",
        action="store_true",
        help="Overwrite existing images instead of skipping them",
    )
    args = parser.parse_args()

    if not args.pck_dir:
        print("Error: --pck-dir or STS2_PCK_DIR required", file=sys.stderr)
        sys.exit(1)

    pck_root = Path(args.pck_dir).expanduser()
    if not pck_root.exists():
        print(f"Error: PCK dir does not exist: {pck_root}", file=sys.stderr)
        sys.exit(1)

    # Index available art
    card_portraits = index_images(pck_root / "images" / "packed" / "card_portraits")
    relic_images = index_images(pck_root / "images" / "relics")

    print(f"Indexed {len(card_portraits)} card portraits, {len(relic_images)} relic icons from PCK")

    # --- Cards ---
    cards_path = DATA_DIR / "cards.json"
    if not cards_path.exists():
        print(f"Skipping cards: {cards_path} not found")
    else:
        cards = json.loads(cards_path.read_text())
        public_cards = PUBLIC_DIR / "cards"
        public_thumbs = public_cards / "thumbs"

        copied = 0
        thumbed = 0
        missing = []
        for c in cards:
            cid = c.get("id")
            if not cid:
                continue
            snake = cid.lower()
            src = card_portraits.get(snake)
            if not src:
                # Only flag missing art for cards that reference an image
                if c.get("image_url"):
                    missing.append(cid)
                continue
            if copy_card_image(src, public_cards / f"{snake}.png", force=args.force):
                copied += 1
            if make_card_thumb(src, public_thumbs / f"{snake}.webp", force=args.force):
                thumbed += 1

        print(f"Cards: copied {copied} portrait(s), generated {thumbed} thumb(s)")
        if missing:
            print(f"  Warning: {len(missing)} card(s) have no portrait in PCK:")
            for cid in missing[:5]:
                print(f"    - {cid}")
            if len(missing) > 5:
                print(f"    ... and {len(missing) - 5} more")

    # --- Relics ---
    relics_path = DATA_DIR / "relics.json"
    if not relics_path.exists():
        print(f"Skipping relics: {relics_path} not found")
    else:
        relics = json.loads(relics_path.read_text())
        public_relics = PUBLIC_DIR / "relics"

        copied = 0
        missing = []
        for r in relics:
            rid = r.get("id")
            if not rid:
                continue
            snake = rid.lower()
            src = relic_images.get(snake)
            if not src:
                missing.append(rid)
                continue
            if copy_relic_image(src, public_relics / f"{snake}.png", force=args.force):
                copied += 1

        print(f"Relics: copied {copied} icon(s)")
        if missing:
            print(f"  Warning: {len(missing)} relic(s) have no icon in PCK:")
            for rid in missing[:5]:
                print(f"    - {rid}")
            if len(missing) > 5:
                print(f"    ... and {len(missing) - 5} more")


if __name__ == "__main__":
    main()
