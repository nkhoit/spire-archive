import type { APIRoute } from 'astro';
import { getData } from '../../../lib/data';
import { getPaging, getString, jsonResponse } from '../_util';

const ACT_ORDER: Record<string, number> = { exordium: 1, city: 2, beyond: 3, ending: 4 };

export const GET: APIRoute = async ({ url }) => {
  const { monsters } = await getData();

  const q = getString(url, 'q')?.toLowerCase() ?? null;
  const act = getString(url, 'act');
  const type = getString(url, 'type');
  const { offset, limit } = getPaging(url);

  let filtered = monsters.filter((m) => m.name);
  if (q) {
    filtered = filtered.filter((m) =>
      (m.name ?? '').toLowerCase().includes(q) ||
      (m.id ?? '').toLowerCase().includes(q)
    );
  }
  if (act) filtered = filtered.filter((m) => String(m.act) === act);
  if (type) filtered = filtered.filter((m) => String(m.type) === type);

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
