import type { APIRoute } from 'astro';
import { getData, type Locale, SUPPORTED_LOCALES } from '../../../lib/data';
import { getPaging, getString, jsonResponse } from '../_util';

const ACT_ORDER: Record<string, number> = { exordium: 1, city: 2, beyond: 3, shrines: 4 };

export const GET: APIRoute = async ({ url }) => {
  const lang = (getString(url, 'lang') || 'en') as Locale;
  const locale = SUPPORTED_LOCALES.includes(lang) ? lang : 'en' as Locale;
  const { events } = await getData('sts1', locale);

  const q = getString(url, 'q')?.toLowerCase() ?? null;
  const act = getString(url, 'act');
  const { offset, limit } = getPaging(url);

  let filtered = events;
  if (q) {
    filtered = filtered.filter((e) =>
      (e.name ?? '').toLowerCase().includes(q) ||
      (e.description ?? '').toLowerCase().includes(q) ||
      (e.id ?? '').toLowerCase().includes(q)
    );
  }
  if (act) filtered = filtered.filter((e) => String(e.act) === act);

  filtered = [...filtered].sort((a, b) => {
    const ao = ACT_ORDER[a.act] ?? 99;
    const bo = ACT_ORDER[b.act] ?? 99;
    if (ao !== bo) return ao - bo;
    return (a.name ?? '').localeCompare(b.name ?? '');
  });

  const total = filtered.length;
  const items = filtered.slice(offset, offset + limit);
  return jsonResponse({ total, offset, limit, items });
};
