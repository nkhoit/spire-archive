import { useState } from 'react';
import { Pager, useApiList } from './SimpleExplorer';

type Relic = {
  id: string;
  name: string;
  description: string;
  tier: string;
  color: string | null;
  icon?: string;
};

type ApiResp<T> = { total: number; offset: number; limit: number; items: T[] };

export default function RelicsExplorer(props: { game?: string; tiers: string[]; colors: string[]; initial?: ApiResp<Relic> }) {
  const game = props.game ?? 'sts1';
  const [q, setQ] = useState('');
  const [tier, setTier] = useState('');
  const [color, setColor] = useState('');
  const [offset, setOffset] = useState(0);
  const limit = 50;

  const { data, loading, error } = useApiList<Relic>(`/api/${game}/relics`, {
    q: q || null,
    tier: tier || null,
    color: color || null,
    offset,
    limit,
  }, props.initial);

  const resp = data ?? { total: 0, offset, limit, items: [] };

  return (
    <div className="mt-4">
      <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
        <input
          className="rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm"
          placeholder="Search relics…"
          value={q}
          onChange={(e) => {
            setOffset(0);
            setQ(e.target.value);
          }}
        />
        <select
          className="rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm"
          value={tier}
          onChange={(e) => {
            setOffset(0);
            setTier(e.target.value);
          }}
        >
          <option value="">All tiers</option>
          {props.tiers.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
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
      </div>

      <div className="mt-3 flex items-center justify-between text-xs text-slate-300">
        <div>
          {loading ? 'Loading…' : `${resp.total} results`} {error ? <span className="text-red-300">({error})</span> : null}
        </div>
        <Pager total={resp.total} offset={resp.offset} limit={resp.limit} onOffset={setOffset} />
      </div>

      <ul className="mt-3 divide-y divide-white/10 rounded-lg border border-white/10 bg-white/5">
        {resp.items.map((r) => (
          <li key={r.id} className="p-3">
            <a className="flex items-center gap-3" href={`/${game}/relics/${r.id}`}>
              {r.icon ? (
                <img src={`/images/${game}/relics/${r.icon}`} alt="" className="w-14 h-14 flex-shrink-0" />
              ) : (
                <div className="w-14 h-14 flex-shrink-0 rounded bg-white/10" />
              )}
              <div className="min-w-0">
                <span className="text-sm font-semibold hover:underline">{r.name}</span>
                <div className="mt-1 text-xs text-slate-300">
                  {r.tier}
                  {r.color ? ` · ${r.color}` : ''}
                </div>
                <div className="mt-1 line-clamp-2 text-sm text-slate-200">{r.description}</div>
              </div>
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
