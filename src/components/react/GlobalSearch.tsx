import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Fuse from 'fuse.js';
import { t } from '../../lib/ui-strings';

type Entry = {
  id: string;
  name: string;
  type: string;
  game: string;
  desc?: string;
  color?: string;
  tier?: string;
  img?: string;
};

const typeLabels: Record<string, string> = {
  card: 'Cards',
  relic: 'Relics',
  potion: 'Potions',
  monster: 'Monsters',
  event: 'Events',
  effect: 'Effects',
  keyword: 'Keywords',
};

const typeIcons: Record<string, string> = {
  card: '🃏',
  relic: '🔮',
  potion: '🧪',
  monster: '👹',
  event: '📜',
  effect: '✨',
  keyword: '📖',
};

function getHref(e: Entry, langPrefix = ''): string {
  const base = `${langPrefix}/${e.game}`;
  switch (e.type) {
    case 'card': return `${base}/cards/${e.id}`;
    case 'relic': return `${base}/relics/${e.id}`;
    case 'potion': return `${base}/potions/${e.id}`;
    case 'monster': return `${base}/monsters/${e.id}`;
    case 'event': return `${base}/events/${e.id}`;
    case 'effect': return `${base}/effects/${e.id}`;
    case 'keyword': return `${base}/keywords`;
    default: return base;
  }
}

let cachedIndex: Fuse<Entry> | null = null;
let cachedEntries: Entry[] | null = null;
let loadingPromise: Promise<void> | null = null;

function loadIndex(): Promise<void> {
  if (cachedIndex) return Promise.resolve();
  if (loadingPromise) return loadingPromise;
  loadingPromise = fetch('/api/search-index')
    .then(r => r.json())
    .then((entries: Entry[]) => {
      cachedEntries = entries;
      cachedIndex = new Fuse(entries, {
        keys: ['name'],
        threshold: 0.35,
        distance: 100,
        includeScore: true,
        minMatchCharLength: 2,
      });
    });
  return loadingPromise;
}

export default function GlobalSearch({ game, locale = 'en', langPrefix = '' }: { game?: string; locale?: string; langPrefix?: string }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Entry[]>([]);
  const [selected, setSelected] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // ⌘K / Ctrl+K
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setOpen(o => !o);
      }
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  // Focus input when opened
  useEffect(() => {
    if (open) {
      loadIndex();
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setQuery('');
      setResults([]);
      setSelected(0);
    }
  }, [open]);

  // Search on query change
  useEffect(() => {
    if (!query.trim()) { setResults([]); setSelected(0); return; }
    loadIndex().then(() => {
      if (!cachedIndex) return;
      const raw = cachedIndex.search(query, { limit: 40 });
      const filtered = game ? raw.filter(r => r.item.game === game) : raw;
      setResults(filtered.slice(0, 20).map(r => r.item));
      setSelected(0);
    });
  }, [query]);

  // Keyboard navigation
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setSelected(s => Math.min(s + 1, results.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setSelected(s => Math.max(s - 1, 0)); }
    else if (e.key === 'Enter' && results[selected]) {
      e.preventDefault();
      window.location.href = getHref(results[selected], langPrefix);
      setOpen(false);
    }
  }, [results, selected]);

  // Scroll selected into view
  useEffect(() => {
    const el = containerRef.current?.querySelector(`[data-idx="${selected}"]`);
    el?.scrollIntoView({ block: 'nearest' });
  }, [selected]);

  // Group results by type
  const grouped = new Map<string, Entry[]>();
  for (const r of results) {
    const key = r.type;
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push(r);
  }

  let flatIdx = 0;

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="p-1.5 rounded-md text-slate-300 hover:text-white hover:bg-white/10 transition-colors"
        aria-label="Search"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
      </button>
    );
  }

  const modal = (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh] bg-black/50" onClick={() => setOpen(false)}>
      <div
        className="w-full max-w-lg mx-4 rounded-xl border border-white/[0.1] bg-[#0d1117] shadow-2xl shadow-black/80 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 border-b border-white/[0.06] px-4 py-3">
          <svg className="w-4 h-4 text-slate-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
          <input
            ref={inputRef}
            type="text"
            className="flex-1 bg-transparent text-sm text-white placeholder-slate-500 outline-none"
            placeholder={t('Search cards, relics, events…', locale)}
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          <button onClick={() => setOpen(false)} className="shrink-0 rounded px-1.5 py-0.5 text-[10px] text-slate-500 border border-white/[0.08] hover:text-slate-300 hover:border-white/[0.15] transition-colors">ESC</button>
        </div>

        {results.length > 0 && (
          <div ref={containerRef} className="max-h-[50vh] overflow-y-auto py-2">
            {Array.from(grouped.entries()).map(([type, items]) => (
              <div key={type}>
                <div className="px-4 py-1.5 text-[10px] font-semibold text-slate-500 uppercase tracking-widest">
                  {typeLabels[type] ?? type}
                </div>
                {items.map(item => {
                  const idx = flatIdx++;
                  return (
                    <a
                      key={`${item.game}-${item.type}-${item.id}`}
                      data-idx={idx}
                      href={getHref(item, langPrefix)}
                      className={`flex items-center gap-3 px-4 py-2 text-sm transition-colors ${idx === selected ? 'bg-amber-500/10 text-white' : 'text-slate-300 hover:bg-white/[0.04]'}`}
                      onMouseEnter={() => setSelected(idx)}
                      onClick={() => setOpen(false)}
                    >
                      {item.img ? (
                        <img src={item.img} alt="" className="w-8 h-8 object-contain shrink-0 rounded" loading="lazy" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                      ) : (
                        <span className="w-8 h-8 flex items-center justify-center text-lg shrink-0">{typeIcons[item.type] ?? '📄'}</span>
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium truncate">{item.name}</span>
                          {!game && <span className="text-[10px] text-slate-500 uppercase shrink-0">{item.game}</span>}
                        </div>
                        {item.desc && <div className="text-xs text-slate-500 truncate">{item.desc}</div>}
                      </div>
                    </a>
                  );
                })}
              </div>
            ))}
          </div>
        )}

        {query.trim() && results.length === 0 && (
          <div className="px-4 py-8 text-center text-sm text-slate-500">
            {t('No results for', locale)} "{query}"
          </div>
        )}
      </div>
    </div>
  );

  return createPortal(modal, document.body);
}
