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










## Validation Run Results

sts1/cards/en: ✅ (360 items)
sts1/cards/de: ✅ (360 items)
sts1/cards/es: ✅ (360 items)
sts1/cards/fr: ✅ (360 items)
sts1/cards/it: ✅ (360 items)
sts1/cards/ja: ✅ (360 items)
sts1/cards/ko: ✅ (360 items)
sts1/cards/pl: ✅ (360 items)
sts1/cards/pt: ✅ (360 items)
sts1/cards/ru: ✅ (360 items)
sts1/cards/th: ✅ (360 items)
sts1/cards/tr: ✅ (360 items)
sts1/cards/zh: ✅ (360 items)
sts1/relics/en: ✅ (181 items)
sts1/relics/de: ✅ (181 items)
sts1/relics/es: ✅ (181 items)
sts1/relics/fr: ✅ (181 items)
sts1/relics/it: ✅ (181 items)
sts1/relics/ja: ✅ (181 items)
sts1/relics/ko: ✅ (181 items)
sts1/relics/pl: ✅ (181 items)
sts1/relics/pt: ✅ (181 items)
sts1/relics/ru: ✅ (181 items)
sts1/relics/th: ✅ (181 items)
sts1/relics/tr: ✅ (181 items)
sts1/relics/zh: ✅ (181 items)
sts1/potions/en: ✅ (42 items)
sts1/potions/de: ✅ (42 items)
sts1/potions/es: ✅ (42 items)
sts1/potions/fr: ✅ (42 items)
sts1/potions/it: ✅ (42 items)
sts1/potions/ja: ✅ (42 items)
sts1/potions/ko: ✅ (42 items)
sts1/potions/pl: ✅ (42 items)
sts1/potions/pt: ✅ (42 items)
sts1/potions/ru: ✅ (42 items)
sts1/potions/th: ✅ (42 items)
sts1/potions/tr: ✅ (42 items)
sts1/potions/zh: ✅ (42 items)
sts1/monsters/en: ✅ (66 items)
sts1/monsters/de: ✅ (66 items)
sts1/monsters/es: ✅ (66 items)
sts1/monsters/fr: ✅ (66 items)
sts1/monsters/it: ✅ (66 items)
sts1/monsters/ja: ✅ (66 items)
sts1/monsters/ko: ✅ (66 items)
sts1/monsters/pl: ✅ (66 items)
sts1/monsters/pt: ✅ (66 items)
sts1/monsters/ru: ✅ (66 items)
sts1/monsters/th: ✅ (66 items)
sts1/monsters/tr: ✅ (66 items)
sts1/monsters/zh: ✅ (66 items)
sts1/events/en: ✅ (52 items)
sts1/events/de: ✅ (52 items)
sts1/events/es: ✅ (52 items)
sts1/events/fr: ✅ (52 items)
sts1/events/it: ✅ (52 items)
sts1/events/ja: ✅ (52 items)
sts1/events/ko: ✅ (52 items)
sts1/events/pl: ✅ (52 items)
sts1/events/pt: ✅ (52 items)
sts1/events/ru: ✅ (52 items)
sts1/events/th: ✅ (52 items)
sts1/events/tr: ✅ (52 items)
sts1/events/zh: ✅ (52 items)
sts1/effects/en: ✅ (146 items)
sts1/effects/de: ✅ (146 items)
sts1/effects/es: ✅ (146 items)
sts1/effects/fr: ✅ (146 items)
sts1/effects/it: ✅ (146 items)
sts1/effects/ja: ✅ (146 items)
sts1/effects/ko: ✅ (146 items)
sts1/effects/pl: ✅ (146 items)
sts1/effects/pt: ✅ (146 items)
sts1/effects/ru: ✅ (146 items)
sts1/effects/th: ✅ (146 items)
sts1/effects/tr: ✅ (146 items)
sts1/effects/zh: ✅ (146 items)
sts2/cards/en: ✅ (576 items)
sts2/cards/de: ✅ (576 items)
sts2/cards/es: ✅ (576 items)
sts2/cards/fr: ✅ (576 items)
sts2/cards/it: ✅ (576 items)
sts2/cards/ja: ✅ (576 items)
sts2/cards/ko: ✅ (576 items)
sts2/cards/pl: ✅ (576 items)
sts2/cards/pt: ✅ (576 items)
sts2/cards/ru: ✅ (576 items)
sts2/cards/th: ✅ (576 items)
sts2/cards/tr: ✅ (576 items)
sts2/cards/zh: ✅ (576 items)
sts2/relics/en: ✅ (288 items)
sts2/relics/de: ✅ (288 items)
sts2/relics/es: ✅ (288 items)
sts2/relics/fr: ✅ (288 items)
sts2/relics/it: ✅ (288 items)
sts2/relics/ja: ✅ (288 items)
sts2/relics/ko: ✅ (288 items)
sts2/relics/pl: ✅ (288 items)
sts2/relics/pt: ✅ (288 items)
sts2/relics/ru: ✅ (288 items)
sts2/relics/th: ✅ (288 items)
sts2/relics/tr: ✅ (288 items)
sts2/relics/zh: ✅ (288 items)
sts2/potions/en: ✅ (63 items)
sts2/potions/de: ✅ (63 items)
sts2/potions/es: ✅ (63 items)
sts2/potions/fr: ✅ (63 items)
sts2/potions/it: ✅ (63 items)
sts2/potions/ja: ✅ (63 items)
sts2/potions/ko: ✅ (63 items)
sts2/potions/pl: ✅ (63 items)
sts2/potions/pt: ✅ (63 items)
sts2/potions/ru: ✅ (63 items)
sts2/potions/th: ✅ (63 items)
sts2/potions/tr: ✅ (63 items)
sts2/potions/zh: ✅ (63 items)
sts2/monsters/en: ✅ (111 items)
sts2/monsters/de: ✅ (111 items)
sts2/monsters/es: ✅ (111 items)
sts2/monsters/fr: ✅ (111 items)
sts2/monsters/it: ✅ (111 items)
sts2/monsters/ja: ✅ (111 items)
sts2/monsters/ko: ✅ (111 items)
sts2/monsters/pl: ✅ (111 items)
sts2/monsters/pt: ✅ (111 items)
sts2/monsters/ru: ✅ (111 items)
sts2/monsters/th: ✅ (111 items)
sts2/monsters/tr: ✅ (111 items)
sts2/monsters/zh: ✅ (111 items)
sts2/events/en: ✅ (66 items)
sts2/events/de: ✅ (66 items)
sts2/events/es: ✅ (66 items)
sts2/events/fr: ✅ (66 items)
sts2/events/it: ✅ (66 items)
sts2/events/ja: ✅ (66 items)
sts2/events/ko: ✅ (66 items)
sts2/events/pl: ✅ (66 items)
sts2/events/pt: ✅ (66 items)
sts2/events/ru: ✅ (66 items)
sts2/events/th: ✅ (66 items)
sts2/events/tr: ✅ (66 items)
sts2/events/zh: ✅ (66 items)
sts2/effects/en: ✅ (241 items)
sts2/effects/de: ✅ (241 items)
sts2/effects/es: ✅ (241 items)
sts2/effects/fr: ✅ (241 items)
sts2/effects/it: ✅ (241 items)
sts2/effects/ja: ✅ (241 items)
sts2/effects/ko: ✅ (241 items)
sts2/effects/pl: ✅ (241 items)
sts2/effects/pt: ✅ (241 items)
sts2/effects/ru: ✅ (241 items)
sts2/effects/th: ✅ (241 items)
sts2/effects/tr: ✅ (241 items)
sts2/effects/zh: ✅ (241 items)
sts2/enchantments/en: ✅ (22 items)
sts2/enchantments/de: ✅ (22 items)
sts2/enchantments/es: ✅ (22 items)
sts2/enchantments/fr: ✅ (22 items)
sts2/enchantments/it: ✅ (22 items)
sts2/enchantments/ja: ✅ (22 items)
sts2/enchantments/ko: ✅ (22 items)
sts2/enchantments/pl: ✅ (22 items)
sts2/enchantments/pt: ✅ (22 items)
sts2/enchantments/ru: ✅ (22 items)
sts2/enchantments/th: ✅ (22 items)
sts2/enchantments/tr: ✅ (22 items)
sts2/enchantments/zh: ✅ (22 items)
