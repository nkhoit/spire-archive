#!/usr/bin/env python3
"""
Resolve STS2 card description DynamicVar placeholders using C# source files.
"""

import json
import os
import re
import sys
from pathlib import Path

from config import DECOMPILED_DIR, OUTPUT_DIR


def card_id_to_filename(card_id: str) -> str:
    """Convert CARD_ID to PascalCase filename."""
    return "".join(word.capitalize() for word in card_id.split("_")) + ".cs"


def extract_vars_from_cs(cs_content: str) -> dict[str, str]:
    """Extract var name → base value from C# CanonicalVars block."""
    vars_map: dict[str, str] = {}

    # Extract CanonicalVars block
    # Match the block contents of CanonicalVars
    block_match = re.search(
        r"CanonicalVars\s*=>\s*new[^{]*\{([^}]*(?:\{[^}]*\}[^}]*)*)\}", cs_content, re.DOTALL
    )
    if not block_match:
        # Try single-element pattern
        single_match = re.search(r"CanonicalVars\s*=>\s*new[^;]+;", cs_content, re.DOTALL)
        if single_match:
            cs_content_block = single_match.group(0)
        else:
            return vars_map
    else:
        cs_content_block = block_match.group(0)

    # DamageVar(Xm) or DamageVar(Xm, ...) → Damage = X
    for value in re.findall(r"new DamageVar\((\d+(?:\.\d+)?)m", cs_content_block):
        vars_map.setdefault("Damage", value)

    for value in re.findall(r"new BlockVar\((\d+(?:\.\d+)?)m", cs_content_block):
        vars_map.setdefault("Block", value)

    for value in re.findall(r"new ExtraDamageVar\((\d+(?:\.\d+)?)m", cs_content_block):
        vars_map.setdefault("ExtraDamage", value)

    for value in re.findall(r"new HpLossVar\((\d+(?:\.\d+)?)m", cs_content_block):
        vars_map.setdefault("HpLoss", value)

    for value in re.findall(r"new ForgeVar\((\d+(?:\.\d+)?)\b", cs_content_block):
        vars_map.setdefault("Forge", value)

    for value in re.findall(r"new GoldVar\((\d+(?:\.\d+)?)m?[,)]", cs_content_block):
        vars_map.setdefault("Gold", value)

    for value in re.findall(r"new TurnsVar\((\d+(?:\.\d+)?)m", cs_content_block):
        vars_map.setdefault("Turns", value)

    for value in re.findall(r"new StarsVar\((\d+(?:\.\d+)?)\b", cs_content_block):
        vars_map.setdefault("Stars", value)

    for value in re.findall(r"new ShivsVar\((\d+(?:\.\d+)?)m", cs_content_block):
        vars_map.setdefault("Shivs", value)

    for value in re.findall(r"new CalculationBaseVar\((\d+(?:\.\d+)?)m", cs_content_block):
        vars_map.setdefault("CalculationBase", value)
        # CalculatedDamage, CalculatedBlock, etc also use CalculationBase value
        vars_map.setdefault("CalculatedDamage", value)
        vars_map.setdefault("CalculatedBlock", value)
        vars_map.setdefault("CalculatedHits", value)
        vars_map.setdefault("CalculatedShivs", value)
        vars_map.setdefault("CalculatedCards", value)
        vars_map.setdefault("CalculatedForge", value)
        vars_map.setdefault("CalculatedChannels", value)
        vars_map.setdefault("CalculatedFocus", value)
        vars_map.setdefault("CalculatedEnergy", value)
        vars_map.setdefault("CalculatedDoom", value)

    for value in re.findall(r"new CalculationExtraVar\((\d+(?:\.\d+)?)m", cs_content_block):
        vars_map.setdefault("CalculationExtra", value)

    # PowerVar<TypeName>(value) or PowerVar<TypeName>("CustomName", value)
    # PowerVar<TypeName>("Name", Xm)
    for type_name, custom_name, value in re.findall(
        r'new PowerVar<(\w+)>\("(\w+)",\s*(\d+(?:\.\d+)?)m', cs_content_block
    ):
        vars_map.setdefault(custom_name, value)
        # Also map the type-derived name (strip "Power" suffix)
        derived = type_name.replace("Power", "")
        vars_map.setdefault(derived, value)

    # PowerVar<TypeName>(Xm)
    for type_name, value in re.findall(r"new PowerVar<(\w+)>\((\d+(?:\.\d+)?)m", cs_content_block):
        derived = type_name.replace("Power", "")
        vars_map.setdefault(derived, value)
        vars_map.setdefault(type_name, value)

    # Generic DynamicVar("Name", Xm)
    for name, value in re.findall(r'new DynamicVar\("(\w+)",\s*(\d+(?:\.\d+)?)m', cs_content_block):
        vars_map.setdefault(name, value)

    # EnergyVar (unnamed = "Energy", or named)
    for name, value in re.findall(r'new EnergyVar\("(\w+)",\s*(\d+(?:\.\d+)?)\b', cs_content_block):
        vars_map.setdefault(name, value)
    for value in re.findall(r"new EnergyVar\((\d+(?:\.\d+)?)\b", cs_content_block):
        vars_map.setdefault("Energy", value)

    # CardsVar
    for name, value in re.findall(r'new CardsVar\("(\w+)",\s*(\d+(?:\.\d+)?)\b', cs_content_block):
        vars_map.setdefault(name, value)
    for value in re.findall(r"new CardsVar\((\d+(?:\.\d+)?)\b", cs_content_block):
        vars_map.setdefault("Cards", value)

    # HitsVar
    for value in re.findall(r"new HitsVar\((\d+(?:\.\d+)?)m", cs_content_block):
        vars_map.setdefault("Hits", value)
        vars_map.setdefault("CalculatedHits", value)

    # SummonVar — unnamed: SummonVar(Xm) → Summon; named: SummonVar("Name", Xm) → Name
    for value in re.findall(r"new SummonVar\((\d+(?:\.\d+)?)m?\b", cs_content_block):
        vars_map.setdefault("Summon", value)
    for name, value in re.findall(r'new SummonVar\("(\w+)",\s*(\d+(?:\.\d+)?)m', cs_content_block):
        vars_map.setdefault(name, value)

    # OstyDamageVar
    for value in re.findall(r"new OstyDamageVar\((\d+(?:\.\d+)?)m", cs_content_block):
        vars_map.setdefault("OstyDamage", value)

    # MaxHpVar
    for value in re.findall(r"new MaxHpVar\((\d+(?:\.\d+)?)m", cs_content_block):
        vars_map.setdefault("MaxHp", value)

    # OrbSlotsVar
    for value in re.findall(r"new OrbSlotsVar\((\d+(?:\.\d+)?)m", cs_content_block):
        vars_map.setdefault("OrbSlots", value)

    # IntVar("Name", Xm)
    for name, value in re.findall(r'new IntVar\("(\w+)",\s*(\d+(?:\.\d+)?)m', cs_content_block):
        vars_map.setdefault(name, value)

    # BlockVar("Name", Xm) - named BlockVar
    for name, value in re.findall(r'new BlockVar\("(\w+)",\s*(\d+(?:\.\d+)?)m', cs_content_block):
        vars_map.setdefault(name, value)

    # RepeatVar(X) - for SevenStars etc, not a display var but useful
    for value in re.findall(r"new RepeatVar\((\d+(?:\.\d+)?)\b", cs_content_block):
        vars_map.setdefault("Repeat", value)

    # GoldVar without m suffix (e.g., GoldVar(30))
    for value in re.findall(r"new GoldVar\((\d+(?:\.\d+)?)\b", cs_content_block):
        vars_map.setdefault("Gold", value)

    # StarsVar without m suffix
    for value in re.findall(r"new StarsVar\((\d+(?:\.\d+)?)\b", cs_content_block):
        vars_map.setdefault("Stars", value)

    # HealVar
    for value in re.findall(r"new HealVar\((\d+(?:\.\d+)?)m", cs_content_block):
        vars_map.setdefault("Heal", value)

    # Handle property-based constructors: new DamageVar(CurrentDamage, ...)
    # Look for the default field value: private int _currentDamage = X;
    for value in re.findall(r"private int _currentDamage\s*=\s*(\d+)", cs_content):
        vars_map.setdefault("Damage", value)
    for value in re.findall(r"private int _currentBlock\s*=\s*(\d+)", cs_content):
        vars_map.setdefault("Block", value)

    # StringVar with entity reference: StringVar("VarName", ModelDb.Enchantment<ClassName>().Title...)
    for var_name, class_name in re.findall(
        r'new StringVar\("(\w+)",\s*ModelDb\.\w+<(\w+)>\(\)\.Title', cs_content
    ):
        # Convert PascalCase to SCREAMING_SNAKE_CASE for localization lookup
        entity_id = re.sub(r'([a-z])([A-Z])', r'\1_\2', class_name)
        entity_id = re.sub(r'([A-Z]+)([A-Z][a-z])', r'\1_\2', entity_id).upper()
        vars_map[var_name] = f"__entity_ref__{entity_id}"

    return vars_map


