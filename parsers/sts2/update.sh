#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
PARSERS_DIR="$ROOT_DIR/parsers"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --pck-dir)
      export STS2_PCK_DIR="$2"
      shift 2
      ;;
    --decompiled-dir)
      export STS2_DECOMPILED_DIR="$2"
      shift 2
      ;;
    *)
      echo "Unknown argument: $1" >&2
      echo "Usage: bash parsers/update.sh [--pck-dir PATH] [--decompiled-dir PATH]" >&2
      exit 1
      ;;
  esac
done

cd "$ROOT_DIR"

echo "STS2 pipeline"
echo "  project: $ROOT_DIR"
echo "  pck dir: ${STS2_PCK_DIR:-/tmp/sts2-pck}"
echo "  decompiled dir: ${STS2_DECOMPILED_DIR:-/Users/kuro/code/sts2-research/decompiled}"
echo

run_step() {
  local num="$1"
  local total="$2"
  shift 2
  echo "[$num/$total] $*"
  "$@"
  echo
}

TOTAL=14
run_step 1 "$TOTAL" python3 "$PARSERS_DIR/sts2/parse_all.py"
run_step 2 "$TOTAL" node "$PARSERS_DIR/sts2/parse_events.js"
run_step 3 "$TOTAL" node "$PARSERS_DIR/sts2/parse_monsters.js"
run_step 4 "$TOTAL" node "$PARSERS_DIR/sts2/build_monster_data.cjs"
run_step 5 "$TOTAL" python3 "$PARSERS_DIR/sts2/resolve_vars.py"
run_step 6 "$TOTAL" node "$PARSERS_DIR/sts2/build_localization.cjs"
run_step 7 "$TOTAL" node "$PARSERS_DIR/sts2/parse_events.js" --localize
run_step 8 "$TOTAL" node "$PARSERS_DIR/sts2/resolve_localized_vars.cjs"
run_step 9 "$TOTAL" node "$PARSERS_DIR/sts2/build_monster_localization.cjs"
run_step 10 "$TOTAL" node "$PARSERS_DIR/sts2/add_ancient_descriptions.cjs"
run_step 11 "$TOTAL" node "$PARSERS_DIR/sts2/build_patch_notes.cjs"
run_step 12 "$TOTAL" bash -c 'node "$1" || true' _ "$PARSERS_DIR/sts2/build_changelog.cjs"
run_step 13 "$TOTAL" python3 "$PARSERS_DIR/sts2/sync_images.py" --pck-dir "${STS2_PCK_DIR:-/tmp/sts2-pck}"
run_step 14 "$TOTAL" python3 "$PARSERS_DIR/subset_fonts.py"

python3 - <<'PY'
import json
from pathlib import Path
root = Path.cwd() / 'data' / 'sts2'
files = [
    'cards.json',
    'relics.json',
    'potions.json',
    'powers.json',
    'monsters.json',
    'characters.json',
    'keywords.json',
    'events.json',
    'enchantments.json',
    'patch_notes.json',
    'changelog.json',
]
print('Summary:')
for name in files:
    path = root / name
    if not path.exists():
        print(f'  {name}: missing')
        continue
    data = json.loads(path.read_text())
    if isinstance(data, list):
        count = len(data)
    elif isinstance(data, dict):
        count = len(data)
    else:
        count = 0
    print(f'  {name}: {count}')
PY

# --- snapshot / version-history drift guard ---------------------------------
# The version-history engine (patch history UI + STS2 update watcher) depends on
# data/sts2/history/<version>/ snapshots recorded via snapshot.cjs. That step is
# NOT part of this pipeline, so it's easy to ship new live data without recording
# the version (this happened for 0.107.1). Warn loudly if live data is ahead of
# the newest recorded snapshot.
python3 - <<'PY'
import json, re, os
from pathlib import Path

hist = Path.cwd() / 'data' / 'sts2' / 'history'
versions_file = hist / 'versions.json'
if not versions_file.exists():
    print('\n⚠️  history/versions.json missing — run snapshot.cjs to record a version.')
    raise SystemExit(0)

versions = json.loads(versions_file.read_text())
def key(v): return [int(x) for x in re.findall(r'\d+', v.get('version',''))]
newest = max(versions, key=key)['version'] if versions else None

candidates = [
    Path.cwd() / 'release_info.json',
    Path(os.environ.get('STS2_EXTRACTED_DIR', Path.home()/'code/sts2-research/extracted')) / 'release_info.json',
]
game_ver = None
for c in candidates:
    if c.exists():
        try:
            game_ver = json.loads(c.read_text()).get('version','').lstrip('v') or None
            if game_ver: break
        except Exception:
            pass

print(f'\nVersion history: newest recorded snapshot = {newest}')
if game_ver:
    print(f'                 installed game version    = {game_ver}')
    def k(s): return [int(x) for x in re.findall(r'\d+', s)]
    if newest and k(game_ver) > k(newest):
        print(f'\n⚠️  DRIFT: game is {game_ver} but newest snapshot is {newest}.')
        print(f'    Record it (before overwriting live data next time) with:')
        print(f'      node parsers/sts2/snapshot.cjs --version {game_ver}')
        print(f'    then: node parsers/sts2/build_changelog.cjs')
else:
    print('                 (could not detect installed game version — verify snapshot manually)')
PY
