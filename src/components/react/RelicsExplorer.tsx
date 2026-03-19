import { useState } from 'react';
import { Pager, useApiList } from './SimpleExplorer';
import { t } from '../../lib/ui-strings';

type Relic = {
  id: string;
  name: string;
  description: string;
  tier: string;
  color: string | null;
  icon?: string;
};

type ApiResp<T> = { total: number; offset: number; limit: number; items: T[] };

export default function RelicsExplorer(props: { game?: string; tiers: string[]; colors: string[]; initial?: ApiResp<Relic>; locale?: string }) {
  const game = props.game ?? 'sts1';
  const locale = props.locale ?? 'en';
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
      <div className="sticky top-[53px] z-[5] -mx-4 px-4 py-3 bg-[#0a0d13]/80 backdrop-blur-xl border-b border-white/[0.06]">
        <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
        <input
          className="rounded-md border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-sm focus:border-amber-500/40 focus:outline-none transition-colors"
          placeholder={t('Search', locale) + ' ' + t('Relics', locale).toLowerCase() + '…'}
          value={q}
          onChange={(e) => {
            setOffset(0);
            setQ(e.target.value);
          }}
        />
        <select
          className="rounded-md border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-sm focus:border-amber-500/40 focus:outline-none transition-colors"
          value={tier}
          onChange={(e) => {
            setOffset(0);
            setTier(e.target.value);
          }}
        >
          <option value="">{t('All Tiers', locale)}</option>
          {props.tiers.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
        <select
          className="rounded-md border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-sm focus:border-amber-500/40 focus:outline-none transition-colors"
          value={color}
          onChange={(e) => {
            setOffset(0);
            setColor(e.target.value);
          }}
        >
          <option value="">{t('All colors', locale)}</option>
          {props.colors.map((c) => (
            <option key={c} value={c}>
              {t(c, locale)}
            </option>
          ))}
        </select>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between text-xs text-slate-300">
        <div>
          {loading ? 'Loading…' : `${resp.total} results`} {error ? <span className="text-red-300">({error})</span> : null}
        </div>
        <Pager total={resp.total} offset={resp.offset} limit={resp.limit} onOffset={setOffset} />
      </div>

      <ul className="mt-3 space-y-2">
        {resp.items.map((r) => {
          const tierCls = 'tier-' + r.tier.toLowerCase().replace(/\s+/g, '-');
          return (
          <li key={r.id} className={`rounded-lg border border-white/[0.06] bg-white/[0.03] hover:bg-white/[0.06] hover:border-white/[0.12] transition-all ${tierCls}`}>
            <a className="flex items-center gap-3 p-3" href={`/${game}/relics/${r.id}`}>
              {game === 'sts2' || r.icon ? (
                <img src={`/images/${game}/relics/${r.icon ?? r.id.toLowerCase() + '.png'}`} alt="" className="w-14 h-14 flex-shrink-0 object-contain" loading="lazy" />
              ) : (
                <div className="w-14 h-14 flex-shrink-0 rounded bg-white/10" />
              )}
              <div className="min-w-0">
                <span className="text-sm font-semibold hover:underline">{r.name}</span>
                <div className="mt-1 text-xs text-slate-500">
                  {r.tier}
                  {r.color ? ` · ${r.color}` : ''}
                </div>
                <div className="mt-1 line-clamp-2 text-sm text-slate-300">{r.description}</div>
              </div>
            </a>
          </li>
          );
        })}
      </ul>
    </div>
  );
}
