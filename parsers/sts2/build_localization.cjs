#!/usr/bin/env node
/**
 * Build localization JSON files for STS2.
 * 
 * Input: /tmp/sts2-pck/localization/{lang}/cards.json → flat keys like "BASH.title", "BASH.description"
 * Output: data/sts2/localization/{lang}.json with structure:
 * { cards: { BASH: { name, description } }, relics: {...}, powers: {...}, potions: {...}, events: {...}, keywords: {...}, enchantments: {...} }
 */

const fs = require('fs');
const path = require('path');
const { PROJECT_ROOT, PCK_DIR } = require('./config.cjs');

const LANG_MAP = {
  eng: 'en', deu: 'de', fra: 'fr', ita: 'it', spa: 'es', ptb: 'pt',
  pol: 'pl', rus: 'ru', tur: 'tr', tha: 'th', jpn: 'ja', kor: 'ko', zhs: 'zh',
};

const LOC_DIR = path.join(PCK_DIR, 'localization');
const OUTPUT_DIR = path.join(PROJECT_ROOT, 'data', 'sts2', 'localization');

function cleanMarkup(text) {
  return text.replace(/\[(\/?)(?:gold|blue|green|red|white|gray|grey)\]/gi, '');
}

function buildLang(gameLang) {
  const dir = path.join(LOC_DIR, gameLang);
  const result = { cards: {}, relics: {}, powers: {}, potions: {}, events: {}, keywords: {}, enchantments: {} };

  // Cards
  const cards = JSON.parse(fs.readFileSync(path.join(dir, 'cards.json'), 'utf8'));
  for (const [key, value] of Object.entries(cards)) {
    const m = key.match(/^([A-Z0-9_]+)\.(title|description)$/);
    if (!m) continue;
    const [, id, field] = m;
    if (!result.cards[id]) result.cards[id] = {};
    result.cards[id][field === 'title' ? 'name' : 'description'] = cleanMarkup(value);
  }

  // Relics
  const relics = JSON.parse(fs.readFileSync(path.join(dir, 'relics.json'), 'utf8'));
  for (const [key, value] of Object.entries(relics)) {
    const m = key.match(/^([A-Z0-9_]+)\.(title|description|flavor)$/);
    if (!m) continue;
    const [, id, field] = m;
    if (!result.relics[id]) result.relics[id] = {};
    result.relics[id][field === 'title' ? 'name' : field] = cleanMarkup(value);
  }

  // Powers
  const powers = JSON.parse(fs.readFileSync(path.join(dir, 'powers.json'), 'utf8'));
  for (const [key, value] of Object.entries(powers)) {
    const m = key.match(/^([A-Z0-9_]+)\.(title|description|smartDescription)$/);
    if (!m) continue;
    const [, id, field] = m;
    if (!result.powers[id]) result.powers[id] = {};
    result.powers[id][field === 'title' ? 'name' : field] = cleanMarkup(value);
  }

  // Potions
  const potions = JSON.parse(fs.readFileSync(path.join(dir, 'potions.json'), 'utf8'));
  for (const [key, value] of Object.entries(potions)) {
    const m = key.match(/^([A-Z0-9_]+)\.(title|description)$/);
    if (!m) continue;
    const [, id, field] = m;
    if (!result.potions[id]) result.potions[id] = {};
    result.potions[id][field === 'title' ? 'name' : 'description'] = cleanMarkup(value);
  }

  // Events
  const events = JSON.parse(fs.readFileSync(path.join(dir, 'events.json'), 'utf8'));
  for (const [key, value] of Object.entries(events)) {
    const m = key.match(/^([A-Z0-9_]+)\.(title|description|choice\d+|choice\d+_locked|choice\d+_description)$/);
    if (!m) continue;
    const [, id, field] = m;
    if (!result.events[id]) result.events[id] = {};
    if (field === 'title') {
      result.events[id].name = cleanMarkup(value);
    } else {
      result.events[id][field] = cleanMarkup(value);
    }
  }

  // Keywords
  if (fs.existsSync(path.join(dir, 'card_keywords.json'))) {
    const keywords = JSON.parse(fs.readFileSync(path.join(dir, 'card_keywords.json'), 'utf8'));
    for (const [key, value] of Object.entries(keywords)) {
      const m = key.match(/^([A-Z0-9_]+)\.(title|description)$/);
      if (!m) continue;
      const [, id, field] = m;
      if (!result.keywords[id]) result.keywords[id] = {};
      result.keywords[id][field === 'title' ? 'name' : 'description'] = cleanMarkup(value);
    }
  }

  // Enchantments
  if (fs.existsSync(path.join(dir, 'enchantments.json'))) {
    const enchantments = JSON.parse(fs.readFileSync(path.join(dir, 'enchantments.json'), 'utf8'));
    for (const [key, value] of Object.entries(enchantments)) {
      const m = key.match(/^([A-Z0-9_]+)\.(title|description)$/);
      if (!m) continue;
      const [, id, field] = m;
      if (!result.enchantments[id]) result.enchantments[id] = {};
      result.enchantments[id][field === 'title' ? 'name' : 'description'] = cleanMarkup(value);
    }
  }

  return result;
}

function main() {
  let count = 0;
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  for (const [gameLang, isoLang] of Object.entries(LANG_MAP)) {
    if (gameLang === 'eng') continue;
    const dir = path.join(LOC_DIR, gameLang);
    if (fs.existsSync(dir)) {
      const data = buildLang(gameLang);
      fs.writeFileSync(path.join(OUTPUT_DIR, `${isoLang}.json`), JSON.stringify(data, null, 2));
      const counts = Object.entries(data).map(([k, v]) => `${k}:${Object.keys(v).length}`).join(', ');
      console.log(`${isoLang} (${gameLang}): ${counts}`);
      count++;
    } else {
      console.warn(`Missing ${gameLang}`);
    }
  }

  console.log(`\nDone: ${count} languages`);
}

main();
