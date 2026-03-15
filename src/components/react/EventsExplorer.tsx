import { useState } from 'react';
import { Pager, useApiList } from './SimpleExplorer';

type Event = {
  id: string;
  name: string;
  act: string;
  description: string;
};

type ApiResp<T> = { total: number; offset: number; limit: number; items: T[] };

const ACT_LABELS: Record<string, string> = {
  exordium: 'Act 1 — Exordium',
  city: 'Act 2 — The City',
  beyond: 'Act 3 — Beyond',
  shrines: 'Any Act — Shrine',
};
function actLabel(a: string) { return ACT_LABELS[a] ?? a.charAt(0).toUpperCase() + a.slice(1); }

export default function EventsExplorer(props: { acts: string[]; initial?: ApiResp<Event> }) {
  const [q, setQ] = useState('');
  const [act, setAct] = useState('');
  const [offset, setOffset] = useState(0);
  const limit = 50;

  const { data, loading, error } = useApiList<Event>('/api/sts1/events', {
    q: q || null,
    act: act || null,
    offset,
    limit,
  }, props.initial);

  const resp = data ?? { total: 0, offset, limit, items: [] };

  return (
    <div className="mt-4">
      <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
        <input
          className="rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm"
          placeholder="Search events…"
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
      </div>

      <div className="mt-3 flex items-center justify-between text-xs text-slate-300">
        <div>
          {loading ? 'Loading…' : `${resp.total} results`} {error ? <span className="text-red-300">({error})</span> : null}
        </div>
        <Pager total={resp.total} offset={resp.offset} limit={resp.limit} onOffset={setOffset} />
      </div>

      <ul className="mt-3 divide-y divide-white/10 rounded-lg border border-white/10 bg-white/5">
        {resp.items.map((e) => (
          <li key={e.id} className="p-3">
            <a className="text-sm font-semibold hover:underline" href={`/sts1/events/${e.id}`}>
              {e.name}
            </a>
            <div className="mt-1 text-xs text-slate-300">{actLabel(e.act)}</div>
            <div className="mt-2 line-clamp-2 text-sm text-slate-200">{e.description}</div>
          </li>
        ))}
      </ul>
    </div>
  );
}
