# Parsers

Extraction and transform scripts for both games live here.

## Structure

```text
parsers/
├── README.md
├── update.sh
├── extract_game_data.sh
├── config.cjs
├── config.mjs
├── config.py
├── utils.py
├── validate.py
├── subset_fonts.py
├── sts1/
│   ├── README.md
│   ├── card_parser.py
│   ├── relic_parser.py
│   ├── potion_parser.py
│   ├── power_parser.py
│   ├── monster_parser.py
│   ├── event_parser.py
│   ├── misc_parser.py
│   ├── parse_all.py
│   ├── build_events.py
│   ├── resolve_upgrades.py
│   ├── render_cards.py
│   ├── extract_relic_values.cjs
│   └── build_mechanics_data.py
├── sts2/
│   ├── README.md
│   ├── parse_all.py
│   ├── parse_cards.py
│   ├── parse_events.js
│   ├── parse_monsters.js
│   ├── resolve_vars.py
│   ├── resolve_localized_vars.cjs
│   ├── add_ancient_descriptions.cjs
│   └── build_patch_notes.cjs
└── shared/
    ├── build_localization.cjs
    ├── build_event_localization.cjs
    ├── build_monster_data.cjs
    ├── build_monster_localization.cjs
    └── resolve_relic_vars.js
```

## Common commands

```bash
# Extract STS2 raw game files
bash parsers/extract_game_data.sh

# Run the STS2 parser pipeline
bash parsers/update.sh

# Validate API output against generated data
python3 parsers/validate.py --all

# Rebuild subsetted fonts only
python3 parsers/subset_fonts.py
```

## STS2 pipeline

`parsers/update.sh` currently runs these steps:

1. `python3 parsers/sts2/parse_all.py`
2. `node parsers/sts2/parse_events.js`
3. `node parsers/sts2/parse_monsters.js`
4. `node parsers/shared/build_monster_data.cjs`
5. `python3 parsers/sts2/resolve_vars.py`
6. `node parsers/shared/build_localization.cjs`
7. `node parsers/shared/build_event_localization.cjs`
8. `node parsers/sts2/resolve_localized_vars.cjs`
9. `node parsers/shared/build_monster_localization.cjs`
10. `node parsers/sts2/add_ancient_descriptions.cjs`
11. `node parsers/sts2/build_patch_notes.cjs`
12. `python3 parsers/subset_fonts.py`

## Validation

Validation requires the dev server on port `4321`:

```bash
npx astro dev --port 4321
python3 parsers/validate.py --all
```

## Notes

- Root-level config files are shared by both STS1 and STS2 scripts.
- `shared/` contains cross-cutting builders used by the STS2 pipeline.
- `extract_game_data.sh` stays at the parsers root because it prepares input data for the whole STS2 pipeline.
