"""Parser for smaller entity types: keywords, orbs, stances, blights, characters, achievements."""

import argparse
import json
import os
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from utils import (
    DEFAULT_LOCALIZATION_DIR,
    DEFAULT_SOURCE_DIR,
    clean_description,
    find_java_files,
    load_localization,
    read_java,
    to_upper_snake,
)


def parse_keywords(localization_dir: str) -> list[dict]:
    """Parse from localization/keywords.json only."""
    raw = load_localization(localization_dir, "keywords.json")
    # The keywords.json has a top-level "Game Dictionary" key
    if "Game Dictionary" in raw:
        raw = raw["Game Dictionary"]
    # Filter out non-keyword entries
    keywords = []
    for k, v in raw.items():
        if k == "TEXT":
            continue
        if not isinstance(v, dict):
            continue
        names = v.get("NAMES", [k])
        description = clean_description(v.get("DESCRIPTION", ""))
        keywords.append({
            "id": k,
            "names": names,
            "description": description,
        })
    keywords.sort(key=lambda k: k["id"])
    return keywords


def parse_orbs(source_dir: str, localization_dir: str) -> list[dict]:
    orbs_loc = load_localization(localization_dir, "orbs.json")
    orbs_dir = os.path.join(source_dir, "orbs")
    java_files = find_java_files(orbs_dir, recursive=False)

    orbs = []
    seen_ids = set()

    for jf in java_files:
        class_name = os.path.basename(jf).replace(".java", "")
        if class_name.startswith("Abstract"):
            continue

        source = read_java(jf)

        # Get ID
        id_m = re.search(r'(?:ORB_ID|public static final String ID)\s*=\s*"([^"]+)"', source)
        if not id_m:
            # Try this.ID = "..."
            id_m = re.search(r'this\.ID\s*=\s*"([^"]+)"', source)
        if not id_m:
            continue

        orb_id_raw = id_m.group(1)
        orb_id = to_upper_snake(orb_id_raw)
        if orb_id in seen_ids:
            continue
        seen_ids.add(orb_id)

        loc_entry = orbs_loc.get(orb_id_raw, {})
        name = loc_entry.get("NAME", orb_id_raw)
        descriptions = loc_entry.get("DESCRIPTIONS", [])
        desc = clean_description(" ".join(descriptions))

        # Extract passive and evoke amounts
        passive_m = re.search(r"this\.basePassiveAmount\s*=\s*(-?\d+)", source)
        evoke_m = re.search(r"this\.baseEvokeAmount\s*=\s*(-?\d+)", source)

        orbs.append({
            "id": orb_id,
            "name": name,
            "description": desc,
            "passive_amount": int(passive_m.group(1)) if passive_m else None,
            "evoke_amount": int(evoke_m.group(1)) if evoke_m else None,
        })

    orbs.sort(key=lambda o: o["id"])
    return orbs


def parse_stances(source_dir: str, localization_dir: str) -> list[dict]:
    stances_loc = load_localization(localization_dir, "stances.json")
    stances_dir = os.path.join(source_dir, "stances")
    java_files = find_java_files(stances_dir, recursive=False)

    stances = []
    seen_ids = set()

    for jf in java_files:
        class_name = os.path.basename(jf).replace(".java", "")
        if class_name.startswith("Abstract"):
            continue

        source = read_java(jf)

        id_m = re.search(r'(?:STANCE_ID|public static final String ID)\s*=\s*"([^"]+)"', source)
        if not id_m:
            id_m = re.search(r'this\.ID\s*=\s*"([^"]+)"', source)
        if not id_m:
            # Use class name
            stance_id_raw = class_name.replace("Stance", "")
        else:
            stance_id_raw = id_m.group(1)

        stance_id = to_upper_snake(stance_id_raw)
        if stance_id in seen_ids:
            continue
        seen_ids.add(stance_id)

        loc_entry = stances_loc.get(stance_id_raw, stances_loc.get(class_name, {}))
        name = loc_entry.get("NAME", stance_id_raw)
        descriptions = loc_entry.get("DESCRIPTIONS", [])
        desc = clean_description(" ".join(descriptions))

        stances.append({
            "id": stance_id,
            "name": name,
            "description": desc,
        })

    stances.sort(key=lambda s: s["id"])
    return stances


