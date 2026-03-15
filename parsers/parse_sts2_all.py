#!/usr/bin/env python3
"""Parse all STS2 entity types from decompiled C# into JSON files."""

import re
import json
import sys
from pathlib import Path

DECOMPILED = Path("/Users/kuro/code/sts2-research/decompiled")
OUTPUT = Path("/Users/kuro/code/sts1-data/data/sts2")

def class_to_id(name: str) -> str:
    s = re.sub(r'([a-z])([A-Z])', r'\1_\2', name)
    s = re.sub(r'([A-Z]+)([A-Z][a-z])', r'\1_\2', s)
    return s.upper()

def humanize(name: str) -> str:
    s = re.sub(r'([a-z])([A-Z])', r'\1 \2', name)
    s = re.sub(r'([A-Z]+)([A-Z][a-z])', r'\1 \2', s)
    return s

def parse_pool_mapping(pools_dir: Path, model_prefix: str, pool_map: dict[str, str]) -> dict[str, str]:
    """Map entity class name → color/character via pool files."""
    mapping = {}
    for pool_file, color in pool_map.items():
        path = pools_dir / f"{pool_file}.cs"
        if not path.exists():
            continue
        text = path.read_text()
        for m in re.finditer(rf'ModelDb\.{model_prefix}<(\w+)>\(\)', text):
            mapping[m.group(1)] = color
    return mapping

def parse_dynamic_vars(text: str) -> dict:
    result = {}
    patterns = [
        (r'new DamageVar\((\d+)m', 'damage'),
        (r'new BlockVar\((\d+)m', 'block'),
        (r'new HealVar\((\d+)m', 'heal'),
        (r'new MagicNumberVar\((\d+)m', 'magic_number'),
        (r'new CardsVar\((\d+)', 'cards'),
        (r'new EnergyVar\((\d+)', 'energy'),
        (r'new HpLossVar\((\d+)m', 'hp_loss'),
        (r'new RepeatVar\((\d+)', 'repeat'),
    ]
    for pattern, key in patterns:
        for m in re.finditer(pattern, text):
            result[key] = int(m.group(1))
    for m in re.finditer(r'new PowerVar<(\w+)>\((\d+)m', text):
        result[f"power_{m.group(1).replace('Power','').lower()}"] = int(m.group(2))
    return result

# ============ CARDS ============
def parse_cards():
    cards_dir = DECOMPILED / "MegaCrit.Sts2.Core.Models.Cards"
    pools_dir = DECOMPILED / "MegaCrit.Sts2.Core.Models.CardPools"
    
    pool_map = {
        "IroncladCardPool": "ironclad", "SilentCardPool": "silent",
        "DefectCardPool": "defect", "NecrobinderCardPool": "necrobinder",
        "RegentCardPool": "regent", "ColorlessCardPool": "colorless",
        "CurseCardPool": "curse", "StatusCardPool": "status",
        "TokenCardPool": "token", "EventCardPool": "event",
        "QuestCardPool": "quest",
    }
    card_to_pool = parse_pool_mapping(pools_dir, "Card", pool_map)
    
    cards = []
    for f in sorted(cards_dir.glob("*.cs")):
        text = f.read_text()
        name = f.stem
        if f"class {name} : CardModel" not in text and f"sealed class {name} : CardModel" not in text:
            continue
        m = re.search(r': base\((\-?\d+),\s*CardType\.(\w+),\s*CardRarity\.(\w+),\s*TargetType\.(\w+)', text)
        if not m:
            continue
        
        # X-cost detection
        is_x_cost = 'HasEnergyCostX => true' in text
        
        keywords = list(set(k for k in re.findall(r'CardKeyword\.(\w+)', text) if k != "None"))
        tags = list(set(t for t in re.findall(r'CardTag\.(\w+)', text) if t != "None"))
        
        upgrade = {}
        for um in re.finditer(r'(\w+)\.UpgradeValueBy\((\-?\d+)m\)', text):
            upgrade[um.group(1).lower()] = int(um.group(2))
        for um in re.finditer(r'UpgradeBaseCost\((\d+)\)', text):
            upgrade["cost"] = int(um.group(1))
        # EnergyCost.UpgradeBy(-1) pattern
        for um in re.finditer(r'EnergyCost\.UpgradeBy\((\-?\d+)\)', text):
            upgrade["cost_change"] = int(um.group(1))
        for um in re.finditer(r'AddKeyword\(CardKeyword\.(\w+)\)', text):
            upgrade.setdefault("add_keywords", []).append(um.group(1))
        for um in re.finditer(r'RemoveKeyword\(CardKeyword\.(\w+)\)', text):
            upgrade.setdefault("remove_keywords", []).append(um.group(1))
        
        raw_cost = int(m.group(1))
        cards.append({
            "id": class_to_id(name),
            "name": humanize(name),
            "cost": None if raw_cost < 0 or is_x_cost else raw_cost,
            "type": m.group(2),
            "rarity": m.group(3),
            "target": m.group(4),
            "color": card_to_pool.get(name, "unknown"),
            "keywords": keywords,
            "tags": tags,
            "vars": parse_dynamic_vars(text),
            "upgrade": upgrade,
            "description": None,
        })
    return cards

