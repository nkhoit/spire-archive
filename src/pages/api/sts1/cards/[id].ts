import type { APIRoute } from 'astro';
import { getData, type Locale, SUPPORTED_LOCALES } from '../../../../lib/data';
import { getString, jsonResponse } from '../../_util';

export const GET: APIRoute = async ({ params, url }) => {
  const id = String(params.id ?? '');
  const lang = (url.searchParams.get('lang') || 'en') as Locale;
  const locale = SUPPORTED_LOCALES.includes(lang) ? lang : 'en' as Locale;
  const { cardById } = await getData('sts1', locale);
  const card = cardById.get(id);
  if (!card) return jsonResponse({ error: 'not found' }, { status: 404 });
  return jsonResponse(card);
};
