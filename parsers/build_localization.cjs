#!/usr/bin/env node
/**
 * Build localization JSON files for STS1 and STS2.
 * 
 * STS2: /tmp/sts2-pck/localization/{lang}/cards.json → flat keys like "BASH.title", "BASH.description"
 * STS1: /tmp/sts1-loc/localization/{lang}/cards.json → nested keys like { "Bash": { "NAME": "...", "DESCRIPTION": "..." } }
 * 
 * Output: data/{game}/localization/{lang}.json with structure:
 * { cards: { BASH: { name, description } }, relics: {...}, powers: {...}, potions: {...}, events: {...}, keywords: {...} }
 */

const fs = require('fs');
const path = require('path');
const { PROJECT_ROOT, PCK_DIR, DECOMPILED_DIR, OUTPUT_DIR } = require('./config.cjs');

// 13 shared languages (mapped to ISO 639-1 for URLs and our internal code)
const LANG_MAP = {
  eng: 'en',
  deu: 'de',
  fra: 'fr',
  ita: 'it',
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

const STS2_LOC_DIR = path.join(PCK_DIR, 'localization');
const STS1_LOC_DIR = '/tmp/sts1-loc/localization';
const LOCALIZATION_OUTPUT_DIR = path.join(PROJECT_ROOT, 'data');

// ---- STS2 ----

function buildSts2Lang(gameLang) {
  const dir = path.join(STS2_LOC_DIR, gameLang);
  const result = { cards: {}, relics: {}, powers: {}, potions: {}, events: {}, keywords: {}, enchantments: {} };

  // Cards: "BASH.title" / "BASH.description"
  const cards = JSON.parse(fs.readFileSync(path.join(dir, 'cards.json'), 'utf8'));
  for (const [key, value] of Object.entries(cards)) {
    const m = key.match(/^([A-Z0-9_]+)\.(title|description)$/);
    if (!m) continue;
    const [, id, field] = m;
    if (!result.cards[id]) result.cards[id] = {};
    result.cards[id][field === 'title' ? 'name' : 'description'] = cleanSts2Markup(value);
  }

  // Relics: "BURNING_BLOOD.title" / ".description" / ".flavor"
  const relics = JSON.parse(fs.readFileSync(path.join(dir, 'relics.json'), 'utf8'));
  for (const [key, value] of Object.entries(relics)) {
    const m = key.match(/^([A-Z0-9_]+)\.(title|description|flavor)$/);
    if (!m) continue;
    const [, id, field] = m;
    if (!result.relics[id]) result.relics[id] = {};
    const fieldName = field === 'title' ? 'name' : field;
    result.relics[id][fieldName] = cleanSts2Markup(value);
  }

  // Powers: "VULNERABLE_POWER.title" / ".description" / ".smartDescription"
  const powers = JSON.parse(fs.readFileSync(path.join(dir, 'powers.json'), 'utf8'));
  for (const [key, value] of Object.entries(powers)) {
    const m = key.match(/^([A-Z0-9_]+)\.(title|description|smartDescription)$/);
    if (!m) continue;
    const [, id, field] = m;
    if (!result.powers[id]) result.powers[id] = {};
    const fieldName = field === 'title' ? 'name' : field;
    result.powers[id][fieldName] = cleanSts2Markup(value);
  }

  // Potions
  const potions = JSON.parse(fs.readFileSync(path.join(dir, 'potions.json'), 'utf8'));
  for (const [key, value] of Object.entries(potions)) {
    const m = key.match(/^([A-Z0-9_]+)\.(title|description)$/);
    if (!m) continue;
    const [, id, field] = m;
    if (!result.potions[id]) result.potions[id] = {};
    result.potions[id][field === 'title' ? 'name' : 'description'] = cleanSts2Markup(value);
  }

  // Events
  const events = JSON.parse(fs.readFileSync(path.join(dir, 'events.json'), 'utf8'));
  for (const [key, value] of Object.entries(events)) {
    const m = key.match(/^([A-Z0-9_]+)\.(title|description|choice\d+|choice\d+_locked|choice\d+_description)$/);
    if (!m) continue;
    const [, id, field] = m;
    if (!result.events[id]) result.events[id] = {};
    if (field === 'title') {
      result.events[id].name = cleanSts2Markup(value);
    } else {
      result.events[id][field] = cleanSts2Markup(value);
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
      result.keywords[id][field === 'title' ? 'name' : 'description'] = cleanSts2Markup(value);
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
      result.enchantments[id][field === 'title' ? 'name' : 'description'] = cleanSts2Markup(value);
    }
  }

  return result;
}

function cleanSts2Markup(text) {
  // Remove BBCode-style tags: [gold], [blue], [green], [red], [/gold], etc.
  // Keep the text content inside
  return text.replace(/\[(\/?)(?:gold|blue|green|red|white|gray|grey)\]/gi, '');
}

// ---- STS1 ----

/** Convert e.g. "Body Slam" or "A Thousand Cuts" → "BODY_SLAM" / "A_THOUSAND_CUTS" */
function toUpperSnake(s) {
  return s.toUpperCase().replace(/[^A-Z0-9_]/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '');
}

// Load STS1 card data for resolving !D!/!B!/!M! tokens
const sts1CardsPath = path.join(LOCALIZATION_OUTPUT_DIR, 'sts1', 'cards.json');
const sts1CardData = fs.existsSync(sts1CardsPath) ? JSON.parse(fs.readFileSync(sts1CardsPath, 'utf8')) : [];
const sts1CardMap = {};
for (const c of sts1CardData) {
  sts1CardMap[c.id] = c;
}

function buildSts1Lang(gameLang) {
  const dir = path.join(STS1_LOC_DIR, gameLang);
  const result = { cards: {}, relics: {}, powers: {}, potions: {}, events: {}, keywords: {} };

  // Cards: { "Bash": { "NAME": "...", "DESCRIPTION": "..." } }
  // Map STS1 card IDs (PascalCase/spaces) to our IDs (UPPER_SNAKE)
  const cards = JSON.parse(fs.readFileSync(path.join(dir, 'cards.json'), 'utf8'));
  for (const [id, data] of Object.entries(cards)) {
    if (!data.NAME) continue;
    const cardId = toUpperSnake(id);
    const cardInfo = sts1CardMap[cardId];
    result.cards[cardId] = {
      name: data.NAME,
      description: cleanSts1Description(data.DESCRIPTION || '', cardInfo),
      ...(data.UPGRADE_DESCRIPTION && { upgradeDescription: cleanSts1Description(data.UPGRADE_DESCRIPTION, cardInfo, true) }),
    };
  }

  // Relics
  const relics = JSON.parse(fs.readFileSync(path.join(dir, 'relics.json'), 'utf8'));
  for (const [id, data] of Object.entries(relics)) {
    if (!data.NAME) continue;
    result.relics[toUpperSnake(id)] = {
      name: data.NAME,
      description: cleanSts1Description((data.DESCRIPTIONS || []).join('')),
      ...(data.FLAVOR && { flavor: data.FLAVOR }),
    };
  }

  // Powers
  const powers = JSON.parse(fs.readFileSync(path.join(dir, 'powers.json'), 'utf8'));
  for (const [id, data] of Object.entries(powers)) {
    if (!data.NAME) continue;
    result.powers[toUpperSnake(id)] = {
      name: data.NAME,
      description: cleanSts1Description((data.DESCRIPTIONS || []).join('')),
    };
  }

  // Potions
  const potions = JSON.parse(fs.readFileSync(path.join(dir, 'potions.json'), 'utf8'));
  for (const [id, data] of Object.entries(potions)) {
    if (!data.NAME) continue;
    result.potions[toUpperSnake(id)] = {
      name: data.NAME,
      description: cleanSts1Description((data.DESCRIPTIONS || []).join('')),
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

  // Keywords
  const keywords = JSON.parse(fs.readFileSync(path.join(dir, 'keywords.json'), 'utf8'));
  for (const [id, data] of Object.entries(keywords)) {
    if (!data.NAMES) continue;
    result.keywords[id] = {
      names: data.NAMES,
      description: data.DESCRIPTION || '',
    };
  }

  return result;
}

function cleanSts1Description(text, cardInfo, isUpgrade) {
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

// ---- Main ----

function main() {
  let sts2Count = 0;
  let sts1Count = 0;

  for (const [gameLang, isoLang] of Object.entries(LANG_MAP)) {
    // Skip English — that's our base data
    if (gameLang === 'eng') continue;

    // STS2
    const sts2Dir = path.join(STS2_LOC_DIR, gameLang);
    if (fs.existsSync(sts2Dir)) {
      const data = buildSts2Lang(gameLang);
      const outDir = path.join(LOCALIZATION_OUTPUT_DIR, 'sts2', 'localization');
      fs.mkdirSync(outDir, { recursive: true });
      fs.writeFileSync(path.join(outDir, `${isoLang}.json`), JSON.stringify(data, null, 2));
      const counts = Object.entries(data).map(([k, v]) => `${k}:${Object.keys(v).length}`).join(', ');
      console.log(`STS2 ${isoLang} (${gameLang}): ${counts}`);
      sts2Count++;
    } else {
      console.warn(`STS2: Missing ${gameLang}`);
    }

    // STS1
    const sts1Dir = path.join(STS1_LOC_DIR, gameLang);
    if (fs.existsSync(sts1Dir)) {
      const data = buildSts1Lang(gameLang);
      const outDir = path.join(LOCALIZATION_OUTPUT_DIR, 'sts1', 'localization');
      fs.mkdirSync(outDir, { recursive: true });
      fs.writeFileSync(path.join(outDir, `${isoLang}.json`), JSON.stringify(data, null, 2));
      const counts = Object.entries(data).map(([k, v]) => `${k}:${Object.keys(v).length}`).join(', ');
      console.log(`STS1 ${isoLang} (${gameLang}): ${counts}`);
      sts1Count++;
    } else {
      console.warn(`STS1: Missing ${gameLang}`);
    }
  }

  console.log(`\nDone: ${sts2Count} STS2 languages, ${sts1Count} STS1 languages`);
}

main();
