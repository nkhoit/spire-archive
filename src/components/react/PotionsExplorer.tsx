import DescriptionText from './DescriptionText';
import ListExplorer, { type FilterConfig } from './ListExplorer';
import type { ApiResp } from './SimpleExplorer';
import { t } from '../../lib/ui-strings';

type Potion = {
  id: string;
  name: string;
  description: string;
  rarity: string;
  icon?: string;
};

const rarityCls: Record<string, string> = {
  common: 'tier-common',
  uncommon: 'tier-uncommon',
  rare: 'tier-rare',
};

export default function PotionsExplorer(props: { game?: 'sts1' | 'sts2'; rarities: string[]; initial?: ApiResp<Potion>; locale?: string }) {
  const game = props.game ?? 'sts1';
  const locale = props.locale ?? 'en';
  const filters: FilterConfig[] = [
    { key: 'q', type: 'text' },
    { key: 'rarity', type: 'select', allLabel: 'All Rarities', options: props.rarities.map((rarity) => ({ value: rarity, label: rarity })) },
  ];

  return <ListExplorer<Potion>
    endpoint={`/api/${game}/potions`}
    game={game}
    locale={locale}
    title="Potions"
    filters={filters}
    initial={props.initial}
    getItemKey={(potion) => potion.id}
    itemClassName={(potion) => `rounded-lg border border-white/[0.06] bg-white/[0.03] hover:bg-white/[0.06] hover:border-white/[0.12] transition-all ${rarityCls[potion.rarity.toLowerCase()] ?? ''}`}
    renderItem={(potion, itemLocale) => (
      <>
        {game === 'sts2' || potion.icon ? <img src={`/images/${game}/potions/${potion.icon ?? `${potion.id.toLowerCase()}.png`}`} alt="" className="h-14 w-14 flex-shrink-0 object-contain" loading="lazy" /> : <div className="h-14 w-14 flex-shrink-0 rounded bg-white/10" />}
        <div className="min-w-0">
          <span className="text-sm font-semibold hover:underline">{potion.name}</span>
          <div className="mt-1 text-xs text-slate-500">{t(potion.rarity, itemLocale)}</div>
          <div className="mt-1 line-clamp-2 text-sm text-slate-300"><DescriptionText text={potion.description} /></div>
        </div>
      </>
    )}
  />;
}
