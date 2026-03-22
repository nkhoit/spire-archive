"""Potion parser for STS1 decompiled Java source."""

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
    clean_description,
    find_java_files,
    load_localization,
    read_java,
    to_upper_snake,
)


def parse_potions(source_dir: str, localization_dir: str) -> list[dict]:
    loc = load_localization(localization_dir, "potions.json")
    potions_dir = os.path.join(source_dir, "potions")
    java_files = find_java_files(potions_dir, recursive=False)

    potions = []
    seen_ids = set()

    for jf in java_files:
        class_name = os.path.basename(jf).replace(".java", "")
        if class_name.startswith("Abstract"):
            continue

        source = read_java(jf)

        # Get potion ID (uses POTION_ID instead of ID)
        id_m = re.search(r'(?:public static final String\s+(?:POTION_ID|ID))\s*=\s*"([^"]+)"', source)
        if not id_m:
            continue

        potion_id_raw = id_m.group(1)
        potion_id = to_upper_snake(potion_id_raw)
        if potion_id in seen_ids:
            continue
        if "DEPRECATED" in potion_id:
            continue
        seen_ids.add(potion_id)

        # Localization
        loc_entry = loc.get(potion_id_raw, {})
        name = loc_entry.get("NAME", potion_id_raw)
        descriptions = loc_entry.get("DESCRIPTIONS", [])

        # Build description
        # Try initializeData for how it's formatted
        init_m = re.search(r"initializeData\s*\(\s*\)[^{]*\{(.+?)\n    \}", source, re.DOTALL)
        potency_m = re.search(r"getPotency\s*\(\s*(?:int\s+\w+)?\s*\)\s*\{[^}]*return\s+(-?\d+)", source)
        potency = int(potency_m.group(1)) if potency_m else None

        desc_text = ""
        if descriptions:
            if potency is not None and len(descriptions) >= 2:
                desc_text = descriptions[0] + str(potency) + "".join(descriptions[1:])
            else:
                desc_text = "".join(descriptions)
        desc_text = clean_description(desc_text)

        # Rarity
        rarity_m = re.search(r"PotionRarity\.(\w+)", source)
        rarity_raw = rarity_m.group(1) if rarity_m else ""
        rarity_map = {"COMMON": "Common", "UNCOMMON": "Uncommon", "RARE": "Rare", "PLACEHOLDER": "Special"}
        rarity = rarity_map.get(rarity_raw, rarity_raw.capitalize() if rarity_raw else "Common")

        # is_thrown
        is_thrown = bool(re.search(r"this\.isThrown\s*=\s*true", source))

        # target
        target = "None"
        if re.search(r"this\.targetRequired\s*=\s*true", source):
            target = "Enemy"
        elif is_thrown:
            target = "Enemy"

        # Color (character-specific)
        color = None
        if re.search(r"PlayerClass\.IRONCLAD|IroncladCard|AbstractIronclad", source):
            color = "ironclad"
        elif re.search(r"PlayerClass\.THE_SILENT|TheSilent|SilentCard", source):
            color = "silent"
        elif re.search(r"PlayerClass\.DEFECT|TheDefect|DefectCard", source):
            color = "defect"
        elif re.search(r"PlayerClass\.WATCHER|TheWatcher|WatcherCard", source):
            color = "watcher"

        potions.append({
            "id": potion_id,
            "name": name,
            "description": desc_text,
            "rarity": rarity,
            "color": color,
            "is_thrown": is_thrown,
            "target": target,
            "image_url": None,
        })

    potions.sort(key=lambda p: p["id"])
    return potions


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Parse STS1 potions")
    parser.add_argument("--source-dir", default=DEFAULT_SOURCE_DIR)
    parser.add_argument("--localization-dir", default=DEFAULT_LOCALIZATION_DIR)
    parser.add_argument("--output", default=None)
    args = parser.parse_args()

    potions = parse_potions(args.source_dir, args.localization_dir)
    out = json.dumps(potions, indent=2, ensure_ascii=False)
    if args.output:
        with open(args.output, "w") as f:
            f.write(out)
    else:
        print(out)
