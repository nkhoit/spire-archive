import type { APIRoute } from 'astro';
import { getData } from '../../../../lib/data';
import { jsonResponse } from '../../_util';

export const GET: APIRoute = async ({ params }) => {
  const id = String(params.id ?? '');
  const { relicById } = await getData();
  const relic = relicById.get(id);
  if (!relic) return jsonResponse({ error: 'not found' }, { status: 404 });
  return jsonResponse(relic);
};
