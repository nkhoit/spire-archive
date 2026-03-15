import type { APIRoute } from 'astro';
import { getData } from '../../../lib/data';
import { getPaging, getString, jsonResponse } from '../_util';

export const GET: APIRoute = async ({ url }) => {
  const { relics } = await getData();

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
