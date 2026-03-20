import { useState } from 'react';
import { Pager, useApiList, useUrlOffset } from './SimpleExplorer';
import { t } from '../../lib/ui-strings';

type Monster = {
  id: string;
  name: string;
  act: string;
  acts?: string[];
  type: string;
  min_hp: number | { ascension: number; normal: number } | null;
  max_hp: number | { ascension: number; normal: number } | null;
  moves: { name: string; damage?: number | null; hits?: number | null }[];
  move_pattern?: { name?: string; id?: string; type?: string }[];
  move_titles?: string[];
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
  const [act, setAct] = useState('');
  const limit = 50;
  const [offset, setOffset] = useUrlOffset(limit);

  const { data, loading, error } = useApiList<Monster>(`/api/${game}/monsters`, {
    q: q || null,
    type: type || null,
    locale: locale !== 'en' ? locale : null,
    offset,
    limit,
  }, props.initial);

  const resp = data ?? { total: 0, offset, limit, items: [] };
  const filtered = act
    ? { ...resp, items: resp.items.filter(m => (m.acts ?? []).includes(act)), total: resp.items.filter(m => (m.acts ?? []).includes(act)).length }
    : resp;

  return (
    <div className="mt-4">
      <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
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
          {props.types.map((tp) => (
            <option key={tp} value={tp}>
              {t(tp, locale)}
            </option>
          ))}
        </select>
        <select
          className="rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm"
          value={act}
          onChange={(e) => {
            setOffset(0);
            setAct(e.target.value);
          }}
        >
          <option value="">{t('All Acts', locale)}</option>
          {props.acts.map((a) => (
            <option key={a} value={a}>
              {t(a, locale)}
            </option>
          ))}
        </select>
      </div>

      <div className="mt-3 flex items-center justify-between text-xs text-slate-300">
        <div>
          {loading ? t('Loading…', locale) : `${filtered.total} ${t('results', locale)}`} {error ? <span className="text-red-300">({error})</span> : null}
        </div>
        <Pager total={filtered.total} offset={filtered.offset} limit={filtered.limit} onOffset={setOffset} locale={locale} />
      </div>

      <ul className="mt-3 divide-y divide-white/10 rounded-lg border border-white/10 bg-white/5">
        {filtered.items.map((m) => {
          const rawHp = (v: any) => v == null ? null : typeof v === 'object' ? v.normal : v;
          const minHp = rawHp(m.min_hp);
          const maxHp = rawHp(m.max_hp);
          const hpText = minHp && minHp !== 9999
            ? minHp === maxHp ? `${minHp} HP` : `${minHp}–${maxHp} HP`
            : null;
          const typeColor = TYPE_COLORS[m.type] ?? 'text-slate-300';
          return (
            <li key={m.id} className="p-3">
              <a className="flex items-start gap-3 hover:bg-white/5 -m-3 p-3 rounded-lg" href={`${locale !== "en" ? "/" + locale : ""}/${game}/monsters/${m.id}`}>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold">{m.name}</span>
                    <span className={`text-xs font-medium ${typeColor}`}>{t(m.type, locale)}</span>
                    {(m.acts ?? []).map(a => (
                      <span key={a} className="text-xs px-1.5 py-0.5 rounded-full bg-sky-500/15 text-sky-300 ring-1 ring-sky-500/30">{t(a, locale)}</span>
                    ))}
                    {hpText && <span className="text-xs text-slate-400">{hpText}</span>}
                  </div>
                  {(() => {
                    const titles = m.move_titles ?? (m.move_pattern ?? m.moves).filter((mv: any) => mv.name && mv.type !== 'random').map((mv: any) => mv.name);
                    return titles.length > 0 && (
                      <div className="mt-1 text-xs text-slate-400">
                        {titles.join(' · ')}
                      </div>
                    );
                  })()}
                </div>
              </a>
            </li>
          );
        })}
      </ul>

      <div className="mt-3 flex justify-end">
        <Pager total={filtered.total} offset={filtered.offset} limit={filtered.limit} onOffset={setOffset} locale={locale} />
      </div>
    </div>
  );
}
