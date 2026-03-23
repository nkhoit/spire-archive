# Parsers

Extraction and transform scripts for both games.

## Structure

```text
parsers/
├── README.md           # this file
├── validate.py         # cross-game API validation (all entities × 13 locales)
├── subset_fonts.py     # subset game fonts for web
├── sts1/               # STS1 parsers (read from game JAR)
│   ├── README.md
│   ├── parse_all.py
│   ├── build_localization.cjs
│   ├── build_mechanics_data.py
│   └── ... (14 files total)
└── sts2/               # STS2 parsers (read from PCK extraction + decompiled C#)
    ├── README.md       # full pipeline docs
    ├── update.sh       # runs the 12-step pipeline
    ├── extract_game_data.sh
    ├── config.cjs/mjs/py
    ├── parse_all.py
    └── ... (16 files total)
```

## Quick Reference

**STS2 full update** (new game patch):
```bash
bash parsers/sts2/extract_game_data.sh   # re-extract PCK + decompile DLL
bash parsers/sts2/update.sh              # 12-step pipeline
```

**STS2 pipeline re-run** (parser code changed):
```bash
bash parsers/sts2/update.sh
```

**Validate** (requires dev server on port 4321):
```bash
python3 parsers/validate.py --game sts2 --all-langs
python3 parsers/validate.py --game sts1 --all-langs
```

**Subset fonts only**:
```bash
python3 parsers/subset_fonts.py
```

See `sts2/README.md` for the full pipeline breakdown and troubleshooting.
