import { useEffect, useMemo, useState } from 'react';
import CssCardRenderer from './CssCardRenderer';

type Card = {
  id: string;
  name: string;
  description: string;
  cost: number | null;
  type: string;
  rarity: string;
  color: string;
  vars?: Record<string, number>;
  keywords?: string[];
  tags?: string[];
  upgrade?: Record<string, any> | null;
  image_url?: string | null;
  star_cost?: number | null;
};

type ApiResp<T> = { total: number; offset: number; limit: number; items: T[] };

const colorClasses: Record<string, string> = {
  ironclad: 'bg-red-500/15 text-red-200 ring-red-500/30',
  silent: 'bg-green-500/15 text-green-200 ring-green-500/30',
  defect: 'bg-blue-500/15 text-blue-200 ring-blue-500/30',
  watcher: 'bg-purple-500/15 text-purple-200 ring-purple-500/30',
  necrobinder: 'bg-purple-500/15 text-purple-200 ring-purple-500/30',
  regent: 'bg-amber-500/15 text-amber-200 ring-amber-500/30',
  colorless: 'bg-zinc-400/15 text-zinc-100 ring-zinc-400/30',
  curse: 'bg-zinc-800/60 text-zinc-200 ring-zinc-700/40',
  status: 'bg-slate-500/15 text-slate-200 ring-slate-500/30',
};

// STS1 energy rendering helper (used in description previews if needed)
const sts1EnergyMap: Record<string, string> = {
  '[R]': '/images/sts1/cardui/card_red_orb.png',
  '[G]': '/images/sts1/cardui/card_green_orb.png',
  '[B]': '/images/sts1/cardui/card_blue_orb.png',
  '[W]': '/images/sts1/cardui/card_purple_orb.png',
};

export function renderEnergy(text: string): string {
  let html = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  for (const [token, imgPath] of Object.entries(sts1EnergyMap)) {
    const escaped = token.replace('[', '\\[').replace(']', '\\]');
    html = html.replace(new RegExp(escaped, 'g'),
      `<img src="${imgPath}" alt="${token}" style="display:inline-block;height:1.1em;width:1.1em;vertical-align:text-bottom" />`);
  }
  return html.replace(/\n/g, ' ');
}

function cap(s: string) { return s.charAt(0).toUpperCase() + s.slice(1); }

