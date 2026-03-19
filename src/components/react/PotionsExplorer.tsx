import { useState } from 'react';
import { Pager, useApiList } from './SimpleExplorer';
import { t } from '../../lib/ui-strings';

type Potion = {
  id: string;
  name: string;
  description: string;
  rarity: string;
  icon?: string;
};

type ApiResp<T> = { total: number; offset: number; limit: number; items: T[] };

const rarityCls: Record<string, string> = {
  common: 'tier-common',
  uncommon: 'tier-uncommon',
  rare: 'tier-rare',
};

export default function PotionsExplorer(props: { game?: string; rarities: string[]; initial?: ApiResp<Potion>; locale?: string }) {
  const game = props.game ?? 'sts1';
  const locale = props.locale ?? 'en';
  const [q, setQ] = useState('');
  const [rarity, setRarity] = useState('');
  const [offset, setOffset] = useState(0);
  const limit = 50;

  const { data, loading, error } = useApiList<Potion>(`/api/${game}/potions`, {
    q: q || null,
    rarity: rarity || null,
    offset,
    limit,
  }, props.initial);

  const resp = data ?? { total: 0, offset, limit, items: [] };

  return (
    <div className="mt-4">
      <div className="sticky top-[53px] z-[5] -mx-4 px-4 py-3 bg-[#0a0d13]/80 backdrop-blur-xl border-b border-white/[0.06]">
        <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
        <input
          className="rounded-md border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-sm focus:border-amber-500/40 focus:outline-none transition-colors"
          placeholder={t('Search', locale) + ' ' + t('Potions', locale).toLowerCase() + '…'}
          value={q}
          onChange={(e) => {
            setOffset(0);
            setQ(e.target.value);
          }}
        />
        <select
          className="rounded-md border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-sm focus:border-amber-500/40 focus:outline-none transition-colors"
          value={rarity}
          onChange={(e) => {
            setOffset(0);
            setRarity(e.target.value);
          }}
        >
          <option value="">{t('All Rarities', locale)}</option>
          {props.rarities.map((r) => (
            <option key={r} value={r}>
              {r}
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
        {resp.items.map((p) => (
          <li key={p.id} className={`rounded-lg border border-white/[0.06] bg-white/[0.03] hover:bg-white/[0.06] hover:border-white/[0.12] transition-all ${rarityCls[p.rarity.toLowerCase()] ?? ''}`}>
            <a className="flex items-center gap-3 p-3" href={`/${game}/potions/${p.id}`}>
              {game === 'sts2' || p.icon ? (
                <img src={`/images/${game}/potions/${p.icon ?? p.id.toLowerCase() + '.png'}`} alt="" className="w-14 h-14 flex-shrink-0 object-contain" loading="lazy" />
              ) : (
                <div className="w-14 h-14 flex-shrink-0 rounded bg-white/10" />
              )}
              <div className="min-w-0">
                <span className="text-sm font-semibold hover:underline">{p.name}</span>
                <div className="mt-1 text-xs text-slate-500">{p.rarity}</div>
                <div className="mt-1 line-clamp-2 text-sm text-slate-300">{p.description}</div>
              </div>
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
