import { test, expect } from './fixtures';

for (const game of ['sts1', 'sts2']) {
  for (const width of [390, 1440]) {
    test(`${game}: navigation artwork has consistent visible size at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 1000 });
      await page.goto(`/${game}`);
      for (const icon of await page.locator('.catalogue-link img').all()) {
        await expect(icon).toHaveAttribute('src', new RegExp(`/images/${game}/nav-normalized/`));
        await expect.poll(() => icon.evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0)).toBeTruthy();
        const bounds = await icon.evaluate((img: HTMLImageElement) => {
          const canvas = document.createElement('canvas');
          canvas.width = img.naturalWidth;
          canvas.height = img.naturalHeight;
          const ctx = canvas.getContext('2d')!;
          ctx.drawImage(img, 0, 0);
          const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
          let left = canvas.width, top = canvas.height, right = -1, bottom = -1;
          for (let y = 0; y < canvas.height; y++) for (let x = 0; x < canvas.width; x++) {
            if (pixels[(y * canvas.width + x) * 4 + 3] > 16) {
              left = Math.min(left, x); right = Math.max(right, x);
              top = Math.min(top, y); bottom = Math.max(bottom, y);
            }
          }
          return { width: canvas.width, height: canvas.height, left, top, right, bottom };
        });
        expect(bounds.width).toBe(128);
        expect(bounds.height).toBe(128);
        const longest = Math.max(bounds.right - bounds.left + 1, bounds.bottom - bounds.top + 1);
        expect(longest).toBeGreaterThanOrEqual(108);
        expect(longest).toBeLessThanOrEqual(114);
        expect(Math.abs((bounds.left + bounds.right + 1) / 2 - 64)).toBeLessThanOrEqual(2);
        expect(Math.abs((bounds.top + bounds.bottom + 1) / 2 - 64)).toBeLessThanOrEqual(2);
      }
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
    });
  }
}
