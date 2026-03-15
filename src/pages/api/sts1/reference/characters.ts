import type { APIRoute } from 'astro';
import { getData } from '../../../../lib/data';
import { jsonResponse } from '../../_util';

export const GET: APIRoute = async () => {
  const { characters } = await getData();
  return jsonResponse({ total: characters.length, items: characters });
};
