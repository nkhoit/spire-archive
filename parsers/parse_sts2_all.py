#!/usr/bin/env python3
"""Parse all STS2 entity types from decompiled C# into JSON files."""

import re
import json
import sys
from pathlib import Path

from config import DECOMPILED_DIR, OUTPUT_DIR

def camel_to_snake(name: str) -> str:
    """Convert CamelCase to snake_case: ExtraDamage -> extra_damage."""
    s = re.sub(r'([A-Z])', r'_\1', name).lower().lstrip('_')
    return s

DECOMPILED = DECOMPILED_DIR
OUTPUT = OUTPUT_DIR
LOC_DIR = Path(__file__).parent.parent / "data/sts2-localization/eng"

def load_loc(filename: str) -> dict:
    """Load a localization JSON file and return as dict."""
    path = LOC_DIR / filename
    if not path.exists():
        return {}
    with open(path) as f:
        return json.load(f)

_bbcode_re = re.compile(r'\[/?[a-z]+\]')
_var_fmt_re = re.compile(r'\{(\w+)(?::[^}]*)?\}')

def clean_desc(text: str, vars: dict = None) -> str:
    """Strip BBCode tags. Var resolution is handled by resolve_sts2_vars.py."""
    if not text:
        return text
    # Strip [gold]...[/gold], [blue]...[/blue], [red]...[/red], etc.
    text = re.sub(r'\[/?[a-z]+\]', '', text)
    return text.strip()

def get_loc_name(loc: dict, entity_id: str) -> str | None:
    return loc.get(f"{entity_id}.title")

def get_loc_desc(loc: dict, entity_id: str, vars: dict = None) -> str | None:
    raw = loc.get(f"{entity_id}.description")
    if raw is None:
        return None
    return clean_desc(raw, vars)

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
        (r'new ExtraDamageVar\((\d+)m', 'extra_damage'),
        (r'new OstyDamageVar\((\d+)m', 'osty_damage'),
        (r'new CalculatedDamageVar\((\d+)m', 'calculated_damage'),
        (r'new BlockVar\((\d+)m', 'block'),
        (r'new CalculatedBlockVar\((\d+)m', 'calculated_block'),
        (r'new HealVar\((\d+)m', 'heal'),
        (r'new MagicNumberVar\((\d+)m', 'magic_number'),
        (r'new CardsVar\((\d+)', 'cards'),
        (r'new EnergyVar\((\d+)', 'energy'),
        (r'new HpLossVar\((\d+)m', 'hp_loss'),
        (r'new RepeatVar\((\d+)', 'repeat'),
        (r'new SummonVar\((\d+)', 'summon'),
        (r'new ForgeVar\((\d+)', 'forge'),
        (r'new StarsVar\((\d+)', 'stars_var'),
        (r'new GoldVar\((\d+)', 'gold'),
        (r'new MaxHpVar\((\d+)', 'max_hp'),
        (r'new CalculationBaseVar\((\d+)', 'calculation_base'),
        (r'new CalculationExtraVar\((\d+)', 'calculation_extra'),
        (r'new CalculatedVar\((\d+)', 'calculated'),
    ]
    for pattern, key in patterns:
        for m in re.finditer(pattern, text):
            result[key] = int(m.group(1))
    for m in re.finditer(r'new PowerVar<(\w+)>\((\d+)m', text):
        result[f"power_{camel_to_snake(m.group(1).replace('Power',''))}"] = int(m.group(2))
    # Named CardsVar("Name", X) — e.g., CardsVar("Shivs", 4)
    for m in re.finditer(r'new CardsVar\("(\w+)",\s*(\d+)', text):
        result[camel_to_snake(m.group(1))] = int(m.group(2))
    # Named IntVar("Name", Xm) — e.g., IntVar("Increase", 3m)
    for m in re.finditer(r'new IntVar\("(\w+)",\s*(\d+)', text):
        result[camel_to_snake(m.group(1))] = int(m.group(2))
    # Generic DynamicVar("Name", Xm)
    for m in re.finditer(r'new DynamicVar\("(\w+)",\s*(\d+)', text):
        key = camel_to_snake(m.group(1))
        if key not in result:
            result[key] = int(m.group(2))
    # Named typed vars: e.g., new BlockVar("BlockNextTurn", 4m), new DamageVar("BombDamage", 10m)
    for m in re.finditer(r'new \w+Var\("(\w+)",\s*(\d+)', text):
        key = camel_to_snake(m.group(1))
        if key not in result:
            result[key] = int(m.group(2))
    return result

