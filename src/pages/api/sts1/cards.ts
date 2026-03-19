import type { APIRoute } from 'astro';
import { getData, type Locale, SUPPORTED_LOCALES } from '../../../lib/data';
import { getNumber, getPaging, getString, jsonResponse } from '../_util';

export const GET: APIRoute = async ({ url }) => {
  const lang = (getString(url, 'lang') || 'en') as Locale;
  const locale = SUPPORTED_LOCALES.includes(lang) ? lang : 'en' as Locale;
  const { cards } = await getData('sts1', locale);

  const q = getString(url, 'q')?.toLowerCase() ?? null;
  const color = getString(url, 'color');
  const type = getString(url, 'type');
  const rarity = getString(url, 'rarity');
  const cost = getNumber(url, 'cost');
  const { offset, limit } = getPaging(url);

  let filtered = cards;
  if (q) {
    filtered = filtered.filter((c) =>
      (c.name ?? '').toLowerCase().includes(q) ||
      (c.description ?? '').toLowerCase().includes(q) ||
      (c.id ?? '').toLowerCase().includes(q)
    );
  }
  if (color) filtered = filtered.filter((c) => String(c.color) === color);
  if (type) filtered = filtered.filter((c) => String(c.type) === type);
  if (rarity) filtered = filtered.filter((c) => String(c.rarity) === rarity);
  if (cost !== null) filtered = filtered.filter((c) => (c.cost ?? null) === cost);

  const total = filtered.length;
  const items = filtered.slice(offset, offset + limit);
  return jsonResponse({ total, offset, limit, items });
};
