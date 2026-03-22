# Spire Archive — Data Validation Tracker

Validated: **2026-03-22** against local dev server + game files.

## Validation Chain
Game files → Parsed JSON (`data/`) → API output (per locale)

Script: `python3 validate.py --all` (requires dev server on :4321)

## Locales
`en`, `de`, `es`, `fr`, `it`, `ja`, `ko`, `pl`, `pt`, `ru`, `th`, `tr`, `zh` (13 total)

---

## STS1

| Entity | Count | EN | de | es | fr | it | ja | ko | pl | pt | ru | th | tr | zh |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Cards | 360 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Relics | 181 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Potions | 42 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Monsters | 66 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Events | 52 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Effects | 146 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |

**STS1: 78/78 ✅ — fully clean across all entities and locales.**

---

## STS2

| Entity | Count | EN | de | es | fr | it | ja | ko | pl | pt | ru | th | tr | zh |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Cards | 576 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ⚠️ | ⚠️ | ✅ | ⚠️ | ✅ | ✅ | ✅ |
| Relics | 288 | ✅ | ✅ | ✅ | ✅ | ✅ | ⚠️ | ✅ | ✅ | ✅ | ✅ | ⚠️ | ✅ | ⚠️ |
| Potions | 63 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Monsters | 111 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Events | 66 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Effects | 241 | ✅ | ⚠️ | ⚠️ | ⚠️ | ⚠️ | ⚠️ | ⚠️ | ⚠️ | ⚠️ | ⚠️ | ⚠️ | ⚠️ | ⚠️ |
| Enchantments | 22 | ✅ | ⚠️ | ⚠️ | ⚠️ | ⚠️ | ⚠️ | ⚠️ | ⚠️ | ⚠️ | ⚠️ | ⚠️ | ⚠️ | ⚠️ |

**STS2: 0 errors, all ⚠️ are unresolved template variables (see below).**

---

## Unresolved Variable Analysis

### Category 1: Runtime-only variables (UNFIXABLE — game fills these dynamically)

These variables are resolved by the game engine at runtime based on game state. The game's own localization files contain these templates. We display them as-is (same as the game's data files).

| Variable | Items | Locales | Notes |
|---|---|---|---|
| `{Amount}` | KNOCKDOWN_POWER, TAG_TEAM_POWER, DRUM_OF_BATTLE_POWER (effects); MOMENTUM, NIMBLE, SHARP, SWIFT, VIGOROUS (enchantments) | All non-EN | Multiplier/count determined at runtime. EN base data has hardcoded values. |
| `{Combats}` | BONE_TEA, EMBER_TEA (relics) | ja, th, zh | Number of remaining combats — changes during play. EN says "next combat" (singular). |
| `{:diff()}` | LIGHTNING_ROD, NEOWS_FURY (cards) | ko, ru | Upgrade diff function — shows "+X" at runtime. |
| `{OutbreakPower:diff()}` | OUTBREAK_POWER (effect) | pl | Same runtime diff pattern. |

### Category 2: Game source typos (UNFIXABLE — broken in the game's own files)

| Variable | Items | Locale | Notes |
|---|---|---|---|
| `{Summon:diff)}` | NECRO_MASTERY, SPUR (cards) | pl | Missing opening `{` — typo in Polish game files |
| `{Forge:diff)}` | WROUGHT_IN_WAR (card) | pl | Same malformed pattern |

### Recommendation

All warnings are either runtime-only variables or game-source typos. **Zero are bugs in our pipeline.** Options:
1. **Leave as-is** — accurate to the game's data files
2. **Strip unresolvable vars** — replace `{Amount}` with "X", `{:diff()}` with "" — cleaner but less faithful
3. **Hybrid** — strip only the malformed Polish ones (display artifacts), leave runtime vars

---

## Legend
- ✅ = All items match, no unresolved variables
- ⚠️ = Minor issues (unresolved runtime vars in game source data)
- ❌ = Data mismatches or missing items
