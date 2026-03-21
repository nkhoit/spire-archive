# STS2 Card Font System

## How It Works

Card text uses the same fonts as the actual game, subsetted to only the characters we need.

### Font Mapping (from game's `themes/fonts/{locale}/`)

| Locale | Font | Scale | Source |
|--------|------|-------|--------|
| en, de, fr, es, pt, it, pl, tr | Kreon Regular/Bold | 1.0 | `fonts/kreon_*.ttf` |
| ja | Noto Sans CJK JP Medium/Bold | 0.95 | `fonts/jpn/NotoSansCJK*.otf` |
| zh | Source Han Serif SC Medium/Bold | 0.95 | `fonts/zhs/SourceHanSerif*.otf` |
| ko | Gyeonggi Cheonnyeon Batang Bold | 0.90 | `fonts/kor/Gyeonggi*.ttf` |
| ru | Fira Sans Extra Condensed Reg/Bold | 0.95 | `fonts/rus/FiraSans*.ttf` |
| th | CSChat Thai UI | 0.95 | `fonts/tha/CSChatThaiUI.ttf` |

Scale factors come from the game's `.tres` font theme files (`variation_transform`).

### Auto-Fit (MegaLabel replication)

The game uses `MegaLabel.AdjustFontSize()` — binary search between `MinFontSize` and `MaxFontSize` to find the largest size that fits.

We replicate this with `useAutoFit()` hook in `CssCardRenderer.tsx`:
- **Title**: max 60px × scale, min 55% of that
- **Description**: max 43px × scale, min 24px × scale
- Binary search on `fontSize` until `scrollHeight <= containerHeight`

### Files

- `src/components/react/CssCardRenderer.tsx` — `LOCALE_FONTS` config + `useAutoFit()` hook
- `src/components/react/CssCardRenderer.css` — `@font-face` declarations, `--locale-font` CSS var
- `public/fonts/*.woff2` — subsetted font files
- `parsers/subset_fonts.py` — subsetting script (step 12 of `update.sh`)

### When New Cards Are Added

1. Run `parsers/update.sh` — step 12 automatically re-subsets fonts with new characters
2. Or run standalone: `python3 parsers/subset_fonts.py`
3. The script reads ALL data files to extract unique chars per locale
4. Requires: `pip install fonttools brotli` and game files at `$STS2_PCK_DIR` (default `/tmp/sts2-pck`)

### Adding a New Locale Font

1. Find the font in `$STS2_PCK_DIR/fonts/{locale}/`
2. Check `$STS2_PCK_DIR/themes/fonts/{locale}/` for scale transform
3. Add entry to `FONT_MAP` in `parsers/subset_fonts.py`
4. Add `@font-face` in `CssCardRenderer.css`
5. Add entry to `LOCALE_FONTS` in `CssCardRenderer.tsx`
6. Run `python3 parsers/subset_fonts.py`
