#!/usr/bin/env bash
set -euo pipefail

# Archive STS2 game source files for a specific version.
# Stores the minimum files needed to re-run the parser pipeline.
#
# Usage:
#   bash parsers/sts2/archive_game_files.sh [--version X.Y.Z]
#
# If --version is omitted, reads it from release_info.json.
# Env vars (same as update.sh):
#   STS2_DECOMPILED_DIR  (default: ~/code/sts2-research/decompiled)
#   STS2_EXTRACTED_DIR   (default: ~/code/sts2-research/extracted)

ARCHIVE_ROOT="${STS2_ARCHIVE_DIR:-$HOME/code/sts2-research/archives}"
DECOMPILED_DIR="${STS2_DECOMPILED_DIR:-$HOME/code/sts2-research/decompiled}"
EXTRACTED_DIR="${STS2_EXTRACTED_DIR:-$HOME/code/sts2-research/extracted}"

VERSION=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --version) VERSION="$2"; shift 2 ;;
    *) echo "Unknown arg: $1" >&2; exit 1 ;;
  esac
done

# Auto-detect version from release_info.json
if [[ -z "$VERSION" ]]; then
  RELEASE_INFO="$EXTRACTED_DIR/release_info.json"
  if [[ ! -f "$RELEASE_INFO" ]]; then
    echo "No --version given and $RELEASE_INFO not found." >&2
    exit 1
  fi
  VERSION=$(python3 -c "import json; print(json.load(open('$RELEASE_INFO'))['version'].lstrip('v'))")
  echo "Auto-detected version: $VERSION"
fi

DEST="$ARCHIVE_ROOT/v$VERSION"

if [[ -d "$DEST" ]]; then
  echo "Archive already exists: $DEST"
  echo "Skipping (use rm -rf to re-archive)."
  exit 0
fi

echo "Archiving v$VERSION → $DEST"
mkdir -p "$DEST"

# 1. Decompiled C# source (~22MB)
if [[ -d "$DECOMPILED_DIR" ]]; then
  echo "  Copying decompiled source..."
  cp -r "$DECOMPILED_DIR" "$DEST/decompiled"
else
  echo "  WARNING: decompiled dir not found at $DECOMPILED_DIR" >&2
fi

# 2. Localization files (~11MB)
LOC_DIR="$EXTRACTED_DIR/localization"
if [[ -d "$LOC_DIR" ]]; then
  echo "  Copying localization..."
  cp -r "$LOC_DIR" "$DEST/localization"
else
  echo "  WARNING: localization dir not found at $LOC_DIR" >&2
fi

# 3. release_info.json
if [[ -f "$EXTRACTED_DIR/release_info.json" ]]; then
  cp "$EXTRACTED_DIR/release_info.json" "$DEST/"
fi

SIZE=$(du -sh "$DEST" | cut -f1)
echo "Done. Archived $SIZE to $DEST"
echo ""
echo "To re-run the parser against this version:"
echo "  STS2_PCK_DIR=$DEST \\"
echo "  STS2_DECOMPILED_DIR=$DEST/decompiled \\"
echo "  bash parsers/sts2/update.sh"
