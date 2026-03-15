#!/usr/bin/env python3
"""
parse_all.py — orchestrator that runs all STS1 parsers and writes data/ JSON files.
Usage: python3 parse_all.py [--source-dir DIR] [--localization-dir DIR] [--data-dir DIR]
"""

import argparse
import json
import os
import sys
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from utils import DEFAULT_LOCALIZATION_DIR, DEFAULT_SOURCE_DIR
from card_parser import parse_cards
from relic_parser import parse_relics
from potion_parser import parse_potions
from monster_parser import parse_monsters
from event_parser import parse_events
from power_parser import parse_powers
from misc_parser import (
    parse_achievements,
    parse_blights,
    parse_characters,
    parse_keywords,
    parse_orbs,
    parse_stances,
)

DEFAULT_DATA_DIR = str(Path(__file__).parent.parent / "data")


def write_json(data_dir: str, filename: str, data: list | dict) -> None:
    os.makedirs(data_dir, exist_ok=True)
    path = os.path.join(data_dir, filename)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
        f.write("\n")
    print(f"  ✓ {filename} ({len(data)} entries)")


def main():
    parser = argparse.ArgumentParser(description="Parse all STS1 game data")
    parser.add_argument("--source-dir", default=DEFAULT_SOURCE_DIR, help="Path to decompiled Java root")
    parser.add_argument("--localization-dir", default=DEFAULT_LOCALIZATION_DIR, help="Path to localization/eng dir")
    parser.add_argument("--data-dir", default=DEFAULT_DATA_DIR, help="Output directory for JSON files")
    args = parser.parse_args()

    src = args.source_dir
    loc = args.localization_dir
    data_dir = args.data_dir

    print(f"Source:       {src}")
    print(f"Localization: {loc}")
    print(f"Output:       {data_dir}")
    print()

    t0 = time.time()

    print("Parsing cards...")
    cards = parse_cards(src, loc)
    write_json(data_dir, "cards.json", cards)

    print("Parsing relics...")
    relics = parse_relics(src, loc)
    write_json(data_dir, "relics.json", relics)

    print("Parsing potions...")
    potions = parse_potions(src, loc)
    write_json(data_dir, "potions.json", potions)

    print("Parsing monsters...")
    monsters = parse_monsters(src, loc)
    write_json(data_dir, "monsters.json", monsters)

    print("Parsing events...")
    events = parse_events(src, loc)
    write_json(data_dir, "events.json", events)

    print("Parsing powers...")
    powers = parse_powers(src, loc)
    write_json(data_dir, "powers.json", powers)

    print("Parsing keywords...")
    keywords = parse_keywords(loc)
    write_json(data_dir, "keywords.json", keywords)

    print("Parsing orbs...")
    orbs = parse_orbs(src, loc)
    write_json(data_dir, "orbs.json", orbs)

    print("Parsing stances...")
    stances = parse_stances(src, loc)
    write_json(data_dir, "stances.json", stances)

    print("Parsing blights...")
    blights = parse_blights(src, loc)
    write_json(data_dir, "blights.json", blights)

    print("Parsing characters...")
    characters = parse_characters(src, loc)
    write_json(data_dir, "characters.json", characters)

    print("Parsing achievements...")
    achievements = parse_achievements(loc)
    write_json(data_dir, "achievements.json", achievements)

    elapsed = time.time() - t0

    print()
    print("=" * 50)
    print("SUMMARY")
    print("=" * 50)
    print(f"  Cards:        {len(cards)}")
    print(f"  Relics:       {len(relics)}")
    print(f"  Potions:      {len(potions)}")
    print(f"  Monsters:     {len(monsters)}")
    print(f"  Events:       {len(events)}")
    print(f"  Powers:       {len(powers)}")
    print(f"  Keywords:     {len(keywords)}")
    print(f"  Orbs:         {len(orbs)}")
    print(f"  Stances:      {len(stances)}")
    print(f"  Blights:      {len(blights)}")
    print(f"  Characters:   {len(characters)}")
    print(f"  Achievements: {len(achievements)}")
    print(f"  Time:         {elapsed:.2f}s")
    print()

    # Spot-checks
    print("SPOT CHECKS")
    print("-" * 50)

    # Body Slam
    body_slam = next((c for c in cards if c["id"] == "BODY_SLAM"), None)
    if body_slam:
        print(f"  Body Slam: cost={body_slam['cost']}, type={body_slam['type']}, "
              f"rarity={body_slam['rarity']}, color={body_slam['color']}")
        print(f"    desc: {body_slam['description']}")
        print(f"    upgrade_cost: {body_slam['upgrade']['cost']}")
    else:
        print("  Body Slam: NOT FOUND")

    # Jaw Worm
    jaw_worm = next((m for m in monsters if m["id"] == "JAWWORM"), None)
    if jaw_worm:
        print(f"  Jaw Worm: hp={jaw_worm['min_hp']}-{jaw_worm['max_hp']}, "
              f"asc_hp={jaw_worm['min_hp_ascension']}-{jaw_worm['max_hp_ascension']}, "
              f"type={jaw_worm['type']}, act={jaw_worm['act']}")
        print(f"    moves: {[m['id'] for m in jaw_worm['moves']]}")
    else:
        print("  Jaw Worm: NOT FOUND")

    # Burning Blood
    burning_blood = next((r for r in relics if r["id"] == "BURNING_BLOOD"), None)
    if burning_blood:
        print(f"  Burning Blood: tier={burning_blood['tier']}, color={burning_blood['color']}")
        print(f"    desc: {burning_blood['description']}")
        print(f"    flavor: {burning_blood['flavor'][:60] if burning_blood['flavor'] else None}...")
    else:
        print("  Burning Blood: NOT FOUND")


if __name__ == "__main__":
    main()
