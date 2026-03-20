#!/usr/bin/env node
/**
 * Extract monster name + move name translations from raw game localization files.
 * Reads /tmp/sts2-pck/localization/{lang}/monsters.json
 * Outputs to data/sts2/localization/{iso}.json (merges into existing)
 */
const fs = require('fs');
const path = require('path');

const RAW_DIR = '/tmp/sts2-pck/localization';
const OUT_DIR = path.join(__dirname, '..', 'data', 'sts2', 'localization');

const LANG_MAP = {
  deu: 'de',
  fra: 'fr',
  ita: 'it',
  esp: 'es',
  spa: 'es',
  ptb: 'pt',
  pol: 'pl',
  rus: 'ru',
  tur: 'tr',
  tha: 'th',
  jpn: 'ja',
  kor: 'ko',
  zhs: 'zh',
};

for (const [gameCode, iso] of Object.entries(LANG_MAP)) {
  const rawPath = path.join(RAW_DIR, gameCode, 'monsters.json');
  if (!fs.existsSync(rawPath)) {
    console.log(`${iso}: no monsters.json, skipping`);
    continue;
  }

  const raw = JSON.parse(fs.readFileSync(rawPath, 'utf-8'));
  
  // Parse flat keys like "CRUSHER.name", "CRUSHER.moves.THRASH_MOVE.title"
  const monsters = {};
  for (const [key, value] of Object.entries(raw)) {
    const nameParts = key.match(/^([A-Z0-9_]+)\.name$/);
    if (nameParts) {
      const monsterId = nameParts[1];
      if (!monsters[monsterId]) monsters[monsterId] = {};
      monsters[monsterId].name = value;
      continue;
    }
    
    const moveParts = key.match(/^([A-Z0-9_]+)\.moves\.([A-Z0-9_]+)\.title$/);
    if (moveParts) {
      const [, monsterId, moveId] = moveParts;
      if (!monsters[monsterId]) monsters[monsterId] = {};
      if (!monsters[monsterId].moves) monsters[monsterId].moves = {};
      monsters[monsterId].moves[moveId] = value;
      continue;
    }
  }

  // Merge into existing localization file
  const outPath = path.join(OUT_DIR, `${iso}.json`);
  let existing = {};
  if (fs.existsSync(outPath)) {
    existing = JSON.parse(fs.readFileSync(outPath, 'utf-8'));
  }
  
  existing.monsters = monsters;
  
  fs.writeFileSync(outPath, JSON.stringify(existing, null, 2) + '\n');
  console.log(`${iso}: ${Object.keys(monsters).length} monsters`);
}

console.log('Done.');
