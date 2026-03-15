import type { APIRoute } from 'astro';
import { getData } from '../../../lib/data';
import { getPaging, getString, jsonResponse } from '../_util';

export const GET: APIRoute = async ({ url }) => {
  const { powers } = await getData('sts1');

  const q = getString(url, 'q')?.toLowerCase() ?? null;
  const type = getString(url, 'type');
  const { offset, limit } = getPaging(url);

  let filtered = powers;
  if (q) {
    filtered = filtered.filter((p) =>
      (p.name ?? '').toLowerCase().includes(q) ||
      (p.description ?? '').toLowerCase().includes(q) ||
      (p.id ?? '').toLowerCase().includes(q)
    );
  }
  if (type) filtered = filtered.filter((p) => String(p.type) === type);

  filtered.sort((a, b) => (a.name ?? '').localeCompare(b.name ?? ''));

  const total = filtered.length;
  const items = filtered.slice(offset, offset + limit);
  return jsonResponse({ total, offset, limit, items });
};