function BadgeSpan({ label, tone }: { label: string; tone?: string }) {
  const cls = tone && colorClasses[tone] ? colorClasses[tone] : 'bg-white/10 text-slate-200 ring-white/10';
  return <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs ring-1 ${cls}`}>{cap(label)}</span>;
}

function CardTile({ c, game, isMobile }: { c: Card; game: string; isMobile: boolean }) {
  const [upgraded, setUpgraded] = useState(false);
  const hasUpgrade = c.upgrade && Object.keys(c.upgrade).length > 0;

  return (
    <div className="group flex flex-col items-center rounded-lg border border-white/10 bg-white/5 p-3 hover:bg-white/10 transition-colors">
      <div className="flex items-center w-full gap-1">
        <a
          href={`/${game}/cards/${c.id}`}
          className={`text-sm font-semibold group-hover:underline truncate flex-1 text-center ${upgraded ? 'text-emerald-400' : ''}`}
        >
          {upgraded ? `${c.name}+` : c.name}
        </a>
        {hasUpgrade && (
          <button
            onClick={(e) => { e.preventDefault(); setUpgraded(!upgraded); }}
            className={`shrink-0 w-5 h-5 rounded-full text-[10px] font-bold flex items-center justify-center transition-colors ${upgraded ? 'bg-emerald-500/20 text-emerald-300 ring-1 ring-emerald-500/30' : 'bg-white/10 text-slate-500 hover:text-slate-300'}`}
            title={upgraded ? 'Show base' : 'Show upgraded'}
          >↑</button>
        )}
      </div>
      <a href={`/${game}/cards/${c.id}`} className="w-full mt-2 flex justify-center overflow-hidden">
        <CssCardRenderer card={c} upgraded={upgraded} size={isMobile ? 'xs' : 'sm'} game={game as 'sts1' | 'sts2'} />
      </a>
      <div className="mt-2 flex flex-wrap items-center justify-center gap-1">
        <BadgeSpan label={c.color} tone={c.color} />
        <BadgeSpan label={c.type} />
        <BadgeSpan label={c.rarity} />
        <BadgeSpan label={`Cost ${c.cost ?? 'X'}`} />
      </div>
    </div>
  );
}

function buildUrl(base: string, params: Record<string, string | number | null>) {
  const u = new URL(base, window.location.origin);
  for (const [k, v] of Object.entries(params)) {
    if (v === null || v === '') continue;
    u.searchParams.set(k, String(v));
  }
  return u.toString();
}

export default function CardsExplorer(props: {
  game?: 'sts1' | 'sts2';
  initial?: ApiResp<Card>;
  colors: string[];
  types: string[];
  rarities: string[];
}) {
  const game = props.game ?? 'sts1';
  const [q, setQ] = useState('');
  const [color, setColor] = useState('');
  const [type, setType] = useState('');
  const [rarity, setRarity] = useState('');
  const [cost, setCost] = useState<string>('');
  const [offset, setOffset] = useState(0);
  const [limit] = useState(100);

  const [data, setData] = useState<ApiResp<Card> | null>(props.initial ?? null);
  const [loading, setLoading] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 640);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);
  const [error, setError] = useState<string | null>(null);

  const queryKey = useMemo(
    () => JSON.stringify({ q, color, type, rarity, cost, offset, limit }),
    [q, color, type, rarity, cost, offset, limit]
  );

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError(null);
    fetch(
      buildUrl(`/api/${game}/cards`, {
        q: q || null,
        color: color || null,
        type: type || null,
        rarity: rarity || null,
        cost: cost ? Number(cost) : null,
        offset,
        limit,
      })
    )
      .then((r) => r.json())
      .then((json) => { if (alive) setData(json); })
      .catch((e) => { if (alive) setError(String(e)); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queryKey]);

  const total = data?.total ?? 0;
  const canPrev = offset > 0;
  const canNext = offset + limit < total;

  return (
    <div className="mt-4">
      <div className="grid grid-cols-1 gap-2 md:grid-cols-5">
        <input
          className="rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm"
          placeholder="Search cards…"
          value={q}
          onChange={(e) => { setOffset(0); setQ(e.target.value); }}
        />
        <select
          className="rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm"
          value={color}
          onChange={(e) => { setOffset(0); setColor(e.target.value); }}
        >
          <option value="">All colors</option>
          {props.colors.map((c) => (
            <option key={c} value={c}>{cap(c)}</option>
          ))}
        </select>
        <select
          className="rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm"
          value={type}
          onChange={(e) => { setOffset(0); setType(e.target.value); }}
        >
          <option value="">All types</option>
          {props.types.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
        <select
          className="rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm"
          value={rarity}
          onChange={(e) => { setOffset(0); setRarity(e.target.value); }}
        >
          <option value="">All rarities</option>
          {props.rarities.map((r) => (
            <option key={r} value={r}>{r}</option>
          ))}
        </select>
        <input
          className="rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm"
          placeholder="Cost (exact)"
          value={cost}
          onChange={(e) => { setOffset(0); setCost(e.target.value.replace(/[^0-9\-]/g, '')); }}
        />
      </div>

      <div className="mt-3 flex items-center justify-between text-xs text-slate-300">
        <div>
          {loading ? 'Loading…' : `${total} results`}{' '}
          {error ? <span className="text-red-300">({error})</span> : null}
        </div>
        <div className="flex gap-2">
          <button
            className="rounded-md border border-white/10 bg-white/5 px-2 py-1 disabled:opacity-40"
            disabled={!canPrev}
            onClick={() => setOffset((o) => Math.max(0, o - limit))}
          >Prev</button>
          <button
            className="rounded-md border border-white/10 bg-white/5 px-2 py-1 disabled:opacity-40"
            disabled={!canNext}
            onClick={() => setOffset((o) => o + limit)}
          >Next</button>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-5">
        {(data?.items ?? []).map((c) => (
          <CardTile key={c.id} c={c} game={game} isMobile={isMobile} />
        ))}
      </div>
    </div>
  );
}
