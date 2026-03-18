import { defineMiddleware } from 'astro:middleware';

export const onRequest = defineMiddleware(async (context, next) => {
  const start = Date.now();
  const response = await next();
  const duration = Date.now() - start;

  const url = new URL(context.request.url);
  const path = url.pathname;

  // Skip static assets and internal routes
  if (path.match(/\.(js|css|png|jpg|jpeg|gif|svg|ico|woff2?|ttf|webp|avif)$/) || path.startsWith('/_')) {
    return response;
  }

  const ip = context.request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || context.request.headers.get('x-real-ip')
    || 'unknown';
  const ua = context.request.headers.get('user-agent') || '';
  const referer = context.request.headers.get('referer') || '';

  console.log(JSON.stringify({
    t: new Date().toISOString(),
    path,
    status: response.status,
    ms: duration,
    ip,
    ua,
    ref: referer,
  }));

  return response;
});
