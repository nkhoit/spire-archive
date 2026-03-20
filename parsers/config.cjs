const path = require('path');

const PROJECT_ROOT = path.resolve(__dirname, '..');
const PCK_DIR = process.env.STS2_PCK_DIR || '/tmp/sts2-pck';
const DECOMPILED_DIR = process.env.STS2_DECOMPILED_DIR || '/Users/kuro/code/sts2-research/decompiled';
const OUTPUT_DIR = path.join(PROJECT_ROOT, 'data', 'sts2');

module.exports = {
  PROJECT_ROOT,
  PCK_DIR,
  DECOMPILED_DIR,
  OUTPUT_DIR,
};
