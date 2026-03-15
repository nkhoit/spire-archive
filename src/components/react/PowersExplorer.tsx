import { useState } from 'react';
import { Pager, useApiList } from './SimpleExplorer';

type Power = {
  id: string;
  name: string;
  description: string;
  type: string;
};

type ApiResp<T> = { total: number; offset: number; limit: number; items: T[] };

export default function PowersExplorer(props: { types: string[]; initial?: ApiResp<Power> }) {
  const [q, setQ] = useState('');
  const [type, setType] = useState('');
  const [offset, setOffset] = useState(0);
  const limit = 50;

  const { data, loading, error } = useApiList<Power>('/api/powers', {
    q: q || null,
    type: type || null,
    offset,
    limit,
  }, props.initial);

  const resp = data ?? { total: 0, offset, limit, items: [] };

  return (
    <div className="mt-4">
      <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
        <input
          className="rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm"
          placeholder="Search powers…"
          value={q}
          onChange={(e) => {
            setOffset(0);
            setQ(e.target.value);
          }}
        />
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
            <div className="flex items-baseline justify-between gap-3">
              <a className="text-sm font-semibold hover:underline" href={`/powers#${p.id}`}>
                {p.name}
              </a>
              <div className="text-xs text-slate-400">{p.type}</div>
            </div>
            <div className="mt-2 line-clamp-2 text-sm text-slate-200">{p.description}</div>
          </li>
        ))}
      </ul>
    </div>
  );
}
