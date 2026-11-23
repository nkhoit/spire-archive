import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';
import { t } from '../../lib/ui-strings';
import { useApiList } from './SimpleExplorer';
import type { MetricSummary, StatRow, StatsPeriod, StatsSegment } from '../../lib/stats';

const CHARACTERS = [['all', 'All characters'], ['ironclad', 'Ironclad'], ['silent', 'Silent'], ['defect', 'Defect'], ['watcher', 'Watcher']];
const ASCENSIONS = [['all', 'All ascensions'], ['a0', 'Ascension 0'], ['a1_10', 'Ascension 1–10'], ['a11_19', 'Ascension 11–19'], ['a20', 'Ascension 20']];
const PAGE = 50;

// The page's locale; labels go through t() and fall back to English.
const LocaleContext = createContext('en');
const useT = () => { const locale = useContext(LocaleContext); return { locale, tr: (key: string) => t(key, locale) }; };

const METRICS: [string, string, (n: number, locale: string) => string][] = [
  ['deck_size', 'Deck size', String],
  ['cards_picked', 'Card rewards taken', String],
  ['upgraded_cards', 'Upgraded cards', String],
  ['attack_pct', 'Attacks in deck', (n) => `${n}%`],
  ['skill_pct', 'Skills in deck', (n) => `${n}%`],
  ['power_pct', 'Powers in deck', (n) => `${n}%`],
  ['avg_cost_x10', 'Average card cost', (n, locale) => fixed(n / 10, 1, locale)],
  ['relics', 'Relics', String],
  ['potions_used', 'Potions used', String],
  ['purges', 'Cards removed', String],
  ['rests', 'Campfire rests', String],
  ['smiths', 'Campfire upgrades', String],
  ['hp_pct_act1', 'HP after Act 1 boss', (n) => `${n}%`],
  ['hp_pct_act2', 'HP after Act 2 boss', (n) => `${n}%`],
  ['hp_pct_act3', 'HP after Act 3 boss', (n) => `${n}%`],
];

type Format = 'int' | 'num' | 'pct' | 'delta';
type Column = { key: string; label: string; format?: Format };

// Decimals follow the page locale too (45,3 % on /de), matching toLocaleString for integers.
const fixed = (n: number, digits: number, locale: string) => n.toLocaleString(locale, { minimumFractionDigits: digits, maximumFractionDigits: digits });
const pct = (n: number, locale: string) => `${fixed(n * 100, 1, locale)}%`;

function formatValue(value: string | number | null, format: Format | undefined, locale: string): string {
  if (value === null) return '—';
  if (typeof value === 'string') return value;
  if (format === 'pct') return pct(value, locale);
  if (format === 'delta') return `${value > 0 ? '+' : ''}${fixed(value * 100, 1, locale)} ${t('pts', locale)}`;
  if (format === 'num') return fixed(value, 2, locale);
  return value.toLocaleString(locale);
}

function Section({ title, note, children }: { title: string; note?: string; children: ReactNode }) {
  const { tr } = useT();
  return (
    <section className="mt-8">
      <h2 className="font-game text-lg font-semibold">{tr(title)}</h2>
      {note && <p className="mt-1 text-sm text-slate-400">{tr(note)}</p>}
      <div className="mt-3">{children}</div>
    </section>
  );
}

