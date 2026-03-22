import type { APIRoute } from 'astro';
import { getData } from '../../../../lib/data';
import { getGame, jsonResponse, notFoundResponse } from '../../_util';

export const GET: APIRoute = async ({ params }) => {
  const game = getGame(params);
  if (!game) return notFoundResponse();

  const { achievements } = await getData(game);
  return jsonResponse({ total: achievements.length, items: achievements });
};