def fmt_value(val: str) -> str:
    """Format numeric value: remove trailing .0"""
    try:
        f = float(val)
        if f == int(f):
            return str(int(f))
        return str(f)
    except Exception:
        return val


def extract_balanced(s: str, start: int) -> tuple[str, int]:
    """Extract content between balanced { } starting at s[start] (which should be '{').
    Returns (inner_content, end_index_exclusive)."""
    assert s[start] == "{"
    depth = 0
    i = start
    while i < len(s):
        if s[i] == "{":
            depth += 1
        elif s[i] == "}":
            depth -= 1
            if depth == 0:
                return s[start+1:i], i+1
        i += 1
    return s[start+1:], len(s)


def resolve_tokens(desc: str, vars_map: dict[str, str]) -> str:
    """Parse and resolve all {tag:...} tokens using balanced-brace matching."""
    result = []
    i = 0
    while i < len(desc):
        if desc[i] != "{":
            result.append(desc[i])
            i += 1
            continue

        inner, end = extract_balanced(desc, i)

        # Parse: split on first ":"
        colon1 = inner.find(":")
        if colon1 == -1:
            # Bare var like {HpLoss} or {singleStarIcon}
            var_name = inner.strip()
            if var_name == "singleStarIcon":
                result.append("[S]")
            elif var_name in vars_map:
                result.append(fmt_value(vars_map[var_name]))
            else:
                result.append("{" + inner + "}")
            i = end
            continue

        tag = inner[:colon1]
        rest = inner[colon1+1:]

        # {IfUpgraded:show:X|Y} → Y, {IfUpgraded:show:X} → ""
        if tag == "IfUpgraded" and rest.startswith("show:"):
            content = rest[5:]  # after "show:"
            if "|" in content:
                idx = content.rfind("|")
                resolved = content[idx+1:]
                # Recursively resolve nested vars
                result.append(resolve_tokens(resolved, vars_map))
            # else: upgrade-only, remove
            i = end
            continue

        # {InCombat:...|} → include inner (strip trailing |)
        if tag == "InCombat":
            if rest.endswith("|"):
                rest = rest[:-1]
            result.append(resolve_tokens(rest, vars_map))
            i = end
            continue

        # {IsTargeting:...|} or {IsTargeting:...}
        if tag == "IsTargeting":
            if rest.endswith("|"):
                rest = rest[:-1]
            result.append(resolve_tokens(rest, vars_map))
            i = end
            continue

        # {HasRider:...|???} → include inner (strip trailing |???)
        if tag == "HasRider":
            if "|" in rest:
                idx = rest.rfind("|")
                rest = rest[:idx]
            result.append(resolve_tokens(rest, vars_map))
            i = end
            continue

        # Keyword blocks: {Chaos:...|}, {Choking:...|}, etc.
        KEYWORD_BLOCKS = {"Chaos", "Choking", "Curious", "Energized", "Expertise",
                          "Violence", "Wisdom", "Improvement", "Sapping"}
        if tag in KEYWORD_BLOCKS:
            if rest.endswith("|"):
                rest = rest[:-1]
            result.append(resolve_tokens(rest, vars_map))
            i = end
            continue

        # {VarName:diff()} → value
        if rest == "diff()":
            val = vars_map.get(tag)
            if val is not None:
                result.append(fmt_value(val))
            else:
                result.append("{" + inner + "}")
            i = end
            continue

        # {VarName:inverseDiff()} → value
        if rest == "inverseDiff()":
            val = vars_map.get(tag)
            if val is not None:
                result.append(fmt_value(val))
            else:
                result.append("{" + inner + "}")
            i = end
            continue

        # {VarName:starIcons()} → "[S]" repeated by var value
        if rest == "starIcons()":
            val = vars_map.get(tag)
            if val is not None:
                n = int(float(val))
                result.append("[S]" * n if n > 0 else "[S]")
            else:
                result.append("{" + inner + "}")
            i = end
            continue

        # {energyPrefix:energyIcons(N)}
        if tag == "energyPrefix" and rest.startswith("energyIcons("):
            m = re.match(r"energyIcons\((\d+)\)", rest)
            if m:
                n = int(m.group(1))
                result.append("[E]" * n if n > 0 else "[E]")
            else:
                result.append("[E]")
            i = end
            continue

        # {VarName:energyIcons()} → "[E]" repeated by var value
        if rest == "energyIcons()":
            val = vars_map.get(tag)
            if val is not None:
                n = int(float(val))
                result.append("[E]" * n if n > 0 else "[E]")
            else:
                result.append("[E]")
            i = end
            continue

        # {VarName:plural:singular|plural} → pick based on var value
        if rest.startswith("plural:"):
            plural_content = rest[7:]
            if "|" in plural_content:
                parts = plural_content.split("|")
                singular_form = parts[0]
                plural_form = parts[1] if len(parts) > 1 else parts[0]
                # Determine which form to use based on var value
                val = vars_map.get(tag)
                try:
                    num = int(float(val)) if val is not None else 1  # default to singular
                except (ValueError, TypeError):
                    num = 1
                chosen = singular_form if num == 1 else plural_form
                # Replace {} placeholders with the value
                if val is not None:
                    chosen = chosen.replace("{}", fmt_value(val))
                # Remove any remaining {} placeholders
                chosen = re.sub(r"\{[^}]*\}", "", chosen)
                result.append(chosen)
            else:
                result.append(plural_content)
            i = end
            continue

        # {VarName:cond:...?text|alttext} → alttext (base case)
        if rest.startswith("cond:"):
            cond_content = rest[5:]
            if "|" in cond_content:
                idx = cond_content.rfind("|")
                alttext = cond_content[idx+1:]
                result.append(resolve_tokens(alttext, vars_map))
            # else: remove
            i = end
            continue

        # {CardType:choose(options):content|content2|content3} → first option
        if tag == "CardType" and rest.startswith("choose("):
            paren_end = rest.find(")")
            if paren_end != -1:
                content_after = rest[paren_end+2:]  # skip "):"
                parts = content_after.split("|")
                result.append(resolve_tokens(parts[0].strip(), vars_map))
            i = end
            continue

        # Unknown — keep as-is
        result.append("{" + inner + "}")
        i = end

    return "".join(result)


