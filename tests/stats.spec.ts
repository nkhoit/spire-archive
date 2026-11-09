import { test, expect } from './fixtures';

test.describe('Run stats tab', () => {
  test.beforeEach(async ({ request }) => {
    const response = await request.get('/api/sts1/stats');
    test.skip(!response.ok() || (await response.json())?.runs !== 3, 'server is not running with STATS_FILE=tests/stats-fixtures/stats.json');
  });

  const open = async (page: any) => {
    await page.goto('/sts1/stats');
    await page.waitForFunction(() => !document.querySelector('astro-island[ssr]'));
  };

  test('is linked from STS1 navigation only', async ({ page }) => {
    await page.goto('/sts1');
    await expect(page.locator('.section-navigation').getByRole('link', { name: 'Stats' })).toBeVisible();
    await page.goto('/sts2');
    await expect(page.locator('.section-navigation').getByRole('link', { name: 'Stats' })).toHaveCount(0);
  });

  test('filters change the numbers', async ({ page }) => {
    await open(page);
    const tile = (label: string) => page.locator('div.rounded-lg.p-3').filter({ hasText: label });
    await expect(tile('Runs')).toContainText('3');
    await page.getByRole('combobox', { name: 'Character' }).selectOption('ironclad');
    await expect(tile('Runs')).toContainText('2');
    await expect(tile('Win rate')).toContainText('50.0%');
    await page.getByRole('combobox', { name: 'Ascension' }).selectOption('a20');
    await expect(tile('Runs')).toContainText('1');
  });

  test('game version narrows to one period', async ({ page }) => {
    await open(page);
    const tile = (label: string) => page.locator('div.rounded-lg.p-3').filter({ hasText: label });
    const version = page.getByRole('combobox', { name: 'Game version' });
    await expect(version).toHaveValue('all');
    await version.selectOption('2019');
    await expect(tile('Runs')).toContainText('1');
    await expect(tile('Win rate')).toContainText('0.0%');
    await version.selectOption('2020-Q3');
    await expect(tile('Win rate')).toContainText('100.0%');
  });

  test('an empty combination says so', async ({ page }) => {
    await open(page);
    await page.getByRole('combobox', { name: 'Character' }).selectOption('watcher');
    await expect(page.getByText('No runs match this selection.')).toBeVisible();
  });

  test('tables sort and link to entries', async ({ page }) => {
    await open(page);
    const encounters = page.getByRole('table', { name: 'Encounters' });
    await expect(encounters.getByRole('row').nth(1)).toContainText('Jaw Worm');
    await encounters.getByRole('button', { name: 'Damage taken / fight' }).click();
    await expect(encounters.getByRole('row').nth(1)).toContainText('The Guardian');
    await expect(page.getByRole('table', { name: 'Cards' }).getByRole('link', { name: 'Inflame' })).toHaveAttribute('href', '/sts1/cards/INFLAME');
  });

  test('fits a phone without page scroll', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 700 });
    await open(page);
    await expect(page.getByRole('table', { name: 'Cards' })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(375);
  });
});
