import { test, expect } from './fixtures';

// Protect SSR, locale rewrites, API queries, and response headers across upgrades.
for (const game of ['sts1', 'sts2']) {
  test(`${game}: localized SSR and SEO work without JavaScript`, async ({ browser, baseURL }) => {
    const context = await browser.newContext({ javaScriptEnabled: false, baseURL });
    try {
      const page = await context.newPage();
      const path = `/ja/${game}/cards/BASH`;
      const response = await page.goto(path);
      expect(response?.status()).toBe(200);
      await expect(page.locator('html')).toHaveAttribute('lang', 'ja');
      await expect(page.locator('main')).toContainText('強打');
      await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', `https://spire-archive.com${path}`);
      await expect(page.locator('link[hreflang="en"]')).toHaveAttribute('href', `https://spire-archive.com/${game}/cards/BASH`);
    } finally { await context.close(); }
  });

  test(`${game}: API preserves query parameters and CORS`, async ({ request }) => {
    const response = await request.get(`/api/${game}/cards?q=Bash&limit=1&offset=0`);
    expect(response.status()).toBe(200);
    expect(response.headers()['content-type']).toContain('application/json');
    expect(response.headers()['access-control-allow-origin']).toBe('*');
    const data = await response.json();
    expect(data).toMatchObject({ limit: 1, offset: 0 });
    expect(data.total).toBeGreaterThanOrEqual(1);
    expect(data.items).toHaveLength(1);
    expect(data.items[0]).toMatchObject({ id: 'BASH', name: 'Bash' });
  });

  test(`${game}: localized API query returns translated data`, async ({ request }) => {
    const query = new URLSearchParams({ q: '強打', lang: 'ja', limit: '1' });
    const response = await request.get(`/api/${game}/cards?${query}`);
    expect(response.status()).toBe(200);
    const data = await response.json();
    expect(data.items).toHaveLength(1);
    expect(data.items[0]).toMatchObject({ id: 'BASH', name: '強打' });
  });

  test(`${game}: character card hover hydrates its lazy React portal`, async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 1000 });
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    expect((await page.goto(`/${game}/characters/IRONCLAD`))?.status()).toBe(200);
    await page.waitForFunction(() => typeof (window as any).__cardHoverShow === 'function');
    await page.locator(`main a[href="/${game}/cards/BASH"]`).first().hover();
    await expect(page.locator('#card-hover-portal').locator(game === 'sts1' ? '.cr1' : '.cr')).toBeVisible();
    await page.mouse.move(0, 0);
    await expect(page.locator('#card-hover-portal')).toBeEmpty();
    expect(errors).toEqual([]);
  });

  test(`${game}: unknown API entity remains a 404`, async ({ request }) => {
    const response = await request.get(`/api/${game}/cards/FRAMEWORK_MIGRATION_MISSING`);
    expect(response.status()).toBe(404);
    expect(response.headers()['content-type']).toContain('application/json');
  });
}