def resolve_description(desc: str, vars_map: dict[str, str]) -> str:
    """Apply resolution rules to a description string."""
    if "{" not in desc:
        return desc
    return resolve_tokens(desc, vars_map)


def resolve_entity_file(json_path: Path, cs_dir: Path, label: str, entity_names: dict[str, str] = None):
    """Resolve description vars for any entity type (cards, relics, potions, powers)."""
    with open(json_path) as f:
        entities = json.load(f)

    total_unresolved = sum(1 for e in entities if "{" in e.get("description", ""))
    print(f"{label} with unresolved vars before: {total_unresolved}")

    fixed = 0
    still_unresolved = 0
    still_unresolved_ids = []

    for entity in entities:
        # Resolve main description
        for field in ("description",):
            desc = entity.get(field, "")
            if "{" not in desc:
                continue

            entity_id = entity["id"]
            cs_filename = card_id_to_filename(entity_id)
            cs_path = cs_dir / cs_filename

            vars_map: dict[str, str] = {}
            if cs_path.exists():
                with open(cs_path) as f:
                    cs_content = f.read()
                vars_map = extract_vars_from_cs(cs_content)
                if entity_names:
                    vars_map = _resolve_entity_refs(vars_map, entity_names)

            new_desc = resolve_description(desc, vars_map)

            # Post-process: clean up garbled leftover pipe patterns
            new_desc = re.sub(r"\d+ \w+\|\{\} \w+\}", lambda m: m.group(0).split("|")[0] + "s", new_desc)
            new_desc = re.sub(r"\s*\|+\?+$", "", new_desc.rstrip())
            new_desc = re.sub(r"\n\([^)]*\bcard\b[^)]*\)", "", new_desc)
            # Replace unresolvable {Amount...} with "X" (enchantment level placeholder)
            new_desc = re.sub(r"\{Amount(?::[^}]*)?\}", "X", new_desc)
            entity[field] = new_desc

            if "{" in new_desc:
                still_unresolved += 1
                still_unresolved_ids.append((entity_id, new_desc))
            else:
                if new_desc != desc:
                    fixed += 1

        # Also resolve upgrade description if present
        if entity.get("upgrade") and isinstance(entity["upgrade"], dict):
            up_desc = entity["upgrade"].get("description", "")
            if "{" in up_desc:
                entity_id = entity["id"]
                cs_filename = card_id_to_filename(entity_id)
                cs_path = cs_dir / cs_filename
                vars_map = {}
                if cs_path.exists():
                    with open(cs_path) as f:
                        cs_content = f.read()
                    vars_map = extract_vars_from_cs(cs_content)
                    if entity_names:
                        vars_map = _resolve_entity_refs(vars_map, entity_names)
                entity["upgrade"]["description"] = resolve_description(up_desc, vars_map)

    print(f"  Fixed: {fixed}")
    print(f"  Still unresolved: {still_unresolved}")
    if still_unresolved_ids:
        print(f"\n  Remaining unresolved ({label}):")
        for eid, d in still_unresolved_ids:
            print(f"    {eid}: {repr(d)}")

    with open(json_path, "w") as f:
        json.dump(entities, f, indent=2, ensure_ascii=False)

    print(f"  Wrote {json_path}")


