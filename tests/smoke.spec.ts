import { test, expect } from '@playwright/test';

// ── All user-facing pages that must return 200 and render content ──

const GAMES = ['sts1', 'sts2'] as const;

// Pages shared across both games (under /[game]/...)
const SHARED_PAGES = ['cards', 'relics', 'potions', 'events', 'effects', 'monsters', 'characters'];

// STS2-only pages
const STS2_ONLY_PAGES = ['enchantments', 'powers'];

// Detail pages per game (path, expected text)
const DETAIL_PAGES: Record<string, [string, string][]> = {
  sts1: [
    ['/sts1/cards/BASH', 'Bash'],
    ['/sts1/relics/BURNING_BLOOD', 'Burning Blood'],
    ['/sts1/potions/AMBROSIA', 'Ambrosia'],
    ['/sts1/events/BIG_FISH', 'Big Fish'],
    ['/sts1/effects/ACCURACY', 'Accuracy'],
    ['/sts1/monsters/ACIDSLIME_L', 'Acid Slime'],
    ['/sts1/characters/IRONCLAD', 'Ironclad'],
  ],
  sts2: [
    ['/sts2/cards/BASH', 'Bash'],
    ['/sts2/relics/AKABEKO', 'Akabeko'],
    ['/sts2/potions/BEETLE_JUICE', 'Beetle Juice'],
    ['/sts2/events/SELF_HELP_BOOK', 'Self-Help Book'],
    ['/sts2/effects/KNOCKDOWN_POWER', 'Knockdown'],
    ['/sts2/monsters/CALCIFIED_CULTIST', 'Calcified Cultist'],
    ['/sts2/characters/IRONCLAD', 'Ironclad'],
    ['/sts2/enchantments/SWIFT', 'Swift'],
  ],
};

// ── Index pages ──

test.describe('Index pages return 200', () => {
  for (const game of GAMES) {
    test(`/${game} homepage renders`, async ({ page }) => {
      const res = await page.goto(`/${game}`);
      expect(res?.status()).toBe(200);
      await expect(page).toHaveTitle(/.+/);
    });

    for (const section of SHARED_PAGES) {
      test(`/${game}/${section} renders list`, async ({ page }) => {
        const res = await page.goto(`/${game}/${section}`);
        expect(res?.status()).toBe(200);
        const body = await page.textContent('body');
        expect(body!.length).toBeGreaterThan(100);
      });
    }
  }

  for (const section of STS2_ONLY_PAGES) {
    test(`/sts2/${section} renders list`, async ({ page }) => {
      const res = await page.goto(`/sts2/${section}`);
      expect(res?.status()).toBe(200);
      const body = await page.textContent('body');
      expect(body!.length).toBeGreaterThan(100);
    });
  }
});

// ── Detail pages ──

test.describe('Detail pages return 200 and show expected content', () => {
  for (const game of GAMES) {
    for (const [path, expectedText] of DETAIL_PAGES[game]) {
      test(`${path} renders "${expectedText}"`, async ({ page }) => {
        const res = await page.goto(path);
        expect(res?.status()).toBe(200);
        const body = await page.textContent('body');
        expect(body).toContain(expectedText);
      });
    }
  }
});

// ── Localization (Japanese as representative) ──

test.describe('Localization — Japanese', () => {
  const jaPages = [
    '/ja/sts2',
    '/ja/sts2/cards',
    '/ja/sts2/relics',
    '/ja/sts2/events',
    '/ja/sts2/effects',
    '/ja/sts2/characters',
    '/ja/sts1',
    '/ja/sts1/cards',
    '/ja/sts1/effects',
  ];

  for (const path of jaPages) {
    test(`${path} renders Japanese content`, async ({ page }) => {
      await page.goto(path);
      const content = await page.textContent('body');
      expect(content).toMatch(/[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff]/);
    });
  }

  test('/ja/sts2/cards/BASH has translated description', async ({ page }) => {
    await page.goto('/ja/sts2/cards/BASH');
    const content = await page.textContent('body');
    expect(content).toMatch(/[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff]/);
    expect(content).not.toMatch(/Deal \d+ damage/);
  });
});

