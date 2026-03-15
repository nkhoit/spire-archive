import { useState } from 'react';
import { Pager, useApiList } from './SimpleExplorer';

type Potion = {
  id: string;
  name: string;
  description: string;
  rarity: string;
  icon?: string;
};

type ApiResp<T> = { total: number; offset: number; limit: number; items: T[] };

export default function PotionsExplorer(props: { rarities: string[]; initial?: ApiResp<Potion> }) {
  const [q, setQ] = useState('');
  const [rarity, setRarity] = useState('');
  const [offset, setOffset] = useState(0);
  const limit = 50;

  const { data, loading, error } = useApiList<Potion>('/api/potions', {
    q: q || null,
    rarity: rarity || null,
    offset,
    limit,
  }, props.initial);

  const resp = data ?? { total: 0, offset, limit, items: [] };

  return (
    <div className="mt-4">
      <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
        <input
          className="rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm"
          placeholder="Search potions…"
          value={q}
          onChange={(e) => {
            setOffset(0);
            setQ(e.target.value);
          }}
        />
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
      </div>

      <div className="mt-3 flex items-center justify-between text-xs text-slate-300">
        <div>
          {loading ? 'Loading…' : `${resp.total} results`} {error ? <span className="text-red-300">({error})</span> : null}
        </div>
        <Pager total={resp.total} offset={resp.offset} limit={resp.limit} onOffset={setOffset} />
      </div>

      <ul className="mt-3 divide-y divide-white/10 rounded-lg border border-white/10 bg-white/5">
        {resp.items.map((p) => (
          <li key={p.id} className="p-3">
            <a className="flex items-center gap-3" href={`/potions/${p.id}`}>
              {p.icon ? (
                <img src={`/images/potions/${p.icon}`} alt="" className="w-10 h-10 flex-shrink-0" />
              ) : (
                <div className="w-10 h-10 flex-shrink-0 rounded bg-white/10" />
              )}
              <div className="min-w-0">
                <span className="text-sm font-semibold hover:underline">{p.name}</span>
                <div className="mt-1 text-xs text-slate-300">{p.rarity}</div>
                <div className="mt-1 line-clamp-2 text-sm text-slate-200">{p.description}</div>
              </div>
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
