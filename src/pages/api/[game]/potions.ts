import type { APIRoute } from 'astro';
import { getData } from '../../../lib/data';
import { getGame, getLocale, getPaging, getString, jsonResponse, notFoundResponse } from '../_util';

export const GET: APIRoute = async ({ params, url }) => {
  const game = getGame(params);
  if (!game) return notFoundResponse();

  const locale = getLocale(url);
  const { potions } = await getData(game, locale);

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
