# Slay the Spire 1 Data Repository

A comprehensive, AI-agent-friendly repository of Slay the Spire game data extracted from localization files and decompiled Java source code.

## Structure

```
sts1-data/
├── README.md              # This file
├── cards/                 # All playable cards
│   ├── _index.md          # Summary table of all cards
│   ├── ironclad/          # Red cards (Attack/Skill/Power)
│   ├── silent/            # Green cards
│   ├── defect/            # Blue cards
│   ├── watcher/           # Purple cards
│   ├── colorless/         # Colorless cards
│   └── status-curse/      # Status and Curse cards
├── relics/                # All relics
│   ├── _index.md          # Summary table of all relics
│   └── *.md               # Individual relic files
├── potions/               # All potions
│   ├── _index.md          # Summary table of all potions
│   └── *.md               # Individual potion files
├── keywords.md            # Game mechanics and keywords
├── orbs.md                # Defect orb types and mechanics
├── stances.md             # Watcher stance types and mechanics
├── characters.md          # Character info and NPCs
├── blights.md             # Negative modifiers
└── ascension.md           # Difficulty system
```

## Card Format

Each card file contains:
- **Name**: Display name
- **Color**: Character class (Red/Green/Blue/Purple/Colorless/Curse)
- **Type**: Attack/Skill/Power/Status/Curse
- **Rarity**: Basic/Starter/Common/Uncommon/Rare/Special
- **Cost**: Base cost and upgraded cost (when different)
- **Target**: Enemy/Self/All Enemies/etc.
- **Description**: Effect text with placeholders resolved
- **Upgraded Description**: Enhanced effect when upgraded
- **Mechanics**: Key mechanical details
- **Tags**: Special card categories (Strike, etc.)

## Relic Format

Each relic file contains:
- **Name**: Display name
- **Tier**: Starter/Common/Uncommon/Rare/Boss/Shop/Special
- **Effect**: What the relic does
- **Flavor Text**: Lore description

## Potion Format

Each potion file contains:
- **Name**: Display name
- **Rarity**: Common/Uncommon/Rare
- **Effect**: What the potion does

## Data Sources

This repository was generated from:

1. **Localization Files** (`/tmp/sts-data/localization/eng/`):
   - `cards.json` - Card names and descriptions
   - `relics.json` - Relic names and descriptions
   - `potions.json` - Potion names and descriptions
   - `keywords.json` - Game mechanics definitions
   - `orbs.json`, `stances.json`, etc. - Other game elements

2. **Decompiled Java Source** (`/tmp/sts-decompiled/` and `/tmp/sts-full/`):
   - Card mechanics, costs, stats, upgrade effects
   - Relic tiers and properties
   - Potion rarities and properties

## Usage for AI Agents

This data is structured for easy retrieval:

1. **Quick Lookup**: Use `_index.md` files for summary tables
2. **Detailed Info**: Navigate to specific card/relic/potion files
3. **Mechanics Reference**: Check `keywords.md` for game rules
4. **Character Info**: Use `characters.md` for starting decks and HP

## Statistics

- **Cards**: 361 total
  - Ironclad: ~75 cards
  - Silent: ~75 cards
  - Defect: ~75 cards
  - Watcher: ~75 cards
  - Colorless: ~35 cards
  - Status/Curse: ~26 cards

- **Relics**: 186 total
- **Potions**: 43 total

## Notes

- Card descriptions use game notation:
  - `[E]` = Energy
  - `[G]` = Green energy 
  - `[B]` = Blue energy
  - `[W]` = White energy
  - `[R]` = Red energy
  - `!D!` = Damage value
  - `!B!` = Block value
  - `!M!` = Magic number value
  - `NL` = Newline

- Some cards have complex mechanics not fully captured in simple descriptions
- Upgraded costs use `upgradeBaseCost(N)` where N is the new cost, not a modifier
- Status and Curse cards are grouped together as they're both non-playable

## Generation

This repository was automatically generated on 2026-03-14 from Slay the Spire game data.