# ============ RELICS ============
def parse_relics():
    relics_dir = DECOMPILED / "MegaCrit.Sts2.Core.Models.Relics"
    pools_dir = DECOMPILED / "MegaCrit.Sts2.Core.Models.RelicPools"
    
    pool_map = {
        "IroncladRelicPool": "ironclad", "SilentRelicPool": "silent",
        "DefectRelicPool": "defect", "NecrobinderRelicPool": "necrobinder",
        "RegentRelicPool": "regent", "SharedRelicPool": "shared",
        "EventRelicPool": "event",
    }
    relic_to_pool = parse_pool_mapping(pools_dir, "Relic", pool_map)
    
    relics = []
    for f in sorted(relics_dir.glob("*.cs")):
        text = f.read_text()
        name = f.stem
        if "RelicModel" not in text:
            continue
        
        rarity = "Unknown"
        m = re.search(r'RelicRarity\.(\w+)', text)
        if m:
            rarity = m.group(1)
        
        relics.append({
            "id": class_to_id(name),
            "name": humanize(name),
            "description": None,
            "tier": rarity,
            "color": relic_to_pool.get(name, "shared"),
        })
    return relics

# ============ POTIONS ============
def parse_potions():
    potions_dir = DECOMPILED / "MegaCrit.Sts2.Core.Models.Potions"
    pools_dir = DECOMPILED / "MegaCrit.Sts2.Core.Models.PotionPools"
    
    pool_map = {
        "IroncladPotionPool": "ironclad", "SilentPotionPool": "silent",
        "DefectPotionPool": "defect", "NecrobinderPotionPool": "necrobinder",
        "RegentPotionPool": "regent", "SharedPotionPool": "shared",
        "EventPotionPool": "event", "TokenPotionPool": "token",
    }
    potion_to_pool = parse_pool_mapping(pools_dir, "Potion", pool_map)
    
    potions = []
    for f in sorted(potions_dir.glob("*.cs")):
        text = f.read_text()
        name = f.stem
        if "PotionModel" not in text:
            continue
        
        rarity = "Unknown"
        m = re.search(r'PotionRarity\.(\w+)', text)
        if m:
            rarity = m.group(1)
        
        target = None
        m = re.search(r'TargetType\.(\w+)', text)
        if m and m.group(1) != "None":
            target = m.group(1)
        
        potions.append({
            "id": class_to_id(name),
            "name": humanize(name),
            "description": None,
            "rarity": rarity,
            "color": potion_to_pool.get(name, "shared"),
            "target": target,
        })
    return potions

# ============ POWERS ============
def parse_powers():
    powers_dir = DECOMPILED / "MegaCrit.Sts2.Core.Models.Powers"
    
    powers = []
    for f in sorted(powers_dir.glob("*.cs")):
        text = f.read_text()
        name = f.stem
        if "PowerModel" not in text:
            continue
        
        ptype = "Unknown"
        m = re.search(r'PowerType\.(\w+)', text)
        if m and m.group(1) != "None":
            ptype = m.group(1)
        
        stack_type = None
        m = re.search(r'PowerStackType\.(\w+)', text)
        if m and m.group(1) != "None":
            stack_type = m.group(1)
        
        display_name = humanize(name)
        if display_name.endswith(" Power"):
            display_name = display_name[:-6]
        
        powers.append({
            "id": class_to_id(name),
            "name": display_name,
            "description": None,
            "type": ptype,
            "stackable": stack_type == "Counter",
        })
    return powers

# ============ MONSTERS ============  
def parse_monsters():
    monsters_dir = DECOMPILED / "MegaCrit.Sts2.Core.Models.Monsters"
    
    monsters = []
    for f in sorted(monsters_dir.glob("*.cs")):
        text = f.read_text()
        name = f.stem
        if "MonsterModel" not in text:
            continue
        
        min_hp = max_hp = None
        m = re.search(r'MinInitialHp\s*(?:=>|{[^}]*return)\s*(\d+)', text)
        if m:
            min_hp = int(m.group(1))
        m = re.search(r'MaxInitialHp\s*(?:=>|{[^}]*return)\s*(\d+)', text)
        if m:
            max_hp = int(m.group(1))
        
        monsters.append({
            "id": class_to_id(name),
            "name": humanize(name),
            "min_hp": min_hp,
            "max_hp": max_hp,
            "type": "Normal",  # hard to determine from code alone
            "act": "unknown",
            "moves": [],
            "description": None,
        })
    return monsters

