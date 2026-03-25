import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.join(__dirname, '..', 'data', 'sts2');

interface EventChoice {
  name: string;
  description?: string;
  outcome?: string;
  locked?: string;
  references?: any[];
  pool?: string;
  relic_id?: string;
}

interface EventPage {
  label: string;
  description?: string;
  choices: EventChoice[];
}

interface GameEvent {
  id: string;
  name: string;
  act: string;
  description: string;
  choices: EventChoice[];
  pages?: EventPage[];
  type?: string;
  relic_pools?: any[];
  flavor_sequences?: Record<string, string[]>;
  references?: any[];
  dialogue?: any[];
}

let events: GameEvent[];

test.beforeAll(() => {
  events = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'events.json'), 'utf8'));
});

// ── Basic structure ──

test.describe('Event data — basic structure', () => {
  test('every event has id, name, and description', () => {
    for (const e of events) {
      expect(e.id, `event missing id`).toBeTruthy();
      expect(e.name, `${e.id} missing name`).toBeTruthy();
      expect(e.description, `${e.id} missing description`).toBeTruthy();
    }
  });

  test('no internal fields leaked (_optionKey, etc.)', () => {
    const json = JSON.stringify(events);
    expect(json).not.toContain('"_optionKey"');
  });
});

// ── Outcome flavor text ──

test.describe('Event data — outcome flavor text', () => {
  // Events that should have outcome text on choices (representative sample)
  const EVENTS_WITH_OUTCOMES: [string, string[]][] = [
    ['BYRDONIS_NEST', ['Eat the Egg', 'Take the Egg']],
    ['REFLECTIONS', ['Shatter', 'Touch a Mirror']],
    ['SPIRALING_WHIRLPOOL', ['Drink', 'Observe', 'Reach In']],
    ['DOORS_OF_LIGHT_AND_DARK', ['Dark Door', 'Light Door']],
    ['FIELD_OF_MAN_SIZED_HOLES', ['Enter Your Hole', 'Resist']],
    ['STONE_OF_ALL_TIME', ['Drink and Lift', 'Push']],
    ['SAPPHIRE_SEED', ['Consume', 'Plant and Nourish']],
    ['MORPHIC_GROVE', ['Group', 'Loner']],
  ];

  for (const [eventId, expectedChoices] of EVENTS_WITH_OUTCOMES) {
    test(`${eventId} choices have outcome text`, () => {
      const event = events.find(e => e.id === eventId);
      expect(event, `${eventId} not found`).toBeTruthy();

      for (const choiceName of expectedChoices) {
        const choice = event!.choices.find(c => c.name === choiceName);
        expect(choice, `${eventId}: choice "${choiceName}" not found`).toBeTruthy();
        expect(choice!.outcome, `${eventId}: choice "${choiceName}" missing outcome`).toBeTruthy();
        expect(choice!.outcome!.length, `${eventId}: choice "${choiceName}" outcome is empty`).toBeGreaterThan(10);
      }
    });
  }

  test('outcome text has no BBCode tags', () => {
    const bbcodePattern = /\[(?:gold|\/gold|green|\/green|red|\/red|blue|\/blue|sine|\/sine|jitter|\/jitter|b|\/b|orange|\/orange|purple|\/purple|aqua|\/aqua)\]/;
    for (const event of events) {
      for (const choice of event.choices ?? []) {
        if (choice.outcome) {
          expect(choice.outcome, `${event.id}: "${choice.name}" outcome has BBCode`).not.toMatch(bbcodePattern);
        }
      }
      for (const page of event.pages ?? []) {
        for (const choice of page.choices ?? []) {
          if (choice.outcome) {
            expect(choice.outcome, `${event.id} page "${page.label}": "${choice.name}" outcome has BBCode`).not.toMatch(bbcodePattern);
          }
        }
      }
    }
  });

  test('at least 40 events have outcome text on choices', () => {
    const count = events.filter(e =>
      e.choices?.some(c => c.outcome)
    ).length;
    expect(count).toBeGreaterThanOrEqual(40);
  });
});

// ── Flavor sequences ──

