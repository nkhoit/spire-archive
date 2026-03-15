"""Monster parser for STS1 decompiled Java source."""

import argparse
import json
import os
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from utils import (
    DEFAULT_LOCALIZATION_DIR,
    DEFAULT_SOURCE_DIR,
    extract_static_id,
    find_java_files,
    load_localization,
    read_java,
    to_upper_snake,
)

MONSTER_ACTS = ["exordium", "city", "beyond", "ending"]


def infer_monster_type(class_name: str, source: str, act: str) -> str:
    """Infer Normal/Elite/Boss/Minion from class hints."""
    # Boss indicators
    if re.search(r"extends\s+AbstractBoss", source):
        return "Boss"
    # Minion indicators 
    if re.search(r"isMinion\s*=\s*true|this\.isMinion", source):
        return "Minion"
    # Check class name for common boss names
    boss_names = [
        "SlimeBoss", "Hexaghost", "TheGuardian", "Champ", "Automaton", "Collector",
        "CorruptHeart", "AwakenedOne", "TimeEater", "DonuAndDeca", "GiantHead",
        "BronzeAutomaton", "ShieldAndSpear", "Nemesis",
    ]
    if class_name in boss_names:
        return "Boss"
    elite_names = [
        "GremlinNob", "Lagavulin", "Sentries", "BookOfStabbing",
        "BronzeOrb", "Spiker", "CenturionAndMystic", "CultistAndChosen", "TwoThieves",
        "BanditLeader", "Transient", "WrithingMass", "TheMaw", "GiantHead",
        "JawWormHorde", "Reptomancer", "Taskmaster",
    ]
    if class_name in elite_names:
        return "Elite"
    return "Normal"


def parse_move_bytes(source: str, loc_moves: list[str]) -> list[dict]:
    """
    Extract moves from Java source.
    Look for byte constants like:
      private static final byte CHOMP = 1;
    Then setMove calls and damage constants.
    """
    # Extract byte move constants
    byte_consts = {}
    for m in re.finditer(r"private static final byte (\w+)\s*=\s*(\d+)", source):
        byte_consts[int(m.group(2))] = m.group(1)

    # Extract integer damage/block constants
    int_consts = {}
    for m in re.finditer(r"private static final int (\w+)\s*=\s*(-?\d+)", source):
        int_consts[m.group(1)] = int(m.group(2))

    # Find setHp calls to get HP ranges
    # (done separately)

    # Find all setMove calls to get move metadata
    # setMove(MOVES[N], (byte)X, Intent.Y, damage)
    # setMove((byte)X, Intent.Y, damage)
    move_data = {}  # byte_val -> {name, intent, damage}
    
    for m in re.finditer(
        r"setMove\s*\((.+?)\)\s*;",
        source
    ):
        args_raw = re.sub(r"\s+", " ", m.group(1))
        parts = [p.strip() for p in args_raw.split(",")]
        
        # Determine which pattern:
        # Pattern 1: setMove(MOVES[N], (byte)X, Intent.Y) or setMove(MOVES[N], (byte)X, Intent.Y, dmg)
        # Pattern 2: setMove((byte)X, Intent.Y) or setMove((byte)X, Intent.Y, dmg)
        
        move_name = None
        byte_val = None
        intent = None
        damage = None
        
        # Find byte value
        byte_m = re.search(r"\(byte\)\s*(\d+)", args_raw)
        if byte_m:
            byte_val = int(byte_m.group(1))
        
        # Find intent
        intent_m = re.search(r"Intent\.(\w+)", args_raw)
        if intent_m:
            intent = intent_m.group(1)
        
        # Find MOVES[N] reference
        moves_m = re.search(r"MOVES\s*\[(\d+)\]", args_raw)
        if moves_m:
            idx = int(moves_m.group(1))
            if loc_moves and idx < len(loc_moves):
                move_name = loc_moves[idx]
        
        if byte_val is not None:
            if byte_val not in move_data:
                move_data[byte_val] = {"name": None, "intent": None, "damage": None}
            if move_name and not move_data[byte_val]["name"]:
                move_data[byte_val]["name"] = move_name
            if intent:
                move_data[byte_val]["intent"] = intent

    # Now associate byte constants with move names
    # For moves without loc name, use the byte const name
    moves = []
    for byte_val, data in sorted(move_data.items()):
        move_id = byte_consts.get(byte_val, f"MOVE_{byte_val}")
        move_name = data["name"] or move_id.replace("_", " ").title()
        intent = data["intent"] or "UNKNOWN"
        
        # Try to find damage for this move from class fields
        damage = None
        dmg_const = f"{move_id}_DMG"
        if dmg_const in int_consts:
            damage = int_consts[dmg_const]
        
        moves.append({
            "id": move_id,
            "name": move_name,
            "damage": damage,
            "damage_ascension": None,
            "intent": intent,
        })

    return moves


