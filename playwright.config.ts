import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  timeout: 30_000,
  retries: process.env.CI ? 2 : 0,
  // CI targets rate-limited staging/prod. Run serially with the pacing
  // fixture in tests/fixtures.ts; local runs retain normal concurrency.
  workers: process.env.CI ? 1 : undefined,
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
