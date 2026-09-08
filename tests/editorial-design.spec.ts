import { test, expect } from './fixtures';

for (const width of [390, 1280]) {
  for (const path of ['/', '/sts1', '/sts2']) {
    test(`${path}: editorial index fits ${width}px and images resolve`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(path);
      await expect(page.locator('main h1')).toHaveCount(1);
      await page.evaluate(() => document.fonts.ready);
      await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
      const images = page.locator('main img');
      for (const image of await images.all()) {
        await expect.poll(() => image.evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0)).toBeTruthy();
      }
      if (path !== '/') {
        await expect(page.locator('.catalogue-link').first()).toContainText('Cards');
        await expect(page.locator('.catalogue-link').nth(1)).toContainText('Relics');
        await expect(page.locator('.character-entry')).toHaveCount(path === '/sts1' ? 4 : 5);
      } else {
        await expect(page.locator('.volume-entry')).toHaveCount(2);
        await expect(page.locator('.volume-quicklinks a')).toHaveCount(8);
      }
    });
  }
}

test('homepage counts come from the same database as the API', async ({ page, request }) => {
  await page.goto('/');
  for (const game of ['sts1', 'sts2']) {
    for (const section of ['cards', 'relics', 'potions']) {
      const response = await request.get(`/api/${game}/${section}?limit=1`);
      expect(response.ok()).toBeTruthy();
      const { total } = await response.json();
      await expect(page.locator(`.volume-quicklinks a[href="/${game}/${section}"] .index-count`)).toHaveText(total.toLocaleString('en'));
    }
  }
});

for (const section of ['cards', 'relics']) {
  test(`${section}: mobile filters are named, usable, and clear the sticky header`, async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`/sts2/${section}`);
    const toolbar = page.locator('.explorer-toolbar');
    // SSR controls are visible before Astro has attached React handlers.
    await expect(page.locator('astro-island:has(.explorer-toolbar)')).not.toHaveAttribute('ssr', '');
    await expect(page.getByRole('button', { name: 'Filters', exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Filters', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Filters', exact: true })).toHaveAttribute('aria-expanded', 'true');
    for (const control of await toolbar.locator('input, select').all()) {
      await expect(control).toHaveAccessibleName(/.+/);
    }
    const search = toolbar.locator('input').first();
    await search.fill(section === 'cards' ? 'Bash' : 'Burning Blood');
    await expect(page.locator('main')).toContainText(section === 'cards' ? 'Bash' : 'Burning Blood');
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
    await search.clear();
    await page.getByRole('button', { name: 'Filters', exact: true }).click();
    await page.evaluate(() => window.scrollTo(0, 600));
    const toolbarTop = await toolbar.evaluate(el => el.getBoundingClientRect().top);
    const headerBottom = await page.locator('.site-header').evaluate(el => el.getBoundingClientRect().bottom);
    expect(toolbarTop).toBeGreaterThanOrEqual(headerBottom - 1);
  });
}

test('menu supports keyboard dismissal and focus return', async ({ page }) => {
  await page.goto('/sts2');
  const toggle = page.getByRole('button', { name: 'Toggle menu' });
  await toggle.focus();
  await page.keyboard.press('Enter');
  await expect(toggle).toHaveAttribute('aria-expanded', 'true');
  await page.keyboard.press('Tab');
  await expect(page.locator('#nav-dropdown a').first()).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(toggle).toHaveAttribute('aria-expanded', 'false');
  await expect(toggle).toBeFocused();
});

test('Japanese indexes retain localized labels and destinations', async ({ page }) => {
  await page.goto('/ja');
  await expect(page.locator('.volume-quicklinks').first()).toContainText('カード');
  await expect(page.locator('.volume-quicklinks a').first()).toHaveAttribute('href', '/ja/sts1/cards');
  await page.goto('/ja/sts2');
  await expect(page.locator('.catalogue-link').first()).toContainText('カード');
  for (const link of await page.locator('.catalogue-link, .character-entry, .game-tabs a, .section-navigation a').all()) {
    await expect(link).toHaveAttribute('href', /^\/ja\//);
  }
});

test('indexes and primary navigation are usable without JavaScript', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  try {
    await page.goto(test.info().project.use.baseURL + '/');
    await page.locator('.volume-quicklinks a[href="/sts2/cards"]').click();
    await expect(page.locator('main h1')).toHaveText('Cards');
    await expect(page.locator('.game-tabs a[aria-current]')).toHaveText('Spire II');
    await expect(page.locator('.section-navigation a[aria-current="page"]')).toHaveText('Cards');
  } finally {
    await context.close();
  }
});
