# Spire Archive

The complete database for [Slay the Spire](https://store.steampowered.com/app/646570/Slay_the_Spire/) and [Slay the Spire 2](https://store.steampowered.com/app/2868840/Slay_the_Spire_2/) — cards, relics, potions, characters, monsters, events, buffs & debuffs, enchantments, and keywords. All data parsed directly from game files, available in 13 languages.

**Live site:** [spire-archive.com](https://spire-archive.com)

## What's in here

- **Spire 1**: 361 cards, 181 relics, 42 potions, 4 characters, 66 monsters, 52 events, 146 effects
- **Spire 2**: 577 cards, 289 relics, 5 characters, enchantments, and more — parsed from game files (Early Access)
- **CSS card renderer**: Pure HTML/CSS card rendering that closely matches the in-game look
- **13 languages**: English, German, Spanish, French, Italian, Japanese, Korean, Polish, Portuguese, Russian, Thai, Turkish, Chinese
- **JSON API**: Filterable, localized endpoints for all game data — [interactive docs](https://spire-archive.com/api-docs)

## Stack

- **Astro** SSR with `@astrojs/node` adapter
- **React** islands for interactive components (explorers, CSS card renderer, filters)
- **Tailwind CSS v4**
- **Cloudflare** proxy + Azure Container Apps

## Local dev

```bash
npm install
npm run dev
# http://localhost:4321
```

## Data pipeline

Parsers in `parsers/` extract and transform game data from source files:

- **STS1**: Parsed from the game JAR (`parsers/sts1/`)
- **STS2**: Extracted from PCK game files + decompiled C# source (`parsers/sts2/`)

Output lands in `data/` as JSON, which the site reads at runtime.

```bash
# Re-run STS2 pipeline (after parser changes)
bash parsers/sts2/update.sh

# Validate API output against source data (all entities × 13 locales)
python3 parsers/validate.py --game sts2 --all-langs
```

See [`parsers/README.md`](parsers/README.md) for the full layout and workflow.

## API

All endpoints support `lang` for localization (default: `en`). Namespaced by game.

| Endpoint | Filters |
|----------|---------|
| `GET /api/{game}/cards` | `q`, `color`, `type`, `rarity`, `cost`, `lang`, `offset`, `limit` |
| `GET /api/{game}/relics` | `q`, `tier`, `color`, `lang`, `offset`, `limit` |
| `GET /api/{game}/potions` | `q`, `rarity`, `lang`, `offset`, `limit` |
| `GET /api/{game}/monsters` | `q`, `act`, `type`, `lang`, `offset`, `limit` |
| `GET /api/{game}/events` | `q`, `act`, `lang`, `offset`, `limit` |
| `GET /api/{game}/effects` | `q`, `type`, `lang`, `offset`, `limit` |
| `GET /api/{game}/search` | `q`, `lang`, `limit` |

STS2 also has: `/api/sts2/enchantments`

Detail: `GET /api/{game}/{resource}/:id?lang=ja`

## Deployment

Pushes to `main` auto-deploy via GitHub Actions → Docker → Azure Container Apps, behind Cloudflare.
