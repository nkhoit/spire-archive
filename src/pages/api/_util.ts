import type { APIRoute } from 'astro';
import type { Dataset, Locale, ModFields } from '../../lib/data';
import { SUPPORTED_LOCALES, getData, getModdedData } from '../../lib/data';

export function jsonResponse(data: unknown, init?: ResponseInit): Response {
  const headers = new Headers(init?.headers);
  headers.set('Content-Type', 'application/json; charset=utf-8');
  headers.set('Cache-Control', 'public, max-age=3600');
  return new Response(JSON.stringify(data), {
    ...init,
    headers,
  });
}

export function getString(url: URL, key: string): string | null {
  const v = url.searchParams.get(key);
  return v && v.trim() ? v.trim() : null;
}

export function getNumber(url: URL, key: string): number | null {
  const v = url.searchParams.get(key);
  if (v === null || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

export function getPaging(url: URL) {
  const offset = Math.max(0, getNumber(url, 'offset') ?? 0);
  const limitRaw = getNumber(url, 'limit');
  const limit = Math.min(400, Math.max(1, limitRaw ?? 50));
  return { offset, limit };
}

export function getGame(params: Record<string, string | undefined>): 'sts1' | 'sts2' | null {
  const game = params.game;
  return game === 'sts1' || game === 'sts2' ? game : null;
}

export function getLocale(url: URL): Locale {
  const localeParam = getString(url, 'lang');
  return localeParam && SUPPORTED_LOCALES.includes(localeParam as Locale)
    ? localeParam as Locale
    : 'en';
}

/** Base data plus the mods named in ?mods=a,b. With no param this is exactly getData(). */
export async function getCatalog(game: 'sts1' | 'sts2', locale: Locale, url: URL): Promise<Dataset> {
  const selected = new Set(getString(url, 'mods')?.split(',') ?? []);
  if (game !== 'sts1' || selected.size === 0) return getData(game, locale);
  const data = await getModdedData(game, locale);
  const keep = <T extends ModFields>(items: T[]) => items.filter((item) => !item.mod || selected.has(item.mod.id));
  return { ...data, cards: keep(data.cards), relics: keep(data.relics), potions: keep(data.potions), monsters: keep(data.monsters), events: keep(data.events) };
}

export function notFoundResponse(): Response {
  return jsonResponse({ error: 'not found' }, { status: 404 });
}

export const notFound: APIRoute = async () => {
  return notFoundResponse();
};