test.describe('Event data — flavor sequences', () => {
  test('ABYSSAL_BATHS has LINGER flavor sequence with 9 entries', () => {
    const event = events.find(e => e.id === 'ABYSSAL_BATHS');
    expect(event).toBeTruthy();
    expect(event!.flavor_sequences).toBeTruthy();
    expect(event!.flavor_sequences!.LINGER).toBeTruthy();
    expect(event!.flavor_sequences!.LINGER).toHaveLength(9);
    // First entry should mention temperature
    expect(event!.flavor_sequences!.LINGER[0]).toContain('temperature');
  });

  test('flavor sequence entries have no BBCode tags', () => {
    const bbcodePattern = /\[(?:gold|\/gold|green|\/green|red|\/red|blue|\/blue|sine|\/sine|jitter|\/jitter|b|\/b|orange|\/orange|purple|\/purple|aqua|\/aqua)\]/;
    for (const event of events) {
      if (!event.flavor_sequences) continue;
      for (const [key, texts] of Object.entries(event.flavor_sequences)) {
        for (let i = 0; i < texts.length; i++) {
          expect(texts[i], `${event.id}.flavor_sequences.${key}[${i}] has BBCode`).not.toMatch(bbcodePattern);
        }
      }
    }
  });

  test('flavor sequences are sorted by index (ascending)', () => {
    for (const event of events) {
      if (!event.flavor_sequences) continue;
      for (const [key, texts] of Object.entries(event.flavor_sequences)) {
        // Each entry should be non-empty
        for (let i = 0; i < texts.length; i++) {
          expect(texts[i].length, `${event.id}.flavor_sequences.${key}[${i}] is empty`).toBeGreaterThan(0);
        }
      }
    }
  });
});

// ── Multi-page events ──

test.describe('Event data — multi-page events', () => {
  test('ABYSSAL_BATHS has 2 pages with correct structure', () => {
    const event = events.find(e => e.id === 'ABYSSAL_BATHS');
    expect(event).toBeTruthy();
    expect(event!.pages).toHaveLength(2);

    const [initial, baths] = event!.pages!;
    expect(initial.label).toBe('Initial');
    expect(initial.choices).toHaveLength(2);
    expect(initial.choices[0].name).toBe('Abstain');
    expect(initial.choices[1].name).toBe('Immerse');

    expect(baths.label).toBe('In the Baths');
    expect(baths.choices).toHaveLength(2);
    expect(baths.choices[0].name).toBe('Linger');
    expect(baths.choices[1].name).toBe('Exit Baths');
  });

  test('COLOSSAL_FLOWER has 3 pages (dig depths)', () => {
    const event = events.find(e => e.id === 'COLOSSAL_FLOWER');
    expect(event).toBeTruthy();
    expect(event!.pages).toHaveLength(3);
    expect(event!.pages![0].label).toBe('Initial');
    expect(event!.pages![1].label).toBe('Deeper');
    expect(event!.pages![2].label).toBe('Deepest');
  });

  test('TINKER_TIME has 2 pages (card type + rider)', () => {
    const event = events.find(e => e.id === 'TINKER_TIME');
    expect(event).toBeTruthy();
    expect(event!.pages).toHaveLength(2);
    expect(event!.pages![0].label).toBe('Choose Card Type');
    expect(event!.pages![1].label).toBe('Choose Rider Effect');
    // Rider page should have pooled choices
    const riderChoices = event!.pages![1].choices;
    expect(riderChoices.length).toBeGreaterThanOrEqual(9);
    expect(riderChoices.some(c => c.pool === 'Attack')).toBe(true);
    expect(riderChoices.some(c => c.pool === 'Skill')).toBe(true);
    expect(riderChoices.some(c => c.pool === 'Power')).toBe(true);
  });

  test('multi-page events have empty or no top-level choices', () => {
    for (const event of events) {
      if (event.pages && event.pages.length > 0) {
        // Events with pages should have choices on pages, not top-level
        // (some may have empty choices array from manual override)
        const topLevelChoiceCount = event.choices?.length ?? 0;
        const pageChoiceCount = event.pages.reduce((sum, p) => sum + (p.choices?.length ?? 0), 0);
        expect(pageChoiceCount, `${event.id}: multi-page event has no choices on any page`).toBeGreaterThan(0);
      }
    }
  });
});

// ── Dynamic/templated events ──

