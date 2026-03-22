#!/usr/bin/env python3
"""
Spire Archive Data Validator

Validates that data served by the API matches the actual game files.

Usage:
    python3 validate.py --game sts1 --entity cards --lang en
    python3 validate.py --game sts1 --entity cards --lang all
    python3 validate.py --game sts1 --entity all --lang all
    python3 validate.py --all  # everything
"""

import argparse
import json
import sys
import urllib.request
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parent
DATA_DIR = PROJECT_ROOT / "data"
API_BASE = "http://localhost:4321/api"
LOCALES = ["en", "de", "es", "fr", "it", "ja", "ko", "pl", "pt", "ru", "th", "tr", "zh"]

# Only entities with list API endpoints
ENTITIES = {
    "sts1": ["cards", "relics", "potions", "monsters", "events", "effects"],
    "sts2": ["cards", "relics", "potions", "monsters", "events", "effects", "enchantments"],
}

# Monsters: API filters out sub-parts (no name). Match that in source comparison.
MONSTER_FILTER = lambda m: bool(m.get("name"))

# Map entity name to the localization key in locale JSON files
LOC_KEYS = {
    "cards": "cards",
    "relics": "relics",
    "potions": "potions",
    "powers": "powers",
    "effects": "powers",  # effects are called powers in localization
    "events": "events",
    "monsters": "monsters",
    "enchantments": "enchantments",
}

class ValidationResult:
    def __init__(self, game: str, entity: str, lang: str):
        self.game = game
        self.entity = entity
        self.lang = lang
        self.errors: list[str] = []
        self.warnings: list[str] = []
        self.checked = 0

    def error(self, msg: str):
        self.errors.append(msg)

    def warn(self, msg: str):
        self.warnings.append(msg)

    @property
    def status(self) -> str:
        if self.errors:
            return "❌"
        if self.warnings:
            return "⚠️"
        return "✅"

    def summary(self) -> str:
        parts = [f"{self.game}/{self.entity}/{self.lang}: {self.status} ({self.checked} items)"]
        for e in self.errors:
            parts.append(f"  ERROR: {e}")
        for w in self.warnings:
            parts.append(f"  WARN: {w}")
        return "\n".join(parts)


def api_fetch(game: str, entity: str, lang: str) -> list[dict]:
    """Fetch all items from the API for a given entity and locale, handling pagination."""
    all_items = []
    offset = 0
    page_size = 400
    while True:
        url = f"{API_BASE}/{game}/{entity}?lang={lang}&limit={page_size}&offset={offset}"
        try:
            with urllib.request.urlopen(url, timeout=30) as resp:
                data = json.loads(resp.read())
                items = data.get("items", data if isinstance(data, list) else [])
                all_items.extend(items)
                total = data.get("total", len(items))
                if offset + len(items) >= total or len(items) == 0:
                    break
                offset += len(items)
        except Exception:
            break
    return all_items


def load_source_data(game: str, entity: str) -> list[dict]:
    """Load the parsed JSON source data."""
    # Map entity names to file names
    file_map = {
        "effects": "powers",
        "keywords": "keywords",
        "characters": "characters",
    }
    filename = file_map.get(entity, entity) + ".json"
    path = DATA_DIR / game / filename
    if not path.exists():
        return []
    return json.load(open(path))


def load_localization(game: str, lang: str) -> dict:
    """Load localization data for a game+locale."""
    path = DATA_DIR / game / "localization" / f"{lang}.json"
    if not path.exists():
        return {}
    return json.load(open(path))


def validate_cards(game: str, lang: str) -> ValidationResult:
    result = ValidationResult(game, "cards", lang)
    source = load_source_data(game, "cards")
    api_items = api_fetch(game, "cards", lang)
    loc = load_localization(game, lang)
    loc_cards = loc.get("cards", {})

    if not api_items:
        result.error("API returned no items")
        return result

    source_by_id = {c["id"]: c for c in source}
    api_by_id = {c["id"]: c for c in api_items}

    # Check count match
    if len(source) != len(api_items):
        result.error(f"Count mismatch: source={len(source_by_id)}, api={len(api_by_id)}")

    for card_id, src in source_by_id.items():
        result.checked += 1
        api_card = api_by_id.get(card_id)
        if not api_card:
            result.error(f"Card {card_id} missing from API")
            continue

        # Check structural fields (should be identical regardless of locale)
        for field in ["cost", "type", "rarity", "color", "damage", "block", "magic_number",
                       "exhaust", "ethereal", "innate", "retain"]:
            src_val = src.get(field)
            api_val = api_card.get(field)
            if src_val != api_val:
                result.error(f"Card {card_id}.{field}: source={src_val}, api={api_val}")

        # Check localization
        if lang != "en":
            loc_entry = loc_cards.get(card_id) or loc_cards.get(src.get("name", ""))
            if loc_entry:
                if loc_entry.get("name") and api_card.get("name") != loc_entry["name"]:
                    result.error(f"Card {card_id} name: expected '{loc_entry['name']}', got '{api_card.get('name')}'")
            # If no loc entry, name should be English (fallback)

        # Check for unresolved template variables
        desc = api_card.get("description", "")
        if desc and ("{" in desc and "}" in desc):
            # Check if it looks like a template variable
            import re
            unresolved = re.findall(r'\{[A-Za-z_:()]+\}', desc)
            if unresolved:
                result.warn(f"Card {card_id} has unresolved vars in {lang}: {unresolved}")

    # Check for API items not in source
    for card_id in api_by_id:
        if card_id not in source_by_id:
            result.error(f"Card {card_id} in API but not in source data")

    return result


