import ListExplorer, { type FilterConfig } from './ListExplorer';
import type { ApiResp } from './SimpleExplorer';
import { t } from '../../lib/ui-strings';

type EventChoice = {
  name: string;
  description: string;
};

type Event = {
  id: string;
  name: string;
  act: string;
  description: string;
  choices: EventChoice[];
};

export default function EventsExplorer(props: { game?: 'sts1' | 'sts2'; initial?: ApiResp<Event>; locale?: string }) {
  const game = props.game ?? 'sts1';
  const locale = props.locale ?? 'en';
  const filters: FilterConfig[] = [{ key: 'q', type: 'text' }];

  return <ListExplorer<Event>
    endpoint={`/api/${game}/events`}
    game={game}
    locale={locale}
    title="Events"
    filters={filters}
    anchorClassName="flex items-start gap-3 p-3"
    initial={props.initial}
    getItemKey={(event) => event.id}
    listClassName="mt-3 space-y-2"
    itemClassName="rounded-lg border border-white/[0.06] bg-white/[0.03] hover:bg-white/[0.06] hover:border-white/[0.12] transition-all"
    renderItem={(event, itemLocale) => (
      <div className="min-w-0 flex-1">
        <span className="text-sm font-semibold">{event.name}</span>
        {event.description && <div className="mt-1 line-clamp-2 text-sm text-slate-300">{event.description}</div>}
        {event.choices?.length > 0 && <div className="mt-1 text-xs text-slate-400">{event.choices.length} {t('choices', itemLocale)}</div>}
      </div>
    )}
  />;
}
