import { useState } from 'react';
import { Pager, useApiList } from './SimpleExplorer';
import { t } from '../../lib/ui-strings';

type Power = {
  id: string;
  name: string;
  description: string;
  type: string;
  icon?: string;
};

type ApiResp<T> = { total: number; offset: number; limit: number; items: T[] };

export default function PowersExplorer(props: { game?: string; locale?: string }) {
  const game = props.game ?? 'sts1';
  const locale = props.locale ?? 'en';
  const [q, setQ] = useState('');
  const [type, setType] = useState('');
  const [offset, setOffset] = useState(0);
  const limit = 200;

  const { data, loading, error } = useApiList<Power>(`/api/${game}/effects`, {
    q: q || null,
    type: type || null,
    offset,
    limit,
  });

  const resp = data ?? { total: 0, offset, limit, items: [] };

  return (
    <div className="mt-4">
      <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
        <input
          className="rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm"
          placeholder={t('Search', locale) + ' ' + t('Buffs & Debuffs', locale).toLowerCase() + '…'}
          value={q}
          onChange={(e) => { setOffset(0); setQ(e.target.value); }}
        />
        <select
          className="rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm"
          value={type}
          onChange={(e) => { setOffset(0); setType(e.target.value); }}
        >
          <option value="">{t('All Types', locale)}</option>
          <option value="Buff">Buff</option>
          <option value="Debuff">Debuff</option>
        </select>
      </div>

      <div className="mt-3 flex items-center justify-between text-xs text-slate-300">
        <div>
          {loading ? 'Loading…' : `${resp.total} results`}
          {error ? <span className="text-red-300"> ({error})</span> : null}
        </div>
        <Pager total={resp.total} offset={resp.offset} limit={resp.limit} onOffset={setOffset} />
      </div>

      <ul className="mt-3 divide-y divide-white/10 rounded-lg border border-white/10 bg-white/5">
        {resp.items.map((p) => (
          <li key={p.id} className="p-3">
            <a className="flex items-center gap-3 hover:bg-white/5 -m-3 p-3 rounded-lg" href={`/${game}/effects/${p.id}`}>
              {p.icon ? (
                <img src={`/images/${game}/powers/${p.icon}`} alt="" className="w-10 h-10 flex-shrink-0" />
              ) : game === 'sts2' ? (
                <img src={`/images/sts2/powers/${p.id.toLowerCase()}.png`} alt="" className="w-10 h-10 flex-shrink-0" />
              ) : (
                <div className="w-10 h-10 flex-shrink-0 rounded bg-white/10" />
              )}
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold">{p.name}</span>
                  <span className={`text-xs px-1.5 py-0.5 rounded ${
                    p.type === 'Buff' ? 'bg-emerald-900/50 text-emerald-300' : 'bg-red-900/50 text-red-300'
                  }`}>{p.type}</span>
                </div>
                <p className="mt-0.5 text-sm text-slate-300 line-clamp-2">{p.description}</p>
              </div>
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
