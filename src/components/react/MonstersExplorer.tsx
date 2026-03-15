import { useState } from 'react';
import { Pager, useApiList } from './SimpleExplorer';

type Monster = {
  id: string;
  name: string;
  act: string;
  type: string;
  min_hp: number | null;
  max_hp: number | null;
};

const ACT_LABELS: Record<string, string> = {
  exordium: 'Act 1 — Exordium',
  city: 'Act 2 — The City',
  beyond: 'Act 3 — Beyond',
  ending: 'Act 4 — The Ending',
};

function actLabel(act: string): string {
  return ACT_LABELS[act] ?? act;
}

type ApiResp<T> = { total: number; offset: number; limit: number; items: T[] };

export default function MonstersExplorer(props: { acts: string[]; types: string[]; initial?: ApiResp<Monster> }) {
  const [q, setQ] = useState('');
  const [act, setAct] = useState('');
  const [type, setType] = useState('');
  const [offset, setOffset] = useState(0);
  const limit = 50;

  const { data, loading, error } = useApiList<Monster>('/api/sts1/monsters', {
    q: q || null,
    act: act || null,
    type: type || null,
    offset,
    limit,
  }, props.initial);

  const resp = data ?? { total: 0, offset, limit, items: [] };

  return (
    <div className="mt-4">
      <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
        <input
          className="rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm"
          placeholder="Search monsters…"
          value={q}
          onChange={(e) => {
            setOffset(0);
            setQ(e.target.value);
          }}
        />
        <select
          className="rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm"
          value={act}
          onChange={(e) => {
            setOffset(0);
            setAct(e.target.value);
          }}
        >
          <option value="">All acts</option>
          {props.acts.map((a) => (
            <option key={a} value={a}>
              {actLabel(a)}
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
      </div>

      <div className="mt-3 flex items-center justify-between text-xs text-slate-300">
        <div>
          {loading ? 'Loading…' : `${resp.total} results`} {error ? <span className="text-red-300">({error})</span> : null}
        </div>
        <Pager total={resp.total} offset={resp.offset} limit={resp.limit} onOffset={setOffset} />
      </div>

      <ul className="mt-3 divide-y divide-white/10 rounded-lg border border-white/10 bg-white/5">
        {resp.items.map((m) => (
          <li key={m.id} className="p-3">
            <a className="text-sm font-semibold hover:underline" href={`/sts1/monsters/${m.id}`}>
              {m.name}
            </a>
            <div className="mt-1 text-xs text-slate-300">
              {actLabel(m.act)} · {m.type} · HP {m.min_hp ?? '—'}–{m.max_hp ?? '—'}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
