import type { APIRoute } from 'astro';
import { getData } from '../../../../lib/data';
import { jsonResponse } from '../../_util';

export const GET: APIRoute = async () => {
  const { orbs } = await getData('sts2');
  return jsonResponse({ total: orbs.length, items: orbs });
};
