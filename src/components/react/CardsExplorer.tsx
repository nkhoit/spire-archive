import React, { useEffect, useMemo, useState } from 'react';
import CssCardRenderer from './CssCardRenderer';
import { t } from '../../lib/ui-strings';
import { useUrlOffset, type ApiResp } from './SimpleExplorer';

type Card = {
  id: string;
  name: string;
  description: string;
  cost: number | null;
  type: string;
  rarity: string;
  color: string;
  vars?: Record<string, number>;
  keywords?: string[];
  tags?: string[];
  upgrade?: Record<string, any> | null;
  image_url?: string | null;
  star_cost?: number | null;
};

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

// STS1 energy rendering helper (used in description previews if needed)
const sts1EnergyMap: Record<string, string> = {
  '[R]': '/images/sts1/cardui/card_red_orb.png',
  '[G]': '/images/sts1/cardui/card_green_orb.png',
  '[B]': '/images/sts1/cardui/card_blue_orb.png',
  '[W]': '/images/sts1/cardui/card_purple_orb.png',
};

export function renderEnergy(text: string): string {
  let html = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  for (const [token, imgPath] of Object.entries(sts1EnergyMap)) {
    const escaped = token.replace('[', '\\[').replace(']', '\\]');
    html = html.replace(new RegExp(escaped, 'g'),
      `<img src="${imgPath}" alt="${token}" style="display:inline-block;height:1.1em;width:1.1em;vertical-align:text-bottom" />`);
  }
  return html.replace(/\n/g, ' ');
}

function cap(s: string) { return s.charAt(0).toUpperCase() + s.slice(1); }