# ============ CARDS ============
def parse_cards():
    cards_dir = DECOMPILED / "MegaCrit.Sts2.Core.Models.Cards"
    pools_dir = DECOMPILED / "MegaCrit.Sts2.Core.Models.CardPools"
    loc = load_loc("cards.json")
    
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
        
        # Extract keywords only from CanonicalKeywords property (not OnUpgrade)
        canon_kw_match = re.search(r'CanonicalKeywords\s*=>\s*(.*?)(?:;\s*$|\n\s*\n)', text, re.MULTILINE | re.DOTALL)
        if canon_kw_match:
            canon_block = canon_kw_match.group(1)
            # Grab up to the closing semicolon of the property
            semi_pos = text.find(';', canon_kw_match.start())
            if semi_pos != -1:
                canon_block = text[canon_kw_match.start():semi_pos+1]
            keywords = list(set(k for k in re.findall(r'CardKeyword\.(\w+)', canon_block) if k != "None"))
        else:
            keywords = []
        tags = list(set(t for t in re.findall(r'CardTag\.(\w+)', text) if t != "None"))
        
        upgrade = {}
        # Simple pattern: VarName.UpgradeValueBy(Xm)
        for um in re.finditer(r'(\w+)\.UpgradeValueBy\((\-?\d+)m\)', text):
            upgrade[camel_to_snake(um.group(1))] = int(um.group(2))
        # DynamicVars["VarName"].UpgradeValueBy(Xm) pattern
        for um in re.finditer(r'DynamicVars\["(\w+)"\]\.UpgradeValueBy\((\-?\d+)m\)', text):
            var_name = um.group(1)
            # Normalize: strip "Power" suffix to match CardDetail.astro convention
            # e.g., ThornsPower → thorns, AccuracyPower → accuracy
            # But don't strip if the name IS just "Power"
            if var_name.endswith('Power') and len(var_name) > 5:
                key = camel_to_snake(var_name[:-5])
            else:
                key = camel_to_snake(var_name)
            upgrade[key] = int(um.group(2))
        for um in re.finditer(r'UpgradeBaseCost\((\d+)\)', text):
            upgrade["cost"] = int(um.group(1))
        # EnergyCost.UpgradeBy(-1) pattern — convert delta to absolute cost
        for um in re.finditer(r'EnergyCost\.UpgradeBy\((\-?\d+)\)', text):
            delta = int(um.group(1))
            upgrade["cost"] = max(0, raw_cost + delta) if raw_cost >= 0 else None
        for um in re.finditer(r'AddKeyword\(CardKeyword\.(\w+)\)', text):
            upgrade.setdefault("add_keywords", []).append(um.group(1))
        for um in re.finditer(r'RemoveKeyword\(CardKeyword\.(\w+)\)', text):
            upgrade.setdefault("remove_keywords", []).append(um.group(1))
        
        raw_cost = int(m.group(1))
        card_id = class_to_id(name)
        vars_data = parse_dynamic_vars(text)
        
        # Star cost for Regent cards
        star_match = re.search(r'CanonicalStarCost\s*=>\s*(\d+)', text)
        
        card = {
            "id": card_id,
            "name": get_loc_name(loc, card_id) or humanize(name),
            "cost": None if raw_cost < 0 or is_x_cost else raw_cost,
            "type": m.group(2),
            "rarity": m.group(3),
            "target": m.group(4),
            "color": card_to_pool.get(name, "unknown"),
            "keywords": keywords,
            "tags": tags,
            "vars": vars_data,
            "upgrade": upgrade,
            "description": get_loc_desc(loc, card_id, vars_data),
            "image_url": f"/images/sts2/cards/{card_id.lower()}.png",
        }
        if star_match:
            card["star_cost"] = int(star_match.group(1))
        cards.append(card)
    return cards

