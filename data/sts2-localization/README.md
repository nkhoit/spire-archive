# Localization

This directory contains translation files for all supported languages.

## Directory Structure

```
localization/
  eng/          # English (source)
  deu/          # German
  esp/          # Spanish
  ita/          # Italian
  jpn/          # Japanese
  kor/          # Korean
  pol/          # Polish
  ptb/          # Portuguese (Brazil)
  rus/          # Russian
  tha/          # Thai
  tur/          # Turkish
  zhs/          # Chinese (Simplified)
```

Each language folder contains JSON files with key-value translations.

## Weblate Integration

Translations are managed via [Weblate](https://hosted.weblate.org/projects/slaythespire2/).

### Sync Workflow

```
┌─────────────────────────────────────────────────────────────┐
│                     WEEKLY SYNC CYCLE                       │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  1. Translators work in Weblate                             │
│                    ↓                                        │
│  2. CI: weblate-download (scheduled weekly)                 │
│     - Downloads translations from Weblate                   │
│     - Detects which components changed (git diff)           │
│     - LOCKS only those components in Weblate                │
│     - Saves locked list to .weblate_locked_components.json  │
│     - Creates MR with changes + locked list file            │
│                    ↓                                        │
│     ┌──────────────────────────────────────────────┐        │
│     │ LOCKED: cards, relics (example)              │        │
│     │ UNLOCKED: powers, events, monsters, etc.     │        │
│     │ Translators can still work on unlocked files │        │
│     └──────────────────────────────────────────────┘        │
│                    ↓                                        │
│  3. CI: test-localization (runs on MR)                      │
│     - Validates BBCode, placeholders, SmartFormat           │
│     - Fails if translations have technical errors           │
│                    ↓                                        │
│  4. Human review                                            │
│     - Fix validation errors if any                          │
│     - Merge MR to main                                      │
│                    ↓                                        │
│  5. CI: weblate-upload-translations (on merge to main)      │
│     - Uploads any fixes back to Weblate                     │
│     - Reads .weblate_locked_components.json                 │
│     - UNLOCKS only those components                         │
│     - Deletes the locked list file                          │
│                    ↓                                        │
│     ┌──────────────────────────────────────────────┐        │
│     │ ALL COMPONENTS UNLOCKED                      │        │
│     │ Translators have full access again           │        │
│     └──────────────────────────────────────────────┘        │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**If MR is abandoned**: Run `$JOB=weblate-unlock` to unlock all components.

### Component Locking

During the sync cycle, only components (JSON files) with changes are locked in Weblate. Translators can continue working on other components.

If an MR is abandoned, run the `weblate-unlock` CI job to unlock all components.

### CI Jobs

| Job                           | Trigger                              | Description                      |
|-------------------------------|--------------------------------------|----------------------------------|
| `weblate-upload`              | Push to main (eng changes)           | Upload English source strings    |
| `weblate-download`            | Scheduled / `$JOB=weblate-download`  | Download translations, create MR |
| `weblate-upload-translations` | Push to main (translation changes)   | Upload fixes, unlock components  |
| `weblate-unlock`              | `$JOB=weblate-unlock`                | Manual unlock all components     |
| `test-localization`           | MR with localization changes         | Validate translations            |

### CLI Tool

The `ci/scripts/weblate.py` script handles Weblate API interactions:

```bash
# Upload English source files
python ci/scripts/weblate.py upload

# Upload translations for a specific language
python ci/scripts/weblate.py upload-translations zh_Hans

# Download translations and create MR
python ci/scripts/weblate.py download

# Lock/unlock components
python ci/scripts/weblate.py lock              # Lock all
python ci/scripts/weblate.py unlock            # Unlock all
python ci/scripts/weblate.py unlock-changed    # Unlock only previously locked
```

## Validation

The `ci/scripts/validate_translations.py` script checks:

- BBCode tags match English exactly
- Placeholder variables (`{0}`, `{Name}`, etc.) are preserved
- SmartFormat syntax is valid
- Numbers in certain contexts are preserved

Run locally:
```bash
python ci/scripts/validate_translations.py
```

## Adding a New Language

1. Create the language folder (use 3-letter code)
2. Add the language mapping to `ci/scripts/weblate.py` in `LANGUAGES`
3. Run `python ci/scripts/weblate.py setup` to create Weblate components
4. Add the folder to `.gitlab-ci.yml` `weblate-upload-translations` job

## File Format

JSON files with string keys and values:

```json
{
  "KEY_NAME": "Translated text with {placeholders} and [bbcode]tags[/bbcode]"
}
```

Keys must match English exactly. Values contain the translation.

## BBCode Tags

Translations must use the same BBCode tags as English:

| Tag                    | Purpose          |
|------------------------|------------------|
| `[b]...[/b]`           | Bold             |
| `[i]...[/i]`           | Italic           |
| `[color=X]...[/color]` | Colored text     |
| `[gold]...[/gold]`     | Gold highlight   |
| `[purple]...[/purple]` | Purple highlight |
| `[jitter]...[/jitter]` | Shaking text     |
| `[sine]...[/sine]`     | Wavy text        |

Translators cannot add or remove BBCode tags. If English has `[b]word[/b]`, the translation must also have exactly one `[b]...[/b]` tag.
