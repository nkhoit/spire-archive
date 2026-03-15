import type { APIRoute } from 'astro';
import { getData } from '../../../../lib/data';
import { jsonResponse } from '../../_util';

export const GET: APIRoute = async () => {
  const { blights } = await getData('sts2');
  return jsonResponse({ total: blights.length, items: blights });
};
