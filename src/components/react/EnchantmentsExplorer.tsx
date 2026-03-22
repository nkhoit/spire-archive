import DescriptionText from './DescriptionText';
import ListExplorer, { Badge, cap, type FilterConfig } from './ListExplorer';
import { t } from '../../lib/ui-strings';

type Enchantment = {
  id: string;
  name: string;
  description: string;
  rarity: string;
};

export default function EnchantmentsExplorer(props: { game?: 'sts2'; rarities: string[]; locale?: string }) {
  const game = props.game ?? 'sts2';
  const locale = props.locale ?? 'en';
  const filters: FilterConfig[] = [
    { key: 'q', type: 'text' },
    { key: 'rarity', type: 'select', allLabel: 'All Rarities', options: props.rarities.map((rarity) => ({ value: rarity, label: t(cap(rarity), locale) })) },
  ];

  return <ListExplorer<Enchantment>
    endpoint={`/api/${game}/enchantments`}
    game={game}
    locale={locale}
    title="Enchantments"
    filters={filters}
    limit={200}
    getItemKey={(enchantment) => enchantment.id}
    renderItem={(enchantment) => (
      <>
        <img src={`/images/sts2/enchantments/${enchantment.id.toLowerCase()}.png`} alt="" width={40} height={40} className="flex-shrink-0 rounded" loading="lazy" style={{ imageRendering: 'pixelated' }} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold">{enchantment.name}</span>
            {enchantment.rarity && enchantment.rarity !== 'Unknown' && <Badge label={enchantment.rarity} className="bg-white/10 text-slate-300 ring-white/10" />}
          </div>
          <div className="mt-0.5 line-clamp-2 text-sm text-slate-300"><DescriptionText text={enchantment.description} /></div>
        </div>
      </>
    )}
  />;
}
