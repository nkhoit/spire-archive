import { useState } from 'react';
import { Pager, useApiList } from './SimpleExplorer';

type Event = {
  id: string;
  name: string;
  act: string;
  description: string;
};

type ApiResp<T> = { total: number; offset: number; limit: number; items: T[] };

export default function EventsExplorer(props: { acts: string[]; initial?: ApiResp<Event> }) {
  const [q, setQ] = useState('');
  const [act, setAct] = useState('');
  const [offset, setOffset] = useState(0);
  const limit = 50;

  const { data, loading, error } = useApiList<Event>('/api/events', {
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
              {a}
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
            <a className="text-sm font-semibold hover:underline" href={`/events/${e.id}`}>
              {e.name}
            </a>
            <div className="mt-1 text-xs text-slate-300">{e.act}</div>
            <div className="mt-2 line-clamp-2 text-sm text-slate-200">{e.description}</div>
          </li>
        ))}
      </ul>
    </div>
  );
}
