"""Card parser for STS1 decompiled Java source."""

import argparse
import json
import os


def _apply_delta(base, delta_str):
    """Apply a delta like '+4' to a base value."""
    if base is None or delta_str is None:
        return base
    delta_str = str(delta_str)
    if delta_str.startswith('+'):
        return base + int(delta_str[1:])
    elif delta_str.startswith('-'):
        return base - int(delta_str[1:])
    return int(delta_str)
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from utils import (
    DEFAULT_LOCALIZATION_DIR,
    DEFAULT_SOURCE_DIR,
    CARD_COLOR_MAP,
    CARD_RARITY_MAP,
    CARD_TARGET_MAP,
    CARD_TYPE_MAP,
    clean_description,
    extract_base_fields,
    extract_static_id,
    extract_upgrade_fields,
    extract_cost_from_source,
    find_java_files,
    load_localization,
    read_java,
    to_upper_snake,
)

CARD_DIRS = ["red", "green", "blue", "purple", "colorless", "status", "curses"]


def parse_cards(source_dir: str, localization_dir: str) -> list[dict]:
    loc = load_localization(localization_dir, "cards.json")

    cards = []
    seen_ids = set()
    cards_root = os.path.join(source_dir, "cards")

    for color_dir in CARD_DIRS:
        dir_path = os.path.join(cards_root, color_dir)
        java_files = find_java_files(dir_path, recursive=False)
        for jf in java_files:
            class_name = os.path.basename(jf).replace(".java", "")
            if class_name.startswith("Abstract") or class_name in (
                "CardGroup", "CardModUNUSED", "CardQueueItem", "CardSave",
                "DamageInfo", "DescriptionLine", "SoulGroup", "Soul",
            ):
                continue

            source = read_java(jf)
            
            # Skip deprecated
            if "DEPRECATED" in source and re.search(r'public static final String ID\s*=\s*"DEPRECATED', source):
                continue
            if "DEPRECATED" in source and re.search(r'NAME\s*=\s*".*DEPRECATED', source):
                continue

            card_id_raw = extract_static_id(source)
            if not card_id_raw:
                continue
            
            card_id = to_upper_snake(card_id_raw)
            if card_id in seen_ids:
                continue
            seen_ids.add(card_id)

            # Get localization
            loc_entry = loc.get(card_id_raw, {})
            name = loc_entry.get("NAME", card_id_raw)

            # Extract constructor info
            cost = extract_cost_from_source(source, class_name)

            # Card type/color/rarity/target from super() call
            super_m = re.search(r"super\s*\((.+?)\)\s*;", source, re.DOTALL)
            card_type_raw = ""
            card_color_raw = ""
            card_rarity_raw = ""
            card_target_raw = ""
            if super_m:
                raw = re.sub(r"\s+", " ", super_m.group(1))
                tm = re.search(r"CardType\.(\w+)", raw)
                if tm: card_type_raw = tm.group(1)
                cm = re.search(r"CardColor\.(\w+)", raw)
                if cm: card_color_raw = cm.group(1)
                rm = re.search(r"CardRarity\.(\w+)", raw)
                if rm: card_rarity_raw = rm.group(1)
                tgm = re.search(r"CardTarget\.(\w+)", raw)
                if tgm: card_target_raw = tgm.group(1)

            card_type = CARD_TYPE_MAP.get(card_type_raw, card_type_raw.capitalize() if card_type_raw else "")
            card_rarity = CARD_RARITY_MAP.get(card_rarity_raw, card_rarity_raw.capitalize() if card_rarity_raw else "")
            card_target = CARD_TARGET_MAP.get(card_target_raw, card_target_raw.capitalize() if card_target_raw else "")

            # Color: use CardColor from Java source for status cards (they are COLORLESS, not "status")
            # For other dirs, use directory name as primary
            if color_dir == "red":
                card_color = "ironclad"
            elif color_dir == "green":
                card_color = "silent"
            elif color_dir == "blue":
                card_color = "defect"
            elif color_dir == "purple":
                card_color = "watcher"
            elif color_dir == "colorless":
                card_color = "colorless"
            elif color_dir == "curses":
                card_color = "curse"
            elif color_dir == "status":
                # Use actual CardColor from Java source; status cards have COLORLESS
                card_color = CARD_COLOR_MAP.get(card_color_raw, "colorless")
            else:
                card_color = CARD_COLOR_MAP.get(card_color_raw, card_color_raw.lower() if card_color_raw else "")

            base = extract_base_fields(source)
            upgrade = extract_upgrade_fields(source)

            base_damage = base.get("baseDamage")
            base_block = base.get("baseBlock")
            base_magic = base.get("baseMagicNumber")

            # Raw description
            raw_desc = loc_entry.get("DESCRIPTION", "")
            description = clean_description(raw_desc, base_damage, base_block, base_magic)

            # Upgrade description — resolve !D!/!B!/!M! with upgraded values
            upg_desc_raw = loc_entry.get("UPGRADE_DESCRIPTION")
            upgrade_description = None
            if upg_desc_raw and upgrade.get("has_upgrade_desc"):
                upg_damage = _apply_delta(base_damage, upgrade.get("damage"))
                upg_block = _apply_delta(base_block, upgrade.get("block"))
                upg_magic = _apply_delta(base_magic, upgrade.get("magic_number"))
                upgrade_description = clean_description(upg_desc_raw, upg_damage, upg_block, upg_magic)

            # Multi-hit: detect from source
            hit_count = None
            hc_m = re.search(r"this\.timesHit\s*=\s*(\d+)", source)
            if not hc_m:
                hc_m = re.search(r"this\.baseMagicNumber\s*=\s*(\d+).*?(?:for\s*\(int|times)", source, re.DOTALL)
            # Also check for multi-hit patterns in use()
            multi_m = re.search(r"for\s*\(int\s+\w+\s*=\s*0\s*;\s*\w+\s*<\s*this\.magicNumber", source)
            if multi_m and base_magic:
                hit_count = base_magic

            card = {
                "id": card_id,
                "name": name,
                "description": description,
                "cost": cost,
                "type": card_type,
                "rarity": card_rarity,
                "target": card_target,
                "color": card_color,
                "damage": base_damage,
                "block": base_block,
                "magic_number": base_magic,
                "hit_count": hit_count,
                "exhaust": base.get("exhaust", False),
                "ethereal": base.get("isEthereal", False),
                "innate": base.get("isInnate", False),
                "retain": base.get("retain", False),
                "self_retain": base.get("selfRetain", False),
                "purge_on_use": base.get("purgeOnUse", False),
                "tags": sorted(base.get("tags", [])),
                "keywords": [],
                "upgrade": {
                    "cost": upgrade.get("cost"),
                    "damage": upgrade.get("damage"),
                    "block": upgrade.get("block"),
                    "magic_number": upgrade.get("magic_number"),
                    "description": upgrade_description,
                },
            }
            cards.append(card)

    cards.sort(key=lambda c: c["id"])
    return cards


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Parse STS1 cards")
    parser.add_argument("--source-dir", default=DEFAULT_SOURCE_DIR)
    parser.add_argument("--localization-dir", default=DEFAULT_LOCALIZATION_DIR)
    parser.add_argument("--output", default=None)
    args = parser.parse_args()

    cards = parse_cards(args.source_dir, args.localization_dir)
    out = json.dumps(cards, indent=2, ensure_ascii=False)
    if args.output:
        with open(args.output, "w") as f:
            f.write(out)
    else:
        print(out)
