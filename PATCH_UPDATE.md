# Patch Update Procedure

How to update Spire Archive when a new STS2 patch drops.

## Prerequisites

- **Steam**: STS2 updated to latest version
- **GDRE Tools**: v2.4.0+ (`brew install gdre-tools` or from GitHub)
- **ILSpy**: `dotnet tool install -g ilspycmd` (currently v8.2.0.7535)
- **Node.js**: v24+, **Python**: 3.12+

## Paths

| What | Path |
|---|---|
| STS2 game | `~/Library/Application Support/Steam/steamapps/common/Slay the Spire 2/` |
| Game PCK | `.../SlayTheSpire2.app/Contents/Resources/Slay the Spire 2.pck` |
| Game DLL | `.../SlayTheSpire2.app/Contents/Resources/data_sts2_macos_arm64/sts2.dll` |
| PCK extract dir | `/tmp/sts2-pck/` |
| Decompiled C# | `~/code/sts2-research/decompiled/` |
| Spire Archive repo | `~/code/spire-archive/` |
| Raw localization | `data/sts2-localization/` (checked into repo) |

## Steps

### 1. Update the game via Steam

Make sure STS2 is updated. Verify version in-game or check Steam.

### 2. Extract PCK (game assets + localization)

```bash
# Extract the PCK file to /tmp/sts2-pck/
gdre_tools --headless --recover="$HOME/Library/Application Support/Steam/steamapps/common/Slay the Spire 2/SlayTheSpire2.app/Contents/Resources/Slay the Spire 2.pck" --output-dir=/tmp/sts2-pck
```

This extracts localization JSONs, textures, scenes, animations, etc.

### 3. Decompile the game DLL (C# source)

```bash
# Decompile sts2.dll into individual .cs files
ilspycmd "$HOME/Library/Application Support/Steam/steamapps/common/Slay the Spire 2/SlayTheSpire2.app/Contents/Resources/data_sts2_macos_arm64/sts2.dll" \
  --project --outputdir ~/code/sts2-research/decompiled/
```

This gives us the C# source for all game entities — needed for extracting variable values (damage, block, etc.).

### 4. Copy updated localization files

```bash
# Sync localization from PCK extract to the repo
cp -R /tmp/sts2-pck/localization/* ~/code/spire-archive/data/sts2-localization/
```

### 5. Run the parser pipeline

```bash
cd ~/code/spire-archive
bash parsers/update.sh
```

This runs 12 steps:
1. Parse all STS2 entities from decompiled C# → JSON
2. Parse events
3. Parse monsters
4. Build monster data
5. Resolve English template variables
6. Build localization (all 13 languages)
7. Build event localization
8. **Resolve localized vars** (this is where `{:diff()}`, `{Amount}`, etc. get fixed)
9. Build monster localization
10. Add ancient descriptions
11. Build patch notes
12. Subset fonts

### 6. Validate

```bash
python3 validate.py --all
```

Expect **169/169 ✅** (or more if new entities added). If any ⚠️ appear:
- New `{Amount}` in enchantments/powers → add to `RUNTIME_VAR_FALLBACKS` in `parsers/resolve_localized_vars.cjs`
- New `{:diff()}` → should auto-resolve (generic logic)
- New `{Var:diff)}` typos → should auto-correct (generic logic)
- New runtime vars → trace the C# source, add fallback entry

### 7. Check for new/removed entities

```bash
# Quick diff: what changed in data files?
git diff --stat data/sts2/
```

Look for:
- New cards/relics/potions/etc. (count changes in the pipeline summary)
- Removed or renamed entities
- New entity types

### 8. Build and test

```bash
# Type check
npx astro check

# Full build
npm run build

# Playwright smoke tests (optional but recommended)
npx playwright test
```

### 9. Render new card images (if cards changed)

If new cards were added or existing card descriptions changed:

```bash
# TODO: document card image rendering pipeline
# This uses the CSS card renderer + Playwright screenshots
```

### 10. Commit and push

```bash
git add -A
git commit -m "data: update STS2 data for patch X.Y.Z"
git push
```

CI will deploy to Azure Container Apps via Cloudflare.

---

## Quick Version (copy-paste)

```bash
# 1. Update game in Steam first, then:
STS2="$HOME/Library/Application Support/Steam/steamapps/common/Slay the Spire 2/SlayTheSpire2.app/Contents/Resources"

# 2. Extract PCK
gdre_tools --headless --recover="$STS2/Slay the Spire 2.pck" --output-dir=/tmp/sts2-pck

# 3. Decompile
ilspycmd "$STS2/data_sts2_macos_arm64/sts2.dll" --project --outputdir ~/code/sts2-research/decompiled/

# 4. Copy localization
cp -R /tmp/sts2-pck/localization/* ~/code/spire-archive/data/sts2-localization/

# 5. Parse
cd ~/code/spire-archive && bash parsers/update.sh

# 6. Validate
python3 validate.py --all

# 7. Build + test
npx astro check && npm run build

# 8. Commit
git add -A && git commit -m "data: update STS2 data for patch X.Y.Z" && git push
```

## Troubleshooting

- **`gdre_tools` not found**: Install from https://github.com/bruvzg/gdsdecomp/releases
- **`ilspycmd` not found**: `dotnet tool install -g ilspycmd`
- **Pipeline step fails**: Check if C# class structure changed (new base classes, renamed fields)
- **Validation warnings after fix**: Check `RUNTIME_VAR_FALLBACKS` in `resolve_localized_vars.cjs`
- **Build fails**: Usually a new entity type or changed data schema — check Astro/TypeScript errors