def validate_generic(game: str, entity: str, lang: str, id_field: str = "id",
                     name_field: str = "name", desc_field: str = "description") -> ValidationResult:
    """Generic validator for relics, potions, powers, etc."""
    result = ValidationResult(game, entity, lang)
    source = load_source_data(game, entity)
    api_items = api_fetch(game, entity, lang)
    loc = load_localization(game, lang)
    loc_key = LOC_KEYS.get(entity, entity)
    loc_data = loc.get(loc_key, {})

    if not api_items:
        result.error("API returned no items")
        return result

    # Apply same filters as the API
    if entity == "monsters":
        source = [s for s in source if MONSTER_FILTER(s)]

    source_by_id = {item[id_field]: item for item in source if id_field in item}
    api_by_id = {item[id_field]: item for item in api_items if id_field in item}

    if len(source_by_id) != len(api_by_id):
        result.error(f"Count mismatch: source={len(source_by_id)}, api={len(api_by_id)}")

    for item_id, src in source_by_id.items():
        result.checked += 1
        api_item = api_by_id.get(item_id)
        if not api_item:
            result.error(f"{entity} {item_id} missing from API")
            continue

        # Check for unresolved template variables in description
        desc = api_item.get(desc_field, "")
        if desc and ("{" in desc and "}" in desc):
            import re
            unresolved = re.findall(r'\{[A-Za-z_:()]+\}', desc)
            if unresolved:
                result.warn(f"{entity} {item_id} has unresolved vars in {lang}: {unresolved}")

        # Check localization applied
        if lang != "en":
            loc_entry = loc_data.get(item_id) or loc_data.get(src.get(name_field, ""))
            if loc_entry and loc_entry.get("name"):
                if api_item.get(name_field) != loc_entry["name"]:
                    result.error(f"{entity} {item_id} name: expected '{loc_entry['name']}', got '{api_item.get(name_field)}'")

    for item_id in api_by_id:
        if item_id not in source_by_id:
            result.error(f"{entity} {item_id} in API but not in source data")

    return result


def validate_entity(game: str, entity: str, lang: str) -> ValidationResult:
    if entity == "cards":
        return validate_cards(game, lang)
    elif entity in ("relics", "potions", "events", "monsters", "enchantments"):
        return validate_generic(game, entity, lang)
    elif entity == "effects":
        return validate_generic(game, entity, lang)
    elif entity in ("keywords", "characters"):
        # No list API endpoint for these
        result = ValidationResult(game, entity, lang)
        result.warn("No list API endpoint — skipped")
        return result
    else:
        result = ValidationResult(game, entity, lang)
        result.error(f"Unknown entity type: {entity}")
        return result


def update_tracker(results: list[ValidationResult]):
    """Update VALIDATION.md with results."""
    tracker_path = PROJECT_ROOT / "VALIDATION.md"
    if not tracker_path.exists():
        return

    content = tracker_path.read_text()
    for r in results:
        # This is simplified — a proper implementation would parse the markdown table
        pass  # TODO: auto-update markdown tables

    # For now, append a summary section
    lines = ["\n## Validation Run Results\n"]
    for r in results:
        lines.append(r.summary())
    
    # Don't append if already has results — overwrite the section
    if "## Validation Run Results" in content:
        idx = content.index("## Validation Run Results")
        content = content[:idx]
    
    content += "\n".join(lines) + "\n"
    tracker_path.write_text(content)


def main():
    parser = argparse.ArgumentParser(description="Validate Spire Archive data")
    parser.add_argument("--game", choices=["sts1", "sts2"], help="Game to validate")
    parser.add_argument("--entity", help="Entity type (cards, relics, etc.) or 'all'")
    parser.add_argument("--lang", default="en", help="Locale or 'all'")
    parser.add_argument("--all", action="store_true", help="Validate everything")
    parser.add_argument("--json", action="store_true", help="Output JSON instead of text")
    args = parser.parse_args()

    if args.all:
        games = ["sts1", "sts2"]
        langs = LOCALES
    else:
        games = [args.game] if args.game else ["sts1", "sts2"]
        langs = LOCALES if args.lang == "all" else [args.lang]

    results = []
    for game in games:
        entities = ENTITIES[game] if (args.all or args.entity == "all" or not args.entity) else [args.entity]
        for entity in entities:
            for lang in langs:
                r = validate_entity(game, entity, lang)
                results.append(r)
                if not args.json:
                    print(r.summary())

    if args.json:
        out = []
        for r in results:
            out.append({
                "game": r.game, "entity": r.entity, "lang": r.lang,
                "status": r.status, "checked": r.checked,
                "errors": r.errors, "warnings": r.warnings
            })
        print(json.dumps(out, indent=2))

    update_tracker(results)

    # Exit code: 1 if any errors
    if any(r.errors for r in results):
        sys.exit(1)


if __name__ == "__main__":
    main()
