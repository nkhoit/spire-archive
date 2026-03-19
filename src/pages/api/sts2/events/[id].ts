import type { APIRoute } from 'astro';
import { getData, type Locale, SUPPORTED_LOCALES } from '../../../../lib/data';
import { getString, jsonResponse } from '../../_util';

export const GET: APIRoute = async ({ params, url }) => {
  const localeParam = getString(url, 'locale');
  const locale: Locale | undefined = localeParam && SUPPORTED_LOCALES.includes(localeParam as Locale) ? localeParam as Locale : undefined;
  const id = String(params.id ?? '');
  const { eventById } = await getData('sts2', locale);
  const event = eventById.get(id);
  if (!event) return jsonResponse({ error: 'not found' }, { status: 404 });
  return jsonResponse(event);
};
