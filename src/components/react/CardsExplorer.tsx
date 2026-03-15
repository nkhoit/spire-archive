import { useEffect, useMemo, useState } from 'react';

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
  upgrade?: {
    cost?: number | null;
    description?: string;
  } | null;
};

type ApiResp<T> = { total: number; offset: number; limit: number; items: T[] };

const energyMap: Record<string, string> = {
  '[R]': '/images/cardui/card_red_orb.png',
  '[G]': '/images/cardui/card_green_orb.png',
  '[B]': '/images/cardui/card_blue_orb.png',
  '[W]': '/images/cardui/card_purple_orb.png',
};

function renderEnergy(text: string): string {
  let html = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  for (const [token, imgPath] of Object.entries(energyMap)) {
    const escaped = token.replace('[', '\\[').replace(']', '\\]');
    html = html.replace(new RegExp(escaped, 'g'),
      `<img src="${imgPath}" alt="${token}" style="display:inline-block;height:1.1em;width:1.1em;vertical-align:text-bottom" />`);
  }
  return html.replace(/\n/g, ' ');
}

const colorClasses: Record<string, string> = {
  ironclad: 'bg-red-500/15 text-red-200 ring-red-500/30',
  silent: 'bg-green-500/15 text-green-200 ring-green-500/30',
  defect: 'bg-blue-500/15 text-blue-200 ring-blue-500/30',
  watcher: 'bg-purple-500/15 text-purple-200 ring-purple-500/30',
  colorless: 'bg-zinc-400/15 text-zinc-100 ring-zinc-400/30',
  curse: 'bg-zinc-800/60 text-zinc-200 ring-zinc-700/40',
};

function cap(s: string) { return s.charAt(0).toUpperCase() + s.slice(1); }

function BadgeSpan({ label, tone }: { label: string; tone?: string }) {
  const cls = tone && colorClasses[tone] ? colorClasses[tone] : 'bg-white/10 text-slate-200 ring-white/10';
  return <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs ring-1 ${cls}`}>{cap(label)}</span>;
}

function CardTile({ c, game }: { c: Card; game: string }) {
  const [upgraded, setUpgraded] = useState(false);
  const hasUpgrade = c.upgrade && (c.upgrade.description || c.upgrade.cost != null);
  const hasImages = game === 'sts1';
  const imgSrc = upgraded
    ? `/images/rendered/upgraded/thumbs/${c.id.toLowerCase()}.webp`
    : `/images/rendered/thumbs/${c.id.toLowerCase()}.webp`;
  return (
    <div className="group flex flex-col items-center rounded-lg border border-white/10 bg-white/5 p-3 hover:bg-white/10 transition-colors relative">
      <a href={`/${game}/cards/${c.id}`} className="text-sm font-semibold group-hover:underline truncate w-full text-center">{upgraded ? `${c.name}+` : c.name}</a>
      {hasImages ? (
        <a href={`/${game}/cards/${c.id}`} className="w-full mt-2">
          <img
            src={imgSrc}
            alt={c.name}
            className="w-full rounded-md drop-shadow-lg"
            loading="lazy"
          />
        </a>
      ) : (
        <a href={`/${game}/cards/${c.id}`} className="w-full mt-2 flex flex-col items-center gap-1 py-4 text-center">
          {c.description ? (
            <p className="text-xs text-slate-400 line-clamp-3">{c.description}</p>
          ) : (
            <p className="text-xs text-slate-500 italic">No description yet</p>
          )}
          {c.vars && Object.keys(c.vars).length > 0 && (
            <div className="mt-1 flex flex-wrap justify-center gap-1">
              {Object.entries(c.vars).map(([k, v]) => (
                <span key={k} className="text-xs bg-white/5 px-1.5 py-0.5 rounded text-slate-300">{k.replace(/_/g, ' ')}: {String(v)}</span>
              ))}
            </div>
          )}
        </a>
      )}
      {hasImages && hasUpgrade && (
        <button
          onClick={(e) => { e.preventDefault(); setUpgraded(!upgraded); }}
          className={`absolute top-2 right-2 w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center transition-colors ${upgraded ? 'bg-emerald-500 text-white' : 'bg-white/10 text-slate-400 hover:bg-white/20'}`}
          title={upgraded ? 'Show base' : 'Show upgraded'}
        >
          +
        </button>
      )}
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

export default function CardsExplorer(props: { game?: string;
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
      .then((json) => {
        if (!alive) return;
        setData(json);
      })
      .catch((e) => {
        if (!alive) return;
        setError(String(e));
      })
      .finally(() => {
        if (!alive) return;
        setLoading(false);
      });
    return () => {
      alive = false;
    };
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
          onChange={(e) => {
            setOffset(0);
            setQ(e.target.value);
          }}
        />
        <select
          className="rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm"
          value={color}
          onChange={(e) => {
            setOffset(0);
            setColor(e.target.value);
          }}
        >
          <option value="">All colors</option>
          {props.colors.map((c) => (
            <option key={c} value={c}>
              {cap(c)}
            </option>
          ))}
        </select>
        <select
          className="rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm"
          value={type}
          onChange={(e) => {
            setOffset(0);
            setType(e.target.value);
          }}
        >
          <option value="">All types</option>
          {props.types.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
        <select
          className="rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm"
          value={rarity}
          onChange={(e) => {
            setOffset(0);
            setRarity(e.target.value);
          }}
        >
          <option value="">All rarities</option>
          {props.rarities.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
        <input
          className="rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm"
          placeholder="Cost (exact)"
          value={cost}
          onChange={(e) => {
            setOffset(0);
            setCost(e.target.value.replace(/[^0-9\-]/g, ''));
          }}
        />
      </div>

      <div className="mt-3 flex items-center justify-between text-xs text-slate-300">
        <div>
          {loading ? 'Loading…' : `${total} results`} {error ? <span className="text-red-300">({error})</span> : null}
        </div>
        <div className="flex gap-2">
          <button
            className="rounded-md border border-white/10 bg-white/5 px-2 py-1 disabled:opacity-40"
            disabled={!canPrev}
            onClick={() => setOffset((o) => Math.max(0, o - limit))}
          >
            Prev
          </button>
          <button
            className="rounded-md border border-white/10 bg-white/5 px-2 py-1 disabled:opacity-40"
            disabled={!canNext}
            onClick={() => setOffset((o) => o + limit)}
          >
            Next
          </button>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-5">
        {(data?.items ?? []).map((c) => (
          <CardTile key={c.id} c={c} game={game} />
        ))}
      </div>
    </div>
  );
}
