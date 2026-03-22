import type { APIRoute } from 'astro';
import type { Locale } from '../../lib/data';
import { SUPPORTED_LOCALES } from '../../lib/data';

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

export function notFoundResponse(): Response {
  return jsonResponse({ error: 'not found' }, { status: 404 });
}

export const notFound: APIRoute = async () => {
  return notFoundResponse();
};
