'use strict';

const fs = require('fs');
const path = require('path');
const { OUTPUT_DIR, PCK_DIR } = require('./config.cjs');

const SNAPSHOT_FILES = [
  'cards.json',
  'relics.json',
  'potions.json',
  'powers.json',
  'enchantments.json',
  'monsters.json',
  'events.json',
  'keywords.json',
];

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (!arg.startsWith('--')) continue;
    const key = arg.slice(2);
    const value = argv[i + 1];
    if (!value || value.startsWith('--')) {
      args[key] = true;
      continue;
    }
    args[key] = value;
    i += 1;
  }
  return args;
}

function usage() {
  console.error('Usage: node parsers/sts2/snapshot.cjs [--version 1.0.0] [--label "Early Access Launch"] [--date YYYY-MM-DD]');
  console.error('If --version is omitted, reads version from release_info.json in the PCK/extracted dir.');
}

/**
 * Try to auto-detect the game version from release_info.json.
 * Searches several likely locations.
 */
function detectGameVersion() {
  const candidates = [
    path.join(PCK_DIR, '..', 'release_info.json'),  // next to PCK dir (game root)
    path.join(PCK_DIR, 'release_info.json'),          // inside PCK dir
    path.resolve(__dirname, '../../release_info.json'), // project root
  ];

  // Also check STS2_EXTRACTED_DIR / sts2-research/extracted
  const extractedDir = process.env.STS2_EXTRACTED_DIR
    || path.resolve(require('os').homedir(), 'code/sts2-research/extracted');
  candidates.push(path.join(extractedDir, 'release_info.json'));

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      try {
        const info = JSON.parse(fs.readFileSync(candidate, 'utf8'));
        if (info.version) {
          const ver = info.version.replace(/^v/, '');  // strip leading 'v'
          console.log(`Auto-detected game version: ${ver} (from ${candidate})`);
          return { version: ver, date: info.date ? info.date.slice(0, 10) : null };
        }
      } catch (e) {
        // ignore parse errors, try next
      }
    }
  }
  return null;
}

function isValidDateString(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function readJsonIfExists(filePath, fallback) {
  if (!fs.existsSync(filePath)) return fallback;
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function compareVersionStrings(a, b) {
  const aParts = String(a).split(/[^0-9A-Za-z]+/).filter(Boolean);
  const bParts = String(b).split(/[^0-9A-Za-z]+/).filter(Boolean);
  const len = Math.max(aParts.length, bParts.length);
  for (let i = 0; i < len; i += 1) {
    const av = aParts[i];
    const bv = bParts[i];
    if (av == null) return 1;
    if (bv == null) return -1;
    const an = /^\d+$/.test(av) ? Number(av) : NaN;
    const bn = /^\d+$/.test(bv) ? Number(bv) : NaN;
    if (!Number.isNaN(an) && !Number.isNaN(bn)) {
      if (an !== bn) return bn - an;
      continue;
    }
    const cmp = String(bv).localeCompare(String(av));
    if (cmp !== 0) return cmp;
  }
  return 0;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const version = args.version;
  const label = args.label;
  const date = args.date || todayIso();

  if (!version) {
    const detected = detectGameVersion();
    if (detected) {
      args.version = detected.version;
      if (!args.date && detected.date) args.date = detected.date;
    } else {
      console.error('Could not auto-detect version from release_info.json.');
      usage();
      process.exit(1);
    }
  }

  // Re-read after possible auto-detection
  const finalVersion = args.version || version;

  if (!isValidDateString(date)) {
    console.error(`Invalid --date value: ${date}. Expected YYYY-MM-DD.`);
    process.exit(1);
  }

  const resolvedVersion = args.version || version;
  const historyDir = path.join(OUTPUT_DIR, 'history');
  const snapshotDir = path.join(historyDir, resolvedVersion);
  const versionsFile = path.join(historyDir, 'versions.json');

  if (fs.existsSync(snapshotDir)) {
    console.error(`Refusing to overwrite existing snapshot: ${snapshotDir}`);
    process.exit(1);
  }

  fs.mkdirSync(snapshotDir, { recursive: true });

  try {
    for (const file of SNAPSHOT_FILES) {
      const source = path.join(OUTPUT_DIR, file);
      const dest = path.join(snapshotDir, file);
      if (!fs.existsSync(source)) {
        throw new Error(`Missing source file: ${source}`);
      }
      fs.copyFileSync(source, dest);
    }

    const versions = readJsonIfExists(versionsFile, []);
    if (versions.some((entry) => entry.version === resolvedVersion)) {
      throw new Error(`Version ${resolvedVersion} already exists in versions.json`);
    }

    const nextEntry = label ? { version: resolvedVersion, date, label } : { version: resolvedVersion, date };
    const nextVersions = [...versions, nextEntry].sort((a, b) => {
      if (a.date !== b.date) return String(b.date).localeCompare(String(a.date));
      return compareVersionStrings(a.version, b.version);
    });

    fs.writeFileSync(versionsFile, JSON.stringify(nextVersions, null, 2) + '\n');
    console.log(`Created STS2 snapshot ${resolvedVersion} at ${snapshotDir}`);
  } catch (error) {
    fs.rmSync(snapshotDir, { recursive: true, force: true });
    throw error;
  }
}

main();
