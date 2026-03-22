#!/usr/bin/env node
/**
 * Build localization JSON files for STS1.
 * 
 * Input: /tmp/sts1-loc/localization/{lang}/ → nested keys like { "Bash": { "NAME": "...", "DESCRIPTION": "..." } }
 * Output: data/sts1/localization/{lang}.json with structure:
 * { cards: { BASH: { name, description } }, relics: {...}, powers: {...}, potions: {...}, events: {...}, keywords: {...} }
 */

const fs = require('fs');
const path = require('path');
const { PROJECT_ROOT } = require('../config.cjs');

const LANG_MAP = {
  eng: 'en', deu: 'de', fra: 'fr', ita: 'it', spa: 'es', ptb: 'pt',
  pol: 'pl', rus: 'ru', tur: 'tr', tha: 'th', jpn: 'ja', kor: 'ko', zhs: 'zh',
};

const STS1_LOC_DIR = '/tmp/sts1-loc/localization';
const DATA_DIR = path.join(PROJECT_ROOT, 'data', 'sts1');
const OUTPUT_DIR = path.join(DATA_DIR, 'localization');

/** Convert e.g. "Body Slam" → "BODY_SLAM" */
function toUpperSnake(s) {
  return s.toUpperCase().replace(/[^A-Z0-9_]/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '');
}

// Load relic/potion interpolation values extracted from Java source
const relicValuesPath = path.join(DATA_DIR, 'relic_values.json');
const relicValuesData = fs.existsSync(relicValuesPath) ? JSON.parse(fs.readFileSync(relicValuesPath, 'utf8')) : { relics: {}, potions: {} };

// Load STS1 card data for resolving !D!/!B!/!M! tokens
const sts1CardsPath = path.join(DATA_DIR, 'cards.json');
const sts1CardData = fs.existsSync(sts1CardsPath) ? JSON.parse(fs.readFileSync(sts1CardsPath, 'utf8')) : [];
const sts1CardMap = {};
for (const c of sts1CardData) {
  sts1CardMap[c.id] = c;
}

/**
 * Interpolate STS1 DESCRIPTIONS array with values.
 * Pattern: DESCRIPTIONS[0] + values[0] + DESCRIPTIONS[1] + values[1] + ...
 */
function interpolateDescriptions(descriptions, values) {
  if (!descriptions || descriptions.length === 0) return '';
  if (!values || values.length === 0) return descriptions.join('');
  let result = '';
  for (let i = 0; i < descriptions.length; i++) {
    result += descriptions[i];
    if (i < values.length) {
      const v = values[i];
      result += v != null ? String(v) : '?';
    }
  }
  return result;
}

function cleanDescription(text, cardInfo, isUpgrade) {
  // NL = newline in STS1
  text = text.replace(/ NL /g, '\n').replace(/NL/g, '\n');
  // Strip color codes: #b, #y, #r, #g, #p, ~, @, *
  text = text.replace(/#[byrgp]/g, '').replace(/[~@*]/g, '');
  // Resolve !D!, !B!, !M! with card data values
  if (cardInfo) {
    const upg = isUpgrade && cardInfo.upgrade;
    const damage = upg?.damage ?? cardInfo.damage;
    const block = upg?.block ?? cardInfo.block;
    const magic = upg?.magic_number ?? cardInfo.magic_number;
    if (damage != null) text = text.replace(/!D!/g, String(damage));
    if (block != null) text = text.replace(/!B!/g, String(block));
    if (magic != null) text = text.replace(/!M!/g, String(magic));
  }
  return text.trim();
}

function buildLang(gameLang) {
  const dir = path.join(STS1_LOC_DIR, gameLang);
  const result = { cards: {}, relics: {}, powers: {}, potions: {}, events: {}, keywords: {} };

  // Cards
  const cards = JSON.parse(fs.readFileSync(path.join(dir, 'cards.json'), 'utf8'));
  for (const [id, data] of Object.entries(cards)) {
    if (!data.NAME) continue;
    const cardId = toUpperSnake(id);
    const cardInfo = sts1CardMap[cardId];
    result.cards[cardId] = {
      name: data.NAME,
      description: cleanDescription(data.DESCRIPTION || '', cardInfo),
      ...(data.UPGRADE_DESCRIPTION && { upgradeDescription: cleanDescription(data.UPGRADE_DESCRIPTION, cardInfo, true) }),
    };
  }

  // Relics
  const relics = JSON.parse(fs.readFileSync(path.join(dir, 'relics.json'), 'utf8'));
  for (const [id, data] of Object.entries(relics)) {
    if (!data.NAME) continue;
    const relicId = toUpperSnake(id);
    const values = relicValuesData.relics[relicId];
    const descriptions = data.DESCRIPTIONS || [];
    const desc = values && descriptions.length > 1
      ? interpolateDescriptions(descriptions, values)
      : descriptions.join('');
    result.relics[relicId] = {
      name: data.NAME,
      description: cleanDescription(desc),
      ...(data.FLAVOR && { flavor: data.FLAVOR }),
    };
  }

  // Powers — values are runtime (stacking), use "X" as placeholder
  const powers = JSON.parse(fs.readFileSync(path.join(dir, 'powers.json'), 'utf8'));
  for (const [id, data] of Object.entries(powers)) {
    if (!data.NAME) continue;
    const descriptions = data.DESCRIPTIONS || [];
    const xValues = descriptions.length > 1
      ? Array(descriptions.length - 1).fill('X')
      : null;
    const desc = xValues
      ? interpolateDescriptions(descriptions, xValues)
      : descriptions.join('');
    result.powers[toUpperSnake(id)] = {
      name: data.NAME,
      description: cleanDescription(desc),
    };
  }

  // Potions
  const potions = JSON.parse(fs.readFileSync(path.join(dir, 'potions.json'), 'utf8'));
  for (const [id, data] of Object.entries(potions)) {
    if (!data.NAME) continue;
    const potionId = toUpperSnake(id);
    const values = relicValuesData.potions[potionId];
    const descriptions = data.DESCRIPTIONS || [];
    const desc = values && descriptions.length > 1
      ? interpolateDescriptions(descriptions, values)
      : descriptions.join('');
    result.potions[potionId] = {
      name: data.NAME,
      description: cleanDescription(desc),
    };
  }

  // Events
  const events = JSON.parse(fs.readFileSync(path.join(dir, 'events.json'), 'utf8'));
  for (const [id, data] of Object.entries(events)) {
    if (!data.NAME) continue;
    result.events[toUpperSnake(id)] = {
      name: data.NAME,
      description: (data.DESCRIPTIONS || []).join(''),
      ...(data.OPTIONS && { options: data.OPTIONS }),
    };
  }

  // Keywords — STS1 wraps all keywords under "Game Dictionary" key
  const keywordsRaw = JSON.parse(fs.readFileSync(path.join(dir, 'keywords.json'), 'utf8'));
  const keywordsDict = keywordsRaw['Game Dictionary'] || keywordsRaw;
  for (const [id, data] of Object.entries(keywordsDict)) {
    if (!data || typeof data !== 'object' || !data.NAMES) continue;
    result.keywords[id] = {
      names: data.NAMES,
      description: cleanDescription(data.DESCRIPTION || ''),
    };
  }

  return result;
}

function main() {
  let count = 0;
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  for (const [gameLang, isoLang] of Object.entries(LANG_MAP)) {
    if (gameLang === 'eng') continue;
    const dir = path.join(STS1_LOC_DIR, gameLang);
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
