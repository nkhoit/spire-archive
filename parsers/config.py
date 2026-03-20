from pathlib import Path
import os

PROJECT_ROOT = Path(__file__).resolve().parent.parent
PCK_DIR = Path(os.environ.get('STS2_PCK_DIR', '/tmp/sts2-pck'))
DECOMPILED_DIR = Path(os.environ.get('STS2_DECOMPILED_DIR', '/Users/kuro/code/sts2-research/decompiled'))
OUTPUT_DIR = PROJECT_ROOT / 'data' / 'sts2'
