import { test, expect } from './fixtures';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const IMAGES = path.join(ROOT, 'public', 'images', 'sts1');
const BASE_COLORS = new Set(['ironclad', 'silent', 'defect', 'watcher', 'colorless', 'curse', 'status']);
const ENTITY_FILES = ['cards', 'relics', 'potions', 'monsters', 'events', 'powers', 'characters'];

function readList(dir: string, name: string): any[] {
  const file = path.join(dir, `${name}.json`);
  return fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : [];
}

function modProblems(dir: string, checkImages: boolean): string[] {
  const problems: string[] = [];
  const folder = path.basename(dir);
  const manifest = JSON.parse(fs.readFileSync(path.join(dir, 'mod.json'), 'utf8'));
  if (manifest.id !== folder) problems.push(`mod.json id "${manifest.id}" does not match folder`);

  const colors = new Set([...BASE_COLORS, ...manifest.colors.map((c: any) => c.id)]);
  const idPattern = new RegExp(`^${manifest.id.toUpperCase()}_[A-Z0-9_]+$`);
  const missingImage = (rel: string) => {
    if (checkImages && !fs.existsSync(path.join(IMAGES, rel))) problems.push(`missing image ${rel}`);
  };

  const ids = new Set<string>();
  for (const name of ENTITY_FILES) {
    const seen = new Set<string>();
    for (const item of readList(dir, name)) {
      if (!idPattern.test(item.id)) problems.push(`${name}: bad id ${item.id}`);
      if (seen.has(item.id)) problems.push(`${name}: duplicate id ${item.id}`);
      seen.add(item.id);
      ids.add(item.id);
      if (['cards', 'relics', 'characters'].includes(name) && item.color && !colors.has(item.color)) problems.push(`${name}/${item.id}: unknown color ${item.color}`);
    }
  }

  for (const c of readList(dir, 'cards')) missingImage(`cards/${c.id.toLowerCase()}.png`);
  for (const r of readList(dir, 'relics')) {
    if (!r.icon) problems.push(`relics/${r.id}: no icon`);
    else { missingImage(`relics/${r.icon}`); missingImage(`relics-list/${r.icon}`); }
  }
  for (const p of readList(dir, 'potions')) {
    if (!p.icon) problems.push(`potions/${p.id}: no icon`);
    else missingImage(`potions/${p.icon}`);
  }
  for (const m of readList(dir, 'monsters')) {
    if (!m.act || !Array.isArray(m.acts)) problems.push(`monsters/${m.id}: needs act and acts`);
  }
  for (const ch of readList(dir, 'characters')) {
    if (ch.color === undefined) problems.push(`characters/${ch.id}: no color`);
    missingImage(`characters/${ch.color}.jpg`);
    for (const cardId of ch.starting_deck ?? []) if (!ids.has(cardId)) problems.push(`characters/${ch.id}: unknown deck card ${cardId}`);
    if (ch.starting_relic && !ids.has(ch.starting_relic)) problems.push(`characters/${ch.id}: unknown relic ${ch.starting_relic}`);
  }
  return problems;
}

function modFolders(parent: string): string[] {
  const dir = path.join(ROOT, parent);
  return fs.readdirSync(dir, { withFileTypes: true }).filter((e) => e.isDirectory()).map((e) => path.join(dir, e.name));
}

test.describe('Mod data format', () => {
  for (const dir of modFolders('data/mods')) {
    test(`${path.basename(dir)} is valid`, () => expect(modProblems(dir, true)).toEqual([]));
  }
  for (const dir of modFolders('tests/mod-fixtures')) {
    test(`fixture ${path.basename(dir)} is valid`, () => expect(modProblems(dir, false)).toEqual([]));
  }
});

