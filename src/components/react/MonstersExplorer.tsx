import ListExplorer, { Badge, type ExplorerFilters, type FilterConfig } from './ListExplorer';
import type { ApiResp } from './SimpleExplorer';
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

function rawHp(value: Monster['min_hp']) {
  return value == null ? null : typeof value === 'object' ? value.normal : value;
}

function matchesAct(monster: Monster, filters: ExplorerFilters) {
  return !filters.act || (monster.acts ?? []).includes(filters.act);
}

export default function MonstersExplorer(props: { game?: 'sts1' | 'sts2'; acts: string[]; types: string[]; initial?: ApiResp<Monster>; locale?: string }) {
  const game = props.game ?? 'sts1';
  const locale = props.locale ?? 'en';
  const filters: FilterConfig[] = [
    { key: 'q', type: 'text' },
    { key: 'type', type: 'select', allLabel: 'All Types', options: props.types.map((type) => ({ value: type, label: t(type, locale) })) },
    { key: 'act', type: 'select', allLabel: 'All Acts', options: props.acts.map((act) => ({ value: act, label: t(act, locale) })) },
  ];

  return <ListExplorer<Monster>
    endpoint={`/api/${game}/monsters`}
    game={game}
    locale={locale}
    title="Monsters"
    filters={filters}
    anchorClassName="flex items-start gap-3 p-3"
    initial={props.initial}
    clientFilter={matchesAct}
    getItemKey={(monster) => monster.id}
    renderItem={(monster, itemLocale) => {
      const minHp = rawHp(monster.min_hp);
      const maxHp = rawHp(monster.max_hp);
      const hpText = minHp && minHp !== 9999 ? (minHp === maxHp ? `${minHp} HP` : `${minHp}–${maxHp} HP`) : null;
      const titles = (monster.move_titles ?? (monster.move_pattern ?? monster.moves).filter((move: any) => move.name && move.type !== 'random').map((move: any) => move.name));
      return (
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold">{monster.name}</span>
            <span className={`text-xs font-medium ${TYPE_COLORS[monster.type] ?? 'text-slate-300'}`}>{t(monster.type, itemLocale)}</span>
            {(monster.acts ?? []).map((act) => <Badge key={act} label={t(act, itemLocale)} rounded="rounded-full" className="bg-sky-500/15 text-sky-300 ring-sky-500/30" />)}
            {hpText && <span className="text-xs text-slate-400">{hpText}</span>}
          </div>
          {titles.length > 0 && <div className="mt-1 text-xs text-slate-400">{titles.join(' · ')}</div>}
        </div>
      );
    }}
  />;
}
