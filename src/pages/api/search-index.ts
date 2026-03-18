import type { APIRoute } from 'astro';
import { getData } from '../../lib/data';

export const GET: APIRoute = async () => {
  const entries: any[] = [];

  for (const game of ['sts1', 'sts2'] as const) {
    const data = await getData(game);
    const g = game;

    for (const c of data.cards) {
      entries.push({ id: c.id, name: c.name, type: 'card', game: g, desc: (c.description ?? '').slice(0, 80), color: (c as any).color, img: `/images/${g}/cards/${c.id.toLowerCase()}.png` });
    }
    for (const r of data.relics) {
      const icon = (r as any).icon ?? `${r.id.toLowerCase()}.png`;
      entries.push({ id: r.id, name: r.name, type: 'relic', game: g, desc: (r.description ?? '').slice(0, 80), tier: (r as any).tier, img: `/images/${g}/relics/${icon}` });
    }
    for (const p of data.potions) {
      const icon = (p as any).icon ?? `${p.id.toLowerCase()}.png`;
      entries.push({ id: p.id, name: p.name, type: 'potion', game: g, desc: (p.description ?? '').slice(0, 80), img: `/images/${g}/potions/${icon}` });
    }
    for (const m of data.monsters) {
      entries.push({ id: m.id, name: m.name, type: 'monster', game: g, desc: (m as any).hp_min ? `${(m as any).hp_min}–${(m as any).hp_max} HP` : '' });
    }
    for (const e of data.events) {
      entries.push({ id: e.id, name: e.name, type: 'event', game: g, desc: (e.description ?? '').slice(0, 80) });
    }
    for (const p of data.powers) {
      entries.push({ id: p.id, name: p.name, type: 'effect', game: g, desc: (p.description ?? '').slice(0, 80), img: `/images/${g}/powers/${p.id?.toLowerCase()}.png` });
    }
    for (const k of data.keywords) {
      entries.push({ id: k.id ?? k.names[0], name: k.names[0], type: 'keyword', game: g, desc: (k.description ?? '').slice(0, 80) });
    }
  }

  return new Response(JSON.stringify(entries), {
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=3600' },
  });
};
