# Modded content (STS1 only)

Mods are opt-in additions to the Slay the Spire 1 catalogue. STS2 has no modded UI. Downfall is the first mod; its parser is written separately and only has to output the format below.

## Behaviour

- Cards, relics, potions, monsters, events and characters show an "Include Modded Content" checkbox, off by default.
- Beside it, a searchable dropdown ticks individual mods on or off. It is disabled until the checkbox is on. Newly added mods start ticked.
- The choice is stored in the browser and carries across tabs.
- Modded colors join the color filter on cards and relics, the tabs that already have one. Potions, monsters and events get no color filter.
- Deselecting a mod clears a color filter that belonged to it.
- Direct links to modded pages always work, whatever is ticked.
- Global search, the sitemap and home page counts stay base-game only.
- Mod text is English in every locale.

## How it works

- `getData()` stays base-game only, so existing callers and API responses do not change.
- `getModdedData()` merges every mod in and stamps each entry with `mod`, plus `color_label`, `color_hex` and `asset_color` where it has a color.
- List APIs take `?mods=a,b`. Filtering is server-side so totals and paging stay correct.
- `GET /api/sts1/mods` lists installed mods.
- Modded characters are rendered `hidden` with `data-mod` and revealed in the browser.
- `MODS_DIR` overrides `data/mods`; the Playwright fixture mods use it.

## Mod format

```text
data/mods/<modId>/
  mod.json          required
  characters.json   cards.json   relics.json   potions.json
  monsters.json     events.json  powers.json   keywords.json
  card_powers.json
```

All files except `mod.json` are optional. Entity files use the same fields as `data/sts1/<file>.json`.

```json
{
  "id": "downfall",
  "name": "Downfall",
  "author": "Optional",
  "url": "https://optional.example",
  "colors": [
    { "id": "slimeboss", "label": "Slime Boss", "hex": "#7fbf4d", "asset_color": "slimeboss" }
  ]
}
```

`asset_color` is optional and picks the card frame and energy orb. Without it, cards use the colorless frame. Setting it to `red`, `green`, `blue` or `purple` borrows base art. A custom value needs `bg_<attack|skill|power>_<value>.png` and `card_<value>_orb.png` in `public/images/sts1/cardui/`.

## Parser checklist

`tests/mods.spec.ts` enforces these.

- Folder name equals `mod.json` `id`.
- Every ID is uppercase, starts with `<MODID>_` and uses only `A-Z`, `0-9` and `_`.
- `color` is lowercase. On cards, relics and characters it is a base color or one listed in `mod.json`.
- Monsters have `act` (the STS1 act filter uses it) and `acts`.
- `starting_deck` and `starting_relic` use prefixed IDs that exist.
- Card text uses `[E]` for the energy icon.
- Images:
  - cards: `public/images/sts1/cards/<lowercase id>.png`
  - relics: `icon` set, file in both `public/images/sts1/relics/` and `relics-list/`
  - potions: `icon` set, file in `public/images/sts1/potions/`
  - characters: `public/images/sts1/characters/<color>.jpg`

## Testing

```bash
MODS_DIR=tests/mod-fixtures npx astro dev --port 4323
BASE_URL=http://localhost:4323 npx playwright test tests/mods.spec.ts
```

The browser tests skip themselves when the server is not running with the fixture mods. The format checks always run.

## Downfall

`py -3 parsers/mods/extract_downfall.py` reads an installed `Downfall.jar` and writes the 10 characters, their starter cards and starter relics, with portraits, card frames and art. It needs Pillow and a JDK. Other Downfall cards, relics, potions, monsters and events are not extracted yet.

## Open before deploying Downfall

Confirm permission to host Downfall's art and text on the public site.
