import type { APIRoute } from 'astro';
import { getData, type Locale, SUPPORTED_LOCALES } from '../../../lib/data';
import { getPaging, getString, jsonResponse } from '../_util';

export const GET: APIRoute = async ({ url }) => {
  const localeParam = getString(url, 'lang');
  const locale: Locale | undefined = localeParam && SUPPORTED_LOCALES.includes(localeParam as Locale) ? localeParam as Locale : undefined;
  const { relics } = await getData('sts2', locale);

  const q = getString(url, 'q')?.toLowerCase() ?? null;
  const tier = getString(url, 'tier');
  const color = getString(url, 'color');
  const { offset, limit } = getPaging(url);

  let filtered = relics;
  if (q) {
    filtered = filtered.filter((r) =>
      (r.name ?? '').toLowerCase().includes(q) ||
      (r.description ?? '').toLowerCase().includes(q) ||
      (r.id ?? '').toLowerCase().includes(q)
    );
  }
  if (tier) filtered = filtered.filter((r) => String(r.tier) === tier);
  if (color) filtered = filtered.filter((r) => String(r.color ?? '') === color);

  const total = filtered.length;
  const items = filtered.slice(offset, offset + limit);
  return jsonResponse({ total, offset, limit, items });
};
