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

# Perceptual-hash thresholds (dhash Hamming distance, 16-bit hash = max 256).
# PNG→PNG is fairly stable, but framing/cropping differences between game re-exports
# can push into the 20-30 range. WebP has additional encoding noise.
PHASH_THRESHOLD_PNG = 35
PHASH_THRESHOLD_WEBP = 40


def dhash(img: Image.Image, hash_size: int = 16) -> int:
    """Difference hash: robust to resize/compression, sensitive to composition changes."""
    img = img.convert("L").resize((hash_size + 1, hash_size), Image.LANCZOS)
    pixels = list(img.getdata())
    bits = 0
    for row in range(hash_size):
        for col in range(hash_size):
            left = pixels[row * (hash_size + 1) + col]
            right = pixels[row * (hash_size + 1) + col + 1]
            bits = (bits << 1) | (1 if left > right else 0)
    return bits


def hamming(a: int, b: int) -> int:
    return bin(a ^ b).count("1")



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


def copy_card_image(src: Path, dest: Path, force: bool = False, dry_run: bool = False) -> tuple[bool, str]:
    """Copy + resize a card portrait to CARD_PORTRAIT_SIZE.

    Returns (written, reason). Only writes when:
      - dest missing (reason='new')
      - force=True (reason='forced')
      - perceptual hash differs meaningfully from current dest (reason='changed')
    """
    src_img = Image.open(src)
    src_img.thumbnail(CARD_PORTRAIT_SIZE, Image.LANCZOS)

    if not dest.exists():
        reason = "new"
    elif force:
        reason = "forced"
    else:
        try:
            dest_img = Image.open(dest)
            dist = hamming(dhash(src_img), dhash(dest_img))
            if dist <= PHASH_THRESHOLD_PNG:
                return False, "unchanged"
            reason = f"changed (phash dist={dist})"
        except Exception:
            reason = "unreadable-dest"

    if dry_run:
        return True, reason + " [dry-run]"
    dest.parent.mkdir(parents=True, exist_ok=True)
    src_img.save(dest, optimize=True)
    return True, reason


def make_card_thumb(src: Path, dest: Path, force: bool = False, dry_run: bool = False) -> tuple[bool, str]:
    """Generate a webp thumbnail at CARD_THUMB_SIZE.

    Written when dest missing, force=True, or perceptual hash diverges.
    """
    src_img = Image.open(src)
    src_img.thumbnail(CARD_THUMB_SIZE, Image.LANCZOS)

    if not dest.exists():
        reason = "new"
    elif force:
        reason = "forced"
    else:
        try:
            dest_img = Image.open(dest)
            dist = hamming(dhash(src_img), dhash(dest_img))
            if dist <= PHASH_THRESHOLD_WEBP:
                return False, "unchanged"
            reason = f"changed (phash dist={dist})"
        except Exception:
            reason = "unreadable-dest"

    if dry_run:
        return True, reason + " [dry-run]"
    dest.parent.mkdir(parents=True, exist_ok=True)
    src_img.save(dest, format="WEBP", quality=80, method=6)
    return True, reason


def copy_relic_image(src: Path, dest: Path, force: bool = False, dry_run: bool = False) -> tuple[bool, str]:
    """Copy relic icon as-is (typically 256x256 native).

    Written when dest missing, force=True, or perceptual hash diverges.
    """
    if not dest.exists():
        reason = "new"
    elif force:
        reason = "forced"
    else:
        try:
            src_img = Image.open(src)
            dest_img = Image.open(dest)
            dist = hamming(dhash(src_img), dhash(dest_img))
            if dist <= PHASH_THRESHOLD_PNG:
                return False, "unchanged"
            reason = f"changed (phash dist={dist})"
        except Exception:
            reason = "unreadable-dest"

    if dry_run:
        return True, reason + " [dry-run]"
    dest.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy(src, dest)
    return True, reason


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
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Report what would change without writing anything",
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
        changed = []
        missing = []
        for c in cards:
            cid = c.get("id")
            if not cid:
                continue
            snake = cid.lower()
            src = card_portraits.get(snake)
            if not src:
                if c.get("image_url"):
                    missing.append(cid)
                continue
            written_p, reason_p = copy_card_image(src, public_cards / f"{snake}.png", force=args.force, dry_run=args.dry_run)
            if written_p:
                copied += 1
                if "changed" in reason_p:
                    changed.append((cid, "portrait", reason_p))
            written_t, reason_t = make_card_thumb(src, public_thumbs / f"{snake}.webp", force=args.force, dry_run=args.dry_run)
            if written_t:
                thumbed += 1
                if "changed" in reason_t:
                    changed.append((cid, "thumb", reason_t))

        print(f"Cards: wrote {copied} portrait(s), {thumbed} thumb(s)")
        if changed:
            print(f"  Refreshed art for {len(changed)} card asset(s):")
            for cid, kind, reason in changed[:20]:
                print(f"    - {cid} ({kind}) {reason}")
            if len(changed) > 20:
                print(f"    ... and {len(changed) - 20} more")
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
        changed = []
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
            written, reason = copy_relic_image(src, public_relics / f"{snake}.png", force=args.force, dry_run=args.dry_run)
            if written:
                copied += 1
                if "changed" in reason:
                    changed.append((rid, reason))

        print(f"Relics: wrote {copied} icon(s)")
        if changed:
            print(f"  Refreshed art for {len(changed)} relic(s):")
            for rid, reason in changed[:20]:
                print(f"    - {rid} {reason}")
            if len(changed) > 20:
                print(f"    ... and {len(changed) - 20} more")
        if missing:
            print(f"  Warning: {len(missing)} relic(s) have no icon in PCK:")
            for rid in missing[:5]:
                print(f"    - {rid}")
            if len(missing) > 5:
                print(f"    ... and {len(missing) - 5} more")


if __name__ == "__main__":
    main()