// ── Link integrity (locale prefix preserved) ──

test.describe('Link integrity — locale prefix', () => {
  const localeListPages = [
    '/ja/sts2/cards',
    '/ja/sts2/relics',
    '/ja/sts2/potions',
    '/ja/sts2/characters',
  ];

  for (const path of localeListPages) {
    const section = path.split('/').pop()!;
    test(`${path} — links have /ja/ prefix`, async ({ page }) => {
      await page.goto(path);
      const links = page.locator(`a[href*="/${section}/"]`);
      await expect(links.first()).toBeVisible({ timeout: 10000 });
      const count = await links.count();
      expect(count).toBeGreaterThan(0);
      for (let i = 0; i < Math.min(count, 5); i++) {
        const href = await links.nth(i).getAttribute('href');
        expect(href).toMatch(/^\/ja\//);
      }
    });
  }

  test('/ja/sts2/cards/BASH — no unlocalized internal links', async ({ page }) => {
    await page.goto('/ja/sts2/cards/BASH');
    const unleaked = page.locator('a[href^="/sts2/"]');
    const count = await unleaked.count();
    expect(count).toBe(0);
  });
});

// ── API endpoints ──

test.describe('API — list endpoints return expected counts', () => {
  const apiChecks: [string, number][] = [
    ['/api/sts2/cards', 500],
    ['/api/sts2/relics', 80],
    ['/api/sts2/potions', 30],
    ['/api/sts2/monsters', 100],
    ['/api/sts2/events', 50],
    ['/api/sts2/enchantments', 15],
    ['/api/sts2/powers', 100],
    ['/api/sts1/cards', 300],
    ['/api/sts1/relics', 100],
    ['/api/sts1/potions', 30],
    ['/api/sts1/monsters', 50],
    ['/api/sts1/events', 40],
    ['/api/sts1/powers', 100],
  ];

  for (const [endpoint, minCount] of apiChecks) {
    test(`${endpoint} returns ≥${minCount} items`, async ({ request }) => {
      const res = await request.get(`${endpoint}?limit=400`);
      expect(res.status()).toBe(200);
      const json = await res.json();
      expect(json.total).toBeGreaterThanOrEqual(minCount);
    });
  }
});

test.describe('API — detail endpoints', () => {
  const details: Record<string, Record<string, string>> = {
    sts1: { cards: 'BASH', relics: 'BURNING_BLOOD', potions: 'AMBROSIA', events: 'BIG_FISH', powers: 'ACCURACY', monsters: 'ACIDSLIME_L' },
    sts2: { cards: 'BASH', relics: 'AKABEKO', potions: 'FIRE_POTION', events: 'ABYSSAL_BATHS', powers: 'KNOCKDOWN_POWER', monsters: 'ARCHITECT', enchantments: 'ADROIT' },
  };

  for (const game of GAMES) {
    for (const [entity, id] of Object.entries(details[game])) {
      test(`/api/${game}/${entity}/${id} returns 200`, async ({ request }) => {
        const res = await request.get(`/api/${game}/${entity}/${id}`);
        expect(res.status()).toBe(200);
        const json = await res.json();
        expect(json.id).toBe(id);
      });
    }
  }
});

test.describe('API — search', () => {
  for (const game of GAMES) {
    test(`/api/${game}/search returns results`, async ({ request }) => {
      const res = await request.get(`/api/${game}/search?q=strike`);
      expect(res.status()).toBe(200);
      const json = await res.json();
      expect(json.total).toBeGreaterThan(0);
      expect(json.offset).toBeDefined();
      expect(json.limit).toBeDefined();
      expect(Array.isArray(json.items)).toBe(true);
    });
  }
});

test.describe('API — STS1 enchantments returns 404', () => {
  test('/api/sts1/enchantments is not available', async ({ request }) => {
    const res = await request.get('/api/sts1/enchantments');
    expect(res.status()).toBe(404);
  });
});
