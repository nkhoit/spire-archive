#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { PROJECT_ROOT, PCK_DIR, DECOMPILED_DIR, OUTPUT_DIR } = require('./config.cjs');

const ROOT = PROJECT_ROOT;
const RAW_LOC_DIR = path.join(PCK_DIR, 'localization');
const LOCALIZATION_OUTPUT_DIR = path.join(OUTPUT_DIR, 'localization');
const BASE_EVENTS_PATH = path.join(OUTPUT_DIR, 'events.json');

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

function stripBbcode(text) {
  if (typeof text !== 'string') return text;
  return text
    .replace(/\[(?:\/)?[a-z][a-z0-9_-]*(?:[^\]]*)\]/g, '')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n[ \t]+/g, '\n')
    .replace(/[ \t]{2,}/g, ' ')
    .trim();
}

function normalize(text) {
  return String(text || '')
    .replace(/\s+/g, ' ')
    .replace(/[“”"'’.,!?():;…-]/g, '')
    .trim()
    .toLowerCase();
}

function getGameLangDirs() {
  const dirs = fs.readdirSync(RAW_LOC_DIR, { withFileTypes: true })
    .filter(d => d.isDirectory())
    .map(d => d.name);

  const chosen = new Map();
  for (const dir of dirs) {
    const iso = LANG_MAP[dir];
    if (!iso || dir === 'eng') continue;
    if (!chosen.has(iso) || dir === 'esp') chosen.set(iso, dir);
  }
  return [...chosen.entries()].map(([iso, gameLang]) => ({ iso, gameLang }));
}

function parseRawEvents(raw) {
  const events = new Map();

  for (const [fullKey, rawValue] of Object.entries(raw)) {
    if (typeof rawValue !== 'string') continue;
    const value = stripBbcode(rawValue);
    const dot = fullKey.indexOf('.');
    if (dot === -1) continue;

    const eventId = fullKey.slice(0, dot);
    const rest = fullKey.slice(dot + 1);
    if (!events.has(eventId)) events.set(eventId, { name: undefined, pages: new Map() });
    const event = events.get(eventId);

    if (rest === 'title') {
      event.name = value;
      continue;
    }

    const pageDesc = rest.match(/^pages\.([^.]+)\.description$/);
    if (pageDesc) {
      const [, pageId] = pageDesc;
      if (!event.pages.has(pageId)) event.pages.set(pageId, { id: pageId, description: undefined, options: new Map() });
      event.pages.get(pageId).description = value;
      continue;
    }

    const optionField = rest.match(/^pages\.([^.]+)\.options\.([^.]+)\.(title|description)$/);
    if (optionField) {
      const [, pageId, optionId, field] = optionField;
      if (!event.pages.has(pageId)) event.pages.set(pageId, { id: pageId, description: undefined, options: new Map() });
      const page = event.pages.get(pageId);
      if (!page.options.has(optionId)) page.options.set(optionId, { id: optionId });
      page.options.get(optionId)[field === 'title' ? 'name' : 'description'] = value;
    }
  }

  for (const event of events.values()) {
    event.pages = [...event.pages.values()].map(page => ({
      id: page.id,
      description: page.description,
      options: [...page.options.values()],
    }));
  }

  return events;
}

function scoreChoiceMatch(baseChoices, rawOptions) {
  if (!baseChoices?.length || !rawOptions?.length) return -1;
  let score = 0;
  for (let i = 0; i < Math.min(baseChoices.length, rawOptions.length); i++) {
    const a = normalize(baseChoices[i].name);
    const b = normalize(rawOptions[i].name);
    if (a && b && a === b) score += 3;
  }
  for (const choice of baseChoices) {
    const a = normalize(choice.name);
    if (!a) continue;
    if (rawOptions.some(opt => normalize(opt.name) === a)) score += 1;
  }
  return score;
}

function mapBaseEventToEnglishRaw(baseEvent, rawEvent) {
  if (!rawEvent) return null;

  const pageMappings = [];
  const used = new Set();

  if (Array.isArray(baseEvent.pages) && baseEvent.pages.length > 0) {
    for (const basePage of baseEvent.pages) {
      let bestIndex = -1;
      let bestScore = -1;
      for (let i = 0; i < rawEvent.pages.length; i++) {
        if (used.has(i)) continue;
        const score = scoreChoiceMatch(basePage.choices || [], rawEvent.pages[i].options || []);
        if (score > bestScore) {
          bestScore = score;
          bestIndex = i;
        }
      }
      if (bestIndex !== -1) {
        used.add(bestIndex);
        pageMappings.push(bestIndex);
      } else {
        pageMappings.push(null);
      }
    }
  }

  let initialPageIndex = null;
  if (Array.isArray(baseEvent.choices) && baseEvent.choices.length > 0) {
    let bestIndex = -1;
    let bestScore = -1;
    for (let i = 0; i < rawEvent.pages.length; i++) {
      const score = scoreChoiceMatch(baseEvent.choices, rawEvent.pages[i].options || []);
      if (score > bestScore) {
        bestScore = score;
        bestIndex = i;
      }
    }
    if (bestIndex !== -1 && bestScore >= 0) initialPageIndex = bestIndex;
  } else if (pageMappings.length > 0) {
    initialPageIndex = pageMappings[0];
  }

  return { initialPageIndex, pageMappings };
}

function buildLocalizedEvent(baseEvent, langRawEvent, englishMapping) {
  if (!langRawEvent) return null;

  const localized = {};
  if (langRawEvent.name) localized.name = langRawEvent.name;

  if (englishMapping?.initialPageIndex != null) {
    const rawPage = langRawEvent.pages[englishMapping.initialPageIndex];
    if (rawPage?.description) localized.description = rawPage.description;
  }

  if (Array.isArray(baseEvent.choices) && baseEvent.choices.length > 0 && englishMapping?.initialPageIndex != null) {
    const rawPage = langRawEvent.pages[englishMapping.initialPageIndex];
    if (rawPage?.options?.length) {
      localized.choices = baseEvent.choices.map((_, idx) => ({
        ...(rawPage.options[idx]?.name ? { name: rawPage.options[idx].name } : {}),
        ...(rawPage.options[idx]?.description ? { description: rawPage.options[idx].description } : {}),
      }));
      if (!localized.choices.some(choice => Object.keys(choice).length > 0)) delete localized.choices;
    }
  }

  if (Array.isArray(baseEvent.pages) && baseEvent.pages.length > 0 && englishMapping?.pageMappings?.length) {
    localized.pages = baseEvent.pages.map((_, idx) => {
      const rawIndex = englishMapping.pageMappings[idx];
      const rawPage = rawIndex == null ? null : langRawEvent.pages[rawIndex];
      if (!rawPage) return {};
      const page = {};
      if (rawPage.description) page.description = rawPage.description;
      if (rawPage.options?.length) {
        page.choices = baseEvent.pages[idx].choices.map((__, choiceIdx) => ({
          ...(rawPage.options[choiceIdx]?.name ? { name: rawPage.options[choiceIdx].name } : {}),
          ...(rawPage.options[choiceIdx]?.description ? { description: rawPage.options[choiceIdx].description } : {}),
        }));
        if (!page.choices.some(choice => Object.keys(choice).length > 0)) delete page.choices;
      }
      return page;
    });
    if (!localized.pages.some(page => Object.keys(page).length > 0)) delete localized.pages;
  }

  return Object.keys(localized).length > 0 ? localized : null;
}

function main() {
  const baseEvents = JSON.parse(fs.readFileSync(BASE_EVENTS_PATH, 'utf8'));
  const englishRaw = parseRawEvents(JSON.parse(fs.readFileSync(path.join(RAW_LOC_DIR, 'eng', 'events.json'), 'utf8')));
  const mappings = new Map();

  for (const baseEvent of baseEvents) {
    mappings.set(baseEvent.id, mapBaseEventToEnglishRaw(baseEvent, englishRaw.get(baseEvent.id)));
  }

  for (const { iso, gameLang } of getGameLangDirs()) {
    const rawPath = path.join(RAW_LOC_DIR, gameLang, 'events.json');
    if (!fs.existsSync(rawPath)) continue;

    const rawEvents = parseRawEvents(JSON.parse(fs.readFileSync(rawPath, 'utf8')));
    const outPath = path.join(LOCALIZATION_OUTPUT_DIR, `${iso}.json`);
    const existing = JSON.parse(fs.readFileSync(outPath, 'utf8'));
    const nextEvents = { ...(existing.events || {}) };

    for (const baseEvent of baseEvents) {
      const localized = buildLocalizedEvent(baseEvent, rawEvents.get(baseEvent.id), mappings.get(baseEvent.id));
      if (localized) nextEvents[baseEvent.id] = localized;
    }

    existing.events = nextEvents;
    fs.writeFileSync(outPath, JSON.stringify(existing, null, 2) + '\n', 'utf8');
    console.log(`Updated ${iso}.json from ${gameLang}`);
  }
}

main();
