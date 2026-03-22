import DescriptionText from './DescriptionText';
import ListExplorer, { Badge, type FilterConfig } from './ListExplorer';
import { t } from '../../lib/ui-strings';

type Power = {
  id: string;
  name: string;
  description: string;
  type: string;
  icon?: string;
  stackable?: boolean;
};

export default function PowersExplorer(props: { game?: 'sts1' | 'sts2'; locale?: string }) {
  const game = props.game ?? 'sts1';
  const locale = props.locale ?? 'en';
  const filters: FilterConfig[] = [
    { key: 'q', type: 'text' },
    {
      key: 'type',
      type: 'select',
      allLabel: 'All Types',
      options: ['Buff', 'Debuff'].map((type) => ({ value: type, label: t(type, locale) })),
    },
  ];

  return <ListExplorer<Power>
    endpoint={`/api/${game}/effects`}
    pathSegment="effects"
    game={game}
    locale={locale}
    title="Buffs & Debuffs"
    filters={filters}
    limit={200}
    getItemKey={(power) => power.id}
    renderItem={(power, itemLocale) => (
      <>
        {power.icon ? <img src={`/images/${game}/powers/${power.icon}`} alt="" className="h-10 w-10 flex-shrink-0" /> : game === 'sts2' ? <img src={`/images/sts2/powers/${power.id.toLowerCase()}.png`} alt="" className="h-10 w-10 flex-shrink-0" /> : <div className="h-10 w-10 flex-shrink-0 rounded bg-white/10" />}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold">{power.name}</span>
            <Badge label={power.type} locale={itemLocale} translate className={power.type === 'Buff' ? 'bg-emerald-900/50 text-emerald-300 ring-emerald-500/20' : 'bg-red-900/50 text-red-300 ring-red-500/20'} />
            {power.stackable && <Badge label="Stackable" locale={itemLocale} translate className="bg-blue-900/50 text-blue-300 ring-blue-500/20" />}
          </div>
          <div className="mt-0.5 line-clamp-2 text-sm text-slate-300"><DescriptionText text={power.description} /></div>
        </div>
      </>
    )}
  />;
}
