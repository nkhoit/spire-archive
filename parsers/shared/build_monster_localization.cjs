#!/usr/bin/env node
/**
 * Extract monster name + move name translations from raw game localization files.
 * Reads /tmp/sts2-pck/localization/{lang}/monsters.json
 * Outputs to data/sts2/localization/{iso}.json (merges into existing)
 */
const fs = require('fs');
const path = require('path');
const { PROJECT_ROOT, PCK_DIR, DECOMPILED_DIR, OUTPUT_DIR } = require('../config.cjs');

const RAW_DIR = path.join(PCK_DIR, 'localization');
const OUT_DIR = path.join(OUTPUT_DIR, 'localization');

const LANG_MAP = {
  eng: 'en',
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

// Also read English as a bridge for name matching
const engPath = path.join(RAW_DIR, 'eng', 'monsters.json');
const engRaw = JSON.parse(fs.readFileSync(engPath, 'utf-8'));
const engMoves = {}; // monsterId -> { locKey -> englishTitle }
for (const [key, value] of Object.entries(engRaw)) {
  const moveParts = key.match(/^([A-Z0-9_]+)\.moves\.([A-Z0-9_]+)\.title$/);
  if (moveParts) {
    const [, monsterId, moveId] = moveParts;
    if (!engMoves[monsterId]) engMoves[monsterId] = {};
    engMoves[monsterId][moveId] = value;
  }
}

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

  // Build English name → localized name map for each monster
  for (const [monsterId, mData] of Object.entries(monsters)) {
    if (!mData.moves || !engMoves[monsterId]) continue;
    const nameMap = {};
    for (const [locKey, locTitle] of Object.entries(mData.moves)) {
      const engTitle = engMoves[monsterId]?.[locKey];
      if (engTitle && engTitle !== locTitle) {
        nameMap[engTitle] = locTitle;
      }
    }
    if (Object.keys(nameMap).length > 0) {
      mData.move_names = nameMap; // English display name → localized display name
    }
    // Also store flat list of all localized move titles for list preview
    mData.move_titles = Object.values(mData.moves);
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
