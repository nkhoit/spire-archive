import type { APIRoute } from 'astro';
import { getData } from '../../../../lib/data';
import { jsonResponse } from '../../_util';

export const GET: APIRoute = async ({ params }) => {
  const id = String(params.id ?? '');
  const { cardById } = await getData('sts1');
  const card = cardById.get(id);
  if (!card) return jsonResponse({ error: 'not found' }, { status: 404 });
  return jsonResponse(card);
};