function StatTable({ title, columns, rows, linkBase, langPrefix, defaultSort }: {
  title: string;
  columns: Column[];
  rows: StatRow[];
  linkBase?: string;
  langPrefix: string;
  defaultSort: string;
}) {
  const { locale, tr } = useT();
  const [sort, setSort] = useState({ key: defaultSort, descending: true });
  const [query, setQuery] = useState('');
  const [showAll, setShowAll] = useState(false);

  const shown = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const matching = rows.filter((row) => String(row.name).toLowerCase().includes(needle));
    return [...matching].sort((a, b) => {
      const [x, y] = [a[sort.key], b[sort.key]];
      if (x === null || y === null) return x === y ? 0 : x === null ? 1 : -1;
      const order = typeof x === 'string' ? x.localeCompare(String(y)) : x - Number(y);
      return sort.descending ? -order : order;
    });
  }, [rows, query, sort]);

  if (rows.length === 0) return <p className="text-sm text-slate-400">{tr('Not enough runs in this selection.')}</p>;
  const visible = showAll ? shown : shown.slice(0, PAGE);

  return (
    <div>
      {rows.length > 10 && (
        <input
          className="mb-2 w-full rounded-md border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-sm sm:w-72"
          placeholder={`${tr('Filter')} ${tr(title).toLowerCase()}…`}
          aria-label={`${tr('Filter')} ${tr(title)}`}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      )}
      <div className="overflow-x-auto rounded-lg border border-white/[0.06]">
        <table className="w-full text-sm">
          <caption className="sr-only">{tr(title)}</caption>
          <thead className="bg-white/[0.04] text-xs text-slate-300">
            <tr>
              {columns.map((column, i) => (
                <th key={column.key} scope="col" className={`whitespace-nowrap px-3 py-2 ${i === 0 ? 'text-left' : 'text-right'}`} aria-sort={sort.key === column.key ? (sort.descending ? 'descending' : 'ascending') : undefined}>
                  <button type="button" className="hover:underline" onClick={() => setSort({ key: column.key, descending: sort.key === column.key ? !sort.descending : column.format !== undefined })}>
                    {tr(column.label)}{sort.key === column.key ? (sort.descending ? ' ↓' : ' ↑') : ''}
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visible.map((row, index) => (
              <tr key={`${row.name}-${index}`} className="border-t border-white/[0.06]">
                {columns.map((column, i) => (
                  <td key={column.key} className={`whitespace-nowrap px-3 py-1.5 ${i === 0 ? 'text-left' : 'text-right tabular-nums'}`}>
                    {i === 0 && linkBase && row.id ? <a className="theme-link hover:underline" href={`${langPrefix}/sts1/${linkBase}/${row.id}`}>{row.name}</a> : formatValue(row[column.key], column.format, locale)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {shown.length > PAGE && (
        <button type="button" className="mt-2 text-sm theme-link hover:underline" onClick={() => setShowAll(!showAll)}>
          {showAll ? tr('Show fewer') : `${tr('Show all')} ${shown.length.toLocaleString(locale)}`}
        </button>
      )}
    </div>
  );
}

function BarChart({ title, data, unit, xLabel }: { title: string; data: [number, number][]; unit: (y: number) => string; xLabel: string }) {
  const { tr } = useT();
  if (data.length === 0) return <p className="text-sm text-slate-400">{tr('No winning runs in this selection.')}</p>;
  const top = Math.max(...data.map(([, y]) => y));
  const peak = data.find(([, y]) => y === top)!;
  return (
    <figure>
      <div role="img" aria-label={`${tr(title)}: ${tr(xLabel)} ${data[0][0]}–${data[data.length - 1][0]}, ${tr('peak')} ${tr(xLabel)} ${peak[0]} (${unit(peak[1])}).`} className="flex h-36 items-end gap-[2px]">
        {data.map(([x, y]) => (
          <div key={x} title={`${tr(xLabel)} ${x}: ${unit(y)}`} className="flex h-full min-w-0 flex-1 items-end hover:bg-white/[0.05]">
            <div className="w-full rounded-t bg-[var(--accent-300)]" style={{ height: `${Math.max(1, (y / top) * 100)}%` }} />
          </div>
        ))}
      </div>
      <figcaption className="mt-1 flex justify-between border-t border-white/10 pt-1 text-xs text-slate-400">
        <span>{data[0][0]}</span><span>{tr(xLabel)}</span><span>{data[data.length - 1][0]}</span>
      </figcaption>
    </figure>
  );
}

function Tile({ label, value }: { label: string; value: string }) {
  const { tr } = useT();
  return (
    <div className="rounded-lg border border-white/[0.06] bg-white/[0.03] p-3">
      <div className="text-xs text-slate-400">{tr(label)}</div>
      <div className="mt-1 font-game text-2xl font-semibold">{value}</div>
    </div>
  );
}

function summaryCell(summary: MetricSummary, format: (n: number, locale: string) => string, locale: string) {
  if (!summary) return '—';
  return `${format(summary.median, locale)} (${format(summary.p10, locale)}–${format(summary.p90, locale)})`;
}

const ENTITY_COLUMNS: Column[] = [
  { key: 'name', label: 'Name' },
  { key: 'runs', label: 'Runs', format: 'int' },
  { key: 'run_rate', label: 'Share of runs', format: 'pct' },
  { key: 'win_rate', label: 'Win rate', format: 'pct' },
  { key: 'win_delta', label: 'vs average', format: 'delta' },
];
const FIGHT_COLUMNS: Column[] = [
  { key: 'fights', label: 'Fights', format: 'int' },
  { key: 'avg_turns', label: 'Avg turns', format: 'num' },
  { key: 'avg_damage', label: 'Damage taken / fight', format: 'num' },
  { key: 'damage_per_turn', label: 'Damage taken / turn', format: 'num' },
];

// Cards buffed by Patch V2.2 (30 Nov 2020), after the run dump ends; their stats predate the buff.
const BUFFED_AFTER_DUMP = new Set(['ACCURACY', 'AGGREGATE', 'BLADE_DANCE', 'BLOODLETTING', 'DRAMATIC_ENTRANCE', 'EVISCERATE', 'GOOD_INSTINCTS', 'HEMOKINESIS', 'PHANTASMAL_KILLER', 'REFLEX', 'REPROGRAM', 'RUPTURE', 'SADISTIC_NATURE', 'SCRAPE', 'SLICE', 'UNDERHANDED_STRIKE', 'STORM_OF_STEEL', 'SWIFT_STRIKE']);

// Literal keys so translators can find them.
const FIGHT_TYPE: Record<string, string> = { normal: 'Normal', elite: 'Elite', boss: 'Boss' };

function periodLabel({ id, runs }: StatsPeriod, tr: (key: string) => string, locale: string) {
  return `${id === 'all' ? tr('All patches') : `${tr('Patches from')} ${id.replace('-', ' ')}`} (${runs.toLocaleString(locale)} ${tr('runs')})`;
}

export default function StatsExplorer({ locale = 'en', ...props }: { initial: StatsSegment; periods: StatsPeriod[]; langPrefix: string; locale?: string }) {
  return <LocaleContext.Provider value={locale}><Explorer {...props} /></LocaleContext.Provider>;
}

function Explorer({ initial, periods, langPrefix }: { initial: StatsSegment; periods: StatsPeriod[]; langPrefix: string }) {
  const { locale, tr } = useT();
  const [character, setCharacter] = useState('all');
  const [ascension, setAscension] = useState('all');
  const [period, setPeriod] = useState('all');
  const params = useMemo(() => ({ character, ascension, period }), [character, ascension, period]);
  const { data, loading, error } = useApiList<never>('/api/sts1/stats', params) as unknown as { data: StatsSegment | { error: string } | null; loading: boolean; error: string | null };

  // useApiList starts empty; the first fetch is the same segment the server rendered.
  const segment = loading && !data ? initial : data && 'runs' in data ? data : null;
  const selectClass = 'rounded-md border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-sm';
  const deckMedian = segment?.metrics.deck_size?.win?.median;

  const acts = (segment?.acts ?? []).map((row) => ({ ...row, name: `${tr('Act')} ${row.act} ${tr(FIGHT_TYPE[String(row.type)] ?? String(row.type))}` }));

  return (
    <div className="mt-4">
      <div className="explorer-toolbar grid grid-cols-1 gap-2 sm:grid-cols-3">
        <select aria-label={tr('Game version')} className={selectClass} value={period} onChange={(e) => setPeriod(e.target.value)}>
          {periods.map((option) => <option key={option.id} value={option.id}>{periodLabel(option, tr, locale)}</option>)}
        </select>
        <select aria-label={tr('Character')} className={selectClass} value={character} onChange={(e) => setCharacter(e.target.value)}>
          {CHARACTERS.map(([value, label]) => <option key={value} value={value}>{tr(label)}</option>)}
        </select>
        <select aria-label={tr('Ascension')} className={selectClass} value={ascension} onChange={(e) => setAscension(e.target.value)}>
          {ASCENSIONS.map(([value, label]) => <option key={value} value={value}>{tr(label)}</option>)}
        </select>
      </div>

      {error && <p className="mt-4 text-sm text-red-300">{tr('Could not load statistics.')}</p>}
      {!segment ? (
        <p className="mt-4 text-sm text-slate-300">{loading ? tr('Loading…') : tr('No runs match this selection.')}</p>
      ) : (
        <>
          <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
            <Tile label="Runs" value={segment.runs.toLocaleString(locale)} />
            <Tile label="Win rate" value={pct(segment.win_rate, locale)} />
            <Tile label="Median winning deck" value={deckMedian === undefined ? '—' : `${deckMedian} ${tr('cards')}`} />
            <Tile label="Wins" value={segment.wins.toLocaleString(locale)} />
          </div>

          <Section title="Design benchmarks" note="Median, with the 10th–90th percentile range in brackets.">
            <div className="overflow-x-auto rounded-lg border border-white/[0.06]">
              <table className="w-full text-sm">
                <caption className="sr-only">{tr('Design benchmarks for winning and losing runs')}</caption>
                <thead className="bg-white/[0.04] text-xs text-slate-300">
                  <tr><th scope="col" className="px-3 py-2 text-left">{tr('Measure')}</th><th scope="col" className="px-3 py-2 text-right">{tr('Winning runs')}</th><th scope="col" className="px-3 py-2 text-right">{tr('Losing runs')}</th></tr>
                </thead>
                <tbody>
                  {METRICS.filter(([key]) => segment.metrics[key]).map(([key, label, format]) => (
                    <tr key={key} className="border-t border-white/[0.06]">
                      <td className="whitespace-nowrap px-3 py-1.5">{tr(label)}</td>
                      <td className="whitespace-nowrap px-3 py-1.5 text-right tabular-nums">{summaryCell(segment.metrics[key].win, format, locale)}</td>
                      <td className="whitespace-nowrap px-3 py-1.5 text-right tabular-nums">{summaryCell(segment.metrics[key].loss, format, locale)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Section>

          <div className="grid gap-x-8 md:grid-cols-2">
            <Section title="Deck size in winning runs">
              <BarChart title="Deck size in winning runs" data={segment.deck_size_wins} xLabel="Cards" unit={(y) => `${y.toLocaleString(locale)} ${tr('wins')}`} />
            </Section>
            <Section title="Share of runs reaching each floor">
              <BarChart title="Share of runs reaching each floor" data={segment.survival} xLabel="Floor" unit={(y) => `${pct(y, locale)} ${tr('of runs')}`} />
            </Section>
          </div>

          <Section title="Damage by act" note="Damage taken is measured from the run data.">
            <StatTable title="Damage by act" columns={[{ key: 'name', label: 'Fight' }, ...FIGHT_COLUMNS]} rows={acts} langPrefix={langPrefix} defaultSort="fights" />
          </Section>

          <Section title="Encounters" note="The data does not record damage dealt. Damage needed per turn is an estimate: base enemy HP ÷ average turns. It ignores Ascension HP, block and overkill, is too low for bosses that split, have phases or summon, and is blank for groups with random members.">
            <StatTable
              title="Encounters"
              columns={[{ key: 'name', label: 'Enemies' }, ...FIGHT_COLUMNS, { key: 'est_enemy_hp', label: 'Est. enemy HP', format: 'num' }, { key: 'est_damage_needed_per_turn', label: 'Est. damage needed / turn', format: 'num' }]}
              rows={segment.encounters}
              langPrefix={langPrefix}
              defaultSort="fights"
            />
          </Section>

          <Section title="Cards" note="Win rates are correlations. Final decks over-represent runs that lasted long enough to collect them, so pick rate is the cleaner signal. † Changed by Patch V2.2 (November 2020), after this data was collected.">
            <StatTable
              title="Cards"
              columns={[{ key: 'name', label: 'Card' }, { key: 'offered', label: 'Offered', format: 'int' }, { key: 'pick_rate', label: 'Pick rate', format: 'pct' }, { key: 'decks', label: 'In decks', format: 'int' }, { key: 'win_rate', label: 'Win rate', format: 'pct' }, { key: 'win_delta', label: 'vs average', format: 'delta' }, { key: 'avg_copies', label: 'Avg copies', format: 'num' }, { key: 'upgrade_rate', label: 'Upgraded', format: 'pct' }]}
              rows={segment.cards.map((row) => (BUFFED_AFTER_DUMP.has(String(row.id)) ? { ...row, name: `${row.name} †` } : row))}
              linkBase="cards"
              langPrefix={langPrefix}
              defaultSort="decks"
            />
          </Section>

          <Section title="Relics"><StatTable title="Relics" columns={ENTITY_COLUMNS} rows={segment.relics} linkBase="relics" langPrefix={langPrefix} defaultSort="runs" /></Section>
          <Section title="Potions"><StatTable title="Potions" columns={ENTITY_COLUMNS} rows={segment.potions} linkBase="potions" langPrefix={langPrefix} defaultSort="runs" /></Section>
          <Section title="Neow bonuses"><StatTable title="Neow bonuses" columns={ENTITY_COLUMNS} rows={segment.neow} langPrefix={langPrefix} defaultSort="runs" /></Section>
          <Section title="Most common killers">
            <StatTable title="Killers" columns={[{ key: 'name', label: 'Enemy' }, { key: 'runs', label: 'Deaths', format: 'int' }, { key: 'death_rate', label: 'Share of deaths', format: 'pct' }]} rows={segment.killed_by} langPrefix={langPrefix} defaultSort="runs" />
          </Section>
        </>
      )}
    </div>
  );
}
