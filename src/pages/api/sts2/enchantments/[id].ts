import type { APIRoute } from 'astro';
import { getData, type Locale, SUPPORTED_LOCALES } from '../../../../lib/data';
import { getString, jsonResponse } from '../../_util';

export const GET: APIRoute = async ({ params, url }) => {
  const localeParam = getString(url, 'locale');
  const locale: Locale | undefined = localeParam && SUPPORTED_LOCALES.includes(localeParam as Locale) ? localeParam as Locale : undefined;
  const { enchantments } = await getData('sts2', locale);
  const enchantmentById = new Map(enchantments.map((e) => [e.id, e]));
  const enchantment = enchantmentById.get(String(params.id));
  if (!enchantment) {
    return jsonResponse({ error: 'not found' }, { status: 404 });
  }
  return jsonResponse(enchantment);
};
