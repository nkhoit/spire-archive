import type { APIRoute } from 'astro';
import { getData } from '../../../../lib/data';
import { jsonResponse } from '../../_util';

export const GET: APIRoute = async ({ params }) => {
  const id = String(params.id ?? '');
  const { eventById } = await getData();
  const event = eventById.get(id);
  if (!event) return jsonResponse({ error: 'not found' }, { status: 404 });
  return jsonResponse(event);
};
