import { useState } from 'react';
import { Pager, useApiList, useUrlOffset } from './SimpleExplorer';
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

type ApiResp<T> = { total: number; offset: number; limit: number; items: T[] };

export default function EventsExplorer(props: { game?: string; initial?: ApiResp<Event>; locale?: string }) {
  const game = props.game ?? 'sts1';
  const locale = props.locale ?? 'en';
  const [q, setQ] = useState('');
  const limit = 50;
  const [offset, setOffset] = useUrlOffset(limit);

  const { data, loading, error } = useApiList<Event>(`/api/${game}/events`, {
    q: q || null,
    offset,
    limit,
    lang: locale !== 'en' ? locale : null,
  }, props.initial);

  const resp = data ?? { total: 0, offset, limit, items: [] };

  return (
    <div className="mt-4">
      <input
        className="w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm"
        placeholder={t('Search', locale) + ' ' + t('Events', locale).toLowerCase() + '…'}
        value={q}
        onChange={(e) => {
          setOffset(0);
          setQ(e.target.value);
        }}
      />

      <div className="mt-3 flex items-center justify-between text-xs text-slate-300">
        <div>
          {loading ? t('Loading…', locale) : `${resp.total} ${t('results', locale)}`} {error ? <span className="text-red-300">({error})</span> : null}
        </div>
        <Pager total={resp.total} offset={resp.offset} limit={resp.limit} onOffset={setOffset} />
      </div>

      <ul className="mt-3 divide-y divide-white/10 rounded-lg border border-white/10 bg-white/5">
        {resp.items.map((e) => (
          <li key={e.id} className="p-3">
            <a className="flex flex-col gap-1 hover:bg-white/5 -m-3 p-3 rounded-lg" href={`${locale !== 'en' ? `/${locale}` : ''}/${game}/events/${e.id}`}>
              <span className="text-sm font-semibold">{e.name}</span>
              {e.description && (
                <span className="text-sm text-slate-300 line-clamp-2">{e.description}</span>
              )}
              {e.choices?.length > 0 && (
                <span className="text-xs text-slate-400">
                  {e.choices.length} {t('choices', locale)}
                </span>
              )}
            </a>
          </li>
        ))}
      </ul>

      <div className="mt-3 flex justify-end">
        <Pager total={resp.total} offset={resp.offset} limit={resp.limit} onOffset={setOffset} />
      </div>
    </div>
  );
}