def parse_hp(source: str) -> dict:
    """Extract HP from setHp calls and ascension checks."""
    hp = {
        "min_hp": None,
        "max_hp": None,
        "min_hp_ascension": None,
        "max_hp_ascension": None,
    }

    # Look for ascension-gated setHp calls
    # Pattern: if (... ascensionLevel >= N) { this.setHp(a, b) } else { this.setHp(c, d) }
    asc_block = re.search(
        r"ascensionLevel\s*>=\s*(\d+)\s*\)\s*\{[^}]*setHp\s*\(\s*(\d+)\s*,\s*(\d+)\s*\)[^}]*\}\s*else\s*\{[^}]*setHp\s*\(\s*(\d+)\s*,\s*(\d+)\s*\)",
        source
    )
    if asc_block:
        hp["min_hp_ascension"] = int(asc_block.group(2))
        hp["max_hp_ascension"] = int(asc_block.group(3))
        hp["min_hp"] = int(asc_block.group(4))
        hp["max_hp"] = int(asc_block.group(5))
    else:
        # Simple setHp(min, max)
        set_hp_m = re.search(r"setHp\s*\(\s*(\d+)\s*,\s*(\d+)\s*\)", source)
        if set_hp_m:
            hp["min_hp"] = int(set_hp_m.group(1))
            hp["max_hp"] = int(set_hp_m.group(2))
        else:
            # HP from super constructor: super(NAME, ID, maxHP, ...)
            super_m = re.search(r"super\s*\([^,]+,\s*[^,]+,\s*(\d+)\s*,", source)
            if super_m:
                hp_val = int(super_m.group(1))
                hp["min_hp"] = hp_val
                hp["max_hp"] = hp_val

    # If no ascension HP found but there are A_N_HP constants
    if hp["min_hp_ascension"] is None:
        asc_min = re.search(r"private static final int A_\d+_HP_MIN\s*=\s*(\d+)", source)
        asc_max = re.search(r"private static final int A_\d+_HP_MAX\s*=\s*(\d+)", source)
        if asc_min and asc_max:
            hp["min_hp_ascension"] = int(asc_min.group(1))
            hp["max_hp_ascension"] = int(asc_max.group(1))

    return hp


def parse_monsters(source_dir: str, localization_dir: str) -> list[dict]:
    loc = load_localization(localization_dir, "monsters.json")
    monsters = []
    seen_ids = set()

    for act in MONSTER_ACTS:
        act_dir = os.path.join(source_dir, "monsters", act)
        java_files = find_java_files(act_dir, recursive=False)

        for jf in java_files:
            class_name = os.path.basename(jf).replace(".java", "")
            if class_name.startswith("Abstract"):
                continue

            source = read_java(jf)

            # Get ID
            monster_id_raw = extract_static_id(source)
            if not monster_id_raw:
                # Try to get from class name
                monster_id_raw = class_name
            
            monster_id = to_upper_snake(monster_id_raw)
            if monster_id in seen_ids:
                continue
            if "DEPRECATED" in monster_id:
                continue
            seen_ids.add(monster_id)

            # Localization
            loc_entry = loc.get(monster_id_raw, loc.get(class_name, {}))
            name = loc_entry.get("NAME", monster_id_raw)
            loc_moves = loc_entry.get("MOVES", [])

            # HP
            hp = parse_hp(source)

            # Monster type
            monster_type = infer_monster_type(class_name, source, act)

            # Moves
            moves = parse_move_bytes(source, loc_moves)

            monsters.append({
                "id": monster_id,
                "name": name,
                "type": monster_type,
                "act": act,
                "min_hp": hp["min_hp"],
                "max_hp": hp["max_hp"],
                "min_hp_ascension": hp["min_hp_ascension"],
                "max_hp_ascension": hp["max_hp_ascension"],
                "moves": moves,
                "image_url": None,
            })

    monsters.sort(key=lambda m: m["id"])
    return monsters


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Parse STS1 monsters")
    parser.add_argument("--source-dir", default=DEFAULT_SOURCE_DIR)
    parser.add_argument("--localization-dir", default=DEFAULT_LOCALIZATION_DIR)
    parser.add_argument("--output", default=None)
    args = parser.parse_args()

    monsters = parse_monsters(args.source_dir, args.localization_dir)
    out = json.dumps(monsters, indent=2, ensure_ascii=False)
    if args.output:
        with open(args.output, "w") as f:
            f.write(out)
    else:
        print(out)
