import type { APIRoute } from 'astro';
import { getData, type Locale, SUPPORTED_LOCALES } from '../../../lib/data';
import { getNumber, getString, jsonResponse } from '../_util';

function haystack(...parts: Array<string | null | undefined>) {
  return parts.filter(Boolean).join(' ').toLowerCase();
}

export const GET: APIRoute = async ({ url }) => {
  const localeParam = getString(url, 'locale');
  const locale: Locale | undefined = localeParam && SUPPORTED_LOCALES.includes(localeParam as Locale) ? localeParam as Locale : undefined;
  const q = getString(url, 'q')?.toLowerCase() ?? '';
  const limit = Math.min(200, Math.max(1, getNumber(url, 'limit') ?? 20));
  if (!q) return jsonResponse({ total: 0, items: [] });

  const data = await getData('sts2', locale);
  const results: Array<{ type: string; id: string; name: string; snippet?: string }> = [];

  const pushMatches = (type: string, items: Array<{ id: string; name?: string; names?: string[] }>, getText: (it: any) => string) => {
    for (const it of items) {
      const text = getText(it);
      if (text.includes(q)) {
        results.push({ type, id: it.id, name: it.name ?? (it.names?.[0] ?? it.id) });
      }
    }
  };

  pushMatches('card', data.cards, (c) => haystack(c.id, c.name, c.description, c.type, c.rarity, c.color));
  pushMatches('relic', data.relics, (r) => haystack(r.id, r.name, r.description, r.tier, r.color));
  pushMatches('potion', data.potions, (p) => haystack(p.id, p.name, p.description, p.rarity));
  pushMatches('monster', data.monsters, (m) => haystack(m.id, m.name, m.type, m.act));
  pushMatches('event', data.events, (e) => haystack(e.id, e.name, e.description, e.act));
  pushMatches('power', data.powers, (p) => haystack(p.id, p.name, p.description, p.type));
  pushMatches('keyword', data.keywords, (k) => haystack(k.id, ...(k.names ?? []), k.description));
  pushMatches('orb', data.orbs, (o) => haystack(o.id, o.name, o.description));
  pushMatches('stance', data.stances, (s) => haystack(s.id, s.name, s.description));
  pushMatches('blight', data.blights, (b) => haystack(b.id, b.name, b.description));
  pushMatches('character', data.characters, (c) => haystack(c.id, c.name, c.description));
  pushMatches('achievement', data.achievements, (a) => haystack(a.id, a.name, a.description));

  return jsonResponse({ total: results.length, items: results.slice(0, limit) });
};
