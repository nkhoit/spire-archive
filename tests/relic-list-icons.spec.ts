import { test, expect } from './fixtures';

for (const game of ['sts1', 'sts2']) {
  for (const width of [390, 1440]) {
    test(`${game} relic list uses full-size artwork at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(`/${game}/relics`);
      const images = page.locator('main li img');
      await expect(images.first()).toBeVisible();
      for (const image of (await images.all()).slice(0, 3)) {
        await image.scrollIntoViewIfNeeded();
        await expect.poll(() => image.evaluate((i: HTMLImageElement) => i.complete && i.naturalWidth > 0)).toBeTruthy();
        await expect(image).toHaveAttribute('src', new RegExp(`/images/${game}/${game === 'sts1' ? 'relics-list' : 'relics'}/`));
        const size = await image.evaluate((i: HTMLImageElement) => {
          const canvas = document.createElement('canvas');
          canvas.width = i.naturalWidth; canvas.height = i.naturalHeight;
          const ctx = canvas.getContext('2d')!;
          ctx.drawImage(i, 0, 0);
          const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
          let left = canvas.width, top = canvas.height, right = -1, bottom = -1;
          for (let y = 0; y < canvas.height; y++) for (let x = 0; x < canvas.width; x++) {
            if (pixels[(y * canvas.width + x) * 4 + 3] > 16) {
              left = Math.min(left, x); right = Math.max(right, x);
              top = Math.min(top, y); bottom = Math.max(bottom, y);
            }
          }
          return { slot: i.width, visible: Math.max(right - left + 1, bottom - top + 1) / Math.max(canvas.width, canvas.height) * i.width };
        });
        expect(size.slot).toBe(56);
        expect(size.visible).toBeGreaterThanOrEqual(49);
        expect(size.visible).toBeLessThanOrEqual(56);
      }
      await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
      await expect(page.locator('astro-island:has(.explorer-toolbar)')).not.toHaveAttribute('ssr', '');
      await page.getByPlaceholder('Search relics…').fill('Akabeko');
      await expect(page.locator('main li')).toHaveCount(1);
      await expect(page.locator('main li')).toContainText('Akabeko');
      await expect(page.locator('main li img')).toBeVisible();
    });
  }
}
