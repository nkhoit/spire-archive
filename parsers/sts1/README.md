# STS1 parsers

Scripts for Slay the Spire 1 data extraction from decompiled Java sources and localization files.

## Main entrypoints

```bash
# Parse all core STS1 data into data/sts1/
python3 parsers/sts1/parse_all.py

# Rebuild STS1 event data/localization overlays
python3 parsers/sts1/build_events.py
```

## Files

- `parse_all.py` — orchestrates the STS1 parsers
- `card_parser.py`, `relic_parser.py`, `potion_parser.py`, `power_parser.py`, `monster_parser.py`, `event_parser.py`, `misc_parser.py` — entity parsers
- `build_events.py` — post-processes STS1 events/localization
- `resolve_upgrades.py` — upgrade helpers
- `render_cards.py` — card rendering utilities
- `extract_relic_values.cjs` — relic value extraction helper
- `build_mechanics_data.py` — mechanics/localization data builder