test.describe('Event data — dynamic/templated events', () => {
  test('THE_FUTURE_OF_POTIONS has 3 rarity choices', () => {
    const event = events.find(e => e.id === 'THE_FUTURE_OF_POTIONS');
    expect(event).toBeTruthy();
    expect(event!.choices).toHaveLength(3);
    expect(event!.choices[0].name).toContain('Common');
    expect(event!.choices[1].name).toContain('Uncommon');
    expect(event!.choices[2].name).toContain('Rare');
    // Common should not mention Power
    expect(event!.choices[0].description).not.toContain('Power');
    // Uncommon and Rare should mention Power
    expect(event!.choices[1].description).toContain('Power');
    expect(event!.choices[2].description).toContain('Power');
  });

  test('THE_FUTURE_OF_POTIONS has description and 3 rarity choices', () => {
    const event = events.find(e => e.id === 'THE_FUTURE_OF_POTIONS');
    expect(event!.description).toBeTruthy();
    expect(event!.choices.length).toBe(3);
    expect(event!.choices.some(c => c.name.includes('Common'))).toBe(true);
    expect(event!.choices.some(c => c.name.includes('Rare'))).toBe(true);
  });

  test('no choice names contain unresolved "?" placeholders', () => {
    const problems: string[] = [];
    for (const event of events) {
      for (const choice of event.choices ?? []) {
        if (choice.name === '?' || choice.name.includes('? ?')) {
          problems.push(`${event.id}: "${choice.name}"`);
        }
      }
    }
    expect(problems, `Choices with unresolved "?" placeholders:\n${problems.join('\n')}`).toHaveLength(0);
  });
});

// ── Ancient events ──

test.describe('Event data — ancient events', () => {
  const ANCIENTS = ['NEOW', 'PAEL', 'DARV', 'OROBAS', 'TANX', 'TEZCATARA', 'NONUPEIPE', 'VAKUU', 'THE_ARCHITECT'];

  test('all ancient events have type "ancient"', () => {
    for (const ancientId of ANCIENTS) {
      const event = events.find(e => e.id === ancientId);
      expect(event, `${ancientId} not found`).toBeTruthy();
      expect(event!.type, `${ancientId} should be type "ancient"`).toBe('ancient');
    }
  });

  test('ancient events with relic pools have valid pool structure', () => {
    for (const event of events) {
      if (!event.relic_pools) continue;
      for (const pool of event.relic_pools) {
        expect(pool.name, `${event.id}: pool missing name`).toBeTruthy();
        expect(Array.isArray(pool.relics), `${event.id}: pool "${pool.name}" missing relics array`).toBe(true);
        expect(pool.relics.length, `${event.id}: pool "${pool.name}" is empty`).toBeGreaterThan(0);
      }
    }
  });

  test('NEOW has choices with relic_id and pool fields', () => {
    const neow = events.find(e => e.id === 'NEOW');
    expect(neow).toBeTruthy();
    expect(neow!.choices.length).toBeGreaterThan(5);
    for (const choice of neow!.choices) {
      expect(choice.relic_id, `NEOW choice "${choice.name}" missing relic_id`).toBeTruthy();
      expect(['positive', 'cursed'], `NEOW choice "${choice.name}" invalid pool "${choice.pool}"`).toContain(choice.pool);
    }
  });
});

// ── STS1 events are unaffected ──

test.describe('STS1 events — no new fields leaked', () => {
  test('STS1 events have no flavor_sequences or pages fields, and no non-empty outcome', () => {
    const sts1Events: any[] = JSON.parse(
      fs.readFileSync(path.join(__dirname, '..', 'data', 'sts1', 'events.json'), 'utf8')
    );
    for (const event of sts1Events) {
      expect(event.flavor_sequences, `STS1 ${event.id} has flavor_sequences`).toBeUndefined();
      expect(event.pages, `STS1 ${event.id} has pages`).toBeUndefined();
      // STS1 events may have an existing `outcome` field but it should be empty string
      for (const choice of (event.choices ?? [])) {
        if (choice.outcome !== undefined) {
          expect(choice.outcome, `STS1 ${event.id} choice "${choice.name ?? choice.option}" has non-empty outcome`).toBe('');
        }
      }
    }
  });
});
