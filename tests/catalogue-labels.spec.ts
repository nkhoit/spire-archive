import { test, expect } from './fixtures';

for (const game of ['sts1', 'sts2']) {
  for (const locale of ['en', 'ja', 'de']) {
    test(`${game}/${locale}: catalogue counts have units, not decorative numbering`, async ({ page }) => {
      await page.setViewportSize({ width: 390, height: 844 });
      await page.goto(`${locale === 'en' ? '' : '/' + locale}/${game}`);
      await expect(page.locator('.catalogue-number')).toHaveCount(0);
      const links = page.locator('.catalogue-link');
      await expect(links).toHaveCount(game === 'sts2' ? 8 : 7);
      for (const link of await links.all()) {
        const heading = await link.locator('.catalogue-label').evaluate(el => el.firstChild!.textContent!.trim());
        const count = link.locator('.catalogue-count');
        const text = (await count.innerText()).trim();
        expect(text).toMatch(/^\d[\d.,]* /);
        expect(text.endsWith(locale === 'en' ? heading.toLowerCase() : heading)).toBeTruthy();
      }
      await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
    });
  }
}
