import type { APIRoute } from 'astro';
import { getMods } from '../../../lib/data';
import { getGame, jsonResponse, notFoundResponse } from '../_util';

export const GET: APIRoute = async ({ params }) => {
  const game = getGame(params);
  if (!game) return notFoundResponse();
  return jsonResponse({ items: await getMods(game) });
};
