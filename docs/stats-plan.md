# Run statistics (STS1)

A Stats tab built from Mega Crit's public dump of about 77 million runs (27 GB compressed), aimed at people balancing modded characters.

## What the data can and cannot answer

Each run records its final deck and relics, card reward choices, HP per floor, and one `damage_taken` row per fight (`enemies`, `floor`, `damage`, `turns`).

**It does not record damage dealt.** Damage taken per turn is measured. "Enemy HP ÷ turns" is an estimate of damage needed per turn and is labelled as such. It uses the enemy's base HP, so it ignores Ascension HP, block, overkill and split or multi-phase bosses, and it only exists for fights with known, fixed members.

Win rate with a card is a correlation. Final decks over-represent runs that survived long enough to collect cards.

## Using it

```bash
# 1. Extract the archive into a folder, then check the format matches.
py -3 parsers/stats/aggregate_runs.py "D:/sts-runs" --inspect

# 2. Trial run on a few files; read the rejected and unmatched counts.
py -3 parsers/stats/aggregate_runs.py "D:/sts-runs" --limit-files 20

# 3. Remove junk runs into a clean copy. Read cull_report.txt in the output folder.
py -3 parsers/stats/cull_runs.py "D:/sts-runs" "D:/sts-runs-clean"

# 4. Build the stats from the clean copy. Expect hours. Both steps resume if interrupted.
py -3 parsers/stats/aggregate_runs.py "D:/sts-runs-clean"
```

This writes `data/sts1/stats.json`. Restart the server and the Stats tab appears. It stays out of the navigation until that file exists.

Options: `--out FILE`, `--workers N`, `--min-sample N` (default 100; rows with fewer runs are dropped), `--min-floor N` (default 4).

## Which runs count

Rejected, with a count for each reason in `meta.rejected`: other characters; daily, endless, chosen-seed, trial and beta runs; invalid ascension or floor (most are floor 0, quit at the menu); missing deck or fights; runs ending before `--min-floor`; victories before floor 50; losses with no `killed_by` (quit runs); paths that don't match the floor count (second loops not flagged as endless); decks over 100 cards; fights recording 9999+ damage; and runs containing mod content (`Mod:Name` IDs).

`victory` is the game's own flag. Most wins end on floor 51 (Act 3 boss) or 56 (the Heart).

The dump spans several years of patches. Stats cover all of them by default, and the Stats tab's Game version filter narrows to a year or quarter of builds. Periods use the run's `build_version`, not when it was played, because card balance follows the build. Runs with an unreadable build count only toward All patches. `--min-build` on either script drops older builds entirely.

`cull_runs.py` applies these same rules and writes kept runs as gzipped JSON lines, leaving the input untouched. Aggregating the clean copy gives the same stats as aggregating the raw dump.

Rename-affected IDs are not rejected. They appear in `meta.unmatched` so the name mapping can be corrected.

## Output

`data/sts1/stats.json` holds all patches, and `data/sts1/stats-periods/<period>.json` holds each year and quarter. The main file has `meta` and `segments`, one per `<character>|<ascension>` for characters `all`, `ironclad`, `silent`, `defect`, `watcher` and bands `all`, `a0`, `a1_10`, `a11_19`, `a20`.

Each segment has:

| Field | Contents |
|---|---|
| `runs`, `wins`, `win_rate` | Totals |
| `metrics` | Mean, median, p10, p90 for wins and losses: deck size, upgrades, relics, potions used, purges, rests, smiths, cards picked, attack/skill/power share, average cost, HP % after each act |
| `deck_size_wins`, `survival` | Chart series |
| `acts` | Per act and fight type: fights, turns, damage taken per fight and per turn |
| `encounters` | The same per enemy group, plus estimated HP and damage needed per turn |
| `cards` | Offered, pick rate, deck rate, win rate with, win-rate delta, copies, upgrade rate |
| `relics`, `potions`, `neow`, `killed_by` | Frequency and win rate |

## Site

- `/sts1/stats`, with game version, character and ascension filters, tiles, two charts and sortable tables.
- `GET /api/sts1/stats?character=&ascension=&period=` returns one segment.
- `STATS_FILE` overrides the file path for tests.

## Testing

```bash
py -3 parsers/stats/test_aggregate_runs.py
STATS_FILE=tests/stats-fixtures/stats.json npx astro dev --port 4323
BASE_URL=http://localhost:4323 npx playwright test tests/stats.spec.ts
```

The format and filters were checked against `november.json`, a real 123,436-run sample. Older months could differ, so check `meta.rejected` after a `--limit-files` trial.