def _build_entity_name_map() -> dict[str, str]:
    """Build a map of ENTITY_ID → localized English name from all entity JSON files."""
    name_map = {}
    for fname in ("cards.json", "relics.json", "potions.json", "enchantments.json", "powers.json"):
        fpath = OUTPUT_DIR / fname
        if fpath.exists():
            for e in json.load(open(fpath)):
                if e.get("name"):
                    name_map[e["id"]] = e["name"]
    return name_map


def _resolve_entity_refs(vars_map: dict[str, str], name_map: dict[str, str]) -> dict[str, str]:
    """Replace __entity_ref__ENTITY_ID markers with actual entity names."""
    resolved = {}
    for k, v in vars_map.items():
        if isinstance(v, str) and v.startswith("__entity_ref__"):
            entity_id = v[len("__entity_ref__"):]
            if entity_id in name_map:
                resolved[k] = name_map[entity_id]
            # else: leave it out, will remain unresolved
        else:
            resolved[k] = v
    return resolved


def main():
    # Build entity name lookup for StringVar resolution
    entity_names = _build_entity_name_map()

    # Cards
    resolve_entity_file(
        OUTPUT_DIR / "cards.json",
        DECOMPILED_DIR / "MegaCrit.Sts2.Core.Models.Cards",
        "Cards",
        entity_names=entity_names,
    )
    # Relics
    resolve_entity_file(
        OUTPUT_DIR / "relics.json",
        DECOMPILED_DIR / "MegaCrit.Sts2.Core.Models.Relics",
        "Relics",
        entity_names=entity_names,
    )
    # Potions
    resolve_entity_file(
        OUTPUT_DIR / "potions.json",
        DECOMPILED_DIR / "MegaCrit.Sts2.Core.Models.Potions",
        "Potions",
        entity_names=entity_names,
    )
    # Powers
    resolve_entity_file(
        OUTPUT_DIR / "powers.json",
        DECOMPILED_DIR / "MegaCrit.Sts2.Core.Models.Powers",
        "Powers",
        entity_names=entity_names,
    )
    # Enchantments
    resolve_entity_file(
        OUTPUT_DIR / "enchantments.json",
        DECOMPILED_DIR / "MegaCrit.Sts2.Core.Models.Enchantments",
        "Enchantments",
        entity_names=entity_names,
    )


if __name__ == "__main__":
    main()
