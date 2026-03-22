"""Relic parser for STS1 decompiled Java source."""

import argparse
import json
import os
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from utils import (
    DEFAULT_LOCALIZATION_DIR,
    DEFAULT_SOURCE_DIR,
    RELIC_TIER_MAP,
    clean_description,
    extract_static_id,
    find_java_files,
    load_localization,
    read_java,
    to_upper_snake,
)

# Character-specific relic class names or patterns
CHARACTER_RELIC_CLASSES = {
    "IroncladRelic": "ironclad",
    "SilentRelic": "silent",
    "DefectRelic": "defect",
    "WatcherRelic": "watcher",
}

# Known character-specific starter relics
KNOWN_CHARACTER_RELICS = {
    "Burning Blood": "ironclad",
    "Ring of the Snake": "silent",
    "Cracked Core": "defect",
    "Pure Water": "watcher",
    # Boss relics per character
    "Black Blood": "ironclad",
    "Ring of the Serpent": "silent",
    "FrozenCore": "defect",
    "HolyWater": "watcher",
    # Other character-specific
    "PaperFrog": "silent",
    "PaperKrane": "silent",
    "RedMask": "silent",
    "DataDisk": "defect",
    "GoldPlatedCables": "defect",
    "NuclearBattery": "defect",
    "VioletLotus": "watcher",
    "CaptainsWheel": "watcher",
    "Damaru": "watcher",
    "MindBloom": "watcher",
    "Matryoshka": None,
}


def parse_relics(source_dir: str, localization_dir: str) -> list[dict]:
    loc = load_localization(localization_dir, "relics.json")
    relics_dir = os.path.join(source_dir, "relics")
    java_files = find_java_files(relics_dir, recursive=False)

    relics = []
    seen_ids = set()

    for jf in java_files:
        class_name = os.path.basename(jf).replace(".java", "")
        if class_name.startswith("Abstract"):
            continue

        source = read_java(jf)
        
        relic_id_raw = extract_static_id(source)
        if not relic_id_raw:
            continue
        
        relic_id = to_upper_snake(relic_id_raw)
        if relic_id in seen_ids:
            continue
        if "DEPRECATED" in relic_id:
            continue
        # Skip TEST relics
        if relic_id_raw.startswith("TEST") or relic_id.startswith("TEST"):
            continue
        seen_ids.add(relic_id)

        # Localization
        loc_entry = loc.get(relic_id_raw, {})
        name = loc_entry.get("NAME", relic_id_raw)
        # Skip if name is empty
        if not name or not name.strip():
            continue
        descriptions = loc_entry.get("DESCRIPTIONS", [])
        flavor = loc_entry.get("FLAVOR", None)

        # Build description from DESCRIPTIONS array
        # The game typically uses DESCRIPTIONS[0] + value + DESCRIPTIONS[1] pattern
        # Try to extract the value from getUpdatedDescription
        desc_text = ""
        if descriptions:
            # Check getUpdatedDescription for the pattern
            upd_m = re.search(
                r"getUpdatedDescription\s*\(\s*\)\s*\{[^}]+return\s+(.+?);",
                source,
                re.DOTALL
            )
            if upd_m:
                # Build description by looking at what values are inserted
                upd_expr = upd_m.group(1).strip()
                # Replace DESCRIPTIONS[N] references with actual text
                for i, d in enumerate(descriptions):
                    upd_expr = upd_expr.replace(f"this.DESCRIPTIONS[{i}]", d)
                    upd_expr = upd_expr.replace(f"DESCRIPTIONS[{i}]", d)
                    upd_expr = upd_expr.replace(f'"{d}"', d)
                # Extract constants
                # Find integer constants in the class
                constants = {}
                for cm in re.finditer(r"private static final int (\w+)\s*=\s*(-?\d+)", source):
                    constants[cm.group(1)] = int(cm.group(2))
                for k, v in constants.items():
                    upd_expr = upd_expr.replace(k, str(v))
                # Remove string concat operators
                upd_expr = re.sub(r'\s*\+\s*"', "", upd_expr)
                upd_expr = re.sub(r'"\s*\+\s*', "", upd_expr)
                upd_expr = upd_expr.replace('"', "").replace("+", "")
                desc_text = upd_expr.strip()
            else:
                desc_text = "".join(descriptions)
        
        desc_text = clean_description(desc_text)

        # Tier
        tier_m = re.search(r"RelicTier\.(\w+)", source)
        tier_raw = tier_m.group(1) if tier_m else ""
        tier = RELIC_TIER_MAP.get(tier_raw, tier_raw.capitalize() if tier_raw else "")

        # Color (character-specific)
        color = None
        # Check if it's in known map
        if relic_id_raw in KNOWN_CHARACTER_RELICS:
            color = KNOWN_CHARACTER_RELICS[relic_id_raw]
        else:
            # Check superclass or package hints
            for char_class, char_color in CHARACTER_RELIC_CLASSES.items():
                if f"extends {char_class}" in source:
                    color = char_color
                    break
            # Check for character-specific imports or checks
            if color is None:
                if "IroncladCard" in source or "AbstractIronclad" in source:
                    color = "ironclad"
                elif "TheSilent" in source or "SilentCard" in source:
                    color = "silent"
                elif "TheDefect" in source or "DefectCard" in source:
                    color = "defect"
                elif "Watcher" in source or "WatcherCard" in source:
                    color = "watcher"

        # Counter
        counter = None
        counter_m = re.search(r"this\.counter\s*=\s*(-?\d+)", source)
        if counter_m:
            counter = int(counter_m.group(1))

        relics.append({
            "id": relic_id,
            "name": name,
            "description": desc_text,
            "flavor": clean_description(flavor) if flavor else None,
            "tier": tier,
            "color": color,
            "counter": counter,
            "image_url": None,
        })

    relics.sort(key=lambda r: r["id"])
    return relics


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Parse STS1 relics")
    parser.add_argument("--source-dir", default=DEFAULT_SOURCE_DIR)
    parser.add_argument("--localization-dir", default=DEFAULT_LOCALIZATION_DIR)
    parser.add_argument("--output", default=None)
    args = parser.parse_args()

    relics = parse_relics(args.source_dir, args.localization_dir)
    out = json.dumps(relics, indent=2, ensure_ascii=False)
    if args.output:
        with open(args.output, "w") as f:
            f.write(out)
    else:
        print(out)
