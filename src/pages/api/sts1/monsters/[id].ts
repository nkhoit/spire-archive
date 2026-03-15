import type { APIRoute } from 'astro';
import { getData } from '../../../../lib/data';
import { jsonResponse } from '../../_util';

export const GET: APIRoute = async ({ params }) => {
  const id = String(params.id ?? '');
  const { monsterById } = await getData('sts1');
  const monster = monsterById.get(id);
  if (!monster) return jsonResponse({ error: 'not found' }, { status: 404 });
  return jsonResponse(monster);
};
