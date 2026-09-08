import { test, expect } from '@playwright/test';
for (const game of ['sts1', 'sts2']) {
  for (const width of [320, 390, 768]) {
    test(`${game} card detail fits ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 844 });
      await page.goto(`/${game}/cards/BASH`);
      await page.evaluate(() => document.fonts.ready);
      await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
      const card = page.locator('.card-render-wrap').locator(game === 'sts1' ? '.cr1' : '.cr');
      const rect = await card.boundingBox();
      if (game === 'sts1') {
        const scale = await card.evaluate(el => Number(getComputedStyle(el).getPropertyValue('--s')));
        rect!.x += 175 * scale;
        rect!.width -= (175 + 186) * scale;
      }
      expect(rect!.x).toBeGreaterThanOrEqual(0);
      expect(rect!.x + rect!.width).toBeLessThanOrEqual(width);
      await expect(page.locator('astro-island:has(.card-render-wrap)')).not.toHaveAttribute('ssr', '');
      await page.getByRole('button', { name: 'Upgraded', exact: true }).click();
      await expect(page.locator('#card-name')).toHaveText('Bash+');
    });
  }
}
