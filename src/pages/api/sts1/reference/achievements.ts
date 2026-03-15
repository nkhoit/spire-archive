import type { APIRoute } from 'astro';
import { getData } from '../../../../lib/data';
import { jsonResponse } from '../../_util';

export const GET: APIRoute = async () => {
  const { achievements } = await getData('sts1');
  return jsonResponse({ total: achievements.length, items: achievements });
};
