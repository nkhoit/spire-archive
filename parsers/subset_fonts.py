#!/usr/bin/env python3
"""
Subset game fonts to woff2 containing only characters used in our data.
Run after updating localization data (e.g. after update.sh).

Usage: python3 parsers/subset_fonts.py

Requires: pip install fonttools brotli
Source fonts: $STS2_PCK_DIR/fonts/ (default /tmp/sts2-pck/fonts/)
Output: public/fonts/*.woff2
"""

import json
import os
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).parent.parent
DATA_DIR = ROOT / "data" / "sts2"
OUT_DIR = ROOT / "public" / "fonts"
PCK_DIR = Path(os.environ.get("STS2_PCK_DIR", "/tmp/sts2-pck"))
FONT_DIR = PCK_DIR / "fonts"

# Map: locale → (font source path, output woff2 name, weight)
FONT_MAP = {
    "ja": [
        ("jpn/NotoSansCJKjp-Medium.otf", "NotoSansCJKjp-Medium.woff2"),
        ("jpn/NotoSansCJKjp-Bold.otf", "NotoSansCJKjp-Bold.woff2"),
    ],
    "zh": [
        ("zhs/SourceHanSerifSC-Medium.otf", "SourceHanSerifSC-Medium.woff2"),
        ("zhs/SourceHanSerifSC-Bold.otf", "SourceHanSerifSC-Bold.woff2"),
    ],
    "ko": [
        ("kor/GyeonggiCheonnyeonBatangBold.ttf", "GyeonggiCheonnyeonBatangBold.woff2"),
    ],
    "ru": [
        ("rus/FiraSansExtraCondensed-Regular.ttf", "FiraSansExtraCondensed-Regular.woff2"),
        ("rus/FiraSansExtraCondensed-Bold.ttf", "FiraSansExtraCondensed-Bold.woff2"),
    ],
    "th": [
        ("tha/CSChatThaiUI.ttf", "CSChatThaiUI.woff2"),
    ],
}

# Kreon (Latin) — use a broad Unicode range instead of data-driven chars
KREON_RANGES = "U+0000-00FF,U+0100-024F,U+0300-036F,U+2000-206F,U+2190-21FF,U+2500-257F"


def get_chars(lang: str) -> set[str]:
    """Extract all unique characters used in a locale's data."""
    chars: set[str] = set()

    # Localization file
    loc_path = DATA_DIR / "localization" / f"{lang}.json"
    if loc_path.exists():
        data = json.loads(loc_path.read_text())
        _extract_strings(data, chars)

    # Also scan main data files for any locale-specific content
    for fname in ["cards.json", "relics.json", "potions.json", "powers.json",
                  "enchantments.json", "events.json", "monsters.json"]:
        fpath = DATA_DIR / fname
        if fpath.exists():
            data = json.loads(fpath.read_text())
            _extract_strings(data, chars)

    # Always include basic Latin + digits + punctuation as fallback
    chars.update("0123456789+-×.,:;!?()[]{}%/ \n")
    return chars


def _extract_strings(obj, chars: set[str]):
    if isinstance(obj, str):
        chars.update(obj)
    elif isinstance(obj, dict):
        for v in obj.values():
            _extract_strings(v, chars)
    elif isinstance(obj, list):
        for v in obj:
            _extract_strings(v, chars)


def write_unicodes_file(chars: set[str], path: Path):
    with open(path, "w") as f:
        for c in sorted(chars):
            cp = ord(c)
            if cp > 0x20:  # skip control chars
                f.write(f"U+{cp:04X}\n")


def subset(src: Path, dst: Path, unicodes_file: Path = None, unicodes: str = None):
    cmd = [
        "pyftsubset", str(src),
        "--flavor=woff2",
        f"--output-file={dst}",
    ]
    if unicodes_file:
        cmd.append(f"--unicodes-file={unicodes_file}")
    elif unicodes:
        cmd.append(f"--unicodes={unicodes}")

    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode != 0:
        print(f"  ⚠ pyftsubset failed for {src.name}: {result.stderr.strip()}")
        return False

    orig_size = src.stat().st_size
    new_size = dst.stat().st_size
    print(f"  ✓ {dst.name}: {orig_size // 1024}K → {new_size // 1024}K")
    return True


def main():
    OUT_DIR.mkdir(parents=True, exist_ok=True)

    # Check pyftsubset
    if subprocess.run(["which", "pyftsubset"], capture_output=True).returncode != 0:
        print("Error: pyftsubset not found. Install: pip install fonttools brotli")
        sys.exit(1)

    # Kreon (Latin)
    print("Kreon (Latin)...")
    for name in ["kreon_regular.ttf", "kreon_bold.ttf"]:
        src = FONT_DIR / name
        out_name = name.replace(".ttf", "").replace("_", "-") + ".woff2"
        if src.exists():
            subset(src, OUT_DIR / out_name, unicodes=KREON_RANGES)

    # Per-locale fonts
    for lang, fonts in FONT_MAP.items():
        print(f"\n{lang.upper()}...")
        chars = get_chars(lang)
        unicodes_file = Path(f"/tmp/chars_{lang}.txt")
        write_unicodes_file(chars, unicodes_file)
        print(f"  {len(chars)} unique characters")

        for src_rel, out_name in fonts:
            src = FONT_DIR / src_rel
            if not src.exists():
                print(f"  ⚠ Source not found: {src}")
                continue
            subset(src, OUT_DIR / out_name, unicodes_file=unicodes_file)

    print("\nDone! Fonts written to public/fonts/")


if __name__ == "__main__":
    main()
