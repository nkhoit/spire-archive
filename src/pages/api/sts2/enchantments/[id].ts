import type { APIRoute } from 'astro';
import { getData } from '../../../../lib/data';
import { jsonResponse } from '../../_util';

export const GET: APIRoute = async ({ params }) => {
  const { enchantments } = await getData('sts2');
  const enchantmentById = new Map(enchantments.map((e) => [e.id, e]));
  const enchantment = enchantmentById.get(String(params.id));
  if (!enchantment) {
    return jsonResponse({ error: 'not found' }, { status: 404 });
  }
  return jsonResponse(enchantment);
};
