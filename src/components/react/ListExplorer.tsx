import React, { useMemo, useState } from 'react';
import { Pager, type ApiResp, useApiList, useUrlOffset } from './SimpleExplorer';
import { t } from '../../lib/ui-strings';

export type ExplorerFilters = Record<string, string>;

export type FilterConfig = {
  key: string;
  type: 'text' | 'select';
  placeholder?: string;
  allLabel?: string;
  options?: { value: string; label: string }[];
};

export function cap(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

const colorClasses: Record<string, string> = {
  ironclad: 'bg-red-500/15 text-red-200 ring-red-500/30',
  silent: 'bg-green-500/15 text-green-200 ring-green-500/30',
  defect: 'bg-blue-500/15 text-blue-200 ring-blue-500/30',
  watcher: 'bg-purple-500/15 text-purple-200 ring-purple-500/30',
  necrobinder: 'bg-purple-500/15 text-purple-200 ring-purple-500/30',
  regent: 'bg-amber-500/15 text-amber-200 ring-amber-500/30',
  colorless: 'bg-zinc-400/15 text-zinc-100 ring-zinc-400/30',
  curse: 'bg-zinc-800/60 text-zinc-200 ring-zinc-700/40',
  status: 'bg-slate-500/15 text-slate-200 ring-slate-500/30',
};

export function Badge({
  label,
  locale = 'en',
  className = 'bg-white/10 text-slate-200 ring-white/10',
  tone,
  translate = false,
  rounded = 'rounded',
}: {
  label: string;
  locale?: string;
  className?: string;
  tone?: string;
  translate?: boolean;
  rounded?: 'rounded' | 'rounded-full';
}) {
  const cls = tone && colorClasses[tone] ? colorClasses[tone] : className;
  const text = translate ? t(cap(label), locale) : label;
  return <span className={`inline-flex items-center ${rounded} px-1.5 py-0.5 text-xs ring-1 ${cls}`}>{text}</span>;
}

export default function ListExplorer<T>(props: {
  endpoint: string;
  game: 'sts1' | 'sts2';
  locale: string;
  title: string;
  pathSegment?: string;
  filters: FilterConfig[];
  limit?: number;
  initial?: ApiResp<T>;
  clientFilter?: (item: T, filters: ExplorerFilters) => boolean;
  renderItem: (item: T, locale: string, langPrefix: string) => React.ReactNode;
  getItemKey: (item: T) => string;
  itemClassName?: string | ((item: T) => string);
  listClassName?: string;
  anchorClassName?: string;
}) {
  const {
    endpoint,
    game,
    locale,
    title,
    pathSegment = endpoint.split('/').pop() ?? '',
    filters,
    limit = 50,
    initial,
    clientFilter,
    renderItem,
    getItemKey,
    itemClassName = 'rounded-lg border border-white/[0.06] bg-white/[0.03] hover:bg-white/[0.06] hover:border-white/[0.12] transition-all',
    listClassName = 'mt-3 space-y-2',
    anchorClassName = 'flex items-center gap-3 p-3',
  } = props;

  const [offset, setOffset] = useUrlOffset(limit);
  const [filterValues, setFilterValues] = useState<ExplorerFilters>(() =>
    Object.fromEntries(filters.map((filter) => [filter.key, '']))
  );
  const [filtersOpen, setFiltersOpen] = useState(false);

  const queryParams = useMemo(() => {
    const params: Record<string, string | number | null> = {
      lang: locale !== 'en' ? locale : null,
      offset,
      limit,
    };

    for (const filter of filters) {
      params[filter.key] = filterValues[filter.key] || null;
    }

    return params;
  }, [filters, filterValues, limit, locale, offset]);

  const { data, loading, error } = useApiList<T>(endpoint, queryParams, initial);
  const resp = data ?? { total: 0, offset, limit, items: [] };
  const langPrefix = locale !== 'en' ? `/${locale}` : '';

  const filtered = useMemo(() => {
    if (!clientFilter) return resp;
    const items = resp.items.filter((item) => clientFilter(item, filterValues));
    return { ...resp, items, total: items.length };
  }, [clientFilter, filterValues, resp]);

  const hasActiveFilters = filters.some((filter) => !!filterValues[filter.key]);
  const extraFilters = filters.filter((filter) => filter.type !== 'text');
  const filterGridClass = extraFilters.length >= 3 ? 'md:grid-cols-3' : extraFilters.length === 2 ? 'md:grid-cols-2' : 'md:grid-cols-1';

  function updateFilter(key: string, value: string) {
    setOffset(0);
    setFilterValues((current) => ({ ...current, [key]: value }));
  }

  return (
    <div className="mt-4">
      <div className="sticky top-[53px] z-[5] -mx-4 border-b border-white/[0.06] bg-[rgb(var(--bg-base-rgb)/0.8)] px-4 py-3 backdrop-blur-xl">
        <div className="flex gap-2">
          <input
            className="flex-1 rounded-md border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-sm transition-colors focus:border-[rgb(var(--accent-rgb)/0.45)] focus:outline-none"
            placeholder={t('Search', locale) + ' ' + t(title, locale).toLowerCase() + '…'}
            value={filterValues.q ?? ''}
            onChange={(e) => updateFilter('q', e.target.value)}
          />
          {extraFilters.length > 0 && (
            <button
              className={`md:hidden rounded-md border px-3 py-2 text-xs font-medium transition-colors ${hasActiveFilters ? 'border-[rgb(var(--accent-rgb)/0.45)] bg-[rgb(var(--accent-rgb)/0.12)] text-[var(--accent-300)]' : 'border-white/[0.08] bg-white/[0.04] text-slate-400'}`}
              onClick={() => setFiltersOpen(!filtersOpen)}
            >
              ⚙ {hasActiveFilters ? '✦' : ''}
            </button>
          )}
        </div>

        {extraFilters.length > 0 && (
          <div className={`${filtersOpen ? 'grid' : 'hidden'} mt-2 grid-cols-1 gap-2 md:grid ${filterGridClass}`}>
            {extraFilters.map((filter) => (
              <select
                key={filter.key}
                className="rounded-md border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-sm transition-colors focus:border-[rgb(var(--accent-rgb)/0.45)] focus:outline-none"
                value={filterValues[filter.key] ?? ''}
                onChange={(e) => updateFilter(filter.key, e.target.value)}
              >
                <option value="">{filter.allLabel ? t(filter.allLabel, locale) : t('All', locale)}</option>
                {(filter.options ?? []).map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            ))}
          </div>
        )}
      </div>

      <div className="mt-3 flex items-center justify-between text-xs text-slate-300">
        <div>
          {loading ? t('Loading…', locale) : `${filtered.total} ${t('results', locale)}`}
          {error ? <span className="text-red-300"> ({error})</span> : null}
        </div>
        <Pager total={filtered.total} offset={filtered.offset} limit={filtered.limit} onOffset={setOffset} locale={locale} />
      </div>

      <ul className={listClassName}>
        {filtered.items.map((item) => {
          const className = typeof itemClassName === 'function' ? itemClassName(item) : itemClassName;
          return (
            <li key={getItemKey(item)} className={className}>
              <a className={anchorClassName} href={`${langPrefix}/${game}/${pathSegment}/${getItemKey(item)}`}>
                {renderItem(item, locale, langPrefix)}
              </a>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
