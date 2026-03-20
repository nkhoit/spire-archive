import { test, expect } from '@playwright/test';

const LOCALES = ['en', 'ja', 'ko', 'zh', 'de', 'fr', 'es', 'pt', 'it', 'pl', 'ru', 'tr', 'th'];
const GAMES = ['sts1', 'sts2'] as const;

// List endpoints (return paginated { data, total })
const LIST_ENDPOINTS: Record<string, string[]> = {
  sts1: ['cards', 'relics', 'potions', 'events', 'effects', 'powers', 'monsters'],
  sts2: ['cards', 'relics', 'potions', 'events', 'effects', 'powers', 'monsters', 'enchantments'],
};

// Reference endpoints (return flat arrays or objects)
const REF_ENDPOINTS = ['characters', 'keywords', 'achievements', 'blights', 'orbs', 'stances'];

// Endpoints that support locale
const LOCALE_ENDPOINTS: Record<string, string[]> = {
  sts1: ['cards', 'relics', 'potions', 'events'],
  sts2: ['cards', 'relics', 'potions', 'events', 'enchantments'],
};

test.describe('API — List endpoints return data', () => {
  for (const game of GAMES) {
    for (const endpoint of LIST_ENDPOINTS[game]) {
      test(`${game}/${endpoint} returns 200 with data`, async ({ request }) => {
        const res = await request.get(`/api/${game}/${endpoint}`);
        expect(res.status()).toBe(200);
        const json = await res.json();
        // Most list endpoints return { data: [...], total: N }
        if (json.data) {
          expect(Array.isArray(json.data)).toBe(true);
          expect(json.data.length).toBeGreaterThan(0);
          expect(json.total).toBeGreaterThan(0);
        } else if (Array.isArray(json)) {
          expect(json.length).toBeGreaterThan(0);
        }
      });
    }
  }
});

test.describe('API — Reference endpoints', () => {
  for (const game of GAMES) {
    for (const endpoint of REF_ENDPOINTS) {
      test(`${game}/reference/${endpoint} returns 200`, async ({ request }) => {
        const res = await request.get(`/api/${game}/reference/${endpoint}`);
        expect(res.status()).toBe(200);
        const json = await res.json();
        expect(json).toBeTruthy();
      });
    }
  }
});

test.describe('API — Search endpoints', () => {
  for (const game of GAMES) {
    test(`${game}/search returns results for "strike"`, async ({ request }) => {
      const res = await request.get(`/api/${game}/search?q=strike`);
      expect(res.status()).toBe(200);
      const json = await res.json();
      const items = json.items ?? json;
      expect(Array.isArray(items)).toBe(true);
      expect(items.length).toBeGreaterThan(0);
    });
  }
});

test.describe('API — Locale support', () => {
  for (const game of GAMES) {
    for (const endpoint of LOCALE_ENDPOINTS[game]) {
      for (const locale of LOCALES) {
        test(`${game}/${endpoint}?lang=${locale} returns 200`, async ({ request }) => {
          const res = await request.get(`/api/${game}/${endpoint}?lang=${locale}`);
          expect(res.status()).toBe(200);
          const json = await res.json();
          if (json.data) {
            expect(json.data.length).toBeGreaterThan(0);
          }
        });
      }
    }
  }
});

test.describe('API — Detail endpoints', () => {
  // Test a known ID for each entity type
  const DETAIL_IDS: Record<string, Record<string, string>> = {
    sts1: { cards: 'STRIKE_R', relics: 'AKABEKO', potions: 'AMBROSIA', events: 'BIG_FISH', monsters: 'ACIDSLIME_L' },
    sts2: { cards: 'BASH', relics: 'AKABEKO', potions: 'FIRE_POTION', events: 'ABYSSAL_BATHS', monsters: 'ARCHITECT', enchantments: 'ADROIT' },
  };

  for (const game of GAMES) {
    for (const [endpoint, id] of Object.entries(DETAIL_IDS[game])) {
      test(`${game}/${endpoint}/${id} returns 200 with data`, async ({ request }) => {
        const res = await request.get(`/api/${game}/${endpoint}/${id}`);
        expect(res.status()).toBe(200);
        const json = await res.json();
        expect(json).toBeTruthy();
        // Detail should have an id or name
        if (json.id) expect(json.id).toBe(id);
      });
    }
  }

  // Test detail endpoints with locale
  for (const game of GAMES) {
    const cardId = game === 'sts1' ? 'STRIKE_R' : 'BASH';
    for (const locale of LOCALES) {
      test(`${game}/cards/${cardId}?lang=${locale} returns localized data`, async ({ request }) => {
        const res = await request.get(`/api/${game}/cards/${cardId}?lang=${locale}`);
        expect(res.status()).toBe(200);
        const json = await res.json();
        expect(json).toBeTruthy();
      });
    }
  }
});

test.describe('API — Pagination', () => {
  for (const game of GAMES) {
    test(`${game}/cards respects offset and limit`, async ({ request }) => {
      const res1 = await request.get(`/api/${game}/cards?offset=0&limit=5`);
      const json1 = await res1.json();
      const res2 = await request.get(`/api/${game}/cards?offset=5&limit=5`);
      const json2 = await res2.json();

      const items1 = json1.items ?? json1.data;
      const items2 = json2.items ?? json2.data;
      expect(items1.length).toBe(5);
      expect(items2.length).toBe(5);
      expect(items1[0].id).not.toBe(items2[0].id);
    });
  }
});

test.describe('API — Search index', () => {
  test('search-index returns data', async ({ request }) => {
    const res = await request.get('/api/search-index');
    expect(res.status()).toBe(200);
    const json = await res.json();
    expect(json).toBeTruthy();
  });
});
