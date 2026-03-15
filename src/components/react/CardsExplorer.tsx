import { useEffect, useMemo, useState } from 'react';

type Card = {
  id: string;
  name: string;
  description: string;
  cost: number | null;
  type: string;
  rarity: string;
  color: string;
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

function buildUrl(base: string, params: Record<string, string | number | null>) {
  const u = new URL(base, window.location.origin);
  for (const [k, v] of Object.entries(params)) {
    if (v === null || v === '') continue;
    u.searchParams.set(k, String(v));
  }
  return u.toString();
}

export default function CardsExplorer(props: {
  initial?: ApiResp<Card>;
  colors: string[];
  types: string[];
  rarities: string[];
}) {
  const [q, setQ] = useState('');
  const [color, setColor] = useState('');
  const [type, setType] = useState('');
  const [rarity, setRarity] = useState('');
  const [cost, setCost] = useState<string>('');
  const [offset, setOffset] = useState(0);
  const [limit] = useState(50);

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
      buildUrl('/api/cards', {
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
              {c}
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

      <ul className="mt-3 divide-y divide-white/10 rounded-lg border border-white/10 bg-white/5">
        {(data?.items ?? []).map((c) => (
          <li key={c.id} className="p-3">
            <a className="text-sm font-semibold hover:underline" href={`/cards/${c.id}`}>
              {c.name}
            </a>
            <div className="mt-1 text-xs text-slate-300">
              {c.color} · {c.type} · {c.rarity} · cost {c.cost ?? '—'}
            </div>
            <div className="mt-2 line-clamp-2 text-sm text-slate-200" dangerouslySetInnerHTML={{ __html: renderEnergy(c.description) }}></div>
          </li>
        ))}
      </ul>
    </div>
  );
}
