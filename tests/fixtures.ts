import { test as base, expect } from '@playwright/test';
import { setTimeout } from 'node:timers/promises';

// Exercise staging/production at a steady pace instead of bursting through
// Cloudflare's rate limit. Keep all assertions and server protections intact.
export const test = base.extend<{ requestPacing: void }>({
  requestPacing: [async ({}, use) => {
    if (process.env.CI) await setTimeout(1000);
    await use();
  }, { auto: true }],
});

export { expect };
