import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '..');
const PCK_DIR = process.env.STS2_PCK_DIR || '/tmp/sts2-pck';
const DECOMPILED_DIR = process.env.STS2_DECOMPILED_DIR || '/Users/kuro/code/sts2-research/decompiled';
const OUTPUT_DIR = path.join(PROJECT_ROOT, 'data', 'sts2');

export { PROJECT_ROOT, PCK_DIR, DECOMPILED_DIR, OUTPUT_DIR };
export default { PROJECT_ROOT, PCK_DIR, DECOMPILED_DIR, OUTPUT_DIR };
