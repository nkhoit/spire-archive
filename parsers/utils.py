"""Shared utilities for STS1 data parsers."""

import json
import os
import re
from pathlib import Path

# Default paths
DEFAULT_SOURCE_DIR = "/tmp/sts-full/com/megacrit/cardcrawl"
DEFAULT_LOCALIZATION_DIR = "/tmp/sts-data/localization/eng"


def load_localization(localization_dir: str, filename: str) -> dict:
    """Load a localization JSON file."""
    path = os.path.join(localization_dir, filename)
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def read_java(path: str) -> str:
    """Read a Java source file."""
    with open(path, "r", encoding="utf-8", errors="replace") as f:
        return f.read()


def find_java_files(directory: str, recursive: bool = True) -> list[str]:
    """Find all .java files in directory."""
    files = []
    if not os.path.isdir(directory):
        return files
    if recursive:
        for root, _, filenames in os.walk(directory):
            for fn in filenames:
                if fn.endswith(".java"):
                    files.append(os.path.join(root, fn))
    else:
        for fn in os.listdir(directory):
            if fn.endswith(".java"):
                files.append(os.path.join(directory, fn))
    return files


def to_upper_snake(s: str) -> str:
    """Convert a string like 'Body Slam' to 'BODY_SLAM'."""
    # Replace spaces and hyphens with underscores, uppercase
    return re.sub(r"[^A-Z0-9_]", "_", s.upper()).strip("_")


def clean_description(desc: str, damage: int = None, block: int = None, magic: int = None) -> str:
    """
    Clean a localization description string:
    - Replace !D! with damage value
    - Replace !B! with block value
    - Replace !M! with magic_number value
    - Remove color codes: #b, #y, #r, #g
    - NL -> newline
    - Strip * markup
    """
    if not desc:
        return desc
    if damage is not None:
        desc = desc.replace("!D!", str(damage))
    if block is not None:
        desc = desc.replace("!B!", str(block))
    if magic is not None:
        desc = desc.replace("!M!", str(magic))
    # Remove remaining !X! placeholders
    desc = re.sub(r"!\w+!", "", desc)
    # Color codes
    desc = re.sub(r"#[byrgpn]", "", desc)
    # NL -> newline
    desc = desc.replace(" NL ", "\n").replace("NL ", "\n").replace(" NL", "\n").replace("NL", "\n")
    # Strip * markup
    desc = desc.replace("*", "")
    # Strip [W] (energy icons)
    desc = desc.replace("[W]", "")
    # Clean extra whitespace
    desc = re.sub(r" {2,}", " ", desc).strip()
    return desc


def extract_static_id(source: str) -> str | None:
    """Extract the static ID string from Java source."""
    m = re.search(r'public static final String ID\s*=\s*"([^"]+)"', source)
    if m:
        return m.group(1)
    return None


def extract_constructor_super(source: str) -> dict:
    """
    Extract fields from the super() call in the constructor:
    super(ID, name, img, COST, desc, CardType.X, CardColor.X, CardRarity.X, CardTarget.X)
    Returns dict with cost, card_type, card_color, card_rarity, card_target
    """
    result = {}
    # Match super(...) call — may span multiple lines
    m = re.search(r"super\s*\(([^;]+?)\)\s*;", source, re.DOTALL)
    if not m:
        return result
    args_raw = m.group(1)
    # Flatten whitespace
    args_flat = re.sub(r"\s+", " ", args_raw)
    
    # Extract CardType
    cm = re.search(r"CardType\.(\w+)", args_flat)
    if cm:
        result["card_type"] = cm.group(1)
    
    # Extract CardColor
    cc = re.search(r"CardColor\.(\w+)", args_flat)
    if cc:
        result["card_color"] = cc.group(1)
    
    # Extract CardRarity
    cr = re.search(r"CardRarity\.(\w+)", args_flat)
    if cr:
        result["card_rarity"] = cr.group(1)
    
    # Extract CardTarget
    ct = re.search(r"CardTarget\.(\w+)", args_flat)
    if ct:
        result["card_target"] = ct.group(1)
    
    # Extract cost — 4th positional arg (after ID, name, img)
    # Try to parse args by splitting on commas (simple approach)
    # Cost is typically an integer literal or named constant like COST
    # Look for the cost pattern more directly
    cost_m = re.search(r"CardColor\.\w+,\s*CardRarity\.\w+", args_flat)  # not useful
    # Better: look for integer cost in common positions
    cost_pattern = re.search(r'(?:super|,)\s*(?:[A-Z_]+,\s*[A-Z_]+\.NAME,\s*"[^"]*",\s*|[A-Z_]+,\s*[A-Z_]+\.cardStrings\.NAME,\s*"[^"]*",\s*|ID,\s*\w+\.cardStrings\.NAME,\s*"[^"]*",\s*)(-?\d+)', args_flat)
    if not cost_pattern:
        # Try a simpler approach: find the cost near "COST" or just find an integer
        cost_pattern2 = re.search(r',\s*(-?\d+)\s*,\s*\w+\.cardStrings\.DESCRIPTION', args_flat)
        if cost_pattern2:
            result["cost"] = int(cost_pattern2.group(1))
        else:
            # Look for static COST field usage
            cost_m2 = re.search(r'private static final int COST\s*=\s*(-?\d+)', source)
            if cost_m2:
                result["cost_raw"] = int(cost_m2.group(1))
    else:
        result["cost"] = int(cost_pattern.group(1))
    
    return result


