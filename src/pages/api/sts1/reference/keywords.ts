import type { APIRoute } from 'astro';
import { getData } from '../../../../lib/data';
import { jsonResponse } from '../../_util';

export const GET: APIRoute = async () => {
  const { keywords } = await getData();
  return jsonResponse({ total: keywords.length, items: keywords });
};
