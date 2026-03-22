import type { APIRoute } from 'astro';
import { getData } from '../../../lib/data';
import { getGame, getLocale, getNumber, getPaging, getString, jsonResponse, notFoundResponse } from '../_util';

export const GET: APIRoute = async ({ params, url }) => {
  const game = getGame(params);
  if (!game) return notFoundResponse();

  const locale = getLocale(url);
  const { cards } = await getData(game, locale);

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
