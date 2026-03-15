import type { APIRoute } from 'astro';

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
  const limit = Math.min(200, Math.max(1, limitRaw ?? 50));
  return { offset, limit };
}

export const notFound: APIRoute = async () => {
  return jsonResponse({ error: 'not found' }, { status: 404 });
};