# ============ CHARACTERS ============
def parse_characters():
    chars_dir = DECOMPILED / "MegaCrit.Sts2.Core.Models.Characters"
    
    chars = []
    for f in sorted(chars_dir.glob("*.cs")):
        text = f.read_text()
        name = f.stem
        if name in ("RandomCharacter", "Deprived"):
            continue
        if "CharacterModel" not in text:
            continue
        
        hp = None
        m = re.search(r'StartingHp\s*=>\s*(\d+)', text)
        if m:
            hp = int(m.group(1))
        
        gold = None
        m = re.search(r'StartingGold\s*=>\s*(\d+)', text)
        if m:
            gold = int(m.group(1))
        
        energy = 3  # default
        m = re.search(r'MaxEnergy\s*=>\s*(\d+)', text)
        if m:
            energy = int(m.group(1))
        
        chars.append({
            "id": class_to_id(name),
            "name": humanize(name),
            "hp": hp,
            "starting_gold": gold,
            "energy_per_turn": energy,
            "description": None,
        })
    return chars

# ============ KEYWORDS ============
def parse_keywords():
    """Extract keyword definitions from CardKeyword enum + any keyword data."""
    keywords_map = {
        "Exhaust": "When played, remove this card from your deck for the rest of combat.",
        "Ethereal": "If this card is in your hand at the end of your turn, it is Exhausted.",
        "Innate": "This card will always appear in your opening hand.",
        "Retain": "This card is kept in your hand at the end of your turn.",
        "Unplayable": "This card cannot be played.",
        "Sly": "This card will not be visible to your opponent in multiplayer.",
        "Eternal": "This card cannot be removed from your deck.",
    }
    
    return [
        {"id": k.upper(), "names": [k], "description": v}
        for k, v in keywords_map.items()
    ]

# ============ EVENTS ============
def parse_events():
    events_dir = DECOMPILED / "MegaCrit.Sts2.Core.Models.Events"
    
    events = []
    for f in sorted(events_dir.glob("*.cs")):
        text = f.read_text()
        name = f.stem
        if "Mock" in name:
            continue
        if "EventModel" not in text and "AbstractEvent" not in text:
            continue
        
        events.append({
            "id": class_to_id(name),
            "name": humanize(name),
            "act": "unknown",
            "description": None,
            "choices": [],
        })
    return events

# ============ ENCHANTMENTS ============
def parse_enchantments():
    ench_dir = DECOMPILED / "MegaCrit.Sts2.Core.Models.Enchantments"
    
    enchantments = []
    for f in sorted(ench_dir.glob("*.cs")):
        text = f.read_text()
        name = f.stem
        if "Mock" in name:
            continue
        if "EnchantmentModel" not in text:
            continue
        
        rarity = "Unknown"
        m = re.search(r'EnchantmentRarity\.(\w+)', text)
        if m:
            rarity = m.group(1)
        
        enchantments.append({
            "id": class_to_id(name),
            "name": humanize(name),
            "description": None,
            "rarity": rarity,
        })
    return enchantments


def main():
    OUTPUT.mkdir(parents=True, exist_ok=True)
    
    datasets = {
        "cards": parse_cards,
        "relics": parse_relics,
        "potions": parse_potions,
        "powers": parse_powers,
        "monsters": parse_monsters,
        "characters": parse_characters,
        "keywords": parse_keywords,
        "events": parse_events,
        "enchantments": parse_enchantments,
    }
    
    # Also create empty stubs for STS1-compatible fields
    stubs = {
        "achievements": [],
        "blights": [],
        "orbs": [],
        "stances": [],
        "card_powers": {},
    }
    
    for name, parser in datasets.items():
        data = parser()
        with open(OUTPUT / f"{name}.json", "w") as f:
            json.dump(data, f, indent=2)
        print(f"{name}: {len(data)}", file=sys.stderr)
    
    for name, data in stubs.items():
        with open(OUTPUT / f"{name}.json", "w") as f:
            json.dump(data, f, indent=2)
        print(f"{name}: (stub)", file=sys.stderr)
    
    print(f"\nAll files written to {OUTPUT}", file=sys.stderr)


if __name__ == "__main__":
    main()
