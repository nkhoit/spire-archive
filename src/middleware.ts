import { defineMiddleware } from 'astro:middleware';
import { SUPPORTED_LOCALES, type Locale } from './lib/data';

const localeSet = new Set<string>(SUPPORTED_LOCALES);

export const onRequest = defineMiddleware(async (context, next) => {
  const url = new URL(context.request.url);
  const path = url.pathname;

  // --- Locale detection from path prefix ---
  // Match /ja/... /ko/... etc. but not /en/ (English uses no prefix)
  const segments = path.split('/').filter(Boolean);
  const firstSegment = segments[0]?.toLowerCase();

  if (firstSegment && firstSegment !== 'en' && localeSet.has(firstSegment)) {
    // Set locale in locals for page access
    context.locals.locale = firstSegment as Locale;
    context.locals.langPrefix = '/' + firstSegment;

    // Rewrite the URL to strip the locale prefix, passing locale via header
    const newPath = '/' + segments.slice(1).join('/') + (path.endsWith('/') && segments.length > 1 ? '/' : '');

    const start = Date.now();
    const response = await context.rewrite(new Request(new URL(newPath + url.search, url.origin), {
      headers: { ...Object.fromEntries(context.request.headers.entries()), 'x-locale': firstSegment },
    }));
    logRequest(context, response, path, Date.now() - start, url.search);
    return response;
  }

  // Default: English
  context.locals.locale = 'en' as Locale;
  context.locals.langPrefix = '';

  // --- Request logging ---
  const start = Date.now();
  const response = await next();
  logRequest(context, response, path, Date.now() - start, url.search);
  return response;
});

function logRequest(context: any, response: Response, path: string, duration: number, search: string) {
  // Skip static assets and internal routes
  if (path.match(/\.(js|css|png|jpg|jpeg|gif|svg|ico|woff2?|ttf|webp|avif)$/) || path.startsWith('/_')) {
    return;
  }

  const ip = context.request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || context.request.headers.get('x-real-ip')
    || 'unknown';
  const ua = context.request.headers.get('user-agent') || '';
  const referer = context.request.headers.get('referer') || '';
  const query = search || undefined;
  const size = response.headers.get('content-length') || undefined;
  const method = context.request.method;

  console.log(JSON.stringify({
    t: new Date().toISOString(),
    m: method,
    path,
    ...(query && { q: query }),
    status: response.status,
    ms: duration,
    ...(size && { sz: Number(size) }),
    ip,
    ua,
    ref: referer,
  }));
}
