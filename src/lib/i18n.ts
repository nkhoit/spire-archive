import type { Locale } from './data';

/**
 * Extract locale and lang prefix from Astro context.
 * Works with middleware rewrite (x-locale header) or direct access.
 */
export function getLocale(Astro: { locals: App.Locals; request: Request }): { locale: Locale; langPrefix: string } {
  const locale = (Astro.locals.locale !== 'en'
    ? Astro.locals.locale
    : Astro.request.headers.get('x-locale') as Locale | null) || 'en' as Locale;
  const langPrefix = locale === 'en' ? '' : '/' + locale;
  return { locale, langPrefix };
}
