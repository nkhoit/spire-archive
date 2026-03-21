import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.join(__dirname, '..', 'data', 'sts2');
const LOC_DIR = path.join(DATA_DIR, 'localization');

// Matches template variables like {VarName}, {VarName:diff()}, {VarName:value()}, etc.
// Excludes known runtime-only vars that can't be statically resolved.
const TEMPLATE_VAR = /\{[A-Za-z]\w*(?::[^}]*)?\}/g;

const RUNTIME_ONLY_VARS = new Set([
  '{Amount}',
  '{Combats}',
  '{CombatsLeft}',
  '{EntrantNumber}',
  '{Experience}',
  '{MaxHp}',
  '{CardThreshold}',
  '{EnchantmentName}',
  '{AncientCard}',
  '{StarterCard}',
  '{EnemyStrength}',
  '{SelfStrength}',
  '{UpgradedRelic}',
  '{StarterRelic}',
  '{StartOfCombat}',
  '{StartOfTurn}',
  '{Enchantment}',
]);

// Event-only runtime vars (randomized at runtime)
const EVENT_RUNTIME_VARS = /^\{(Prize\d+|Random\w+|Gold|Cards|Relics?|Rarity|Potion|Type|MaxHp|Setting\dHp|Top\w+|Middle\w+|Bottom\w+)\}$/;

// Polish game data has typos like {Summon:diff)} and unresolvable power vars — known upstream bugs
const KNOWN_UPSTREAM_BUGS = /\{(Summon|Forge):diff\)}|\{OutbreakPower:diff\(\)\}/;

function isRuntimeVar(v: string): boolean {
  return RUNTIME_ONLY_VARS.has(v)
    || RUNTIME_ONLY_VARS.has(v.replace(/:.*/, '}'))
    || EVENT_RUNTIME_VARS.test(v)
    || KNOWN_UPSTREAM_BUGS.test(v);
}

function findUnresolved(items: any[], fields: string[]): { id: string; field: string; vars: string[] }[] {
  const problems: { id: string; field: string; vars: string[] }[] = [];
  for (const item of items) {
    for (const field of fields) {
      const val = field === 'upgrade.description'
        ? item.upgrade?.description
        : item[field];
      if (typeof val !== 'string') continue;
      const matches = [...val.matchAll(TEMPLATE_VAR)]
        .map(m => m[0])
        .filter(v => !isRuntimeVar(v));
      if (matches.length > 0) {
        problems.push({ id: item.id, field, vars: matches });
      }
    }
  }
  return problems;
}

test.describe('Data integrity — no unresolved template variables', () => {
  const ENTITY_FILES: [string, string[]][] = [
    ['cards.json', ['description', 'upgrade.description']],
    ['relics.json', ['description']],
    ['potions.json', ['description']],
    ['powers.json', ['description']],
    ['enchantments.json', ['description']],
    ['monsters.json', ['description']],
  ];

  for (const [file, fields] of ENTITY_FILES) {
    test(`${file} has no unresolved vars`, () => {
      const data = JSON.parse(fs.readFileSync(path.join(DATA_DIR, file), 'utf8'));
      const problems = findUnresolved(data, fields);
      if (problems.length > 0) {
        const summary = problems.map(p => `  ${p.id}.${p.field}: ${p.vars.join(', ')}`).join('\n');
        expect(problems, `Unresolved template variables:\n${summary}`).toHaveLength(0);
      }
    });
  }

  test('events.json has no unresolved vars (except runtime)', () => {
    const data = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'events.json'), 'utf8'));
    const problems: string[] = [];
    for (const event of data) {
      for (const page of event.pages ?? []) {
        for (const choice of page.choices ?? []) {
          const text = choice.text ?? '';
          const matches = [...text.matchAll(TEMPLATE_VAR)]
            .map(m => m[0])
            .filter(v => !isRuntimeVar(v));
          if (matches.length > 0) {
            problems.push(`${event.id}: ${matches.join(', ')}`);
          }
        }
      }
    }
    expect(problems, `Unresolved event vars:\n${problems.join('\n')}`).toHaveLength(0);
  });
});

test.describe('Localization — no unresolved template variables', () => {
  const LOCALES = ['ja', 'ko', 'zh', 'de', 'fr', 'es', 'pt', 'it', 'pl', 'ru', 'tr', 'th'];
  const CATEGORIES = ['cards', 'relics', 'potions', 'powers', 'enchantments'];

  for (const lang of LOCALES) {
    test(`${lang}.json has no unresolved vars (except runtime)`, () => {
      const locPath = path.join(LOC_DIR, `${lang}.json`);
      if (!fs.existsSync(locPath)) return;
      const data = JSON.parse(fs.readFileSync(locPath, 'utf8'));
      const problems: string[] = [];

      for (const cat of CATEGORIES) {
        const entries = data[cat] ?? {};
        for (const [id, item] of Object.entries(entries) as [string, any][]) {
          const desc = item?.description ?? '';
          if (!desc) continue;
          const matches = [...desc.matchAll(TEMPLATE_VAR)]
            .map(m => m[0])
            .filter(v => !isRuntimeVar(v));
          if (matches.length > 0) {
            problems.push(`${cat}/${id}: ${matches.join(', ')}`);
          }
        }
      }

      expect(problems, `Unresolved vars in ${lang}:\n${problems.join('\n')}`).toHaveLength(0);
    });
  }
});

test.describe('Data integrity — descriptions contain resolved numbers', () => {
  // Spot-check that cards with known numeric vars have numbers in their descriptions
  const SPOT_CHECKS = [
    { id: 'BASH', expectedPattern: /\d+.*damage/i, file: 'cards.json' },
    { id: 'DEFEND_IRONCLAD', expectedPattern: /\d+/i, file: 'cards.json' },
    { id: 'ABRASIVE', expectedPattern: /\d+.*(?:Dexterity|Thorns)/i, file: 'cards.json' },
  ];

  for (const check of SPOT_CHECKS) {
    test(`${check.id} description has resolved numbers`, () => {
      const data = JSON.parse(fs.readFileSync(path.join(DATA_DIR, check.file), 'utf8'));
      const item = data.find((d: any) => d.id === check.id);
      expect(item, `${check.id} not found`).toBeTruthy();
      expect(item.description).toMatch(check.expectedPattern);
    });
  }
});
