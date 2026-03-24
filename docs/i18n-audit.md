# i18n Audit — Untranslated Strings in Spire Archive

## Summary
Sweep of all `.astro` and `.tsx` files for hardcoded English strings that should be wrapped in `t()` or passed `locale` to Badge.

---

## Category 1: Simple `t()` wraps needed (low risk)

### events/[id].astro
- **"What happens..."** (lines 195, 199, 214, 249) — collapsible summary text, 4 occurrences
- **"Locked if:"** (lines 195, 214, 248) — lock prefix, 3 occurrences  
- **"Flavor Text ({count})"** (line 223) — collapsible summary

### CardDetail.astro
- **"Upgrade adds Innate."** (line 413) — static text
- **"Tags"** (line 381) — section header
- **"Card Variants"** (line 390) — section header
- **"Tinker Time"** (line 392) — reference to event name (tricky — this is a game entity name)

### CardDetail.astro — Badge without locale
- **`<Badge label={String(card.color)} tone={String(card.color)} />`** (line 313) — missing `locale`

### CardDetail.astro — card.tags Badge
- **`<Badge label={t} />`** (line 383) — card tags passed without locale (variable shadowing! `t` here is the map callback variable, not the translation function)

---

## Category 2: STS1-only skips (the pattern we just fixed)

### relics/[id].astro
- **`locale={game === 'sts2' ? locale : undefined}`** (lines 27-28) — relic tier and color badges only translate for STS2

### potions/[id].astro  
- **`locale={game === 'sts2' ? locale : undefined}`** (lines 27-28) — potion rarity and color badges only translate for STS2

### characters/index.astro
- **`locale={isSts2 ? locale : undefined}`** (line 34) — character color badge only translates for STS2

---

## Category 3: Hardcoded act/location labels

### events/[id].astro (STS1 branch)
- **Act labels** (line 100): `'Act 1 — Exordium'`, `'Act 2 — The City'`, `'Act 3 — Beyond'`, `'Any Act — Shrine'` — hardcoded English in STS1 event badge. Needs compound translation.

### monsters/[id].astro
- **Act labels** (line ~15): Same pattern — `'Act 1 — Exordium'`, etc. Used in both badge and meta description.

---

## Category 4: Dev/admin pages (low priority)

### CardTuning.tsx
- ~15 hardcoded strings: "Card Tuning", "Card Selection", "Locale", "Type", "Search", "Size", "Title", "Description", "Type Label", "Energy", "Star Icon", "Actions", "Reset to Defaults", "Export JSON", "Import JSON", "Next →"
- This is a dev/tuning tool at `/sts2/cards/tuning` — probably not user-facing enough to prioritize

---

## Category 5: Site chrome (intentionally English?)

### Layout.astro
- **"Spire Archive"** (lines 82, 144) — site name/brand. Probably should stay English.

### index.astro (homepage)
- **"Spire Archive"**, **"Slay the Spire"**, **"Slay the Spire 2"** — game/brand names. Should stay English.

---

## Category 6: Complicated / needs investigation

### CardDetail.astro line 383 — variable shadowing
```tsx
{card.tags.map((t: string) => <Badge label={t} />)}
```
The callback parameter `t` shadows the translation function `t()`. The tags are raw English strings from game data (like "Starter", "Strike", "Defend"). These need to be translated but also the variable needs renaming to avoid shadowing.

### STS1 event act labels
The act labels use a compound format "Act 1 — Exordium". We'd need either:
- Separate translations for "Act 1" and "Exordium" composed together
- Or full compound strings in ui-strings.ts

### Monster act labels — same compound issue
