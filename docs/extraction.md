# STS2 Game Data Extraction

How to extract and update game data when Slay the Spire 2 gets a patch.

## Overview

Two sources of data need extraction after each game update:

1. **PCK (Godot resource pack)** — localization files, fonts, scenes, images, themes
2. **C# DLL** — game logic (card/relic/monster definitions, variables, formulas)

## Prerequisites

| Tool | Purpose | Install |
|------|---------|---------|
| [GDRE Tools](https://github.com/bruvzg/gdsdecomp) | Extract .pck files | GitHub releases (macOS/Win/Linux) |
| [ILSpy](https://github.com/icsharpcode/ILSpy) | Decompile C# DLLs | `dotnet tool install -g ilspycmd` or GUI app |
| Python 3.10+ | Run parsers | Already installed |
| Node.js 20+ | Run parsers | Already installed |
| fonttools + brotli | Font subsetting | `pip install fonttools brotli` |

## Step 1: Update the Game

```bash
# Steam auto-updates, or force it:
# Steam → Library → Slay the Spire 2 → Properties → Updates → Always keep up to date
```

Game install location (macOS):
```
~/Library/Application Support/Steam/steamapps/common/Slay the Spire 2/
```

Key files:
- **PCK**: `SlayTheSpire2.app/Contents/Resources/Slay the Spire 2.pck`
- **DLL**: `SlayTheSpire2.app/Contents/Resources/data_sts2_macos_arm64/sts2.dll`

## Step 2: Extract PCK (GDRE Tools)

The PCK file has an encrypted directory listing (flag `0x0002`). GDRE Tools handles this automatically — no manual key needed.

```bash
# CLI (headless):
gdre_tools --headless \
  --recover="~/Library/Application Support/Steam/steamapps/common/Slay the Spire 2/SlayTheSpire2.app/Contents/Resources/Slay the Spire 2.pck" \
  --output-dir=/tmp/sts2-pck

# Or use the GUI: File → Open PCK → select the .pck → Extract
```

> **Note**: If a future update adds full file encryption (flag `0x0003`), GDRE may need the encryption key. The key is typically embedded in the game executable — GDRE can often extract it automatically, or you may need to pass `--key=<hex>`. Check the GDRE docs.

This produces `/tmp/sts2-pck/` with:
- `localization/` — JSON files per language (eng, jpn, kor, zhs, deu, fra, spa, ptb, ita, pol, rus, tur, tha)
- `fonts/` — game fonts (+ locale subdirs: jpn, kor, zhs, rus, tha)
- `themes/` — font scale transforms per locale
- `scenes/` — Godot scene files (.tscn)
- `images/` — card portraits, UI elements
- `src/` — GDScript source

Last known GDRE version: **v2.4.0**
Last known game engine: **Godot 4.5.1**

## Step 3: Decompile C# DLL (ILSpy)

```bash
# Using ilspycmd:
ilspycmd \
  "~/Library/Application Support/Steam/steamapps/common/Slay the Spire 2/SlayTheSpire2.app/Contents/Resources/data_sts2_macos_arm64/sts2.dll" \
  -p -o ~/code/sts2-research/decompiled/

# Or use ILSpy GUI: File → Open → sts2.dll → File → Save Code
```

Output structure: one folder per namespace, e.g.:
- `MegaCrit.Sts2.Core.Models.Cards/` — card definitions (Bash.cs, etc.)
- `MegaCrit.Sts2.Core.Models.Relics/` — relic definitions
- `MegaCrit.Sts2.Core.Models.Potions/` — potion definitions
- `MegaCrit.Sts2.Core.Models.Monsters/` — monster definitions
- `MegaCrit.Sts2.Core.MonsterMoves/` — monster move logic
- `MegaCrit.Sts2.Core.Models.Acts/` — act definitions
- `MegaCrit.Sts2.Core.Models.Encounters/` — encounter definitions

Decompiled source location: `~/code/sts2-research/decompiled/`

## Step 4: Run the Parser Pipeline

```bash
cd ~/code/sts1-data
bash parsers/update.sh
```

Or with explicit paths:
```bash
bash parsers/update.sh \
  --pck-dir /tmp/sts2-pck \
  --decompiled-dir ~/code/sts2-research/decompiled
```

### Pipeline Steps (12 total)

| Step | Script | What It Does |
|------|--------|-------------|
| 1-4 | `parse_sts2_all.py` | Extract cards, relics, potions, keywords, characters from C# source |
| 5 | `parse_sts2_events.js` | Parse events from C# + localization |
| 6 | `build_monster_data.cjs` | Parse monster data from C# (moves, patterns, effects, acts) |
| 7 | `resolve_sts2_vars.py` | Resolve template variables in English descriptions |
| 8 | `resolve_localized_vars.cjs` | Resolve template vars in localized descriptions |
| 9 | `build_event_localization.cjs` | Build event localization from raw game files |
| 10 | `build_monster_localization.cjs` | Build monster move name localization |
| 11 | `add_sts2_ancient_descriptions.cjs` | Add Ancient (boss NPC) descriptions |
| 12 | `build_patch_notes.cjs` | Convert BBCode patch notes to HTML |
| 13 | `subset_fonts.py` | Subset game fonts to woff2 (only chars we use) |

### Environment Variables

| Variable | Default | Purpose |
|----------|---------|---------|
| `STS2_PCK_DIR` | `/tmp/sts2-pck` | Extracted PCK directory |
| `STS2_DECOMPILED_DIR` | `~/code/sts2-research/decompiled` | Decompiled C# source |

## Step 5: Verify

```bash
# Run regression tests
npx playwright test

# Check dev server
npx astro dev --port 4323
# Browse: http://localhost:4323/sts2/cards
```

### What to Check After an Update

- New cards/relics/potions appear in explorer pages
- Card descriptions render correctly (no unresolved `{variables}`)
- Localized text looks right for CJK + RTL languages
- Card images load (may need new portraits from PCK)
- Monster pages if new monsters added
- Patch notes page has the new entry

## Step 6: Extract New Card Images (if needed)

Card portraits are in the PCK at `images/cards/`:
```bash
# Copy new card images
cp /tmp/sts2-pck/images/cards/*.png public/images/sts2/cards/

# Filenames should be lowercase: bash.png, creative_ai.png, etc.
# The game uses the card ID lowercased as the filename
```

## Troubleshooting

### "unresolved template variable" warnings
A few variables are runtime-only (e.g., `{CombatsLeft}`, `{RandomRelic}`). These can't be resolved statically — they stay as `{VarName}` in the output.

### New DynamicVar types
If `resolve_sts2_vars.py` logs unknown var types, add them to the `VAR_TYPES` dict. Check the C# source for the var class definition.

### Missing card from character page
Check `parse_sts2_all.py` — the card might have a new `CardColor` enum value that needs mapping.

### Font rendering looks wrong for a locale
Check `themes/fonts/{locale}/` in the PCK for any new scale transforms, then update `LOCALE_FONTS` in `CssCardRenderer.tsx`.

## File Locations Summary

```
~/code/sts1-data/              # Project root
├── parsers/                   # All extraction/transform scripts
│   ├── update.sh              # Pipeline orchestrator
│   ├── config.cjs             # Shared config (paths)
│   ├── config.py              # Python config
│   └── subset_fonts.py        # Font subsetting
├── data/sts2/                 # Generated JSON data
│   ├── cards.json
│   ├── relics.json
│   ├── potions.json
│   ├── powers.json
│   ├── monsters.json
│   ├── events.json
│   ├── enchantments.json
│   ├── characters.json
│   ├── keywords.json
│   ├── patch_notes.json
│   └── localization/{lang}.json
├── public/fonts/              # Subsetted game fonts
├── public/images/sts2/        # Game images
└── docs/                      # This documentation
    ├── extraction.md          # ← you are here
    └── font-system.md
```
