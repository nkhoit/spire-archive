import { test, expect } from '@playwright/test';

test.describe('Basic rendering', () => {
  test('Homepage /sts2 returns 200 and renders page title', async ({ page }) => {
    const response = await page.goto('/sts2');
    expect(response?.status()).toBe(200);
    await expect(page).toHaveTitle(/.+/);
  });

  test('/sts2/cards renders card list', async ({ page }) => {
    await page.goto('/sts2/cards');
    const cardLinks = page.locator('a[href*="/cards/"]');
    await expect(cardLinks.first()).toBeVisible();
  });

  test('/sts2/relics renders relic list', async ({ page }) => {
    await page.goto('/sts2/relics');
    const relicLinks = page.locator('a[href*="/relics/"]');
    await expect(relicLinks.first()).toBeVisible();
  });

  test('/sts2/events renders event list', async ({ page }) => {
    await page.goto('/sts2/events');
    const eventLinks = page.locator('a[href*="/events/"]');
    await expect(eventLinks.first()).toBeVisible();
  });

  test('/sts2/characters renders character cards', async ({ page }) => {
    await page.goto('/sts2/characters');
    const charLinks = page.locator('a[href*="/characters/"]');
    await expect(charLinks.first()).toBeVisible();
  });

  test('/sts2/potions renders potion list', async ({ page }) => {
    await page.goto('/sts2/potions');
    const potionLinks = page.locator('a[href*="/potions/"]');
    await expect(potionLinks.first()).toBeVisible();
  });

  test('/sts2/monsters renders monster list', async ({ page }) => {
    await page.goto('/sts2/monsters');
    const monsterLinks = page.locator('a[href*="/monsters/"]');
    await expect(monsterLinks.first()).toBeVisible();
  });

  test('/sts2/enchantments renders enchantment list', async ({ page }) => {
    await page.goto('/sts2/enchantments');
    const links = page.locator('a[href*="/enchantments/"]');
    await expect(links.first()).toBeVisible();
  });
});

test.describe('Detail pages return 200', () => {
  const detailPages = [
    ['/sts2/cards/BASH', 'Bash'],
    ['/sts2/relics/AKABEKO', 'Akabeko'],
    ['/sts2/potions/BEETLE_JUICE', 'Beetle Juice'],
    ['/sts2/events/SELF_HELP_BOOK', 'Self-Help Book'],
    ['/sts2/monsters/CULTIST', 'Cultist'],
    ['/sts2/characters/IRONCLAD', 'Ironclad'],
    ['/sts2/enchantments/SWIFT', 'Swift'],
  ];
  for (const [path, name] of detailPages) {
    test(`${path} renders ${name}`, async ({ page }) => {
      const response = await page.goto(path);
      expect(response?.status()).toBe(200);
      const body = await page.textContent('body');
      expect(body).toContain(name);
    });
  }
});

test.describe('Localization (Japanese)', () => {
  test('/ja/sts2 renders with Japanese content', async ({ page }) => {
    await page.goto('/ja/sts2');
    const content = await page.textContent('body');
    // Check for Japanese characters (hiragana, katakana, or kanji)
    expect(content).toMatch(/[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff]/);
  });

  test('/ja/sts2/cards/BASH renders Japanese card description', async ({ page }) => {
    await page.goto('/ja/sts2/cards/BASH');
    const content = await page.textContent('body');
    // Should contain Japanese characters
    expect(content).toMatch(/[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff]/);
    // Should NOT contain the English description "Deal X damage"
    expect(content).not.toMatch(/Deal \d+ damage/);
  });

  test('/ja/sts2/characters shows translated character descriptions', async ({ page }) => {
    await page.goto('/ja/sts2/characters');
    const content = await page.textContent('body');
    expect(content).toMatch(/[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff]/);
  });

  test('/ja/sts2/events shows translated event names', async ({ page }) => {
    await page.goto('/ja/sts2/events');
    const content = await page.textContent('body');
    expect(content).toMatch(/[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff]/);
  });
});

test.describe('Link integrity', () => {
  test('On /ja/sts2/potions, potion links have /ja/ prefix', async ({ page }) => {
    await page.goto('/ja/sts2/potions');
    // Wait for React hydration — explorer renders items client-side
    const links = page.locator('a[href*="/potions/"]');
    await expect(links.first()).toBeVisible({ timeout: 10000 });
    const count = await links.count();
    expect(count).toBeGreaterThan(0);
    for (let i = 0; i < Math.min(count, 5); i++) {
      const href = await links.nth(i).getAttribute('href');
      expect(href).toMatch(/^\/ja\//);
    }
  });

  test('On /ja/sts2/relics, relic links have /ja/ prefix', async ({ page }) => {
    await page.goto('/ja/sts2/relics');
    const links = page.locator('a[href*="/relics/"]');
    await expect(links.first()).toBeVisible({ timeout: 10000 });
    const count = await links.count();
    expect(count).toBeGreaterThan(0);
    for (let i = 0; i < Math.min(count, 5); i++) {
      const href = await links.nth(i).getAttribute('href');
      expect(href).toMatch(/^\/ja\//);
    }
  });

  test('On /ja/sts2/cards/BASH, Applied Effects links have /ja/ prefix', async ({ page }) => {
    await page.goto('/ja/sts2/cards/BASH');
    // Look for links to effects (powers/status effects)
    const effectLinks = page.locator('a[href*="/effects/"], a[href*="/powers/"], a[href*="/status/"]');
    const count = await effectLinks.count();
    if (count > 0) {
      for (let i = 0; i < count; i++) {
        const href = await effectLinks.nth(i).getAttribute('href');
        expect(href).toMatch(/^\/ja\//);
      }
    }
    // Also check all internal links on the page don't break locale
    const allLinks = page.locator('a[href^="/sts2/"]');
    const allCount = await allLinks.count();
    // There should be no non-localized internal links on a localized page
    expect(allCount).toBe(0);
  });

  test('On /ja/sts2/characters, character links have locale prefix', async ({ page }) => {
    await page.goto('/ja/sts2/characters');
    const links = page.locator('a[href*="/characters/"]');
    const count = await links.count();
    expect(count).toBeGreaterThan(0);
    for (let i = 0; i < Math.min(count, 5); i++) {
      const href = await links.nth(i).getAttribute('href');
      expect(href).toMatch(/^\/ja\//);
    }
  });
});

test.describe('API endpoints', () => {
  const apiChecks = [
    ['/api/sts2/cards', 500],
    ['/api/sts2/relics', 80],
    ['/api/sts2/potions', 30],
    ['/api/sts2/monsters', 100],
    ['/api/sts2/events', 50],
    ['/api/sts2/enchantments', 15],
    ['/api/sts2/powers', 100],
  ] as const;

  for (const [endpoint, minCount] of apiChecks) {
    test(`${endpoint} returns ≥${minCount} items`, async ({ request }) => {
      const response = await request.get(endpoint);
      expect(response.status()).toBe(200);
      const body = await response.json();
      const items = body.items ?? body.data ?? body;
      expect(Array.isArray(items)).toBe(true);
      expect(items.length).toBeGreaterThanOrEqual(minCount);
    });
  }
});