# ============ RELICS ============
def parse_relics():
    relics_dir = DECOMPILED / "MegaCrit.Sts2.Core.Models.Relics"
    pools_dir = DECOMPILED / "MegaCrit.Sts2.Core.Models.RelicPools"
    loc = load_loc("relics.json")
    
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
        
        relic_id = class_to_id(name)
        relics.append({
            "id": relic_id,
            "name": get_loc_name(loc, relic_id) or humanize(name),
            "description": get_loc_desc(loc, relic_id),
            "tier": rarity,
            "color": relic_to_pool.get(name, "shared"),
        })
    return relics

# ============ POTIONS ============
def parse_potions():
    potions_dir = DECOMPILED / "MegaCrit.Sts2.Core.Models.Potions"
    pools_dir = DECOMPILED / "MegaCrit.Sts2.Core.Models.PotionPools"
    loc = load_loc("potions.json")
    
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
        
        potion_id = class_to_id(name)
        potions.append({
            "id": potion_id,
            "name": get_loc_name(loc, potion_id) or humanize(name),
            "description": get_loc_desc(loc, potion_id),
            "rarity": rarity,
            "color": potion_to_pool.get(name, "shared"),
            "target": target,
        })
    return potions

# ============ POWERS ============
def parse_powers():
    powers_dir = DECOMPILED / "MegaCrit.Sts2.Core.Models.Powers"
    loc = load_loc("powers.json")
    
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
        
        power_id = class_to_id(name)
        loc_name = get_loc_name(loc, power_id)
        powers.append({
            "id": power_id,
            "name": loc_name or display_name,
            "description": get_loc_desc(loc, power_id),
            "type": ptype,
            "stackable": stack_type == "Counter",
        })
    return powers

