import type { APIRoute } from 'astro';
import { getData } from '../../../../lib/data';
import { jsonResponse } from '../../_util';

export const GET: APIRoute = async ({ params }) => {
  const id = String(params.id ?? '');
  const { potionById } = await getData('sts1');
  const potion = potionById.get(id);
  if (!potion) return jsonResponse({ error: 'not found' }, { status: 404 });
  return jsonResponse(potion);
};
