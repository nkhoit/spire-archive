import type { APIRoute } from 'astro';
import { SUPPORTED_LOCALES } from '../lib/data';

const SITE = 'https://spire-archive.com';

// STS1 data
import sts1Cards from '../../data/sts1/cards.json';
import sts1Relics from '../../data/sts1/relics.json';
import sts1Potions from '../../data/sts1/potions.json';
import sts1Monsters from '../../data/sts1/monsters.json';
import sts1Events from '../../data/sts1/events.json';
import sts1Characters from '../../data/sts1/characters.json';
import sts1Powers from '../../data/sts1/powers.json';

// STS2 data
import sts2Cards from '../../data/sts2/cards.json';
import sts2Relics from '../../data/sts2/relics.json';
import sts2Potions from '../../data/sts2/potions.json';
import sts2Monsters from '../../data/sts2/monsters.json';
import sts2Events from '../../data/sts2/events.json';
import sts2Enchantments from '../../data/sts2/enchantments.json';
import sts2Characters from '../../data/sts2/characters.json';
import sts2Powers from '../../data/sts2/powers.json';

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

function addGameUrls(game: string, data: {
  characters: any[]; cards: any[]; relics: any[]; potions: any[];
  monsters: any[]; events: any[]; powers: any[]; enchantments?: any[];
}, urls: string[]) {
  // Game index
  urls.push(entry(`/${game}`, '1.0', 'weekly'));

  // Characters
  for (const ch of data.characters) {
    urls.push(entry(`/${game}/characters/${ch.id}`, '0.8', 'monthly'));
  }

  // Section index pages
  const sections = ['cards', 'relics', 'potions', 'monsters', 'events', 'effects', 'keywords'];
  if (data.enchantments) sections.push('enchantments');
  for (const s of sections) {
    urls.push(entry(`/${game}/${s}`, '0.8', 'weekly'));
  }

  // Individual entity pages
  const entitySections: [any[], string][] = [
    [data.cards, 'cards'],
    [data.relics, 'relics'],
    [data.potions, 'potions'],
    [data.monsters, 'monsters'],
    [data.events, 'events'],
  ];
  if (data.enchantments) entitySections.push([data.enchantments, 'enchantments']);

  for (const [items, section] of entitySections) {
    for (const item of items) {
      urls.push(entry(`/${game}/${section}/${item.id}`, '0.5', 'monthly'));
    }
  }

  // Effect (power) detail pages
  for (const p of data.powers) {
    urls.push(entry(`/${game}/effects/${p.id}`, '0.5', 'monthly'));
  }
}

export const GET: APIRoute = async () => {
  const urls: string[] = [];

  // Homepage
  urls.push(entry('/', '1.0', 'weekly'));

  // STS1
  addGameUrls('sts1', {
    characters: sts1Characters as any[],
    cards: sts1Cards as any[],
    relics: sts1Relics as any[],
    potions: sts1Potions as any[],
    monsters: sts1Monsters as any[],
    events: sts1Events as any[],
    powers: sts1Powers as any[],
  }, urls);

  // STS2
  addGameUrls('sts2', {
    characters: sts2Characters as any[],
    cards: sts2Cards as any[],
    relics: sts2Relics as any[],
    potions: sts2Potions as any[],
    monsters: sts2Monsters as any[],
    events: sts2Events as any[],
    powers: sts2Powers as any[],
    enchantments: sts2Enchantments as any[],
  }, urls);

  // STS2 changelog
  urls.push(entry('/sts2/changelog', '0.6', 'weekly'));

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
