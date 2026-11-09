import { useMemo, useState, type ReactNode } from 'react';
import { useApiList } from './SimpleExplorer';
import type { MetricSummary, StatRow, StatsPeriod, StatsSegment } from '../../lib/stats';

const CHARACTERS = [['all', 'All characters'], ['ironclad', 'Ironclad'], ['silent', 'Silent'], ['defect', 'Defect'], ['watcher', 'Watcher']];
const ASCENSIONS = [['all', 'All ascensions'], ['a0', 'Ascension 0'], ['a1_10', 'Ascension 1–10'], ['a11_19', 'Ascension 11–19'], ['a20', 'Ascension 20']];
const PAGE = 50;

const METRICS: [string, string, (n: number) => string][] = [
  ['deck_size', 'Deck size', String],
  ['cards_picked', 'Card rewards taken', String],
  ['upgraded_cards', 'Upgraded cards', String],
  ['attack_pct', 'Attacks in deck', (n) => `${n}%`],
  ['skill_pct', 'Skills in deck', (n) => `${n}%`],
  ['power_pct', 'Powers in deck', (n) => `${n}%`],
  ['avg_cost_x10', 'Average card cost', (n) => (n / 10).toFixed(1)],
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

function formatValue(value: string | number | null, format?: Format): string {
  if (value === null) return '—';
  if (typeof value === 'string') return value;
  if (format === 'pct') return `${(value * 100).toFixed(1)}%`;
  if (format === 'delta') return `${value > 0 ? '+' : ''}${(value * 100).toFixed(1)} pts`;
  if (format === 'num') return value.toFixed(2);
  return value.toLocaleString('en');
}

function Section({ title, note, children }: { title: string; note?: string; children: ReactNode }) {
  return (
    <section className="mt-8">
      <h2 className="font-game text-lg font-semibold">{title}</h2>
      {note && <p className="mt-1 text-sm text-slate-400">{note}</p>}
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

  if (rows.length === 0) return <p className="text-sm text-slate-400">Not enough runs in this selection.</p>;
  const visible = showAll ? shown : shown.slice(0, PAGE);

  return (
    <div>
      {rows.length > 10 && (
        <input
          className="mb-2 w-full rounded-md border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-sm sm:w-72"
          placeholder={`Filter ${title.toLowerCase()}…`}
          aria-label={`Filter ${title}`}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      )}
      <div className="overflow-x-auto rounded-lg border border-white/[0.06]">
        <table className="w-full text-sm">
          <caption className="sr-only">{title}</caption>
          <thead className="bg-white/[0.04] text-xs text-slate-300">
            <tr>
              {columns.map((column, i) => (
                <th key={column.key} scope="col" className={`whitespace-nowrap px-3 py-2 ${i === 0 ? 'text-left' : 'text-right'}`} aria-sort={sort.key === column.key ? (sort.descending ? 'descending' : 'ascending') : undefined}>
                  <button type="button" className="hover:underline" onClick={() => setSort({ key: column.key, descending: sort.key === column.key ? !sort.descending : column.format !== undefined })}>
                    {column.label}{sort.key === column.key ? (sort.descending ? ' ↓' : ' ↑') : ''}
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
                    {i === 0 && linkBase && row.id ? <a className="theme-link hover:underline" href={`${langPrefix}/sts1/${linkBase}/${row.id}`}>{row.name}</a> : formatValue(row[column.key], column.format)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {shown.length > PAGE && (
        <button type="button" className="mt-2 text-sm theme-link hover:underline" onClick={() => setShowAll(!showAll)}>
          {showAll ? 'Show fewer' : `Show all ${shown.length}`}
        </button>
      )}
    </div>
  );
}

function BarChart({ title, data, unit, xLabel }: { title: string; data: [number, number][]; unit: (y: number) => string; xLabel: string }) {
  if (data.length === 0) return <p className="text-sm text-slate-400">No winning runs in this selection.</p>;
  const top = Math.max(...data.map(([, y]) => y));
  const peak = data.find(([, y]) => y === top)!;
  return (
    <figure>
      <div role="img" aria-label={`${title}. ${data.length} bars from ${xLabel} ${data[0][0]} to ${data[data.length - 1][0]}, peaking at ${xLabel} ${peak[0]} with ${unit(peak[1])}.`} className="flex h-36 items-end gap-[2px]">
        {data.map(([x, y]) => (
          <div key={x} title={`${xLabel} ${x}: ${unit(y)}`} className="flex h-full min-w-0 flex-1 items-end hover:bg-white/[0.05]">
            <div className="w-full rounded-t bg-[var(--accent-300)]" style={{ height: `${Math.max(1, (y / top) * 100)}%` }} />
          </div>
        ))}
      </div>
      <figcaption className="mt-1 flex justify-between border-t border-white/10 pt-1 text-xs text-slate-400">
        <span>{data[0][0]}</span><span>{xLabel}</span><span>{data[data.length - 1][0]}</span>
      </figcaption>
    </figure>
  );
}

function Tile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-white/[0.06] bg-white/[0.03] p-3">
      <div className="text-xs text-slate-400">{label}</div>
      <div className="mt-1 font-game text-2xl font-semibold">{value}</div>
    </div>
  );
}

function summaryCell(summary: MetricSummary, format: (n: number) => string) {
  if (!summary) return '—';
  return `${format(summary.median)} (${format(summary.p10)}–${format(summary.p90)})`;
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

function periodLabel({ id, runs }: StatsPeriod) {
  return `${id === 'all' ? 'All patches' : `Patches from ${id.replace('-', ' ')}`} (${runs.toLocaleString('en')} runs)`;
}

export default function StatsExplorer({ initial, periods, langPrefix }: { initial: StatsSegment; periods: StatsPeriod[]; langPrefix: string }) {
  const [character, setCharacter] = useState('all');
  const [ascension, setAscension] = useState('all');
  const [period, setPeriod] = useState('all');
  const params = useMemo(() => ({ character, ascension, period }), [character, ascension, period]);
  const { data, loading, error } = useApiList<never>('/api/sts1/stats', params) as unknown as { data: StatsSegment | null; loading: boolean; error: string | null };

  // useApiList starts empty; the first fetch is the same segment the server rendered.
  const segment = loading && !data ? initial : data;
  const selectClass = 'rounded-md border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-sm';
  const deckMedian = segment?.metrics.deck_size?.win?.median;

  const acts = (segment?.acts ?? []).map((row) => ({ ...row, name: `Act ${row.act} ${row.type}` }));

  return (
    <div className="mt-4">
      <div className="explorer-toolbar grid grid-cols-1 gap-2 sm:grid-cols-3">
        <select aria-label="Game version" className={selectClass} value={period} onChange={(e) => setPeriod(e.target.value)}>
          {periods.map((option) => <option key={option.id} value={option.id}>{periodLabel(option)}</option>)}
        </select>
        <select aria-label="Character" className={selectClass} value={character} onChange={(e) => setCharacter(e.target.value)}>
          {CHARACTERS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
        <select aria-label="Ascension" className={selectClass} value={ascension} onChange={(e) => setAscension(e.target.value)}>
          {ASCENSIONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
      </div>

      {error && <p className="mt-4 text-sm text-red-300">{error}</p>}
      {!segment ? (
        <p className="mt-4 text-sm text-slate-300">{loading ? 'Loading…' : 'No runs match this selection.'}</p>
      ) : (
        <>
          <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
            <Tile label="Runs" value={segment.runs.toLocaleString('en')} />
            <Tile label="Win rate" value={`${(segment.win_rate * 100).toFixed(1)}%`} />
            <Tile label="Median winning deck" value={deckMedian === undefined ? '—' : `${deckMedian} cards`} />
            <Tile label="Wins" value={segment.wins.toLocaleString('en')} />
          </div>

          <Section title="Design benchmarks" note="Median, with the 10th–90th percentile range in brackets.">
            <div className="overflow-x-auto rounded-lg border border-white/[0.06]">
              <table className="w-full text-sm">
                <caption className="sr-only">Design benchmarks for winning and losing runs</caption>
                <thead className="bg-white/[0.04] text-xs text-slate-300">
                  <tr><th scope="col" className="px-3 py-2 text-left">Measure</th><th scope="col" className="px-3 py-2 text-right">Winning runs</th><th scope="col" className="px-3 py-2 text-right">Losing runs</th></tr>
                </thead>
                <tbody>
                  {METRICS.filter(([key]) => segment.metrics[key]).map(([key, label, format]) => (
                    <tr key={key} className="border-t border-white/[0.06]">
                      <td className="whitespace-nowrap px-3 py-1.5">{label}</td>
                      <td className="whitespace-nowrap px-3 py-1.5 text-right tabular-nums">{summaryCell(segment.metrics[key].win, format)}</td>
                      <td className="whitespace-nowrap px-3 py-1.5 text-right tabular-nums">{summaryCell(segment.metrics[key].loss, format)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Section>

          <div className="grid gap-x-8 md:grid-cols-2">
            <Section title="Deck size in winning runs">
              <BarChart title="Deck size in winning runs" data={segment.deck_size_wins} xLabel="Cards" unit={(y) => `${y.toLocaleString('en')} wins`} />
            </Section>
            <Section title="Share of runs reaching each floor">
              <BarChart title="Share of runs reaching each floor" data={segment.survival} xLabel="Floor" unit={(y) => `${(y * 100).toFixed(1)}% of runs`} />
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

          <Section title="Cards" note="Win rates are correlations. Final decks over-represent runs that lasted long enough to collect them, so pick rate is the cleaner signal.">
            <StatTable
              title="Cards"
              columns={[{ key: 'name', label: 'Card' }, { key: 'offered', label: 'Offered', format: 'int' }, { key: 'pick_rate', label: 'Pick rate', format: 'pct' }, { key: 'decks', label: 'In decks', format: 'int' }, { key: 'win_rate', label: 'Win rate', format: 'pct' }, { key: 'win_delta', label: 'vs average', format: 'delta' }, { key: 'avg_copies', label: 'Avg copies', format: 'num' }, { key: 'upgrade_rate', label: 'Upgraded', format: 'pct' }]}
              rows={segment.cards}
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
