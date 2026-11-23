import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { t } from '../../lib/ui-strings';

export type ModInfo = {
  id: string;
  name: string;
  colors: { id: string; label: string; hex: string }[];
};

export type ModSelection = {
  enabled: boolean;
  disabled: string[];
  active: string[];
  update: (next: { enabled: boolean; disabled: string[] }) => void;
};

const STORAGE_KEY = 'spire-archive:mods';

/** Tailwind can't generate classes from data, so mod colors are inline. */
export function modBadgeStyle(hex?: string): CSSProperties | undefined {
  return hex ? { color: hex, backgroundColor: `${hex}26`, '--tw-ring-color': `${hex}4d` } as CSSProperties : undefined;
}

export function useModSelection(mods: ModInfo[]): ModSelection {
  const [state, setState] = useState({ enabled: false, disabled: [] as string[] });

  // Read after mount so the server-rendered markup always matches the base game.
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null');
      if (saved) setState({ enabled: saved.enabled === true, disabled: Array.isArray(saved.disabled) ? saved.disabled : [] });
    } catch {
      // Private windows can block storage; the controls still work for this page.
    }
  }, []);

  const active = useMemo(
    () => (state.enabled ? mods.filter((mod) => !state.disabled.includes(mod.id)).map((mod) => mod.id) : []),
    [mods, state],
  );

  function update(next: { enabled: boolean; disabled: string[] }) {
    setState(next);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // See above.
    }
  }

  return { ...state, active, update };
}

export default function ModControls({ mods, selection, locale, onChange }: {
  mods: ModInfo[];
  selection: ModSelection;
  locale: string;
  onChange?: () => void;
}) {
  const { enabled, disabled, active, update } = selection;
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onMouseDown = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onMouseDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onMouseDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  if (mods.length === 0) return null;

  function apply(next: { enabled: boolean; disabled: string[] }) {
    update(next);
    onChange?.();
  }

  function setEnabled(value: boolean) {
    if (!value) setOpen(false);
    apply({ enabled: value, disabled });
  }

  function toggle(id: string) {
    apply({ enabled, disabled: disabled.includes(id) ? disabled.filter((d) => d !== id) : [...disabled, id] });
  }

  const shown = mods.filter((mod) => mod.name.toLowerCase().includes(query.trim().toLowerCase()));
  const smallButton = 'rounded border border-white/10 px-2 py-1 text-xs hover:bg-white/10';

  return (
    <div className="relative mt-2 flex flex-wrap items-center gap-3 text-sm sm:static">
      <label className="flex cursor-pointer items-center gap-2">
        <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} />
        {t('Include Modded Content', locale)}
      </label>

      <div className="sm:relative" ref={rootRef}>
        <button
          type="button"
          className="explorer-filter-toggle disabled:cursor-not-allowed disabled:opacity-40"
          disabled={!enabled}
          aria-expanded={open}
          onClick={() => setOpen(!open)}
        >
          {t('Mods', locale)}: {active.length} / {mods.length} ▾
        </button>

        {open && enabled && (
          <div role="group" aria-label={t('Mods', locale)} className="absolute left-0 right-0 top-full z-20 mt-1 rounded-md sm:right-auto sm:top-auto sm:w-72 border border-white/10 bg-[var(--bg-elevated)] p-2 shadow-lg shadow-black/50">
            <input
              type="search"
              autoFocus
              className="w-full px-2 py-1 text-sm"
              placeholder={t('Search', locale) + ' ' + t('Mods', locale).toLowerCase() + '…'}
              aria-label={t('Search', locale) + ' ' + t('Mods', locale)}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <div className="mt-2 flex gap-2">
              <button type="button" className={smallButton} onClick={() => apply({ enabled, disabled: [] })}>{t('Select all', locale)}</button>
              <button type="button" className={smallButton} onClick={() => apply({ enabled, disabled: mods.map((mod) => mod.id) })}>{t('Select none', locale)}</button>
            </div>
            <ul className="mt-2 max-h-60 overflow-y-auto">
              {shown.map((mod) => (
                <li key={mod.id}>
                  <label className="flex cursor-pointer items-center gap-2 rounded px-1 py-1 hover:bg-white/5">
                    <input type="checkbox" checked={!disabled.includes(mod.id)} onChange={() => toggle(mod.id)} />
                    {mod.name}
                  </label>
                </li>
              ))}
              {shown.length === 0 && <li className="px-1 py-1 text-xs text-slate-400">{t('No mods found', locale)}</li>}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

/** Characters are server-rendered, so this reveals the modded entries already in the page. */
export function CharacterModControls({ mods, locale }: { mods: ModInfo[]; locale: string }) {
  const selection = useModSelection(mods);

  useEffect(() => {
    let anyShown = false;
    document.querySelectorAll<HTMLElement>('[data-mod]').forEach((el) => {
      el.hidden = !selection.active.includes(el.dataset.mod ?? '');
      anyShown ||= !el.hidden;
    });
    document.querySelectorAll<HTMLElement>('[data-base-only]').forEach((el) => { el.hidden = anyShown; });
  }, [selection.active]);

  return <ModControls mods={mods} selection={selection} locale={locale} />;
}