function BadgeSpan({ label, tone, locale }: { label: string; tone?: string; locale?: string }) {
  const cls = tone && colorClasses[tone] ? colorClasses[tone] : 'bg-white/10 text-slate-200 ring-white/10';
  return <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs ring-1 ${cls}`}>{t(cap(label), locale ?? 'en')}</span>;
}

function CardTile({ c, game, isMobile, upgraded, locale }: { c: Card; game: string; isMobile: boolean; upgraded: boolean; locale: string }) {
  const hasUpgrade = c.upgrade && Object.keys(c.upgrade).length > 0;
  const showUpgraded = upgraded && hasUpgrade;

  return (
    <div className="card-tilt group flex flex-col items-center rounded-lg border border-white/[0.06] bg-white/[0.03] p-2 sm:p-3 hover:bg-white/[0.06] hover:border-white/[0.12] transition-all">
      <a href={(locale !== 'en' ? '/' + locale : '') + '/' + game + '/cards/' + c.id} className="card-render-wrap w-full flex justify-center overflow-visible">
        <CssCardRenderer card={c} upgraded={!!showUpgraded} size={isMobile ? 'xs' : 'sm'} game={game as 'sts1' | 'sts2'} locale={locale} />
      </a>
      <div className="mt-2 flex flex-wrap items-center justify-center gap-1">
        <BadgeSpan label={c.color} tone={c.color} locale={locale} />
        <BadgeSpan label={c.type} locale={locale} />
        <BadgeSpan label={c.rarity} locale={locale} />
        <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs ring-1 bg-white/10 text-slate-200 ring-white/10">{t('Cost', locale)} {c.cost ?? 'X'}</span>
      </div>
    </div>
  );
}

function UpgradeToggle({ checked, onChange, game, locale }: { checked: boolean; onChange: (v: boolean) => void; game: string; locale?: string }) {
  const isSts2 = game === 'sts2';
  const checkboxSrc = isSts2
    ? checked ? '/images/sts2/ui/checkbox_ticked.png' : '/images/sts2/ui/checkbox_unticked.png'
    : null;

  return (
    <button
      onClick={() => onChange(!checked)}
      className="fixed bottom-6 left-6 z-50 flex items-center gap-2 rounded-lg border border-[rgb(var(--accent-rgb)/0.35)] bg-[rgb(var(--bg-base-rgb)/0.9)] backdrop-blur-sm px-4 py-2.5 shadow-lg shadow-black/50 transition-all hover:border-[rgb(var(--accent-rgb)/0.5)] hover:bg-[rgb(var(--bg-base-rgb)/0.96)] active:scale-95"
      style={{ fontFamily: "'KreonGame', 'Kreon', serif" }}
    >
      {checkboxSrc ? (
        <img src={checkboxSrc} alt="" className="w-7 h-7" style={{ imageRendering: 'pixelated' }} />
      ) : (
        <span className={`w-5 h-5 rounded border-2 flex items-center justify-center text-xs font-bold ${checked ? 'border-emerald-400 bg-emerald-500/20 text-emerald-300' : 'border-slate-500 bg-white/5'}`}>
          {checked ? '✓' : ''}
        </span>
      )}
      <span className="text-base font-semibold text-[var(--accent-300)]">
        {t('View Upgrades', locale)}
      </span>
    </button>
  );
}

function buildUrl(base: string, params: Record<string, string | number | null>) {
  const u = new URL(base, window.location.origin);
  for (const [k, v] of Object.entries(params)) {
    if (v === null || v === '') continue;
    u.searchParams.set(k, String(v));
  }
  return u.toString();
}

export default function CardsExplorer(props: {
  game?: 'sts1' | 'sts2';
  locale?: string;
  initial?: ApiResp<Card>;
  colors: string[];
  types: string[];
  rarities: string[];
}) {
  const game = props.game ?? 'sts1';
  const locale = props.locale ?? 'en';
  const [q, setQ] = useState('');
  const [color, setColor] = useState('');
  const [type, setType] = useState('');
  const [rarity, setRarity] = useState('');
  const [cost, setCost] = useState<string>('');
  const limit = 100;
  const [offset, setOffset] = useUrlOffset(limit);
  const [upgraded, setUpgraded] = useState(false);

  const [data, setData] = useState<ApiResp<Card> | null>(props.initial ?? null);
  const [loading, setLoading] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 640);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);
  const [error, setError] = useState<string | null>(null);

  const queryKey = useMemo(
    () => JSON.stringify({ q, color, type, rarity, cost, offset, limit, locale }),
    [q, color, type, rarity, cost, offset, limit, locale]
  );

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError(null);
    fetch(
      buildUrl(`/api/${game}/cards`, {
        q: q || null,
        color: color || null,
        type: type || null,
        rarity: rarity || null,
        cost: cost ? Number(cost) : null,
        lang: locale !== 'en' ? locale : null,
        offset,
        limit,
      })
    )
      .then((r) => r.json())
      .then((json) => { if (alive) setData(json); })
      .catch((e) => { if (alive) setError(String(e)); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queryKey]);

  const total = data?.total ?? 0;
  const canPrev = offset > 0;
  const canNext = offset + limit < total;

  const [filtersOpen, setFiltersOpen] = React.useState(false);
  const hasActiveFilters = color || type || rarity || cost;

  return (
    <div className="mt-4">
      <div className="sticky top-[53px] z-[5] -mx-4 px-4 py-3 bg-[rgb(var(--bg-base-rgb)/0.8)] backdrop-blur-xl border-b border-white/[0.06]">
        <div className="flex gap-2">
          <input
            className="flex-1 rounded-md border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-sm focus:border-[rgb(var(--accent-rgb)/0.45)] focus:outline-none transition-colors"
            placeholder={t('Search', locale) + ' ' + t('Cards', locale).toLowerCase() + '…'}
            value={q}
            onChange={(e) => { setOffset(0); setQ(e.target.value); }}
          />
          <button
            className={`md:hidden rounded-md border px-3 py-2 text-xs font-medium transition-colors ${hasActiveFilters ? 'border-[rgb(var(--accent-rgb)/0.45)] bg-[rgb(var(--accent-rgb)/0.12)] text-[var(--accent-300)]' : 'border-white/[0.08] bg-white/[0.04] text-slate-400'}`}
            onClick={() => setFiltersOpen(!filtersOpen)}
          >
            ⚙ {hasActiveFilters ? '✦' : ''}
          </button>
        </div>
        <div className={`${filtersOpen ? 'grid' : 'hidden'} md:grid grid-cols-1 gap-2 md:grid-cols-4 mt-2`}>
        <select
          className="rounded-md border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-sm focus:border-[rgb(var(--accent-rgb)/0.45)] focus:outline-none transition-colors"
          value={color}
          onChange={(e) => { setOffset(0); setColor(e.target.value); }}
        >
          <option value="">{t('All colors', locale)}</option>
          {props.colors.map((c) => (
            <option key={c} value={c}>{t(cap(c), locale)}</option>
          ))}
        </select>
        <select
          className="rounded-md border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-sm focus:border-[rgb(var(--accent-rgb)/0.45)] focus:outline-none transition-colors"
          value={type}
          onChange={(e) => { setOffset(0); setType(e.target.value); }}
        >
          <option value="">{t('All Types', locale)}</option>
          {props.types.map((tp) => (
            <option key={tp} value={tp}>{t(tp, locale)}</option>
          ))}
        </select>
        <select
          className="rounded-md border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-sm focus:border-[rgb(var(--accent-rgb)/0.45)] focus:outline-none transition-colors"
          value={rarity}
          onChange={(e) => { setOffset(0); setRarity(e.target.value); }}
        >
          <option value="">{t('All Rarities', locale)}</option>
          {props.rarities.map((r) => (
            <option key={r} value={r}>{t(r, locale)}</option>
          ))}
        </select>
        <input
          className="rounded-md border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-sm focus:border-[rgb(var(--accent-rgb)/0.45)] focus:outline-none transition-colors"
          placeholder={t('Cost (exact)', locale)}
          value={cost}
          onChange={(e) => { setOffset(0); setCost(e.target.value.replace(/[^0-9\-]/g, '')); }}
        />
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between text-xs text-slate-300">
        <div>
          {loading ? t('Loading…', locale) : `${total} ${t('results', locale)}`}{' '}
          {error ? <span className="text-red-300">({error})</span> : null}
        </div>
        <div className="flex gap-2">
          <button
            className="rounded-md border border-white/10 bg-white/5 px-2 py-1 disabled:opacity-40"
            disabled={!canPrev}
            onClick={() => setOffset(Math.max(0, offset - limit))}
          >{t('Prev', locale)}</button>
          <button
            className="rounded-md border border-white/10 bg-white/5 px-2 py-1 disabled:opacity-40"
            disabled={!canNext}
            onClick={() => setOffset(offset + limit)}
          >{t('Next', locale)}</button>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 sm:gap-5">
        {(data?.items ?? []).map((c) => (
          <CardTile key={c.id} c={c} game={game} isMobile={isMobile} upgraded={upgraded} locale={locale} />
        ))}
      </div>

      <UpgradeToggle checked={upgraded} onChange={setUpgraded} game={game} locale={locale} />
    </div>
  );
}