test.describe('Modded content UI', () => {
  test.beforeEach(async ({ request }) => {
    const { items } = await (await request.get('/api/sts1/mods')).json();
    test.skip(!items.some((m: any) => m.id === 'testmod'), 'server is not running with MODS_DIR=tests/mod-fixtures');
  });

  const includeBox = (page: any) => page.getByRole('checkbox', { name: 'Include Modded Content' });
  const hydrated = (page: any) => page.waitForFunction(() => !document.querySelector('astro-island[ssr]'));
  const goto = async (page: any, url: string) => { await page.goto(url); await hydrated(page); };

  test('API is base-only without the mods param', async ({ request }) => {
    const base = await (await request.get('/api/sts1/potions?q=fixture')).json();
    expect(base.total).toBe(0);
    const one = await (await request.get('/api/sts1/potions?q=fixture&mods=testmod')).json();
    expect(one.items.map((p: any) => p.id)).toEqual(['TESTMOD_POTION']);
    const both = await (await request.get('/api/sts1/potions?q=fixture&mods=testmod,othermod')).json();
    expect(both.total).toBe(2);
    const unknown = await (await request.get('/api/sts1/potions?q=fixture&mods=nope')).json();
    expect(unknown.total).toBe(0);
  });

  for (const [tab, name] of [['relics', 'Fixture Relic'], ['potions', 'Fixture Potion'], ['monsters', 'Fixture Monster'], ['events', 'Fixture Event'], ['cards', 'Fixture Strike']]) {
    test(`${tab}: off by default, opt-in shows modded rows`, async ({ page }) => {
      await goto(page, `/sts1/${tab}`);
      await expect(includeBox(page)).not.toBeChecked();
      await expect(page.getByRole('button', { name: /^Mods:/ })).toBeDisabled();
      await page.getByRole('textbox', { name: new RegExp(`Search ${tab}`, 'i') }).fill('fixture');
      await expect(page.getByText('0 results')).toBeVisible();
      await includeBox(page).check();
      await expect(page.getByText(name).first()).toBeVisible();
    });
  }

  test('picker unticks one mod, searches, and persists across tabs', async ({ page }) => {
    await goto(page, '/sts1/potions');
    await includeBox(page).check();
    await page.getByRole('textbox', { name: /Search potions/i }).fill('fixture');
    await expect(page.getByText('2 results')).toBeVisible();

    await page.getByRole('button', { name: /^Mods:/ }).click();
    await page.getByRole('searchbox', { name: 'Search Mods' }).fill('other');
    await expect(page.getByRole('checkbox', { name: 'Test Mod' })).toHaveCount(0);
    await page.getByRole('checkbox', { name: 'Other Mod' }).uncheck();
    await expect(page.getByText('1 results')).toBeVisible();

    await goto(page, '/sts1/relics');
    await expect(includeBox(page)).toBeChecked();
    await expect(page.getByRole('button', { name: 'Mods: 1 / 2' })).toBeVisible();
  });

  test('color filter gains modded colors and clears when the mod goes away', async ({ page }) => {
    await goto(page, '/sts1/relics');
    const color = page.getByRole('combobox', { name: 'All colors' });
    await expect(color.locator('option', { hasText: 'Test Hero' })).toHaveCount(0);
    await includeBox(page).check();
    await color.selectOption('testcolor');
    await expect(page.getByText('1 results')).toBeVisible();
    await includeBox(page).uncheck();
    await expect(color).toHaveValue('');
  });

  test('characters tab reveals modded characters only when included', async ({ page }) => {
    await goto(page, '/sts1/characters');
    const hero = page.getByRole('link', { name: /Test Hero/ });
    await expect(hero).toBeHidden();
    await includeBox(page).check();
    await expect(hero).toBeVisible();
    await hero.click();
    await expect(page.getByRole('heading', { name: 'Test Hero' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Fixture Strike' }).first()).toBeVisible();
  });

  test('modded detail pages load directly and base pages exclude mods', async ({ request, page }) => {
    for (const path of ['cards/TESTMOD_STRIKE', 'relics/TESTMOD_RELIC', 'potions/TESTMOD_POTION', 'monsters/TESTMOD_MONSTER', 'events/TESTMOD_EVENT']) {
      expect((await request.get(`/sts1/${path}`)).status(), path).toBe(200);
    }
    await goto(page, '/sts1/characters/IRONCLAD');
    await expect(page.getByText('Fixture Strike')).toHaveCount(0);
  });

  test('STS2 has no mod controls', async ({ page }) => {
    await goto(page, '/sts2/potions');
    await expect(page.getByRole('textbox', { name: /Search potions/i })).toBeVisible();
    await expect(includeBox(page)).toHaveCount(0);
  });
});
