#!/usr/bin/env python3
"""Parse STS2 decompiled C# card files into cards.json"""

import re
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from config import DECOMPILED_DIR, OUTPUT_DIR

DECOMPILED = DECOMPILED_DIR
CARDS_DIR = DECOMPILED / "MegaCrit.Sts2.Core.Models.Cards"
POOLS_DIR = DECOMPILED / "MegaCrit.Sts2.Core.Models.CardPools"

# Map card pool classes to character colors
POOL_FILES = {
    "IroncladCardPool": "ironclad",
    "SilentCardPool": "silent",
    "DefectCardPool": "defect",
    "NecrobinderCardPool": "necrobinder",
    "RegentCardPool": "regent",
    "ColorlessCardPool": "colorless",
    "CurseCardPool": "curse",
    "StatusCardPool": "status",
    "TokenCardPool": "token",
    "EventCardPool": "event",
    "QuestCardPool": "quest",
}

def build_card_to_pool() -> dict[str, str]:
    """Parse card pool files to map card class name → color."""
    mapping = {}
    for pool_file, color in POOL_FILES.items():
        path = POOLS_DIR / f"{pool_file}.cs"
        if not path.exists():
            continue
        text = path.read_text()
        # Match ModelDb.Card<ClassName>()
        for m in re.finditer(r'ModelDb\.Card<(\w+)>\(\)', text):
            mapping[m.group(1)] = color
    return mapping


def parse_constructor(text: str):
    """Extract base(cost, CardType, CardRarity, TargetType) from constructor."""
    # Match : base(cost, CardType.X, CardRarity.Y, TargetType.Z)
    m = re.search(r': base\((\-?\d+),\s*CardType\.(\w+),\s*CardRarity\.(\w+),\s*TargetType\.(\w+)\)', text)
    if m:
        return {
            "cost": int(m.group(1)),
            "type": m.group(2),
            "rarity": m.group(3),
            "target": m.group(4),
        }
    return None


def parse_dynamic_vars(text: str) -> dict:
    """Extract DynamicVar values."""
    vars_dict = {}
    
    # DamageVar(Xm, ...)
    for m in re.finditer(r'new DamageVar\((\d+)m', text):
        vars_dict["damage"] = int(m.group(1))
    
    # BlockVar(Xm, ...)
    for m in re.finditer(r'new BlockVar\((\d+)m', text):
        vars_dict["block"] = int(m.group(1))
    
    # HealVar(Xm)
    for m in re.finditer(r'new HealVar\((\d+)m', text):
        vars_dict["heal"] = int(m.group(1))
    
    # MagicNumberVar(Xm) or IntVar(X)
    for m in re.finditer(r'new MagicNumberVar\((\d+)m', text):
        vars_dict["magic_number"] = int(m.group(1))
    
    # CardsVar(X)
    for m in re.finditer(r'new CardsVar\((\d+)', text):
        vars_dict["cards"] = int(m.group(1))
    
    # EnergyVar(X)
    for m in re.finditer(r'new EnergyVar\((\d+)', text):
        vars_dict["energy"] = int(m.group(1))
    
    # HpLossVar(Xm)
    for m in re.finditer(r'new HpLossVar\((\d+)m', text):
        vars_dict["hp_loss"] = int(m.group(1))
    
    # PowerVar<PowerType>(Xm)
    for m in re.finditer(r'new PowerVar<(\w+)>\((\d+)m', text):
        power_name = m.group(1).replace("Power", "")
        vars_dict[f"power_{power_name.lower()}"] = int(m.group(2))
    
    # RepeatVar(X)
    for m in re.finditer(r'new RepeatVar\((\d+)', text):
        vars_dict["repeat"] = int(m.group(1))
    
    return vars_dict


def parse_keywords(text: str) -> list[str]:
    """Extract CardKeyword values."""
    keywords = []
    for m in re.finditer(r'CardKeyword\.(\w+)', text):
        kw = m.group(1)
        if kw != "None":
            keywords.append(kw)
    return list(set(keywords))


def parse_tags(text: str) -> list[str]:
    """Extract CardTag values."""
    tags = []
    for m in re.finditer(r'CardTag\.(\w+)', text):
        tag = m.group(1)
        if tag != "None":
            tags.append(tag)
    return list(set(tags))


