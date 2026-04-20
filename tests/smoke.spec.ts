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

// ── Localization (Japanese as representative — mirrors English tests) ──

// Japanese regex: hiragana, katakana, CJK
const JA = /[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff]/;

// Japanese names for the same entities tested in English
const JA_DETAIL_PAGES: Record<string, [string, string, string][]> = {
  // [jaPath, expectedJaText, englishTextThatShouldNotAppear]
  sts1: [
    ['/ja/sts1/cards/BASH', '強打', 'Bash'],
    ['/ja/sts1/relics/BURNING_BLOOD', '燃える血', 'Burning Blood'],
    ['/ja/sts1/potions/AMBROSIA', '神々の飲料', 'Ambrosia'],
    ['/ja/sts1/events/BIG_FISH', 'ビッグフィッシュ', 'Big Fish'],
    ['/ja/sts1/effects/ACCURACY', '精度上昇', 'Accuracy'],
  ],
  sts2: [
    ['/ja/sts2/cards/BASH', '強打', 'Bash'],
    ['/ja/sts2/relics/AKABEKO', '赤べこ', 'Akabeko'],
    ['/ja/sts2/potions/BEETLE_JUICE', '甲虫ジュース', 'Beetle Juice'],
    ['/ja/sts2/events/SELF_HELP_BOOK', '自己啓発本', 'Self-Help Book'],
    ['/ja/sts2/effects/KNOCKDOWN_POWER', 'ノックダウン', 'Knockdown'],
    ['/ja/sts2/enchantments/SWIFT', '迅速', 'Swift'],
  ],
};

test.describe('Localization — Japanese index pages', () => {
  for (const game of GAMES) {
    for (const section of SHARED_PAGES) {
      test(`/ja/${game}/${section} renders Japanese content`, async ({ page }) => {
        const res = await page.goto(`/ja/${game}/${section}`);
        expect(res?.status()).toBe(200);
        const content = await page.textContent('body');
        expect(content).toMatch(JA);
      });
    }
  }

  for (const section of STS2_ONLY_PAGES) {
    test(`/ja/sts2/${section} renders Japanese content`, async ({ page }) => {
      const res = await page.goto(`/ja/sts2/${section}`);
      expect(res?.status()).toBe(200);
      const content = await page.textContent('body');
      expect(content).toMatch(JA);
    });
  }
});

test.describe('Localization — Japanese detail pages show translated names', () => {
  for (const game of GAMES) {
    for (const [path, jaText, enText] of JA_DETAIL_PAGES[game]) {
      test(`${path} shows "${jaText}" (not "${enText}")`, async ({ page }) => {
        const res = await page.goto(path);
        expect(res?.status()).toBe(200);
        const content = await page.textContent('body');
        expect(content).toContain(jaText);
        // Title/heading should be Japanese, not English
        const heading = await page.textContent('h1');
        if (heading) {
          expect(heading).not.toBe(enText);
        }
      });
    }
  }
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
      // Cloudflare can 429 the big list endpoints when the smoke suite
      // bursts. Retry a couple times with backoff before giving up so a
      // transient rate limit doesn't fail deploys.
      let res;
      for (let attempt = 0; attempt < 4; attempt += 1) {
        res = await request.get(`${endpoint}?limit=400`);
        if (res.status() !== 429) break;
        await new Promise((r) => setTimeout(r, 1500 * (attempt + 1)));
      }
      expect(res!.status()).toBe(200);
      const json = await res!.json();
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
