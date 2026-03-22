# STS2 parsers

Scripts for Slay the Spire 2 extraction from the Godot PCK + decompiled C# source.

## Main entrypoints

```bash
# Full STS2 pipeline
bash parsers/update.sh

# Run a single stage manually
python3 parsers/sts2/parse_all.py
node parsers/sts2/parse_events.js
python3 parsers/sts2/resolve_vars.py
```

## Environment variables

- `STS2_PCK_DIR` — extracted PCK directory. Default: `/tmp/sts2-pck`
- `STS2_DECOMPILED_DIR` — decompiled C# source. Default: `~/code/sts2-research/decompiled`

## Files

- `parse_all.py` — extracts cards, relics, potions, powers, monsters, characters, keywords, events, enchantments
- `parse_cards.py` — card-only parser helper
- `parse_events.js` — enriches STS2 events from localization + C#
- `parse_monsters.js` — enriches STS2 monsters from encounters + C#
- `resolve_vars.py` — resolves English template vars and upgrade descriptions
- `resolve_localized_vars.cjs` — resolves localized template vars
- `add_ancient_descriptions.cjs` — Ancient/event enrichment
- `build_patch_notes.cjs` — patch notes builder
