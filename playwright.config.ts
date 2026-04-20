import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  timeout: 30_000,
  retries: process.env.CI ? 2 : 0,
  // Cloudflare fronts staging/prod and rate-limits bursts of ~140
  // parallel smoke-test requests. Cap concurrency in CI; local dev
  // runs keep the default worker count for speed.
  workers: process.env.CI ? 2 : undefined,
  use: {
    baseURL: process.env.BASE_URL ?? 'http://localhost:4323',
  },
  projects: [
    {
      name: 'chromium',
      use: { browserName: 'chromium' },
    },
  ],
});