def parse_blights(source_dir: str, localization_dir: str) -> list[dict]:
    blights_loc = load_localization(localization_dir, "blights.json")
    blights_dir = os.path.join(source_dir, "blights")
    java_files = find_java_files(blights_dir, recursive=False)

    blights = []
    seen_ids = set()

    for jf in java_files:
        class_name = os.path.basename(jf).replace(".java", "")
        if class_name.startswith("Abstract"):
            continue

        source = read_java(jf)

        id_m = re.search(r'(?:BLIGHT_ID|public static final String ID)\s*=\s*"([^"]+)"', source)
        if not id_m:
            continue

        blight_id_raw = id_m.group(1)
        blight_id = to_upper_snake(blight_id_raw)
        if blight_id in seen_ids:
            continue
        seen_ids.add(blight_id)

        loc_entry = blights_loc.get(blight_id_raw, {})
        name = loc_entry.get("NAME", blight_id_raw)
        descriptions = loc_entry.get("DESCRIPTIONS", [])
        flavor = loc_entry.get("FLAVOR", None)
        desc = clean_description(" ".join(descriptions))

        blights.append({
            "id": blight_id,
            "name": name,
            "description": desc,
            "flavor": clean_description(flavor) if flavor else None,
        })

    blights.sort(key=lambda b: b["id"])
    return blights


def parse_characters(source_dir: str, localization_dir: str) -> list[dict]:
    """Parse character data from localization and class files."""
    chars_loc = load_localization(localization_dir, "characters.json")
    chars_dir = os.path.join(source_dir, "characters")
    java_files = find_java_files(chars_dir, recursive=False)

    # Known character class names to loc keys
    CLASS_TO_LOC = {
        "Ironclad": "Ironclad",
        "TheSilent": "Silent",
        "Defect": "Defect",
        "Watcher": "Watcher",
    }

    characters = []
    seen_ids = set()

    for jf in java_files:
        class_name = os.path.basename(jf).replace(".java", "")
        if class_name in ("AbstractPlayer", "AnimatedNpc", "CharacterManager"):
            continue

        source = read_java(jf)

        # Get PlayerClass enum value from super call
        player_class_m = re.search(r"PlayerClass\.(\w+)", source)
        if not player_class_m:
            continue

        player_class = player_class_m.group(1)
        char_id = player_class  # e.g. IRONCLAD, THE_SILENT

        if char_id in seen_ids:
            continue
        seen_ids.add(char_id)

        # Try localization
        loc_key = CLASS_TO_LOC.get(class_name, class_name)
        loc_entry = chars_loc.get(loc_key, chars_loc.get(class_name, {}))
        # Characters have NAME or NAMES array
        names = loc_entry.get("NAMES", [loc_entry.get("NAME", class_name)])
        name = names[0] if names else class_name

        # Starting HP: from CharSelectInfo constructor call
        # CharSelectInfo(name, desc, hp, maxHp, gold, handSize, orbSlots, ...)
        csi_m = re.search(r"new CharSelectInfo\([^,]+,\s*[^,]+,\s*(\d+)\s*,\s*(\d+)", source)
        hp = int(csi_m.group(1)) if csi_m else None

        # Energy per turn: typically 3 for all, or override from source
        energy_m = re.search(r"(?:ENERGY_PER_TURN|energyPerTurn)\s*=\s*(\d+)", source)
        energy = int(energy_m.group(1)) if energy_m else 3

        # Starting relics - from getStartingRelics or similar
        starter_relics = re.findall(r"retVal\.add\s*\(\s*\"([^\"]+)\"\s*\)", source)
        if not starter_relics:
            starter_relics = re.findall(r"list\.add\s*\(\s*\"([^\"]+)\"\s*\)", source)

        characters.append({
            "id": char_id,
            "name": name,
            "hp": hp,
            "energy_per_turn": energy,
            "starting_relics": starter_relics,
        })

    characters.sort(key=lambda c: c["id"])
    return characters


def parse_achievements(localization_dir: str) -> list[dict]:
    raw = load_localization(localization_dir, "achievements.json")
    achievements = []
    for ach_id, v in raw.items():
        if not isinstance(v, dict):
            continue
        achievements.append({
            "id": ach_id,
            "name": v.get("NAME", ach_id),
            "description": clean_description(v.get("DESCRIPTION", "")),
        })
    achievements.sort(key=lambda a: a["id"])
    return achievements


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Parse STS1 misc entities")
    parser.add_argument("--source-dir", default=DEFAULT_SOURCE_DIR)
    parser.add_argument("--localization-dir", default=DEFAULT_LOCALIZATION_DIR)
    parser.add_argument("--entity", choices=["keywords", "orbs", "stances", "blights", "characters", "achievements"], required=True)
    args = parser.parse_args()

    if args.entity == "keywords":
        data = parse_keywords(args.localization_dir)
    elif args.entity == "orbs":
        data = parse_orbs(args.source_dir, args.localization_dir)
    elif args.entity == "stances":
        data = parse_stances(args.source_dir, args.localization_dir)
    elif args.entity == "blights":
        data = parse_blights(args.source_dir, args.localization_dir)
    elif args.entity == "characters":
        data = parse_characters(args.source_dir, args.localization_dir)
    elif args.entity == "achievements":
        data = parse_achievements(args.localization_dir)

    print(json.dumps(data, indent=2, ensure_ascii=False))
