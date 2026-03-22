#!/usr/bin/env bash
# extract_game_data.sh — Extract STS2 game data for the Spire Archive pipeline
#
# Prerequisites:
#   - GDRE Tools: https://github.com/GDRETools/gdsdecomp/releases
#     Download macOS zip, extract with: ditto -x -k GDRE_tools-*.zip /tmp/gdre_tools
#     (Do NOT use `unzip` — it strips the binary from the .app bundle on macOS)
#     Then: xattr -r -d com.apple.quarantine /tmp/gdre_tools/
#
#   - ILSpy CLI (for DLL decompilation):
#     dotnet tool install ilspycmd -g
#
# Usage:
#   bash parsers/extract_game_data.sh [--game-dir PATH] [--output-dir PATH]
#
# Defaults:
#   Game dir: auto-detected from Steam
#   Output dir: ~/code/sts2-research
#
# After extraction, a symlink /tmp/sts2-pck -> <output-dir>/extracted is created
# so the pipeline (update.sh) can find the localization files.

set -euo pipefail

# ── Config ──────────────────────────────────────────────────────────────────
GDRE_APP="/tmp/gdre_tools/Godot RE Tools.app/Contents/MacOS/Godot RE Tools"
OUTPUT_DIR="${HOME}/code/sts2-research"

# ── Auto-detect game dir ──────────────────────────────────────────────────
detect_game_dir() {
  local os=$(uname)
  case "$os" in
    Darwin)
      echo "${HOME}/Library/Application Support/Steam/steamapps/common/Slay the Spire 2"
      ;;
    Linux)
      for p in "${HOME}/.local/share/Steam" "${HOME}/.steam/steam"; do
        local d="${p}/steamapps/common/Slay the Spire 2"
        [ -d "$d" ] && echo "$d" && return
      done
      ;;
  esac
}

GAME_DIR=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --game-dir) GAME_DIR="$2"; shift 2 ;;
    --output-dir) OUTPUT_DIR="$2"; shift 2 ;;
    *) echo "Unknown arg: $1" >&2; exit 1 ;;
  esac
done

if [ -z "$GAME_DIR" ]; then
  GAME_DIR=$(detect_game_dir)
fi

if [ ! -d "$GAME_DIR" ]; then
  echo "ERROR: Game directory not found: $GAME_DIR" >&2
  echo "Use --game-dir to specify manually" >&2
  exit 1
fi

echo "Game dir: $GAME_DIR"
echo "Output dir: $OUTPUT_DIR"

# ── Find game files ─────────────────────────────────────────────────────────
PCK=$(find "$GAME_DIR" -name '*.pck' ! -name 'SpireBridge.pck' | head -1)
DLL=$(find "$GAME_DIR" -name 'sts2.dll' | head -1)

echo "PCK: $PCK"
echo "DLL: $DLL"

# ── Step 1: Extract PCK with GDRE Tools ────────────────────────────────────
if [ ! -f "$GDRE_APP" ]; then
  echo ""
  echo "GDRE Tools not found at: $GDRE_APP"
  echo "Install it:"
  echo "  1. Download from https://github.com/GDRETools/gdsdecomp/releases"
  echo "  2. Extract: ditto -x -k GDRE_tools-*.zip /tmp/gdre_tools"
  echo "  3. Remove quarantine: xattr -r -d com.apple.quarantine /tmp/gdre_tools/"
  exit 1
fi

EXTRACT_DIR="${OUTPUT_DIR}/extracted"
echo ""
echo "=== Step 1: Extracting PCK ==="
rm -rf "$EXTRACT_DIR"
"$GDRE_APP" --headless --recover="$PCK" --output-dir="$EXTRACT_DIR"

# Verify extraction
if [ ! -f "$EXTRACT_DIR/localization/eng/events.json" ]; then
  echo "ERROR: PCK extraction failed — localization files not found" >&2
  exit 1
fi
echo "✓ PCK extracted to $EXTRACT_DIR"

# ── Step 2: Decompile DLL with ILSpy ──────────────────────────────────────
if [ -n "$DLL" ] && command -v ilspycmd &>/dev/null; then
  DECOMPILED_DIR="${OUTPUT_DIR}/decompiled"
  echo ""
  echo "=== Step 2: Decompiling DLL ==="
  rm -rf "$DECOMPILED_DIR"
  ilspycmd -p -o "$DECOMPILED_DIR" "$DLL"
  echo "✓ DLL decompiled to $DECOMPILED_DIR"
elif [ -n "$DLL" ]; then
  echo ""
  echo "⚠ ilspycmd not found — skipping DLL decompilation"
  echo "  Install: dotnet tool install ilspycmd -g"
  echo "  Existing decompiled files at ${OUTPUT_DIR}/decompiled will be used"
else
  echo "⚠ DLL not found — skipping decompilation"
fi

# ── Step 3: Create symlink for pipeline ───────────────────────────────────
echo ""
echo "=== Step 3: Creating symlink ==="
rm -f /tmp/sts2-pck
ln -s "$EXTRACT_DIR" /tmp/sts2-pck
echo "✓ /tmp/sts2-pck -> $EXTRACT_DIR"

# ── Summary ───────────────────────────────────────────────────────────────
echo ""
echo "=== Done ==="
echo "  Extracted: $EXTRACT_DIR"
echo "  Decompiled: ${OUTPUT_DIR}/decompiled"
echo "  Symlink: /tmp/sts2-pck"
echo ""
echo "Localization files: $(find "$EXTRACT_DIR/localization" -name '*.json' | wc -l | tr -d ' ')"
echo "Languages: $(ls "$EXTRACT_DIR/localization/" | tr '\n' ' ')"
echo ""
echo "Next: cd $(dirname "$0")/../.. && bash parsers/sts2/update.sh"
