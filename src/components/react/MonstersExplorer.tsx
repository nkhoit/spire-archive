import { useState } from 'react';
import { Pager, useApiList } from './SimpleExplorer';
import { t } from '../../lib/ui-strings';

type Monster = {
  id: string;
  name: string;
  act: string;
  type: string;
  min_hp: number | null;
  max_hp: number | null;
  moves: { name: string; damage?: number | null; hits?: number | null }[];
  powers: string[];
};

const TYPE_COLORS: Record<string, string> = {
  Boss: 'text-red-400',
  Elite: 'text-yellow-400',
  Normal: 'text-slate-300',
  Weak: 'text-slate-400',
};

type ApiResp<T> = { total: number; offset: number; limit: number; items: T[] };

export default function MonstersExplorer(props: { game?: string; acts: string[]; types: string[]; initial?: ApiResp<Monster>; locale?: string }) {
  const game = props.game ?? 'sts1';
  const locale = props.locale ?? 'en';
  const [q, setQ] = useState('');
  const [type, setType] = useState('');
  const [offset, setOffset] = useState(0);
  const limit = 50;

  const { data, loading, error } = useApiList<Monster>(`/api/${game}/monsters`, {
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
          placeholder={t('Search', locale) + ' ' + t('Monsters', locale).toLowerCase() + '…'}
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
          <option value="">{t('All Types', locale)}</option>
          {props.types.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </div>

      <div className="mt-3 flex items-center justify-between text-xs text-slate-300">
        <div>
          {loading ? t('Loading…', locale) : `${resp.total} ${t('results', locale)}`} {error ? <span className="text-red-300">({error})</span> : null}
        </div>
        <Pager total={resp.total} offset={resp.offset} limit={resp.limit} onOffset={setOffset} locale={locale} />
      </div>

      <ul className="mt-3 divide-y divide-white/10 rounded-lg border border-white/10 bg-white/5">
        {resp.items.map((m) => {
          const hpText = m.min_hp && m.min_hp !== 9999
            ? m.min_hp === m.max_hp ? `${m.min_hp} HP` : `${m.min_hp}–${m.max_hp} HP`
            : null;
          const typeColor = TYPE_COLORS[m.type] ?? 'text-slate-300';
          return (
            <li key={m.id} className="p-3">
              <a className="flex items-start gap-3 hover:bg-white/5 -m-3 p-3 rounded-lg" href={`/${game}/monsters/${m.id}`}>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold">{m.name}</span>
                    <span className={`text-xs font-medium ${typeColor}`}>{m.type}</span>
                    {hpText && <span className="text-xs text-slate-400">{hpText}</span>}
                  </div>
                  {m.moves.length > 0 && (
                    <div className="mt-1 text-xs text-slate-400">
                      {m.moves.map(mv => mv.name).filter(Boolean).join(' · ')}
                    </div>
                  )}
                </div>
              </a>
            </li>
          );
        })}
      </ul>

      <div className="mt-3 flex justify-end">
        <Pager total={resp.total} offset={resp.offset} limit={resp.limit} onOffset={setOffset} locale={locale} />
      </div>
    </div>
  );
}