# ============ MONSTERS ============  
def parse_monsters():
    monsters_dir = DECOMPILED / "MegaCrit.Sts2.Core.Models.Monsters"
    loc = load_loc("monsters.json")
    
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
        
        monster_id = class_to_id(name)
        monsters.append({
            "id": monster_id,
            "name": get_loc_name(loc, monster_id) or humanize(name),
            "min_hp": min_hp,
            "max_hp": max_hp,
            "type": "Normal",  # hard to determine from code alone
            "act": "unknown",
            "moves": [],
            "description": get_loc_desc(loc, monster_id),
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
        
        # Starting deck
        starting_deck = []
        deck_match = re.search(r'StartingDeck\s*=>[^{]*\{([^}]+)\}', text, re.DOTALL)
        if deck_match:
            for card_ref in re.findall(r'ModelDb\.Card<(\w+)>\(\)', deck_match.group(1)):
                starting_deck.append(class_to_id(card_ref))
        
        # Starting relic(s)
        starting_relic = None
        relic_match = re.search(r'StartingRelics\s*=>.*?ModelDb\.Relic<(\w+)>', text)
        if relic_match:
            starting_relic = class_to_id(relic_match.group(1))
        
        chars.append({
            "id": class_to_id(name),
            "name": humanize(name),
            "hp": hp,
            "starting_gold": gold,
            "energy_per_turn": energy,
            "starting_deck": starting_deck or None,
            "starting_relic": starting_relic,
            "description": None,
        })
    return chars

# ============ KEYWORDS ============
def parse_keywords():
    """Extract keyword definitions from localization data."""
    loc = load_loc("card_keywords.json")
    
    # Fallback hardcoded map in case localization is missing
    fallback = {
        "Exhaust": "Removed until the end of combat.",
        "Ethereal": "If this card is in your Hand at the end of this turn, it is Exhausted.",
        "Innate": "Start each combat with this card in your Hand.",
        "Retain": "Retained cards are not discarded at the end of turn.",
        "Unplayable": "Unplayable cards cannot be played.",
        "Sly": "If this card is discarded from your Hand before the end of your turn, play it for free.",
        "Eternal": "Cannot be removed or transformed from your Deck.",
    }
    
    keywords = []
    # Collect keyword IDs from localization
    seen_ids = set()
    for key in loc:
        if key.endswith(".title"):
            kid = key.replace(".title", "")
            seen_ids.add(kid)
    
    # Also ensure fallback keywords are included
    for name in fallback:
        seen_ids.add(name.upper())
    
    for kid in sorted(seen_ids):
        title_key = f"{kid}.title"
        desc_key = f"{kid}.description"
        name = loc.get(title_key, kid.capitalize())
        desc = loc.get(desc_key, fallback.get(name, ""))
        # Strip BBCode tags
        desc = clean_desc(desc)
        if desc:
            keywords.append({
                "id": kid,
                "names": [name],
                "description": desc,
            })
    
    return keywords

# ============ EVENTS ============
def parse_events():
    events_dir = DECOMPILED / "MegaCrit.Sts2.Core.Models.Events"
    loc = load_loc("events.json")
    
    events = []
    for f in sorted(events_dir.glob("*.cs")):
        text = f.read_text()
        name = f.stem
        if "Mock" in name:
            continue
        if "EventModel" not in text and "AbstractEvent" not in text:
            continue
        
        event_id = class_to_id(name)
        events.append({
            "id": event_id,
            "name": get_loc_name(loc, event_id) or humanize(name),
            "act": "unknown",
            "description": get_loc_desc(loc, event_id),
            "choices": [],
        })
    return events

# ============ ENCHANTMENTS ============
def parse_enchantments():
    ench_dir = DECOMPILED / "MegaCrit.Sts2.Core.Models.Enchantments"
    loc = load_loc("enchantments.json")
    
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
        
        ench_id = class_to_id(name)
        enchantments.append({
            "id": ench_id,
            "name": get_loc_name(loc, ench_id) or humanize(name),
            "description": get_loc_desc(loc, ench_id),
            "rarity": rarity,
        })
    return enchantments


# IDs to exclude from output — deprecated/test entities that exist in C# but shouldn't be on the site
EXCLUDED_IDS = {
    "DEPRECATED_CARD", "DEPRECATED_RELIC", "DEPRECATED_POTION",
    "MULTI_ATTACK_MOVE_MONSTER", "SINGLE_ATTACK_MOVE_MONSTER",
    "ONE_HP_MONSTER", "TEN_HP_MONSTER", "TEST_SUBJECT", "FAKE_MERCHANT_MONSTER",
}


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
        before = len(data)
        data = [item for item in data if item.get("id") not in EXCLUDED_IDS]
        excluded = before - len(data)
        with open(OUTPUT / f"{name}.json", "w") as f:
            json.dump(data, f, indent=2)
        suffix = f" (filtered {excluded})" if excluded else ""
        print(f"{name}: {len(data)}{suffix}", file=sys.stderr)
    
    for name, data in stubs.items():
        path = OUTPUT / f"{name}.json"
        if path.exists():
            print(f"{name}: (skipped, already exists)", file=sys.stderr)
            continue
        with open(path, "w") as f:
            json.dump(data, f, indent=2)
        print(f"{name}: (stub)", file=sys.stderr)
    
    print(f"\nAll files written to {OUTPUT}", file=sys.stderr)


if __name__ == "__main__":
    main()
