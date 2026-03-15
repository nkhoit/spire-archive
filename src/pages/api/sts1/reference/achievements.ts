import type { APIRoute } from 'astro';
import { getData } from '../../../../lib/data';
import { jsonResponse } from '../../_util';

export const GET: APIRoute = async () => {
  const { achievements } = await getData();
  return jsonResponse({ total: achievements.length, items: achievements });
};
