"""Power parser for STS1 decompiled Java source."""

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

# Methods that indicate buff/debuff behavior
BUFF_TRIGGERS = [
    "atDamageGive", "onAttack", "onPlayerDeck",
    "onUseCard", "atStartOfTurn", "atEndOfTurn",
    "onGainBlock", "onHeal",
]
DEBUFF_METHODS = [
    "atDamageReceive", "onDeath", "onEnergyRecharge",
]
KNOWN_DEBUFFS = {
    "Vulnerable", "Weak", "Frail", "Poison", "Constricted", "Entangled",
    "Slow", "Hex", "Confusion", "Corruption", "CorruptHeart",
    "Invincible", "TimeWarp", "Artifact", "Bomb", "Choked",
    "Electro", "Fasting", "FlightPower", "GainEnergy", "LockedBox",
    "PoisonLose", "Regrow", "Rupture", "ShackledPower", "SporeCloud",
    "Static", "Storm", "TenacityPower", "ThornsP", "Constricted",
    "Hex", "Slow", "ModeShift", "Malleable", "Minion",
    "AngryPower", "AccuracyPower", "DexterityPower",
}


def infer_power_type(source: str, power_id: str) -> str:
    """Infer Buff or Debuff from Java source."""
    # Check explicit type assignment first (most reliable)
    if re.search(r"this\.type\s*=\s*(?:AbstractPower\.)?PowerType\.DEBUFF", source):
        return "Debuff"
    if re.search(r"this\.type\s*=\s*(?:AbstractPower\.)?PowerType\.BUFF", source):
        return "Buff"
    # Default is Buff (AbstractPower default)
    return "Buff"


def parse_power_triggers(source: str) -> list[str]:
    """Find which lifecycle methods this power implements."""
    triggers = []
    method_patterns = [
        ("atDamageGive", "onAttack"),
        ("atDamageReceive", "onReceiveDamage"),
        ("onUseCard", "onUseCard"),
        ("atStartOfTurn", "atStartOfTurn"),
        ("atEndOfTurn", "atEndOfTurn"),
        ("onGainBlock", "onGainBlock"),
        ("onHeal", "onHeal"),
        ("onDeath", "onDeath"),
        ("onApplyPower", "onApplyPower"),
        ("onAttacked", "onAttacked"),
        ("onExhaust", "onExhaust"),
        ("onVictory", "onVictory"),
    ]
    for method, trigger_name in method_patterns:
        if re.search(rf"public\s+\w[\w<>]*\s+{method}\s*\(", source):
            triggers.append(trigger_name)
    return triggers


def parse_powers(source_dir: str, localization_dir: str) -> list[dict]:
    loc = load_localization(localization_dir, "powers.json")
    powers_dir = os.path.join(source_dir, "powers")
    java_files = find_java_files(powers_dir, recursive=False)
    # Also scan watcher subdirectory
    watcher_powers_dir = os.path.join(powers_dir, "watcher")
    if os.path.isdir(watcher_powers_dir):
        java_files = java_files + find_java_files(watcher_powers_dir, recursive=False)

    powers = []
    seen_ids = set()

    for jf in java_files:
        class_name = os.path.basename(jf).replace(".java", "")
        if class_name.startswith("Abstract"):
            continue

        source = read_java(jf)

        # Get ID (powers use POWER_ID)
        id_m = re.search(r'(?:public static final String\s+(?:POWER_ID|ID))\s*=\s*"([^"]+)"', source)
        if not id_m:
            continue

        power_id_raw = id_m.group(1)
        power_id = to_upper_snake(power_id_raw)
        if power_id in seen_ids:
            continue
        if "DEPRECATED" in power_id:
            continue
        seen_ids.add(power_id)

        # Localization
        loc_entry = loc.get(power_id_raw, {})
        name = loc_entry.get("NAME", power_id_raw)
        descriptions = loc_entry.get("DESCRIPTIONS", [])

        # Use first description
        desc_text = clean_description(descriptions[0]) if descriptions else ""
        desc_upper = desc_text.upper()
        if "DEPRECATED" in desc_upper or "DEPERCATED" in desc_upper:
            continue

        # Stackable
        stackable = bool(re.search(r"stackPower\s*\(|this\.stackable\s*=\s*true", source))

        # Type
        power_type = infer_power_type(source, power_id_raw)

        # Triggers
        triggers = parse_power_triggers(source)

        powers.append({
            "id": power_id,
            "name": name,
            "description": desc_text,
            "type": power_type,
            "stackable": stackable,
            "triggers": triggers,
        })

    powers.sort(key=lambda p: p["id"])
    return powers


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Parse STS1 powers")
    parser.add_argument("--source-dir", default=DEFAULT_SOURCE_DIR)
    parser.add_argument("--localization-dir", default=DEFAULT_LOCALIZATION_DIR)
    parser.add_argument("--output", default=None)
    args = parser.parse_args()

    powers = parse_powers(args.source_dir, args.localization_dir)
    out = json.dumps(powers, indent=2, ensure_ascii=False)
    if args.output:
        with open(args.output, "w") as f:
            f.write(out)
    else:
        print(out)
