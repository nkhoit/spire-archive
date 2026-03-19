import { useState } from 'react';
import { Pager, useApiList } from './SimpleExplorer';
import { t } from '../../lib/ui-strings';

type Enchantment = {
  id: string;
  name: string;
  description: string;
  rarity: string;
};

export default function EnchantmentsExplorer(props: { game?: string; rarities: string[]; locale?: string }) {
  const game = props.game ?? 'sts2';
  const locale = props.locale ?? 'en';
  const [q, setQ] = useState('');
  const [rarity, setRarity] = useState('');
  const [offset, setOffset] = useState(0);
  const limit = 200;

  const { data, loading, error } = useApiList<Enchantment>(`/api/${game}/enchantments`, {
    q: q || null,
    rarity: rarity || null,
    locale: locale !== 'en' ? locale : null,
    offset,
    limit,
  });

  const resp = data ?? { total: 0, offset, limit, items: [] };

  function cap(s: string) { return s.charAt(0).toUpperCase() + s.slice(1); }

  return (
    <div className="mt-4">
      <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
        <input
          className="rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm"
          placeholder={t('Search', locale) + ' ' + t('Enchantments', locale).toLowerCase() + '…'}
          value={q}
          onChange={(e) => { setOffset(0); setQ(e.target.value); }}
        />
        <select
          className="rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm"
          value={rarity}
          onChange={(e) => { setOffset(0); setRarity(e.target.value); }}
        >
          <option value="">{t('All Rarities', locale)}</option>
          {props.rarities.map((r) => (
            <option key={r} value={r}>{t(cap(r), locale)}</option>
          ))}
        </select>
      </div>

      <div className="mt-3 flex items-center justify-between text-xs text-slate-300">
        <div>
          {loading ? t('Loading…', locale) : `${resp.total} ${t('results', locale)}`}
          {error ? <span className="text-red-300"> ({error})</span> : null}
        </div>
        <Pager total={resp.total} offset={resp.offset} limit={resp.limit} onOffset={setOffset} locale={locale} />
      </div>

      <ul className="mt-3 divide-y divide-white/10 rounded-lg border border-white/10 bg-white/5">
        {resp.items.map((e) => (
          <li key={e.id} className="p-3">
            <a className="flex items-start gap-3 hover:bg-white/5 -m-3 p-3 rounded-lg" href={`/${game}/enchantments/${e.id}`}>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold">{e.name}</span>
                  {e.rarity && e.rarity !== 'Unknown' && <span className="text-xs px-1.5 py-0.5 rounded bg-white/10 text-slate-300">{e.rarity}</span>}
                </div>
                <p className="mt-0.5 text-sm text-slate-300 line-clamp-2">{e.description}</p>
              </div>
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
