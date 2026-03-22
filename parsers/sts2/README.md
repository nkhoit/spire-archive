# STS2 Parsers

Extracts and transforms Slay the Spire 2 game data into the JSON files that power [spire-archive.com](https://spire-archive.com).

## Prerequisites

1. **GDRE Tools** — extracts Godot PCK files
   - Download from https://github.com/GDRETools/gdsdecomp/releases
   - macOS: `ditto -x -k GDRE_tools-*.zip /tmp/gdre_tools` (not `unzip`)
   - Remove quarantine: `xattr -r -d com.apple.quarantine /tmp/gdre_tools/`

2. **ILSpy CLI** — decompiles the C# game DLL
   - `dotnet tool install ilspycmd -g`

3. **Node.js** and **Python 3.14+**

## Step 1: Extract game files

After a game update, re-extract the PCK and decompile the DLL:

```bash
bash parsers/sts2/extract_game_data.sh
```

This creates:
- `/tmp/sts2-pck` → symlink to extracted PCK (localization, images, etc.)
- `~/code/sts2-research/decompiled/` → decompiled C# source

## Step 2: Run the parser pipeline

```bash
bash parsers/sts2/update.sh
```

Runs 12 steps in order:

| Step | Script | What it does |
|------|--------|-------------|
| 1 | `parse_all.py` | Extract cards, relics, potions, powers, monsters, characters, keywords, events, enchantments from C# |
| 2 | `parse_events.js` | Enrich events with choices from C# + localization |
| 3 | `parse_monsters.js` | Enrich monsters with encounters and move patterns |
| 4 | `build_monster_data.cjs` | Build monster moves, patterns, effects, act assignments |
| 5 | `resolve_vars.py` | Resolve English template vars (`{Damage}`, `{Block}`, etc.) and upgrade descriptions |
| 6 | `build_localization.cjs` | Build localization JSONs for all 13 locales from PCK files |
| 7 | `build_event_localization.cjs` | Build event-specific localization |
| 8 | `resolve_localized_vars.cjs` | Resolve template vars in non-English descriptions |
| 9 | `build_monster_localization.cjs` | Build monster move name translations |
| 10 | `add_ancient_descriptions.cjs` | Add Ancient (boss NPC) descriptions |
| 11 | `build_patch_notes.cjs` | Convert BBCode patch notes to HTML |
| 12 | `subset_fonts.py` | Subset game fonts to woff2 (only chars actually used) |

**⚠️ Pipeline ordering matters.** Step 6 outputs raw templates; step 8 resolves them. Running steps individually without the full pipeline risks regressions.

## Step 3: Validate

Start the dev server, then run validation:

```bash
npx astro dev --port 4321 &
python3 parsers/validate.py --game sts2 --all-langs
```

This compares API output against parsed JSON across all 13 locales. All checks should pass (✅).

## Step 4: Build and test

```bash
npx astro check     # TypeScript type checking
npm run build        # Full production build
npx playwright test  # Smoke tests
```

## Step 5: Review and commit

```bash
git diff --stat                    # Review what changed
git add data/ public/fonts/        # Stage data + font changes
git commit -m "data: update STS2 game data (patch X.Y.Z)"
```

## Environment variables

| Variable | Default | Purpose |
|----------|---------|---------|
| `STS2_PCK_DIR` | `/tmp/sts2-pck` | Extracted PCK directory |
| `STS2_DECOMPILED_DIR` | `~/code/sts2-research/decompiled` | Decompiled C# source |

## Output files

All written to `data/sts2/`:

```
data/sts2/
├── cards.json, relics.json, potions.json, powers.json
├── monsters.json, events.json, enchantments.json
├── characters.json, keywords.json, patch_notes.json
└── localization/{de,es,fr,it,ja,ko,pl,pt,ru,th,tr,zh}.json
```

## Troubleshooting

### Unresolved template variables
Some vars are runtime-only (e.g., `{CombatsLeft}`, `{RandomRelic}`). These are handled by `RUNTIME_VAR_FALLBACKS` in `resolve_localized_vars.cjs`. If a new patch adds entities with runtime vars, trace the C# source for the default value and add a fallback entry.

### Missing card from character page
Check `parse_all.py` — the card might have a new `CardColor` enum value that needs mapping.

### Font rendering wrong for a locale
Check `themes/fonts/{locale}/` in the PCK for new scale transforms, then update `LOCALE_FONTS` in `src/components/react/CssCardRenderer.tsx`.

### Pipeline step fails
Never run `build_localization.cjs` (step 6) without also running `resolve_localized_vars.cjs` (step 8) after it. The first outputs raw templates; the second resolves them. Skipping step 8 will deploy unresolved `{Damage:diff()}` text to the site.
