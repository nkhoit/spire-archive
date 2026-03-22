import type { APIRoute } from 'astro';
import { getData, type Locale, SUPPORTED_LOCALES } from '../../../lib/data';
import { getPaging, getString, jsonResponse } from '../_util';

export const GET: APIRoute = async ({ url }) => {
  const localeParam = getString(url, 'lang');
  const locale: Locale | undefined = localeParam && SUPPORTED_LOCALES.includes(localeParam as Locale) ? localeParam as Locale : undefined;
  const { potions } = await getData('sts2', locale);

  const q = getString(url, 'q')?.toLowerCase() ?? null;
  const rarity = getString(url, 'rarity');
  const { offset, limit } = getPaging(url);

  let filtered = potions;
  if (q) {
    filtered = filtered.filter((p) =>
      (p.name ?? '').toLowerCase().includes(q) ||
      (p.description ?? '').toLowerCase().includes(q) ||
      (p.id ?? '').toLowerCase().includes(q)
    );
  }
  if (rarity) filtered = filtered.filter((p) => String(p.rarity) === rarity);

  const total = filtered.length;
  const items = filtered.slice(offset, offset + limit);
  return jsonResponse({ total, offset, limit, items });
};