def parse_upgrade(text: str) -> dict:
    """Extract upgrade changes from OnUpgrade method."""
    upgrade = {}
    
    # UpgradeValueBy(Xm)
    for m in re.finditer(r'(\w+)\.UpgradeValueBy\((\-?\d+)m\)', text):
        prop = m.group(1)
        val = int(m.group(2))
        upgrade[prop.lower()] = f"+{val}" if val > 0 else str(val)
    
    # UpgradeEnergyCost(X) or SetEnergyCost(X)
    for m in re.finditer(r'UpgradeEnergyCost\((\d+)\)', text):
        upgrade["cost"] = int(m.group(1))
    
    # base.UpgradeBaseCost(X)
    for m in re.finditer(r'UpgradeBaseCost\((\d+)\)', text):
        upgrade["cost"] = int(m.group(1))
    
    # AddKeyword
    for m in re.finditer(r'AddKeyword\(CardKeyword\.(\w+)\)', text):
        upgrade.setdefault("add_keywords", []).append(m.group(1))
    
    return upgrade


def class_name_to_id(name: str) -> str:
    """Convert PascalCase class name to SCREAMING_SNAKE_CASE ID."""
    # Insert underscore before uppercase letters that follow lowercase
    s = re.sub(r'([a-z])([A-Z])', r'\1_\2', name)
    # Insert underscore before uppercase letters that follow uppercase+lowercase
    s = re.sub(r'([A-Z]+)([A-Z][a-z])', r'\1_\2', s)
    return s.upper()


def humanize_name(class_name: str) -> str:
    """Convert PascalCase to human-readable name."""
    s = re.sub(r'([a-z])([A-Z])', r'\1 \2', class_name)
    s = re.sub(r'([A-Z]+)([A-Z][a-z])', r'\1 \2', s)
    return s


def parse_card(path: Path, card_to_pool: dict) -> dict | None:
    """Parse a single card .cs file."""
    text = path.read_text()
    class_name = path.stem
    
    # Skip non-card files (abstract classes, helpers)
    if f"class {class_name} : CardModel" not in text and \
       f"sealed class {class_name} : CardModel" not in text:
        return None
    
    constructor = parse_constructor(text)
    if not constructor:
        return None
    
    card_id = class_name_to_id(class_name)
    
    return {
        "id": card_id,
        "class_name": class_name,
        "name": humanize_name(class_name),  # placeholder until we get localization
        "cost": constructor["cost"] if constructor["cost"] >= 0 else None,
        "type": constructor["type"],
        "rarity": constructor["rarity"],
        "target": constructor["target"],
        "color": card_to_pool.get(class_name, "unknown"),
        "keywords": parse_keywords(text),
        "tags": parse_tags(text),
        "vars": parse_dynamic_vars(text),
        "upgrade": parse_upgrade(text),
        "description": None,  # needs localization
    }


def main():
    card_to_pool = build_card_to_pool()
    print(f"Card pool mappings: {len(card_to_pool)}", file=sys.stderr)
    
    cards = []
    skipped = []
    for cs_file in sorted(CARDS_DIR.glob("*.cs")):
        card = parse_card(cs_file, card_to_pool)
        if card:
            cards.append(card)
        else:
            skipped.append(cs_file.stem)
    
    print(f"Parsed: {len(cards)} cards", file=sys.stderr)
    print(f"Skipped: {len(skipped)} ({', '.join(skipped[:10])}...)", file=sys.stderr)
    
    # Stats
    by_color = {}
    for c in cards:
        by_color.setdefault(c["color"], []).append(c)
    for color, cards_list in sorted(by_color.items()):
        print(f"  {color}: {len(cards_list)}", file=sys.stderr)
    
    output = OUTPUT_DIR
    output.mkdir(parents=True, exist_ok=True)
    
    with open(output / "cards.json", "w") as f:
        json.dump(cards, f, indent=2)
    
    print(f"\nWrote {len(cards)} cards to {output / 'cards.json'}", file=sys.stderr)


if __name__ == "__main__":
    main()
