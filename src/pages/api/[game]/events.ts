import type { APIRoute } from 'astro';
import { getData } from '../../../lib/data';
import { getGame, getLocale, getPaging, getString, jsonResponse, notFoundResponse } from '../_util';

const ACT_ORDER_BY_GAME: Record<'sts1' | 'sts2', Record<string, number>> = {
  sts1: { exordium: 1, city: 2, beyond: 3, shrines: 4 },
  sts2: { exordium: 1, city: 2, beyond: 3, shrines: 4 },
};

export const GET: APIRoute = async ({ params, url }) => {
  const game = getGame(params);
  if (!game) return notFoundResponse();

  const locale = getLocale(url);
  const { events } = await getData(game, locale);

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

  const actOrder = ACT_ORDER_BY_GAME[game];
  filtered = [...filtered].sort((a, b) => {
    const ao = actOrder[a.act] ?? 99;
    const bo = actOrder[b.act] ?? 99;
    if (ao !== bo) return ao - bo;
    return (a.name ?? '').localeCompare(b.name ?? '');
  });

  const total = filtered.length;
  const items = filtered.slice(offset, offset + limit);
  return jsonResponse({ total, offset, limit, items });
};
