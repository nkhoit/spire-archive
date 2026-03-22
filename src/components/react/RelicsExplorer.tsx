import DescriptionText from './DescriptionText';
import ListExplorer, { cap, type FilterConfig } from './ListExplorer';
import type { ApiResp } from './SimpleExplorer';
import { t } from '../../lib/ui-strings';

type Relic = {
  id: string;
  name: string;
  description: string;
  tier: string;
  color: string | null;
  icon?: string;
};

export default function RelicsExplorer(props: { game?: 'sts1' | 'sts2'; tiers: string[]; colors: string[]; initial?: ApiResp<Relic>; locale?: string }) {
  const game = props.game ?? 'sts1';
  const locale = props.locale ?? 'en';
  const filters: FilterConfig[] = [
    { key: 'q', type: 'text' },
    { key: 'tier', type: 'select', allLabel: 'All Tiers', options: props.tiers.map((tier) => ({ value: tier, label: tier })) },
    { key: 'color', type: 'select', allLabel: 'All colors', options: props.colors.map((color) => ({ value: color, label: t(cap(color), locale) })) },
  ];

  return <ListExplorer<Relic>
    endpoint={`/api/${game}/relics`}
    game={game}
    locale={locale}
    title="Relics"
    filters={filters}
    initial={props.initial}
    getItemKey={(relic) => relic.id}
    itemClassName={(relic) => `rounded-lg border border-white/[0.06] bg-white/[0.03] hover:bg-white/[0.06] hover:border-white/[0.12] transition-all tier-${relic.tier.toLowerCase().replace(/\s+/g, '-')}`}
    renderItem={(relic, itemLocale) => (
      <>
        {game === 'sts2' || relic.icon ? <img src={`/images/${game}/relics/${relic.icon ?? `${relic.id.toLowerCase()}.png`}`} alt="" className="h-14 w-14 flex-shrink-0 object-contain" loading="lazy" /> : <div className="h-14 w-14 flex-shrink-0 rounded bg-white/10" />}
        <div className="min-w-0">
          <span className="text-sm font-semibold hover:underline">{relic.name}</span>
          <div className="mt-1 text-xs text-slate-500">{t(relic.tier, itemLocale)}{relic.color ? ` · ${t(cap(relic.color), itemLocale)}` : ''}</div>
          <div className="mt-1 line-clamp-2 text-sm text-slate-300"><DescriptionText text={relic.description} /></div>
        </div>
      </>
    )}
  />;
}
