import { useCallback, useEffect, useMemo, useState } from 'react';
import { t } from '../../lib/ui-strings';

type ApiResp<T> = { total: number; offset: number; limit: number; items: T[] };

function buildUrl(base: string, params: Record<string, string | number | null>) {
  const u = new URL(base, window.location.origin);
  for (const [k, v] of Object.entries(params)) {
    if (v === null || v === '') continue;
    u.searchParams.set(k, String(v));
  }
  return u.toString();
}

export function useApiList<T>(
  endpoint: string,
  params: Record<string, string | number | null>,
  initial?: ApiResp<T>
) {
  const [data, setData] = useState<ApiResp<T> | null>(initial ?? null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const key = useMemo(() => JSON.stringify({ endpoint, ...params }), [endpoint, params]);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError(null);
    fetch(buildUrl(endpoint, params))
      .then((r) => r.json())
      .then((json) => {
        if (!alive) return;
        setData(json);
      })
      .catch((e) => {
        if (!alive) return;
        setError(String(e));
      })
      .finally(() => {
        if (!alive) return;
        setLoading(false);
      });
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return { data, loading, error };
}

export function useUrlOffset(limit: number): [number, (n: number) => void] {
  const [offset, setOffsetRaw] = useState(() => {
    if (typeof window === 'undefined') return 0;
    const p = new URLSearchParams(window.location.search).get('page');
    const page = p ? parseInt(p, 10) : 1;
    return (Math.max(1, page) - 1) * limit;
  });

  const setOffset = useCallback((n: number) => {
    setOffsetRaw(n);
    const page = Math.floor(n / limit) + 1;
    const url = new URL(window.location.href);
    if (page <= 1) url.searchParams.delete('page');
    else url.searchParams.set('page', String(page));
    window.history.pushState({ page }, '', url.toString());
  }, [limit]);

  // Handle browser back/forward
  useEffect(() => {
    const onPop = () => {
      const p = new URLSearchParams(window.location.search).get('page');
      const page = p ? parseInt(p, 10) : 1;
      setOffsetRaw((Math.max(1, page) - 1) * limit);
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, [limit]);

  return [offset, setOffset];
}

export function Pager(props: {
  total: number;
  offset: number;
  limit: number;
  onOffset: (n: number) => void;
  locale?: string;
}) {
  const locale = props.locale ?? 'en';
  const canPrev = props.offset > 0;
  const canNext = props.offset + props.limit < props.total;
  return (
    <div className="flex gap-2">
      <button
        className="rounded-md border border-white/10 bg-white/5 px-2 py-1 disabled:opacity-40"
        disabled={!canPrev}
        onClick={() => props.onOffset(Math.max(0, props.offset - props.limit))}
      >
        {t('Prev', locale)}
      </button>
      <button
        className="rounded-md border border-white/10 bg-white/5 px-2 py-1 disabled:opacity-40"
        disabled={!canNext}
        onClick={() => props.onOffset(props.offset + props.limit)}
      >
        {t('Next', locale)}
      </button>
    </div>
  );
}
