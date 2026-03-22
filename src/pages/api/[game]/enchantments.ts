import type { APIRoute } from 'astro';
import { getData } from '../../../lib/data';
import { getGame, getLocale, getPaging, getString, jsonResponse, notFoundResponse } from '../_util';

export const GET: APIRoute = async ({ params, url }) => {
  const game = getGame(params);
  if (!game) return notFoundResponse();

  const locale = getLocale(url);
  const { enchantments } = await getData(game, locale);

  const q = getString(url, 'q')?.toLowerCase() ?? null;
  const rarity = getString(url, 'rarity');
  const { offset, limit } = getPaging(url);

  let filtered = enchantments;
  if (q) {
    filtered = filtered.filter((e) =>
      (e.name ?? '').toLowerCase().includes(q) ||
      (e.description ?? '').toLowerCase().includes(q) ||
      (e.id ?? '').toLowerCase().includes(q)
    );
  }
  if (rarity) filtered = filtered.filter((e) => String(e.rarity) === rarity);

  const total = filtered.length;
  const items = filtered.slice(offset, offset + limit);
  return jsonResponse({ total, offset, limit, items });
};