def extract_base_fields(source: str) -> dict:
    """Extract baseDamage, baseBlock, baseMagicNumber, exhaust, isInnate, etc. from constructor."""
    result = {}
    
    # baseDamage
    m = re.search(r"this\.baseDamage\s*=\s*(-?\d+)\s*;", source)
    if m:
        result["baseDamage"] = int(m.group(1))
    
    # baseBlock
    m = re.search(r"this\.baseBlock\s*=\s*(-?\d+)\s*;", source)
    if m:
        result["baseBlock"] = int(m.group(1))
    
    # baseMagicNumber
    m = re.search(r"this\.baseMagicNumber\s*=\s*(-?\d+)\s*;", source)
    if m:
        result["baseMagicNumber"] = int(m.group(1))
    
    # this.magicNumber = this.baseMagicNumber pattern
    # (already covered above)
    
    # exhaust
    result["exhaust"] = bool(re.search(r"this\.exhaust\s*=\s*true", source))
    
    # isInnate
    result["isInnate"] = bool(re.search(r"this\.isInnate\s*=\s*true", source))
    
    # isEthereal
    result["isEthereal"] = bool(re.search(r"this\.isEthereal\s*=\s*true", source))
    
    # retain
    result["retain"] = bool(re.search(r"this\.retain\s*=\s*true", source))
    
    # selfRetain
    result["selfRetain"] = bool(re.search(r"this\.selfRetain\s*=\s*true", source))
    
    # purgeOnUse
    result["purgeOnUse"] = bool(re.search(r"this\.purgeOnUse\s*=\s*true", source))
    
    # tags
    tags = re.findall(r"this\.tags\.add\(AbstractCard\.CardTags\.(\w+)\)", source)
    tags += re.findall(r"this\.tags\.add\(CardTags\.(\w+)\)", source)
    result["tags"] = list(set(tags))
    
    return result


def extract_upgrade_fields(source: str) -> dict:
    """Extract upgrade() method info."""
    result = {}
    
    # upgradeBaseCost
    m = re.search(r"upgradeBaseCost\s*\((-?\d+)\)", source)
    if m:
        result["cost"] = int(m.group(1))
    
    # upgradeDamage
    m = re.search(r"upgradeDamage\s*\((-?\d+)\)", source)
    if m:
        v = int(m.group(1))
        result["damage"] = f"+{v}" if v >= 0 else str(v)
    
    # upgradeBlock
    m = re.search(r"upgradeBlock\s*\((-?\d+)\)", source)
    if m:
        v = int(m.group(1))
        result["block"] = f"+{v}" if v >= 0 else str(v)
    
    # upgradeMagicNumber
    m = re.search(r"upgradeMagicNumber\s*\((-?\d+)\)", source)
    if m:
        v = int(m.group(1))
        result["magic_number"] = f"+{v}" if v >= 0 else str(v)
    
    # has UPGRADE_DESCRIPTION
    result["has_upgrade_desc"] = bool(re.search(r"UPGRADE_DESCRIPTION", source))
    
    return result


# Mapping constants
CARD_COLOR_MAP = {
    "RED": "ironclad",
    "GREEN": "silent",
    "BLUE": "defect",
    "PURPLE": "watcher",
    "COLORLESS": "colorless",
    "CURSE": "curse",
    "GRAY": "colorless",
}

CARD_TYPE_MAP = {
    "ATTACK": "Attack",
    "SKILL": "Skill",
    "POWER": "Power",
    "STATUS": "Status",
    "CURSE": "Curse",
}

CARD_RARITY_MAP = {
    "COMMON": "Common",
    "UNCOMMON": "Uncommon",
    "RARE": "Rare",
    "BASIC": "Basic",
    "SPECIAL": "Special",
    "CURSE": "Curse",
    "STATUS": "Status",
    "DEPRECATED": "Deprecated",
}

CARD_TARGET_MAP = {
    "ENEMY": "Enemy",
    "ALL_ENEMY": "AllEnemy",
    "SELF": "Self",
    "SELF_AND_ENEMY": "SelfAndEnemy",
    "NONE": "None",
    "DUMP": "None",
}

RELIC_TIER_MAP = {
    "COMMON": "Common",
    "UNCOMMON": "Uncommon",
    "RARE": "Rare",
    "BOSS": "Boss",
    "SHOP": "Shop",
    "STARTER": "Starter",
    "SPECIAL": "Special",
    "EVENT": "Event",
    "DEPRECATED": "Deprecated",
}


def extract_cost_from_source(source: str, class_name: str) -> int | None:
    """More robust cost extraction."""
    # Look for static COST constant
    m = re.search(r"private static final int COST\s*=\s*(-?\d+)", source)
    if m:
        return int(m.group(1))
    
    # Look in super() call - find 4th argument
    # Pattern: super(ID, ..., NUMBER, ..., CardType...
    # Try to find "super(ID, " and count commas
    super_m = re.search(r"super\s*\((.+?)\)\s*;", source, re.DOTALL)
    if super_m:
        raw = re.sub(r"\s+", " ", super_m.group(1))
        # split on commas not inside parens
        parts = []
        depth = 0
        current = ""
        for ch in raw:
            if ch == "(":
                depth += 1
                current += ch
            elif ch == ")":
                depth -= 1
                current += ch
            elif ch == "," and depth == 0:
                parts.append(current.strip())
                current = ""
            else:
                current += ch
        if current.strip():
            parts.append(current.strip())
        
        # Cost is usually the 4th argument (index 3)
        if len(parts) >= 4:
            cost_str = parts[3].strip()
            if re.match(r"^-?\d+$", cost_str):
                return int(cost_str)
            # Maybe it references COST constant defined elsewhere
            # Try resolving common patterns
            const_m = re.search(rf"(?:static final int|final int)\s+{re.escape(cost_str)}\s*=\s*(-?\d+)", source)
            if const_m:
                return int(const_m.group(1))
    return None
