import type { APIRoute } from 'astro';
import { SUPPORTED_LOCALES } from '../lib/data';

const SITE = 'https://spire-archive.com';

// Load all entity IDs at startup
import cards from '../../data/sts2/cards.json';
import relics from '../../data/sts2/relics.json';
import potions from '../../data/sts2/potions.json';
import monsters from '../../data/sts2/monsters.json';
import events from '../../data/sts2/events.json';
import enchantments from '../../data/sts2/enchantments.json';
import characters from '../../data/sts2/characters.json';
import powers from '../../data/sts2/powers.json';

const locales = ['en', ...SUPPORTED_LOCALES.filter(l => l !== 'en')];

function url(path: string): string {
  return `${SITE}${path}`;
}

function hreflangs(path: string): string {
  return locales.map(l => {
    const href = l === 'en' ? url(path) : url(`/${l}${path}`);
    return `    <xhtml:link rel="alternate" hreflang="${l}" href="${href}" />`;
  }).join('\n');
}

function entry(path: string, priority: string = '0.5', changefreq: string = 'weekly'): string {
  return `  <url>
    <loc>${url(path)}</loc>
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
${hreflangs(path)}
  </url>`;
}

export const GET: APIRoute = async () => {
  const urls: string[] = [];

  // Homepage & STS2 index
  urls.push(entry('/', '1.0', 'weekly'));
  urls.push(entry('/sts2', '1.0', 'weekly'));

  // Characters
  for (const ch of characters as any[]) {
    urls.push(entry(`/sts2/characters/${ch.id}`, '0.8', 'monthly'));
  }

  // Section index pages
  const sections = ['cards', 'relics', 'potions', 'monsters', 'events', 'effects', 'enchantments', 'keywords'];
  for (const s of sections) {
    urls.push(entry(`/sts2/${s}`, '0.8', 'weekly'));
  }

  // Changelog (English only, no hreflangs needed but keeping for consistency)
  urls.push(entry('/sts2/changelog', '0.6', 'weekly'));

  // Individual entity pages
  const entitySections: [any[], string][] = [
    [cards as any[], 'cards'],
    [relics as any[], 'relics'],
    [potions as any[], 'potions'],
    [monsters as any[], 'monsters'],
    [events as any[], 'events'],
    [enchantments as any[], 'enchantments'],
  ];

  for (const [items, section] of entitySections) {
    for (const item of items) {
      urls.push(entry(`/sts2/${section}/${item.id}`, '0.5', 'monthly'));
    }
  }

  // Effect (power) detail pages
  for (const p of powers as any[]) {
    urls.push(entry(`/sts2/effects/${p.id}`, '0.5', 'monthly'));
  }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml">
${urls.join('\n')}
</urlset>`;

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml',
      'Cache-Control': 'public, max-age=86400',
    },
  });
};
